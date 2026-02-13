/**
 * Advanced Attribution Database Operations
 *
 * Database operations for journeys, MMM, incrementality, and AI insights.
 * All operations assume tenant context is already set via withTenant().
 */

import { sql } from '@cgk-platform/db'

import type {
  AIInsightsCache,
  AIInsightsData,
  AttributionModel,
  AttributionWindow,
  BudgetOptimizationResult,
  CreateExperimentRequest,
  CustomerJourney,
  ExperimentPerformanceData,
  IncrementalityExperiment,
  JourneysListParams,
  JourneyTouchpoint,
  MMMModel,
  MMMResults,
  PathAnalysis,
} from './types'

// Helper to convert array to PostgreSQL array literal string
function toPostgresArray(arr: string[]): string {
  return `{${arr.map((s) => `"${s}"`).join(',')}}`
}

// ============================================================
// Customer Journeys
// ============================================================

export async function getCustomerJourneys(
  tenantId: string,
  params: JourneysListParams
): Promise<{ journeys: CustomerJourney[]; total: number }> {
  const { customerType = 'all', window = '7d', limit = 50, offset = 0 } = params

  const windowDays = parseWindowToDays(window)

  // Count query
  const countResult = await sql`
    SELECT COUNT(DISTINCT c.id) as total
    FROM attribution_conversions c
    LEFT JOIN customers cust ON c.customer_id = cust.id
    WHERE c.tenant_id = ${tenantId}
      AND c.converted_at >= NOW() - INTERVAL '1 day' * ${windowDays}
      AND (${customerType} = 'all' OR
           (${customerType} = 'new' AND c.is_first_purchase = true) OR
           (${customerType} = 'returning' AND c.is_first_purchase = false))
  `

  const total = Number(countResult.rows[0]?.total ?? 0)

  // Main journeys query
  const journeysResult = await sql`
    SELECT
      c.id as "conversionId",
      c.order_id as "orderId",
      c.order_number as "orderNumber",
      c.revenue as "orderTotal",
      cust.email as "customerEmail",
      c.is_first_purchase as "isNewCustomer",
      c.converted_at as "conversionDate",
      (
        SELECT COUNT(*)
        FROM attribution_touchpoints t
        WHERE t.customer_id = c.customer_id
          AND t.occurred_at <= c.converted_at
          AND t.occurred_at >= c.converted_at - INTERVAL '1 day' * ${windowDays}
      ) as "touchpointCount"
    FROM attribution_conversions c
    LEFT JOIN customers cust ON c.customer_id = cust.id
    WHERE c.tenant_id = ${tenantId}
      AND c.converted_at >= NOW() - INTERVAL '1 day' * ${windowDays}
      AND (${customerType} = 'all' OR
           (${customerType} = 'new' AND c.is_first_purchase = true) OR
           (${customerType} = 'returning' AND c.is_first_purchase = false))
    ORDER BY c.converted_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const journeys: CustomerJourney[] = []

  for (const row of journeysResult.rows) {
    const r = row as Record<string, unknown>
    const conversionId = r.conversionId as string

    const touchpointsResult = await sql`
      SELECT
        t.id,
        t.occurred_at as timestamp,
        t.channel,
        t.platform,
        t.campaign,
        t.adset_id as "adSet",
        t.ad_id as ad,
        t.device_type as device
      FROM attribution_touchpoints t
      JOIN attribution_conversions c ON t.customer_id = c.customer_id
      WHERE c.id = ${conversionId}
        AND t.occurred_at <= c.converted_at
        AND t.occurred_at >= c.converted_at - INTERVAL '1 day' * ${windowDays}
      ORDER BY t.occurred_at ASC
    `

    const touchpoints: JourneyTouchpoint[] = []
    const totalTouchpoints = touchpointsResult.rows.length

    for (let i = 0; i < totalTouchpoints; i++) {
      const t = touchpointsResult.rows[i] as Record<string, unknown>
      touchpoints.push({
        id: t.id as string,
        timestamp: (t.timestamp as Date).toISOString(),
        channel: t.channel as string,
        platform: t.platform as string | undefined,
        campaign: t.campaign as string | undefined,
        adSet: t.adSet as string | undefined,
        ad: t.ad as string | undefined,
        device: (t.device as string) ?? 'unknown',
        browser: undefined,
        creditByModel: calculateCreditByModel(i, totalTouchpoints),
      })
    }

    journeys.push({
      conversionId,
      orderId: r.orderId as string,
      orderNumber: r.orderNumber as string,
      orderTotal: Number(r.orderTotal),
      customerEmail: (r.customerEmail as string) || 'unknown@example.com',
      isNewCustomer: r.isNewCustomer as boolean,
      conversionDate: (r.conversionDate as Date).toISOString(),
      touchpointCount: Number(r.touchpointCount),
      touchpoints,
    })
  }

  return { journeys, total }
}

export async function getJourneyById(
  tenantId: string,
  conversionId: string
): Promise<CustomerJourney | null> {
  const result = await sql`
    SELECT
      c.id as "conversionId",
      c.order_id as "orderId",
      c.order_number as "orderNumber",
      c.revenue as "orderTotal",
      cust.email as "customerEmail",
      c.is_first_purchase as "isNewCustomer",
      c.converted_at as "conversionDate"
    FROM attribution_conversions c
    LEFT JOIN customers cust ON c.customer_id = cust.id
    WHERE c.id = ${conversionId} AND c.tenant_id = ${tenantId}
  `

  if (result.rows.length === 0) return null

  const row = result.rows[0] as Record<string, unknown>

  const touchpointsResult = await sql`
    SELECT
      t.id,
      t.occurred_at as timestamp,
      t.channel,
      t.platform,
      t.campaign,
      t.adset_id as "adSet",
      t.ad_id as ad,
      t.device_type as device
    FROM attribution_touchpoints t
    JOIN attribution_conversions c ON t.customer_id = c.customer_id
    WHERE c.id = ${conversionId}
      AND t.occurred_at <= c.converted_at
      AND t.occurred_at >= c.converted_at - INTERVAL '90 days'
    ORDER BY t.occurred_at ASC
  `

  const touchpoints: JourneyTouchpoint[] = []
  const totalTouchpoints = touchpointsResult.rows.length

  for (let i = 0; i < totalTouchpoints; i++) {
    const t = touchpointsResult.rows[i] as Record<string, unknown>
    touchpoints.push({
      id: t.id as string,
      timestamp: (t.timestamp as Date).toISOString(),
      channel: t.channel as string,
      platform: t.platform as string | undefined,
      campaign: t.campaign as string | undefined,
      adSet: t.adSet as string | undefined,
      ad: t.ad as string | undefined,
      device: (t.device as string) ?? 'unknown',
      browser: undefined,
      creditByModel: calculateCreditByModel(i, totalTouchpoints),
    })
  }

  return {
    conversionId: row.conversionId as string,
    orderId: row.orderId as string,
    orderNumber: row.orderNumber as string,
    orderTotal: Number(row.orderTotal),
    customerEmail: (row.customerEmail as string) || 'unknown@example.com',
    isNewCustomer: row.isNewCustomer as boolean,
    conversionDate: (row.conversionDate as Date).toISOString(),
    touchpointCount: touchpoints.length,
    touchpoints,
  }
}

export async function getPathAnalysis(
  tenantId: string,
  window: AttributionWindow
): Promise<PathAnalysis> {
  const windowDays = parseWindowToDays(window)

  const pathsResult = await sql`
    WITH journey_paths AS (
      SELECT
        c.id as conversion_id,
        c.revenue,
        array_agg(t.channel ORDER BY t.occurred_at) as path
      FROM attribution_conversions c
      JOIN attribution_touchpoints t ON t.customer_id = c.customer_id
        AND t.occurred_at <= c.converted_at
        AND t.occurred_at >= c.converted_at - INTERVAL '1 day' * ${windowDays}
      WHERE c.tenant_id = ${tenantId}
        AND c.converted_at >= NOW() - INTERVAL '1 day' * ${windowDays}
      GROUP BY c.id, c.revenue
    )
    SELECT
      path,
      COUNT(*) as count,
      AVG(revenue) as "avgOrderValue"
    FROM journey_paths
    GROUP BY path
    ORDER BY count DESC
    LIMIT 10
  `

  const commonPaths = pathsResult.rows.map((row) => {
    const r = row as { path: string[]; count: number; avgOrderValue: number }
    return {
      path: r.path,
      count: Number(r.count),
      avgOrderValue: Math.round(Number(r.avgOrderValue) * 100) / 100,
    }
  })

  const statsResult = await sql`
    WITH journey_stats AS (
      SELECT
        c.id as conversion_id,
        COUNT(t.id) as touchpoint_count,
        EXTRACT(EPOCH FROM (c.converted_at - MIN(t.occurred_at))) / 3600 as hours_to_convert
      FROM attribution_conversions c
      JOIN attribution_touchpoints t ON t.customer_id = c.customer_id
        AND t.occurred_at <= c.converted_at
        AND t.occurred_at >= c.converted_at - INTERVAL '1 day' * ${windowDays}
      WHERE c.tenant_id = ${tenantId}
        AND c.converted_at >= NOW() - INTERVAL '1 day' * ${windowDays}
      GROUP BY c.id, c.converted_at
    )
    SELECT
      AVG(touchpoint_count) as "avgTouchpoints",
      AVG(hours_to_convert) as "avgTimeToConversion"
    FROM journey_stats
  `

  const stats = statsResult.rows[0] as { avgTouchpoints: number; avgTimeToConversion: number } | undefined

  const distributionResult = await sql`
    WITH journey_lengths AS (
      SELECT
        c.id,
        COUNT(t.id) as touchpoint_count
      FROM attribution_conversions c
      JOIN attribution_touchpoints t ON t.customer_id = c.customer_id
        AND t.occurred_at <= c.converted_at
        AND t.occurred_at >= c.converted_at - INTERVAL '1 day' * ${windowDays}
      WHERE c.tenant_id = ${tenantId}
        AND c.converted_at >= NOW() - INTERVAL '1 day' * ${windowDays}
      GROUP BY c.id
    )
    SELECT
      touchpoint_count as length,
      COUNT(*) as count
    FROM journey_lengths
    GROUP BY touchpoint_count
    ORDER BY touchpoint_count
  `

  const pathLengthDistribution = distributionResult.rows.map((row) => {
    const r = row as { length: number; count: number }
    return {
      length: Number(r.length),
      count: Number(r.count),
    }
  })

  return {
    commonPaths,
    avgTouchpoints: Math.round((Number(stats?.avgTouchpoints) || 0) * 100) / 100,
    avgTimeToConversion: Math.round((Number(stats?.avgTimeToConversion) || 0) * 100) / 100,
    pathLengthDistribution,
  }
}

// ============================================================
// Media Mix Modeling (MMM)
// ============================================================

export async function getMMMModel(tenantId: string): Promise<MMMModel | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      status,
      channels,
      date_range_start as "dateRangeStart",
      date_range_end as "dateRangeEnd",
      model_fit as "modelFit",
      results,
      created_at as "createdAt",
      completed_at as "completedAt"
    FROM mmm_models
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (result.rows.length === 0) return null

  const row = result.rows[0] as Record<string, unknown>
  return {
    id: row.id as string,
    tenantId: row.tenantId as string,
    status: row.status as MMMModel['status'],
    channels: row.channels as string[],
    dateRangeStart: (row.dateRangeStart as Date).toISOString().split('T')[0] ?? '',
    dateRangeEnd: (row.dateRangeEnd as Date).toISOString().split('T')[0] ?? '',
    modelFit: row.modelFit as MMMModel['modelFit'],
    results: row.results as MMMModel['results'],
    createdAt: (row.createdAt as Date).toISOString(),
    completedAt: row.completedAt ? (row.completedAt as Date).toISOString() : null,
  }
}

export async function getMMMResults(tenantId: string): Promise<MMMResults | null> {
  const model = await getMMMModel(tenantId)
  if (!model || model.status !== 'completed' || !model.results) return null

  return {
    modelId: model.id,
    status: model.status,
    lastRunAt: model.completedAt ?? model.createdAt,
    modelFit: model.modelFit!,
    channels: model.results.channels,
    saturationCurves: model.results.saturationCurves,
  }
}

export async function createMMMModel(
  tenantId: string,
  channels: string[],
  dateRangeStart: string,
  dateRangeEnd: string
): Promise<MMMModel> {
  const channelsStr = toPostgresArray(channels)

  const result = await sql`
    INSERT INTO mmm_models (
      tenant_id,
      status,
      channels,
      date_range_start,
      date_range_end
    ) VALUES (
      ${tenantId},
      'draft',
      ${channelsStr}::text[],
      ${dateRangeStart}::date,
      ${dateRangeEnd}::date
    )
    RETURNING
      id,
      tenant_id as "tenantId",
      status,
      channels,
      date_range_start as "dateRangeStart",
      date_range_end as "dateRangeEnd",
      model_fit as "modelFit",
      results,
      created_at as "createdAt",
      completed_at as "completedAt"
  `

  const row = result.rows[0] as Record<string, unknown>
  return {
    id: row.id as string,
    tenantId: row.tenantId as string,
    status: row.status as MMMModel['status'],
    channels: row.channels as string[],
    dateRangeStart: (row.dateRangeStart as Date).toISOString().split('T')[0] ?? '',
    dateRangeEnd: (row.dateRangeEnd as Date).toISOString().split('T')[0] ?? '',
    modelFit: null,
    results: null,
    createdAt: (row.createdAt as Date).toISOString(),
    completedAt: null,
  }
}

export async function updateMMMModelStatus(
  modelId: string,
  status: MMMModel['status'],
  modelFit?: MMMModel['modelFit'],
  results?: MMMModel['results']
): Promise<void> {
  const modelFitJson = modelFit ? JSON.stringify(modelFit) : null
  const resultsJson = results ? JSON.stringify(results) : null

  await sql`
    UPDATE mmm_models
    SET
      status = ${status},
      model_fit = COALESCE(${modelFitJson}::jsonb, model_fit),
      results = COALESCE(${resultsJson}::jsonb, results),
      completed_at = CASE WHEN ${status} = 'completed' THEN NOW() ELSE completed_at END
    WHERE id = ${modelId}
  `
}

export async function optimizeBudget(
  tenantId: string,
  totalBudget: number,
  constraints?: Record<string, { min?: number; max?: number }>
): Promise<BudgetOptimizationResult | null> {
  const model = await getMMMResults(tenantId)
  if (!model) return null

  const currentAllocation: Record<string, number> = {}
  const optimizedAllocation: Record<string, number> = {}

  let totalMarginalRoi = 0

  for (const channel of model.channels) {
    currentAllocation[channel.channel] = channel.currentSpend
    totalMarginalRoi += channel.marginalRoi
  }

  for (const channel of model.channels) {
    const weight = channel.marginalRoi / totalMarginalRoi
    let optimalSpend = totalBudget * weight

    const constraint = constraints?.[channel.channel]
    if (constraint) {
      if (constraint.min !== undefined) {
        optimalSpend = Math.max(optimalSpend, constraint.min)
      }
      if (constraint.max !== undefined) {
        optimalSpend = Math.min(optimalSpend, constraint.max)
      }
    }

    optimizedAllocation[channel.channel] = Math.round(optimalSpend * 100) / 100
  }

  const currentRevenue = model.channels.reduce((sum, c) => sum + c.currentSpend * c.currentRoi, 0)
  const optimizedRevenue = model.channels.reduce((sum, c) => {
    const newSpend = optimizedAllocation[c.channel] ?? 0
    const spendRatio = newSpend / (c.currentSpend || 1)
    const diminishingFactor = Math.pow(spendRatio, 0.7)
    return sum + newSpend * c.currentRoi * diminishingFactor
  }, 0)

  const lift = optimizedRevenue - currentRevenue
  const liftPercent = currentRevenue > 0 ? (lift / currentRevenue) * 100 : 0

  return {
    currentAllocation,
    optimizedAllocation,
    projectedRevenue: {
      current: Math.round(currentRevenue * 100) / 100,
      optimized: Math.round(optimizedRevenue * 100) / 100,
      lift: Math.round(lift * 100) / 100,
      liftPercent: Math.round(liftPercent * 100) / 100,
    },
  }
}

// ============================================================
// Incrementality Testing
// ============================================================

export async function getIncrementalityExperiments(
  tenantId: string
): Promise<IncrementalityExperiment[]> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      name,
      platform,
      status,
      test_regions as "testRegions",
      control_regions as "controlRegions",
      start_date as "startDate",
      end_date as "endDate",
      pre_test_days as "preTestDays",
      budget_estimate as "budgetEstimate",
      results,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM incrementality_experiments
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
  `

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      name: r.name as string,
      platform: r.platform as IncrementalityExperiment['platform'],
      status: r.status as IncrementalityExperiment['status'],
      testRegions: r.testRegions as string[],
      controlRegions: r.controlRegions as string[],
      startDate: (r.startDate as Date).toISOString().split('T')[0] ?? '',
      endDate: (r.endDate as Date).toISOString().split('T')[0] ?? '',
      preTestDays: Number(r.preTestDays),
      budgetEstimate: r.budgetEstimate ? Number(r.budgetEstimate) : null,
      results: r.results as IncrementalityExperiment['results'],
      createdAt: (r.createdAt as Date).toISOString(),
      updatedAt: (r.updatedAt as Date).toISOString(),
    }
  })
}

export async function getIncrementalityExperiment(
  tenantId: string,
  experimentId: string
): Promise<IncrementalityExperiment | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      name,
      platform,
      status,
      test_regions as "testRegions",
      control_regions as "controlRegions",
      start_date as "startDate",
      end_date as "endDate",
      pre_test_days as "preTestDays",
      budget_estimate as "budgetEstimate",
      results,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM incrementality_experiments
    WHERE id = ${experimentId} AND tenant_id = ${tenantId}
  `

  if (result.rows.length === 0) return null

  const r = result.rows[0] as Record<string, unknown>
  return {
    id: r.id as string,
    tenantId: r.tenantId as string,
    name: r.name as string,
    platform: r.platform as IncrementalityExperiment['platform'],
    status: r.status as IncrementalityExperiment['status'],
    testRegions: r.testRegions as string[],
    controlRegions: r.controlRegions as string[],
    startDate: (r.startDate as Date).toISOString().split('T')[0] ?? '',
    endDate: (r.endDate as Date).toISOString().split('T')[0] ?? '',
    preTestDays: Number(r.preTestDays),
    budgetEstimate: r.budgetEstimate ? Number(r.budgetEstimate) : null,
    results: r.results as IncrementalityExperiment['results'],
    createdAt: (r.createdAt as Date).toISOString(),
    updatedAt: (r.updatedAt as Date).toISOString(),
  }
}

export async function createIncrementalityExperiment(
  tenantId: string,
  data: CreateExperimentRequest
): Promise<IncrementalityExperiment> {
  const testRegionsStr = toPostgresArray(data.testRegions)
  const controlRegionsStr = toPostgresArray(data.controlRegions)

  const result = await sql`
    INSERT INTO incrementality_experiments (
      tenant_id,
      name,
      platform,
      status,
      test_regions,
      control_regions,
      start_date,
      end_date,
      pre_test_days,
      budget_estimate
    ) VALUES (
      ${tenantId},
      ${data.name},
      ${data.platform},
      'draft',
      ${testRegionsStr}::text[],
      ${controlRegionsStr}::text[],
      ${data.startDate}::date,
      ${data.endDate}::date,
      ${data.preTestDays ?? 14},
      ${data.budgetEstimate ?? null}
    )
    RETURNING
      id,
      tenant_id as "tenantId",
      name,
      platform,
      status,
      test_regions as "testRegions",
      control_regions as "controlRegions",
      start_date as "startDate",
      end_date as "endDate",
      pre_test_days as "preTestDays",
      budget_estimate as "budgetEstimate",
      results,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  const r = result.rows[0] as Record<string, unknown>
  return {
    id: r.id as string,
    tenantId: r.tenantId as string,
    name: r.name as string,
    platform: r.platform as IncrementalityExperiment['platform'],
    status: r.status as IncrementalityExperiment['status'],
    testRegions: r.testRegions as string[],
    controlRegions: r.controlRegions as string[],
    startDate: (r.startDate as Date).toISOString().split('T')[0] ?? '',
    endDate: (r.endDate as Date).toISOString().split('T')[0] ?? '',
    preTestDays: Number(r.preTestDays),
    budgetEstimate: r.budgetEstimate ? Number(r.budgetEstimate) : null,
    results: null,
    createdAt: (r.createdAt as Date).toISOString(),
    updatedAt: (r.updatedAt as Date).toISOString(),
  }
}

export async function updateIncrementalityExperiment(
  tenantId: string,
  experimentId: string,
  data: Partial<CreateExperimentRequest> & { status?: IncrementalityExperiment['status'] }
): Promise<IncrementalityExperiment | null> {
  const current = await getIncrementalityExperiment(tenantId, experimentId)
  if (!current) return null

  const testRegionsStr = data.testRegions ? toPostgresArray(data.testRegions) : null
  const controlRegionsStr = data.controlRegions ? toPostgresArray(data.controlRegions) : null

  const result = await sql`
    UPDATE incrementality_experiments
    SET
      name = COALESCE(${data.name ?? null}, name),
      platform = COALESCE(${data.platform ?? null}, platform),
      status = COALESCE(${data.status ?? null}, status),
      test_regions = COALESCE(${testRegionsStr}::text[], test_regions),
      control_regions = COALESCE(${controlRegionsStr}::text[], control_regions),
      start_date = COALESCE(${data.startDate ?? null}::date, start_date),
      end_date = COALESCE(${data.endDate ?? null}::date, end_date),
      pre_test_days = COALESCE(${data.preTestDays ?? null}, pre_test_days),
      budget_estimate = COALESCE(${data.budgetEstimate ?? null}, budget_estimate),
      updated_at = NOW()
    WHERE id = ${experimentId} AND tenant_id = ${tenantId}
    RETURNING
      id,
      tenant_id as "tenantId",
      name,
      platform,
      status,
      test_regions as "testRegions",
      control_regions as "controlRegions",
      start_date as "startDate",
      end_date as "endDate",
      pre_test_days as "preTestDays",
      budget_estimate as "budgetEstimate",
      results,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  if (result.rows.length === 0) return null

  const r = result.rows[0] as Record<string, unknown>
  return {
    id: r.id as string,
    tenantId: r.tenantId as string,
    name: r.name as string,
    platform: r.platform as IncrementalityExperiment['platform'],
    status: r.status as IncrementalityExperiment['status'],
    testRegions: r.testRegions as string[],
    controlRegions: r.controlRegions as string[],
    startDate: (r.startDate as Date).toISOString().split('T')[0] ?? '',
    endDate: (r.endDate as Date).toISOString().split('T')[0] ?? '',
    preTestDays: Number(r.preTestDays),
    budgetEstimate: r.budgetEstimate ? Number(r.budgetEstimate) : null,
    results: r.results as IncrementalityExperiment['results'],
    createdAt: (r.createdAt as Date).toISOString(),
    updatedAt: (r.updatedAt as Date).toISOString(),
  }
}

export async function deleteIncrementalityExperiment(
  tenantId: string,
  experimentId: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM incrementality_experiments
    WHERE id = ${experimentId} AND tenant_id = ${tenantId}
    RETURNING id
  `
  return result.rows.length > 0
}

export async function getExperimentPerformanceData(
  tenantId: string,
  experimentId: string
): Promise<ExperimentPerformanceData[]> {
  const experiment = await getIncrementalityExperiment(tenantId, experimentId)
  if (!experiment) return []

  const testRegionsStr = toPostgresArray(experiment.testRegions)
  const controlRegionsStr = toPostgresArray(experiment.controlRegions)

  const result = await sql`
    WITH daily_metrics AS (
      SELECT
        DATE(c.converted_at) as date,
        CASE
          WHEN cust.region = ANY(${testRegionsStr}::text[]) THEN 'test'
          WHEN cust.region = ANY(${controlRegionsStr}::text[]) THEN 'control'
          ELSE NULL
        END as group_type,
        SUM(c.revenue) as revenue,
        COUNT(*) as conversions
      FROM attribution_conversions c
      JOIN customers cust ON c.customer_id = cust.id
      WHERE c.tenant_id = ${tenantId}
        AND c.converted_at >= ${experiment.startDate}::date
        AND c.converted_at <= ${experiment.endDate}::date
      GROUP BY DATE(c.converted_at), group_type
    )
    SELECT
      date,
      COALESCE(SUM(CASE WHEN group_type = 'test' THEN revenue END), 0) as "testRevenue",
      COALESCE(SUM(CASE WHEN group_type = 'test' THEN conversions END), 0) as "testConversions",
      COALESCE(SUM(CASE WHEN group_type = 'control' THEN revenue END), 0) as "controlRevenue",
      COALESCE(SUM(CASE WHEN group_type = 'control' THEN conversions END), 0) as "controlConversions"
    FROM daily_metrics
    WHERE group_type IS NOT NULL
    GROUP BY date
    ORDER BY date
  `

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      date: (r.date as Date).toISOString().split('T')[0] ?? '',
      testSpend: 0,
      testConversions: Number(r.testConversions),
      testRevenue: Number(r.testRevenue),
      controlSpend: 0,
      controlConversions: Number(r.controlConversions),
      controlRevenue: Number(r.controlRevenue),
    }
  })
}

// ============================================================
// AI Insights
// ============================================================

export async function getAIInsightsCache(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<AIInsightsCache | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      date_range_start as "dateRangeStart",
      date_range_end as "dateRangeEnd",
      insights,
      generated_at as "generatedAt"
    FROM ai_insights_cache
    WHERE tenant_id = ${tenantId}
      AND date_range_start = ${startDate}::date
      AND date_range_end = ${endDate}::date
      AND generated_at >= NOW() - INTERVAL '24 hours'
    ORDER BY generated_at DESC
    LIMIT 1
  `

  if (result.rows.length === 0) return null

  const r = result.rows[0] as Record<string, unknown>
  return {
    id: r.id as string,
    tenantId: r.tenantId as string,
    dateRangeStart: (r.dateRangeStart as Date).toISOString().split('T')[0] ?? '',
    dateRangeEnd: (r.dateRangeEnd as Date).toISOString().split('T')[0] ?? '',
    insights: r.insights as AIInsightsData,
    generatedAt: (r.generatedAt as Date).toISOString(),
  }
}

export async function saveAIInsightsCache(
  tenantId: string,
  startDate: string,
  endDate: string,
  insights: AIInsightsData
): Promise<AIInsightsCache> {
  const insightsJson = JSON.stringify(insights)

  const result = await sql`
    INSERT INTO ai_insights_cache (
      tenant_id,
      date_range_start,
      date_range_end,
      insights,
      generated_at
    ) VALUES (
      ${tenantId},
      ${startDate}::date,
      ${endDate}::date,
      ${insightsJson}::jsonb,
      NOW()
    )
    ON CONFLICT (tenant_id, date_range_start, date_range_end)
    DO UPDATE SET
      insights = EXCLUDED.insights,
      generated_at = NOW()
    RETURNING
      id,
      tenant_id as "tenantId",
      date_range_start as "dateRangeStart",
      date_range_end as "dateRangeEnd",
      insights,
      generated_at as "generatedAt"
  `

  const r = result.rows[0] as Record<string, unknown>
  return {
    id: r.id as string,
    tenantId: r.tenantId as string,
    dateRangeStart: (r.dateRangeStart as Date).toISOString().split('T')[0] ?? '',
    dateRangeEnd: (r.dateRangeEnd as Date).toISOString().split('T')[0] ?? '',
    insights: r.insights as AIInsightsData,
    generatedAt: (r.generatedAt as Date).toISOString(),
  }
}

// ============================================================
// Helper Functions
// ============================================================

function parseWindowToDays(window: AttributionWindow): number {
  const windowMap: Record<AttributionWindow, number> = {
    '1d': 1,
    '3d': 3,
    '7d': 7,
    '14d': 14,
    '28d': 28,
    '30d': 30,
    '90d': 90,
    ltv: 365,
  }
  return windowMap[window] ?? 7
}

function calculateCreditByModel(
  position: number,
  total: number
): Record<AttributionModel, number> {
  const isFirst = position === 0
  const isLast = position === total - 1

  const linearCredit = total > 0 ? Math.round(100 / total) : 0

  const decayFactor = Math.pow(0.5, (total - 1 - position) * 0.5)
  const totalDecay = Array.from({ length: total }, (_, i) =>
    Math.pow(0.5, (total - 1 - i) * 0.5)
  ).reduce((a, b) => a + b, 0)
  const timeDecayCredit = totalDecay > 0 ? Math.round((decayFactor / totalDecay) * 100) : 0

  let positionBasedCredit = 0
  if (total === 1) {
    positionBasedCredit = 100
  } else if (total === 2) {
    positionBasedCredit = 50
  } else {
    if (isFirst) positionBasedCredit = 40
    else if (isLast) positionBasedCredit = 40
    else positionBasedCredit = Math.round(20 / (total - 2))
  }

  return {
    first_touch: isFirst ? 100 : 0,
    last_touch: isLast ? 100 : 0,
    linear: linearCredit,
    time_decay: timeDecayCredit,
    position_based: positionBasedCredit,
    data_driven: linearCredit,
    last_non_direct: isLast ? 100 : 0,
  }
}
