/**
 * Asset CRUD Operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk-platform/db'

import type {
  Asset,
  AssetRow,
  AssetFilters,
  CreateAssetInput,
  UpdateAssetInput,
  SearchResult,
  BulkOperationInput,
  BulkOperationResult,
} from '../types.js'

const ASSET_SORT_COLUMNS: Record<string, string> = {
  created_at: 'a.created_at',
  updated_at: 'a.updated_at',
  title: 'a.title',
  file_size_bytes: 'a.file_size_bytes',
  asset_type: 'a.asset_type',
  view_count: 'a.view_count',
  download_count: 'a.download_count',
}

/**
 * List assets with filtering, search, and pagination
 */
export async function getAssets(
  tenantId: string,
  _userId: string,
  filters: AssetFilters
): Promise<SearchResult> {
  const conditions: string[] = ['a.tenant_id = $1', 'a.deleted_at IS NULL']
  const values: unknown[] = [tenantId]
  let paramIndex = 1

  if (filters.search) {
    paramIndex++
    conditions.push(`a.search_vector @@ plainto_tsquery('english', $${paramIndex})`)
    values.push(filters.search)
  }

  if (filters.asset_type) {
    const types = Array.isArray(filters.asset_type) ? filters.asset_type : [filters.asset_type]
    paramIndex++
    conditions.push(`a.asset_type = ANY($${paramIndex}::text[])`)
    values.push(types)
  }

  if (filters.collection_id) {
    paramIndex++
    conditions.push(`EXISTS (
      SELECT 1 FROM dam_collection_assets ca
      WHERE ca.asset_id = a.id AND ca.collection_id = $${paramIndex}
    )`)
    values.push(filters.collection_id)
  }

  if (filters.tags && filters.tags.length > 0) {
    paramIndex++
    conditions.push(`(a.manual_tags && $${paramIndex}::text[] OR a.ai_tags && $${paramIndex}::text[])`)
    values.push(filters.tags)
  }

  if (filters.rights_status) {
    paramIndex++
    conditions.push(`a.rights_status = $${paramIndex}`)
    values.push(filters.rights_status)
  }

  if (filters.is_archived !== undefined) {
    paramIndex++
    conditions.push(`a.is_archived = $${paramIndex}`)
    values.push(filters.is_archived)
  }

  if (filters.is_favorite !== undefined) {
    paramIndex++
    conditions.push(`a.is_favorite = $${paramIndex}`)
    values.push(filters.is_favorite)
  }

  if (filters.is_featured !== undefined) {
    paramIndex++
    conditions.push(`a.is_featured = $${paramIndex}`)
    values.push(filters.is_featured)
  }

  if (filters.date_from) {
    paramIndex++
    conditions.push(`a.created_at >= $${paramIndex}::timestamptz`)
    values.push(filters.date_from)
  }

  if (filters.date_to) {
    paramIndex++
    conditions.push(`a.created_at <= $${paramIndex}::timestamptz`)
    values.push(filters.date_to)
  }

  const whereClause = conditions.join(' AND ')
  const sortCol = ASSET_SORT_COLUMNS[filters.sort] || 'a.created_at'
  const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

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
            COALESCE(
              (SELECT array_agg(c.name) FROM dam_collections c
               JOIN dam_collection_assets ca ON c.id = ca.collection_id
               WHERE ca.asset_id = a.id),
              ARRAY[]::text[]
            ) as collection_names
     FROM dam_assets a
     WHERE ${whereClause}
     ORDER BY ${sortCol} ${sortDir} NULLS LAST
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM dam_assets a WHERE ${whereClause}`,
    countValues
  )

  return {
    assets: dataResult.rows as AssetRow[],
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

/**
 * Get a single asset by ID
 */
export async function getAssetById(tenantId: string, assetId: string): Promise<Asset | null> {
  const result = await sql<Asset>`
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
    WHERE id = ${assetId} AND tenant_id = ${tenantId} AND deleted_at IS NULL
  `
  return result.rows[0] || null
}

/**
 * Create a new asset
 */
export async function createAsset(
  tenantId: string,
  userId: string,
  input: CreateAssetInput
): Promise<Asset> {
  const manualTags = input.manual_tags || []
  const contentTags = input.content_tags || []
  const productTags = input.product_tags || []
  const metadata = input.metadata || {}
  const exifData = input.exif_data || null

  const result = await sql<Asset>`
    INSERT INTO dam_assets (
      tenant_id, user_id, title, description, asset_type, mime_type,
      file_extension, file_url, thumbnail_url, file_size_bytes,
      width, height, duration_seconds, quality_variant,
      parent_asset_id, asset_group_id, metadata, exif_data,
      manual_tags, content_tags, product_tags, rights_status,
      rights_expires_at, rights_holder, rights_notes,
      source_type, source_file_id, source_folder_path, file_hash
    ) VALUES (
      ${tenantId}, ${userId}, ${input.title}, ${input.description || null},
      ${input.asset_type}, ${input.mime_type}, ${input.file_extension || null},
      ${input.file_url}, ${input.thumbnail_url || null},
      ${input.file_size_bytes || null}, ${input.width || null},
      ${input.height || null}, ${input.duration_seconds || null},
      ${input.quality_variant || 'master'}, ${input.parent_asset_id || null},
      ${input.asset_group_id || null}, ${JSON.stringify(metadata)}::jsonb,
      ${exifData ? JSON.stringify(exifData) : null}::jsonb,
      ${JSON.stringify(manualTags)}::text[], ${JSON.stringify(contentTags)}::text[],
      ${JSON.stringify(productTags)}::text[], ${input.rights_status || 'pending'},
      ${input.rights_expires_at || null}::timestamptz, ${input.rights_holder || null},
      ${input.rights_notes || null}, ${input.source_type || null},
      ${input.source_file_id || null}, ${input.source_folder_path || null},
      ${input.file_hash || null}
    )
    RETURNING id, tenant_id, user_id, title, description, asset_type,
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
  `

  return result.rows[0]!
}

/**
 * Update an existing asset
 */
export async function updateAsset(
  tenantId: string,
  input: UpdateAssetInput
): Promise<Asset | null> {
  const current = await getAssetById(tenantId, input.id)
  if (!current) return null

  const title = input.title ?? current.title
  const description = input.description !== undefined ? input.description : current.description
  const manualTags = input.manual_tags ?? current.manual_tags
  const contentTags = input.content_tags ?? current.content_tags
  const productTags = input.product_tags ?? current.product_tags
  const rightsStatus = input.rights_status ?? current.rights_status
  const rightsExpiresAt = input.rights_expires_at !== undefined
    ? input.rights_expires_at
    : current.rights_expires_at
  const rightsHolder = input.rights_holder !== undefined
    ? input.rights_holder
    : current.rights_holder
  const rightsNotes = input.rights_notes !== undefined
    ? input.rights_notes
    : current.rights_notes
  const isActive = input.is_active ?? current.is_active
  const isArchived = input.is_archived ?? current.is_archived
  const isFavorite = input.is_favorite ?? current.is_favorite
  const isFeatured = input.is_featured ?? current.is_featured
  const metadata = input.metadata ?? current.metadata

  const result = await sql<Asset>`
    UPDATE dam_assets SET
      title = ${title},
      description = ${description},
      manual_tags = ${JSON.stringify(manualTags)}::text[],
      content_tags = ${JSON.stringify(contentTags)}::text[],
      product_tags = ${JSON.stringify(productTags)}::text[],
      rights_status = ${rightsStatus},
      rights_expires_at = ${rightsExpiresAt}::timestamptz,
      rights_holder = ${rightsHolder},
      rights_notes = ${rightsNotes},
      is_active = ${isActive},
      is_archived = ${isArchived},
      is_favorite = ${isFavorite},
      is_featured = ${isFeatured},
      metadata = ${JSON.stringify(metadata)}::jsonb,
      updated_at = NOW()
    WHERE id = ${input.id} AND tenant_id = ${tenantId}
    RETURNING id, tenant_id, user_id, title, description, asset_type,
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
  `

  return result.rows[0] || null
}

/**
 * Soft delete an asset (move to trash)
 */
export async function deleteAsset(
  tenantId: string,
  assetId: string,
  deletedBy: string
): Promise<boolean> {
  const asset = await getAssetById(tenantId, assetId)
  if (!asset) return false

  // Move to trash
  await sql`
    INSERT INTO dam_trash (tenant_id, asset_id, asset_data, deleted_by)
    VALUES (${tenantId}, ${assetId}, ${JSON.stringify(asset)}::jsonb, ${deletedBy})
  `

  // Soft delete the asset
  const result = await sql`
    UPDATE dam_assets
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = ${assetId} AND tenant_id = ${tenantId}
  `

  return (result.rowCount ?? 0) > 0
}

/**
 * Restore an asset from trash
 */
export async function restoreAsset(tenantId: string, assetId: string): Promise<boolean> {
  // Remove soft delete
  const result = await sql`
    UPDATE dam_assets
    SET deleted_at = NULL, updated_at = NOW()
    WHERE id = ${assetId} AND tenant_id = ${tenantId}
  `

  if ((result.rowCount ?? 0) > 0) {
    // Remove from trash
    await sql`DELETE FROM dam_trash WHERE asset_id = ${assetId} AND tenant_id = ${tenantId}`
    return true
  }

  return false
}

/**
 * Permanently delete an asset
 */
export async function permanentlyDeleteAsset(tenantId: string, assetId: string): Promise<boolean> {
  // Remove from collections
  await sql`DELETE FROM dam_collection_assets WHERE asset_id = ${assetId} AND tenant_id = ${tenantId}`

  // Remove from trash
  await sql`DELETE FROM dam_trash WHERE asset_id = ${assetId} AND tenant_id = ${tenantId}`

  // Delete the asset
  const result = await sql`DELETE FROM dam_assets WHERE id = ${assetId} AND tenant_id = ${tenantId}`

  return (result.rowCount ?? 0) > 0
}

/**
 * Perform bulk operations on multiple assets
 */
export async function bulkOperation(
  tenantId: string,
  userId: string,
  input: BulkOperationInput
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
  }

  for (const assetId of input.asset_ids) {
    try {
      switch (input.operation) {
        case 'delete':
          await deleteAsset(tenantId, assetId, userId)
          break

        case 'archive':
          await updateAsset(tenantId, { id: assetId, is_archived: true })
          break

        case 'unarchive':
          await updateAsset(tenantId, { id: assetId, is_archived: false })
          break

        case 'favorite':
          await updateAsset(tenantId, { id: assetId, is_favorite: true })
          break

        case 'unfavorite':
          await updateAsset(tenantId, { id: assetId, is_favorite: false })
          break

        case 'move':
          if (input.collection_id) {
            await sql`
              INSERT INTO dam_collection_assets (tenant_id, collection_id, asset_id)
              VALUES (${tenantId}, ${input.collection_id}, ${assetId})
              ON CONFLICT (collection_id, asset_id) DO NOTHING
            `
          }
          break

        case 'tag':
          if (input.tags_to_add && input.tags_to_add.length > 0) {
            await sql`
              UPDATE dam_assets
              SET manual_tags = array_cat(
                manual_tags,
                ${JSON.stringify(input.tags_to_add)}::text[]
              ),
              updated_at = NOW()
              WHERE id = ${assetId} AND tenant_id = ${tenantId}
            `
          }
          if (input.tags_to_remove && input.tags_to_remove.length > 0) {
            await sql`
              UPDATE dam_assets
              SET manual_tags = array_remove_all(
                manual_tags,
                ${JSON.stringify(input.tags_to_remove)}::text[]
              ),
              updated_at = NOW()
              WHERE id = ${assetId} AND tenant_id = ${tenantId}
            `
          }
          break
      }
      result.processed++
    } catch (error) {
      result.failed++
      result.errors.push({
        asset_id: assetId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  result.success = result.failed === 0

  return result
}

/**
 * Increment view count for an asset
 */
export async function incrementViewCount(tenantId: string, assetId: string): Promise<void> {
  await sql`
    UPDATE dam_assets
    SET view_count = view_count + 1
    WHERE id = ${assetId} AND tenant_id = ${tenantId}
  `
}

/**
 * Increment download count for an asset
 */
export async function incrementDownloadCount(tenantId: string, assetId: string): Promise<void> {
  await sql`
    UPDATE dam_assets
    SET download_count = download_count + 1
    WHERE id = ${assetId} AND tenant_id = ${tenantId}
  `
}

/**
 * Check for duplicate files by hash
 */
export async function findDuplicateByHash(
  tenantId: string,
  fileHash: string
): Promise<Asset | null> {
  const result = await sql<Asset>`
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
      AND file_hash = ${fileHash}
      AND deleted_at IS NULL
    LIMIT 1
  `
  return result.rows[0] || null
}

/**
 * Get asset statistics for a tenant
 */
export async function getAssetStats(tenantId: string): Promise<{
  total: number
  by_type: Record<string, number>
  total_size_bytes: number
  favorites: number
  archived: number
}> {
  const result = await sql<{
    total: string
    images: string
    videos: string
    audio: string
    documents: string
    total_size: string
    favorites: string
    archived: string
  }>`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE asset_type = 'image') as images,
      COUNT(*) FILTER (WHERE asset_type = 'video') as videos,
      COUNT(*) FILTER (WHERE asset_type = 'audio') as audio,
      COUNT(*) FILTER (WHERE asset_type = 'document') as documents,
      COALESCE(SUM(file_size_bytes), 0) as total_size,
      COUNT(*) FILTER (WHERE is_favorite = true) as favorites,
      COUNT(*) FILTER (WHERE is_archived = true) as archived
    FROM dam_assets
    WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
  `

  const row = result.rows[0]!
  return {
    total: Number(row.total),
    by_type: {
      image: Number(row.images),
      video: Number(row.videos),
      audio: Number(row.audio),
      document: Number(row.documents),
    },
    total_size_bytes: Number(row.total_size),
    favorites: Number(row.favorites),
    archived: Number(row.archived),
  }
}
