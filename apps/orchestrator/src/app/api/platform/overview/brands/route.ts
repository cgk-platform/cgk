import { createGlobalCache, sql, withTenant } from '@cgk/db'

import type { BrandSummary, PaginatedBrands } from '../../../../../types/platform'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Cache TTL for brands list (30 seconds)
const BRANDS_CACHE_TTL = 30
const DEFAULT_PAGE_SIZE = 20

/**
 * GET /api/platform/overview/brands
 *
 * Returns paginated list of brands with their health indicators and metrics.
 * Query params:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 50)
 * - status: Filter by status (active, paused, onboarding)
 * - search: Search by name or slug
 */
export async function GET(request: Request): Promise<Response> {
  // Check for super admin authorization (set by middleware)
  const isSuperAdmin = request.headers.get('x-is-super-admin')
  if (isSuperAdmin !== 'true') {
    return Response.json({ error: 'Super admin access required' }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10))
    )
    const status = url.searchParams.get('status') as 'active' | 'paused' | 'onboarding' | null
    const search = url.searchParams.get('search')

    // Generate cache key based on query params
    const cacheKey = `brands-list:${page}:${pageSize}:${status || 'all'}:${search || ''}`
    const cache = createGlobalCache()
    const cachedData = await cache.get<PaginatedBrands>(cacheKey)

    if (cachedData) {
      return Response.json({
        ...cachedData,
        cached: true,
      })
    }

    // Fetch brands from database
    const offset = (page - 1) * pageSize

    // Build the query with optional filters
    let brands: BrandSummary[]
    let totalCount: number

    if (status && search) {
      const countResult = await sql`
        SELECT COUNT(*) as count
        FROM organizations
        WHERE status = ${status}::organization_status
          AND (name ILIKE ${`%${search}%`} OR slug ILIKE ${`%${search}%`})
      `
      totalCount = Number(countResult.rows[0]?.count || 0)

      const brandsResult = await sql`
        SELECT
          id, name, slug,
          settings->>'logoUrl' as logo_url,
          status,
          shopify_store_domain,
          stripe_account_id,
          created_at
        FROM organizations
        WHERE status = ${status}::organization_status
          AND (name ILIKE ${`%${search}%`} OR slug ILIKE ${`%${search}%`})
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `
      brands = await mapBrandRows(brandsResult.rows)
    } else if (status) {
      const countResult = await sql`
        SELECT COUNT(*) as count
        FROM organizations
        WHERE status = ${status}::organization_status
      `
      totalCount = Number(countResult.rows[0]?.count || 0)

      const brandsResult = await sql`
        SELECT
          id, name, slug,
          settings->>'logoUrl' as logo_url,
          status,
          shopify_store_domain,
          stripe_account_id,
          created_at
        FROM organizations
        WHERE status = ${status}::organization_status
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `
      brands = await mapBrandRows(brandsResult.rows)
    } else if (search) {
      const countResult = await sql`
        SELECT COUNT(*) as count
        FROM organizations
        WHERE name ILIKE ${`%${search}%`} OR slug ILIKE ${`%${search}%`}
      `
      totalCount = Number(countResult.rows[0]?.count || 0)

      const brandsResult = await sql`
        SELECT
          id, name, slug,
          settings->>'logoUrl' as logo_url,
          status,
          shopify_store_domain,
          stripe_account_id,
          created_at
        FROM organizations
        WHERE name ILIKE ${`%${search}%`} OR slug ILIKE ${`%${search}%`}
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `
      brands = await mapBrandRows(brandsResult.rows)
    } else {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM organizations
      `
      totalCount = Number(countResult.rows[0]?.count || 0)

      const brandsResult = await sql`
        SELECT
          id, name, slug,
          settings->>'logoUrl' as logo_url,
          status,
          shopify_store_domain,
          stripe_account_id,
          created_at
        FROM organizations
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `
      brands = await mapBrandRows(brandsResult.rows)
    }

    const totalPages = Math.ceil(totalCount / pageSize)

    const response: PaginatedBrands = {
      brands,
      total: totalCount,
      page,
      pageSize,
      totalPages,
    }

    // Cache the result
    await cache.set(cacheKey, response, { ttl: BRANDS_CACHE_TTL })

    return Response.json(response)
  } catch (error) {
    console.error('Failed to fetch brands:', error)
    return Response.json({ error: 'Failed to fetch brands' }, { status: 500 })
  }
}

/**
 * Map database rows to BrandSummary objects
 * Also fetches per-tenant metrics
 */
async function mapBrandRows(rows: Record<string, unknown>[]): Promise<BrandSummary[]> {
  const brands: BrandSummary[] = []

  for (const row of rows) {
    const slug = row.slug as string

    // Get 24h metrics from tenant schema (if exists)
    let revenue24h = 0
    let orders24h = 0
    let errorCount24h = 0

    try {
      const metrics = await withTenant(slug, async () => {
        const metricsResult = await sql`
          SELECT
            COALESCE(SUM(total_price), 0) as revenue,
            COUNT(*) as order_count
          FROM orders
          WHERE created_at > NOW() - INTERVAL '24 hours'
        `
        return {
          revenue: Number(metricsResult.rows[0]?.revenue || 0),
          orders: Number(metricsResult.rows[0]?.order_count || 0),
        }
      })
      revenue24h = metrics.revenue
      orders24h = metrics.orders
    } catch {
      // Tenant schema might not exist yet
    }

    // Get error count from audit log
    try {
      const errorResult = await sql`
        SELECT COUNT(*) as error_count
        FROM super_admin_audit_log
        WHERE tenant_id = ${row.id as string}
          AND action = 'api_request'
          AND (metadata->>'error')::boolean = true
          AND created_at > NOW() - INTERVAL '24 hours'
      `
      errorCount24h = Number(errorResult.rows[0]?.error_count || 0)
    } catch {
      // Audit log query failed
    }

    // Determine health based on metrics
    let health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (errorCount24h > 50) {
      health = 'unhealthy'
    } else if (errorCount24h > 10) {
      health = 'degraded'
    }

    brands.push({
      id: row.id as string,
      name: row.name as string,
      slug,
      logoUrl: (row.logo_url as string) || null,
      status: mapStatus(row.status as string),
      health,
      revenue24h,
      orders24h,
      errorCount24h,
      shopifyConnected: !!(row.shopify_store_domain as string),
      stripeConnected: !!(row.stripe_account_id as string),
      createdAt: new Date(row.created_at as string),
    })
  }

  return brands
}

/**
 * Map database status to BrandSummary status
 */
function mapStatus(dbStatus: string): 'active' | 'paused' | 'onboarding' {
  switch (dbStatus) {
    case 'active':
      return 'active'
    case 'suspended':
      return 'paused'
    case 'onboarding':
    default:
      return 'onboarding'
  }
}
