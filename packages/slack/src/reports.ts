/**
 * @cgk/slack - Scheduled reports
 *
 * @ai-pattern reports
 * @ai-note Handles scheduled performance reports to Slack channels
 */

import { withTenant, sql } from '@cgk/db'
import { SlackClient } from './client'
import { getTenantWorkspace } from './notifications'
import type {
  SlackReport,
  ReportFrequency,
  DateRangeType,
  ReportMetricConfig,
  SlackBlock,
} from './types'

// ============================================================================
// Report CRUD Operations
// ============================================================================

/**
 * Get all reports for a tenant
 */
export async function getReports(tenantId: string): Promise<SlackReport[]> {
  const result = await withTenant(tenantId, async () => {
    return sql<SlackReport>`
      SELECT
        id,
        tenant_id as "tenantId",
        name,
        channel_id as "channelId",
        channel_name as "channelName",
        frequency,
        send_hour as "sendHour",
        timezone,
        metrics,
        date_range_type as "dateRangeType",
        date_range_days as "dateRangeDays",
        custom_header as "customHeader",
        is_enabled as "isEnabled",
        last_run_at as "lastRunAt",
        last_run_status as "lastRunStatus",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tenant_slack_reports
      ORDER BY created_at DESC
    `
  })

  return result.rows
}

/**
 * Get a single report by ID
 */
export async function getReport(
  tenantId: string,
  reportId: string,
): Promise<SlackReport | null> {
  const result = await withTenant(tenantId, async () => {
    return sql<SlackReport>`
      SELECT
        id,
        tenant_id as "tenantId",
        name,
        channel_id as "channelId",
        channel_name as "channelName",
        frequency,
        send_hour as "sendHour",
        timezone,
        metrics,
        date_range_type as "dateRangeType",
        date_range_days as "dateRangeDays",
        custom_header as "customHeader",
        is_enabled as "isEnabled",
        last_run_at as "lastRunAt",
        last_run_status as "lastRunStatus",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tenant_slack_reports
      WHERE id = ${reportId}
      LIMIT 1
    `
  })

  const row = result.rows[0]
  return row ?? null
}

/**
 * Create a new report
 */
export async function createReport(
  tenantId: string,
  data: {
    name: string
    channelId: string
    channelName?: string
    frequency: ReportFrequency
    sendHour: number
    timezone: string
    metrics: ReportMetricConfig[]
    dateRangeType?: DateRangeType
    dateRangeDays?: number
    customHeader?: string
    isEnabled?: boolean
  },
): Promise<SlackReport> {
  const result = await withTenant(tenantId, async () => {
    return sql<SlackReport>`
      INSERT INTO tenant_slack_reports (
        tenant_id,
        name,
        channel_id,
        channel_name,
        frequency,
        send_hour,
        timezone,
        metrics,
        date_range_type,
        date_range_days,
        custom_header,
        is_enabled
      ) VALUES (
        ${tenantId},
        ${data.name},
        ${data.channelId},
        ${data.channelName ?? null},
        ${data.frequency},
        ${data.sendHour},
        ${data.timezone},
        ${JSON.stringify(data.metrics)},
        ${data.dateRangeType ?? 'yesterday'},
        ${data.dateRangeDays ?? null},
        ${data.customHeader ?? null},
        ${data.isEnabled ?? true}
      )
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        channel_id as "channelId",
        channel_name as "channelName",
        frequency,
        send_hour as "sendHour",
        timezone,
        metrics,
        date_range_type as "dateRangeType",
        date_range_days as "dateRangeDays",
        custom_header as "customHeader",
        is_enabled as "isEnabled",
        last_run_at as "lastRunAt",
        last_run_status as "lastRunStatus",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
  })

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create report')
  }
  return row
}

/**
 * Update a report
 */
export async function updateReport(
  tenantId: string,
  reportId: string,
  data: Partial<{
    name: string
    channelId: string
    channelName: string
    frequency: ReportFrequency
    sendHour: number
    timezone: string
    metrics: ReportMetricConfig[]
    dateRangeType: DateRangeType
    dateRangeDays: number
    customHeader: string
    isEnabled: boolean
  }>,
): Promise<SlackReport | null> {
  if (Object.keys(data).length === 0) {
    return getReport(tenantId, reportId)
  }

  // Use COALESCE pattern since we cannot use dynamic SQL with tagged templates
  const result = await withTenant(tenantId, async () => {
    return sql<SlackReport>`
      UPDATE tenant_slack_reports
      SET
        name = COALESCE(${data.name ?? null}, name),
        channel_id = COALESCE(${data.channelId ?? null}, channel_id),
        channel_name = COALESCE(${data.channelName ?? null}, channel_name),
        frequency = COALESCE(${data.frequency ?? null}, frequency),
        send_hour = COALESCE(${data.sendHour ?? null}, send_hour),
        timezone = COALESCE(${data.timezone ?? null}, timezone),
        metrics = COALESCE(${data.metrics ? JSON.stringify(data.metrics) : null}, metrics),
        date_range_type = COALESCE(${data.dateRangeType ?? null}, date_range_type),
        date_range_days = COALESCE(${data.dateRangeDays ?? null}, date_range_days),
        custom_header = COALESCE(${data.customHeader ?? null}, custom_header),
        is_enabled = COALESCE(${data.isEnabled ?? null}, is_enabled),
        updated_at = NOW()
      WHERE id = ${reportId}
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        channel_id as "channelId",
        channel_name as "channelName",
        frequency,
        send_hour as "sendHour",
        timezone,
        metrics,
        date_range_type as "dateRangeType",
        date_range_days as "dateRangeDays",
        custom_header as "customHeader",
        is_enabled as "isEnabled",
        last_run_at as "lastRunAt",
        last_run_status as "lastRunStatus",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
  })

  const row = result.rows[0]
  return row ?? null
}

/**
 * Delete a report
 */
export async function deleteReport(
  tenantId: string,
  reportId: string,
): Promise<boolean> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      DELETE FROM tenant_slack_reports
      WHERE id = ${reportId}
    `
  })

  return (result.rowCount ?? 0) > 0
}

// ============================================================================
// Report Execution
// ============================================================================

interface ReportData {
  period: string
  metrics: Array<{
    name: string
    value: string
    change?: string
    changeDirection?: 'up' | 'down' | 'neutral'
  }>
}

/**
 * Build report blocks from data
 */
function buildReportBlocks(
  report: SlackReport,
  data: ReportData,
): SlackBlock[] {
  const blocks: SlackBlock[] = []

  // Header
  blocks.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: report.customHeader || `${report.name} - ${data.period}`,
      emoji: true,
    },
  })

  // Metrics in two-column layout
  const enabledMetrics = report.metrics.filter(m => m.enabled).sort((a, b) => a.order - b.order)

  for (let i = 0; i < enabledMetrics.length; i += 2) {
    const currentMetric = enabledMetrics[i]
    const nextMetric = enabledMetrics[i + 1]
    const metric1 = currentMetric ? data.metrics.find(m => m.name === currentMetric.id) : null
    const metric2 = nextMetric
      ? data.metrics.find(m => m.name === nextMetric.id)
      : null

    const fields: Array<{ type: string; text: string }> = []

    if (metric1) {
      const changeIcon = metric1.changeDirection === 'up' ? ':arrow_up:' :
        metric1.changeDirection === 'down' ? ':arrow_down:' : ''
      const changeText = metric1.change ? ` (${changeIcon}${metric1.change})` : ''
      fields.push({
        type: 'mrkdwn',
        text: `*${metric1.name}:*\n${metric1.value}${changeText}`,
      })
    }

    if (metric2) {
      const changeIcon = metric2.changeDirection === 'up' ? ':arrow_up:' :
        metric2.changeDirection === 'down' ? ':arrow_down:' : ''
      const changeText = metric2.change ? ` (${changeIcon}${metric2.change})` : ''
      fields.push({
        type: 'mrkdwn',
        text: `*${metric2.name}:*\n${metric2.value}${changeText}`,
      })
    }

    if (fields.length > 0) {
      blocks.push({
        type: 'section',
        fields,
      })
    }
  }

  // Divider
  blocks.push({ type: 'divider' })

  // Footer
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Sent by CGK Analytics | ${new Date().toISOString()}`,
      },
    ],
  })

  return blocks
}

/**
 * Fetch report data (placeholder - would integrate with analytics package)
 */
async function fetchReportData(
  _tenantId: string,
  report: SlackReport,
): Promise<ReportData> {
  // This would integrate with @cgk/analytics to fetch actual metrics
  // For now, return placeholder data

  const periodMap: Record<DateRangeType, string> = {
    yesterday: 'Yesterday',
    last_n_days: `Last ${report.dateRangeDays || 7} Days`,
    last_week: 'Last Week',
    last_month: 'Last Month',
  }

  return {
    period: periodMap[report.dateRangeType],
    metrics: report.metrics
      .filter(m => m.enabled)
      .map(m => ({
        name: m.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: '$0.00', // Placeholder
        change: '0%',
        changeDirection: 'neutral' as const,
      })),
  }
}

/**
 * Send a report
 */
export async function sendReport(
  tenantId: string,
  reportId: string,
): Promise<{ success: boolean; messageTs?: string; error?: string }> {
  const report = await getReport(tenantId, reportId)
  if (!report) {
    return { success: false, error: 'Report not found' }
  }

  const workspace = await getTenantWorkspace(tenantId)
  if (!workspace) {
    return { success: false, error: 'Slack workspace not connected' }
  }

  // Fetch report data
  const data = await fetchReportData(tenantId, report)

  // Build blocks
  const blocks = buildReportBlocks(report, data)
  const fallbackText = `${report.name} - ${data.period}`

  // Send to Slack
  const client = SlackClient.fromEncryptedTokens(
    workspace.botTokenEncrypted,
    workspace.userTokenEncrypted,
  )

  try {
    const result = await client.postMessage(
      report.channelId,
      blocks,
      fallbackText,
    )

    // Update last run info
    await withTenant(tenantId, async () => {
      await sql`
        UPDATE tenant_slack_reports
        SET
          last_run_at = NOW(),
          last_run_status = ${result.ok ? 'success' : 'failed'},
          updated_at = NOW()
        WHERE id = ${reportId}
      `
    })

    return {
      success: result.ok,
      messageTs: result.ts,
      error: result.error,
    }
  } catch (error) {
    // Update last run info with failure
    await withTenant(tenantId, async () => {
      await sql`
        UPDATE tenant_slack_reports
        SET
          last_run_at = NOW(),
          last_run_status = 'failed',
          updated_at = NOW()
        WHERE id = ${reportId}
      `
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// Report Scheduling
// ============================================================================

/**
 * Get reports that are due to run at the specified hour
 */
export async function getDueReports(hour: number): Promise<Array<{
  tenantId: string
  reportId: string
  timezone: string
}>> {
  // Query across all tenants (platform-level operation)
  const result = await sql<{
    tenantId: string
    reportId: string
    timezone: string
  }>`
    SELECT DISTINCT
      r.tenant_id as "tenantId",
      r.id as "reportId",
      r.timezone
    FROM public.organizations o
    CROSS JOIN LATERAL (
      SELECT id, tenant_id, send_hour, timezone, frequency, is_enabled
      FROM tenant_slack_reports
      WHERE tenant_id = o.id
    ) r
    WHERE r.is_enabled = true
      AND r.send_hour = ${hour}
  `

  return result.rows
}

/**
 * Check if a report should run based on frequency
 */
export function shouldRunReport(
  report: SlackReport,
  currentDate: Date,
): boolean {
  if (!report.isEnabled) return false

  // Check frequency
  switch (report.frequency) {
    case 'daily':
      return true

    case 'weekly':
      // Run on Monday
      return currentDate.getDay() === 1

    case 'monthly':
      // Run on 1st of month
      return currentDate.getDate() === 1

    default:
      return false
  }
}

/**
 * Get date range for a report
 */
export function getReportDateRange(
  report: SlackReport,
  currentDate: Date,
): { start: Date; end: Date } {
  const end = new Date(currentDate)
  end.setHours(0, 0, 0, 0)

  const start = new Date(end)

  switch (report.dateRangeType) {
    case 'yesterday':
      start.setDate(start.getDate() - 1)
      break

    case 'last_n_days':
      start.setDate(start.getDate() - (report.dateRangeDays || 7))
      break

    case 'last_week':
      start.setDate(start.getDate() - 7)
      break

    case 'last_month':
      start.setMonth(start.getMonth() - 1)
      break
  }

  return { start, end }
}
