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

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

interface BrandHealthData {
  id: string
  name: string
  slug: string
  status: string
  overallHealth: HealthStatus
  healthScore: number
  serviceStatuses: Record<string, HealthStatus>
  issueCount: number
  lastCheckedAt: string | null
  commonIssues: string[]
}

interface CommonIssue {
  issue: string
  count: number
  affectedBrands: string[]
}

interface HealthTrend {
  date: string
  healthyCount: number
  degradedCount: number
  unhealthyCount: number
  averageScore: number
}

/**
 * GET /api/platform/brands/health
 *
 * Get aggregated health data across all brands.
 * Requires: Super admin access
 *
 * Query params:
 * - status: Filter by health status (healthy, degraded, unhealthy)
 * - sortBy: Sort field (name, health, issues)
 * - sortOrder: asc or desc
 */
export async function GET(request: Request) {
  try {
    const { isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')
    const sortBy = url.searchParams.get('sortBy') || 'health'
    const sortOrder = url.searchParams.get('sortOrder') || 'asc'

    // Get all active tenants
    const tenantsResult = await sql`
      SELECT id, name, slug, status
      FROM organizations
      WHERE status = 'active'
      ORDER BY name
    `

    const tenants = tenantsResult.rows.map((row) => ({
      id: (row as Record<string, unknown>).id as string,
      name: (row as Record<string, unknown>).name as string,
      slug: (row as Record<string, unknown>).slug as string,
      status: (row as Record<string, unknown>).status as string,
    }))

    const tenantIds = tenants.map((t) => t.id)

    // Get all health matrix data
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

    // Filter to only relevant tenants
    const tenantIdSet = new Set(tenantIds)
    const healthRows = allHealthResult.rows.filter((row) =>
      tenantIdSet.has((row as Record<string, unknown>).tenant_id as string)
    )

    // Build per-tenant health data
    const brandHealthMap = new Map<string, BrandHealthData>()
    const issuesByTenant = new Map<string, string[]>()

    // Initialize all tenants
    for (const tenant of tenants) {
      brandHealthMap.set(tenant.id, {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        overallHealth: 'unknown',
        healthScore: 0,
        serviceStatuses: {},
        issueCount: 0,
        lastCheckedAt: null,
        commonIssues: [],
      })
      issuesByTenant.set(tenant.id, [])
    }

    // Process health data
    for (const row of healthRows) {
      const r = row as Record<string, unknown>
      const tenantId = r.tenant_id as string
      const serviceName = r.service_name as string
      const status = r.status as HealthStatus
      const lastError = r.last_error as string | null
      const checkedAt = r.checked_at ? (r.checked_at as Date).toISOString() : null

      const brandHealth = brandHealthMap.get(tenantId)
      if (brandHealth) {
        brandHealth.serviceStatuses[serviceName] = status

        // Update last checked
        if (checkedAt && (!brandHealth.lastCheckedAt || checkedAt > brandHealth.lastCheckedAt)) {
          brandHealth.lastCheckedAt = checkedAt
        }

        // Track issues
        if (status === 'unhealthy' || status === 'degraded') {
          brandHealth.issueCount++
          const issues = issuesByTenant.get(tenantId) || []
          const issueDesc = lastError || `${serviceName} is ${status}`
          issues.push(issueDesc)
          issuesByTenant.set(tenantId, issues)
        }
      }
    }

    // Calculate overall health and score for each brand
    for (const [tenantId, brandHealth] of brandHealthMap) {
      const services = Object.values(brandHealth.serviceStatuses)
      const totalServices = services.length

      if (totalServices === 0) {
        brandHealth.overallHealth = 'unknown'
        brandHealth.healthScore = 0
        continue
      }

      const healthyCount = services.filter((s) => s === 'healthy').length
      const degradedCount = services.filter((s) => s === 'degraded').length
      const unhealthyCount = services.filter((s) => s === 'unhealthy').length

      // Calculate score (0-100)
      brandHealth.healthScore = Math.round(
        ((healthyCount * 100 + degradedCount * 50) / totalServices)
      )

      // Determine overall health
      if (unhealthyCount > 0) {
        brandHealth.overallHealth = 'unhealthy'
      } else if (degradedCount > 0) {
        brandHealth.overallHealth = 'degraded'
      } else if (healthyCount > 0) {
        brandHealth.overallHealth = 'healthy'
      } else {
        brandHealth.overallHealth = 'unknown'
      }

      // Add common issues
      const issues = issuesByTenant.get(tenantId) || []
      brandHealth.commonIssues = issues.slice(0, 3)
    }

    // Convert to array and apply filters
    let brands = Array.from(brandHealthMap.values())

    // Filter by health status
    if (statusFilter) {
      brands = brands.filter((b) => b.overallHealth === statusFilter)
    }

    // Sort brands
    brands.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'issues':
          comparison = a.issueCount - b.issueCount
          break
        case 'health':
        default:
          comparison = a.healthScore - b.healthScore
          break
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    // Calculate summary statistics
    const summary = {
      total: brands.length,
      healthy: brands.filter((b) => b.overallHealth === 'healthy').length,
      degraded: brands.filter((b) => b.overallHealth === 'degraded').length,
      unhealthy: brands.filter((b) => b.overallHealth === 'unhealthy').length,
      unknown: brands.filter((b) => b.overallHealth === 'unknown').length,
      averageHealthScore: brands.length > 0
        ? Math.round(brands.reduce((sum, b) => sum + b.healthScore, 0) / brands.length)
        : 0,
    }

    // Calculate common issues across all brands
    const issueCountMap = new Map<string, { count: number; brands: string[] }>()

    for (const [tenantId, issues] of issuesByTenant) {
      const brand = brandHealthMap.get(tenantId)
      const brandName = brand?.name || 'Unknown'

      for (const issue of issues) {
        // Normalize issue text for grouping
        const normalizedIssue = normalizeIssue(issue)
        const existing = issueCountMap.get(normalizedIssue) || { count: 0, brands: [] }
        existing.count++
        if (!existing.brands.includes(brandName)) {
          existing.brands.push(brandName)
        }
        issueCountMap.set(normalizedIssue, existing)
      }
    }

    const commonIssues: CommonIssue[] = Array.from(issueCountMap.entries())
      .map(([issue, data]) => ({
        issue,
        count: data.count,
        affectedBrands: data.brands,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Get health trends (last 7 days worth of snapshots)
    // For now, we'll just return current snapshot as a single point
    // In production, this would query a health_history table
    const trends: HealthTrend[] = [
      {
        date: new Date().toISOString().split('T')[0] ?? new Date().toISOString().slice(0, 10),
        healthyCount: summary.healthy,
        degradedCount: summary.degraded,
        unhealthyCount: summary.unhealthy,
        averageScore: summary.averageHealthScore,
      },
    ]

    return Response.json({
      brands,
      summary,
      commonIssues,
      trends,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Get brand health error:', error)
    return Response.json({ error: 'Failed to get brand health data' }, { status: 500 })
  }
}

/**
 * Normalize issue text for grouping similar issues
 */
function normalizeIssue(issue: string): string {
  // Remove specific IDs, timestamps, etc.
  return issue
    .replace(/\b[a-f0-9-]{36}\b/gi, '[ID]') // UUIDs
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]') // ISO dates
    .replace(/\d+ms/g, '[TIME]ms') // Response times
    .replace(/status \d+/gi, 'status [CODE]') // HTTP status codes
    .trim()
}
