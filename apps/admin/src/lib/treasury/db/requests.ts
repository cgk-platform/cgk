/**
 * Treasury Draw Request database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  DrawRequest,
  DrawRequestItem,
  DrawRequestWithItems,
  DrawRequestWithDetails,
  CreateDrawRequestInput,
  DrawRequestStatus,
  PendingWithdrawal,
} from '../types'

/**
 * Generate a unique request number
 */
async function generateRequestNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const result = await sql`
    SELECT COUNT(*) as count FROM treasury_draw_requests
    WHERE request_number LIKE ${`DR-${year}-%`}
  `
  const count = Number(result.rows[0]?.count || 0)
  return `DR-${year}-${String(count + 1).padStart(4, '0')}`
}

/**
 * Get all draw requests with optional status filter
 */
export async function getDrawRequests(
  tenantSlug: string,
  options?: { status?: DrawRequestStatus; payee?: string }
): Promise<DrawRequestWithItems[]> {
  return withTenant(tenantSlug, async () => {
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
    `

    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (options?.status) {
      paramIndex++
      conditions.push(`dr.status = $${paramIndex}::draw_request_status`)
      values.push(options.status)
    }

    if (options?.payee) {
      paramIndex++
      conditions.push(`EXISTS (
        SELECT 1 FROM treasury_draw_request_items dri2
        WHERE dri2.request_id = dr.id
        AND dri2.creator_name ILIKE $${paramIndex}
      )`)
      values.push(`%${options.payee}%`)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ` GROUP BY dr.id ORDER BY dr.created_at DESC`

    const result = await sql.query(query, values)
    return result.rows as DrawRequestWithItems[]
  })
}

/**
 * Get a single draw request by ID with items
 */
export async function getDrawRequest(
  tenantSlug: string,
  requestId: string
): Promise<DrawRequestWithItems | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
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
      WHERE dr.id = ${requestId}
      GROUP BY dr.id
    `
    return (result.rows[0] as DrawRequestWithItems) || null
  })
}

/**
 * Get a draw request with full details including communications
 */
export async function getDrawRequestWithDetails(
  tenantSlug: string,
  requestId: string
): Promise<DrawRequestWithDetails | null> {
  return withTenant(tenantSlug, async () => {
    const requestResult = await sql`
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
      WHERE dr.id = ${requestId}
      GROUP BY dr.id
    `

    if (requestResult.rows.length === 0) {
      return null
    }

    const communicationsResult = await sql`
      SELECT * FROM treasury_communications
      WHERE request_id = ${requestId}
      ORDER BY created_at DESC
    `

    return {
      ...(requestResult.rows[0] as DrawRequestWithItems),
      communications: communicationsResult.rows,
    } as DrawRequestWithDetails
  })
}

/**
 * Create a new draw request from pending withdrawals
 */
export async function createDrawRequest(
  tenantSlug: string,
  input: CreateDrawRequestInput,
  createdBy: string
): Promise<DrawRequestWithItems> {
  return withTenant(tenantSlug, async () => {
    const requestNumber = await generateRequestNumber()

    // Get withdrawal details for the items
    const withdrawalsResult = await sql`
      SELECT
        w.id,
        w.amount_cents,
        w.currency,
        c.first_name || ' ' || c.last_name as creator_name,
        w.notes as project_description
      FROM withdrawals w
      JOIN creators c ON c.id = w.creator_id
      WHERE w.id = ANY(${`{${input.withdrawal_ids.map(s => `"${s}"`).join(',')}}`}::text[])
      AND w.status IN ('pending', 'approved')
    `

    if (withdrawalsResult.rows.length === 0) {
      throw new Error('No valid pending withdrawals found')
    }

    // Calculate total amount
    const totalAmountCents = withdrawalsResult.rows.reduce(
      (sum, w) => sum + Number(w.amount_cents),
      0
    )

    // Create the draw request
    const requestResult = await sql`
      INSERT INTO treasury_draw_requests (
        request_number, description, total_amount_cents, currency,
        treasurer_name, treasurer_email, signers, due_date, is_draft, created_by
      ) VALUES (
        ${requestNumber},
        ${input.description},
        ${totalAmountCents},
        'USD',
        ${input.treasurer_name},
        ${input.treasurer_email},
        ${input.signers ? `{${input.signers.map(s => `"${s}"`).join(',')}}` : '{}'}::text[],
        ${input.due_date || null},
        ${input.is_draft || false},
        ${createdBy}
      )
      RETURNING *
    `

    const request = requestResult.rows[0] as DrawRequest

    // Create the request items
    const items: DrawRequestItem[] = []
    for (const withdrawal of withdrawalsResult.rows) {
      const itemResult = await sql`
        INSERT INTO treasury_draw_request_items (
          request_id, withdrawal_id, creator_name, project_description, net_amount_cents, currency
        ) VALUES (
          ${request.id},
          ${withdrawal.id},
          ${withdrawal.creator_name},
          ${withdrawal.project_description || null},
          ${withdrawal.amount_cents},
          ${withdrawal.currency || 'USD'}
        )
        RETURNING *
      `
      items.push(itemResult.rows[0] as DrawRequestItem)
    }

    return {
      ...request,
      items,
    }
  })
}

/**
 * Update draw request PDF URL
 */
export async function updateDrawRequestPdf(
  tenantSlug: string,
  requestId: string,
  pdfUrl: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE treasury_draw_requests
      SET pdf_url = ${pdfUrl}, updated_at = NOW()
      WHERE id = ${requestId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Approve a draw request
 */
export async function approveDrawRequest(
  tenantSlug: string,
  requestId: string,
  approvedBy: string,
  message?: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE treasury_draw_requests
      SET
        status = 'approved'::draw_request_status,
        approved_at = NOW(),
        approved_by = ${approvedBy},
        approval_message = ${message || null},
        updated_at = NOW()
      WHERE id = ${requestId} AND status = 'pending'
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Reject a draw request
 */
export async function rejectDrawRequest(
  tenantSlug: string,
  requestId: string,
  rejectedBy: string,
  reason: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE treasury_draw_requests
      SET
        status = 'rejected'::draw_request_status,
        rejected_at = NOW(),
        rejected_by = ${rejectedBy},
        rejection_reason = ${reason},
        updated_at = NOW()
      WHERE id = ${requestId} AND status = 'pending'
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Cancel a draw request
 */
export async function cancelDrawRequest(
  tenantSlug: string,
  requestId: string,
  cancelledBy: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE treasury_draw_requests
      SET
        status = 'cancelled'::draw_request_status,
        cancelled_at = NOW(),
        cancelled_by = ${cancelledBy},
        updated_at = NOW()
      WHERE id = ${requestId} AND status = 'pending'
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Get pending withdrawals for draw request creation
 */
export async function getPendingWithdrawalsForDraw(
  tenantSlug: string
): Promise<PendingWithdrawal[]> {
  return withTenant(tenantSlug, async () => {
    // Get withdrawals that are pending/approved and not already in an active draw request
    const result = await sql`
      SELECT
        w.id,
        w.creator_id,
        c.first_name || ' ' || c.last_name as creator_name,
        c.email as creator_email,
        w.amount_cents,
        w.currency,
        w.method,
        w.notes as project_description,
        w.requested_at
      FROM withdrawals w
      JOIN creators c ON c.id = w.creator_id
      WHERE w.status IN ('pending', 'approved')
      AND NOT EXISTS (
        SELECT 1 FROM treasury_draw_request_items dri
        JOIN treasury_draw_requests dr ON dr.id = dri.request_id
        WHERE dri.withdrawal_id = w.id
        AND dr.status IN ('pending', 'approved')
      )
      ORDER BY w.requested_at ASC
    `
    return result.rows as PendingWithdrawal[]
  })
}

/**
 * Mark withdrawals as processed after draw request approval
 */
export async function markWithdrawalsFromDrawRequest(
  tenantSlug: string,
  requestId: string,
  status: 'processing' | 'approved'
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE withdrawals
      SET status = ${status}::withdrawal_status, updated_at = NOW()
      WHERE id IN (
        SELECT withdrawal_id FROM treasury_draw_request_items
        WHERE request_id = ${requestId}
      )
    `
    return result.rowCount ?? 0
  })
}
