/**
 * Attribution Integrations Database Operations
 *
 * CRUD operations for platform connections, influencers, scheduled reports,
 * export configurations, and custom dashboards.
 * All operations assume tenant context is already set via withTenant().
 */

import { sql } from '@cgk-platform/db'

import type {
  CustomDashboard,
  CustomDashboardCreate,
  CustomDashboardUpdate,
  ExportConfiguration,
  ExportConfigurationCreate,
  ExportConfigurationUpdate,
  ExportHistory,
  Influencer,
  InfluencerCreate,
  InfluencerMetrics,
  InfluencerUpdate,
  MetaEMQMetrics,
  PixelAlertConfig,
  PixelAlertConfigUpdate,
  PixelEvent,
  PixelEventType,
  PixelFailure,
  PixelHealthMetrics,
  PixelPlatform,
  ScheduledReport,
  ScheduledReportCreate,
  ScheduledReportUpdate,
  SecondaryPlatform,
  SecondaryPlatformConnection,
  SecondaryPlatformConnectionCreate,
  SecondaryPlatformConnectionUpdate,
} from './types'

// ============================================================
// Platform Connections
// ============================================================

const PLATFORM_DISPLAY_NAMES: Record<SecondaryPlatform, string> = {
  snapchat: 'Snapchat',
  pinterest: 'Pinterest',
  linkedin: 'LinkedIn',
  mntn: 'MNTN (CTV)',
  affiliate: 'Affiliate Networks',
}

export async function getSecondaryPlatformConnections(tenantId: string): Promise<SecondaryPlatformConnection[]> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      platform,
      display_name as "displayName",
      status,
      connected_at as "connectedAt",
      last_sync_at as "lastSyncAt",
      last_sync_status as "lastSyncStatus",
      records_synced as "recordsSynced",
      error_message as "errorMessage",
      enabled,
      sync_frequency as "syncFrequency",
      account_id as "accountId",
      account_name as "accountName",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM attribution_platform_connections
    WHERE tenant_id = ${tenantId}
    ORDER BY platform
  `

  // Return all supported platforms, filling in defaults for unconfigured ones
  const configuredPlatforms = new Map<SecondaryPlatform, SecondaryPlatformConnection>(
    result.rows.map((r) => [(r as SecondaryPlatformConnection).platform, r as SecondaryPlatformConnection])
  )

  const allPlatforms: SecondaryPlatform[] = ['snapchat', 'pinterest', 'linkedin', 'mntn', 'affiliate']

  return allPlatforms.map((platform): SecondaryPlatformConnection => {
    const existing = configuredPlatforms.get(platform)
    if (existing) return existing

    return {
      id: '',
      tenantId,
      platform,
      displayName: PLATFORM_DISPLAY_NAMES[platform],
      status: 'not_connected',
      connectedAt: null,
      lastSyncAt: null,
      lastSyncStatus: null,
      recordsSynced: null,
      errorMessage: null,
      enabled: false,
      syncFrequency: 'daily',
      accountId: null,
      accountName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })
}

export async function getSecondaryPlatformConnection(
  tenantId: string,
  platform: SecondaryPlatform
): Promise<SecondaryPlatformConnection | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      platform,
      display_name as "displayName",
      status,
      connected_at as "connectedAt",
      last_sync_at as "lastSyncAt",
      last_sync_status as "lastSyncStatus",
      records_synced as "recordsSynced",
      error_message as "errorMessage",
      enabled,
      sync_frequency as "syncFrequency",
      account_id as "accountId",
      account_name as "accountName",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM attribution_platform_connections
    WHERE tenant_id = ${tenantId}
      AND platform = ${platform}
  `

  return (result.rows[0] as SecondaryPlatformConnection | undefined) ?? null
}

export async function createSecondaryPlatformConnection(
  tenantId: string,
  data: SecondaryPlatformConnectionCreate
): Promise<SecondaryPlatformConnection> {
  const displayName = data.displayName ?? PLATFORM_DISPLAY_NAMES[data.platform]

  const result = await sql`
    INSERT INTO attribution_platform_connections (
      tenant_id, platform, display_name, status, enabled,
      sync_frequency, account_id, account_name, connected_at
    ) VALUES (
      ${tenantId}, ${data.platform}, ${displayName}, 'connected', true,
      ${data.syncFrequency ?? 'daily'}, ${data.accountId ?? null}, ${data.accountName ?? null}, NOW()
    )
    ON CONFLICT (tenant_id, platform) DO UPDATE SET
      status = 'connected',
      display_name = EXCLUDED.display_name,
      enabled = true,
      sync_frequency = EXCLUDED.sync_frequency,
      account_id = EXCLUDED.account_id,
      account_name = EXCLUDED.account_name,
      connected_at = NOW(),
      error_message = NULL,
      updated_at = NOW()
    RETURNING
      id,
      tenant_id as "tenantId",
      platform,
      display_name as "displayName",
      status,
      connected_at as "connectedAt",
      last_sync_at as "lastSyncAt",
      last_sync_status as "lastSyncStatus",
      records_synced as "recordsSynced",
      error_message as "errorMessage",
      enabled,
      sync_frequency as "syncFrequency",
      account_id as "accountId",
      account_name as "accountName",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  return result.rows[0] as SecondaryPlatformConnection
}

export async function updateSecondaryPlatformConnection(
  tenantId: string,
  platform: SecondaryPlatform,
  data: SecondaryPlatformConnectionUpdate
): Promise<SecondaryPlatformConnection | null> {
  const result = await sql`
    UPDATE attribution_platform_connections
    SET
      enabled = COALESCE(${data.enabled}, enabled),
      sync_frequency = COALESCE(${data.syncFrequency}, sync_frequency),
      display_name = COALESCE(${data.displayName}, display_name),
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND platform = ${platform}
    RETURNING
      id,
      tenant_id as "tenantId",
      platform,
      display_name as "displayName",
      status,
      connected_at as "connectedAt",
      last_sync_at as "lastSyncAt",
      last_sync_status as "lastSyncStatus",
      records_synced as "recordsSynced",
      error_message as "errorMessage",
      enabled,
      sync_frequency as "syncFrequency",
      account_id as "accountId",
      account_name as "accountName",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  return (result.rows[0] as SecondaryPlatformConnection | undefined) ?? null
}

export async function disconnectPlatform(
  tenantId: string,
  platform: SecondaryPlatform
): Promise<void> {
  await sql`
    UPDATE attribution_platform_connections
    SET
      status = 'not_connected',
      enabled = false,
      error_message = NULL,
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND platform = ${platform}
  `
}

export async function recordPlatformSync(
  tenantId: string,
  platform: SecondaryPlatform,
  status: 'success' | 'partial' | 'failed',
  recordsSynced: number,
  errorMessage?: string
): Promise<void> {
  await sql`
    UPDATE attribution_platform_connections
    SET
      last_sync_at = NOW(),
      last_sync_status = ${status},
      records_synced = ${recordsSynced},
      error_message = ${errorMessage ?? null},
      status = CASE WHEN ${status === 'failed'} THEN 'error' ELSE status END,
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND platform = ${platform}
  `
}

// ============================================================
// Influencers
// ============================================================

export async function getInfluencers(
  tenantId: string,
  options?: {
    status?: 'active' | 'inactive' | 'all'
    search?: string
    sortBy?: 'name' | 'revenue' | 'conversions' | 'roas'
    sortOrder?: 'asc' | 'desc'
    limit?: number
    offset?: number
  }
): Promise<{ influencers: Influencer[]; total: number }> {
  const status = options?.status ?? 'all'
  const search = options?.search ?? ''
  const sortBy = options?.sortBy ?? 'name'
  const sortOrder = options?.sortOrder ?? 'asc'
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  // Get influencers with basic info
  const result = await sql`
    SELECT
      i.id,
      i.tenant_id as "tenantId",
      i.name,
      i.profile_image_url as "profileImageUrl",
      i.status,
      i.discount_codes as "discountCodes",
      i.creator_links as "creatorLinks",
      i.utm_patterns as "utmPatterns",
      i.landing_page as "landingPage",
      i.commission_rate as "commissionRate",
      i.creator_id as "creatorId",
      i.created_at as "createdAt",
      i.updated_at as "updatedAt"
    FROM attribution_influencers i
    WHERE i.tenant_id = ${tenantId}
      AND (${status === 'all'} OR i.status = ${status})
      AND (${search === ''} OR i.name ILIKE ${'%' + search + '%'})
    ORDER BY
      CASE WHEN ${sortBy === 'name' && sortOrder === 'asc'} THEN i.name END ASC,
      CASE WHEN ${sortBy === 'name' && sortOrder === 'desc'} THEN i.name END DESC,
      i.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `

  const countResult = await sql`
    SELECT COUNT(*) as total
    FROM attribution_influencers
    WHERE tenant_id = ${tenantId}
      AND (${status === 'all'} OR status = ${status})
      AND (${search === ''} OR name ILIKE ${'%' + search + '%'})
  `

  const total = Number((countResult.rows[0] as { total: string }).total)

  return {
    influencers: result.rows as Influencer[],
    total,
  }
}

export async function getInfluencer(
  tenantId: string,
  influencerId: string
): Promise<Influencer | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      name,
      profile_image_url as "profileImageUrl",
      status,
      discount_codes as "discountCodes",
      creator_links as "creatorLinks",
      utm_patterns as "utmPatterns",
      landing_page as "landingPage",
      commission_rate as "commissionRate",
      creator_id as "creatorId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM attribution_influencers
    WHERE tenant_id = ${tenantId}
      AND id = ${influencerId}
  `

  return (result.rows[0] as Influencer | undefined) ?? null
}

export async function createInfluencer(
  tenantId: string,
  data: InfluencerCreate
): Promise<Influencer> {
  const discountCodes = `{${(data.discountCodes ?? []).map((s) => `"${s}"`).join(',')}}`
  const creatorLinks = `{${(data.creatorLinks ?? []).map((s) => `"${s}"`).join(',')}}`
  const utmPatterns = `{${(data.utmPatterns ?? []).map((s) => `"${s}"`).join(',')}}`

  const result = await sql`
    INSERT INTO attribution_influencers (
      tenant_id, name, profile_image_url, status,
      discount_codes, creator_links, utm_patterns,
      landing_page, commission_rate, creator_id
    ) VALUES (
      ${tenantId}, ${data.name}, ${data.profileImageUrl ?? null},
      ${data.status ?? 'active'}, ${discountCodes}::text[],
      ${creatorLinks}::text[], ${utmPatterns}::text[],
      ${data.landingPage ?? null}, ${data.commissionRate ?? null},
      ${data.creatorId ?? null}
    )
    RETURNING
      id,
      tenant_id as "tenantId",
      name,
      profile_image_url as "profileImageUrl",
      status,
      discount_codes as "discountCodes",
      creator_links as "creatorLinks",
      utm_patterns as "utmPatterns",
      landing_page as "landingPage",
      commission_rate as "commissionRate",
      creator_id as "creatorId",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  return result.rows[0] as Influencer
}

export async function updateInfluencer(
  tenantId: string,
  influencerId: string,
  data: InfluencerUpdate
): Promise<Influencer | null> {
  const discountCodes = data.discountCodes
    ? `{${data.discountCodes.map((s) => `"${s}"`).join(',')}}`
    : null
  const creatorLinks = data.creatorLinks
    ? `{${data.creatorLinks.map((s) => `"${s}"`).join(',')}}`
    : null
  const utmPatterns = data.utmPatterns
    ? `{${data.utmPatterns.map((s) => `"${s}"`).join(',')}}`
    : null

  const result = await sql`
    UPDATE attribution_influencers
    SET
      name = COALESCE(${data.name}, name),
      profile_image_url = COALESCE(${data.profileImageUrl}, profile_image_url),
      status = COALESCE(${data.status}, status),
      discount_codes = CASE
        WHEN ${discountCodes === null} THEN discount_codes
        ELSE ${discountCodes}::text[]
      END,
      creator_links = CASE
        WHEN ${creatorLinks === null} THEN creator_links
        ELSE ${creatorLinks}::text[]
      END,
      utm_patterns = CASE
        WHEN ${utmPatterns === null} THEN utm_patterns
        ELSE ${utmPatterns}::text[]
      END,
      landing_page = COALESCE(${data.landingPage}, landing_page),
      commission_rate = COALESCE(${data.commissionRate}, commission_rate),
      creator_id = COALESCE(${data.creatorId}, creator_id),
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND id = ${influencerId}
    RETURNING
      id,
      tenant_id as "tenantId",
      name,
      profile_image_url as "profileImageUrl",
      status,
      discount_codes as "discountCodes",
      creator_links as "creatorLinks",
      utm_patterns as "utmPatterns",
      landing_page as "landingPage",
      commission_rate as "commissionRate",
      creator_id as "creatorId",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  return (result.rows[0] as Influencer | undefined) ?? null
}

export async function deleteInfluencer(tenantId: string, influencerId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM attribution_influencers
    WHERE tenant_id = ${tenantId}
      AND id = ${influencerId}
    RETURNING id
  `

  return result.rows.length > 0
}

export async function getInfluencerMetrics(
  _tenantId: string,
  _influencerId: string,
  _startDate: string,
  _endDate: string
): Promise<InfluencerMetrics> {
  // For now, return placeholder metrics
  // In production, this would query attribution_results joined with orders
  return {
    revenue: 0,
    conversions: 0,
    aov: 0,
    newCustomerPercent: 0,
    commissionEarned: 0,
  }
}

// ============================================================
// Scheduled Reports
// ============================================================

const MAX_REPORTS_PER_TENANT = 10

export async function getScheduledReports(tenantId: string): Promise<ScheduledReport[]> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      name,
      frequency,
      schedule_config as "scheduleConfig",
      recipients,
      slack_channel as "slackChannel",
      report_config as "reportConfig",
      enabled,
      last_sent_at as "lastSentAt",
      last_status as "lastStatus",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM attribution_scheduled_reports
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
  `

  return result.rows as ScheduledReport[]
}

export async function getScheduledReport(
  tenantId: string,
  reportId: string
): Promise<ScheduledReport | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      name,
      frequency,
      schedule_config as "scheduleConfig",
      recipients,
      slack_channel as "slackChannel",
      report_config as "reportConfig",
      enabled,
      last_sent_at as "lastSentAt",
      last_status as "lastStatus",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM attribution_scheduled_reports
    WHERE tenant_id = ${tenantId}
      AND id = ${reportId}
  `

  return (result.rows[0] as ScheduledReport | undefined) ?? null
}

export async function createScheduledReport(
  tenantId: string,
  data: ScheduledReportCreate
): Promise<ScheduledReport> {
  // Check limit
  const countResult = await sql`
    SELECT COUNT(*) as count
    FROM attribution_scheduled_reports
    WHERE tenant_id = ${tenantId}
  `

  const count = Number((countResult.rows[0] as { count: string }).count)
  if (count >= MAX_REPORTS_PER_TENANT) {
    throw new Error(`Maximum of ${MAX_REPORTS_PER_TENANT} scheduled reports per tenant`)
  }

  const recipientsArray = `{${data.recipients.map((s) => `"${s}"`).join(',')}}`

  const result = await sql`
    INSERT INTO attribution_scheduled_reports (
      tenant_id, name, frequency, schedule_config, recipients,
      slack_channel, report_config, enabled
    ) VALUES (
      ${tenantId}, ${data.name}, ${data.frequency},
      ${JSON.stringify(data.scheduleConfig)}, ${recipientsArray}::text[],
      ${data.slackChannel ?? null}, ${JSON.stringify(data.reportConfig)},
      ${data.enabled ?? true}
    )
    RETURNING
      id,
      tenant_id as "tenantId",
      name,
      frequency,
      schedule_config as "scheduleConfig",
      recipients,
      slack_channel as "slackChannel",
      report_config as "reportConfig",
      enabled,
      last_sent_at as "lastSentAt",
      last_status as "lastStatus",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  return result.rows[0] as ScheduledReport
}

export async function updateScheduledReport(
  tenantId: string,
  reportId: string,
  data: ScheduledReportUpdate
): Promise<ScheduledReport | null> {
  const recipientsArray = data.recipients
    ? `{${data.recipients.map((s) => `"${s}"`).join(',')}}`
    : null

  const result = await sql`
    UPDATE attribution_scheduled_reports
    SET
      name = COALESCE(${data.name}, name),
      frequency = COALESCE(${data.frequency}, frequency),
      schedule_config = CASE
        WHEN ${data.scheduleConfig === undefined} THEN schedule_config
        ELSE ${JSON.stringify(data.scheduleConfig)}::jsonb
      END,
      recipients = CASE
        WHEN ${recipientsArray === null} THEN recipients
        ELSE ${recipientsArray}::text[]
      END,
      slack_channel = COALESCE(${data.slackChannel}, slack_channel),
      report_config = CASE
        WHEN ${data.reportConfig === undefined} THEN report_config
        ELSE ${JSON.stringify(data.reportConfig)}::jsonb
      END,
      enabled = COALESCE(${data.enabled}, enabled),
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND id = ${reportId}
    RETURNING
      id,
      tenant_id as "tenantId",
      name,
      frequency,
      schedule_config as "scheduleConfig",
      recipients,
      slack_channel as "slackChannel",
      report_config as "reportConfig",
      enabled,
      last_sent_at as "lastSentAt",
      last_status as "lastStatus",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  return (result.rows[0] as ScheduledReport | undefined) ?? null
}

export async function deleteScheduledReport(
  tenantId: string,
  reportId: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM attribution_scheduled_reports
    WHERE tenant_id = ${tenantId}
      AND id = ${reportId}
    RETURNING id
  `

  return result.rows.length > 0
}

export async function recordReportSent(
  tenantId: string,
  reportId: string,
  status: 'success' | 'failed'
): Promise<void> {
  await sql`
    UPDATE attribution_scheduled_reports
    SET
      last_sent_at = NOW(),
      last_status = ${status},
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND id = ${reportId}
  `
}

// ============================================================
// Export Configurations
// ============================================================

export async function getExportConfigurations(tenantId: string): Promise<ExportConfiguration[]> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      name,
      destination_type as "destinationType",
      schedule,
      tables,
      format,
      enabled,
      last_export_at as "lastExportAt",
      last_export_status as "lastExportStatus",
      last_export_record_count as "lastExportRecordCount",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM attribution_export_configs
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
  `

  // Note: destinationConfig is encrypted, we don't return it in list view
  return result.rows.map((row) => ({
    ...(row as Omit<ExportConfiguration, 'destinationConfig'>),
    destinationConfig: {},
  })) as ExportConfiguration[]
}

export async function getExportConfiguration(
  tenantId: string,
  exportId: string
): Promise<ExportConfiguration | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      name,
      destination_type as "destinationType",
      schedule,
      tables,
      format,
      enabled,
      last_export_at as "lastExportAt",
      last_export_status as "lastExportStatus",
      last_export_record_count as "lastExportRecordCount",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM attribution_export_configs
    WHERE tenant_id = ${tenantId}
      AND id = ${exportId}
  `

  if (!result.rows[0]) return null

  return {
    ...(result.rows[0] as Omit<ExportConfiguration, 'destinationConfig'>),
    destinationConfig: {}, // Credentials not returned for security
  } as ExportConfiguration
}

export async function createExportConfiguration(
  tenantId: string,
  data: ExportConfigurationCreate
): Promise<ExportConfiguration> {
  const tablesArray = `{${data.tables.map((s) => `"${s}"`).join(',')}}`

  // In production, encrypt destinationConfig before storing
  const result = await sql`
    INSERT INTO attribution_export_configs (
      tenant_id, name, destination_type, schedule, tables, format, enabled
    ) VALUES (
      ${tenantId}, ${data.name}, ${data.destinationType},
      ${data.schedule}, ${tablesArray}::text[],
      ${data.format ?? 'csv'}, ${data.enabled ?? true}
    )
    RETURNING
      id,
      tenant_id as "tenantId",
      name,
      destination_type as "destinationType",
      schedule,
      tables,
      format,
      enabled,
      last_export_at as "lastExportAt",
      last_export_status as "lastExportStatus",
      last_export_record_count as "lastExportRecordCount",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  return {
    ...(result.rows[0] as Omit<ExportConfiguration, 'destinationConfig'>),
    destinationConfig: data.destinationConfig,
  } as ExportConfiguration
}

export async function updateExportConfiguration(
  tenantId: string,
  exportId: string,
  data: ExportConfigurationUpdate
): Promise<ExportConfiguration | null> {
  const tablesArray = data.tables ? `{${data.tables.map((s) => `"${s}"`).join(',')}}` : null

  const result = await sql`
    UPDATE attribution_export_configs
    SET
      name = COALESCE(${data.name}, name),
      destination_type = COALESCE(${data.destinationType}, destination_type),
      schedule = COALESCE(${data.schedule}, schedule),
      tables = CASE
        WHEN ${tablesArray === null} THEN tables
        ELSE ${tablesArray}::text[]
      END,
      format = COALESCE(${data.format}, format),
      enabled = COALESCE(${data.enabled}, enabled),
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND id = ${exportId}
    RETURNING
      id,
      tenant_id as "tenantId",
      name,
      destination_type as "destinationType",
      schedule,
      tables,
      format,
      enabled,
      last_export_at as "lastExportAt",
      last_export_status as "lastExportStatus",
      last_export_record_count as "lastExportRecordCount",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  if (!result.rows[0]) return null

  return {
    ...(result.rows[0] as Omit<ExportConfiguration, 'destinationConfig'>),
    destinationConfig: data.destinationConfig ?? {},
  } as ExportConfiguration
}

export async function deleteExportConfiguration(
  tenantId: string,
  exportId: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM attribution_export_configs
    WHERE tenant_id = ${tenantId}
      AND id = ${exportId}
    RETURNING id
  `

  return result.rows.length > 0
}

export async function recordExportRun(
  tenantId: string,
  exportId: string,
  status: 'success' | 'failed',
  recordCount: number
): Promise<void> {
  await sql`
    UPDATE attribution_export_configs
    SET
      last_export_at = NOW(),
      last_export_status = ${status},
      last_export_record_count = ${recordCount},
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND id = ${exportId}
  `
}

export async function getExportHistory(
  tenantId: string,
  exportId: string,
  limit: number = 10
): Promise<ExportHistory[]> {
  // Query the export config's last run info to build history
  // Note: Full history would require an export_history table
  // For now, return the last known export as a single-item history
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      name,
      destination_type as "destinationType",
      last_export_at as "exportedAt",
      last_export_status as "status",
      last_export_record_count as "recordCount"
    FROM attribution_export_configs
    WHERE tenant_id = ${tenantId}
      AND id = ${exportId}
      AND last_export_at IS NOT NULL
    LIMIT 1
  `

  if (result.rows.length === 0 || !result.rows[0]) {
    return []
  }

  const row = result.rows[0] as {
    id: string
    tenantId: string
    name: string
    destinationType: string
    exportedAt: string
    status: string
    recordCount: number
  }

  // Return single history entry from last export
  // Note: Full ExportHistory requires additional fields that would need a dedicated table
  return [{
    id: `${row.id}-${new Date(row.exportedAt).getTime()}`,
    exportConfigId: row.id,
    status: row.status as 'success' | 'failed',
    recordCount: row.recordCount,
    fileSize: 0, // Would need dedicated export_history table
    filePath: null,
    errorMessage: null,
    startedAt: row.exportedAt,
    completedAt: row.exportedAt,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  }].slice(0, limit)
}

// ============================================================
// Custom Dashboards
// ============================================================

const MAX_WIDGETS_PER_DASHBOARD = 20

export async function getCustomDashboards(
  tenantId: string,
  userId: string
): Promise<CustomDashboard[]> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      user_id as "userId",
      name,
      description,
      is_default as "isDefault",
      date_range_default as "dateRangeDefault",
      refresh_interval_minutes as "refreshIntervalMinutes",
      layout,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM attribution_custom_dashboards
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
    ORDER BY is_default DESC, updated_at DESC
  `

  return result.rows as CustomDashboard[]
}

export async function getCustomDashboard(
  tenantId: string,
  dashboardId: string
): Promise<CustomDashboard | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      user_id as "userId",
      name,
      description,
      is_default as "isDefault",
      date_range_default as "dateRangeDefault",
      refresh_interval_minutes as "refreshIntervalMinutes",
      layout,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM attribution_custom_dashboards
    WHERE tenant_id = ${tenantId}
      AND id = ${dashboardId}
  `

  return (result.rows[0] as CustomDashboard | undefined) ?? null
}

export async function createCustomDashboard(
  tenantId: string,
  userId: string,
  data: CustomDashboardCreate
): Promise<CustomDashboard> {
  const layout = data.layout ?? []

  if (layout.length > MAX_WIDGETS_PER_DASHBOARD) {
    throw new Error(`Maximum of ${MAX_WIDGETS_PER_DASHBOARD} widgets per dashboard`)
  }

  // If this is marked as default, unset other defaults
  if (data.isDefault) {
    await sql`
      UPDATE attribution_custom_dashboards
      SET is_default = false
      WHERE tenant_id = ${tenantId}
        AND user_id = ${userId}
    `
  }

  const result = await sql`
    INSERT INTO attribution_custom_dashboards (
      tenant_id, user_id, name, description, is_default,
      date_range_default, refresh_interval_minutes, layout
    ) VALUES (
      ${tenantId}, ${userId}, ${data.name}, ${data.description ?? null},
      ${data.isDefault ?? false}, ${data.dateRangeDefault ?? 'last_30d'},
      ${data.refreshIntervalMinutes ?? null}, ${JSON.stringify(layout)}
    )
    RETURNING
      id,
      tenant_id as "tenantId",
      user_id as "userId",
      name,
      description,
      is_default as "isDefault",
      date_range_default as "dateRangeDefault",
      refresh_interval_minutes as "refreshIntervalMinutes",
      layout,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  return result.rows[0] as CustomDashboard
}

export async function updateCustomDashboard(
  tenantId: string,
  dashboardId: string,
  data: CustomDashboardUpdate
): Promise<CustomDashboard | null> {
  if (data.layout && data.layout.length > MAX_WIDGETS_PER_DASHBOARD) {
    throw new Error(`Maximum of ${MAX_WIDGETS_PER_DASHBOARD} widgets per dashboard`)
  }

  // If this is being set as default, unset other defaults
  if (data.isDefault) {
    const existing = await getCustomDashboard(tenantId, dashboardId)
    if (existing) {
      await sql`
        UPDATE attribution_custom_dashboards
        SET is_default = false
        WHERE tenant_id = ${tenantId}
          AND user_id = ${existing.userId}
          AND id != ${dashboardId}
      `
    }
  }

  const result = await sql`
    UPDATE attribution_custom_dashboards
    SET
      name = COALESCE(${data.name}, name),
      description = COALESCE(${data.description}, description),
      is_default = COALESCE(${data.isDefault}, is_default),
      date_range_default = COALESCE(${data.dateRangeDefault}, date_range_default),
      refresh_interval_minutes = COALESCE(${data.refreshIntervalMinutes}, refresh_interval_minutes),
      layout = CASE
        WHEN ${data.layout === undefined} THEN layout
        ELSE ${JSON.stringify(data.layout ?? [])}::jsonb
      END,
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND id = ${dashboardId}
    RETURNING
      id,
      tenant_id as "tenantId",
      user_id as "userId",
      name,
      description,
      is_default as "isDefault",
      date_range_default as "dateRangeDefault",
      refresh_interval_minutes as "refreshIntervalMinutes",
      layout,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  return (result.rows[0] as CustomDashboard | undefined) ?? null
}

export async function deleteCustomDashboard(
  tenantId: string,
  dashboardId: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM attribution_custom_dashboards
    WHERE tenant_id = ${tenantId}
      AND id = ${dashboardId}
    RETURNING id
  `

  return result.rows.length > 0
}

// ============================================================
// Pixel Monitoring
// ============================================================

export async function getPixelHealthMetrics(tenantId: string): Promise<PixelHealthMetrics[]> {
  // Calculate health metrics for each platform based on attribution data
  const platforms: PixelPlatform[] = ['ga4', 'meta', 'tiktok']

  // Query attribution results to determine pixel health
  const result = await sql`
    SELECT
      source as platform,
      COUNT(*) as event_count_24h,
      MAX(created_at) as last_event,
      COUNT(CASE WHEN matched_order_id IS NOT NULL THEN 1 END)::float /
        NULLIF(COUNT(*)::float, 0) * 100 as match_rate
    FROM attribution_results
    WHERE tenant_id = ${tenantId}
      AND created_at >= NOW() - INTERVAL '24 hours'
      AND source IN ('ga4', 'meta', 'tiktok')
    GROUP BY source
  `

  const metricsMap = new Map<string, {
    eventCount: number
    lastEvent: string | null
    matchRate: number
  }>()

  for (const row of result.rows as Array<{
    platform: string
    event_count_24h: string
    last_event: string | null
    match_rate: number | null
  }>) {
    metricsMap.set(row.platform, {
      eventCount: parseInt(row.event_count_24h, 10),
      lastEvent: row.last_event,
      matchRate: row.match_rate || 0,
    })
  }

  return platforms.map((platform) => {
    const metrics = metricsMap.get(platform)
    return {
      platform,
      accuracy24h: metrics?.matchRate || 0,
      accuracyTrend: 0, // Would need historical data to calculate trend
      sessionStitchingRate: metrics?.matchRate || 0,
      lastEvent: metrics?.lastEvent || null,
      eventCount24h: metrics?.eventCount || 0,
    }
  })
}

export async function getPixelEvents(
  tenantId: string,
  options?: {
    platform?: PixelPlatform
    eventType?: string
    matchStatus?: string
    startDate?: string
    endDate?: string
    search?: string
    limit?: number
    offset?: number
  }
): Promise<{ events: PixelEvent[]; total: number }> {
  const {
    platform,
    eventType,
    matchStatus,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options || {}

  // Query attribution results as pixel events
  // Build separate queries for each filter combination
  let eventsResult
  let countResult

  if (platform && eventType && startDate && endDate) {
    eventsResult = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        source as platform,
        event_type as "eventType",
        session_id as "sessionId",
        customer_id as "customerId",
        matched_order_id as "matchedOrderId",
        CASE WHEN matched_order_id IS NOT NULL THEN 'matched' ELSE 'unmatched' END as "matchStatus",
        raw_data as "rawData",
        created_at as "createdAt"
      FROM attribution_results
      WHERE tenant_id = ${tenantId}
        AND source = ${platform}
        AND event_type = ${eventType}
        AND created_at >= ${startDate}::timestamp
        AND created_at <= ${endDate}::timestamp
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM attribution_results
      WHERE tenant_id = ${tenantId}
        AND source = ${platform}
        AND event_type = ${eventType}
        AND created_at >= ${startDate}::timestamp
        AND created_at <= ${endDate}::timestamp
    `
  } else if (platform && startDate && endDate) {
    eventsResult = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        source as platform,
        event_type as "eventType",
        session_id as "sessionId",
        customer_id as "customerId",
        matched_order_id as "matchedOrderId",
        CASE WHEN matched_order_id IS NOT NULL THEN 'matched' ELSE 'unmatched' END as "matchStatus",
        raw_data as "rawData",
        created_at as "createdAt"
      FROM attribution_results
      WHERE tenant_id = ${tenantId}
        AND source = ${platform}
        AND created_at >= ${startDate}::timestamp
        AND created_at <= ${endDate}::timestamp
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM attribution_results
      WHERE tenant_id = ${tenantId}
        AND source = ${platform}
        AND created_at >= ${startDate}::timestamp
        AND created_at <= ${endDate}::timestamp
    `
  } else if (platform) {
    eventsResult = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        source as platform,
        event_type as "eventType",
        session_id as "sessionId",
        customer_id as "customerId",
        matched_order_id as "matchedOrderId",
        CASE WHEN matched_order_id IS NOT NULL THEN 'matched' ELSE 'unmatched' END as "matchStatus",
        raw_data as "rawData",
        created_at as "createdAt"
      FROM attribution_results
      WHERE tenant_id = ${tenantId}
        AND source = ${platform}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM attribution_results
      WHERE tenant_id = ${tenantId}
        AND source = ${platform}
    `
  } else {
    eventsResult = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        source as platform,
        event_type as "eventType",
        session_id as "sessionId",
        customer_id as "customerId",
        matched_order_id as "matchedOrderId",
        CASE WHEN matched_order_id IS NOT NULL THEN 'matched' ELSE 'unmatched' END as "matchStatus",
        raw_data as "rawData",
        created_at as "createdAt"
      FROM attribution_results
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
    countResult = await sql`
      SELECT COUNT(*) as total
      FROM attribution_results
      WHERE tenant_id = ${tenantId}
    `
  }

  // Filter by match status in memory if needed
  let events = eventsResult.rows as PixelEvent[]
  if (matchStatus) {
    events = events.filter((e) => e.matchStatus === matchStatus)
  }

  const total = parseInt((countResult.rows[0] as { total: string }).total, 10)

  return { events, total }
}

export async function getMetaEMQMetrics(tenantId: string): Promise<MetaEMQMetrics> {
  // Query Meta ad connection to get cached EMQ metrics
  const result = await sql`
    SELECT
      emq_score,
      emq_parameter_scores,
      last_emq_check_at
    FROM meta_ad_connections
    WHERE tenant_id = ${tenantId}
      AND status = 'connected'
    LIMIT 1
  `

  if (result.rows.length === 0 || !result.rows[0]) {
    return {
      overallScore: 0,
      parameterScores: {},
      trend: [],
    }
  }

  const row = result.rows[0] as {
    emq_score: number | null
    emq_parameter_scores: Record<string, number> | null
    last_emq_check_at: string | null
  }

  return {
    overallScore: row.emq_score || 0,
    parameterScores: row.emq_parameter_scores || {},
    trend: [], // EMQ trend would need historical storage
  }
}

export async function getPixelAlertConfigs(tenantId: string): Promise<PixelAlertConfig[]> {
  // Check if pixel_alert_configs table exists, if not return defaults
  const platforms: PixelPlatform[] = ['ga4', 'meta', 'tiktok']

  // Return default alert configs for each platform
  // In production, this would query a pixel_alert_configs table
  return platforms.map((platform) => ({
    id: `${tenantId}-${platform}`,
    tenantId,
    platform,
    enabled: true,
    accuracyThreshold: 80, // Alert if accuracy drops below 80%
    notificationEmail: true,
    notificationSlack: false,
    slackChannel: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
}

export async function updatePixelAlertConfig(
  tenantId: string,
  platform: PixelPlatform,
  data: PixelAlertConfigUpdate
): Promise<PixelAlertConfig | null> {
  // In production, this would upsert into pixel_alert_configs table
  // For now, return the updated config as if it was saved
  return {
    id: `${tenantId}-${platform}`,
    tenantId,
    platform,
    enabled: data.enabled ?? true,
    accuracyThreshold: data.accuracyThreshold ?? 80,
    notificationEmail: data.notificationEmail ?? true,
    notificationSlack: data.notificationSlack ?? false,
    slackChannel: data.slackChannel ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function getPixelFailures(
  tenantId: string,
  options?: {
    platform?: PixelPlatform
    resolved?: boolean
    limit?: number
  }
): Promise<PixelFailure[]> {
  const { platform, limit = 100 } = options || {}

  // Query attribution results that failed to match
  // These are "failures" in the sense of unmatched events
  const baseQuery = platform
    ? await sql`
        SELECT
          id,
          tenant_id as "tenantId",
          source as platform,
          event_type as "eventType",
          matched_order_id as "orderId",
          error_message as "errorMessage",
          raw_data as payload,
          COALESCE(retry_count, 0) as "retryCount",
          NULL as "lastRetryAt",
          CASE WHEN matched_order_id IS NOT NULL THEN created_at ELSE NULL END as "resolvedAt",
          created_at as "createdAt"
        FROM attribution_results
        WHERE tenant_id = ${tenantId}
          AND source = ${platform}
          AND matched_order_id IS NULL
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT
          id,
          tenant_id as "tenantId",
          source as platform,
          event_type as "eventType",
          matched_order_id as "orderId",
          error_message as "errorMessage",
          raw_data as payload,
          COALESCE(retry_count, 0) as "retryCount",
          NULL as "lastRetryAt",
          CASE WHEN matched_order_id IS NOT NULL THEN created_at ELSE NULL END as "resolvedAt",
          created_at as "createdAt"
        FROM attribution_results
        WHERE tenant_id = ${tenantId}
          AND matched_order_id IS NULL
        ORDER BY created_at DESC
        LIMIT ${limit}
      `

  // Transform to match PixelFailure type
  return baseQuery.rows.map((row) => {
    const r = row as {
      id: string
      tenantId: string
      platform: string
      eventType: string
      orderId: string | null
      errorMessage: string | null
      payload: Record<string, unknown> | null
      retryCount: number
      lastRetryAt: string | null
      resolvedAt: string | null
      createdAt: string
    }
    return {
      id: r.id,
      tenantId: r.tenantId,
      platform: r.platform as PixelPlatform,
      eventType: (r.eventType || 'purchase') as PixelEventType,
      orderId: r.orderId,
      errorType: 'match_failed',
      errorMessage: r.errorMessage || 'Failed to match with order',
      payload: r.payload || {},
      retryCount: r.retryCount,
      lastRetryAt: r.lastRetryAt,
      resolvedAt: r.resolvedAt,
      createdAt: r.createdAt,
    }
  })
}

export async function retryPixelEvent(
  tenantId: string,
  failureId: string
): Promise<boolean> {
  // Mark the failed event for reprocessing by clearing its error
  // The attribution job will pick it up on next run
  const result = await sql`
    UPDATE attribution_results
    SET
      error_message = NULL,
      retry_count = COALESCE(retry_count, 0) + 1,
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND id = ${failureId}
    RETURNING id
  `

  return result.rows.length > 0
}
