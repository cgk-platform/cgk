/**
 * Auto-send automation for treasury
 *
 * Handles automatic processing of approved draw requests
 */

import { withTenant, sql } from '@cgk/db'

import { getAutoSendConfig } from './db/settings'
import type { DrawRequestWithItems } from './types'

/**
 * Configuration for auto-send
 */
export interface AutoSendConfig {
  enabled: boolean
  delayHours: number
  maxAmountCents: number | null
  treasurerEmail: string | null
}

/**
 * Get approved requests that are ready for auto-send
 */
export async function getRequestsReadyForAutoSend(
  tenantSlug: string
): Promise<DrawRequestWithItems[]> {
  const config = await getAutoSendConfig(tenantSlug)

  if (!config.enabled) {
    return []
  }

  return withTenant(tenantSlug, async () => {
    // Find approved requests where:
    // 1. Status is approved
    // 2. Approved at least X hours ago (based on delay setting)
    // 3. Amount is under max amount (if configured)
    // 4. Not already processed

    const delayInterval = `${config.delayHours} hours`
    const maxAmount = config.maxAmountCents

    let query = `
      SELECT
        dr.*,
        COALESCE(json_agg(
          json_build_object(
            'id', dri.id,
            'request_id', dri.request_id,
            'withdrawal_id', dri.withdrawal_id,
            'creator_name', dri.creator_name,
            'project_description', dri.project_description,
            'net_amount_cents', dri.net_amount_cents,
            'currency', dri.currency,
            'created_at', dri.created_at
          ) ORDER BY dri.created_at
        ) FILTER (WHERE dri.id IS NOT NULL), '[]') as items
      FROM treasury_draw_requests dr
      LEFT JOIN treasury_draw_request_items dri ON dri.request_id = dr.id
      WHERE dr.status = 'approved'
      AND dr.approved_at IS NOT NULL
      AND dr.approved_at <= NOW() - INTERVAL '${delayInterval}'
    `

    if (maxAmount !== null && maxAmount > 0) {
      query += ` AND dr.total_amount_cents <= ${maxAmount}`
    }

    query += ` GROUP BY dr.id ORDER BY dr.approved_at ASC`

    const result = await sql.query(query, [])
    return result.rows as DrawRequestWithItems[]
  })
}

/**
 * Check if a specific request is eligible for auto-send
 */
export async function isEligibleForAutoSend(
  tenantSlug: string,
  requestId: string
): Promise<{ eligible: boolean; reason?: string }> {
  const config = await getAutoSendConfig(tenantSlug)

  if (!config.enabled) {
    return { eligible: false, reason: 'Auto-send is not enabled' }
  }

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        status,
        approved_at,
        total_amount_cents
      FROM treasury_draw_requests
      WHERE id = ${requestId}
    `

    if (result.rows.length === 0) {
      return { eligible: false, reason: 'Request not found' }
    }

    const request = result.rows[0]

    if (request.status !== 'approved') {
      return { eligible: false, reason: `Request is ${request.status}, not approved` }
    }

    if (!request.approved_at) {
      return { eligible: false, reason: 'Request has no approval timestamp' }
    }

    const approvedAt = new Date(request.approved_at)
    const delayMs = config.delayHours * 60 * 60 * 1000
    const eligibleAt = new Date(approvedAt.getTime() + delayMs)

    if (new Date() < eligibleAt) {
      const hoursRemaining = Math.ceil((eligibleAt.getTime() - Date.now()) / (60 * 60 * 1000))
      return { eligible: false, reason: `Delay period not complete (${hoursRemaining}h remaining)` }
    }

    if (config.maxAmountCents !== null && request.total_amount_cents > config.maxAmountCents) {
      return {
        eligible: false,
        reason: `Amount exceeds auto-send limit ($${(config.maxAmountCents / 100).toFixed(2)})`,
      }
    }

    return { eligible: true }
  })
}

/**
 * Process a single approved request for auto-send
 * Returns the updated withdrawal statuses
 */
export async function processAutoSend(
  tenantSlug: string,
  requestId: string
): Promise<{ success: boolean; processedWithdrawals: number; error?: string }> {
  return withTenant(tenantSlug, async () => {
    // Verify request is still approved and eligible
    const request = await sql`
      SELECT id, status, approved_at FROM treasury_draw_requests
      WHERE id = ${requestId} AND status = 'approved'
    `

    if (request.rows.length === 0) {
      return { success: false, processedWithdrawals: 0, error: 'Request not found or not approved' }
    }

    // Get the withdrawal IDs from the request items
    const items = await sql`
      SELECT withdrawal_id FROM treasury_draw_request_items
      WHERE request_id = ${requestId}
    `

    if (items.rows.length === 0) {
      return { success: false, processedWithdrawals: 0, error: 'No withdrawals found in request' }
    }

    const withdrawalIds = items.rows.map((row) => row.withdrawal_id)

    // Update withdrawals to processing status
    const updateResult = await sql`
      UPDATE withdrawals
      SET status = 'processing'::withdrawal_status, updated_at = NOW()
      WHERE id = ANY(${withdrawalIds}::text[])
      AND status = 'approved'
      RETURNING id
    `

    return {
      success: true,
      processedWithdrawals: updateResult.rowCount ?? 0,
    }
  })
}

/**
 * Get auto-send statistics
 */
export async function getAutoSendStats(
  tenantSlug: string
): Promise<{
  pendingCount: number
  eligibleCount: number
  processedTodayCount: number
  nextEligibleAt: string | null
}> {
  const config = await getAutoSendConfig(tenantSlug)

  return withTenant(tenantSlug, async () => {
    const delayInterval = `${config.delayHours || 24} hours`

    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'approved')::int as pending_count,
        COUNT(*) FILTER (
          WHERE status = 'approved'
          AND approved_at <= NOW() - INTERVAL '${delayInterval}'
        )::int as eligible_count,
        COUNT(*) FILTER (
          WHERE status = 'approved'
          AND approved_at IS NOT NULL
          AND approved_at >= date_trunc('day', NOW())
        )::int as processed_today_count,
        MIN(approved_at + INTERVAL '${delayInterval}') FILTER (
          WHERE status = 'approved'
          AND approved_at > NOW() - INTERVAL '${delayInterval}'
        ) as next_eligible_at
      FROM treasury_draw_requests
    `

    return {
      pendingCount: result.rows[0]?.pending_count || 0,
      eligibleCount: result.rows[0]?.eligible_count || 0,
      processedTodayCount: result.rows[0]?.processed_today_count || 0,
      nextEligibleAt: result.rows[0]?.next_eligible_at || null,
    }
  })
}

/**
 * Run auto-send batch processing
 * This should be called by a scheduled job
 */
export async function runAutoSendBatch(
  tenantSlug: string,
  maxRequests = 10
): Promise<{
  success: boolean
  processed: number
  failed: number
  errors: string[]
}> {
  const requests = await getRequestsReadyForAutoSend(tenantSlug)
  const toProcess = requests.slice(0, maxRequests)

  let processed = 0
  let failed = 0
  const errors: string[] = []

  for (const request of toProcess) {
    try {
      const result = await processAutoSend(tenantSlug, request.id)
      if (result.success) {
        processed++
      } else {
        failed++
        errors.push(`Request ${request.request_number}: ${result.error}`)
      }
    } catch (error) {
      failed++
      errors.push(
        `Request ${request.request_number}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  return {
    success: failed === 0,
    processed,
    failed,
    errors,
  }
}
