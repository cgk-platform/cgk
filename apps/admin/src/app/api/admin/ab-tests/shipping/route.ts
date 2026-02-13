/**
 * Shipping A/B Tests API
 *
 * POST - Create a new shipping A/B test
 * GET - List shipping A/B tests
 */

import { getTenantContext } from '@cgk-platform/auth'
import { withTenant, sql } from '@cgk-platform/db'
import { ulid } from 'ulid'
// Inline types and validation until the package is built
interface CreateShippingTestInput {
  name: string
  description?: string
  baseRateName: string
  variants: Array<{
    name: string
    suffix: string
    priceCents: number
    trafficAllocation: number
    isControl?: boolean
    displayName?: string
    displayDescription?: string
  }>
  trackShippingRevenue?: boolean
  maxOrderValueCents?: number
  zoneId?: string
  confidenceLevel?: number
}

const MAX_SHIPPING_VARIANTS = 4
const ALLOWED_SUFFIXES = ['A', 'B', 'C', 'D'] as const

function validateShippingTestInput(
  input: CreateShippingTestInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (input.variants.length < 2) {
    errors.push('Shipping test requires at least 2 variants')
  }

  if (input.variants.length > MAX_SHIPPING_VARIANTS) {
    errors.push(`Maximum ${MAX_SHIPPING_VARIANTS} variants allowed per shipping test`)
  }

  const suffixes = input.variants.map((v) => v.suffix.toUpperCase())
  const uniqueSuffixes = new Set(suffixes)
  if (uniqueSuffixes.size !== suffixes.length) {
    errors.push('Duplicate variant suffixes are not allowed')
  }

  for (const suffix of suffixes) {
    if (!ALLOWED_SUFFIXES.includes(suffix as typeof ALLOWED_SUFFIXES[number])) {
      errors.push(`Invalid suffix "${suffix}". Allowed: ${ALLOWED_SUFFIXES.join(', ')}`)
    }
  }

  const hasControl = input.variants.some((v) => v.isControl)
  if (!hasControl) {
    errors.push('At least one variant must be marked as control')
  }

  const totalAllocation = input.variants.reduce((sum, v) => sum + v.trafficAllocation, 0)
  if (Math.abs(totalAllocation - 100) > 0.01) {
    errors.push(`Traffic allocation must sum to 100%, got ${totalAllocation}%`)
  }

  return { valid: errors.length === 0, errors }
}

interface ShippingRateVariant {
  variantId: string
  suffix: string
  rateName: string
  priceCents: number
  displayName?: string
  displayDescription?: string
}

interface ShippingTestConfig {
  testId: string
  tenantId: string
  rates: ShippingRateVariant[]
  trackShippingRevenue: boolean
  maxOrderValueCents?: number
  zoneId?: string
  baseRateName: string
}

function buildShippingConfig(
  testId: string,
  tenantId: string,
  input: CreateShippingTestInput
): ShippingTestConfig {
  const rates: ShippingRateVariant[] = input.variants.map((v) => ({
    variantId: '',
    suffix: v.suffix.toUpperCase(),
    rateName: `${input.baseRateName} (${v.suffix.toUpperCase()})`,
    priceCents: v.priceCents,
    displayName: v.displayName,
    displayDescription: v.displayDescription,
  }))

  return {
    testId,
    tenantId,
    rates,
    trackShippingRevenue: input.trackShippingRevenue ?? true,
    maxOrderValueCents: input.maxOrderValueCents,
    zoneId: input.zoneId,
    baseRateName: input.baseRateName,
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Create a new shipping A/B test
 */
export async function POST(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as CreateShippingTestInput

  // Validate input
  const validation = validateShippingTestInput(body)
  if (!validation.valid) {
    return Response.json(
      { error: 'Validation failed', details: validation.errors },
      { status: 400 }
    )
  }

  const testId = ulid()
  const now = new Date()

  // Build shipping configuration
  const shippingConfig = buildShippingConfig(testId, tenantId, body)

  return withTenant(tenantId, async () => {
    // Create the test
    const testResult = await sql`
      INSERT INTO ab_tests (
        id, name, description, status, mode, test_type,
        goal_event, optimization_metric, confidence_level,
        base_url, schedule_timezone, auto_start, auto_end,
        shipping_config, created_by, created_at, updated_at
      ) VALUES (
        ${testId},
        ${body.name},
        ${body.description || null},
        'draft',
        'manual',
        'shipping',
        'purchase',
        'revenue_per_visitor',
        ${body.confidenceLevel || 0.95},
        '/',
        'America/New_York',
        false,
        false,
        ${JSON.stringify(shippingConfig)}::jsonb,
        ${userId || null},
        ${now.toISOString()},
        ${now.toISOString()}
      )
      RETURNING *
    `

    const test = testResult.rows[0]

    // Create variants
    const variants = []
    for (const v of body.variants) {
      const variantId = ulid()
      const rateName = `${body.baseRateName} (${v.suffix.toUpperCase()})`

      const variantResult = await sql`
        INSERT INTO ab_variants (
          id, test_id, name, url_type, traffic_allocation,
          is_control, preserve_query_params,
          shipping_rate_name, shipping_price_cents, shipping_suffix,
          created_at
        ) VALUES (
          ${variantId},
          ${testId},
          ${v.name},
          'static',
          ${v.trafficAllocation},
          ${v.isControl || false},
          true,
          ${rateName},
          ${v.priceCents},
          ${v.suffix.toUpperCase()},
          ${now.toISOString()}
        )
        RETURNING *
      `

      variants.push(variantResult.rows[0])
    }

    return Response.json({
      test,
      variants,
      shippingConfig,
    })
  })
}

/**
 * List shipping A/B tests
 */
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100)
  const offset = (page - 1) * limit

  return withTenant(tenantId, async () => {
    // Build query based on filters
    let testsResult
    let countResult

    if (status) {
      testsResult = await sql`
        SELECT t.*,
          (SELECT COUNT(*) FROM ab_variants v WHERE v.test_id = t.id) as variant_count
        FROM ab_tests t
        WHERE t.test_type = 'shipping' AND t.status = ${status}
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      countResult = await sql`
        SELECT COUNT(*) as count
        FROM ab_tests
        WHERE test_type = 'shipping' AND status = ${status}
      `
    } else {
      testsResult = await sql`
        SELECT t.*,
          (SELECT COUNT(*) FROM ab_variants v WHERE v.test_id = t.id) as variant_count
        FROM ab_tests t
        WHERE t.test_type = 'shipping'
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      countResult = await sql`
        SELECT COUNT(*) as count
        FROM ab_tests
        WHERE test_type = 'shipping'
      `
    }

    const total = Number(countResult.rows[0]?.count) || 0

    return Response.json({
      tests: testsResult.rows,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + testsResult.rows.length < total,
      },
    })
  })
}
