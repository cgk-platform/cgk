import { sql } from '@cgk/db'

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

// Services to monitor
const SERVICES = [
  'database',
  'redis',
  'shopify',
  'stripe',
  'inngest',
  'vercel',
  'email',
] as const

type ServiceName = (typeof SERVICES)[number]
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

interface HealthCell {
  status: HealthStatus
  responseTimeMs: number | null
  lastError: string | null
  checkedAt: string | null
}

/**
 * GET /api/platform/health/matrix
 *
 * Get cross-tenant health matrix showing service x tenant status.
 * Requires: Super admin access
 *
 * Query params:
 * - tenantIds: Comma-separated list of tenant IDs (optional, defaults to all active)
 */
export async function GET(request: Request) {
  try {
    const { isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const tenantIdsParam = url.searchParams.get('tenantIds')

    // Get active tenants
    let tenantsResult

    if (tenantIdsParam) {
      // For filtering by specific tenant IDs, query all active and filter in JS
      const tenantIdSet = new Set(tenantIdsParam.split(',').map((id) => id.trim()))
      const allResult = await sql`
        SELECT id, name, slug, status
        FROM organizations
        WHERE status = 'active'
        ORDER BY name
      `
      tenantsResult = {
        rows: allResult.rows.filter((row) =>
          tenantIdSet.has((row as Record<string, unknown>).id as string)
        ),
      }
    } else {
      tenantsResult = await sql`
        SELECT id, name, slug, status
        FROM organizations
        WHERE status = 'active'
        ORDER BY name
        LIMIT 50
      `
    }

    const tenants = tenantsResult.rows.map((row) => ({
      id: (row as Record<string, unknown>).id as string,
      name: (row as Record<string, unknown>).name as string,
      slug: (row as Record<string, unknown>).slug as string,
      status: (row as Record<string, unknown>).status as string,
    }))

    const tenantIds = tenants.map((t) => t.id)

    // Get health matrix data - filter in JS since SQL template doesn't handle arrays well
    const allHealthResult = await sql`
      SELECT
        tenant_id,
        service_name,
        status,
        response_time_ms,
        last_error,
        checked_at
      FROM platform_health_matrix
    `

    const tenantIdSet = new Set(tenantIds)
    const healthResult = {
      rows: allHealthResult.rows.filter((row) =>
        tenantIdSet.has((row as Record<string, unknown>).tenant_id as string)
      ),
    }

    // Build the matrix
    const statuses: Record<string, Record<string, HealthCell>> = {}

    // Initialize with unknown status
    for (const tenantId of tenantIds) {
      statuses[tenantId] = {}
      for (const service of SERVICES) {
        statuses[tenantId][service] = {
          status: 'unknown',
          responseTimeMs: null,
          lastError: null,
          checkedAt: null,
        }
      }
    }

    // Fill in actual health data
    for (const row of healthResult.rows) {
      const r = row as Record<string, unknown>
      const tenantId = r.tenant_id as string
      const serviceName = r.service_name as string

      if (statuses[tenantId] && SERVICES.includes(serviceName as ServiceName)) {
        statuses[tenantId][serviceName] = {
          status: r.status as HealthStatus,
          responseTimeMs: r.response_time_ms as number | null,
          lastError: r.last_error as string | null,
          checkedAt: r.checked_at ? (r.checked_at as Date).toISOString() : null,
        }
      }
    }

    // Calculate service-level aggregates
    const serviceAggregates: Record<string, { healthy: number; degraded: number; unhealthy: number; unknown: number }> = {}

    for (const service of SERVICES) {
      serviceAggregates[service] = { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 }
      for (const tenantId of tenantIds) {
        const tenantStatuses = statuses[tenantId]
        if (tenantStatuses) {
          const cellStatus = tenantStatuses[service]
          if (cellStatus) {
            serviceAggregates[service][cellStatus.status]++
          }
        }
      }
    }

    // Calculate tenant-level aggregates
    const tenantAggregates: Record<string, { healthy: number; degraded: number; unhealthy: number; unknown: number }> = {}

    for (const tenantId of tenantIds) {
      tenantAggregates[tenantId] = { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 }
      const tenantStatuses = statuses[tenantId]
      if (tenantStatuses) {
        for (const service of SERVICES) {
          const cellStatus = tenantStatuses[service]
          if (cellStatus) {
            tenantAggregates[tenantId][cellStatus.status]++
          }
        }
      }
    }

    return Response.json({
      tenants,
      services: [...SERVICES],
      statuses,
      serviceAggregates,
      tenantAggregates,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Get health matrix error:', error)
    return Response.json({ error: 'Failed to get health matrix' }, { status: 500 })
  }
}

/**
 * POST /api/platform/health/matrix
 *
 * Update health status for a tenant-service pair.
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
    const { tenantId, serviceName, status, responseTimeMs, lastError, metadata = {} } = body

    if (!tenantId || !serviceName || !status) {
      return Response.json(
        { error: 'tenantId, serviceName, and status are required' },
        { status: 400 }
      )
    }

    if (!['healthy', 'degraded', 'unhealthy', 'unknown'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Upsert health status
    await sql`
      INSERT INTO platform_health_matrix (
        tenant_id, service_name, status, response_time_ms, last_error, metadata, checked_at
      )
      VALUES (
        ${tenantId},
        ${serviceName},
        ${status},
        ${responseTimeMs || null},
        ${lastError || null},
        ${JSON.stringify(metadata)}::jsonb,
        NOW()
      )
      ON CONFLICT (tenant_id, service_name)
      DO UPDATE SET
        status = EXCLUDED.status,
        response_time_ms = EXCLUDED.response_time_ms,
        last_error = EXCLUDED.last_error,
        metadata = EXCLUDED.metadata,
        checked_at = NOW()
    `

    return Response.json({ success: true })
  } catch (error) {
    console.error('Update health matrix error:', error)
    return Response.json({ error: 'Failed to update health' }, { status: 500 })
  }
}
