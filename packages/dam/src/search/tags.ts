/**
 * Tag Management and Search
 * Handles tag operations and autocomplete
 */
import { sql } from '@cgk/db'

export interface TagWithCount {
  tag: string
  count: number
  source: 'manual' | 'ai' | 'content' | 'product'
}

export interface TagSuggestion {
  tag: string
  count: number
  relevance: number
}

/**
 * Get all tags used in a tenant with counts
 */
export async function getAllTags(tenantId: string): Promise<TagWithCount[]> {
  const result = await sql<{ tag: string; count: string; source: string }>`
    SELECT tag, count, source FROM (
      SELECT unnest(manual_tags) as tag, COUNT(*) as count, 'manual' as source
      FROM dam_assets
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      GROUP BY unnest(manual_tags)
      UNION ALL
      SELECT unnest(ai_tags) as tag, COUNT(*) as count, 'ai' as source
      FROM dam_assets
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      GROUP BY unnest(ai_tags)
      UNION ALL
      SELECT unnest(content_tags) as tag, COUNT(*) as count, 'content' as source
      FROM dam_assets
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      GROUP BY unnest(content_tags)
      UNION ALL
      SELECT unnest(product_tags) as tag, COUNT(*) as count, 'product' as source
      FROM dam_assets
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      GROUP BY unnest(product_tags)
    ) tags
    ORDER BY count DESC
  `

  return result.rows.map((r) => ({
    tag: r.tag,
    count: Number(r.count),
    source: r.source as 'manual' | 'ai' | 'content' | 'product',
  }))
}

/**
 * Get most popular tags
 */
export async function getPopularTags(
  tenantId: string,
  limit: number = 20
): Promise<TagWithCount[]> {
  const result = await sql<{ tag: string; count: string }>`
    SELECT tag, SUM(count) as count FROM (
      SELECT unnest(manual_tags) as tag, COUNT(*) as count
      FROM dam_assets
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      GROUP BY unnest(manual_tags)
      UNION ALL
      SELECT unnest(ai_tags) as tag, COUNT(*) as count
      FROM dam_assets
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      GROUP BY unnest(ai_tags)
    ) tags
    GROUP BY tag
    ORDER BY count DESC
    LIMIT ${limit}
  `

  return result.rows.map((r) => ({
    tag: r.tag,
    count: Number(r.count),
    source: 'manual' as const,
  }))
}

/**
 * Get tag suggestions based on partial input
 */
export async function getTagSuggestions(
  tenantId: string,
  partialTag: string,
  limit: number = 10
): Promise<TagSuggestion[]> {
  if (!partialTag || partialTag.length < 2) {
    return []
  }

  const pattern = `${partialTag.toLowerCase()}%`
  const containsPattern = `%${partialTag.toLowerCase()}%`

  const result = await sql<{ tag: string; count: string; relevance: number }>`
    WITH all_tags AS (
      SELECT tag, SUM(count) as count FROM (
        SELECT unnest(manual_tags) as tag, COUNT(*) as count
        FROM dam_assets
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        GROUP BY unnest(manual_tags)
        UNION ALL
        SELECT unnest(ai_tags) as tag, COUNT(*) as count
        FROM dam_assets
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        GROUP BY unnest(ai_tags)
        UNION ALL
        SELECT unnest(content_tags) as tag, COUNT(*) as count
        FROM dam_assets
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        GROUP BY unnest(content_tags)
        UNION ALL
        SELECT unnest(product_tags) as tag, COUNT(*) as count
        FROM dam_assets
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        GROUP BY unnest(product_tags)
      ) tags
      GROUP BY tag
    )
    SELECT tag, count,
           CASE
             WHEN LOWER(tag) = ${partialTag.toLowerCase()} THEN 100
             WHEN LOWER(tag) LIKE ${pattern} THEN 80
             WHEN LOWER(tag) LIKE ${containsPattern} THEN 50
             ELSE 0
           END as relevance
    FROM all_tags
    WHERE LOWER(tag) LIKE ${containsPattern}
    ORDER BY relevance DESC, count DESC
    LIMIT ${limit}
  `

  return result.rows.map((r) => ({
    tag: r.tag,
    count: Number(r.count),
    relevance: r.relevance,
  }))
}

/**
 * Add tags to an asset (manual_tags only)
 */
export async function addTagsToAsset(
  tenantId: string,
  assetId: string,
  tags: string[],
  _tagType: 'manual' | 'content' | 'product' = 'manual'
): Promise<string[]> {
  const normalizedTags = tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0)

  if (normalizedTags.length === 0) {
    return []
  }

  // Use manual_tags for simplicity - the tagType parameter is for API compatibility
  const result = await sql<{ tags: string[] }>`
    UPDATE dam_assets
    SET manual_tags = (
      SELECT ARRAY(SELECT DISTINCT unnest(array_cat(manual_tags, ${JSON.stringify(normalizedTags)}::text[])))
    ),
    updated_at = NOW()
    WHERE id = ${assetId} AND tenant_id = ${tenantId}
    RETURNING manual_tags as tags
  `

  return result.rows[0]?.tags || []
}

/**
 * Remove tags from an asset
 */
export async function removeTagsFromAsset(
  tenantId: string,
  assetId: string,
  tags: string[],
  _tagType: 'manual' | 'content' | 'product' = 'manual'
): Promise<string[]> {
  const normalizedTags = tags.map((t) => t.trim().toLowerCase())

  if (normalizedTags.length === 0) {
    return []
  }

  const result = await sql<{ tags: string[] }>`
    UPDATE dam_assets
    SET manual_tags = array(
      SELECT unnest(manual_tags)
      EXCEPT SELECT unnest(${JSON.stringify(normalizedTags)}::text[])
    ),
    updated_at = NOW()
    WHERE id = ${assetId} AND tenant_id = ${tenantId}
    RETURNING manual_tags as tags
  `

  return result.rows[0]?.tags || []
}

/**
 * Bulk add tags to multiple assets
 */
export async function bulkAddTags(
  tenantId: string,
  assetIds: string[],
  tags: string[],
  _tagType: 'manual' | 'content' | 'product' = 'manual'
): Promise<number> {
  const normalizedTags = tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0)

  if (normalizedTags.length === 0 || assetIds.length === 0) {
    return 0
  }

  const result = await sql`
    UPDATE dam_assets
    SET manual_tags = (
      SELECT ARRAY(SELECT DISTINCT unnest(array_cat(manual_tags, ${JSON.stringify(normalizedTags)}::text[])))
    ),
    updated_at = NOW()
    WHERE id = ANY(${JSON.stringify(assetIds)}::uuid[])
      AND tenant_id = ${tenantId}
  `

  return result.rowCount ?? 0
}

/**
 * Bulk remove tags from multiple assets
 */
export async function bulkRemoveTags(
  tenantId: string,
  assetIds: string[],
  tags: string[],
  _tagType: 'manual' | 'content' | 'product' = 'manual'
): Promise<number> {
  const normalizedTags = tags.map((t) => t.trim().toLowerCase())

  if (normalizedTags.length === 0 || assetIds.length === 0) {
    return 0
  }

  const result = await sql`
    UPDATE dam_assets
    SET manual_tags = array(
      SELECT unnest(manual_tags)
      EXCEPT SELECT unnest(${JSON.stringify(normalizedTags)}::text[])
    ),
    updated_at = NOW()
    WHERE id = ANY(${JSON.stringify(assetIds)}::uuid[])
      AND tenant_id = ${tenantId}
  `

  return result.rowCount ?? 0
}

/**
 * Rename a tag across all assets
 */
export async function renameTag(
  tenantId: string,
  oldTag: string,
  newTag: string,
  _tagType: 'manual' | 'content' | 'product' = 'manual'
): Promise<number> {
  const oldTagNormalized = oldTag.trim().toLowerCase()
  const newTagNormalized = newTag.trim().toLowerCase()

  if (oldTagNormalized === newTagNormalized) {
    return 0
  }

  const result = await sql`
    UPDATE dam_assets
    SET manual_tags = array_replace(manual_tags, ${oldTagNormalized}, ${newTagNormalized}),
    updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND ${oldTagNormalized} = ANY(manual_tags)
  `

  return result.rowCount ?? 0
}

/**
 * Delete a tag from all assets
 */
export async function deleteTag(
  tenantId: string,
  tag: string,
  _tagType: 'manual' | 'content' | 'product' = 'manual'
): Promise<number> {
  const tagNormalized = tag.trim().toLowerCase()

  const result = await sql`
    UPDATE dam_assets
    SET manual_tags = array_remove(manual_tags, ${tagNormalized}),
    updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND ${tagNormalized} = ANY(manual_tags)
  `

  return result.rowCount ?? 0
}

/**
 * Get tag co-occurrences for recommendations
 */
export async function getRelatedTags(
  tenantId: string,
  tag: string,
  limit: number = 10
): Promise<TagWithCount[]> {
  const tagNormalized = tag.trim().toLowerCase()

  const result = await sql<{ tag: string; count: string }>`
    SELECT related_tag as tag, COUNT(*) as count FROM (
      SELECT unnest(manual_tags) as related_tag
      FROM dam_assets
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND ${tagNormalized} = ANY(manual_tags)
    ) related
    WHERE related_tag != ${tagNormalized}
    GROUP BY related_tag
    ORDER BY count DESC
    LIMIT ${limit}
  `

  return result.rows.map((r) => ({
    tag: r.tag,
    count: Number(r.count),
    source: 'manual' as const,
  }))
}
