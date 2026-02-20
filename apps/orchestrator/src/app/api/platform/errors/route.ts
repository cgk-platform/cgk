import { sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

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
 * GET /api/platform/errors
 *
 * Get platform errors with filtering.
 * Requires: Super admin access
 *
 * Query params:
 * - tenantId: Filter by tenant
 * - severity: Filter by severity (p1, p2, p3)
 * - status: Filter by status (open, acknowledged, resolved)
 * - limit: Max results (default 50, max 100)
 * - offset: Pagination offset
 */
export async function GET(request: Request) {
  try {
    const { isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const tenantId = url.searchParams.get('tenantId')
    const severity = url.searchParams.get('severity')
    const status = url.searchParams.get('status')
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50', 10),
      100
    )
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    // Build query based on filters
    let result

    if (tenantId && severity && status) {
      result = await sql`
        SELECT
          pe.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM public.platform_errors pe
        LEFT JOIN public.organizations o ON o.id = pe.tenant_id
        WHERE pe.tenant_id = ${tenantId}
          AND pe.severity = ${severity}
          AND pe.status = ${status}
        ORDER BY pe.occurred_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (tenantId && severity) {
      result = await sql`
        SELECT
          pe.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM public.platform_errors pe
        LEFT JOIN public.organizations o ON o.id = pe.tenant_id
        WHERE pe.tenant_id = ${tenantId}
          AND pe.severity = ${severity}
        ORDER BY pe.occurred_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (tenantId && status) {
      result = await sql`
        SELECT
          pe.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM public.platform_errors pe
        LEFT JOIN public.organizations o ON o.id = pe.tenant_id
        WHERE pe.tenant_id = ${tenantId}
          AND pe.status = ${status}
        ORDER BY pe.occurred_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (severity && status) {
      result = await sql`
        SELECT
          pe.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM public.platform_errors pe
        LEFT JOIN public.organizations o ON o.id = pe.tenant_id
        WHERE pe.severity = ${severity}
          AND pe.status = ${status}
        ORDER BY pe.occurred_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (tenantId) {
      result = await sql`
        SELECT
          pe.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM public.platform_errors pe
        LEFT JOIN public.organizations o ON o.id = pe.tenant_id
        WHERE pe.tenant_id = ${tenantId}
        ORDER BY pe.occurred_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (severity) {
      result = await sql`
        SELECT
          pe.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM public.platform_errors pe
        LEFT JOIN public.organizations o ON o.id = pe.tenant_id
        WHERE pe.severity = ${severity}
        ORDER BY pe.occurred_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (status) {
      result = await sql`
        SELECT
          pe.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM public.platform_errors pe
        LEFT JOIN public.organizations o ON o.id = pe.tenant_id
        WHERE pe.status = ${status}
        ORDER BY pe.occurred_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      result = await sql`
        SELECT
          pe.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM public.platform_errors pe
        LEFT JOIN public.organizations o ON o.id = pe.tenant_id
        ORDER BY pe.occurred_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total FROM public.platform_errors
    `
    const total = parseInt((countResult.rows[0] as Record<string, unknown>).total as string, 10)

    // Get summary stats
    const statsResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') as open_count,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE severity = 'p1' AND status != 'resolved') as p1_active,
        COUNT(*) FILTER (WHERE severity = 'p2' AND status != 'resolved') as p2_active,
        COUNT(*) FILTER (WHERE severity = 'p3' AND status != 'resolved') as p3_active
      FROM public.platform_errors
    `

    const stats = statsResult.rows[0] as Record<string, unknown>

    const errors = result.rows.map((row) => {
      const r = row as Record<string, unknown>
      return {
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
        resolvedAt: r.resolved_at,
        resolvedBy: r.resolved_by,
      }
    })

    return Response.json({
      errors,
      total,
      limit,
      offset,
      stats: {
        openCount: parseInt(stats.open_count as string, 10) || 0,
        acknowledgedCount: parseInt(stats.acknowledged_count as string, 10) || 0,
        resolvedCount: parseInt(stats.resolved_count as string, 10) || 0,
        p1Active: parseInt(stats.p1_active as string, 10) || 0,
        p2Active: parseInt(stats.p2_active as string, 10) || 0,
        p3Active: parseInt(stats.p3_active as string, 10) || 0,
      },
    })
  } catch (error) {
    console.error('Get platform errors error:', error)
    return Response.json({ error: 'Failed to get errors' }, { status: 500 })
  }
}

/**
 * POST /api/platform/errors
 *
 * Create a new platform error (typically called by error tracking system).
 * Requires: Super admin access or API key
 */
export async function POST(request: Request) {
  try {
    const { isSuperAdmin } = getRequestContext(request)

    // Allow super admin or system API key
    const apiKey = request.headers.get('x-api-key')
    if (!isSuperAdmin && apiKey !== process.env.PLATFORM_API_KEY) {
      return Response.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
      tenantId,
      tenantName,
      severity = 'p3',
      errorType,
      message,
      stack,
      metadata = {},
    } = body

    if (!errorType || !message) {
      return Response.json(
        { error: 'errorType and message are required' },
        { status: 400 }
      )
    }

    // Generate pattern hash for grouping similar errors
    const patternHash = Buffer.from(`${errorType}:${message.slice(0, 100)}`)
      .toString('base64')
      .slice(0, 32)

    const result = await sql`
      INSERT INTO public.platform_errors (
        tenant_id, tenant_name, severity, error_type, message, stack, metadata, pattern_hash
      )
      VALUES (
        ${tenantId || null},
        ${tenantName || null},
        ${severity},
        ${errorType},
        ${message},
        ${stack || null},
        ${JSON.stringify(metadata)}::jsonb,
        ${patternHash}
      )
      RETURNING id
    `

    const errorId = (result.rows[0] as Record<string, unknown>).id

    return Response.json({ success: true, errorId })
  } catch (error) {
    console.error('Create platform error error:', error)
    return Response.json({ error: 'Failed to create error' }, { status: 500 })
  }
}
