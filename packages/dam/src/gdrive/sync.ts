/**
 * Google Drive Sync Logic
 * Handles initial and incremental sync of Drive folders
 */

import { sql } from '@cgk-platform/db'

import type { GDriveConnection, GDriveFileMapping, ImportQueueItem } from '../types.js'
import {
  createDriveClient,
  listFilesRecursively,
  listChanges,
  getStartPageToken,
  isSupportedDriveFile,
  type DriveFile,
} from './api.js'
import { getOAuthConfigFromEnv } from './oauth.js'

export interface SyncResult {
  success: boolean
  filesProcessed: number
  filesAdded: number
  filesUpdated: number
  filesRemoved: number
  errors: string[]
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
 * Update connection tokens after refresh
 */
async function updateConnectionTokens(
  connectionId: string,
  accessTokenEncrypted: string,
  expiryDate: number
): Promise<void> {
  await sql`
    UPDATE dam_gdrive_connections SET
      access_token_encrypted = ${accessTokenEncrypted},
      token_expires_at = ${new Date(expiryDate).toISOString()}::timestamptz,
      needs_reauth = false,
      updated_at = NOW()
    WHERE id = ${connectionId}
  `
}

/**
 * Perform initial sync of a Drive folder
 */
export async function initialSync(
  tenantId: string,
  connection: GDriveConnection
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    filesProcessed: 0,
    filesAdded: 0,
    filesUpdated: 0,
    filesRemoved: 0,
    errors: [],
  }

  try {
    const oauthConfig = getOAuthConfigFromEnv()
    const drive = await createDriveClient(
      oauthConfig,
      connection,
      async (newToken, expiry) => {
        await updateConnectionTokens(connection.id, newToken, expiry)
      }
    )

    // List all files in the folder recursively
    const files = await listFilesRecursively(drive, connection.folder_id)

    for (const file of files) {
      result.filesProcessed++

      if (!isSupportedDriveFile(file.mimeType)) {
        continue
      }

      // Create or update file mapping
      await createOrUpdateFileMapping(tenantId, connection.id, file)

      // Queue for import
      await queueFileForImport(tenantId, file, connection.folder_id)

      result.filesAdded++
    }

    // Get initial page token for change tracking
    const pageToken = await getStartPageToken(drive)

    // Update connection status
    await sql`
      UPDATE dam_gdrive_connections SET
        sync_page_token = ${pageToken},
        last_sync_at = NOW(),
        last_sync_status = 'success',
        last_error = NULL,
        updated_at = NOW()
      WHERE id = ${connection.id}
    `
  } catch (error) {
    result.success = false
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMessage)

    await sql`
      UPDATE dam_gdrive_connections SET
        last_sync_at = NOW(),
        last_sync_status = 'failed',
        last_error = ${errorMessage},
        needs_reauth = ${errorMessage.includes('invalid_grant') || errorMessage.includes('401')},
        updated_at = NOW()
      WHERE id = ${connection.id}
    `
  }

  return result
}

/**
 * Perform incremental sync using change tracking
 */
export async function incrementalSync(
  tenantId: string,
  connection: GDriveConnection
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    filesProcessed: 0,
    filesAdded: 0,
    filesUpdated: 0,
    filesRemoved: 0,
    errors: [],
  }

  if (!connection.sync_page_token) {
    // No page token, do initial sync instead
    return initialSync(tenantId, connection)
  }

  try {
    const oauthConfig = getOAuthConfigFromEnv()
    const drive = await createDriveClient(
      oauthConfig,
      connection,
      async (newToken, expiry) => {
        await updateConnectionTokens(connection.id, newToken, expiry)
      }
    )

    let pageToken = connection.sync_page_token

    // Process all changes
    const changesResult = await listChanges(drive, pageToken, connection.folder_id)

    for (const change of changesResult.changes) {
      result.filesProcessed++

      if (change.removed) {
        // File was removed
        await markFileMappingRemoved(tenantId, connection.id, change.fileId)
        result.filesRemoved++
      } else if (change.file) {
        if (!isSupportedDriveFile(change.file.mimeType)) {
          continue
        }

        // Check if this is a new file or update
        const existing = await getFileMappingByDriveId(tenantId, connection.id, change.fileId)

        if (existing) {
          await updateFileMapping(tenantId, connection.id, change.file)
          result.filesUpdated++
        } else {
          await createOrUpdateFileMapping(tenantId, connection.id, change.file)
          await queueFileForImport(tenantId, change.file, connection.folder_id)
          result.filesAdded++
        }
      }
    }

    // Update connection with new page token
    await sql`
      UPDATE dam_gdrive_connections SET
        sync_page_token = ${changesResult.newStartPageToken},
        last_sync_at = NOW(),
        last_sync_status = 'success',
        last_error = NULL,
        updated_at = NOW()
      WHERE id = ${connection.id}
    `
  } catch (error) {
    result.success = false
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMessage)

    await sql`
      UPDATE dam_gdrive_connections SET
        last_sync_at = NOW(),
        last_sync_status = 'failed',
        last_error = ${errorMessage},
        needs_reauth = ${errorMessage.includes('invalid_grant') || errorMessage.includes('401')},
        updated_at = NOW()
      WHERE id = ${connection.id}
    `
  }

  return result
}

/**
 * Create or update a file mapping
 */
async function createOrUpdateFileMapping(
  tenantId: string,
  connectionId: string,
  file: DriveFile
): Promise<void> {
  await sql`
    INSERT INTO dam_gdrive_file_mappings (
      tenant_id, connection_id, gdrive_file_id, gdrive_name,
      gdrive_path, gdrive_mime_type, gdrive_modified_at, sync_status
    ) VALUES (
      ${tenantId}, ${connectionId}, ${file.id}, ${file.name},
      ${file.fullPath || file.name}, ${file.mimeType},
      ${file.modifiedTime}::timestamptz, 'pending'
    )
    ON CONFLICT (connection_id, gdrive_file_id) DO UPDATE SET
      gdrive_name = EXCLUDED.gdrive_name,
      gdrive_path = EXCLUDED.gdrive_path,
      gdrive_mime_type = EXCLUDED.gdrive_mime_type,
      gdrive_modified_at = EXCLUDED.gdrive_modified_at,
      sync_status = CASE
        WHEN dam_gdrive_file_mappings.sync_status = 'removed' THEN 'pending'
        ELSE dam_gdrive_file_mappings.sync_status
      END
  `
}

/**
 * Update an existing file mapping
 */
async function updateFileMapping(
  tenantId: string,
  connectionId: string,
  file: DriveFile
): Promise<void> {
  await sql`
    UPDATE dam_gdrive_file_mappings SET
      gdrive_name = ${file.name},
      gdrive_path = ${file.fullPath || file.name},
      gdrive_mime_type = ${file.mimeType},
      gdrive_modified_at = ${file.modifiedTime}::timestamptz,
      last_sync_at = NOW()
    WHERE connection_id = ${connectionId}
      AND gdrive_file_id = ${file.id}
      AND tenant_id = ${tenantId}
  `
}

/**
 * Mark a file mapping as removed
 */
async function markFileMappingRemoved(
  tenantId: string,
  connectionId: string,
  gdriveFileId: string
): Promise<void> {
  await sql`
    UPDATE dam_gdrive_file_mappings SET
      sync_status = 'removed',
      last_sync_at = NOW()
    WHERE connection_id = ${connectionId}
      AND gdrive_file_id = ${gdriveFileId}
      AND tenant_id = ${tenantId}
  `
}

/**
 * Get file mapping by Drive file ID
 */
async function getFileMappingByDriveId(
  tenantId: string,
  connectionId: string,
  gdriveFileId: string
): Promise<GDriveFileMapping | null> {
  const result = await sql<GDriveFileMapping>`
    SELECT id, tenant_id, connection_id, gdrive_file_id, dam_asset_id,
           gdrive_name, gdrive_path, gdrive_mime_type, gdrive_modified_at,
           sync_status, last_sync_at, error_message
    FROM dam_gdrive_file_mappings
    WHERE connection_id = ${connectionId}
      AND gdrive_file_id = ${gdriveFileId}
      AND tenant_id = ${tenantId}
  `
  return result.rows[0] || null
}

/**
 * Queue a file for import review
 */
async function queueFileForImport(
  tenantId: string,
  file: DriveFile,
  folderId: string
): Promise<void> {
  // Check if already queued
  const existing = await sql<ImportQueueItem>`
    SELECT id FROM dam_import_queue_items
    WHERE tenant_id = ${tenantId}
      AND source_type = 'gdrive'
      AND source_file_id = ${file.id}
      AND status IN ('pending', 'in_progress')
  `

  if (existing.rows.length > 0) {
    return // Already queued
  }

  await sql`
    INSERT INTO dam_import_queue_items (
      tenant_id, source_type, source_file_id, source_folder_path,
      file_name, file_size_bytes, mime_type, preview_url,
      suggested_title, status, priority
    ) VALUES (
      ${tenantId}, 'gdrive', ${file.id}, ${file.fullPath || folderId},
      ${file.name}, ${file.size}, ${file.mimeType}, ${file.thumbnailLink || null},
      ${file.name.replace(/\.[^/.]+$/, '')}, 'pending', 0
    )
  `
}

/**
 * Get all active connections for a tenant
 */
export async function getActiveConnections(tenantId: string): Promise<GDriveConnection[]> {
  const result = await sql<GDriveConnection>`
    SELECT id, tenant_id, user_id, name, folder_id, folder_name,
           access_token_encrypted, refresh_token_encrypted, token_expires_at,
           sync_mode, auto_sync, last_sync_at, last_sync_status,
           sync_page_token, watch_channel_id, watch_channel_expiry,
           watch_resource_id, is_active, needs_reauth, last_error,
           created_at, updated_at
    FROM dam_gdrive_connections
    WHERE tenant_id = ${tenantId}
      AND is_active = true
      AND needs_reauth = false
    ORDER BY name ASC
  `
  return result.rows
}

/**
 * Get connections that need auto-sync
 */
export async function getConnectionsForAutoSync(tenantId: string): Promise<GDriveConnection[]> {
  const result = await sql<GDriveConnection>`
    SELECT id, tenant_id, user_id, name, folder_id, folder_name,
           access_token_encrypted, refresh_token_encrypted, token_expires_at,
           sync_mode, auto_sync, last_sync_at, last_sync_status,
           sync_page_token, watch_channel_id, watch_channel_expiry,
           watch_resource_id, is_active, needs_reauth, last_error,
           created_at, updated_at
    FROM dam_gdrive_connections
    WHERE tenant_id = ${tenantId}
      AND is_active = true
      AND auto_sync = true
      AND needs_reauth = false
    ORDER BY last_sync_at ASC NULLS FIRST
  `
  return result.rows
}
