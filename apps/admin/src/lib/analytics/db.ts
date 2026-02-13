/**
 * Analytics Database Operations
 *
 * All operations use withTenant() for proper tenant isolation.
 * NEVER query analytics data without tenant context.
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  AnalyticsReport,
  AnalyticsSettings,
  AnalyticsSettingsUpdate,
  DateRange,
  PLBreakdown,
  ReportCreate,
  ReportRun,
  ReportUpdate,
  SlackAlert,
  SlackAlertCreate,
  SlackAlertUpdate,
  TargetCreate,
  TargetMetric,
} from './types'

// ============================================================
// Analytics Settings
// ============================================================

export async function getAnalyticsSettings(tenantSlug: string): Promise<AnalyticsSettings | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        shopify_connected,
        shopify_last_sync_at,
        ga4_connected,
        ga4_property_id,
        ga4_last_sync_at,
        meta_connected,
        meta_account_id,
        meta_last_sync_at,
        google_ads_connected,
        google_ads_account_id,
        google_ads_last_sync_at,
        tiktok_connected,
        tiktok_account_id,
        tiktok_last_sync_at,
        auto_refresh_enabled,
        refresh_frequency,
        default_date_range,
        default_currency,
        timezone,
        fiscal_year_start_month,
        default_export_format,
        export_include_headers,
        export_date_format,
        created_at,
        updated_at
      FROM analytics_settings
      LIMIT 1
    `

    const row = result.rows[0]
    if (!row) return null

    return {
      id: row.id as string,
      dataSources: {
        shopify: {
          connected: row.shopify_connected as boolean,
          lastSyncAt: row.shopify_last_sync_at as string | null,
        },
        googleAnalytics: {
          connected: row.ga4_connected as boolean,
          propertyId: row.ga4_property_id as string | undefined,
          lastSyncAt: row.ga4_last_sync_at as string | null,
        },
        meta: {
          connected: row.meta_connected as boolean,
          accountId: row.meta_account_id as string | undefined,
          lastSyncAt: row.meta_last_sync_at as string | null,
        },
        googleAds: {
          connected: row.google_ads_connected as boolean,
          accountId: row.google_ads_account_id as string | undefined,
          lastSyncAt: row.google_ads_last_sync_at as string | null,
        },
        tiktok: {
          connected: row.tiktok_connected as boolean,
          accountId: row.tiktok_account_id as string | undefined,
          lastSyncAt: row.tiktok_last_sync_at as string | null,
        },
        autoRefreshEnabled: row.auto_refresh_enabled as boolean,
        refreshFrequency: row.refresh_frequency as 'hourly' | 'daily' | 'manual',
      },
      attribution: {
        defaultWindow: '30d',
        defaultModel: 'last_touch',
        crossDeviceTracking: true,
      },
      display: {
        defaultDateRange: row.default_date_range as AnalyticsSettings['display']['defaultDateRange'],
        currency: row.default_currency as string,
        timezone: row.timezone as string,
        fiscalYearStartMonth: row.fiscal_year_start_month as number,
      },
      export: {
        defaultFormat: row.default_export_format as AnalyticsSettings['export']['defaultFormat'],
        includeHeaders: row.export_include_headers as boolean,
        dateFormat: row.export_date_format as string,
      },
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  })
}

export async function updateAnalyticsSettings(
  tenantSlug: string,
  updates: AnalyticsSettingsUpdate
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 1

    if (updates.dataSources) {
      const ds = updates.dataSources
      if (ds.autoRefreshEnabled !== undefined) {
        setClauses.push(`auto_refresh_enabled = $${paramIndex++}`)
        values.push(ds.autoRefreshEnabled)
      }
      if (ds.refreshFrequency !== undefined) {
        setClauses.push(`refresh_frequency = $${paramIndex++}`)
        values.push(ds.refreshFrequency)
      }
    }

    if (updates.display) {
      const d = updates.display
      if (d.defaultDateRange !== undefined) {
        setClauses.push(`default_date_range = $${paramIndex++}`)
        values.push(d.defaultDateRange)
      }
      if (d.currency !== undefined) {
        setClauses.push(`default_currency = $${paramIndex++}`)
        values.push(d.currency)
      }
      if (d.timezone !== undefined) {
        setClauses.push(`timezone = $${paramIndex++}`)
        values.push(d.timezone)
      }
      if (d.fiscalYearStartMonth !== undefined) {
        setClauses.push(`fiscal_year_start_month = $${paramIndex++}`)
        values.push(d.fiscalYearStartMonth)
      }
    }

    if (updates.export) {
      const e = updates.export
      if (e.defaultFormat !== undefined) {
        setClauses.push(`default_export_format = $${paramIndex++}`)
        values.push(e.defaultFormat)
      }
      if (e.includeHeaders !== undefined) {
        setClauses.push(`export_include_headers = $${paramIndex++}`)
        values.push(e.includeHeaders)
      }
      if (e.dateFormat !== undefined) {
        setClauses.push(`export_date_format = $${paramIndex++}`)
        values.push(e.dateFormat)
      }
    }

    if (values.length > 0) {
      const query = `
        UPDATE analytics_settings
        SET ${setClauses.join(', ')}
        WHERE id = (SELECT id FROM analytics_settings LIMIT 1)
      `
      await sql.query(query, values)
    }
  })
}

// ============================================================
// Analytics Targets
// ============================================================

export async function getAnalyticsTargets(tenantSlug: string): Promise<TargetMetric[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, metric, target_value, period, period_start, notes,
        created_at, updated_at
      FROM analytics_targets
      ORDER BY period_start DESC, metric ASC
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      metric: row.metric as TargetMetric['metric'],
      targetValue: Number(row.target_value),
      period: row.period as TargetMetric['period'],
      periodStart: row.period_start as string,
      notes: row.notes as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }))
  })
}

export async function createAnalyticsTarget(
  tenantSlug: string,
  data: TargetCreate
): Promise<TargetMetric> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO analytics_targets (metric, target_value, period, period_start, notes)
      VALUES (${data.metric}, ${data.targetValue}, ${data.period}, ${data.periodStart}, ${data.notes || null})
      RETURNING id, metric, target_value, period, period_start, notes, created_at, updated_at
    `

    const row = result.rows[0]!
    return {
      id: row.id as string,
      metric: row.metric as TargetMetric['metric'],
      targetValue: Number(row.target_value),
      period: row.period as TargetMetric['period'],
      periodStart: row.period_start as string,
      notes: row.notes as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  })
}

export async function updateAnalyticsTarget(
  tenantSlug: string,
  id: string,
  data: Partial<TargetCreate>
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE analytics_targets
      SET
        target_value = COALESCE(${data.targetValue ?? null}, target_value),
        notes = COALESCE(${data.notes ?? null}, notes),
        updated_at = NOW()
      WHERE id = ${id}
    `
  })
}

export async function deleteAnalyticsTarget(tenantSlug: string, id: string): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`DELETE FROM analytics_targets WHERE id = ${id}`
  })
}

// ============================================================
// Slack Alerts
// ============================================================

export async function getSlackAlerts(tenantSlug: string): Promise<SlackAlert[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, alert_type, channel_id, channel_name, config, is_enabled,
        last_triggered_at, created_at, updated_at
      FROM analytics_slack_alerts
      ORDER BY alert_type ASC
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      alertType: row.alert_type as SlackAlert['alertType'],
      channelId: row.channel_id as string,
      channelName: row.channel_name as string,
      config: row.config as SlackAlert['config'],
      isEnabled: row.is_enabled as boolean,
      lastTriggeredAt: row.last_triggered_at as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }))
  })
}

export async function createSlackAlert(
  tenantSlug: string,
  data: SlackAlertCreate
): Promise<SlackAlert> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO analytics_slack_alerts (alert_type, channel_id, channel_name, config, is_enabled)
      VALUES (${data.alertType}, ${data.channelId}, ${data.channelName}, ${JSON.stringify(data.config)}, ${data.isEnabled ?? true})
      RETURNING id, alert_type, channel_id, channel_name, config, is_enabled, last_triggered_at, created_at, updated_at
    `

    const row = result.rows[0]!
    return {
      id: row.id as string,
      alertType: row.alert_type as SlackAlert['alertType'],
      channelId: row.channel_id as string,
      channelName: row.channel_name as string,
      config: row.config as SlackAlert['config'],
      isEnabled: row.is_enabled as boolean,
      lastTriggeredAt: row.last_triggered_at as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  })
}

export async function updateSlackAlert(
  tenantSlug: string,
  id: string,
  data: SlackAlertUpdate
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    const updates: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 1

    if (data.channelId !== undefined) {
      updates.push(`channel_id = $${paramIndex++}`)
      values.push(data.channelId)
    }
    if (data.channelName !== undefined) {
      updates.push(`channel_name = $${paramIndex++}`)
      values.push(data.channelName)
    }
    if (data.config !== undefined) {
      updates.push(`config = $${paramIndex++}::jsonb`)
      values.push(JSON.stringify(data.config))
    }
    if (data.isEnabled !== undefined) {
      updates.push(`is_enabled = $${paramIndex++}`)
      values.push(data.isEnabled)
    }

    const query = `
      UPDATE analytics_slack_alerts
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `
    await sql.query(query, [...values, id])
  })
}

export async function deleteSlackAlert(tenantSlug: string, id: string): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`DELETE FROM analytics_slack_alerts WHERE id = ${id}`
  })
}

// ============================================================
// Reports
// ============================================================

export async function getAnalyticsReports(tenantSlug: string): Promise<AnalyticsReport[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, name, type, config, schedule, created_by,
        last_run_at, created_at, updated_at
      FROM analytics_reports
      ORDER BY updated_at DESC
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      type: row.type as AnalyticsReport['type'],
      config: row.config as AnalyticsReport['config'],
      schedule: row.schedule as AnalyticsReport['schedule'],
      createdBy: row.created_by as string | null,
      lastRunAt: row.last_run_at as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }))
  })
}

export async function getAnalyticsReportById(
  tenantSlug: string,
  id: string
): Promise<AnalyticsReport | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, name, type, config, schedule, created_by,
        last_run_at, created_at, updated_at
      FROM analytics_reports
      WHERE id = ${id}
    `

    const row = result.rows[0]
    if (!row) return null

    return {
      id: row.id as string,
      name: row.name as string,
      type: row.type as AnalyticsReport['type'],
      config: row.config as AnalyticsReport['config'],
      schedule: row.schedule as AnalyticsReport['schedule'],
      createdBy: row.created_by as string | null,
      lastRunAt: row.last_run_at as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  })
}

export async function createAnalyticsReport(
  tenantSlug: string,
  data: ReportCreate,
  userId: string
): Promise<AnalyticsReport> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO analytics_reports (name, type, config, schedule, created_by)
      VALUES (
        ${data.name},
        ${data.type},
        ${JSON.stringify(data.config)},
        ${data.schedule ? JSON.stringify(data.schedule) : null},
        ${userId}
      )
      RETURNING id, name, type, config, schedule, created_by, last_run_at, created_at, updated_at
    `

    const row = result.rows[0]!
    return {
      id: row.id as string,
      name: row.name as string,
      type: row.type as AnalyticsReport['type'],
      config: row.config as AnalyticsReport['config'],
      schedule: row.schedule as AnalyticsReport['schedule'],
      createdBy: row.created_by as string | null,
      lastRunAt: row.last_run_at as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  })
}

export async function updateAnalyticsReport(
  tenantSlug: string,
  id: string,
  data: ReportUpdate
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    const updates: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 1

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(data.name)
    }
    if (data.config !== undefined) {
      updates.push(`config = $${paramIndex++}::jsonb`)
      values.push(JSON.stringify(data.config))
    }
    if (data.schedule !== undefined) {
      updates.push(`schedule = $${paramIndex++}::jsonb`)
      values.push(data.schedule ? JSON.stringify(data.schedule) : null)
    }

    const query = `
      UPDATE analytics_reports
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `
    await sql.query(query, [...values, id])
  })
}

export async function deleteAnalyticsReport(tenantSlug: string, id: string): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`DELETE FROM analytics_reports WHERE id = ${id}`
  })
}

export async function getReportRunHistory(
  tenantSlug: string,
  reportId: string,
  limit = 10
): Promise<ReportRun[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, report_id, status, result_data, error_message,
        started_at, completed_at, created_at
      FROM analytics_report_runs
      WHERE report_id = ${reportId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      reportId: row.report_id as string,
      status: row.status as ReportRun['status'],
      resultData: row.result_data as unknown,
      errorMessage: row.error_message as string | null,
      startedAt: row.started_at as string | null,
      completedAt: row.completed_at as string | null,
      createdAt: row.created_at as string,
    }))
  })
}

export async function createReportRun(tenantSlug: string, reportId: string): Promise<ReportRun> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO analytics_report_runs (report_id, status, started_at)
      VALUES (${reportId}, 'running', NOW())
      RETURNING id, report_id, status, result_data, error_message, started_at, completed_at, created_at
    `

    // Update last_run_at on the report
    await sql`UPDATE analytics_reports SET last_run_at = NOW() WHERE id = ${reportId}`

    const row = result.rows[0]!
    return {
      id: row.id as string,
      reportId: row.report_id as string,
      status: row.status as ReportRun['status'],
      resultData: row.result_data as unknown,
      errorMessage: row.error_message as string | null,
      startedAt: row.started_at as string | null,
      completedAt: row.completed_at as string | null,
      createdAt: row.created_at as string,
    }
  })
}

export async function completeReportRun(
  tenantSlug: string,
  runId: string,
  result: { data?: unknown; error?: string }
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    if (result.error) {
      await sql`
        UPDATE analytics_report_runs
        SET status = 'failed', error_message = ${result.error}, completed_at = NOW()
        WHERE id = ${runId}
      `
    } else {
      await sql`
        UPDATE analytics_report_runs
        SET status = 'completed', result_data = ${JSON.stringify(result.data)}, completed_at = NOW()
        WHERE id = ${runId}
      `
    }
  })
}

// ============================================================
// P&L Data
// ============================================================

export async function getPLBreakdown(
  tenantSlug: string,
  periodType: 'daily' | 'monthly' | 'quarterly' | 'yearly',
  periodStart: string
): Promise<PLBreakdown | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT data, period_start, period_end, calculated_at
      FROM pl_data
      WHERE period_type = ${periodType} AND period_start = ${periodStart}
    `

    const row = result.rows[0]
    if (!row) return null

    return {
      period: `${row.period_start} to ${row.period_end}`,
      periodType,
      ...(row.data as Omit<PLBreakdown, 'period' | 'periodType'>),
    }
  })
}

export async function savePLBreakdown(
  tenantSlug: string,
  periodType: string,
  periodStart: string,
  periodEnd: string,
  data: Omit<PLBreakdown, 'period' | 'periodType'>
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO pl_data (period_type, period_start, period_end, data)
      VALUES (${periodType}, ${periodStart}, ${periodEnd}, ${JSON.stringify(data)})
      ON CONFLICT (period_type, period_start)
      DO UPDATE SET data = ${JSON.stringify(data)}, calculated_at = NOW()
    `
  })
}

// ============================================================
// Daily Metrics Cache
// ============================================================

export async function getDailyMetrics(
  tenantSlug: string,
  dateRange: DateRange
): Promise<
  Array<{
    date: string
    grossSales: number
    netRevenue: number
    orders: number
    newCustomers: number
    adSpend: number
    roas: number
    conversionRate: number
  }>
> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        date,
        gross_sales_cents,
        net_revenue_cents,
        total_orders,
        new_customers,
        total_ad_spend_cents,
        roas,
        conversion_rate
      FROM analytics_daily_metrics
      WHERE date >= ${dateRange.startDate} AND date <= ${dateRange.endDate}
      ORDER BY date ASC
    `

    return result.rows.map((row) => ({
      date: row.date as string,
      grossSales: Number(row.gross_sales_cents) / 100,
      netRevenue: Number(row.net_revenue_cents) / 100,
      orders: row.total_orders as number,
      newCustomers: row.new_customers as number,
      adSpend: Number(row.total_ad_spend_cents) / 100,
      roas: Number(row.roas),
      conversionRate: Number(row.conversion_rate),
    }))
  })
}

export async function getGeoMetrics(
  tenantSlug: string,
  dateRange: DateRange
): Promise<
  Array<{
    country: string
    region: string | null
    city: string | null
    revenue: number
    orders: number
    customers: number
    aov: number
  }>
> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        country,
        region,
        city,
        SUM(revenue_cents) as revenue_cents,
        SUM(orders) as orders,
        SUM(new_customers + returning_customers) as customers,
        AVG(avg_order_value_cents) as avg_order_value_cents
      FROM analytics_geo_metrics
      WHERE date >= ${dateRange.startDate} AND date <= ${dateRange.endDate}
      GROUP BY country, region, city
      ORDER BY SUM(revenue_cents) DESC
    `

    return result.rows.map((row) => ({
      country: row.country as string,
      region: row.region as string | null,
      city: row.city as string | null,
      revenue: Number(row.revenue_cents) / 100,
      orders: Number(row.orders),
      customers: Number(row.customers),
      aov: Number(row.avg_order_value_cents) / 100,
    }))
  })
}

// ============================================================
// BRI Metrics
// ============================================================

export async function getBRIMetrics(
  tenantSlug: string,
  dateRange: DateRange
): Promise<
  Array<{
    date: string
    channel: string
    conversations: number
    automatedResolutions: number
    humanHandoffs: number
    avgResponseTime: number
    resolutionRate: number
    csat: number
  }>
> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        date, channel,
        total_conversations,
        automated_resolutions,
        human_handoffs,
        avg_response_time_seconds,
        resolution_rate,
        csat_score
      FROM analytics_bri_metrics
      WHERE date >= ${dateRange.startDate} AND date <= ${dateRange.endDate}
      ORDER BY date DESC
    `

    return result.rows.map((row) => ({
      date: row.date as string,
      channel: row.channel as string,
      conversations: row.total_conversations as number,
      automatedResolutions: row.automated_resolutions as number,
      humanHandoffs: row.human_handoffs as number,
      avgResponseTime: row.avg_response_time_seconds as number,
      resolutionRate: Number(row.resolution_rate),
      csat: Number(row.csat_score),
    }))
  })
}

// ============================================================
// Pipeline Metrics
// ============================================================

export async function getPipelineMetrics(
  tenantSlug: string,
  dateRange: DateRange,
  source?: string
): Promise<
  Array<{
    date: string
    source: string | null
    visitors: number
    productViews: number
    addToCart: number
    checkoutInitiated: number
    purchases: number
    conversionRate: number
  }>
> {
  return withTenant(tenantSlug, async () => {
    let result
    if (source) {
      result = await sql`
        SELECT
          date, source,
          website_visitors,
          product_page_views,
          add_to_cart,
          checkout_initiated,
          purchases,
          conversion_rate
        FROM analytics_pipeline_metrics
        WHERE date >= ${dateRange.startDate} AND date <= ${dateRange.endDate}
          AND source = ${source}
        ORDER BY date DESC
      `
    } else {
      result = await sql`
        SELECT
          date, source,
          website_visitors,
          product_page_views,
          add_to_cart,
          checkout_initiated,
          purchases,
          conversion_rate
        FROM analytics_pipeline_metrics
        WHERE date >= ${dateRange.startDate} AND date <= ${dateRange.endDate}
        ORDER BY date DESC
      `
    }

    return result.rows.map((row) => ({
      date: row.date as string,
      source: row.source as string | null,
      visitors: row.website_visitors as number,
      productViews: row.product_page_views as number,
      addToCart: row.add_to_cart as number,
      checkoutInitiated: row.checkout_initiated as number,
      purchases: row.purchases as number,
      conversionRate: Number(row.conversion_rate),
    }))
  })
}

// ============================================================
// Burn Rate
// ============================================================

export async function getBurnRateData(
  tenantSlug: string,
  periodType: 'daily' | 'weekly' | 'monthly',
  limit = 12
): Promise<
  Array<{
    periodStart: string
    periodEnd: string
    openingBalance: number
    closingBalance: number
    revenue: number
    totalInflow: number
    totalOutflow: number
    netCashFlow: number
    burnRate: number
    runwayMonths: number
  }>
> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        period_start, period_end,
        opening_balance_cents, closing_balance_cents,
        revenue_cents, total_inflow_cents, total_outflow_cents,
        net_cash_flow_cents, burn_rate_cents, runway_months
      FROM analytics_burn_rate
      WHERE period_type = ${periodType}
      ORDER BY period_start DESC
      LIMIT ${limit}
    `

    return result.rows.map((row) => ({
      periodStart: row.period_start as string,
      periodEnd: row.period_end as string,
      openingBalance: Number(row.opening_balance_cents) / 100,
      closingBalance: Number(row.closing_balance_cents) / 100,
      revenue: Number(row.revenue_cents) / 100,
      totalInflow: Number(row.total_inflow_cents) / 100,
      totalOutflow: Number(row.total_outflow_cents) / 100,
      netCashFlow: Number(row.net_cash_flow_cents) / 100,
      burnRate: Number(row.burn_rate_cents) / 100,
      runwayMonths: Number(row.runway_months),
    }))
  })
}
