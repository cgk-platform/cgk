/**
 * Import Queue Database Operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk/db'

import type {
  ImportQueueItem,
  CreateImportQueueItemInput,
  ImportQueueStatus,
} from '../types.js'

export interface ImportQueueFilters {
  page: number
  limit: number
  offset: number
  status?: ImportQueueStatus | ImportQueueStatus[]
  source_type?: 'gdrive' | 'upload' | 'api'
  assigned_to?: string
  sort: string
  dir: 'asc' | 'desc'
}

const QUEUE_SORT_COLUMNS: Record<string, string> = {
  created_at: 'created_at',
  file_name: 'file_name',
  file_size_bytes: 'file_size_bytes',
  priority: 'priority',
  status: 'status',
}

/**
 * List import queue items
 */
export async function getQueueItems(
  tenantId: string,
  filters: ImportQueueFilters
): Promise<{ items: ImportQueueItem[]; totalCount: number }> {
  const conditions: string[] = ['tenant_id = $1']
  const values: unknown[] = [tenantId]
  let paramIndex = 1

  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    paramIndex++
    conditions.push(`status = ANY($${paramIndex}::text[])`)
    values.push(statuses)
  }

  if (filters.source_type) {
    paramIndex++
    conditions.push(`source_type = $${paramIndex}`)
    values.push(filters.source_type)
  }

  if (filters.assigned_to) {
    paramIndex++
    conditions.push(`assigned_to = $${paramIndex}`)
    values.push(filters.assigned_to)
  }

  const whereClause = conditions.join(' AND ')
  const sortCol = QUEUE_SORT_COLUMNS[filters.sort] || 'created_at'
  const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

  const dataResult = await sql.query(
    `SELECT id, tenant_id, source_type, source_file_id, source_folder_path,
            file_name, file_size_bytes, mime_type, preview_url,
            suggested_title, suggested_tags, suggested_creator_id,
            status, assigned_to, priority, error_message, imported_asset_id,
            created_at, processed_at
     FROM dam_import_queue_items
     WHERE ${whereClause}
     ORDER BY priority DESC, ${sortCol} ${sortDir} NULLS LAST
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM dam_import_queue_items WHERE ${whereClause}`,
    countValues
  )

  return {
    items: dataResult.rows as ImportQueueItem[],
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

/**
 * Get a queue item by ID
 */
export async function getQueueItemById(
  tenantId: string,
  itemId: string
): Promise<ImportQueueItem | null> {
  const result = await sql<ImportQueueItem>`
    SELECT id, tenant_id, source_type, source_file_id, source_folder_path,
           file_name, file_size_bytes, mime_type, preview_url,
           suggested_title, suggested_tags, suggested_creator_id,
           status, assigned_to, priority, error_message, imported_asset_id,
           created_at, processed_at
    FROM dam_import_queue_items
    WHERE id = ${itemId} AND tenant_id = ${tenantId}
  `
  return result.rows[0] || null
}

/**
 * Create a new queue item
 */
export async function createQueueItem(
  tenantId: string,
  input: CreateImportQueueItemInput
): Promise<ImportQueueItem> {
  const suggestedTags = input.suggested_tags
    ? JSON.stringify(input.suggested_tags)
    : null

  const result = await sql<ImportQueueItem>`
    INSERT INTO dam_import_queue_items (
      tenant_id, source_type, source_file_id, source_folder_path,
      file_name, file_size_bytes, mime_type, preview_url,
      suggested_title, suggested_tags, suggested_creator_id, priority
    ) VALUES (
      ${tenantId}, ${input.source_type}, ${input.source_file_id || null},
      ${input.source_folder_path || null}, ${input.file_name},
      ${input.file_size_bytes || null}, ${input.mime_type || null},
      ${input.preview_url || null}, ${input.suggested_title || null},
      ${suggestedTags}::text[], ${input.suggested_creator_id || null},
      ${input.priority || 0}
    )
    RETURNING id, tenant_id, source_type, source_file_id, source_folder_path,
              file_name, file_size_bytes, mime_type, preview_url,
              suggested_title, suggested_tags, suggested_creator_id,
              status, assigned_to, priority, error_message, imported_asset_id,
              created_at, processed_at
  `
  return result.rows[0]!
}

/**
 * Update queue item status
 */
export async function updateQueueItemStatus(
  tenantId: string,
  itemId: string,
  status: ImportQueueStatus,
  options?: {
    imported_asset_id?: string
    error_message?: string
  }
): Promise<ImportQueueItem | null> {
  const processedAt = ['completed', 'skipped', 'failed'].includes(status)
    ? new Date().toISOString()
    : null

  const result = await sql<ImportQueueItem>`
    UPDATE dam_import_queue_items SET
      status = ${status},
      imported_asset_id = ${options?.imported_asset_id || null},
      error_message = ${options?.error_message || null},
      processed_at = ${processedAt}::timestamptz
    WHERE id = ${itemId} AND tenant_id = ${tenantId}
    RETURNING id, tenant_id, source_type, source_file_id, source_folder_path,
              file_name, file_size_bytes, mime_type, preview_url,
              suggested_title, suggested_tags, suggested_creator_id,
              status, assigned_to, priority, error_message, imported_asset_id,
              created_at, processed_at
  `
  return result.rows[0] || null
}

/**
 * Assign queue item to a user
 */
export async function assignQueueItem(
  tenantId: string,
  itemId: string,
  userId: string
): Promise<ImportQueueItem | null> {
  const result = await sql<ImportQueueItem>`
    UPDATE dam_import_queue_items SET
      assigned_to = ${userId},
      status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END
    WHERE id = ${itemId} AND tenant_id = ${tenantId}
    RETURNING id, tenant_id, source_type, source_file_id, source_folder_path,
              file_name, file_size_bytes, mime_type, preview_url,
              suggested_title, suggested_tags, suggested_creator_id,
              status, assigned_to, priority, error_message, imported_asset_id,
              created_at, processed_at
  `
  return result.rows[0] || null
}

/**
 * Update queue item priority
 */
export async function updateQueueItemPriority(
  tenantId: string,
  itemId: string,
  priority: number
): Promise<ImportQueueItem | null> {
  const result = await sql<ImportQueueItem>`
    UPDATE dam_import_queue_items SET
      priority = ${priority}
    WHERE id = ${itemId} AND tenant_id = ${tenantId}
    RETURNING id, tenant_id, source_type, source_file_id, source_folder_path,
              file_name, file_size_bytes, mime_type, preview_url,
              suggested_title, suggested_tags, suggested_creator_id,
              status, assigned_to, priority, error_message, imported_asset_id,
              created_at, processed_at
  `
  return result.rows[0] || null
}

/**
 * Bulk update queue item statuses
 */
export async function bulkUpdateQueueItemStatus(
  tenantId: string,
  itemIds: string[],
  status: ImportQueueStatus
): Promise<number> {
  const processedAt = ['completed', 'skipped', 'failed'].includes(status)
    ? new Date().toISOString()
    : null

  const result = await sql`
    UPDATE dam_import_queue_items SET
      status = ${status},
      processed_at = ${processedAt}::timestamptz
    WHERE id = ANY(${JSON.stringify(itemIds)}::uuid[])
      AND tenant_id = ${tenantId}
  `
  return result.rowCount ?? 0
}

/**
 * Delete completed/skipped queue items older than X days
 */
export async function cleanupOldQueueItems(
  tenantId: string,
  olderThanDays: number = 30
): Promise<number> {
  const result = await sql`
    DELETE FROM dam_import_queue_items
    WHERE tenant_id = ${tenantId}
      AND status IN ('completed', 'skipped')
      AND processed_at < NOW() - INTERVAL '${olderThanDays} days'
  `
  return result.rowCount ?? 0
}

/**
 * Get queue statistics
 */
export async function getQueueStats(tenantId: string): Promise<{
  pending: number
  in_progress: number
  completed: number
  skipped: number
  failed: number
  total: number
}> {
  const result = await sql<{
    pending: string
    in_progress: string
    completed: string
    skipped: string
    failed: string
    total: string
  }>`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) as total
    FROM dam_import_queue_items
    WHERE tenant_id = ${tenantId}
  `

  const row = result.rows[0]!
  return {
    pending: Number(row.pending),
    in_progress: Number(row.in_progress),
    completed: Number(row.completed),
    skipped: Number(row.skipped),
    failed: Number(row.failed),
    total: Number(row.total),
  }
}

/**
 * Get next items to process
 */
export async function getNextItemsToProcess(
  tenantId: string,
  limit: number = 10
): Promise<ImportQueueItem[]> {
  const result = await sql<ImportQueueItem>`
    SELECT id, tenant_id, source_type, source_file_id, source_folder_path,
           file_name, file_size_bytes, mime_type, preview_url,
           suggested_title, suggested_tags, suggested_creator_id,
           status, assigned_to, priority, error_message, imported_asset_id,
           created_at, processed_at
    FROM dam_import_queue_items
    WHERE tenant_id = ${tenantId} AND status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT ${limit}
  `
  return result.rows
}

/**
 * Check if source file is already in queue
 */
export async function isSourceFileQueued(
  tenantId: string,
  sourceType: string,
  sourceFileId: string
): Promise<boolean> {
  const result = await sql<{ exists: boolean }>`
    SELECT EXISTS(
      SELECT 1 FROM dam_import_queue_items
      WHERE tenant_id = ${tenantId}
        AND source_type = ${sourceType}
        AND source_file_id = ${sourceFileId}
        AND status IN ('pending', 'in_progress')
    ) as exists
  `
  return result.rows[0]?.exists ?? false
}
