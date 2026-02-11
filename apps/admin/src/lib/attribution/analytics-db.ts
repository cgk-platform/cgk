/**
 * Attribution Analytics Database Operations
 *
 * Database queries for channel analytics, product attribution, creatives,
 * cohorts, ROAS index, and model comparison.
 * All operations assume tenant context is already set via withTenant().
 */

import { sql } from '@cgk/db'

import type {
  AttributionModel,
  AttributionWindow,
  ChannelHierarchy,
  ChannelTrendPoint,
  CohortData,
  CohortGrouping,
  CohortHealth,
  CohortLTV,
  CreativeFilters,
  CreativePerformance,
  CreativeSavedView,
  CustomerType,
  ModelComparisonData,
  ProductAttribution,
  ProductViewMode,
  QuickFilter,
  RoasIndexData,
} from './types'

// ============================================================
// Channel Analytics
// ============================================================

interface ChannelQueryParams {
  tenantId: string
  model: AttributionModel
  window: AttributionWindow
  startDate: string
  endDate: string
  customerType: CustomerType
  quickFilter: QuickFilter
  parentId?: string | null
}

export async function getChannelHierarchy(params: ChannelQueryParams): Promise<ChannelHierarchy[]> {
  const { tenantId, model, window, startDate, endDate, customerType, parentId } = params

  // Build base query for channels
  const result = await sql`
    SELECT
      acs.channel as id,
      acs.channel as name,
      NULL as parent_id,
      'channel' as level,
      COALESCE(SUM(acs.spend), 0) as spend,
      COALESCE(SUM(acs.revenue), 0) as revenue,
      COALESCE(SUM(acs.conversions), 0) as conversions,
      CASE WHEN SUM(acs.spend) > 0 THEN SUM(acs.revenue) / SUM(acs.spend) ELSE 0 END as roas,
      CASE WHEN SUM(acs.conversions) > 0 THEN SUM(acs.spend) / SUM(acs.conversions) ELSE 0 END as cpa,
      COALESCE(SUM(CASE WHEN c.is_first_purchase = true THEN acs.revenue ELSE 0 END), 0) as new_customer_revenue,
      COALESCE(SUM(CASE WHEN c.is_first_purchase = false THEN acs.revenue ELSE 0 END), 0) as existing_customer_revenue
    FROM attribution_channel_summary acs
    LEFT JOIN attribution_conversions c ON acs.conversion_id = c.id
    WHERE acs.tenant_id = ${tenantId}
      AND acs.model = ${model}
      AND acs.window = ${window}
      AND acs.date >= ${startDate}::date
      AND acs.date <= ${endDate}::date
      AND (${customerType} = 'all' OR
           (${customerType} = 'new' AND c.is_first_purchase = true) OR
           (${customerType} = 'existing' AND c.is_first_purchase = false))
      AND (${parentId} IS NULL OR acs.channel = ${parentId})
    GROUP BY acs.channel
    ORDER BY revenue DESC
    LIMIT 100
  `

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      level: 'channel' as const,
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      parentId: r.parent_id ? String(r.parent_id) : null,
      spend: Number(r.spend) || 0,
      revenue: Number(r.revenue) || 0,
      conversions: Number(r.conversions) || 0,
      roas: Math.round((Number(r.roas) || 0) * 100) / 100,
      cpa: Math.round((Number(r.cpa) || 0) * 100) / 100,
      newCustomerRevenue: Number(r.new_customer_revenue) || 0,
      existingCustomerRevenue: Number(r.existing_customer_revenue) || 0,
    }
  })
}

export async function getChannelTrends(
  tenantId: string,
  model: AttributionModel,
  window: AttributionWindow,
  startDate: string,
  endDate: string,
  channelIds: string[]
): Promise<Record<string, ChannelTrendPoint[]>> {
  if (channelIds.length === 0) return {}

  // Query trends for each channel
  const trends: Record<string, ChannelTrendPoint[]> = {}

  for (const channelId of channelIds.slice(0, 5)) {
    const result = await sql`
      SELECT
        acs.date::text,
        COALESCE(SUM(acs.revenue), 0) as revenue,
        CASE WHEN SUM(acs.spend) > 0 THEN SUM(acs.revenue) / SUM(acs.spend) ELSE 0 END as roas,
        COALESCE(SUM(acs.conversions), 0) as conversions
      FROM attribution_channel_summary acs
      WHERE acs.tenant_id = ${tenantId}
        AND acs.model = ${model}
        AND acs.window = ${window}
        AND acs.date >= ${startDate}::date
        AND acs.date <= ${endDate}::date
        AND acs.channel = ${channelId}
      GROUP BY acs.date
      ORDER BY acs.date ASC
    `

    trends[channelId] = result.rows.map((row) => {
      const r = row as Record<string, unknown>
      return {
        date: String(r.date ?? ''),
        revenue: Number(r.revenue) || 0,
        roas: Math.round((Number(r.roas) || 0) * 100) / 100,
        conversions: Number(r.conversions) || 0,
      }
    })
  }

  return trends
}

// ============================================================
// Product Attribution
// ============================================================

export async function getProductAttribution(
  tenantId: string,
  model: AttributionModel,
  window: AttributionWindow,
  startDate: string,
  endDate: string,
  viewMode: ProductViewMode,
  benchmarks: { roasBenchmark: number; cacBenchmark: number }
): Promise<ProductAttribution[]> {
  // Query based on view mode - use separate queries for each mode
  let result;

  if (viewMode === 'platform') {
    result = await sql`
      SELECT
        COALESCE(acs.platform, 'other') as id,
        COALESCE(acs.platform, 'other') as name,
        NULL as image_url,
        acs.platform as platform,
        NULL as campaign_id,
        COALESCE(SUM(acs.spend), 0) as spend,
        COALESCE(SUM(acs.revenue), 0) as revenue,
        CASE WHEN SUM(acs.spend) > 0 THEN SUM(acs.revenue) / SUM(acs.spend) ELSE 0 END as roas,
        CASE WHEN SUM(acs.conversions) > 0 THEN SUM(acs.spend) / SUM(acs.conversions) ELSE 0 END as cac,
        COALESCE(SUM(acs.conversions), 0) as conversions,
        CASE WHEN SUM(acs.conversions) > 0
          THEN SUM(CASE WHEN c.is_first_purchase = true THEN 1 ELSE 0 END)::float / SUM(acs.conversions) * 100
          ELSE 0 END as new_customer_percent
      FROM attribution_channel_summary acs
      LEFT JOIN attribution_conversions c ON acs.conversion_id = c.id
      WHERE acs.tenant_id = ${tenantId}
        AND acs.model = ${model}
        AND acs.window = ${window}
        AND acs.date >= ${startDate}::date
        AND acs.date <= ${endDate}::date
      GROUP BY acs.platform
      ORDER BY revenue DESC
      LIMIT 200
    `
  } else if (viewMode === 'campaign') {
    result = await sql`
      SELECT
        acs.campaign_id as id,
        acs.campaign_id as name,
        NULL as image_url,
        acs.platform as platform,
        acs.campaign_id as campaign_id,
        COALESCE(SUM(acs.spend), 0) as spend,
        COALESCE(SUM(acs.revenue), 0) as revenue,
        CASE WHEN SUM(acs.spend) > 0 THEN SUM(acs.revenue) / SUM(acs.spend) ELSE 0 END as roas,
        CASE WHEN SUM(acs.conversions) > 0 THEN SUM(acs.spend) / SUM(acs.conversions) ELSE 0 END as cac,
        COALESCE(SUM(acs.conversions), 0) as conversions,
        CASE WHEN SUM(acs.conversions) > 0
          THEN SUM(CASE WHEN c.is_first_purchase = true THEN 1 ELSE 0 END)::float / SUM(acs.conversions) * 100
          ELSE 0 END as new_customer_percent
      FROM attribution_channel_summary acs
      LEFT JOIN attribution_conversions c ON acs.conversion_id = c.id
      WHERE acs.tenant_id = ${tenantId}
        AND acs.model = ${model}
        AND acs.window = ${window}
        AND acs.date >= ${startDate}::date
        AND acs.date <= ${endDate}::date
        AND acs.campaign_id IS NOT NULL
      GROUP BY acs.campaign_id, acs.platform
      ORDER BY revenue DESC
      LIMIT 200
    `
  } else {
    // Default: product view
    result = await sql`
      SELECT
        COALESCE(p.id, 'unknown') as id,
        COALESCE(p.name, 'Unknown Product') as name,
        p.image_url,
        NULL as platform,
        NULL as campaign_id,
        COALESCE(SUM(acs.spend), 0) as spend,
        COALESCE(SUM(acs.revenue), 0) as revenue,
        CASE WHEN SUM(acs.spend) > 0 THEN SUM(acs.revenue) / SUM(acs.spend) ELSE 0 END as roas,
        CASE WHEN SUM(acs.conversions) > 0 THEN SUM(acs.spend) / SUM(acs.conversions) ELSE 0 END as cac,
        COALESCE(SUM(acs.conversions), 0) as conversions,
        CASE WHEN SUM(acs.conversions) > 0
          THEN SUM(CASE WHEN c.is_first_purchase = true THEN 1 ELSE 0 END)::float / SUM(acs.conversions) * 100
          ELSE 0 END as new_customer_percent
      FROM attribution_channel_summary acs
      LEFT JOIN attribution_conversions c ON acs.conversion_id = c.id
      LEFT JOIN products p ON acs.product_id = p.id
      WHERE acs.tenant_id = ${tenantId}
        AND acs.model = ${model}
        AND acs.window = ${window}
        AND acs.date >= ${startDate}::date
        AND acs.date <= ${endDate}::date
      GROUP BY p.id, p.name, p.image_url
      ORDER BY revenue DESC
      LIMIT 200
    `
  }

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    const roas = Number(r.roas) || 0
    const cac = Number(r.cac) || 0

    return {
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      imageUrl: r.image_url ? String(r.image_url) : undefined,
      spend: Number(r.spend) || 0,
      revenue: Number(r.revenue) || 0,
      roas: Math.round(roas * 100) / 100,
      cac: Math.round(cac * 100) / 100,
      conversions: Number(r.conversions) || 0,
      newCustomerPercent: Math.round((Number(r.new_customer_percent) || 0) * 100) / 100,
      roasIndex: benchmarks.roasBenchmark > 0 ? roas / benchmarks.roasBenchmark : 0,
      cacIndex: cac > 0 && benchmarks.cacBenchmark > 0 ? benchmarks.cacBenchmark / cac : 0,
      platform: r.platform ? String(r.platform) : undefined,
      campaignId: r.campaign_id ? String(r.campaign_id) : undefined,
    }
  })
}

// ============================================================
// Creative Analytics
// ============================================================

export async function getCreativePerformance(
  tenantId: string,
  model: AttributionModel,
  window: AttributionWindow,
  startDate: string,
  endDate: string,
  filters: CreativeFilters
): Promise<CreativePerformance[]> {
  const searchPattern = filters.search ? `%${filters.search}%` : '%'
  const hideInactive = filters.hideInactive ?? false
  const hasMeta = !filters.platforms || filters.platforms.length === 0 || filters.platforms.includes('meta')
  const hasGoogle = !filters.platforms || filters.platforms.length === 0 || filters.platforms.includes('google')
  const hasTiktok = !filters.platforms || filters.platforms.length === 0 || filters.platforms.includes('tiktok')

  const result = await sql`
    SELECT
      cr.id,
      cr.name,
      cr.platform,
      cr.thumbnail_url,
      cr.creative_type as type,
      cr.status,
      COALESCE(SUM(acs.spend), 0) as spend,
      COALESCE(SUM(acs.revenue), 0) as revenue,
      CASE WHEN SUM(acs.spend) > 0 THEN SUM(acs.revenue) / SUM(acs.spend) ELSE 0 END as roas,
      COALESCE(SUM(acs.conversions), 0) as conversions,
      COALESCE(SUM(cr.impressions), 0) as impressions,
      COALESCE(SUM(cr.clicks), 0) as clicks,
      CASE WHEN SUM(cr.impressions) > 0 THEN SUM(cr.clicks)::float / SUM(cr.impressions) * 100 ELSE 0 END as ctr,
      COALESCE(SUM(CASE WHEN c.is_first_purchase = true THEN acs.revenue ELSE 0 END), 0) as new_customer_revenue,
      COALESCE(SUM(CASE WHEN c.is_first_purchase = false THEN acs.revenue ELSE 0 END), 0) as existing_customer_revenue,
      COALESCE(AVG(acs.visit_coverage), 0) as visit_coverage
    FROM creatives cr
    LEFT JOIN attribution_channel_summary acs ON cr.id = acs.creative_id
      AND acs.model = ${model}
      AND acs.window = ${window}
      AND acs.date >= ${startDate}::date
      AND acs.date <= ${endDate}::date
    LEFT JOIN attribution_conversions c ON acs.conversion_id = c.id
    WHERE cr.tenant_id = ${tenantId}
      AND cr.name ILIKE ${searchPattern}
      AND (${!hideInactive} OR cr.status = 'active')
      AND ((${hasMeta} AND cr.platform = 'meta') OR
           (${hasGoogle} AND cr.platform = 'google') OR
           (${hasTiktok} AND cr.platform = 'tiktok'))
    GROUP BY cr.id, cr.name, cr.platform, cr.thumbnail_url, cr.creative_type, cr.status
    ORDER BY revenue DESC
    LIMIT 200
  `

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      platform: String(r.platform ?? 'meta') as CreativePerformance['platform'],
      thumbnailUrl: String(r.thumbnail_url ?? ''),
      type: String(r.type ?? 'image') as CreativePerformance['type'],
      status: String(r.status ?? 'active') as CreativePerformance['status'],
      spend: Number(r.spend) || 0,
      revenue: Number(r.revenue) || 0,
      roas: Math.round((Number(r.roas) || 0) * 100) / 100,
      conversions: Number(r.conversions) || 0,
      impressions: Number(r.impressions) || 0,
      clicks: Number(r.clicks) || 0,
      ctr: Math.round((Number(r.ctr) || 0) * 100) / 100,
      newCustomerRevenue: Number(r.new_customer_revenue) || 0,
      existingCustomerRevenue: Number(r.existing_customer_revenue) || 0,
      visitCoverage: Math.round((Number(r.visit_coverage) || 0) * 100) / 100,
    }
  })
}

export async function getCreativeSavedViews(tenantId: string): Promise<CreativeSavedView[]> {
  const result = await sql`
    SELECT id, tenant_id, name, filters, created_at, updated_at
    FROM creative_saved_views
    WHERE tenant_id = ${tenantId}
    ORDER BY name ASC
  `

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id ?? ''),
      tenantId: String(r.tenant_id ?? ''),
      name: String(r.name ?? ''),
      filters: (r.filters ?? {}) as CreativeFilters,
      createdAt: String(r.created_at ?? ''),
      updatedAt: String(r.updated_at ?? ''),
    }
  })
}

export async function saveCreativeSavedView(
  tenantId: string,
  name: string,
  filters: CreativeFilters
): Promise<CreativeSavedView> {
  const result = await sql`
    INSERT INTO creative_saved_views (tenant_id, name, filters)
    VALUES (${tenantId}, ${name}, ${JSON.stringify(filters)})
    RETURNING id, tenant_id, name, filters, created_at, updated_at
  `

  const r = result.rows[0] as Record<string, unknown>
  return {
    id: String(r.id ?? ''),
    tenantId: String(r.tenant_id ?? ''),
    name: String(r.name ?? ''),
    filters: (r.filters ?? {}) as CreativeFilters,
    createdAt: String(r.created_at ?? ''),
    updatedAt: String(r.updated_at ?? ''),
  }
}

export async function deleteCreativeSavedView(tenantId: string, id: string): Promise<void> {
  await sql`
    DELETE FROM creative_saved_views
    WHERE tenant_id = ${tenantId} AND id = ${id}
  `
}

// ============================================================
// Cohort Analysis
// ============================================================

export async function getCohortData(
  tenantId: string,
  grouping: CohortGrouping,
  startDate: string,
  endDate: string,
  channel?: string
): Promise<CohortData[]> {
  // Get cohort data with appropriate grouping
  const result = await sql`
    WITH cohort_customers AS (
      SELECT
        DATE_TRUNC(${grouping === 'daily' ? 'day' : grouping === 'weekly' ? 'week' : 'month'}, cust.created_at) as cohort_date,
        cust.id as customer_id,
        MIN(o.created_at) as first_order_date,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.total) as total_revenue
      FROM customers cust
      JOIN orders o ON cust.id = o.customer_id
      WHERE cust.tenant_id = ${tenantId}
        AND o.created_at >= ${startDate}::date
        AND o.created_at <= ${endDate}::date
      GROUP BY DATE_TRUNC(${grouping === 'daily' ? 'day' : grouping === 'weekly' ? 'week' : 'month'}, cust.created_at), cust.id
    ),
    cohort_metrics AS (
      SELECT
        cc.cohort_date,
        cc.customer_id,
        cc.first_order_date,
        COALESCE(SUM(CASE WHEN o.created_at <= cc.first_order_date THEN o.total ELSE 0 END), 0) as day0_ltv,
        COALESCE(SUM(CASE WHEN o.created_at <= cc.first_order_date + INTERVAL '7 days' THEN o.total ELSE 0 END), 0) as day7_ltv,
        COALESCE(SUM(CASE WHEN o.created_at <= cc.first_order_date + INTERVAL '30 days' THEN o.total ELSE 0 END), 0) as day30_ltv,
        COALESCE(SUM(CASE WHEN o.created_at <= cc.first_order_date + INTERVAL '60 days' THEN o.total ELSE 0 END), 0) as day60_ltv,
        COALESCE(SUM(CASE WHEN o.created_at <= cc.first_order_date + INTERVAL '90 days' THEN o.total ELSE 0 END), 0) as day90_ltv,
        COALESCE(SUM(CASE WHEN o.created_at <= cc.first_order_date + INTERVAL '180 days' THEN o.total ELSE 0 END), 0) as day180_ltv,
        CASE WHEN EXISTS (
          SELECT 1 FROM orders o2
          WHERE o2.customer_id = cc.customer_id
            AND o2.created_at > cc.first_order_date + INTERVAL '60 days'
            AND o2.created_at <= cc.first_order_date + INTERVAL '90 days'
        ) THEN 1 ELSE 0 END as retained_90d
      FROM cohort_customers cc
      LEFT JOIN orders o ON cc.customer_id = o.customer_id
      GROUP BY cc.cohort_date, cc.customer_id, cc.first_order_date
    )
    SELECT
      cohort_date::text,
      COUNT(DISTINCT customer_id) as customer_count,
      50 as cac,
      COALESCE(AVG(day0_ltv), 0) as day0_ltv,
      COALESCE(AVG(day7_ltv), 0) as day7_ltv,
      COALESCE(AVG(day30_ltv), 0) as day30_ltv,
      COALESCE(AVG(day60_ltv), 0) as day60_ltv,
      COALESCE(AVG(day90_ltv), 0) as day90_ltv,
      COALESCE(AVG(day180_ltv), 0) as day180_ltv,
      COALESCE(SUM(retained_90d)::float / NULLIF(COUNT(*), 0) * 100, 0) as retention_90d
    FROM cohort_metrics
    GROUP BY cohort_date
    ORDER BY cohort_date DESC
    LIMIT 52
  `

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    const cac = Number(r.cac) || 0
    const day90Ltv = Number(r.day90_ltv) || 0

    // Calculate payback days
    let paybackDays: number | null = null
    const ltvProgression = [
      { days: 0, ltv: Number(r.day0_ltv) || 0 },
      { days: 7, ltv: Number(r.day7_ltv) || 0 },
      { days: 30, ltv: Number(r.day30_ltv) || 0 },
      { days: 60, ltv: Number(r.day60_ltv) || 0 },
      { days: 90, ltv: Number(r.day90_ltv) || 0 },
      { days: 180, ltv: Number(r.day180_ltv) || 0 },
    ]

    for (const point of ltvProgression) {
      if (point.ltv >= cac) {
        paybackDays = point.days
        break
      }
    }

    // Determine health
    let health: CohortHealth = 'healthy'
    if (paybackDays === null) {
      health = 'poor'
    } else if (paybackDays > 60) {
      health = 'at_risk'
    }

    const ltv: CohortLTV = {
      day0: Number(r.day0_ltv) || 0,
      day7: Number(r.day7_ltv) || 0,
      day30: Number(r.day30_ltv) || 0,
      day60: Number(r.day60_ltv) || 0,
      day90: day90Ltv,
      day180: Number(r.day180_ltv) || 0,
    }

    return {
      cohortDate: String(r.cohort_date ?? '').split(' ')[0] ?? '',
      grouping,
      customerCount: Number(r.customer_count) || 0,
      cac: Math.round(cac * 100) / 100,
      ltv,
      paybackDays,
      retention90d: Math.round((Number(r.retention_90d) || 0) * 100) / 100,
      health,
      channel,
    }
  })
}

// ============================================================
// ROAS Index
// ============================================================

export async function getRoasIndexData(
  tenantId: string,
  window: AttributionWindow,
  startDate: string,
  endDate: string
): Promise<RoasIndexData[]> {
  const result = await sql`
    SELECT
      acs.channel,
      acs.model,
      COALESCE(SUM(acs.revenue), 0) as revenue,
      COALESCE(SUM(acs.spend), 0) as spend,
      COALESCE(SUM(acs.conversions), 0) as conversions
    FROM attribution_channel_summary acs
    WHERE acs.tenant_id = ${tenantId}
      AND acs.window = ${window}
      AND acs.date >= ${startDate}::date
      AND acs.date <= ${endDate}::date
    GROUP BY acs.channel, acs.model
    ORDER BY acs.channel, acs.model
  `

  const models: AttributionModel[] = [
    'first_touch',
    'last_touch',
    'linear',
    'time_decay',
    'position_based',
    'data_driven',
    'last_non_direct',
  ]

  // Group results by channel
  const channelMap: Record<string, RoasIndexData> = {}

  for (const row of result.rows) {
    const r = row as Record<string, unknown>
    const channel = String(r.channel ?? '')
    const model = String(r.model ?? '') as AttributionModel
    const revenue = Number(r.revenue) || 0
    const spend = Number(r.spend) || 0
    const conversions = Number(r.conversions) || 0
    const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0

    if (!channelMap[channel]) {
      channelMap[channel] = {
        channel,
        modelResults: {} as Record<AttributionModel, { revenue: number; roas: number; conversions: number }>,
      }
    }

    channelMap[channel].modelResults[model] = { revenue, roas, conversions }
  }

  // Ensure all models exist for each channel (fill with zeros)
  const channels = Object.values(channelMap)
  for (const channelData of channels) {
    for (const model of models) {
      if (!channelData.modelResults[model]) {
        channelData.modelResults[model] = { revenue: 0, roas: 0, conversions: 0 }
      }
    }

    // Generate AI recommendation
    channelData.aiRecommendation = generateAIRecommendation(channelData)
  }

  return channels.sort((a, b) => {
    const aRevenue = Object.values(a.modelResults).reduce((sum, m) => sum + m.revenue, 0)
    const bRevenue = Object.values(b.modelResults).reduce((sum, m) => sum + m.revenue, 0)
    return bRevenue - aRevenue
  })
}

function generateAIRecommendation(data: RoasIndexData): RoasIndexData['aiRecommendation'] {
  type ModelResult = { model: AttributionModel; roas: number }
  const results: ModelResult[] = (Object.entries(data.modelResults) as [AttributionModel, { revenue: number; roas: number; conversions: number }][])
    .map(([model, r]) => ({ model, roas: r.roas }))
    .filter((r) => r.roas > 0)

  if (results.length === 0) {
    return {
      recommendedModel: 'time_decay',
      confidence: 'low' as const,
      reasoning: 'Insufficient data to make a recommendation. Time Decay is a good default for most channels.',
    }
  }

  results.sort((a, b) => a.roas - b.roas)
  const medianIndex = Math.floor(results.length / 2)
  const medianModel = results[medianIndex]

  // Calculate variance to determine confidence
  const roasArr = results.map((r) => r.roas)
  const mean = roasArr.reduce((a, b) => a + b, 0) / roasArr.length
  const variance = roasArr.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / roasArr.length
  const stdDev = Math.sqrt(variance)
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 1

  let confidence: 'high' | 'medium' | 'low' = 'high'
  if (coefficientOfVariation > 0.5) confidence = 'medium'
  if (coefficientOfVariation > 1) confidence = 'low'

  const reasoningMap: Record<AttributionModel, string> = {
    first_touch: `${data.channel} shows strong top-of-funnel influence. First Touch captures awareness-driving campaigns well.`,
    last_touch: `${data.channel} excels at closing conversions. Last Touch accurately credits final touchpoints.`,
    linear: `${data.channel} has balanced touchpoint contribution. Linear model fairly distributes credit across the journey.`,
    time_decay: `${data.channel} benefits from recency weighting. Time Decay emphasizes touchpoints closer to conversion.`,
    position_based: `${data.channel} shows both introduction and conversion strength. Position Based captures this well.`,
    data_driven: `${data.channel} has complex patterns best captured by Data Driven attribution.`,
    last_non_direct: `${data.channel} often precedes direct visits. Last Non-Direct avoids under-crediting paid efforts.`,
  }

  return {
    recommendedModel: medianModel?.model ?? 'time_decay',
    confidence,
    reasoning: reasoningMap[medianModel?.model ?? 'time_decay'] ?? 'Analysis based on ROAS distribution across models.',
  }
}

// ============================================================
// Model Comparison
// ============================================================

export async function getModelComparisonData(
  tenantId: string,
  window: AttributionWindow,
  startDate: string,
  endDate: string
): Promise<ModelComparisonData[]> {
  const result = await sql`
    SELECT
      acs.model,
      acs.channel,
      COALESCE(SUM(acs.revenue), 0) as revenue,
      COALESCE(SUM(acs.conversions), 0) as conversions,
      COALESCE(SUM(acs.spend), 0) as spend
    FROM attribution_channel_summary acs
    WHERE acs.tenant_id = ${tenantId}
      AND acs.window = ${window}
      AND acs.date >= ${startDate}::date
      AND acs.date <= ${endDate}::date
    GROUP BY acs.model, acs.channel
    ORDER BY acs.model, revenue DESC
  `

  // Model descriptions
  const modelDescriptions: Record<AttributionModel, string> = {
    first_touch: 'Credits 100% of the conversion value to the first touchpoint in the customer journey. Best for understanding how customers discover your brand.',
    last_touch: 'Credits 100% to the last touchpoint before conversion. Best for understanding what directly drives purchases.',
    linear: 'Distributes credit equally across all touchpoints. Best for understanding the full customer journey.',
    time_decay: 'Gives more credit to touchpoints closer to conversion. Best for balancing journey stages with recency.',
    position_based: 'Credits 40% to first touch, 40% to last, and 20% to middle. Best for valuing both discovery and conversion.',
    data_driven: 'Uses machine learning to determine credit. Best when you have sufficient data for accurate modeling.',
    last_non_direct: 'Credits the last non-direct touchpoint. Best for understanding marketing impact when many conversions come from direct visits.',
  }

  // Group by model
  const modelMap: Record<string, ModelComparisonData> = {}

  for (const row of result.rows) {
    const r = row as Record<string, unknown>
    const model = String(r.model ?? '') as AttributionModel
    const channel = String(r.channel ?? '')
    const channelRevenue = Number(r.revenue) || 0

    if (!modelMap[model]) {
      modelMap[model] = {
        model,
        description: modelDescriptions[model] ?? '',
        totalRevenue: 0,
        totalConversions: 0,
        totalSpend: 0,
        roas: 0,
        topChannel: '',
        creditDistribution: [],
      }
    }

    const data = modelMap[model]
    data.totalRevenue += channelRevenue
    data.totalConversions += Number(r.conversions) || 0
    data.totalSpend += Number(r.spend) || 0
    data.creditDistribution.push({ channel, percentage: channelRevenue })

    // Track top channel (first one with highest revenue since sorted DESC)
    if (!data.topChannel) {
      data.topChannel = channel
    }
  }

  // Calculate percentages and ROAS
  const models = Object.values(modelMap)
  for (const model of models) {
    model.roas = model.totalSpend > 0 ? Math.round((model.totalRevenue / model.totalSpend) * 100) / 100 : 0

    // Calculate credit distribution percentages
    const totalChannelRevenue = model.creditDistribution.reduce((sum, c) => sum + c.percentage, 0)
    if (totalChannelRevenue > 0) {
      for (const dist of model.creditDistribution) {
        dist.percentage = Math.round((dist.percentage / totalChannelRevenue) * 100 * 100) / 100
      }
    }

    // Keep only top 5 channels
    model.creditDistribution = model.creditDistribution
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5)
  }

  return models.sort((a, b) => b.totalRevenue - a.totalRevenue)
}
