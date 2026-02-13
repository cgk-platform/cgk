/**
 * Tenant credential storage utilities
 *
 * Handles encrypted storage and retrieval of tenant-owned API credentials
 */

import { sql, withTenant } from '@cgk/db'
import { encryptToken, decryptToken } from '../encryption.js'
import {
  SERVICE_DISPLAY_NAMES,
  type TenantStripeConfig,
  type TenantStripeConfigInput,
  type TenantResendConfig,
  type TenantResendConfigInput,
  type TenantWiseConfig,
  type TenantWiseConfigInput,
  type TenantApiCredential,
  type TenantApiCredentialInput,
  type TenantApiService,
} from './types.js'

/** Get the encryption key from environment */
function getEncryptionKey(): string {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY must be set and at least 32 characters'
    )
  }
  return key
}

// =============================================================================
// Stripe Config
// =============================================================================

/** Get tenant's Stripe configuration */
export async function getTenantStripeConfig(
  tenantId: string
): Promise<TenantStripeConfig | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT * FROM tenant_stripe_config
      WHERE tenant_id = ${tenantId} AND is_active = true
    `
  })

  const row = result.rows[0] as Record<string, unknown> | undefined
  if (!row) return null

  return mapStripeConfigRow(row)
}

/** Save or update tenant's Stripe configuration */
export async function saveTenantStripeConfig(
  tenantId: string,
  input: TenantStripeConfigInput
): Promise<TenantStripeConfig> {
  const key = getEncryptionKey()
  const secretKeyEncrypted = await encryptToken(input.secretKey, key)
  const webhookSecretEncrypted = input.webhookSecret
    ? await encryptToken(input.webhookSecret, key)
    : null

  const result = await withTenant(tenantId, async () => {
    return sql`
      INSERT INTO tenant_stripe_config (
        tenant_id,
        secret_key_encrypted,
        publishable_key,
        webhook_secret_encrypted,
        livemode
      ) VALUES (
        ${tenantId},
        ${secretKeyEncrypted},
        ${input.publishableKey || null},
        ${webhookSecretEncrypted},
        ${input.livemode ?? false}
      )
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        secret_key_encrypted = EXCLUDED.secret_key_encrypted,
        publishable_key = EXCLUDED.publishable_key,
        webhook_secret_encrypted = EXCLUDED.webhook_secret_encrypted,
        livemode = EXCLUDED.livemode,
        last_error = NULL,
        updated_at = NOW()
      RETURNING *
    `
  })

  const row = result.rows[0] as Record<string, unknown>
  if (!row) throw new Error('Failed to save Stripe config')
  return mapStripeConfigRow(row)
}

/** Get decrypted Stripe secret key */
export async function getTenantStripeSecretKey(
  tenantId: string
): Promise<string | null> {
  const config = await getTenantStripeConfig(tenantId)
  if (!config) return null

  const key = getEncryptionKey()
  return decryptToken(config.secretKeyEncrypted, key)
}

/** Update Stripe config verification status */
export async function updateStripeConfigVerification(
  tenantId: string,
  verified: boolean,
  accountInfo?: { accountId?: string; accountName?: string; accountCountry?: string },
  error?: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    if (verified && accountInfo) {
      await sql`
        UPDATE tenant_stripe_config
        SET
          last_verified_at = NOW(),
          stripe_account_id = ${accountInfo.accountId || null},
          account_name = ${accountInfo.accountName || null},
          account_country = ${accountInfo.accountCountry || null},
          last_error = NULL
        WHERE tenant_id = ${tenantId}
      `
    } else {
      await sql`
        UPDATE tenant_stripe_config
        SET last_error = ${error || 'Verification failed'}
        WHERE tenant_id = ${tenantId}
      `
    }
  })
}

function mapStripeConfigRow(row: Record<string, unknown>): TenantStripeConfig {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    secretKeyEncrypted: row.secret_key_encrypted as string,
    publishableKey: row.publishable_key as string | null,
    webhookSecretEncrypted: row.webhook_secret_encrypted as string | null,
    stripeAccountId: row.stripe_account_id as string | null,
    accountName: row.account_name as string | null,
    accountCountry: row.account_country as string | null,
    livemode: row.livemode as boolean,
    connectEnabled: row.connect_enabled as boolean,
    connectClientId: row.connect_client_id as string | null,
    isActive: row.is_active as boolean,
    lastVerifiedAt: row.last_verified_at ? new Date(row.last_verified_at as string) : null,
    lastError: row.last_error as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

// =============================================================================
// Resend Config
// =============================================================================

/** Get tenant's Resend configuration */
export async function getTenantResendConfig(
  tenantId: string
): Promise<TenantResendConfig | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT * FROM tenant_resend_config
      WHERE tenant_id = ${tenantId} AND is_active = true
    `
  })

  const row = result.rows[0] as Record<string, unknown> | undefined
  if (!row) return null

  return mapResendConfigRow(row)
}

/** Save or update tenant's Resend configuration */
export async function saveTenantResendConfig(
  tenantId: string,
  input: TenantResendConfigInput
): Promise<TenantResendConfig> {
  const key = getEncryptionKey()
  const apiKeyEncrypted = await encryptToken(input.apiKey, key)

  const result = await withTenant(tenantId, async () => {
    return sql`
      INSERT INTO tenant_resend_config (
        tenant_id,
        api_key_encrypted,
        default_from_email,
        default_from_name,
        default_reply_to
      ) VALUES (
        ${tenantId},
        ${apiKeyEncrypted},
        ${input.defaultFromEmail || null},
        ${input.defaultFromName || null},
        ${input.defaultReplyTo || null}
      )
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        api_key_encrypted = EXCLUDED.api_key_encrypted,
        default_from_email = EXCLUDED.default_from_email,
        default_from_name = EXCLUDED.default_from_name,
        default_reply_to = EXCLUDED.default_reply_to,
        last_error = NULL,
        updated_at = NOW()
      RETURNING *
    `
  })

  const row = result.rows[0] as Record<string, unknown>
  if (!row) throw new Error('Failed to save Resend config')
  return mapResendConfigRow(row)
}

/** Get decrypted Resend API key */
export async function getTenantResendApiKey(
  tenantId: string
): Promise<string | null> {
  const config = await getTenantResendConfig(tenantId)
  if (!config) return null

  const key = getEncryptionKey()
  return decryptToken(config.apiKeyEncrypted, key)
}

function mapResendConfigRow(row: Record<string, unknown>): TenantResendConfig {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    apiKeyEncrypted: row.api_key_encrypted as string,
    resendTeamId: row.resend_team_id as string | null,
    accountName: row.account_name as string | null,
    defaultFromEmail: row.default_from_email as string | null,
    defaultFromName: row.default_from_name as string | null,
    defaultReplyTo: row.default_reply_to as string | null,
    verifiedDomains: (row.verified_domains as string[]) || [],
    isActive: row.is_active as boolean,
    lastVerifiedAt: row.last_verified_at ? new Date(row.last_verified_at as string) : null,
    lastError: row.last_error as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

// =============================================================================
// Wise Config
// =============================================================================

/** Get tenant's Wise configuration */
export async function getTenantWiseConfig(
  tenantId: string
): Promise<TenantWiseConfig | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT * FROM tenant_wise_config
      WHERE tenant_id = ${tenantId} AND is_active = true
    `
  })

  const row = result.rows[0] as Record<string, unknown> | undefined
  if (!row) return null

  return mapWiseConfigRow(row)
}

/** Save or update tenant's Wise configuration */
export async function saveTenantWiseConfig(
  tenantId: string,
  input: TenantWiseConfigInput
): Promise<TenantWiseConfig> {
  const key = getEncryptionKey()
  const apiKeyEncrypted = await encryptToken(input.apiKey, key)
  const webhookSecretEncrypted = input.webhookSecret
    ? await encryptToken(input.webhookSecret, key)
    : null

  const result = await withTenant(tenantId, async () => {
    return sql`
      INSERT INTO tenant_wise_config (
        tenant_id,
        api_key_encrypted,
        webhook_secret_encrypted,
        sandbox_mode,
        source_currency
      ) VALUES (
        ${tenantId},
        ${apiKeyEncrypted},
        ${webhookSecretEncrypted},
        ${input.sandboxMode ?? false},
        ${input.sourceCurrency || 'USD'}
      )
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        api_key_encrypted = EXCLUDED.api_key_encrypted,
        webhook_secret_encrypted = EXCLUDED.webhook_secret_encrypted,
        sandbox_mode = EXCLUDED.sandbox_mode,
        source_currency = EXCLUDED.source_currency,
        last_error = NULL,
        updated_at = NOW()
      RETURNING *
    `
  })

  const row = result.rows[0] as Record<string, unknown>
  if (!row) throw new Error('Failed to save Wise config')
  return mapWiseConfigRow(row)
}

/** Get decrypted Wise API key */
export async function getTenantWiseApiKey(
  tenantId: string
): Promise<string | null> {
  const config = await getTenantWiseConfig(tenantId)
  if (!config) return null

  const key = getEncryptionKey()
  return decryptToken(config.apiKeyEncrypted, key)
}

function mapWiseConfigRow(row: Record<string, unknown>): TenantWiseConfig {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    apiKeyEncrypted: row.api_key_encrypted as string,
    profileId: row.profile_id as string | null,
    profileType: row.profile_type as 'business' | 'personal' | null,
    accountHolderName: row.account_holder_name as string | null,
    sourceBalanceId: row.source_balance_id as string | null,
    sourceCurrency: row.source_currency as string,
    webhookSecretEncrypted: row.webhook_secret_encrypted as string | null,
    sandboxMode: row.sandbox_mode as boolean,
    isActive: row.is_active as boolean,
    lastVerifiedAt: row.last_verified_at ? new Date(row.last_verified_at as string) : null,
    lastError: row.last_error as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

// =============================================================================
// Generic API Credentials (Mux, AssemblyAI, Anthropic, etc.)
// =============================================================================

/** Get tenant's API credential for a specific service */
export async function getTenantApiCredential(
  tenantId: string,
  serviceName: TenantApiService
): Promise<TenantApiCredential | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT * FROM tenant_api_credentials
      WHERE tenant_id = ${tenantId}
        AND service_name = ${serviceName}
        AND is_active = true
    `
  })

  const row = result.rows[0] as Record<string, unknown> | undefined
  if (!row) return null

  return mapApiCredentialRow(row)
}

/** Get all tenant API credentials */
export async function getAllTenantApiCredentials(
  tenantId: string
): Promise<TenantApiCredential[]> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT * FROM tenant_api_credentials
      WHERE tenant_id = ${tenantId} AND is_active = true
      ORDER BY service_name
    `
  })

  return result.rows.map((row) => mapApiCredentialRow(row as Record<string, unknown>))
}

/** Save or update tenant's API credential for a service */
export async function saveTenantApiCredential(
  tenantId: string,
  input: TenantApiCredentialInput
): Promise<TenantApiCredential> {
  const key = getEncryptionKey()
  const apiKeyEncrypted = await encryptToken(input.apiKey, key)
  const apiSecretEncrypted = input.apiSecret
    ? await encryptToken(input.apiSecret, key)
    : null

  const displayName = SERVICE_DISPLAY_NAMES[input.serviceName] || input.serviceName

  const result = await withTenant(tenantId, async () => {
    return sql`
      INSERT INTO tenant_api_credentials (
        tenant_id,
        service_name,
        service_display_name,
        api_key_encrypted,
        api_secret_encrypted,
        metadata
      ) VALUES (
        ${tenantId},
        ${input.serviceName},
        ${displayName},
        ${apiKeyEncrypted},
        ${apiSecretEncrypted},
        ${JSON.stringify(input.metadata || {})}
      )
      ON CONFLICT (tenant_id, service_name)
      DO UPDATE SET
        api_key_encrypted = EXCLUDED.api_key_encrypted,
        api_secret_encrypted = EXCLUDED.api_secret_encrypted,
        metadata = EXCLUDED.metadata,
        last_error = NULL,
        updated_at = NOW()
      RETURNING *
    `
  })

  const row = result.rows[0] as Record<string, unknown>
  if (!row) throw new Error('Failed to save API credential')
  return mapApiCredentialRow(row)
}

/** Get decrypted API key for a service */
export async function getTenantApiKey(
  tenantId: string,
  serviceName: TenantApiService
): Promise<string | null> {
  const credential = await getTenantApiCredential(tenantId, serviceName)
  if (!credential) return null

  const key = getEncryptionKey()
  return decryptToken(credential.apiKeyEncrypted, key)
}

/** Get decrypted API key and secret for a service (for services like Mux) */
export async function getTenantApiKeyAndSecret(
  tenantId: string,
  serviceName: TenantApiService
): Promise<{ apiKey: string; apiSecret: string | null } | null> {
  const credential = await getTenantApiCredential(tenantId, serviceName)
  if (!credential) return null

  const key = getEncryptionKey()
  const apiKey = await decryptToken(credential.apiKeyEncrypted, key)
  const apiSecret = credential.apiSecretEncrypted
    ? await decryptToken(credential.apiSecretEncrypted, key)
    : null

  return { apiKey, apiSecret }
}

/** Delete a tenant's API credential */
export async function deleteTenantApiCredential(
  tenantId: string,
  serviceName: TenantApiService
): Promise<boolean> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      UPDATE tenant_api_credentials
      SET is_active = false, updated_at = NOW()
      WHERE tenant_id = ${tenantId} AND service_name = ${serviceName}
    `
  })

  return (result.rowCount ?? 0) > 0
}

function mapApiCredentialRow(row: Record<string, unknown>): TenantApiCredential {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    serviceName: row.service_name as TenantApiService,
    serviceDisplayName: row.service_display_name as string | null,
    apiKeyEncrypted: row.api_key_encrypted as string,
    apiSecretEncrypted: row.api_secret_encrypted as string | null,
    accountId: row.account_id as string | null,
    metadata: (row.metadata as Record<string, unknown>) || {},
    isActive: row.is_active as boolean,
    lastVerifiedAt: row.last_verified_at ? new Date(row.last_verified_at as string) : null,
    lastError: row.last_error as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

// =============================================================================
// Utility: Delete configs (soft delete)
// =============================================================================

/** Delete tenant's Stripe config */
export async function deleteTenantStripeConfig(tenantId: string): Promise<boolean> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      UPDATE tenant_stripe_config
      SET is_active = false, updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
  return (result.rowCount ?? 0) > 0
}

/** Delete tenant's Resend config */
export async function deleteTenantResendConfig(tenantId: string): Promise<boolean> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      UPDATE tenant_resend_config
      SET is_active = false, updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
  return (result.rowCount ?? 0) > 0
}

/** Delete tenant's Wise config */
export async function deleteTenantWiseConfig(tenantId: string): Promise<boolean> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      UPDATE tenant_wise_config
      SET is_active = false, updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
  return (result.rowCount ?? 0) > 0
}
