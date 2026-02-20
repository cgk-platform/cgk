import { sql } from '@cgk-platform/db'

import type { AlertPriority, AlertStatus, PlatformAlert } from '../../../../types/platform'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/platform/alerts
 *
 * Returns list of platform alerts.
 * Query params:
 * - status: Filter by status (open, acknowledged, resolved)
 * - priority: Filter by priority (p1, p2, p3)
 * - limit: Number of alerts to return (default: 50, max: 100)
 */
export async function GET(request: Request): Promise<Response> {
  // Check for super admin authorization (set by middleware)
  const isSuperAdmin = request.headers.get('x-is-super-admin')
  if (isSuperAdmin !== 'true') {
    return Response.json({ error: 'Super admin access required' }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as AlertStatus | null
    const priority = url.searchParams.get('priority') as AlertPriority | null
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10))
    )

    // For now, alerts are simulated from audit log entries
    // In production, there would be a dedicated alerts table
    const alerts = await getAlertsFromAuditLog(limit, status, priority)

    return Response.json({
      alerts,
      total: alerts.length,
    })
  } catch (error) {
    console.error('Failed to fetch alerts:', error)
    return Response.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

/**
 * POST /api/platform/alerts
 *
 * Create a new platform alert.
 */
export async function POST(request: Request): Promise<Response> {
  const isSuperAdmin = request.headers.get('x-is-super-admin')
  if (isSuperAdmin !== 'true') {
    return Response.json({ error: 'Super admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { title, message, priority, brandId } = body as {
      title: string
      message: string
      priority: AlertPriority
      brandId?: string
    }

    if (!title || !message || !priority) {
      return Response.json(
        { error: 'Missing required fields: title, message, priority' },
        { status: 400 }
      )
    }

    const userId = request.headers.get('x-user-id')

    // Log alert as an audit entry
    const result = await sql`
      INSERT INTO public.super_admin_audit_log (
        user_id, action, resource_type, tenant_id, metadata
      )
      VALUES (
        ${userId},
        'alert_created',
        'alert',
        ${brandId || null},
        ${JSON.stringify({ title, message, priority, status: 'open' })}::jsonb
      )
      RETURNING id, created_at
    `

    const row = result.rows[0]

    return Response.json({
      alert: {
        id: row?.id as string,
        title,
        message,
        priority,
        status: 'open',
        brandId: brandId || null,
        createdAt: new Date(row?.created_at as string),
      },
    })
  } catch (error) {
    console.error('Failed to create alert:', error)
    return Response.json({ error: 'Failed to create alert' }, { status: 500 })
  }
}

/**
 * Get alerts from audit log (temporary implementation)
 * In production, this would query a dedicated alerts table
 */
async function getAlertsFromAuditLog(
  limit: number,
  _status: AlertStatus | null,
  priority: AlertPriority | null
): Promise<PlatformAlert[]> {
  // Query audit log for error-type entries
  const result = await sql`
    SELECT
      sal.id,
      sal.tenant_id,
      sal.metadata,
      sal.created_at,
      o.name as brand_name
    FROM public.super_admin_audit_log sal
    LEFT JOIN public.organizations o ON o.id = sal.tenant_id
    WHERE sal.action IN ('alert_created', 'error_logged', 'api_request')
      AND (sal.metadata->>'error')::boolean = true
         OR sal.action = 'alert_created'
    ORDER BY sal.created_at DESC
    LIMIT ${limit}
  `

  return result.rows.map((row) => {
    const metadata = row.metadata as Record<string, unknown> | null

    // Determine priority based on error type or explicit setting
    let alertPriority: AlertPriority = 'p3'
    if (metadata?.priority) {
      alertPriority = metadata.priority as AlertPriority
    } else if (metadata?.error && metadata?.statusCode && (metadata.statusCode as number) >= 500) {
      alertPriority = 'p1'
    } else if (metadata?.error) {
      alertPriority = 'p2'
    }

    // Apply priority filter
    if (priority && alertPriority !== priority) {
      return null
    }

    const alert: PlatformAlert = {
      id: row.id as string,
      title: (metadata?.title as string) || `Error in ${(metadata?.path as string) || 'API'}`,
      message:
        (metadata?.message as string) ||
        (metadata?.error as string) ||
        'An error occurred',
      priority: alertPriority,
      status: 'open',
      brandId: (row.tenant_id as string) || null,
      brandName: (row.brand_name as string) || null,
      createdAt: new Date(row.created_at as string),
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolvedAt: null,
    }

    return alert
  }).filter((alert): alert is PlatformAlert => alert !== null)
}
