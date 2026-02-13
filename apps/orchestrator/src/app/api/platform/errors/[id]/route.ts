import { logAuditAction } from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Helper to get request context from headers (set by middleware)
 */
function getRequestContext(request: Request): {
  userId: string
  sessionId: string
  isSuperAdmin: boolean
} {
  return {
    userId: request.headers.get('x-user-id') || '',
    sessionId: request.headers.get('x-session-id') || '',
    isSuperAdmin: request.headers.get('x-is-super-admin') === 'true',
  }
}

/**
 * GET /api/platform/errors/[id]
 *
 * Get error details including full stack trace.
 * Requires: Super admin access
 */
export async function GET(request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const errorId = resolvedParams.id

  try {
    const { isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const result = await sql`
      SELECT
        pe.*,
        o.name as tenant_name,
        o.slug as tenant_slug,
        u_ack.email as acknowledged_by_email,
        u_res.email as resolved_by_email
      FROM platform_errors pe
      LEFT JOIN organizations o ON o.id = pe.tenant_id
      LEFT JOIN users u_ack ON u_ack.id = pe.acknowledged_by
      LEFT JOIN users u_res ON u_res.id = pe.resolved_by
      WHERE pe.id = ${errorId}
    `

    if (result.rows.length === 0) {
      return Response.json({ error: 'Error not found' }, { status: 404 })
    }

    const r = result.rows[0] as Record<string, unknown>

    // Get related errors with same pattern
    const patternHash = r.pattern_hash as string | null
    const relatedResult = patternHash
      ? await sql`
          SELECT id, occurred_at, tenant_id
          FROM platform_errors
          WHERE pattern_hash = ${patternHash}
            AND id != ${errorId}
          ORDER BY occurred_at DESC
          LIMIT 10
        `
      : { rows: [] }

    const error = {
      id: r.id,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name || r.tenant_id,
      tenantSlug: r.tenant_slug,
      severity: r.severity,
      status: r.status,
      errorType: r.error_type,
      message: r.message,
      stack: r.stack,
      metadata: r.metadata,
      patternHash: r.pattern_hash,
      occurredAt: r.occurred_at,
      acknowledgedAt: r.acknowledged_at,
      acknowledgedBy: r.acknowledged_by,
      acknowledgedByEmail: r.acknowledged_by_email,
      resolvedAt: r.resolved_at,
      resolvedBy: r.resolved_by,
      resolvedByEmail: r.resolved_by_email,
      relatedErrors: relatedResult.rows.map((row) => ({
        id: (row as Record<string, unknown>).id,
        occurredAt: (row as Record<string, unknown>).occurred_at,
        tenantId: (row as Record<string, unknown>).tenant_id,
      })),
    }

    return Response.json({ error })
  } catch (error) {
    console.error('Get error detail error:', error)
    return Response.json({ error: 'Failed to get error details' }, { status: 500 })
  }
}

/**
 * PATCH /api/platform/errors/[id]
 *
 * Update error status (acknowledge or resolve).
 * Requires: Super admin access
 *
 * Body:
 * - status: 'acknowledged' | 'resolved'
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const errorId = resolvedParams.id

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const { userId, isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !['acknowledged', 'resolved', 'open'].includes(status)) {
      return Response.json(
        { error: 'Valid status required (acknowledged, resolved, open)' },
        { status: 400 }
      )
    }

    // Get current error state for audit
    const currentResult = await sql`
      SELECT status, tenant_id FROM platform_errors WHERE id = ${errorId}
    `

    if (currentResult.rows.length === 0) {
      return Response.json({ error: 'Error not found' }, { status: 404 })
    }

    const current = currentResult.rows[0] as Record<string, unknown>

    // Update based on new status
    if (status === 'acknowledged') {
      await sql`
        UPDATE platform_errors
        SET status = 'acknowledged',
            acknowledged_at = NOW(),
            acknowledged_by = ${userId}
        WHERE id = ${errorId}
      `
    } else if (status === 'resolved') {
      await sql`
        UPDATE platform_errors
        SET status = 'resolved',
            resolved_at = NOW(),
            resolved_by = ${userId}
        WHERE id = ${errorId}
      `
    } else {
      // Re-open
      await sql`
        UPDATE platform_errors
        SET status = 'open',
            acknowledged_at = NULL,
            acknowledged_by = NULL,
            resolved_at = NULL,
            resolved_by = NULL
        WHERE id = ${errorId}
      `
    }

    // Log the action
    await logAuditAction({
      userId,
      action: 'edit_tenant',
      resourceType: 'api',
      resourceId: errorId,
      tenantId: current.tenant_id as string,
      oldValue: { status: current.status },
      newValue: { status },
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: {
        action: 'update_error_status',
      },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Update error status error:', error)
    return Response.json({ error: 'Failed to update error' }, { status: 500 })
  }
}
