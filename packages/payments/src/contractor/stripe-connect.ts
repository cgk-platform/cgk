/**
 * Stripe Connect Functions
 *
 * Handles Stripe Connect account creation, OAuth flow,
 * self-hosted onboarding, and account management.
 */

import Stripe from 'stripe'

import { sql, withTenant } from '@cgk-platform/db'

import { upsertStripeConnectMethod } from './payout-methods'
import type {
  StripeBusinessType,
  StripeOnboardingProgress,
  StripeOnboardingStep1,
  StripeOnboardingStep2,
  StripeOnboardingStep3,
} from './types'
import { getCountrySpec, isCountrySupported, SUPPORTED_COUNTRIES } from './types'

// Lazy-loaded Stripe client to avoid build-time initialization
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  }
  return _stripe
}

/**
 * Get HMAC secret for Stripe Connect OAuth state signing.
 */
function getStripeOAuthSecret(): string {
  const secret =
    process.env.STRIPE_OAUTH_SECRET ||
    process.env.OAUTH_STATE_SECRET ||
    process.env.SESSION_SECRET
  if (!secret) {
    throw new Error(
      'Stripe OAuth state secret not configured. Set STRIPE_OAUTH_SECRET, OAUTH_STATE_SECRET, or SESSION_SECRET.'
    )
  }
  return secret
}

/**
 * Compute HMAC-SHA256 using Web Crypto API (Edge-compatible).
 */
async function hmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Create HMAC-signed state for Stripe OAuth.
 */
export async function createStripeOAuthState(data: Record<string, unknown>): Promise<string> {
  const payload = JSON.stringify({ ...data, timestamp: Date.now() })
  const encoded = Buffer.from(payload).toString('base64url')
  const hmac = await hmacSha256(getStripeOAuthSecret(), encoded)
  return `${encoded}.${hmac}`
}

/**
 * Validate and decode HMAC-signed Stripe OAuth state.
 */
export async function validateStripeOAuthState<T extends Record<string, unknown>>(
  state: string,
  maxAgeMs: number = 60 * 60 * 1000
): Promise<T & { timestamp: number }> {
  const dotIndex = state.lastIndexOf('.')
  if (dotIndex === -1) {
    throw new StripeConnectError('Invalid state format', 'INVALID_STATE')
  }

  const encoded = state.substring(0, dotIndex)
  const providedHmac = state.substring(dotIndex + 1)
  const expectedHmac = await hmacSha256(getStripeOAuthSecret(), encoded)

  // Constant-time comparison
  if (providedHmac.length !== expectedHmac.length) {
    throw new StripeConnectError('Invalid state signature', 'INVALID_STATE')
  }
  const a = new TextEncoder().encode(providedHmac)
  const b = new TextEncoder().encode(expectedHmac)
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  if (mismatch !== 0) {
    throw new StripeConnectError('Invalid state signature', 'INVALID_STATE')
  }

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as T & { timestamp: number }

  if (Date.now() - payload.timestamp > maxAgeMs) {
    throw new StripeConnectError('State token expired', 'STATE_EXPIRED')
  }

  return payload
}

/**
 * Get Stripe Connect OAuth URL
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug
 * @param redirectUrl - OAuth callback URL
 */
export async function getStripeOAuthUrl(
  payeeId: string,
  tenantSlug: string,
  redirectUrl: string
): Promise<string> {
  const state = await createStripeOAuthState({ payeeId, tenantSlug })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.STRIPE_CLIENT_ID || '',
    scope: 'read_write',
    redirect_uri: redirectUrl,
    state,
    'stripe_user[business_type]': 'individual',
    'stripe_user[country]': 'US',
  })

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`
}

/**
 * Handle Stripe OAuth callback
 *
 * @param code - OAuth authorization code
 * @param state - State parameter for verification
 * @param tenantSlug - Tenant slug for schema access
 */
export async function handleStripeOAuthCallback(
  code: string,
  state: string,
  tenantSlug: string
): Promise<{ payeeId: string; stripeAccountId: string }> {
  // Validate HMAC-signed state (verifies signature + 1hr expiry)
  const stateData = await validateStripeOAuthState<{ payeeId: string; tenantSlug: string }>(state)

  if (stateData.tenantSlug !== tenantSlug) {
    throw new StripeConnectError('Tenant mismatch', 'TENANT_MISMATCH')
  }

  // Exchange code for access token
  const response = await getStripe().oauth.token({
    grant_type: 'authorization_code',
    code,
  })

  if (!response.stripe_user_id) {
    throw new StripeConnectError(
      'Failed to connect Stripe account',
      'OAUTH_FAILED'
    )
  }

  // Get account details
  const account = await getStripe().accounts.retrieve(response.stripe_user_id)

  // Get tenant ID
  const tenantResult = await sql`
    SELECT id FROM organizations WHERE slug = ${tenantSlug}
  `
  const tenantId = tenantResult.rows[0]?.id as string

  // Save payout method
  await upsertStripeConnectMethod(
    stateData.payeeId,
    tenantId,
    tenantSlug,
    {
      stripeAccountId: response.stripe_user_id,
      stripeAccessToken: response.access_token,
      stripeRefreshToken: response.refresh_token,
      stripeAccountStatus: mapAccountStatus(account),
      stripeOnboardingComplete: account.details_submitted || false,
      stripePayoutsEnabled: account.payouts_enabled || false,
      stripeChargesEnabled: account.charges_enabled || false,
      stripeDetailsSubmitted: account.details_submitted || false,
      stripeCapabilities: account.capabilities as Record<string, string>,
      stripeRequirementsDue: account.requirements?.currently_due || [],
      stripeRequirementsErrors: (account.requirements?.errors || []).map(
        (e) => ({
          code: e.code,
          reason: e.reason,
          requirement: e.requirement,
        })
      ),
      accountCountry: account.country || undefined,
      accountCurrency: account.default_currency || undefined,
    }
  )

  return {
    payeeId: stateData.payeeId,
    stripeAccountId: response.stripe_user_id,
  }
}

/**
 * Create a Stripe Connect account (self-hosted onboarding)
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantId - Tenant ID
 * @param tenantSlug - Tenant slug for schema access
 * @param step1Data - Initial business type and country
 */
export async function createStripeAccount(
  payeeId: string,
  tenantId: string,
  tenantSlug: string,
  step1Data: StripeOnboardingStep1
): Promise<{ accountId: string; progress: StripeOnboardingProgress }> {
  // Validate country
  if (!isCountrySupported(step1Data.country)) {
    throw new StripeConnectError(
      'Country not supported for Stripe Connect',
      'UNSUPPORTED_COUNTRY'
    )
  }

  const countrySpec = getCountrySpec(step1Data.country)
  if (
    !countrySpec?.supportedBusinessTypes.includes(step1Data.businessType)
  ) {
    throw new StripeConnectError(
      'Business type not supported in this country',
      'UNSUPPORTED_BUSINESS_TYPE'
    )
  }

  // Check if account already exists
  const existing = await getOnboardingProgress(payeeId, tenantSlug)
  if (existing?.stripeAccountId) {
    throw new StripeConnectError(
      'Stripe account already exists',
      'ACCOUNT_EXISTS'
    )
  }

  // Create Stripe account
  const account = await getStripe().accounts.create({
    type: 'custom',
    country: step1Data.country,
    business_type: step1Data.businessType,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      payeeId,
      tenantId,
    },
  })

  // Save progress
  const progress = await saveOnboardingProgress(payeeId, tenantId, tenantSlug, {
    stripeAccountId: account.id,
    currentStep: 2,
    step1Data,
  })

  // Create payout method record
  await upsertStripeConnectMethod(payeeId, tenantId, tenantSlug, {
    stripeAccountId: account.id,
    stripeAccountStatus: 'pending',
    accountCountry: step1Data.country,
    accountCurrency: countrySpec?.defaultCurrency,
  })

  return { accountId: account.id, progress }
}

/**
 * Update Stripe account with step 2 data (personal/company info)
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 * @param step2Data - Personal or company information
 */
export async function updateStripeAccountStep2(
  payeeId: string,
  tenantSlug: string,
  step2Data: StripeOnboardingStep2
): Promise<StripeOnboardingProgress> {
  const progress = await getOnboardingProgress(payeeId, tenantSlug)
  if (!progress?.stripeAccountId) {
    throw new StripeConnectError('No Stripe account found', 'NO_ACCOUNT')
  }

  // Determine if individual or company
  const isIndividual = 'firstName' in step2Data

  if (isIndividual) {
    const data = step2Data as { firstName: string; lastName: string; phone: string; dateOfBirth: { day: number; month: number; year: number } }
    await getStripe().accounts.update(progress.stripeAccountId, {
      individual: {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        dob: {
          day: data.dateOfBirth.day,
          month: data.dateOfBirth.month,
          year: data.dateOfBirth.year,
        },
      },
    })
  } else {
    const data = step2Data as { companyName: string; companyPhone: string; taxId: string }
    await getStripe().accounts.update(progress.stripeAccountId, {
      company: {
        name: data.companyName,
        phone: data.companyPhone,
        tax_id: data.taxId,
      },
    })
  }

  // Update progress
  return saveOnboardingProgress(payeeId, progress.tenantId, tenantSlug, {
    currentStep: 3,
    step2Data,
  })
}

/**
 * Update Stripe account with step 3 data (address)
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 * @param step3Data - Address information
 */
export async function updateStripeAccountStep3(
  payeeId: string,
  tenantSlug: string,
  step3Data: StripeOnboardingStep3
): Promise<StripeOnboardingProgress> {
  const progress = await getOnboardingProgress(payeeId, tenantSlug)
  if (!progress?.stripeAccountId) {
    throw new StripeConnectError('No Stripe account found', 'NO_ACCOUNT')
  }

  const address: Stripe.AddressParam = {
    line1: step3Data.addressLine1,
    line2: step3Data.addressLine2,
    city: step3Data.city,
    state: step3Data.state,
    postal_code: step3Data.postalCode,
    country: step3Data.country,
  }

  // Update based on business type
  const isIndividual = progress.step1Data?.businessType === 'individual'

  if (isIndividual) {
    await getStripe().accounts.update(progress.stripeAccountId, {
      individual: { address },
    })
  } else {
    await getStripe().accounts.update(progress.stripeAccountId, {
      company: { address },
    })
  }

  // Update progress
  return saveOnboardingProgress(payeeId, progress.tenantId, tenantSlug, {
    currentStep: 4,
    step3Data,
  })
}

/**
 * Update Stripe account with step 4 data (identity verification)
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 * @param identityData - SSN or other ID information
 */
export async function updateStripeAccountStep4(
  payeeId: string,
  tenantSlug: string,
  identityData: { ssn?: string; ssnLast4?: string; nationalId?: string; cpf?: string }
): Promise<StripeOnboardingProgress> {
  const progress = await getOnboardingProgress(payeeId, tenantSlug)
  if (!progress?.stripeAccountId) {
    throw new StripeConnectError('No Stripe account found', 'NO_ACCOUNT')
  }

  const country = progress.step1Data?.country || 'US'
  // Note: countrySpec could be used for validation in the future
  void getCountrySpec(country)

  // Prepare ID number based on country
  let idNumber: string | undefined
  let idNumberLast4: string | undefined

  if (country === 'US') {
    if (identityData.ssn) {
      idNumber = identityData.ssn.replace(/[^0-9]/g, '')
    } else if (identityData.ssnLast4) {
      idNumberLast4 = identityData.ssnLast4
    }
  } else if (country === 'BR' && identityData.cpf) {
    idNumber = identityData.cpf.replace(/[^0-9]/g, '')
  } else if (identityData.nationalId) {
    idNumber = identityData.nationalId
  }

  // Update Stripe account
  const isIndividual = progress.step1Data?.businessType === 'individual'

  if (isIndividual) {
    const updateData: Stripe.AccountUpdateParams['individual'] = {}
    if (idNumber) {
      updateData.id_number = idNumber
    }
    if (idNumberLast4 && country === 'US') {
      updateData.ssn_last_4 = idNumberLast4
    }

    await getStripe().accounts.update(progress.stripeAccountId, {
      individual: updateData,
    })
  }

  // Get updated account status
  const account = await getStripe().accounts.retrieve(progress.stripeAccountId)

  // Get tenant ID
  const tenantResult = await sql`
    SELECT id FROM organizations WHERE slug = ${tenantSlug}
  `
  const tenantId = tenantResult.rows[0]?.id as string

  // Update payout method with latest status
  await upsertStripeConnectMethod(payeeId, tenantId, tenantSlug, {
    stripeAccountId: progress.stripeAccountId,
    stripeAccountStatus: mapAccountStatus(account),
    stripeOnboardingComplete: account.details_submitted || false,
    stripePayoutsEnabled: account.payouts_enabled || false,
    stripeChargesEnabled: account.charges_enabled || false,
    stripeDetailsSubmitted: account.details_submitted || false,
    stripeCapabilities: account.capabilities as Record<string, string>,
    stripeRequirementsDue: account.requirements?.currently_due || [],
    stripeRequirementsErrors: (account.requirements?.errors || []).map(
      (e) => ({
        code: e.code,
        reason: e.reason,
        requirement: e.requirement,
      })
    ),
  })

  // Update progress
  return saveOnboardingProgress(payeeId, progress.tenantId, tenantSlug, {
    currentStep: 5,
    step4Completed: true,
    completedAt: new Date(),
  })
}

/**
 * Sync Stripe account status
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 */
export async function syncStripeAccountStatus(
  payeeId: string,
  tenantSlug: string
): Promise<{
  status: string
  payoutsEnabled: boolean
  requirementsDue: string[]
}> {
  const progress = await getOnboardingProgress(payeeId, tenantSlug)
  if (!progress?.stripeAccountId) {
    throw new StripeConnectError('No Stripe account found', 'NO_ACCOUNT')
  }

  const account = await getStripe().accounts.retrieve(progress.stripeAccountId)

  // Get tenant ID
  const tenantResult = await sql`
    SELECT id FROM organizations WHERE slug = ${tenantSlug}
  `
  const tenantId = tenantResult.rows[0]?.id as string

  // Update payout method
  await upsertStripeConnectMethod(payeeId, tenantId, tenantSlug, {
    stripeAccountId: progress.stripeAccountId,
    stripeAccountStatus: mapAccountStatus(account),
    stripeOnboardingComplete: account.details_submitted || false,
    stripePayoutsEnabled: account.payouts_enabled || false,
    stripeChargesEnabled: account.charges_enabled || false,
    stripeDetailsSubmitted: account.details_submitted || false,
    stripeCapabilities: account.capabilities as Record<string, string>,
    stripeRequirementsDue: account.requirements?.currently_due || [],
    stripeRequirementsErrors: (account.requirements?.errors || []).map(
      (e) => ({
        code: e.code,
        reason: e.reason,
        requirement: e.requirement,
      })
    ),
  })

  return {
    status: mapAccountStatus(account),
    payoutsEnabled: account.payouts_enabled || false,
    requirementsDue: account.requirements?.currently_due || [],
  }
}

/**
 * Get Stripe onboarding progress
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 */
export async function getOnboardingProgress(
  payeeId: string,
  tenantSlug: string
): Promise<StripeOnboardingProgress | null> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT *
      FROM stripe_onboarding_progress
      WHERE payee_id = ${payeeId}
    `
  })

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToProgress(result.rows[0] as Record<string, unknown>)
}

/**
 * Save/update onboarding progress
 */
async function saveOnboardingProgress(
  payeeId: string,
  tenantId: string,
  tenantSlug: string,
  data: Partial<{
    stripeAccountId: string
    currentStep: 1 | 2 | 3 | 4 | 5
    step1Data: StripeOnboardingStep1
    step2Data: StripeOnboardingStep2
    step3Data: StripeOnboardingStep3
    step4Completed: boolean
    completedAt: Date
  }>
): Promise<StripeOnboardingProgress> {
  const existing = await getOnboardingProgress(payeeId, tenantSlug)

  if (existing) {
    const result = await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE stripe_onboarding_progress
        SET
          stripe_account_id = COALESCE(${data.stripeAccountId || null}, stripe_account_id),
          current_step = COALESCE(${data.currentStep ?? null}, current_step),
          step1_data = COALESCE(${data.step1Data ? JSON.stringify(data.step1Data) : null}, step1_data),
          step2_data = COALESCE(${data.step2Data ? JSON.stringify(data.step2Data) : null}, step2_data),
          step3_data = COALESCE(${data.step3Data ? JSON.stringify(data.step3Data) : null}, step3_data),
          step4_completed = COALESCE(${data.step4Completed ?? null}, step4_completed),
          completed_at = COALESCE(${data.completedAt?.toISOString() ?? null}, completed_at),
          updated_at = NOW()
        WHERE payee_id = ${payeeId}
        RETURNING *
      `
    })
    return mapRowToProgress(result.rows[0] as Record<string, unknown>)
  }

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      INSERT INTO stripe_onboarding_progress (
        payee_id, tenant_id, stripe_account_id, current_step,
        step1_data, step2_data, step3_data, step4_completed, completed_at
      )
      VALUES (
        ${payeeId}, ${tenantId}, ${data.stripeAccountId || null},
        ${data.currentStep || 1}, ${data.step1Data ? JSON.stringify(data.step1Data) : null},
        ${data.step2Data ? JSON.stringify(data.step2Data) : null},
        ${data.step3Data ? JSON.stringify(data.step3Data) : null},
        ${data.step4Completed ?? false}, ${data.completedAt?.toISOString() ?? null}
      )
      RETURNING *
    `
  })

  return mapRowToProgress(result.rows[0] as Record<string, unknown>)
}

/**
 * Get available countries for Stripe Connect
 */
export function getAvailableCountries(): Array<{
  code: string
  name: string
  defaultCurrency: string
  businessTypes: StripeBusinessType[]
}> {
  return SUPPORTED_COUNTRIES.map((c) => ({
    code: c.code,
    name: c.name,
    defaultCurrency: c.defaultCurrency,
    businessTypes: c.supportedBusinessTypes,
  }))
}

/**
 * Map Stripe account to status
 */
function mapAccountStatus(
  account: Stripe.Account
): 'pending' | 'restricted' | 'restricted_soon' | 'enabled' | 'complete' | 'rejected' {
  if (account.requirements?.disabled_reason) {
    if (account.requirements.disabled_reason.includes('rejected')) {
      return 'rejected'
    }
    return 'restricted'
  }

  if (
    account.requirements?.eventually_due &&
    account.requirements.eventually_due.length > 0
  ) {
    return 'restricted_soon'
  }

  if (account.payouts_enabled && account.charges_enabled) {
    if (
      !account.requirements?.currently_due ||
      account.requirements.currently_due.length === 0
    ) {
      return 'complete'
    }
    return 'enabled'
  }

  return 'pending'
}

/**
 * Map database row to StripeOnboardingProgress
 */
function mapRowToProgress(row: Record<string, unknown>): StripeOnboardingProgress {
  let step1Data: StripeOnboardingStep1 | null = null
  let step2Data: StripeOnboardingStep2 | null = null
  let step3Data: StripeOnboardingStep3 | null = null

  try {
    if (row.step1_data) {
      step1Data =
        typeof row.step1_data === 'string'
          ? JSON.parse(row.step1_data)
          : (row.step1_data as StripeOnboardingStep1)
    }
    if (row.step2_data) {
      step2Data =
        typeof row.step2_data === 'string'
          ? JSON.parse(row.step2_data)
          : (row.step2_data as StripeOnboardingStep2)
    }
    if (row.step3_data) {
      step3Data =
        typeof row.step3_data === 'string'
          ? JSON.parse(row.step3_data)
          : (row.step3_data as StripeOnboardingStep3)
    }
  } catch {
    // Leave as null
  }

  return {
    payeeId: row.payee_id as string,
    tenantId: row.tenant_id as string,
    stripeAccountId: (row.stripe_account_id as string) || null,
    currentStep: (parseInt(row.current_step as string, 10) || 1) as 1 | 2 | 3 | 4 | 5,
    step1Data,
    step2Data,
    step3Data,
    step4Completed: Boolean(row.step4_completed),
    completedAt: row.completed_at
      ? new Date(row.completed_at as string)
      : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Stripe Connect error class
 */
export class StripeConnectError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'StripeConnectError'
    this.code = code
  }
}
