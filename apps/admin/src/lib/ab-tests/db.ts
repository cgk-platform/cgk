/**
 * A/B Testing Database Operations
 *
 * All database operations use withTenant() for tenant isolation
 */

import { withTenant, sql } from '@cgk-platform/db'

import type {
  ABTest,
  ABVariant,
  ABTargetingRule,
  TestResults,
  VariantResult,
  ABTestQuickStatsData,
  SegmentData,
  TimeSeriesDataPoint,
  FunnelStep,
  SRMAnalysis,
  DataQualityOverview,
  Guardrail,
  TemplateABTest,
  ABTestFilters,
} from './types'

/**
 * Get paginated list of A/B tests
 */
export async function getABTests(
  tenantSlug: string,
  filters: ABTestFilters
): Promise<{ tests: ABTest[]; total: number }> {
  return withTenant(tenantSlug, async () => {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const offset = (page - 1) * limit
    const sort = filters.sort ?? 'created_at'
    const dir = filters.dir ?? 'desc'

    let whereClause = 'WHERE 1=1'
    const params: unknown[] = []
    let paramIndex = 1

    if (filters.status) {
      whereClause += ` AND status = $${paramIndex++}`
      params.push(filters.status)
    }

    if (filters.testType) {
      whereClause += ` AND test_type = $${paramIndex++}`
      params.push(filters.testType)
    }

    if (filters.search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      params.push(`%${filters.search}%`)
      paramIndex++
    }

    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM ab_tests ${whereClause}`,
      params
    )
    const total = Number(countResult.rows[0]?.count ?? 0)

    const testsResult = await sql.query(
      `SELECT * FROM ab_tests ${whereClause} ORDER BY ${sort} ${dir} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    )

    const tests = testsResult.rows.map(mapRowToABTest)
    return { tests, total }
  })
}

/**
 * Get a single A/B test by ID
 */
export async function getABTest(
  tenantSlug: string,
  testId: string
): Promise<ABTest | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM ab_tests WHERE id = ${testId}
    `
    const row = result.rows[0]
    if (!row) return null
    return mapRowToABTest(row as Record<string, unknown>)
  })
}

/**
 * Create a new A/B test
 */
export async function createABTest(
  tenantSlug: string,
  data: Omit<ABTest, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<ABTest> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO ab_tests (
        name, description, status, mode, test_type, goal_event,
        optimization_metric, confidence_level, base_url,
        schedule_timezone, auto_start, auto_end,
        scheduled_start_at, scheduled_end_at
      ) VALUES (
        ${data.name}, ${data.description ?? null}, ${data.status}, ${data.mode},
        ${data.testType}, ${data.goalEvent}, ${data.optimizationMetric},
        ${data.confidenceLevel}, ${data.baseUrl}, ${data.scheduleTimezone},
        ${data.autoStart}, ${data.autoEnd},
        ${data.scheduledStartAt?.toISOString() ?? null}, ${data.scheduledEndAt?.toISOString() ?? null}
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) throw new Error('Failed to create A/B test')
    return mapRowToABTest(row as Record<string, unknown>)
  })
}

/**
 * Update an A/B test
 */
export async function updateABTest(
  tenantSlug: string,
  testId: string,
  data: Partial<ABTest>
): Promise<ABTest | null> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(data.description)
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(data.status)
    }
    if (data.mode !== undefined) {
      updates.push(`mode = $${paramIndex++}`)
      values.push(data.mode)
    }
    if (data.winnerVariantId !== undefined) {
      updates.push(`winner_variant_id = $${paramIndex++}`)
      values.push(data.winnerVariantId)
    }
    if (data.isSignificant !== undefined) {
      updates.push(`is_significant = $${paramIndex++}`)
      values.push(data.isSignificant)
    }

    if (updates.length === 0) {
      return getABTest(tenantSlug, testId)
    }

    updates.push(`updated_at = NOW()`)
    values.push(testId)

    const result = await sql.query(
      `UPDATE ab_tests SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rows.length === 0) return null
    return mapRowToABTest(result.rows[0])
  })
}

/**
 * Delete an A/B test
 */
export async function deleteABTest(
  tenantSlug: string,
  testId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM ab_tests WHERE id = ${testId}
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Get variants for a test
 */
export async function getVariants(
  tenantSlug: string,
  testId: string
): Promise<ABVariant[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM ab_variants WHERE test_id = ${testId} ORDER BY is_control DESC, name
    `
    return result.rows.map(mapRowToVariant)
  })
}

/**
 * Create a variant
 */
export async function createVariant(
  tenantSlug: string,
  data: Omit<ABVariant, 'id' | 'tenantId' | 'createdAt'>
): Promise<ABVariant> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO ab_variants (
        test_id, name, url, url_type, landing_page_id,
        traffic_allocation, is_control, preserve_query_params,
        shipping_rate_name, shipping_price_cents, shipping_suffix
      ) VALUES (
        ${data.testId}, ${data.name}, ${data.url ?? null}, ${data.urlType},
        ${data.landingPageId ?? null}, ${data.trafficAllocation}, ${data.isControl},
        ${data.preserveQueryParams}, ${data.shippingRateName ?? null},
        ${data.shippingPriceCents ?? null}, ${data.shippingSuffix ?? null}
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) throw new Error('Failed to create variant')
    return mapRowToVariant(row as Record<string, unknown>)
  })
}

/**
 * Get targeting rules for a test
 */
export async function getTargetingRules(
  tenantSlug: string,
  testId: string
): Promise<ABTargetingRule[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM ab_targeting_rules
      WHERE test_id = ${testId}
      ORDER BY priority
    `
    return result.rows.map(mapRowToTargetingRule)
  })
}

/**
 * Get quick stats for dashboard
 */
export async function getQuickStats(
  tenantSlug: string
): Promise<ABTestQuickStatsData> {
  return withTenant(tenantSlug, async () => {
    const activeResult = await sql`
      SELECT COUNT(*) as count FROM ab_tests WHERE status = 'running'
    `
    const activeCount = Number(activeResult.rows[0]?.count ?? 0)

    const monthlyResult = await sql`
      SELECT COUNT(*) as count FROM ab_tests
      WHERE created_at >= date_trunc('month', NOW())
    `
    const monthlyCount = Number(monthlyResult.rows[0]?.count ?? 0)

    const visitorsResult = await sql`
      SELECT COALESCE(SUM(visitors), 0) as total FROM ab_daily_metrics
      WHERE date >= NOW() - INTERVAL '30 days'
    `
    const totalVisitors = Number(visitorsResult.rows[0]?.total ?? 0)

    const liftResult = await sql`
      SELECT AVG(
        CASE WHEN winner_variant_id IS NOT NULL THEN
          (SELECT
            ((SUM(CASE WHEN v.id = t.winner_variant_id THEN m.revenue_cents ELSE 0 END)::float /
              NULLIF(SUM(CASE WHEN v.id = t.winner_variant_id THEN m.visitors ELSE 0 END), 0)) -
            (SUM(CASE WHEN v.is_control THEN m.revenue_cents ELSE 0 END)::float /
              NULLIF(SUM(CASE WHEN v.is_control THEN m.visitors ELSE 0 END), 0))) /
            NULLIF(SUM(CASE WHEN v.is_control THEN m.revenue_cents ELSE 0 END)::float /
              NULLIF(SUM(CASE WHEN v.is_control THEN m.visitors ELSE 0 END), 0), 0) * 100
          FROM ab_daily_metrics m
          JOIN ab_variants v ON v.id = m.variant_id
          WHERE m.test_id = t.id)
        ELSE NULL END
      ) as avg_lift
      FROM ab_tests t
      WHERE status = 'completed' AND winner_variant_id IS NOT NULL
    `
    const avgLift = Number(liftResult.rows[0]?.avg_lift ?? 0)

    return {
      activeCount,
      activeChange: 0,
      avgLift,
      monthlyCount,
      totalVisitors,
    }
  })
}

/**
 * Get test results with variant statistics
 */
export async function getTestResults(
  tenantSlug: string,
  testId: string
): Promise<TestResults | null> {
  return withTenant(tenantSlug, async () => {
    const test = await getABTest(tenantSlug, testId)
    if (!test) return null

    const variantsResult = await sql`
      SELECT
        v.id as variant_id,
        v.name as variant_name,
        v.is_control,
        COALESCE(SUM(m.visitors), 0) as visitors,
        COALESCE(SUM(m.purchases), 0) as conversions,
        COALESCE(SUM(m.revenue_cents), 0) as revenue_cents
      FROM ab_variants v
      LEFT JOIN ab_daily_metrics m ON m.variant_id = v.id AND m.test_id = v.test_id
      WHERE v.test_id = ${testId}
      GROUP BY v.id, v.name, v.is_control
      ORDER BY v.is_control DESC, v.name
    `

    const controlRow = variantsResult.rows.find((r) => r.is_control)
    const controlRate = controlRow
      ? Number(controlRow.conversions) / Math.max(Number(controlRow.visitors), 1)
      : 0

    const variants: VariantResult[] = variantsResult.rows.map((row) => {
      const visitors = Number(row.visitors)
      const conversions = Number(row.conversions)
      const revenue = Number(row.revenue_cents) / 100
      const conversionRate = visitors > 0 ? conversions / visitors : 0
      const revenuePerVisitor = visitors > 0 ? revenue / visitors : 0
      const averageOrderValue = conversions > 0 ? revenue / conversions : 0

      let improvement: number | undefined
      if (!row.is_control && controlRate > 0) {
        improvement = ((conversionRate - controlRate) / controlRate) * 100
      }

      return {
        variantId: row.variant_id,
        variantName: row.variant_name,
        isControl: row.is_control,
        isWinner: row.variant_id === test.winnerVariantId,
        visitors,
        conversions,
        conversionRate,
        revenue,
        revenuePerVisitor,
        averageOrderValue,
        improvement,
        isSignificant: row.variant_id === test.winnerVariantId,
      }
    })

    const totalVisitors = variants.reduce((sum, v) => sum + v.visitors, 0)
    const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0)
    const totalRevenue = variants.reduce((sum, v) => sum + v.revenue, 0)

    const sampleSize = estimateRequiredSampleSize(test.confidenceLevel, controlRate)
    const currentProgress = Math.min(100, (totalVisitors / sampleSize) * 100)

    return {
      testId,
      testName: test.name,
      status: test.status,
      isSignificant: test.isSignificant,
      confidenceLevel: test.confidenceLevel,
      currentProgress,
      totalVisitors,
      totalConversions,
      totalRevenue,
      winnerVariantId: test.winnerVariantId,
      variants,
      lastUpdated: new Date(),
    }
  })
}

/**
 * Get time series data for a test
 */
export async function getTimeSeriesData(
  tenantSlug: string,
  testId: string
): Promise<TimeSeriesDataPoint[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        m.date,
        m.variant_id,
        v.name as variant_name,
        m.visitors,
        m.purchases as conversions,
        m.revenue_cents,
        SUM(m.visitors) OVER (PARTITION BY m.variant_id ORDER BY m.date) as cumulative_visitors,
        SUM(m.purchases) OVER (PARTITION BY m.variant_id ORDER BY m.date) as cumulative_conversions
      FROM ab_daily_metrics m
      JOIN ab_variants v ON v.id = m.variant_id
      WHERE m.test_id = ${testId}
      ORDER BY m.date, v.is_control DESC
    `

    return result.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      variantId: row.variant_id,
      variantName: row.variant_name,
      visitors: Number(row.visitors),
      conversions: Number(row.conversions),
      conversionRate:
        Number(row.visitors) > 0
          ? Number(row.conversions) / Number(row.visitors)
          : 0,
      revenue: Number(row.revenue_cents) / 100,
      cumulativeVisitors: Number(row.cumulative_visitors),
      cumulativeConversions: Number(row.cumulative_conversions),
    }))
  })
}

/**
 * Get funnel data for a test
 */
export async function getFunnelData(
  tenantSlug: string,
  testId: string
): Promise<FunnelStep[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        v.id as variant_id,
        v.name as variant_name,
        COALESCE(SUM(m.visitors), 0) as visitors,
        COALESCE(SUM(m.page_views), 0) as page_views,
        COALESCE(SUM(m.add_to_carts), 0) as add_to_carts,
        COALESCE(SUM(m.begin_checkouts), 0) as begin_checkouts,
        COALESCE(SUM(m.purchases), 0) as purchases
      FROM ab_variants v
      LEFT JOIN ab_daily_metrics m ON m.variant_id = v.id
      WHERE v.test_id = ${testId}
      GROUP BY v.id, v.name, v.is_control
      ORDER BY v.is_control DESC
    `

    const steps: FunnelStep[] = []
    const stepLabels = [
      { step: 'visitors', label: 'Visitors' },
      { step: 'page_views', label: 'Page Views' },
      { step: 'add_to_carts', label: 'Add to Cart' },
      { step: 'begin_checkouts', label: 'Begin Checkout' },
      { step: 'purchases', label: 'Purchase' },
    ]

    for (const row of result.rows) {
      const counts: Record<string, number> = {
        visitors: Number(row.visitors),
        page_views: Number(row.page_views),
        add_to_carts: Number(row.add_to_carts),
        begin_checkouts: Number(row.begin_checkouts),
        purchases: Number(row.purchases),
      }

      for (let i = 0; i < stepLabels.length; i++) {
        const stepInfo = stepLabels[i]
        if (!stepInfo) continue
        const { step, label } = stepInfo
        const count = counts[step] ?? 0
        const prevStepInfo = i === 0 ? null : stepLabels[i - 1]
        const prevCount = i === 0 ? count : (prevStepInfo ? counts[prevStepInfo.step] ?? 0 : 0)
        const rate = prevCount > 0 ? count / prevCount : 0
        const dropoff = prevCount > 0 ? 1 - rate : 0

        steps.push({
          step,
          label,
          variantId: row.variant_id as string,
          variantName: row.variant_name as string,
          count,
          rate,
          dropoff,
        })
      }
    }

    return steps
  })
}

/**
 * Get segment breakdown
 */
export async function getSegmentData(
  tenantSlug: string,
  testId: string,
  segmentType: 'device' | 'country' | 'source'
): Promise<SegmentData[]> {
  return withTenant(tenantSlug, async () => {
    const segmentField =
      segmentType === 'device'
        ? 'device_type'
        : segmentType === 'country'
          ? 'country'
          : 'utm_source'

    const result = await sql.query(
      `
      SELECT
        $1 as segment,
        COALESCE(vis.${segmentField}, 'unknown') as value,
        COUNT(DISTINCT vis.visitor_id) as visitors,
        COUNT(DISTINCT CASE WHEN e.event_type = 'purchase' THEN e.visitor_id END) as conversions,
        COALESCE(SUM(e.event_value_cents), 0) as revenue_cents
      FROM ab_visitors vis
      LEFT JOIN ab_events e ON e.visitor_id = vis.visitor_id AND e.test_id = vis.test_id
      WHERE vis.test_id = $2
      GROUP BY vis.${segmentField}
      ORDER BY visitors DESC
      LIMIT 10
    `,
      [segmentType, testId]
    )

    return result.rows.map((row) => ({
      segment: row.segment,
      value: row.value,
      visitors: Number(row.visitors),
      conversions: Number(row.conversions),
      conversionRate:
        Number(row.visitors) > 0
          ? Number(row.conversions) / Number(row.visitors)
          : 0,
      revenue: Number(row.revenue_cents) / 100,
    }))
  })
}

/**
 * Get SRM analysis for a test
 */
export async function getSRMAnalysis(
  tenantSlug: string,
  testId: string
): Promise<SRMAnalysis | null> {
  return withTenant(tenantSlug, async () => {
    const test = await getABTest(tenantSlug, testId)
    if (!test) return null

    const variantsResult = await sql`
      SELECT
        v.id,
        v.name,
        v.traffic_allocation,
        COALESCE(SUM(m.visitors), 0) as visitors
      FROM ab_variants v
      LEFT JOIN ab_daily_metrics m ON m.variant_id = v.id
      WHERE v.test_id = ${testId}
      GROUP BY v.id, v.name, v.traffic_allocation
    `

    const totalVisitors = variantsResult.rows.reduce(
      (sum, r) => sum + Number(r.visitors),
      0
    )
    const totalAllocation = variantsResult.rows.reduce(
      (sum, r) => sum + Number(r.traffic_allocation),
      0
    )

    const expectedRatio: Record<string, number> = {}
    const observedRatio: Record<string, number> = {}

    for (const row of variantsResult.rows) {
      expectedRatio[row.name] = Number(row.traffic_allocation) / totalAllocation
      observedRatio[row.name] =
        totalVisitors > 0 ? Number(row.visitors) / totalVisitors : 0
    }

    let chiSquare = 0
    for (const row of variantsResult.rows) {
      const expected = totalVisitors * (Number(row.traffic_allocation) / totalAllocation)
      const observed = Number(row.visitors)
      if (expected > 0) {
        chiSquare += Math.pow(observed - expected, 2) / expected
      }
    }

    const df = variantsResult.rows.length - 1
    const pValue = chiSquarePValue(chiSquare, df)
    const hasSRM = pValue < 0.01

    let severity: 'none' | 'low' | 'medium' | 'high' = 'none'
    if (hasSRM) {
      if (pValue < 0.001) severity = 'high'
      else if (pValue < 0.005) severity = 'medium'
      else severity = 'low'
    }

    return {
      testId,
      testName: test.name,
      expectedRatio,
      observedRatio,
      chiSquare,
      pValue,
      hasSRM,
      severity,
      recommendation: hasSRM
        ? 'Investigate traffic allocation implementation. Check for bot filtering, caching issues, or implementation bugs.'
        : undefined,
    }
  })
}

/**
 * Get data quality overview
 */
export async function getDataQualityOverview(
  tenantSlug: string
): Promise<DataQualityOverview> {
  return withTenant(tenantSlug, async () => {
    const runningTests = await sql`
      SELECT id FROM ab_tests WHERE status = 'running'
    `

    let srmAlerts = 0
    let noveltyWarnings = 0
    let driftWarnings = 0

    for (const test of runningTests.rows) {
      const srm = await getSRMAnalysis(tenantSlug, test.id)
      if (srm?.hasSRM) srmAlerts++
    }

    const testsWithIssues = srmAlerts + noveltyWarnings + driftWarnings
    const overallScore = Math.max(
      0,
      100 - testsWithIssues * 10 - srmAlerts * 15 - noveltyWarnings * 5 - driftWarnings * 5
    )

    return {
      testsWithIssues,
      srmAlerts,
      noveltyWarnings,
      driftWarnings,
      overallScore,
    }
  })
}

/**
 * Get guardrails for a test
 */
export async function getGuardrails(
  tenantSlug: string,
  testId: string
): Promise<Guardrail[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM ab_guardrails WHERE test_id = ${testId}
    `
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      metric: row.metric,
      threshold: Number(row.threshold),
      direction: row.direction,
      isTriggered: row.is_triggered,
      currentValue: row.current_value ? Number(row.current_value) : undefined,
    }))
  })
}

/**
 * Get template A/B tests
 */
export async function getTemplateABTests(
  tenantSlug: string
): Promise<TemplateABTest[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM template_ab_tests ORDER BY created_at DESC
    `
    return result.rows.map(mapRowToTemplateABTest)
  })
}

/**
 * Get a single template A/B test by ID
 */
export async function getTemplateABTest(
  tenantSlug: string,
  testId: string
): Promise<TemplateABTest | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM template_ab_tests WHERE id = ${testId}
    `
    const row = result.rows[0]
    if (!row) return null
    return mapRowToTemplateABTest(row as Record<string, unknown>)
  })
}

/**
 * Create a new template A/B test
 */
export async function createTemplateABTest(
  tenantSlug: string,
  data: {
    name: string
    description?: string
    templateAId: string
    templateAName: string
    templateBId: string
    templateBName: string
    trafficAllocation?: { a: number; b: number }
  }
): Promise<TemplateABTest> {
  return withTenant(tenantSlug, async () => {
    const trafficAllocation = data.trafficAllocation ?? { a: 50, b: 50 }
    const result = await sql`
      INSERT INTO template_ab_tests (
        tenant_id,
        name,
        description,
        status,
        template_a_id,
        template_a_name,
        template_b_id,
        template_b_name,
        traffic_allocation,
        metrics,
        is_significant
      ) VALUES (
        ${tenantSlug},
        ${data.name},
        ${data.description ?? null},
        'draft',
        ${data.templateAId},
        ${data.templateAName},
        ${data.templateBId},
        ${data.templateBName},
        ${JSON.stringify(trafficAllocation)},
        '{"opens": {"a": 0, "b": 0}, "clicks": {"a": 0, "b": 0}, "conversions": {"a": 0, "b": 0}}',
        false
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) throw new Error('Failed to create template A/B test')
    return mapRowToTemplateABTest(row as Record<string, unknown>)
  })
}

/**
 * Update a template A/B test
 */
export async function updateTemplateABTest(
  tenantSlug: string,
  testId: string,
  data: Partial<{
    name: string
    description: string
    status: 'draft' | 'running' | 'paused' | 'completed'
    trafficAllocation: { a: number; b: number }
    metrics: { opens: { a: number; b: number }; clicks: { a: number; b: number }; conversions: { a: number; b: number } }
    isSignificant: boolean
    winner: 'a' | 'b' | null
  }>
): Promise<TemplateABTest | null> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(data.description)
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(data.status)
      // Set started_at when test starts
      if (data.status === 'running') {
        updates.push(`started_at = COALESCE(started_at, NOW())`)
      }
      // Set ended_at when test completes
      if (data.status === 'completed') {
        updates.push(`ended_at = NOW()`)
      }
    }
    if (data.trafficAllocation !== undefined) {
      updates.push(`traffic_allocation = $${paramIndex++}`)
      values.push(JSON.stringify(data.trafficAllocation))
    }
    if (data.metrics !== undefined) {
      updates.push(`metrics = $${paramIndex++}`)
      values.push(JSON.stringify(data.metrics))
    }
    if (data.isSignificant !== undefined) {
      updates.push(`is_significant = $${paramIndex++}`)
      values.push(data.isSignificant)
    }
    if (data.winner !== undefined) {
      updates.push(`winner = $${paramIndex++}`)
      values.push(data.winner)
    }

    if (updates.length === 0) {
      return getTemplateABTest(tenantSlug, testId)
    }

    updates.push(`updated_at = NOW()`)
    values.push(testId)

    const result = await sql.query(
      `UPDATE template_ab_tests SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rows.length === 0) return null
    return mapRowToTemplateABTest(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Delete a template A/B test
 */
export async function deleteTemplateABTest(
  tenantSlug: string,
  testId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM template_ab_tests WHERE id = ${testId}
    `
    return (result.rowCount ?? 0) > 0
  })
}

// Helper functions

function mapRowToTemplateABTest(row: Record<string, unknown>): TemplateABTest {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    status: row.status as TemplateABTest['status'],
    templateAId: row.template_a_id as string,
    templateAName: row.template_a_name as string,
    templateBId: row.template_b_id as string,
    templateBName: row.template_b_name as string,
    trafficAllocation: row.traffic_allocation as { a: number; b: number },
    metrics: row.metrics as TemplateABTest['metrics'],
    isSignificant: row.is_significant as boolean,
    winner: row.winner as 'a' | 'b' | undefined,
    createdAt: new Date(row.created_at as string),
    startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
    endedAt: row.ended_at ? new Date(row.ended_at as string) : undefined,
  }
}
function mapRowToABTest(row: Record<string, unknown>): ABTest {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    status: row.status as ABTest['status'],
    mode: row.mode as ABTest['mode'],
    testType: row.test_type as ABTest['testType'],
    goalEvent: row.goal_event as ABTest['goalEvent'],
    optimizationMetric: row.optimization_metric as ABTest['optimizationMetric'],
    confidenceLevel: Number(row.confidence_level),
    baseUrl: row.base_url as string,
    winnerVariantId: row.winner_variant_id as string | undefined,
    isSignificant: row.is_significant as boolean,
    trafficOverrideVariantId: row.traffic_override_variant_id as string | undefined,
    createdBy: row.created_by as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
    endedAt: row.ended_at ? new Date(row.ended_at as string) : undefined,
    scheduledStartAt: row.scheduled_start_at
      ? new Date(row.scheduled_start_at as string)
      : undefined,
    scheduledEndAt: row.scheduled_end_at
      ? new Date(row.scheduled_end_at as string)
      : undefined,
    scheduleTimezone: row.schedule_timezone as string,
    autoStart: row.auto_start as boolean,
    autoEnd: row.auto_end as boolean,
  }
}

function mapRowToVariant(row: Record<string, unknown>): ABVariant {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    testId: row.test_id as string,
    name: row.name as string,
    url: row.url as string | undefined,
    urlType: row.url_type as ABVariant['urlType'],
    landingPageId: row.landing_page_id as string | undefined,
    trafficAllocation: Number(row.traffic_allocation),
    isControl: row.is_control as boolean,
    preserveQueryParams: row.preserve_query_params as boolean,
    shippingRateName: row.shipping_rate_name as string | undefined,
    shippingPriceCents: row.shipping_price_cents
      ? Number(row.shipping_price_cents)
      : undefined,
    shippingSuffix: row.shipping_suffix as string | undefined,
    createdAt: new Date(row.created_at as string),
  }
}

function mapRowToTargetingRule(row: Record<string, unknown>): ABTargetingRule {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    testId: row.test_id as string,
    name: row.name as string,
    conditions: row.conditions as ABTargetingRule['conditions'],
    logic: row.logic as 'and' | 'or',
    action: row.action as ABTargetingRule['action'],
    assignedVariantId: row.assigned_variant_id as string | undefined,
    priority: Number(row.priority),
    createdAt: new Date(row.created_at as string),
  }
}

function estimateRequiredSampleSize(
  confidenceLevel: number,
  baselineRate: number
): number {
  const z = confidenceLevel === 0.99 ? 2.576 : confidenceLevel === 0.95 ? 1.96 : 1.645
  const mde = 0.05
  const p = baselineRate || 0.03
  const sampleSize = (2 * Math.pow(z, 2) * p * (1 - p)) / Math.pow(mde * p, 2)
  return Math.max(1000, Math.ceil(sampleSize))
}

function chiSquarePValue(chiSquare: number, df: number): number {
  if (chiSquare <= 0 || df <= 0) return 1

  const gamma = (n: number): number => {
    if (n === 1) return 1
    if (n === 0.5) return Math.sqrt(Math.PI)
    return (n - 1) * gamma(n - 1)
  }

  const incompleteGamma = (a: number, x: number): number => {
    let sum = 0
    let term = 1 / a
    for (let n = 0; n < 100; n++) {
      sum += term
      term *= x / (a + n + 1)
    }
    return Math.pow(x, a) * Math.exp(-x) * sum
  }

  const p = incompleteGamma(df / 2, chiSquare / 2) / gamma(df / 2)
  return Math.max(0, Math.min(1, 1 - p))
}
