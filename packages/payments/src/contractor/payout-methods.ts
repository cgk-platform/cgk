/**
 * Payout Method Functions
 *
 * Manages contractor/creator payout methods including
 * Stripe Connect, PayPal, Venmo, and check.
 */

import { sql, withTenant } from '@cgk/db'

import type {
  AddPayoutMethodInput,
  CheckAddress,
  PayoutMethod,
  PayoutMethodStatus,
  PayoutMethodType,
  UpdatePayoutMethodInput,
} from './types'

/**
 * Get all payout methods for a payee
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 */
export async function getPayoutMethods(
  payeeId: string,
  tenantSlug: string
): Promise<PayoutMethod[]> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT *
      FROM payout_methods
      WHERE payee_id = ${payeeId}
      ORDER BY is_default DESC, created_at DESC
    `
  })

  return result.rows.map((row) =>
    mapRowToPayoutMethod(row as Record<string, unknown>)
  )
}

/**
 * Get a single payout method by ID
 *
 * @param methodId - Payout method ID
 * @param payeeId - Payee ID for access control
 * @param tenantSlug - Tenant slug for schema access
 */
export async function getPayoutMethodById(
  methodId: string,
  payeeId: string,
  tenantSlug: string
): Promise<PayoutMethod | null> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT *
      FROM payout_methods
      WHERE id = ${methodId}
        AND payee_id = ${payeeId}
    `
  })

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToPayoutMethod(result.rows[0] as Record<string, unknown>)
}

/**
 * Get the default payout method for a payee
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 */
export async function getDefaultPayoutMethod(
  payeeId: string,
  tenantSlug: string
): Promise<PayoutMethod | null> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT *
      FROM payout_methods
      WHERE payee_id = ${payeeId}
        AND is_default = true
      LIMIT 1
    `
  })

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToPayoutMethod(result.rows[0] as Record<string, unknown>)
}

/**
 * Add a new payout method (PayPal, Venmo, or Check)
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantId - Tenant ID
 * @param tenantSlug - Tenant slug for schema access
 * @param input - Payout method data
 */
export async function addPayoutMethod(
  payeeId: string,
  tenantId: string,
  tenantSlug: string,
  input: AddPayoutMethodInput
): Promise<PayoutMethod> {
  // Validate input based on type
  if (input.type === 'paypal' && !input.paypalEmail) {
    throw new PayoutMethodError('PayPal email is required', 'MISSING_PAYPAL_EMAIL')
  }
  if (input.type === 'venmo' && !input.venmoHandle) {
    throw new PayoutMethodError('Venmo handle is required', 'MISSING_VENMO_HANDLE')
  }
  if (input.type === 'check' && !input.checkAddress) {
    throw new PayoutMethodError('Check address is required', 'MISSING_CHECK_ADDRESS')
  }

  // Check if this type already exists (only one of each type allowed)
  const existing = await getPayoutMethods(payeeId, tenantSlug)
  const existingOfType = existing.find((m) => m.type === input.type)
  if (existingOfType) {
    throw new PayoutMethodError(
      `A ${input.type} payout method already exists`,
      'DUPLICATE_TYPE'
    )
  }

  // If setting as default or no other methods exist, this becomes default
  const isDefault = input.setAsDefault || existing.length === 0

  // If setting as default, unset other defaults
  if (isDefault && existing.length > 0) {
    await withTenant(tenantSlug, async () => {
      await sql`
        UPDATE payout_methods
        SET is_default = false
        WHERE payee_id = ${payeeId}
      `
    })
  }

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      INSERT INTO payout_methods (
        payee_id, tenant_id, type, is_default, status,
        paypal_email, venmo_handle, check_address,
        verification_status
      )
      VALUES (
        ${payeeId}, ${tenantId}, ${input.type}, ${isDefault}, 'active',
        ${input.paypalEmail || null}, ${input.venmoHandle || null},
        ${input.checkAddress ? JSON.stringify(input.checkAddress) : null},
        'pending'
      )
      RETURNING *
    `
  })

  return mapRowToPayoutMethod(result.rows[0] as Record<string, unknown>)
}

/**
 * Update a payout method
 *
 * @param methodId - Payout method ID
 * @param payeeId - Payee ID for access control
 * @param tenantSlug - Tenant slug for schema access
 * @param input - Update data
 */
export async function updatePayoutMethod(
  methodId: string,
  payeeId: string,
  tenantSlug: string,
  input: UpdatePayoutMethodInput
): Promise<PayoutMethod> {
  // Check method exists
  const existing = await getPayoutMethodById(methodId, payeeId, tenantSlug)
  if (!existing) {
    throw new PayoutMethodError('Payout method not found', 'NOT_FOUND')
  }

  // If setting as default, unset other defaults
  if (input.isDefault) {
    await withTenant(tenantSlug, async () => {
      await sql`
        UPDATE payout_methods
        SET is_default = false
        WHERE payee_id = ${payeeId}
          AND id != ${methodId}
      `
    })
  }

  // Build update query based on type
  const updates: Record<string, unknown> = {}
  if (input.isDefault !== undefined) {
    updates.is_default = input.isDefault
  }
  if (existing.type === 'paypal' && input.paypalEmail) {
    updates.paypal_email = input.paypalEmail
  }
  if (existing.type === 'venmo' && input.venmoHandle) {
    updates.venmo_handle = input.venmoHandle
  }
  if (existing.type === 'check' && input.checkAddress) {
    updates.check_address = JSON.stringify(input.checkAddress)
  }

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE payout_methods
      SET
        is_default = COALESCE(${input.isDefault ?? null}, is_default),
        paypal_email = COALESCE(${input.paypalEmail ?? null}, paypal_email),
        venmo_handle = COALESCE(${input.venmoHandle ?? null}, venmo_handle),
        check_address = COALESCE(${input.checkAddress ? JSON.stringify(input.checkAddress) : null}, check_address),
        updated_at = NOW()
      WHERE id = ${methodId}
        AND payee_id = ${payeeId}
      RETURNING *
    `
  })

  return mapRowToPayoutMethod(result.rows[0] as Record<string, unknown>)
}

/**
 * Remove a payout method
 *
 * @param methodId - Payout method ID
 * @param payeeId - Payee ID for access control
 * @param tenantSlug - Tenant slug for schema access
 */
export async function removePayoutMethod(
  methodId: string,
  payeeId: string,
  tenantSlug: string
): Promise<void> {
  // Check method exists
  const existing = await getPayoutMethodById(methodId, payeeId, tenantSlug)
  if (!existing) {
    throw new PayoutMethodError('Payout method not found', 'NOT_FOUND')
  }

  // Don't allow removing the only method if there are pending withdrawals
  const methods = await getPayoutMethods(payeeId, tenantSlug)
  if (methods.length === 1) {
    const pendingWithdrawals = await withTenant(tenantSlug, async () => {
      return sql`
        SELECT COUNT(*) as count
        FROM withdrawal_requests
        WHERE payee_id = ${payeeId}
          AND status IN ('pending', 'processing')
      `
    })
    const count = parseInt(pendingWithdrawals.rows[0]?.count as string, 10) || 0
    if (count > 0) {
      throw new PayoutMethodError(
        'Cannot remove the only payout method while withdrawals are pending',
        'PENDING_WITHDRAWALS'
      )
    }
  }

  await withTenant(tenantSlug, async () => {
    await sql`
      DELETE FROM payout_methods
      WHERE id = ${methodId}
        AND payee_id = ${payeeId}
    `
  })

  // If this was the default, set another as default
  if (existing.isDefault && methods.length > 1) {
    const newDefault = methods.find((m) => m.id !== methodId)
    if (newDefault) {
      await withTenant(tenantSlug, async () => {
        await sql`
          UPDATE payout_methods
          SET is_default = true
          WHERE id = ${newDefault.id}
        `
      })
    }
  }
}

/**
 * Create or update a Stripe Connect payout method
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantId - Tenant ID
 * @param tenantSlug - Tenant slug for schema access
 * @param stripeData - Stripe Connect account data
 */
export async function upsertStripeConnectMethod(
  payeeId: string,
  tenantId: string,
  tenantSlug: string,
  stripeData: {
    stripeAccountId: string
    stripeAccountStatus?: PayoutMethod['stripeAccountStatus']
    stripeOnboardingComplete?: boolean
    stripePayoutsEnabled?: boolean
    stripeChargesEnabled?: boolean
    stripeDetailsSubmitted?: boolean
    stripeCapabilities?: Record<string, string>
    stripeRequirementsDue?: string[]
    stripeRequirementsErrors?: PayoutMethod['stripeRequirementsErrors']
    stripeAccessToken?: string
    stripeRefreshToken?: string
    accountCountry?: string
    accountCurrency?: string
  }
): Promise<PayoutMethod> {
  // Check if Stripe Connect method already exists
  const existing = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT *
      FROM payout_methods
      WHERE payee_id = ${payeeId}
        AND type IN ('stripe_connect', 'stripe_connect_standard')
    `
  })

  // Determine status based on payouts enabled
  let status: PayoutMethodStatus = 'pending'
  if (stripeData.stripePayoutsEnabled) {
    status = 'active'
  } else if (
    stripeData.stripeRequirementsDue &&
    stripeData.stripeRequirementsDue.length > 0
  ) {
    status = 'requires_action'
  }

  if (existing.rows.length > 0) {
    // Update existing
    const result = await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE payout_methods
        SET
          stripe_account_id = ${stripeData.stripeAccountId},
          stripe_account_status = ${stripeData.stripeAccountStatus || null},
          stripe_onboarding_complete = ${stripeData.stripeOnboardingComplete ?? false},
          stripe_payouts_enabled = ${stripeData.stripePayoutsEnabled ?? false},
          stripe_charges_enabled = ${stripeData.stripeChargesEnabled ?? false},
          stripe_details_submitted = ${stripeData.stripeDetailsSubmitted ?? false},
          stripe_capabilities = ${stripeData.stripeCapabilities ? JSON.stringify(stripeData.stripeCapabilities) : null},
          stripe_requirements_due = ${JSON.stringify(stripeData.stripeRequirementsDue || [])},
          stripe_requirements_errors = ${stripeData.stripeRequirementsErrors ? JSON.stringify(stripeData.stripeRequirementsErrors) : null},
          stripe_access_token = COALESCE(${stripeData.stripeAccessToken || null}, stripe_access_token),
          stripe_refresh_token = COALESCE(${stripeData.stripeRefreshToken || null}, stripe_refresh_token),
          account_country = COALESCE(${stripeData.accountCountry || null}, account_country),
          account_currency = COALESCE(${stripeData.accountCurrency || null}, account_currency),
          status = ${status},
          updated_at = NOW()
        WHERE payee_id = ${payeeId}
          AND type IN ('stripe_connect', 'stripe_connect_standard')
        RETURNING *
      `
    })
    return mapRowToPayoutMethod(result.rows[0] as Record<string, unknown>)
  } else {
    // Create new
    const methods = await getPayoutMethods(payeeId, tenantSlug)
    const isDefault = methods.length === 0

    const result = await withTenant(tenantSlug, async () => {
      return sql`
        INSERT INTO payout_methods (
          payee_id, tenant_id, type, is_default, status,
          stripe_account_id, stripe_account_status,
          stripe_onboarding_complete, stripe_payouts_enabled,
          stripe_charges_enabled, stripe_details_submitted,
          stripe_capabilities, stripe_requirements_due,
          stripe_requirements_errors, stripe_access_token,
          stripe_refresh_token, account_country, account_currency
        )
        VALUES (
          ${payeeId}, ${tenantId}, 'stripe_connect', ${isDefault}, ${status},
          ${stripeData.stripeAccountId},
          ${stripeData.stripeAccountStatus || null},
          ${stripeData.stripeOnboardingComplete ?? false},
          ${stripeData.stripePayoutsEnabled ?? false},
          ${stripeData.stripeChargesEnabled ?? false},
          ${stripeData.stripeDetailsSubmitted ?? false},
          ${stripeData.stripeCapabilities ? JSON.stringify(stripeData.stripeCapabilities) : null},
          ${JSON.stringify(stripeData.stripeRequirementsDue || [])},
          ${stripeData.stripeRequirementsErrors ? JSON.stringify(stripeData.stripeRequirementsErrors) : null},
          ${stripeData.stripeAccessToken || null},
          ${stripeData.stripeRefreshToken || null},
          ${stripeData.accountCountry || null},
          ${stripeData.accountCurrency || null}
        )
        RETURNING *
      `
    })
    return mapRowToPayoutMethod(result.rows[0] as Record<string, unknown>)
  }
}

/**
 * Map database row to PayoutMethod
 */
function mapRowToPayoutMethod(row: Record<string, unknown>): PayoutMethod {
  let checkAddress: CheckAddress | null = null
  try {
    const addressData = row.check_address
    if (addressData) {
      checkAddress =
        typeof addressData === 'string'
          ? JSON.parse(addressData)
          : (addressData as CheckAddress)
    }
  } catch {
    checkAddress = null
  }

  let stripeCapabilities: Record<string, string> | null = null
  try {
    const capData = row.stripe_capabilities
    if (capData) {
      stripeCapabilities =
        typeof capData === 'string'
          ? JSON.parse(capData)
          : (capData as Record<string, string>)
    }
  } catch {
    stripeCapabilities = null
  }

  let stripeRequirementsErrors: PayoutMethod['stripeRequirementsErrors'] = []
  try {
    const errData = row.stripe_requirements_errors
    if (errData) {
      stripeRequirementsErrors =
        typeof errData === 'string'
          ? JSON.parse(errData)
          : (errData as PayoutMethod['stripeRequirementsErrors'])
    }
  } catch {
    stripeRequirementsErrors = []
  }

  return {
    id: row.id as string,
    payeeId: row.payee_id as string,
    tenantId: row.tenant_id as string,
    type: row.type as PayoutMethodType,
    isDefault: Boolean(row.is_default),
    status: row.status as PayoutMethodStatus,
    stripeAccountId: (row.stripe_account_id as string) || null,
    stripeAccountStatus:
      (row.stripe_account_status as PayoutMethod['stripeAccountStatus']) ||
      null,
    stripeOnboardingComplete: Boolean(row.stripe_onboarding_complete),
    stripePayoutsEnabled: Boolean(row.stripe_payouts_enabled),
    stripeChargesEnabled: Boolean(row.stripe_charges_enabled),
    stripeDetailsSubmitted: Boolean(row.stripe_details_submitted),
    stripeCapabilities,
    stripeRequirementsDue: (row.stripe_requirements_due as string[]) || [],
    stripeRequirementsErrors,
    stripeAccessToken: (row.stripe_access_token as string) || null,
    stripeRefreshToken: (row.stripe_refresh_token as string) || null,
    accountCountry: (row.account_country as string) || null,
    accountCurrency: (row.account_currency as string) || null,
    paypalEmail: (row.paypal_email as string) || null,
    venmoHandle: (row.venmo_handle as string) || null,
    checkAddress,
    bankName: (row.bank_name as string) || null,
    accountLastFour: (row.account_last_four as string) || null,
    verificationStatus:
      (row.verification_status as PayoutMethod['verificationStatus']) || null,
    verifiedAt: row.verified_at ? new Date(row.verified_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Payout method error class
 */
export class PayoutMethodError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'PayoutMethodError'
    this.code = code
  }
}
