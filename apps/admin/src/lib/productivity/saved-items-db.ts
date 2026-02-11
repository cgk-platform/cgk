/**
 * PHASE-2H-PRODUCTIVITY: Saved Items database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type {
  SavedItem,
  SavedItemFilters,
  SavedItemStats,
  SaveItemInput,
  SavedItemType,
} from './types'

/**
 * Save an item
 */
export async function saveItem(
  tenantSlug: string,
  userId: string,
  data: SaveItemInput,
): Promise<SavedItem> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO saved_items (
        user_id, item_type, item_id, item_url, title, description,
        thumbnail_url, folder, tags, metadata
      ) VALUES (
        ${userId},
        ${data.item_type}::saved_item_type,
        ${data.item_id || null},
        ${data.item_url || null},
        ${data.title},
        ${data.description || null},
        ${data.thumbnail_url || null},
        ${data.folder || 'starred'},
        ${`{${(data.tags || []).map((s) => `"${s}"`).join(',')}}`}::text[],
        ${JSON.stringify(data.metadata || {})}::jsonb
      )
      RETURNING *
    `
    return result.rows[0] as SavedItem
  })
}

/**
 * Get saved items for a user
 */
export async function getSavedItems(
  tenantSlug: string,
  userId: string,
  filters?: SavedItemFilters,
): Promise<SavedItem[]> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = [`user_id = $1`]
    const values: unknown[] = [userId]
    let paramIndex = 1

    if (filters?.folder) {
      paramIndex++
      conditions.push(`folder = $${paramIndex}`)
      values.push(filters.folder)
    }

    if (filters?.item_type) {
      paramIndex++
      conditions.push(`item_type = $${paramIndex}::saved_item_type`)
      values.push(filters.item_type)
    }

    if (filters?.tags && filters.tags.length > 0) {
      paramIndex++
      conditions.push(`tags && $${paramIndex}::text[]`)
      values.push(filters.tags)
    }

    const result = await sql.query(
      `SELECT * FROM saved_items WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      values,
    )

    return result.rows as SavedItem[]
  })
}

/**
 * Get a single saved item
 */
export async function getSavedItem(
  tenantSlug: string,
  itemId: string,
): Promise<SavedItem | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM saved_items WHERE id = ${itemId} LIMIT 1
    `
    return (result.rows[0] as SavedItem) || null
  })
}

/**
 * Remove a saved item
 */
export async function removeSavedItem(
  tenantSlug: string,
  userId: string,
  itemId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM saved_items WHERE id = ${itemId} AND user_id = ${userId} RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Move a saved item to a different folder
 */
export async function moveSavedItem(
  tenantSlug: string,
  userId: string,
  itemId: string,
  folder: string,
): Promise<SavedItem | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE saved_items
      SET folder = ${folder}
      WHERE id = ${itemId} AND user_id = ${userId}
      RETURNING *
    `
    return (result.rows[0] as SavedItem) || null
  })
}

/**
 * Update saved item tags
 */
export async function updateSavedItemTags(
  tenantSlug: string,
  userId: string,
  itemId: string,
  tags: string[],
): Promise<SavedItem | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE saved_items
      SET tags = ${`{${tags.map((s) => `"${s}"`).join(',')}}`}::text[]
      WHERE id = ${itemId} AND user_id = ${userId}
      RETURNING *
    `
    return (result.rows[0] as SavedItem) || null
  })
}

/**
 * Check if an item is already saved
 */
export async function isItemSaved(
  tenantSlug: string,
  userId: string,
  itemType: SavedItemType,
  itemId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT 1 FROM saved_items
      WHERE user_id = ${userId}
        AND item_type = ${itemType}::saved_item_type
        AND item_id = ${itemId}
      LIMIT 1
    `
    return result.rows.length > 0
  })
}

/**
 * Get saved item statistics for a user
 */
export async function getSavedItemStats(
  tenantSlug: string,
  userId: string,
): Promise<SavedItemStats> {
  return withTenant(tenantSlug, async () => {
    // Total count
    const totalResult = await sql`
      SELECT COUNT(*)::int as total FROM saved_items WHERE user_id = ${userId}
    `

    // By type
    const typeResult = await sql`
      SELECT item_type, COUNT(*)::int as count
      FROM saved_items
      WHERE user_id = ${userId}
      GROUP BY item_type
    `

    // By folder
    const folderResult = await sql`
      SELECT folder, COUNT(*)::int as count
      FROM saved_items
      WHERE user_id = ${userId}
      GROUP BY folder
    `

    const byType: Record<SavedItemType, number> = {
      task: 0,
      project: 0,
      message: 0,
      file: 0,
      link: 0,
    }
    for (const row of typeResult.rows) {
      byType[row.item_type as SavedItemType] = row.count as number
    }

    const byFolder: Record<string, number> = {}
    for (const row of folderResult.rows) {
      byFolder[row.folder as string] = row.count as number
    }

    return {
      total: totalResult.rows[0]?.total || 0,
      by_type: byType,
      by_folder: byFolder,
    }
  })
}

/**
 * Get user's folders
 */
export async function getSavedItemFolders(
  tenantSlug: string,
  userId: string,
): Promise<string[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT DISTINCT folder
      FROM saved_items
      WHERE user_id = ${userId}
      ORDER BY folder
    `
    return result.rows.map((r) => r.folder as string)
  })
}

/**
 * Bulk delete saved items
 */
export async function bulkDeleteSavedItems(
  tenantSlug: string,
  userId: string,
  itemIds: string[],
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM saved_items
      WHERE id = ANY(${`{${itemIds.join(',')}}`}::uuid[])
        AND user_id = ${userId}
    `
    return result.rowCount ?? 0
  })
}

/**
 * Bulk move saved items to folder
 */
export async function bulkMoveSavedItems(
  tenantSlug: string,
  userId: string,
  itemIds: string[],
  folder: string,
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE saved_items
      SET folder = ${folder}
      WHERE id = ANY(${`{${itemIds.join(',')}}`}::uuid[])
        AND user_id = ${userId}
    `
    return result.rowCount ?? 0
  })
}
