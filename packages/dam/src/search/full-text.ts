/**
 * Full-Text Search
 * PostgreSQL FTS implementation for asset search
 */
import { sql } from '@cgk/db'

import type { Asset, AssetRow, AssetType } from '../types.js'

export interface SearchOptions {
  query: string
  tenantId: string
  limit?: number
  offset?: number
  assetTypes?: AssetType[]
  tags?: string[]
  collectionId?: string
  includeArchived?: boolean
  sort?: 'relevance' | 'date' | 'title'
  dir?: 'asc' | 'desc'
}

export interface SearchResultItem extends AssetRow {
  rank: number
  headline?: string
}

export interface FullTextSearchResult {
  assets: SearchResultItem[]
  totalCount: number
  query: string
}

/**
 * Perform full-text search on assets
 */
export async function searchAssets(options: SearchOptions): Promise<FullTextSearchResult> {
  const {
    query,
    tenantId,
    limit = 50,
    offset = 0,
    assetTypes,
    tags,
    collectionId,
    includeArchived = false,
    sort = 'relevance',
    dir = 'desc',
  } = options

  // Sanitize query for tsquery
  const sanitizedQuery = sanitizeSearchQuery(query)

  if (!sanitizedQuery) {
    return { assets: [], totalCount: 0, query }
  }

  const conditions: string[] = [
    'a.tenant_id = $1',
    'a.deleted_at IS NULL',
    `a.search_vector @@ to_tsquery('english', $2)`,
  ]
  const values: unknown[] = [tenantId, sanitizedQuery]
  let paramIndex = 2

  if (!includeArchived) {
    conditions.push('a.is_archived = false')
  }

  if (assetTypes && assetTypes.length > 0) {
    paramIndex++
    conditions.push(`a.asset_type = ANY($${paramIndex}::text[])`)
    values.push(assetTypes)
  }

  if (tags && tags.length > 0) {
    paramIndex++
    conditions.push(`(a.manual_tags && $${paramIndex}::text[] OR a.ai_tags && $${paramIndex}::text[])`)
    values.push(tags)
  }

  if (collectionId) {
    paramIndex++
    conditions.push(`EXISTS (
      SELECT 1 FROM dam_collection_assets ca
      WHERE ca.asset_id = a.id AND ca.collection_id = $${paramIndex}
    )`)
    values.push(collectionId)
  }

  const whereClause = conditions.join(' AND ')

  // Determine sort order
  let orderBy: string
  switch (sort) {
    case 'relevance':
      orderBy = `ts_rank(a.search_vector, to_tsquery('english', $2)) ${dir === 'asc' ? 'ASC' : 'DESC'}`
      break
    case 'date':
      orderBy = `a.created_at ${dir === 'asc' ? 'ASC' : 'DESC'}`
      break
    case 'title':
      orderBy = `a.title ${dir === 'asc' ? 'ASC' : 'DESC'}`
      break
    default:
      orderBy = `ts_rank(a.search_vector, to_tsquery('english', $2)) DESC`
  }

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(limit, offset)

  const dataResult = await sql.query(
    `SELECT a.id, a.tenant_id, a.user_id, a.title, a.description, a.asset_type,
            a.mime_type, a.file_extension, a.file_url, a.thumbnail_url,
            a.file_size_bytes, a.width, a.height, a.duration_seconds,
            a.quality_variant, a.parent_asset_id, a.asset_group_id, a.version_number,
            a.mux_asset_id, a.mux_playback_id, a.metadata, a.exif_data,
            a.manual_tags, a.ai_tags, a.ai_objects, a.ai_scenes, a.ai_visual_description,
            a.content_tags, a.product_tags, a.rights_status, a.rights_expires_at,
            a.rights_holder, a.rights_notes, a.is_active, a.is_archived,
            a.is_favorite, a.is_featured, a.view_count, a.download_count,
            a.source_type, a.source_file_id, a.source_folder_path, a.file_hash,
            a.created_at, a.updated_at, a.deleted_at,
            ts_rank(a.search_vector, to_tsquery('english', $2)) as rank,
            ts_headline('english', COALESCE(a.title, '') || ' ' || COALESCE(a.description, ''),
              to_tsquery('english', $2),
              'MaxWords=50, MinWords=20, StartSel=<mark>, StopSel=</mark>'
            ) as headline
     FROM dam_assets a
     WHERE ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM dam_assets a WHERE ${whereClause}`,
    countValues
  )

  return {
    assets: dataResult.rows as SearchResultItem[],
    totalCount: Number(countResult.rows[0]?.count || 0),
    query,
  }
}

/**
 * Sanitize search query for PostgreSQL tsquery
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return ''

  // Remove special characters that could cause tsquery issues
  let sanitized = query
    .trim()
    .toLowerCase()
    // Remove special PostgreSQL tsquery characters
    .replace(/[&|!():*'\\]/g, ' ')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim()

  if (!sanitized) return ''

  // Split into words and filter empty
  const words = sanitized.split(' ').filter((w) => w.length > 0)

  if (words.length === 0) return ''

  // Join with & for AND search, add :* for prefix matching
  return words.map((w) => `${w}:*`).join(' & ')
}

/**
 * Get search suggestions based on partial query
 */
export async function getSearchSuggestions(
  tenantId: string,
  partialQuery: string,
  limit: number = 10
): Promise<string[]> {
  if (!partialQuery || partialQuery.length < 2) {
    return []
  }

  const pattern = `%${partialQuery.toLowerCase()}%`

  // Get suggestions from titles
  const titleResult = await sql<{ suggestion: string }>`
    SELECT DISTINCT title as suggestion
    FROM dam_assets
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
      AND LOWER(title) LIKE ${pattern}
    ORDER BY title
    LIMIT ${limit}
  `

  // Get suggestions from tags
  const tagResult = await sql<{ tag: string }>`
    SELECT DISTINCT unnest(manual_tags) as tag
    FROM dam_assets
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
    HAVING LOWER(unnest(manual_tags)) LIKE ${pattern}
    LIMIT ${limit}
  `

  const suggestions = new Set<string>()

  for (const row of titleResult.rows) {
    suggestions.add(row.suggestion)
  }

  for (const row of tagResult.rows) {
    if (row.tag.toLowerCase().includes(partialQuery.toLowerCase())) {
      suggestions.add(row.tag)
    }
  }

  return Array.from(suggestions).slice(0, limit)
}

/**
 * Get popular search terms for a tenant
 */
export async function getPopularSearchTerms(
  tenantId: string,
  limit: number = 10
): Promise<{ term: string; count: number }[]> {
  // Get most common tags
  const result = await sql<{ term: string; count: string }>`
    SELECT tag as term, COUNT(*) as count
    FROM (
      SELECT unnest(manual_tags) as tag
      FROM dam_assets
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
    ) tags
    GROUP BY tag
    ORDER BY count DESC
    LIMIT ${limit}
  `

  return result.rows.map((r) => ({
    term: r.term,
    count: Number(r.count),
  }))
}

/**
 * Find similar assets based on tags and content
 */
export async function findSimilarAssets(
  tenantId: string,
  assetId: string,
  limit: number = 10
): Promise<AssetRow[]> {
  // Get the source asset's tags
  const sourceResult = await sql<Asset>`
    SELECT manual_tags, ai_tags, content_tags, product_tags, asset_type
    FROM dam_assets
    WHERE id = ${assetId} AND tenant_id = ${tenantId}
  `

  const source = sourceResult.rows[0]
  if (!source) return []

  const allTags = [
    ...source.manual_tags,
    ...source.ai_tags,
    ...source.content_tags,
    ...source.product_tags,
  ]

  if (allTags.length === 0) {
    // Fall back to same asset type
    const fallbackResult = await sql<AssetRow>`
      SELECT id, tenant_id, user_id, title, description, asset_type,
             mime_type, file_extension, file_url, thumbnail_url,
             file_size_bytes, width, height, duration_seconds,
             quality_variant, parent_asset_id, asset_group_id, version_number,
             mux_asset_id, mux_playback_id, metadata, exif_data,
             manual_tags, ai_tags, ai_objects, ai_scenes, ai_visual_description,
             content_tags, product_tags, rights_status, rights_expires_at,
             rights_holder, rights_notes, is_active, is_archived,
             is_favorite, is_featured, view_count, download_count,
             source_type, source_file_id, source_folder_path, file_hash,
             created_at, updated_at, deleted_at
      FROM dam_assets
      WHERE tenant_id = ${tenantId}
        AND id != ${assetId}
        AND asset_type = ${source.asset_type}
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return fallbackResult.rows
  }

  // Find assets with overlapping tags
  const result = await sql<AssetRow & { similarity: number }>`
    SELECT a.id, a.tenant_id, a.user_id, a.title, a.description, a.asset_type,
           a.mime_type, a.file_extension, a.file_url, a.thumbnail_url,
           a.file_size_bytes, a.width, a.height, a.duration_seconds,
           a.quality_variant, a.parent_asset_id, a.asset_group_id, a.version_number,
           a.mux_asset_id, a.mux_playback_id, a.metadata, a.exif_data,
           a.manual_tags, a.ai_tags, a.ai_objects, a.ai_scenes, a.ai_visual_description,
           a.content_tags, a.product_tags, a.rights_status, a.rights_expires_at,
           a.rights_holder, a.rights_notes, a.is_active, a.is_archived,
           a.is_favorite, a.is_featured, a.view_count, a.download_count,
           a.source_type, a.source_file_id, a.source_folder_path, a.file_hash,
           a.created_at, a.updated_at, a.deleted_at,
           (
             cardinality(a.manual_tags & ${JSON.stringify(allTags)}::text[]) +
             cardinality(a.ai_tags & ${JSON.stringify(allTags)}::text[]) +
             cardinality(a.content_tags & ${JSON.stringify(allTags)}::text[]) +
             cardinality(a.product_tags & ${JSON.stringify(allTags)}::text[])
           ) as similarity
    FROM dam_assets a
    WHERE a.tenant_id = ${tenantId}
      AND a.id != ${assetId}
      AND a.deleted_at IS NULL
      AND (
        a.manual_tags && ${JSON.stringify(allTags)}::text[] OR
        a.ai_tags && ${JSON.stringify(allTags)}::text[] OR
        a.content_tags && ${JSON.stringify(allTags)}::text[] OR
        a.product_tags && ${JSON.stringify(allTags)}::text[]
      )
    ORDER BY similarity DESC
    LIMIT ${limit}
  `

  return result.rows
}
