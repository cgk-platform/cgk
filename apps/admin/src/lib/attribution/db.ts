/**
 * Attribution Database Operations
 *
 * CRUD operations for attribution settings, touchpoints, conversions, and data quality.
 * All operations assume tenant context is already set via withTenant().
 */

import { sql } from '@cgk/db'

import type {
  AttributionModel,
  AttributionOverview,
  AttributionSettings,
  AttributionSettingsUpdate,
  AttributionWindow,
  ChannelBreakdown,
  DataQualityMetrics,
  DataQualitySnapshot,
  PlatformComparison,
} from './types'

// ============================================================
// Attribution Settings
// ============================================================

export async function getAttributionSettings(tenantId: string): Promise<AttributionSettings | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      enabled,
      default_model as "defaultModel",
      default_window as "defaultWindow",
      attribution_mode as "attributionMode",
      enabled_models as "enabledModels",
      enabled_windows as "enabledWindows",
      time_decay_half_life_hours as "timeDecayHalfLifeHours",
      position_based_weights as "positionBasedWeights",
      fairing_bridge_enabled as "fairingBridgeEnabled",
      fairing_sync_interval as "fairingSyncInterval",
      fairing_last_sync_at as "fairingLastSyncAt",
      created_at as "createdAt",
      updated_at as "updatedAt",
      updated_by as "updatedBy"
    FROM attribution_settings
    WHERE tenant_id = ${tenantId}
  `

  return (result.rows[0] as AttributionSettings | undefined) ?? null
}

// Helper to convert array to PostgreSQL array literal string
function toPostgresArray(arr: string[]): string {
  return `{${arr.map((s) => `"${s}"`).join(',')}}`
}

export async function upsertAttributionSettings(
  tenantId: string,
  data: AttributionSettingsUpdate,
  userId: string | null
): Promise<AttributionSettings> {
  const defaultModels = ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based', 'data_driven', 'last_non_direct']
  const defaultWindows = ['1d', '7d', '14d', '28d', '30d']
  const defaultWeights = { first: 40, middle: 20, last: 40 }

  // Convert arrays to PostgreSQL format
  const enabledModelsStr = toPostgresArray(data.enabledModels ?? defaultModels)
  const enabledWindowsStr = toPostgresArray(data.enabledWindows ?? defaultWindows)

  const result = await sql`
    INSERT INTO attribution_settings (
      tenant_id,
      enabled,
      default_model,
      default_window,
      attribution_mode,
      enabled_models,
      enabled_windows,
      time_decay_half_life_hours,
      position_based_weights,
      fairing_bridge_enabled,
      fairing_sync_interval,
      updated_by
    ) VALUES (
      ${tenantId},
      ${data.enabled ?? true},
      ${data.defaultModel ?? 'time_decay'},
      ${data.defaultWindow ?? '7d'},
      ${data.attributionMode ?? 'clicks_only'},
      ${enabledModelsStr}::text[],
      ${enabledWindowsStr}::text[],
      ${data.timeDecayHalfLifeHours ?? 168},
      ${JSON.stringify(data.positionBasedWeights ?? defaultWeights)},
      ${data.fairingBridgeEnabled ?? false},
      ${data.fairingSyncInterval ?? 'hourly'},
      ${userId}
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      enabled = COALESCE(${data.enabled}, attribution_settings.enabled),
      default_model = COALESCE(${data.defaultModel}, attribution_settings.default_model),
      default_window = COALESCE(${data.defaultWindow}, attribution_settings.default_window),
      attribution_mode = COALESCE(${data.attributionMode}, attribution_settings.attribution_mode),
      enabled_models = CASE
        WHEN ${data.enabledModels === undefined} THEN attribution_settings.enabled_models
        ELSE ${enabledModelsStr}::text[]
      END,
      enabled_windows = CASE
        WHEN ${data.enabledWindows === undefined} THEN attribution_settings.enabled_windows
        ELSE ${enabledWindowsStr}::text[]
      END,
      time_decay_half_life_hours = COALESCE(${data.timeDecayHalfLifeHours}, attribution_settings.time_decay_half_life_hours),
      position_based_weights = CASE
        WHEN ${data.positionBasedWeights === undefined} THEN attribution_settings.position_based_weights
        ELSE ${JSON.stringify(data.positionBasedWeights ?? defaultWeights)}
      END,
      fairing_bridge_enabled = COALESCE(${data.fairingBridgeEnabled}, attribution_settings.fairing_bridge_enabled),
      fairing_sync_interval = COALESCE(${data.fairingSyncInterval}, attribution_settings.fairing_sync_interval),
      updated_by = ${userId},
      updated_at = NOW()
    RETURNING
      id,
      tenant_id as "tenantId",
      enabled,
      default_model as "defaultModel",
      default_window as "defaultWindow",
      attribution_mode as "attributionMode",
      enabled_models as "enabledModels",
      enabled_windows as "enabledWindows",
      time_decay_half_life_hours as "timeDecayHalfLifeHours",
      position_based_weights as "positionBasedWeights",
      fairing_bridge_enabled as "fairingBridgeEnabled",
      fairing_sync_interval as "fairingSyncInterval",
      fairing_last_sync_at as "fairingLastSyncAt",
      created_at as "createdAt",
      updated_at as "updatedAt",
      updated_by as "updatedBy"
  `

  return result.rows[0] as AttributionSettings
}

// ============================================================
// Attribution Overview (Dashboard Data)
// ============================================================

export async function getAttributionOverview(
  tenantId: string,
  model: AttributionModel,
  window: AttributionWindow,
  startDate: string,
  endDate: string
): Promise<AttributionOverview> {
  // Get KPIs with comparison to previous period
  const periodDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  const previousStartDate = new Date(new Date(startDate).getTime() - periodDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const previousEndDate = new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  // Current period metrics
  const currentMetrics = await sql`
    SELECT
      COALESCE(SUM(revenue), 0) as revenue,
      COUNT(DISTINCT conversion_id) as conversions,
      COALESCE(SUM(spend), 0) as spend
    FROM attribution_channel_summary
    WHERE tenant_id = ${tenantId}
      AND model = ${model}
      AND window = ${window}
      AND date >= ${startDate}::date
      AND date <= ${endDate}::date
  `

  // Previous period metrics for comparison
  const previousMetrics = await sql`
    SELECT
      COALESCE(SUM(revenue), 0) as revenue,
      COUNT(DISTINCT conversion_id) as conversions,
      COALESCE(SUM(spend), 0) as spend
    FROM attribution_channel_summary
    WHERE tenant_id = ${tenantId}
      AND model = ${model}
      AND window = ${window}
      AND date >= ${previousStartDate}::date
      AND date <= ${previousEndDate}::date
  `

  const current = currentMetrics.rows[0] as { revenue: number; conversions: number; spend: number }
  const previous = previousMetrics.rows[0] as { revenue: number; conversions: number; spend: number }

  const currentRevenue = Number(current.revenue) || 0
  const previousRevenue = Number(previous.revenue) || 0
  const currentConversions = Number(current.conversions) || 0
  const previousConversions = Number(previous.conversions) || 0
  const currentSpend = Number(current.spend) || 0
  const previousSpend = Number(previous.spend) || 0

  const currentRoas = currentSpend > 0 ? currentRevenue / currentSpend : 0
  const previousRoas = previousSpend > 0 ? previousRevenue / previousSpend : 0
  const currentMer = currentSpend > 0 ? currentRevenue / currentSpend : 0
  const previousMer = previousSpend > 0 ? previousRevenue / previousSpend : 0

  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  const kpis = {
    revenue: { value: currentRevenue, change: calcChange(currentRevenue, previousRevenue) },
    conversions: { value: currentConversions, change: calcChange(currentConversions, previousConversions) },
    roas: { value: Math.round(currentRoas * 100) / 100, change: calcChange(currentRoas, previousRoas) },
    mer: { value: Math.round(currentMer * 100) / 100, change: calcChange(currentMer, previousMer) },
  }

  // Channel breakdown
  const channelData = await sql`
    SELECT
      channel,
      COALESCE(SUM(revenue), 0) as revenue,
      COALESCE(SUM(spend), 0) as spend,
      COALESCE(SUM(conversions), 0) as conversions
    FROM attribution_channel_summary
    WHERE tenant_id = ${tenantId}
      AND model = ${model}
      AND window = ${window}
      AND date >= ${startDate}::date
      AND date <= ${endDate}::date
    GROUP BY channel
    ORDER BY revenue DESC
    LIMIT 10
  `

  const channelBreakdown: ChannelBreakdown[] = channelData.rows.map((row) => {
    const r = row as { channel: string; revenue: number; spend: number; conversions: number }
    const revenue = Number(r.revenue) || 0
    const spend = Number(r.spend) || 0
    return {
      channel: r.channel,
      revenue,
      spend,
      conversions: Number(r.conversions) || 0,
      roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
    }
  })

  // Platform comparison
  const platformData = await sql`
    SELECT
      COALESCE(platform, 'other') as platform,
      COALESCE(SUM(revenue), 0) as revenue,
      COALESCE(SUM(spend), 0) as spend,
      COALESCE(SUM(conversions), 0) as conversions
    FROM attribution_channel_summary
    WHERE tenant_id = ${tenantId}
      AND model = ${model}
      AND window = ${window}
      AND date >= ${startDate}::date
      AND date <= ${endDate}::date
    GROUP BY platform
    ORDER BY revenue DESC
  `

  const platformComparison: PlatformComparison[] = platformData.rows.map((row) => {
    const r = row as { platform: string; revenue: number; spend: number; conversions: number }
    const revenue = Number(r.revenue) || 0
    const spend = Number(r.spend) || 0
    return {
      platform: r.platform as PlatformComparison['platform'],
      revenue,
      spend,
      conversions: Number(r.conversions) || 0,
      roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
    }
  })

  return { kpis, channelBreakdown, platformComparison }
}

// ============================================================
// Data Quality
// ============================================================

export async function getDataQualityMetrics(tenantId: string): Promise<DataQualityMetrics> {
  // Get latest snapshot
  const latestSnapshot = await sql`
    SELECT *
    FROM attribution_data_quality_snapshots
    WHERE tenant_id = ${tenantId}
    ORDER BY snapshot_date DESC
    LIMIT 1
  `

  // Get coverage trend (last 30 days)
  const trendData = await sql`
    SELECT
      snapshot_date as date,
      coverage_score as score
    FROM attribution_data_quality_snapshots
    WHERE tenant_id = ${tenantId}
    ORDER BY snapshot_date DESC
    LIMIT 30
  `

  const coverageTrend = trendData.rows.map((row) => ({
    date: (row as { date: string; score: number }).date,
    score: Number((row as { date: string; score: number }).score) || 0,
  }))

  if (latestSnapshot.rows.length === 0) {
    // Return default values if no data
    return {
      coverageScore: 0,
      coverageTrend: [],
      pixelHealth: {
        ga4: { status: 'error', lastEvent: null, eventCount24h: 0 },
        meta: { status: 'error', emqScore: 0, lastEvent: null },
        tiktok: { status: 'error', lastEvent: null, eventCount24h: 0 },
      },
      visitCoverage: {
        sessionId: 0,
        visitorId: 0,
        emailHash: 0,
        deviceFingerprint: 0,
      },
      serverSideEvents: {
        ga4: { enabled: false, successRate: 0 },
        metaCapi: { enabled: false, matchQuality: 0 },
        tiktokApi: { enabled: false, successRate: 0 },
      },
      webhookQueue: {
        pending: 0,
        failed: 0,
        processingRate: 0,
        avgLatencyMs: 0,
      },
      deviceGraph: {
        crossDeviceMatchRate: 0,
        identityResolutionRate: 0,
        visitorsLinked: 0,
      },
    }
  }

  const snapshot = latestSnapshot.rows[0] as DataQualitySnapshot

  return {
    coverageScore: snapshot.coverageScore,
    coverageTrend,
    pixelHealth: snapshot.pixelHealth,
    visitCoverage: {
      sessionId: snapshot.sessionIdCoverage,
      visitorId: snapshot.visitorIdCoverage,
      emailHash: snapshot.emailHashCoverage,
      deviceFingerprint: snapshot.deviceFingerprintCoverage,
    },
    serverSideEvents: snapshot.serverSideEvents,
    webhookQueue: {
      pending: snapshot.webhookPending,
      failed: snapshot.webhookFailed,
      processingRate: snapshot.webhookProcessingRate,
      avgLatencyMs: snapshot.webhookAvgLatencyMs,
    },
    deviceGraph: {
      crossDeviceMatchRate: snapshot.crossDeviceMatchRate,
      identityResolutionRate: snapshot.identityResolutionRate,
      visitorsLinked: snapshot.visitorsLinked,
    },
  }
}

export async function saveDataQualitySnapshot(
  tenantId: string,
  data: Omit<DataQualitySnapshot, 'id' | 'tenantId' | 'createdAt'>
): Promise<DataQualitySnapshot> {
  const result = await sql`
    INSERT INTO attribution_data_quality_snapshots (
      tenant_id,
      coverage_score,
      orders_with_attribution,
      total_orders,
      session_id_coverage,
      visitor_id_coverage,
      email_hash_coverage,
      device_fingerprint_coverage,
      pixel_health,
      server_side_events,
      webhook_pending,
      webhook_failed,
      webhook_processing_rate,
      webhook_avg_latency_ms,
      cross_device_match_rate,
      identity_resolution_rate,
      visitors_linked,
      snapshot_date
    ) VALUES (
      ${tenantId},
      ${data.coverageScore},
      ${data.ordersWithAttribution},
      ${data.totalOrders},
      ${data.sessionIdCoverage},
      ${data.visitorIdCoverage},
      ${data.emailHashCoverage},
      ${data.deviceFingerprintCoverage},
      ${JSON.stringify(data.pixelHealth)},
      ${JSON.stringify(data.serverSideEvents)},
      ${data.webhookPending},
      ${data.webhookFailed},
      ${data.webhookProcessingRate},
      ${data.webhookAvgLatencyMs},
      ${data.crossDeviceMatchRate},
      ${data.identityResolutionRate},
      ${data.visitorsLinked},
      ${data.snapshotDate}
    )
    ON CONFLICT (tenant_id, snapshot_date) DO UPDATE SET
      coverage_score = EXCLUDED.coverage_score,
      orders_with_attribution = EXCLUDED.orders_with_attribution,
      total_orders = EXCLUDED.total_orders,
      session_id_coverage = EXCLUDED.session_id_coverage,
      visitor_id_coverage = EXCLUDED.visitor_id_coverage,
      email_hash_coverage = EXCLUDED.email_hash_coverage,
      device_fingerprint_coverage = EXCLUDED.device_fingerprint_coverage,
      pixel_health = EXCLUDED.pixel_health,
      server_side_events = EXCLUDED.server_side_events,
      webhook_pending = EXCLUDED.webhook_pending,
      webhook_failed = EXCLUDED.webhook_failed,
      webhook_processing_rate = EXCLUDED.webhook_processing_rate,
      webhook_avg_latency_ms = EXCLUDED.webhook_avg_latency_ms,
      cross_device_match_rate = EXCLUDED.cross_device_match_rate,
      identity_resolution_rate = EXCLUDED.identity_resolution_rate,
      visitors_linked = EXCLUDED.visitors_linked
    RETURNING *
  `

  return result.rows[0] as DataQualitySnapshot
}

// ============================================================
// Fairing Sync
// ============================================================

export async function updateFairingSyncTime(tenantId: string): Promise<void> {
  await sql`
    UPDATE attribution_settings
    SET fairing_last_sync_at = NOW(), updated_at = NOW()
    WHERE tenant_id = ${tenantId}
  `
}
