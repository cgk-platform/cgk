/**
 * Collection Database Operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk/db'

import type {
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
  SmartCollectionRules,
  Asset,
} from '../types.js'

/**
 * List all collections for a tenant
 */
export async function getCollections(tenantId: string): Promise<Collection[]> {
  const result = await sql<Collection>`
    SELECT id, tenant_id, user_id, name, description, collection_type,
           cover_asset_id, smart_rules, is_public, sort_order, asset_count,
           created_at, updated_at
    FROM dam_collections
    WHERE tenant_id = ${tenantId}
    ORDER BY sort_order ASC, name ASC
  `
  return result.rows
}

/**
 * Get a collection by ID
 */
export async function getCollectionById(
  tenantId: string,
  collectionId: string
): Promise<Collection | null> {
  const result = await sql<Collection>`
    SELECT id, tenant_id, user_id, name, description, collection_type,
           cover_asset_id, smart_rules, is_public, sort_order, asset_count,
           created_at, updated_at
    FROM dam_collections
    WHERE id = ${collectionId} AND tenant_id = ${tenantId}
  `
  return result.rows[0] || null
}

/**
 * Create a new collection
 */
export async function createCollection(
  tenantId: string,
  userId: string,
  input: CreateCollectionInput
): Promise<Collection> {
  const smartRules = input.smart_rules ? JSON.stringify(input.smart_rules) : null

  const result = await sql<Collection>`
    INSERT INTO dam_collections (
      tenant_id, user_id, name, description, collection_type,
      cover_asset_id, smart_rules, is_public, sort_order
    ) VALUES (
      ${tenantId}, ${userId}, ${input.name}, ${input.description || null},
      ${input.collection_type || 'manual'}, ${input.cover_asset_id || null},
      ${smartRules}::jsonb, ${input.is_public ?? false}, ${input.sort_order ?? 0}
    )
    RETURNING id, tenant_id, user_id, name, description, collection_type,
              cover_asset_id, smart_rules, is_public, sort_order, asset_count,
              created_at, updated_at
  `
  return result.rows[0]!
}

/**
 * Update a collection
 */
export async function updateCollection(
  tenantId: string,
  input: UpdateCollectionInput
): Promise<Collection | null> {
  const current = await getCollectionById(tenantId, input.id)
  if (!current) return null

  const name = input.name ?? current.name
  const description = input.description !== undefined ? input.description : current.description
  const coverAssetId = input.cover_asset_id !== undefined
    ? input.cover_asset_id
    : current.cover_asset_id
  const smartRules = input.smart_rules !== undefined
    ? input.smart_rules
    : current.smart_rules
  const isPublic = input.is_public ?? current.is_public
  const sortOrder = input.sort_order ?? current.sort_order

  const result = await sql<Collection>`
    UPDATE dam_collections SET
      name = ${name},
      description = ${description},
      cover_asset_id = ${coverAssetId},
      smart_rules = ${smartRules ? JSON.stringify(smartRules) : null}::jsonb,
      is_public = ${isPublic},
      sort_order = ${sortOrder},
      updated_at = NOW()
    WHERE id = ${input.id} AND tenant_id = ${tenantId}
    RETURNING id, tenant_id, user_id, name, description, collection_type,
              cover_asset_id, smart_rules, is_public, sort_order, asset_count,
              created_at, updated_at
  `
  return result.rows[0] || null
}

/**
 * Delete a collection
 */
export async function deleteCollection(
  tenantId: string,
  collectionId: string
): Promise<boolean> {
  // Remove all asset associations
  await sql`
    DELETE FROM dam_collection_assets
    WHERE collection_id = ${collectionId} AND tenant_id = ${tenantId}
  `

  // Delete the collection
  const result = await sql`
    DELETE FROM dam_collections
    WHERE id = ${collectionId} AND tenant_id = ${tenantId}
  `

  return (result.rowCount ?? 0) > 0
}

/**
 * Add assets to a collection
 */
export async function addAssetsToCollection(
  tenantId: string,
  collectionId: string,
  assetIds: string[]
): Promise<number> {
  let added = 0

  for (const assetId of assetIds) {
    try {
      await sql`
        INSERT INTO dam_collection_assets (tenant_id, collection_id, asset_id, sort_order)
        VALUES (
          ${tenantId},
          ${collectionId},
          ${assetId},
          COALESCE(
            (SELECT MAX(sort_order) + 1 FROM dam_collection_assets
             WHERE collection_id = ${collectionId}),
            0
          )
        )
        ON CONFLICT (collection_id, asset_id) DO NOTHING
      `
      added++
    } catch {
      // Skip duplicates
    }
  }

  // Update asset count
  await updateCollectionAssetCount(tenantId, collectionId)

  return added
}

/**
 * Remove assets from a collection
 */
export async function removeAssetsFromCollection(
  tenantId: string,
  collectionId: string,
  assetIds: string[]
): Promise<number> {
  const result = await sql`
    DELETE FROM dam_collection_assets
    WHERE collection_id = ${collectionId}
      AND tenant_id = ${tenantId}
      AND asset_id = ANY(${JSON.stringify(assetIds)}::uuid[])
  `

  // Update asset count
  await updateCollectionAssetCount(tenantId, collectionId)

  return result.rowCount ?? 0
}

/**
 * Get assets in a collection
 */
export async function getCollectionAssets(
  tenantId: string,
  collectionId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ assets: Asset[]; totalCount: number }> {
  const dataResult = await sql<Asset>`
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
           a.created_at, a.updated_at, a.deleted_at
    FROM dam_assets a
    JOIN dam_collection_assets ca ON a.id = ca.asset_id
    WHERE ca.collection_id = ${collectionId}
      AND ca.tenant_id = ${tenantId}
      AND a.deleted_at IS NULL
    ORDER BY ca.sort_order ASC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countResult = await sql<{ count: string }>`
    SELECT COUNT(*) as count
    FROM dam_collection_assets ca
    JOIN dam_assets a ON a.id = ca.asset_id
    WHERE ca.collection_id = ${collectionId}
      AND ca.tenant_id = ${tenantId}
      AND a.deleted_at IS NULL
  `

  return {
    assets: dataResult.rows,
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

/**
 * Update the asset count for a collection
 */
export async function updateCollectionAssetCount(
  tenantId: string,
  collectionId: string
): Promise<void> {
  await sql`
    UPDATE dam_collections SET
      asset_count = (
        SELECT COUNT(*)
        FROM dam_collection_assets ca
        JOIN dam_assets a ON a.id = ca.asset_id
        WHERE ca.collection_id = ${collectionId}
          AND a.deleted_at IS NULL
      ),
      updated_at = NOW()
    WHERE id = ${collectionId} AND tenant_id = ${tenantId}
  `
}

/**
 * Reorder assets in a collection
 */
export async function reorderCollectionAssets(
  tenantId: string,
  collectionId: string,
  assetOrders: { assetId: string; sortOrder: number }[]
): Promise<void> {
  for (const { assetId, sortOrder } of assetOrders) {
    await sql`
      UPDATE dam_collection_assets
      SET sort_order = ${sortOrder}
      WHERE collection_id = ${collectionId}
        AND asset_id = ${assetId}
        AND tenant_id = ${tenantId}
    `
  }
}

/**
 * Get collections that contain a specific asset
 */
export async function getCollectionsForAsset(
  tenantId: string,
  assetId: string
): Promise<Collection[]> {
  const result = await sql<Collection>`
    SELECT c.id, c.tenant_id, c.user_id, c.name, c.description, c.collection_type,
           c.cover_asset_id, c.smart_rules, c.is_public, c.sort_order, c.asset_count,
           c.created_at, c.updated_at
    FROM dam_collections c
    JOIN dam_collection_assets ca ON c.id = ca.collection_id
    WHERE ca.asset_id = ${assetId} AND c.tenant_id = ${tenantId}
    ORDER BY c.name ASC
  `
  return result.rows
}

/**
 * Evaluate smart collection rules against an asset
 */
export function evaluateSmartCollectionRules(
  asset: Asset,
  rules: SmartCollectionRules
): boolean {
  const results = rules.rules.map((rule) => {
    const fieldValue = getAssetFieldValue(asset, rule.field)

    switch (rule.operator) {
      case 'equals':
        return fieldValue === rule.value
      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(rule.value as string)
        }
        return String(fieldValue).includes(String(rule.value))
      case 'starts_with':
        return String(fieldValue).startsWith(String(rule.value))
      case 'ends_with':
        return String(fieldValue).endsWith(String(rule.value))
      case 'greater_than':
        return Number(fieldValue) > Number(rule.value)
      case 'less_than':
        return Number(fieldValue) < Number(rule.value)
      case 'in':
        if (Array.isArray(rule.value)) {
          return rule.value.includes(fieldValue as string)
        }
        return false
      default:
        return false
    }
  })

  if (rules.match === 'all') {
    return results.every((r) => r)
  }
  return results.some((r) => r)
}

/**
 * Get a field value from an asset for rule evaluation
 */
function getAssetFieldValue(asset: Asset, field: string): unknown {
  const fieldMap: Record<string, unknown> = {
    asset_type: asset.asset_type,
    mime_type: asset.mime_type,
    file_extension: asset.file_extension,
    rights_status: asset.rights_status,
    is_favorite: asset.is_favorite,
    is_featured: asset.is_featured,
    is_archived: asset.is_archived,
    manual_tags: asset.manual_tags,
    ai_tags: asset.ai_tags,
    content_tags: asset.content_tags,
    product_tags: asset.product_tags,
    file_size_bytes: asset.file_size_bytes,
    width: asset.width,
    height: asset.height,
    duration_seconds: asset.duration_seconds,
  }

  return fieldMap[field] ?? null
}

/**
 * Refresh a smart collection's assets based on its rules
 */
export async function refreshSmartCollection(
  tenantId: string,
  collectionId: string
): Promise<number> {
  const collection = await getCollectionById(tenantId, collectionId)
  if (!collection || collection.collection_type !== 'smart' || !collection.smart_rules) {
    return 0
  }

  // Get all assets and filter by rules
  const allAssets = await sql<Asset>`
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
    WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
  `

  const matchingAssets = allAssets.rows.filter((asset) =>
    evaluateSmartCollectionRules(asset, collection.smart_rules!)
  )

  // Clear existing associations
  await sql`
    DELETE FROM dam_collection_assets
    WHERE collection_id = ${collectionId} AND tenant_id = ${tenantId}
  `

  // Add matching assets
  for (let i = 0; i < matchingAssets.length; i++) {
    const asset = matchingAssets[i]
    if (asset) {
      await sql`
        INSERT INTO dam_collection_assets (tenant_id, collection_id, asset_id, sort_order)
        VALUES (${tenantId}, ${collectionId}, ${asset.id}, ${i})
      `
    }
  }

  // Update count
  await updateCollectionAssetCount(tenantId, collectionId)

  return matchingAssets.length
}
