/**
 * SMS Settings Management
 *
 * Handles tenant SMS settings storage and retrieval.
 * All settings are tenant-isolated and SMS is OFF by default.
 *
 * @ai-pattern tenant-isolation
 * @ai-critical All queries must use withTenant wrapper
 */

import { sql, withTenant } from '@cgk/db'

import type {
  SmsHealthStatus,
  TenantSmsSettings,
  UpdateSmsSettingsInput,
} from './types.js'

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SMS_SETTINGS: Omit<TenantSmsSettings, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> = {
  smsEnabled: false,
  provider: 'none',
  twilioAccountSid: null,
  twilioAuthToken: null,
  twilioPhoneNumber: null,
  twilioMessagingServiceSid: null,
  a2p10dlcRegistered: false,
  tollFreeVerified: false,
  quietHoursEnabled: true,
  quietHoursStart: '21:00',
  quietHoursEnd: '09:00',
  quietHoursTimezone: 'America/New_York',
  messagesPerSecond: 1,
  dailyLimit: 1000,
  setupCompletedAt: null,
  lastHealthCheckAt: null,
  healthStatus: 'unconfigured',
}

// ============================================================================
// Settings Operations
// ============================================================================

/**
 * Get SMS settings for a tenant
 * Creates default settings if none exist
 */
export async function getSmsSettings(tenantId: string): Promise<TenantSmsSettings> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        sms_enabled as "smsEnabled",
        provider,
        twilio_account_sid as "twilioAccountSid",
        twilio_auth_token as "twilioAuthToken",
        twilio_phone_number as "twilioPhoneNumber",
        twilio_messaging_service_sid as "twilioMessagingServiceSid",
        a2p_10dlc_registered as "a2p10dlcRegistered",
        toll_free_verified as "tollFreeVerified",
        quiet_hours_enabled as "quietHoursEnabled",
        quiet_hours_start as "quietHoursStart",
        quiet_hours_end as "quietHoursEnd",
        quiet_hours_timezone as "quietHoursTimezone",
        messages_per_second as "messagesPerSecond",
        daily_limit as "dailyLimit",
        setup_completed_at as "setupCompletedAt",
        last_health_check_at as "lastHealthCheckAt",
        health_status as "healthStatus",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tenant_sms_settings
      WHERE tenant_id = ${tenantId}
    `
  })

  if (result.rows.length > 0) {
    return result.rows[0] as TenantSmsSettings
  }

  // Create default settings if none exist
  return createDefaultSmsSettings(tenantId)
}

/**
 * Create default SMS settings for a tenant
 */
async function createDefaultSmsSettings(tenantId: string): Promise<TenantSmsSettings> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      INSERT INTO tenant_sms_settings (
        tenant_id,
        sms_enabled,
        provider,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end,
        quiet_hours_timezone,
        messages_per_second,
        daily_limit,
        health_status
      ) VALUES (
        ${tenantId},
        ${DEFAULT_SMS_SETTINGS.smsEnabled},
        ${DEFAULT_SMS_SETTINGS.provider},
        ${DEFAULT_SMS_SETTINGS.quietHoursEnabled},
        ${DEFAULT_SMS_SETTINGS.quietHoursStart},
        ${DEFAULT_SMS_SETTINGS.quietHoursEnd},
        ${DEFAULT_SMS_SETTINGS.quietHoursTimezone},
        ${DEFAULT_SMS_SETTINGS.messagesPerSecond},
        ${DEFAULT_SMS_SETTINGS.dailyLimit},
        ${DEFAULT_SMS_SETTINGS.healthStatus}
      )
      ON CONFLICT (tenant_id) DO NOTHING
      RETURNING
        id,
        tenant_id as "tenantId",
        sms_enabled as "smsEnabled",
        provider,
        twilio_account_sid as "twilioAccountSid",
        twilio_auth_token as "twilioAuthToken",
        twilio_phone_number as "twilioPhoneNumber",
        twilio_messaging_service_sid as "twilioMessagingServiceSid",
        a2p_10dlc_registered as "a2p10dlcRegistered",
        toll_free_verified as "tollFreeVerified",
        quiet_hours_enabled as "quietHoursEnabled",
        quiet_hours_start as "quietHoursStart",
        quiet_hours_end as "quietHoursEnd",
        quiet_hours_timezone as "quietHoursTimezone",
        messages_per_second as "messagesPerSecond",
        daily_limit as "dailyLimit",
        setup_completed_at as "setupCompletedAt",
        last_health_check_at as "lastHealthCheckAt",
        health_status as "healthStatus",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
  })

  if (result.rows.length > 0) {
    return result.rows[0] as TenantSmsSettings
  }

  // If we hit a conflict, fetch the existing settings
  return getSmsSettings(tenantId)
}

/**
 * Update SMS settings for a tenant
 */
export async function updateSmsSettings(
  tenantId: string,
  input: UpdateSmsSettingsInput
): Promise<TenantSmsSettings> {
  // Ensure settings exist first
  await getSmsSettings(tenantId)

  const result = await withTenant(tenantId, async () => {
    return sql`
      UPDATE tenant_sms_settings
      SET
        sms_enabled = COALESCE(${input.smsEnabled ?? null}, sms_enabled),
        provider = COALESCE(${input.provider ?? null}, provider),
        twilio_account_sid = COALESCE(${input.twilioAccountSid ?? null}, twilio_account_sid),
        twilio_auth_token = COALESCE(${input.twilioAuthToken ?? null}, twilio_auth_token),
        twilio_phone_number = COALESCE(${input.twilioPhoneNumber ?? null}, twilio_phone_number),
        twilio_messaging_service_sid = COALESCE(${input.twilioMessagingServiceSid ?? null}, twilio_messaging_service_sid),
        a2p_10dlc_registered = COALESCE(${input.a2p10dlcRegistered ?? null}, a2p_10dlc_registered),
        toll_free_verified = COALESCE(${input.tollFreeVerified ?? null}, toll_free_verified),
        quiet_hours_enabled = COALESCE(${input.quietHoursEnabled ?? null}, quiet_hours_enabled),
        quiet_hours_start = COALESCE(${input.quietHoursStart ?? null}, quiet_hours_start),
        quiet_hours_end = COALESCE(${input.quietHoursEnd ?? null}, quiet_hours_end),
        quiet_hours_timezone = COALESCE(${input.quietHoursTimezone ?? null}, quiet_hours_timezone),
        messages_per_second = COALESCE(${input.messagesPerSecond ?? null}, messages_per_second),
        daily_limit = COALESCE(${input.dailyLimit ?? null}, daily_limit),
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
      RETURNING
        id,
        tenant_id as "tenantId",
        sms_enabled as "smsEnabled",
        provider,
        twilio_account_sid as "twilioAccountSid",
        twilio_auth_token as "twilioAuthToken",
        twilio_phone_number as "twilioPhoneNumber",
        twilio_messaging_service_sid as "twilioMessagingServiceSid",
        a2p_10dlc_registered as "a2p10dlcRegistered",
        toll_free_verified as "tollFreeVerified",
        quiet_hours_enabled as "quietHoursEnabled",
        quiet_hours_start as "quietHoursStart",
        quiet_hours_end as "quietHoursEnd",
        quiet_hours_timezone as "quietHoursTimezone",
        messages_per_second as "messagesPerSecond",
        daily_limit as "dailyLimit",
        setup_completed_at as "setupCompletedAt",
        last_health_check_at as "lastHealthCheckAt",
        health_status as "healthStatus",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
  })

  return result.rows[0] as TenantSmsSettings
}

/**
 * Mark SMS setup as completed
 */
export async function markSmsSetupCompleted(tenantId: string): Promise<void> {
  await withTenant(tenantId, async () => {
    return sql`
      UPDATE tenant_sms_settings
      SET
        setup_completed_at = NOW(),
        health_status = 'healthy',
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
}

/**
 * Update SMS health status
 */
export async function updateSmsHealthStatus(
  tenantId: string,
  status: SmsHealthStatus
): Promise<void> {
  await withTenant(tenantId, async () => {
    return sql`
      UPDATE tenant_sms_settings
      SET
        health_status = ${status},
        last_health_check_at = NOW(),
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
}

/**
 * Check if SMS is enabled for a tenant
 */
export async function isSmsEnabled(tenantId: string): Promise<boolean> {
  const settings = await getSmsSettings(tenantId)
  return settings.smsEnabled && settings.healthStatus !== 'failed'
}

/**
 * Get all tenants with SMS enabled
 */
export async function getSmsEnabledTenants(): Promise<string[]> {
  // Query public schema for tenant list
  const result = await sql`
    SELECT DISTINCT tenant_id
    FROM public.tenant_sms_settings
    WHERE sms_enabled = true
      AND health_status != 'failed'
  `

  return result.rows.map((row) => row.tenant_id as string)
}

/**
 * Validate Twilio credentials are configured
 */
export function hasValidTwilioConfig(settings: TenantSmsSettings): boolean {
  return !!(
    settings.twilioAccountSid &&
    settings.twilioAuthToken &&
    settings.twilioPhoneNumber
  )
}

/**
 * Get encrypted credentials for a tenant (for use with Twilio SDK)
 * Note: In production, credentials should be decrypted here
 */
export async function getTwilioCredentials(
  tenantId: string
): Promise<{ accountSid: string; authToken: string; phoneNumber: string } | null> {
  const settings = await getSmsSettings(tenantId)

  if (!hasValidTwilioConfig(settings)) {
    return null
  }

  // In production, decrypt credentials here
  // For now, return as-is (assuming encryption is handled at insert time)
  return {
    accountSid: settings.twilioAccountSid!,
    authToken: settings.twilioAuthToken!,
    phoneNumber: settings.twilioPhoneNumber!,
  }
}
