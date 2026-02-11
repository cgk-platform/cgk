/**
 * SMS Opt-Out Management
 *
 * Handles TCPA-compliant opt-out and opt-in management.
 * Opt-outs are tenant-isolated and respected immediately.
 *
 * @ai-pattern tenant-isolation
 * @ai-critical TCPA requires immediate honoring of STOP requests
 */

import { sql, withTenant } from '@cgk/db'

import { normalizeToE164 } from './compliance.js'
import type {
  CreateSmsOptOutInput,
  SmsOptOut,
  SmsOptOutMethod,
} from './types.js'

// ============================================================================
// Opt-Out Operations
// ============================================================================

/**
 * Add a phone number to the opt-out list
 */
export async function addOptOut(input: CreateSmsOptOutInput): Promise<SmsOptOut> {
  const normalizedPhone = normalizeToE164(input.phoneNumber)

  if (!normalizedPhone) {
    throw new Error('Invalid phone number format')
  }

  const result = await withTenant(input.tenantId, async () => {
    return sql`
      INSERT INTO sms_opt_outs (
        tenant_id,
        phone_number,
        opt_out_method,
        original_message,
        opted_out_at
      ) VALUES (
        ${input.tenantId},
        ${normalizedPhone},
        ${input.optOutMethod},
        ${input.originalMessage || null},
        NOW()
      )
      ON CONFLICT (tenant_id, phone_number) DO UPDATE
      SET
        opt_out_method = ${input.optOutMethod},
        original_message = COALESCE(${input.originalMessage || null}, sms_opt_outs.original_message),
        opted_out_at = NOW()
      RETURNING
        id,
        tenant_id as "tenantId",
        phone_number as "phoneNumber",
        opt_out_method as "optOutMethod",
        original_message as "originalMessage",
        opted_out_at as "optedOutAt"
    `
  })

  return result.rows[0] as SmsOptOut
}

/**
 * Remove a phone number from the opt-out list (opt-in)
 */
export async function removeOptOut(tenantId: string, phoneNumber: string): Promise<boolean> {
  const normalizedPhone = normalizeToE164(phoneNumber)

  if (!normalizedPhone) {
    throw new Error('Invalid phone number format')
  }

  const result = await withTenant(tenantId, async () => {
    return sql`
      DELETE FROM sms_opt_outs
      WHERE tenant_id = ${tenantId}
        AND phone_number = ${normalizedPhone}
    `
  })

  return (result.rowCount ?? 0) > 0
}

/**
 * Check if a phone number is opted out
 */
export async function isOptedOut(tenantId: string, phoneNumber: string): Promise<boolean> {
  const normalizedPhone = normalizeToE164(phoneNumber)

  if (!normalizedPhone) {
    return true // Treat invalid numbers as opted out
  }

  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT 1 FROM sms_opt_outs
      WHERE tenant_id = ${tenantId}
        AND phone_number = ${normalizedPhone}
      LIMIT 1
    `
  })

  return result.rows.length > 0
}

/**
 * Get opt-out record for a phone number
 */
export async function getOptOut(
  tenantId: string,
  phoneNumber: string
): Promise<SmsOptOut | null> {
  const normalizedPhone = normalizeToE164(phoneNumber)

  if (!normalizedPhone) {
    return null
  }

  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        phone_number as "phoneNumber",
        opt_out_method as "optOutMethod",
        original_message as "originalMessage",
        opted_out_at as "optedOutAt"
      FROM sms_opt_outs
      WHERE tenant_id = ${tenantId}
        AND phone_number = ${normalizedPhone}
    `
  })

  return (result.rows[0] as SmsOptOut) || null
}

/**
 * List all opt-outs for a tenant
 */
export async function listOptOuts(
  tenantId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ optOuts: SmsOptOut[]; total: number }> {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const [optOuts, countResult] = await withTenant(tenantId, async () => {
    return Promise.all([
      sql`
        SELECT
          id,
          tenant_id as "tenantId",
          phone_number as "phoneNumber",
          opt_out_method as "optOutMethod",
          original_message as "originalMessage",
          opted_out_at as "optedOutAt"
        FROM sms_opt_outs
        WHERE tenant_id = ${tenantId}
        ORDER BY opted_out_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*) as count FROM sms_opt_outs
        WHERE tenant_id = ${tenantId}
      `,
    ])
  })

  return {
    optOuts: optOuts.rows as SmsOptOut[],
    total: parseInt((countResult.rows[0] as { count: string }).count, 10),
  }
}

/**
 * Handle opt-out from STOP keyword (incoming SMS)
 */
export async function handleStopKeyword(
  tenantId: string,
  phoneNumber: string,
  originalMessage: string
): Promise<void> {
  await addOptOut({
    tenantId,
    phoneNumber,
    optOutMethod: 'stop_keyword',
    originalMessage,
  })

  // Cancel any pending SMS to this number
  await cancelPendingSmsForOptOut(tenantId, phoneNumber)
}

/**
 * Handle opt-in from START keyword (incoming SMS)
 */
export async function handleStartKeyword(
  tenantId: string,
  phoneNumber: string
): Promise<void> {
  await removeOptOut(tenantId, phoneNumber)
}

/**
 * Cancel pending SMS for an opted-out recipient
 */
async function cancelPendingSmsForOptOut(
  tenantId: string,
  phoneNumber: string
): Promise<number> {
  const normalizedPhone = normalizeToE164(phoneNumber)

  if (!normalizedPhone) {
    return 0
  }

  const result = await withTenant(tenantId, async () => {
    return sql`
      UPDATE sms_queue
      SET
        status = 'skipped',
        skip_reason = 'recipient_opted_out',
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND phone_number = ${normalizedPhone}
        AND status IN ('pending', 'scheduled')
    `
  })

  return result.rowCount ?? 0
}

/**
 * Bulk check opt-out status for multiple phone numbers
 */
export async function checkBulkOptOutStatus(
  tenantId: string,
  phoneNumbers: string[]
): Promise<Map<string, boolean>> {
  const normalizedNumbers = phoneNumbers
    .map((p) => normalizeToE164(p))
    .filter((p): p is string => p !== null)

  if (normalizedNumbers.length === 0) {
    return new Map()
  }

  const result = await withTenant(tenantId, async () => {
    // Convert array to PostgreSQL array literal
    const phoneArray = `{${normalizedNumbers.map(p => `"${p}"`).join(',')}}`
    return sql`
      SELECT phone_number
      FROM sms_opt_outs
      WHERE tenant_id = ${tenantId}
        AND phone_number = ANY(${phoneArray}::text[])
    `
  })

  const optedOutSet = new Set(result.rows.map((row) => row.phone_number as string))
  const statusMap = new Map<string, boolean>()

  for (const phone of normalizedNumbers) {
    statusMap.set(phone, optedOutSet.has(phone))
  }

  return statusMap
}

/**
 * Get opt-out statistics for a tenant
 */
export async function getOptOutStats(tenantId: string): Promise<{
  total: number
  byMethod: Record<SmsOptOutMethod, number>
  last24Hours: number
  last7Days: number
}> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE opt_out_method = 'stop_keyword') as stop_keyword,
        COUNT(*) FILTER (WHERE opt_out_method = 'admin') as admin,
        COUNT(*) FILTER (WHERE opt_out_method = 'user_settings') as user_settings,
        COUNT(*) FILTER (WHERE opted_out_at > NOW() - INTERVAL '24 hours') as last_24h,
        COUNT(*) FILTER (WHERE opted_out_at > NOW() - INTERVAL '7 days') as last_7d
      FROM sms_opt_outs
      WHERE tenant_id = ${tenantId}
    `
  })

  const row = result.rows[0] as {
    total: string
    stop_keyword: string
    admin: string
    user_settings: string
    last_24h: string
    last_7d: string
  }

  return {
    total: parseInt(row.total, 10),
    byMethod: {
      stop_keyword: parseInt(row.stop_keyword, 10),
      admin: parseInt(row.admin, 10),
      user_settings: parseInt(row.user_settings, 10),
    },
    last24Hours: parseInt(row.last_24h, 10),
    last7Days: parseInt(row.last_7d, 10),
  }
}

/**
 * Find tenant by Twilio phone number (for webhook routing)
 */
export async function findTenantByTwilioNumber(
  twilioPhoneNumber: string
): Promise<string | null> {
  // Query across all tenants in public schema
  const result = await sql`
    SELECT tenant_id
    FROM public.tenant_sms_settings
    WHERE twilio_phone_number = ${twilioPhoneNumber}
    LIMIT 1
  `

  const row = result.rows[0] as { tenant_id: string } | undefined
  if (!row) {
    return null
  }

  return row.tenant_id
}
