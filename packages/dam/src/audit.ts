/**
 * Audit Logging
 * Tracks all changes to DAM entities for compliance and debugging
 */
import { sql } from '@cgk-platform/db'

import type {
  AuditLog,
  AuditAction,
  AuditEntityType,
  UsageLog,
  UsageAction,
} from './types.js'

export interface CreateAuditLogInput {
  tenantId: string
  userId: string
  userName?: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  beforeData?: Record<string, unknown>
  afterData?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export interface CreateUsageLogInput {
  tenantId: string
  assetId: string
  userId?: string
  action: UsageAction
  metadata?: Record<string, unknown>
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  const result = await sql<AuditLog>`
    INSERT INTO dam_audit_logs (
      tenant_id, user_id, user_name, action, entity_type, entity_id,
      before_data, after_data, ip_address, user_agent
    ) VALUES (
      ${input.tenantId}, ${input.userId}, ${input.userName || null},
      ${input.action}, ${input.entityType}, ${input.entityId},
      ${input.beforeData ? JSON.stringify(input.beforeData) : null}::jsonb,
      ${input.afterData ? JSON.stringify(input.afterData) : null}::jsonb,
      ${input.ipAddress || null}, ${input.userAgent || null}
    )
    RETURNING id, tenant_id, user_id, user_name, action, entity_type, entity_id,
              before_data, after_data, ip_address, user_agent, created_at
  `
  return result.rows[0]!
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogsForEntity(
  tenantId: string,
  entityType: AuditEntityType,
  entityId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ logs: AuditLog[]; totalCount: number }> {
  const dataResult = await sql<AuditLog>`
    SELECT id, tenant_id, user_id, user_name, action, entity_type, entity_id,
           before_data, after_data, ip_address, user_agent, created_at
    FROM dam_audit_logs
    WHERE tenant_id = ${tenantId}
      AND entity_type = ${entityType}
      AND entity_id = ${entityId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countResult = await sql<{ count: string }>`
    SELECT COUNT(*) as count
    FROM dam_audit_logs
    WHERE tenant_id = ${tenantId}
      AND entity_type = ${entityType}
      AND entity_id = ${entityId}
  `

  return {
    logs: dataResult.rows,
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

/**
 * Get audit logs for a tenant
 */
export async function getAuditLogs(
  tenantId: string,
  options: {
    entityType?: AuditEntityType
    action?: AuditAction
    userId?: string
    fromDate?: string
    toDate?: string
    limit?: number
    offset?: number
  } = {}
): Promise<{ logs: AuditLog[]; totalCount: number }> {
  const conditions: string[] = ['tenant_id = $1']
  const values: unknown[] = [tenantId]
  let paramIndex = 1

  if (options.entityType) {
    paramIndex++
    conditions.push(`entity_type = $${paramIndex}`)
    values.push(options.entityType)
  }

  if (options.action) {
    paramIndex++
    conditions.push(`action = $${paramIndex}`)
    values.push(options.action)
  }

  if (options.userId) {
    paramIndex++
    conditions.push(`user_id = $${paramIndex}`)
    values.push(options.userId)
  }

  if (options.fromDate) {
    paramIndex++
    conditions.push(`created_at >= $${paramIndex}::timestamptz`)
    values.push(options.fromDate)
  }

  if (options.toDate) {
    paramIndex++
    conditions.push(`created_at <= $${paramIndex}::timestamptz`)
    values.push(options.toDate)
  }

  const whereClause = conditions.join(' AND ')
  const limit = options.limit || 50
  const offset = options.offset || 0

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(limit, offset)

  const dataResult = await sql.query(
    `SELECT id, tenant_id, user_id, user_name, action, entity_type, entity_id,
            before_data, after_data, ip_address, user_agent, created_at
     FROM dam_audit_logs
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM dam_audit_logs WHERE ${whereClause}`,
    countValues
  )

  return {
    logs: dataResult.rows as AuditLog[],
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

/**
 * Create a usage log entry
 */
export async function createUsageLog(input: CreateUsageLogInput): Promise<UsageLog> {
  const result = await sql<UsageLog>`
    INSERT INTO dam_usage_logs (tenant_id, asset_id, user_id, action, metadata)
    VALUES (
      ${input.tenantId}, ${input.assetId}, ${input.userId || null},
      ${input.action}, ${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb
    )
    RETURNING id, tenant_id, asset_id, user_id, action, metadata, created_at
  `
  return result.rows[0]!
}

/**
 * Get usage logs for an asset
 */
export async function getUsageLogsForAsset(
  tenantId: string,
  assetId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ logs: UsageLog[]; totalCount: number }> {
  const dataResult = await sql<UsageLog>`
    SELECT id, tenant_id, asset_id, user_id, action, metadata, created_at
    FROM dam_usage_logs
    WHERE tenant_id = ${tenantId} AND asset_id = ${assetId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countResult = await sql<{ count: string }>`
    SELECT COUNT(*) as count
    FROM dam_usage_logs
    WHERE tenant_id = ${tenantId} AND asset_id = ${assetId}
  `

  return {
    logs: dataResult.rows,
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

/**
 * Get usage statistics for an asset
 */
export async function getAssetUsageStats(
  tenantId: string,
  assetId: string
): Promise<{
  views: number
  downloads: number
  exports: number
  shares: number
  total: number
}> {
  const result = await sql<{
    views: string
    downloads: string
    exports: string
    shares: string
    total: string
  }>`
    SELECT
      COUNT(*) FILTER (WHERE action = 'view') as views,
      COUNT(*) FILTER (WHERE action = 'download') as downloads,
      COUNT(*) FILTER (WHERE action = 'export') as exports,
      COUNT(*) FILTER (WHERE action = 'share') as shares,
      COUNT(*) as total
    FROM dam_usage_logs
    WHERE tenant_id = ${tenantId} AND asset_id = ${assetId}
  `

  const row = result.rows[0]!
  return {
    views: Number(row.views),
    downloads: Number(row.downloads),
    exports: Number(row.exports),
    shares: Number(row.shares),
    total: Number(row.total),
  }
}

/**
 * Get most viewed assets
 */
export async function getMostViewedAssets(
  tenantId: string,
  limit: number = 10,
  days: number = 30
): Promise<{ assetId: string; views: number }[]> {
  const result = await sql<{ asset_id: string; views: string }>`
    SELECT asset_id, COUNT(*) as views
    FROM dam_usage_logs
    WHERE tenant_id = ${tenantId}
      AND action = 'view'
      AND created_at > NOW() - INTERVAL '${days} days'
    GROUP BY asset_id
    ORDER BY views DESC
    LIMIT ${limit}
  `

  return result.rows.map((r) => ({
    assetId: r.asset_id,
    views: Number(r.views),
  }))
}

/**
 * Get most downloaded assets
 */
export async function getMostDownloadedAssets(
  tenantId: string,
  limit: number = 10,
  days: number = 30
): Promise<{ assetId: string; downloads: number }[]> {
  const result = await sql<{ asset_id: string; downloads: string }>`
    SELECT asset_id, COUNT(*) as downloads
    FROM dam_usage_logs
    WHERE tenant_id = ${tenantId}
      AND action = 'download'
      AND created_at > NOW() - INTERVAL '${days} days'
    GROUP BY asset_id
    ORDER BY downloads DESC
    LIMIT ${limit}
  `

  return result.rows.map((r) => ({
    assetId: r.asset_id,
    downloads: Number(r.downloads),
  }))
}

/**
 * Cleanup old audit logs (for data retention)
 */
export async function cleanupOldAuditLogs(
  tenantId: string,
  olderThanDays: number = 365
): Promise<number> {
  const result = await sql`
    DELETE FROM dam_audit_logs
    WHERE tenant_id = ${tenantId}
      AND created_at < NOW() - INTERVAL '${olderThanDays} days'
  `
  return result.rowCount ?? 0
}

/**
 * Cleanup old usage logs (for data retention)
 */
export async function cleanupOldUsageLogs(
  tenantId: string,
  olderThanDays: number = 90
): Promise<number> {
  const result = await sql`
    DELETE FROM dam_usage_logs
    WHERE tenant_id = ${tenantId}
      AND created_at < NOW() - INTERVAL '${olderThanDays} days'
  `
  return result.rowCount ?? 0
}
