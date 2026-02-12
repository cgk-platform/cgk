/**
 * Google Drive Connection Database Operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk/db'

import type {
  GDriveConnection,
  CreateGDriveConnectionInput,
  GDriveFileMapping,
} from '../types.js'
import { encryptToken } from './tokens.js'

/**
 * List all connections for a tenant
 */
export async function getConnections(tenantId: string): Promise<GDriveConnection[]> {
  const result = await sql<GDriveConnection>`
    SELECT id, tenant_id, user_id, name, folder_id, folder_name,
           access_token_encrypted, refresh_token_encrypted, token_expires_at,
           sync_mode, auto_sync, last_sync_at, last_sync_status,
           sync_page_token, watch_channel_id, watch_channel_expiry,
           watch_resource_id, is_active, needs_reauth, last_error,
           created_at, updated_at
    FROM dam_gdrive_connections
    WHERE tenant_id = ${tenantId}
    ORDER BY name ASC
  `
  return result.rows
}

/**
 * Get a connection by ID
 */
export async function getConnectionById(
  tenantId: string,
  connectionId: string
): Promise<GDriveConnection | null> {
  const result = await sql<GDriveConnection>`
    SELECT id, tenant_id, user_id, name, folder_id, folder_name,
           access_token_encrypted, refresh_token_encrypted, token_expires_at,
           sync_mode, auto_sync, last_sync_at, last_sync_status,
           sync_page_token, watch_channel_id, watch_channel_expiry,
           watch_resource_id, is_active, needs_reauth, last_error,
           created_at, updated_at
    FROM dam_gdrive_connections
    WHERE id = ${connectionId} AND tenant_id = ${tenantId}
  `
  return result.rows[0] || null
}

/**
 * Create a new connection
 */
export async function createConnection(
  tenantId: string,
  userId: string,
  input: CreateGDriveConnectionInput
): Promise<GDriveConnection> {
  const accessTokenEncrypted = encryptToken(input.access_token)
  const refreshTokenEncrypted = encryptToken(input.refresh_token)

  const result = await sql<GDriveConnection>`
    INSERT INTO dam_gdrive_connections (
      tenant_id, user_id, name, folder_id, folder_name,
      access_token_encrypted, refresh_token_encrypted, token_expires_at,
      sync_mode, auto_sync
    ) VALUES (
      ${tenantId}, ${userId}, ${input.name}, ${input.folder_id},
      ${input.folder_name || null}, ${accessTokenEncrypted}, ${refreshTokenEncrypted},
      ${input.token_expires_at || null}::timestamptz, ${input.sync_mode || 'one_way'},
      ${input.auto_sync ?? true}
    )
    RETURNING id, tenant_id, user_id, name, folder_id, folder_name,
              access_token_encrypted, refresh_token_encrypted, token_expires_at,
              sync_mode, auto_sync, last_sync_at, last_sync_status,
              sync_page_token, watch_channel_id, watch_channel_expiry,
              watch_resource_id, is_active, needs_reauth, last_error,
              created_at, updated_at
  `
  return result.rows[0]!
}

/**
 * Update connection sync settings
 */
export async function updateConnectionSettings(
  tenantId: string,
  connectionId: string,
  settings: { name?: string; auto_sync?: boolean; sync_mode?: 'one_way' | 'two_way' }
): Promise<GDriveConnection | null> {
  const current = await getConnectionById(tenantId, connectionId)
  if (!current) return null

  const result = await sql<GDriveConnection>`
    UPDATE dam_gdrive_connections SET
      name = ${settings.name ?? current.name},
      auto_sync = ${settings.auto_sync ?? current.auto_sync},
      sync_mode = ${settings.sync_mode ?? current.sync_mode},
      updated_at = NOW()
    WHERE id = ${connectionId} AND tenant_id = ${tenantId}
    RETURNING id, tenant_id, user_id, name, folder_id, folder_name,
              access_token_encrypted, refresh_token_encrypted, token_expires_at,
              sync_mode, auto_sync, last_sync_at, last_sync_status,
              sync_page_token, watch_channel_id, watch_channel_expiry,
              watch_resource_id, is_active, needs_reauth, last_error,
              created_at, updated_at
  `
  return result.rows[0] || null
}

/**
 * Delete a connection and its file mappings
 */
export async function deleteConnection(
  tenantId: string,
  connectionId: string
): Promise<boolean> {
  // Delete file mappings
  await sql`
    DELETE FROM dam_gdrive_file_mappings
    WHERE connection_id = ${connectionId} AND tenant_id = ${tenantId}
  `

  // Delete connection
  const result = await sql`
    DELETE FROM dam_gdrive_connections
    WHERE id = ${connectionId} AND tenant_id = ${tenantId}
  `

  return (result.rowCount ?? 0) > 0
}

/**
 * Mark connection as needing re-authorization
 */
export async function markConnectionNeedsReauth(
  tenantId: string,
  connectionId: string,
  error?: string
): Promise<void> {
  await sql`
    UPDATE dam_gdrive_connections SET
      needs_reauth = true,
      last_error = ${error || 'Authorization expired'},
      updated_at = NOW()
    WHERE id = ${connectionId} AND tenant_id = ${tenantId}
  `
}

/**
 * Update watch channel info
 */
export async function updateWatchChannel(
  tenantId: string,
  connectionId: string,
  channelId: string,
  resourceId: string,
  expiry: Date
): Promise<void> {
  await sql`
    UPDATE dam_gdrive_connections SET
      watch_channel_id = ${channelId},
      watch_resource_id = ${resourceId},
      watch_channel_expiry = ${expiry.toISOString()}::timestamptz,
      updated_at = NOW()
    WHERE id = ${connectionId} AND tenant_id = ${tenantId}
  `
}

/**
 * Clear watch channel info
 */
export async function clearWatchChannel(
  tenantId: string,
  connectionId: string
): Promise<void> {
  await sql`
    UPDATE dam_gdrive_connections SET
      watch_channel_id = NULL,
      watch_resource_id = NULL,
      watch_channel_expiry = NULL,
      updated_at = NOW()
    WHERE id = ${connectionId} AND tenant_id = ${tenantId}
  `
}

/**
 * Get file mappings for a connection
 */
export async function getFileMappings(
  tenantId: string,
  connectionId: string,
  limit: number = 100,
  offset: number = 0
): Promise<{ mappings: GDriveFileMapping[]; totalCount: number }> {
  const dataResult = await sql<GDriveFileMapping>`
    SELECT id, tenant_id, connection_id, gdrive_file_id, dam_asset_id,
           gdrive_name, gdrive_path, gdrive_mime_type, gdrive_modified_at,
           sync_status, last_sync_at, error_message
    FROM dam_gdrive_file_mappings
    WHERE connection_id = ${connectionId} AND tenant_id = ${tenantId}
    ORDER BY gdrive_path ASC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countResult = await sql<{ count: string }>`
    SELECT COUNT(*) as count
    FROM dam_gdrive_file_mappings
    WHERE connection_id = ${connectionId} AND tenant_id = ${tenantId}
  `

  return {
    mappings: dataResult.rows,
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

/**
 * Update file mapping with imported asset ID
 */
export async function linkMappingToAsset(
  tenantId: string,
  mappingId: string,
  assetId: string
): Promise<void> {
  await sql`
    UPDATE dam_gdrive_file_mappings SET
      dam_asset_id = ${assetId},
      sync_status = 'imported',
      last_sync_at = NOW(),
      error_message = NULL
    WHERE id = ${mappingId} AND tenant_id = ${tenantId}
  `
}

/**
 * Mark file mapping as failed
 */
export async function markMappingFailed(
  tenantId: string,
  mappingId: string,
  error: string
): Promise<void> {
  await sql`
    UPDATE dam_gdrive_file_mappings SET
      sync_status = 'failed',
      last_sync_at = NOW(),
      error_message = ${error}
    WHERE id = ${mappingId} AND tenant_id = ${tenantId}
  `
}

/**
 * Mark file mapping as skipped
 */
export async function markMappingSkipped(
  tenantId: string,
  mappingId: string
): Promise<void> {
  await sql`
    UPDATE dam_gdrive_file_mappings SET
      sync_status = 'skipped',
      last_sync_at = NOW()
    WHERE id = ${mappingId} AND tenant_id = ${tenantId}
  `
}

/**
 * Get connection by watch channel ID (for webhook handling)
 */
export async function getConnectionByChannelId(
  channelId: string
): Promise<GDriveConnection | null> {
  const result = await sql<GDriveConnection>`
    SELECT id, tenant_id, user_id, name, folder_id, folder_name,
           access_token_encrypted, refresh_token_encrypted, token_expires_at,
           sync_mode, auto_sync, last_sync_at, last_sync_status,
           sync_page_token, watch_channel_id, watch_channel_expiry,
           watch_resource_id, is_active, needs_reauth, last_error,
           created_at, updated_at
    FROM dam_gdrive_connections
    WHERE watch_channel_id = ${channelId}
  `
  return result.rows[0] || null
}

/**
 * Get connections with expiring watch channels
 */
export async function getConnectionsWithExpiringChannels(
  hoursBeforeExpiry: number = 24
): Promise<GDriveConnection[]> {
  const result = await sql<GDriveConnection>`
    SELECT id, tenant_id, user_id, name, folder_id, folder_name,
           access_token_encrypted, refresh_token_encrypted, token_expires_at,
           sync_mode, auto_sync, last_sync_at, last_sync_status,
           sync_page_token, watch_channel_id, watch_channel_expiry,
           watch_resource_id, is_active, needs_reauth, last_error,
           created_at, updated_at
    FROM dam_gdrive_connections
    WHERE is_active = true
      AND watch_channel_id IS NOT NULL
      AND watch_channel_expiry <= NOW() + INTERVAL '${hoursBeforeExpiry} hours'
    ORDER BY watch_channel_expiry ASC
  `
  return result.rows
}
