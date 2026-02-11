/**
 * Attribution Integrations Database Operations
 *
 * CRUD operations for platform connections, influencers, scheduled reports,
 * export configurations, and custom dashboards.
 * All operations assume tenant context is already set via withTenant().
 */

import { sql } from '@cgk/db'

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
  _tenantId: string,
  _exportId: string,
  _limit: number = 10
): Promise<ExportHistory[]> {
  // Placeholder - would need an export_history table
  return []
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

export async function getPixelHealthMetrics(_tenantId: string): Promise<PixelHealthMetrics[]> {
  // Calculate health metrics for each platform based on recent data
  const platforms: PixelPlatform[] = ['ga4', 'meta', 'tiktok']

  return platforms.map((platform) => ({
    platform,
    accuracy24h: 0,
    accuracyTrend: 0,
    sessionStitchingRate: 0,
    lastEvent: null,
    eventCount24h: 0,
  }))
}

export async function getPixelEvents(
  _tenantId: string,
  _options?: {
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
  // Placeholder - would need pixel_events table
  return { events: [], total: 0 }
}

export async function getMetaEMQMetrics(_tenantId: string): Promise<MetaEMQMetrics> {
  // Placeholder - would fetch from Meta's API or cached metrics
  return {
    overallScore: 0,
    parameterScores: {},
    trend: [],
  }
}

export async function getPixelAlertConfigs(_tenantId: string): Promise<PixelAlertConfig[]> {
  // Placeholder - would need pixel_alert_configs table
  return []
}

export async function updatePixelAlertConfig(
  _tenantId: string,
  _platform: PixelPlatform,
  _data: PixelAlertConfigUpdate
): Promise<PixelAlertConfig | null> {
  // Placeholder
  return null
}

export async function getPixelFailures(
  _tenantId: string,
  _options?: {
    platform?: PixelPlatform
    resolved?: boolean
    limit?: number
  }
): Promise<PixelFailure[]> {
  // Placeholder - would need pixel_failures table
  return []
}

export async function retryPixelEvent(
  _tenantId: string,
  _failureId: string
): Promise<boolean> {
  // Placeholder - would trigger retry job
  return true
}
