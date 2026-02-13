/**
 * @cgk-platform/video - Database operations
 *
 * Tenant-isolated CRUD operations for videos, folders, permissions, and views.
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries MUST use withTenant() wrapper
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  CreateFolderInput,
  CreateVideoInput,
  ListOptions,
  PaginatedResult,
  UpdateFolderInput,
  UpdateVideoInput,
  Video,
  VideoFolder,
  VideoStatus,
} from './types.js'

// ============================================================================
// Videos CRUD
// ============================================================================

/**
 * Get a single video by ID
 */
export async function getVideo(
  tenantId: string,
  videoId: string,
): Promise<Video | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        user_id as "userId",
        folder_id as "folderId",
        title,
        description,
        duration_seconds as "durationSeconds",
        file_size_bytes as "fileSizeBytes",
        recording_type as "recordingType",
        mux_upload_id as "muxUploadId",
        mux_asset_id as "muxAssetId",
        mux_playback_id as "muxPlaybackId",
        thumbnail_url as "thumbnailUrl",
        status,
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
      FROM videos
      WHERE id = ${videoId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `
    return (result.rows[0] as Video | undefined) ?? null
  })
}

/**
 * Get a video by Mux upload ID (used for webhook handling)
 */
export async function getVideoByMuxUploadId(
  tenantId: string,
  muxUploadId: string,
): Promise<Video | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        user_id as "userId",
        folder_id as "folderId",
        title,
        description,
        duration_seconds as "durationSeconds",
        file_size_bytes as "fileSizeBytes",
        recording_type as "recordingType",
        mux_upload_id as "muxUploadId",
        mux_asset_id as "muxAssetId",
        mux_playback_id as "muxPlaybackId",
        thumbnail_url as "thumbnailUrl",
        status,
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
      FROM videos
      WHERE mux_upload_id = ${muxUploadId}
        AND tenant_id = ${tenantId}
    `
    return (result.rows[0] as Video | undefined) ?? null
  })
}

/**
 * Get a video by Mux asset ID (used for webhook handling)
 */
export async function getVideoByMuxAssetId(
  tenantId: string,
  muxAssetId: string,
): Promise<Video | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        user_id as "userId",
        folder_id as "folderId",
        title,
        description,
        duration_seconds as "durationSeconds",
        file_size_bytes as "fileSizeBytes",
        recording_type as "recordingType",
        mux_upload_id as "muxUploadId",
        mux_asset_id as "muxAssetId",
        mux_playback_id as "muxPlaybackId",
        thumbnail_url as "thumbnailUrl",
        status,
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
      FROM videos
      WHERE mux_asset_id = ${muxAssetId}
        AND tenant_id = ${tenantId}
    `
    return (result.rows[0] as Video | undefined) ?? null
  })
}

/**
 * List videos with pagination and filtering
 */
export async function getVideos(
  tenantId: string,
  userId: string,
  options: ListOptions = {},
): Promise<PaginatedResult<Video>> {
  const {
    limit = 20,
    offset = 0,
    search = '',
    status,
    folderId,
    sort = 'created_at',
    dir = 'desc',
  } = options

  return withTenant(tenantId, async () => {
    // Build conditions based on filters
    let countQuery: Promise<{ rows: Array<{ count: string }> }>
    let dataQuery: Promise<{ rows: Video[] }>

    // Handle different sort and filter combinations
    if (search && status && folderId) {
      countQuery = sql`
        SELECT COUNT(*) as count
        FROM videos
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
          AND search_vector @@ plainto_tsquery('english', ${search})
          AND status = ${status}
          AND folder_id = ${folderId}
      `
    } else if (search && status) {
      countQuery = sql`
        SELECT COUNT(*) as count
        FROM videos
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
          AND search_vector @@ plainto_tsquery('english', ${search})
          AND status = ${status}
      `
    } else if (search && folderId) {
      countQuery = sql`
        SELECT COUNT(*) as count
        FROM videos
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
          AND search_vector @@ plainto_tsquery('english', ${search})
          AND folder_id = ${folderId}
      `
    } else if (status && folderId) {
      countQuery = sql`
        SELECT COUNT(*) as count
        FROM videos
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
          AND status = ${status}
          AND folder_id = ${folderId}
      `
    } else if (search) {
      countQuery = sql`
        SELECT COUNT(*) as count
        FROM videos
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
          AND search_vector @@ plainto_tsquery('english', ${search})
      `
    } else if (status) {
      countQuery = sql`
        SELECT COUNT(*) as count
        FROM videos
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
          AND status = ${status}
      `
    } else if (folderId) {
      countQuery = sql`
        SELECT COUNT(*) as count
        FROM videos
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
          AND folder_id = ${folderId}
      `
    } else if (folderId === null) {
      countQuery = sql`
        SELECT COUNT(*) as count
        FROM videos
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
          AND folder_id IS NULL
      `
    } else {
      countQuery = sql`
        SELECT COUNT(*) as count
        FROM videos
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
      `
    }

    const countResult = await countQuery
    const totalCount = parseInt(String(countResult.rows[0]?.count ?? '0'), 10)

    // Execute the appropriate sorted query
    if (sort === 'title' && dir === 'asc') {
      dataQuery = sql`
        SELECT
          id, tenant_id as "tenantId", user_id as "userId", folder_id as "folderId",
          title, description, duration_seconds as "durationSeconds",
          file_size_bytes as "fileSizeBytes", recording_type as "recordingType",
          mux_upload_id as "muxUploadId", mux_asset_id as "muxAssetId",
          mux_playback_id as "muxPlaybackId", thumbnail_url as "thumbnailUrl",
          status, error_message as "errorMessage", created_at as "createdAt",
          updated_at as "updatedAt", deleted_at as "deletedAt"
        FROM videos
        WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND deleted_at IS NULL
        ORDER BY title ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (sort === 'title' && dir === 'desc') {
      dataQuery = sql`
        SELECT
          id, tenant_id as "tenantId", user_id as "userId", folder_id as "folderId",
          title, description, duration_seconds as "durationSeconds",
          file_size_bytes as "fileSizeBytes", recording_type as "recordingType",
          mux_upload_id as "muxUploadId", mux_asset_id as "muxAssetId",
          mux_playback_id as "muxPlaybackId", thumbnail_url as "thumbnailUrl",
          status, error_message as "errorMessage", created_at as "createdAt",
          updated_at as "updatedAt", deleted_at as "deletedAt"
        FROM videos
        WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND deleted_at IS NULL
        ORDER BY title DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (sort === 'duration_seconds' && dir === 'asc') {
      dataQuery = sql`
        SELECT
          id, tenant_id as "tenantId", user_id as "userId", folder_id as "folderId",
          title, description, duration_seconds as "durationSeconds",
          file_size_bytes as "fileSizeBytes", recording_type as "recordingType",
          mux_upload_id as "muxUploadId", mux_asset_id as "muxAssetId",
          mux_playback_id as "muxPlaybackId", thumbnail_url as "thumbnailUrl",
          status, error_message as "errorMessage", created_at as "createdAt",
          updated_at as "updatedAt", deleted_at as "deletedAt"
        FROM videos
        WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND deleted_at IS NULL
        ORDER BY duration_seconds ASC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (sort === 'duration_seconds' && dir === 'desc') {
      dataQuery = sql`
        SELECT
          id, tenant_id as "tenantId", user_id as "userId", folder_id as "folderId",
          title, description, duration_seconds as "durationSeconds",
          file_size_bytes as "fileSizeBytes", recording_type as "recordingType",
          mux_upload_id as "muxUploadId", mux_asset_id as "muxAssetId",
          mux_playback_id as "muxPlaybackId", thumbnail_url as "thumbnailUrl",
          status, error_message as "errorMessage", created_at as "createdAt",
          updated_at as "updatedAt", deleted_at as "deletedAt"
        FROM videos
        WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND deleted_at IS NULL
        ORDER BY duration_seconds DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (dir === 'asc') {
      dataQuery = sql`
        SELECT
          id, tenant_id as "tenantId", user_id as "userId", folder_id as "folderId",
          title, description, duration_seconds as "durationSeconds",
          file_size_bytes as "fileSizeBytes", recording_type as "recordingType",
          mux_upload_id as "muxUploadId", mux_asset_id as "muxAssetId",
          mux_playback_id as "muxPlaybackId", thumbnail_url as "thumbnailUrl",
          status, error_message as "errorMessage", created_at as "createdAt",
          updated_at as "updatedAt", deleted_at as "deletedAt"
        FROM videos
        WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND deleted_at IS NULL
        ORDER BY created_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      dataQuery = sql`
        SELECT
          id, tenant_id as "tenantId", user_id as "userId", folder_id as "folderId",
          title, description, duration_seconds as "durationSeconds",
          file_size_bytes as "fileSizeBytes", recording_type as "recordingType",
          mux_upload_id as "muxUploadId", mux_asset_id as "muxAssetId",
          mux_playback_id as "muxPlaybackId", thumbnail_url as "thumbnailUrl",
          status, error_message as "errorMessage", created_at as "createdAt",
          updated_at as "updatedAt", deleted_at as "deletedAt"
        FROM videos
        WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const result = await dataQuery

    return {
      rows: result.rows as Video[],
      totalCount,
    }
  })
}

/**
 * Create a new video record
 */
export async function createVideo(
  tenantId: string,
  userId: string,
  input: CreateVideoInput,
  muxUploadId?: string,
): Promise<Video> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO videos (
        tenant_id,
        user_id,
        title,
        description,
        recording_type,
        folder_id,
        mux_upload_id,
        status
      ) VALUES (
        ${tenantId},
        ${userId},
        ${input.title},
        ${input.description ?? null},
        ${input.recordingType ?? 'upload'},
        ${input.folderId ?? null},
        ${muxUploadId ?? null},
        'uploading'
      )
      RETURNING
        id,
        tenant_id as "tenantId",
        user_id as "userId",
        folder_id as "folderId",
        title,
        description,
        duration_seconds as "durationSeconds",
        file_size_bytes as "fileSizeBytes",
        recording_type as "recordingType",
        mux_upload_id as "muxUploadId",
        mux_asset_id as "muxAssetId",
        mux_playback_id as "muxPlaybackId",
        thumbnail_url as "thumbnailUrl",
        status,
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
    `
    return result.rows[0] as Video
  })
}

/**
 * Update a video record
 */
export async function updateVideo(
  tenantId: string,
  videoId: string,
  input: UpdateVideoInput,
): Promise<Video | null> {
  return withTenant(tenantId, async () => {
    // If no updates, just return the current video
    if (
      input.title === undefined &&
      input.description === undefined &&
      input.folderId === undefined
    ) {
      return getVideo(tenantId, videoId)
    }

    // Get current values
    const current = await getVideo(tenantId, videoId)
    if (!current) return null

    // Apply updates
    const title = input.title !== undefined ? input.title : current.title
    const description =
      input.description !== undefined ? input.description : current.description
    const folderId =
      input.folderId !== undefined ? input.folderId : current.folderId

    const result = await sql`
      UPDATE videos
      SET
        title = ${title},
        description = ${description},
        folder_id = ${folderId},
        updated_at = now()
      WHERE id = ${videoId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      RETURNING
        id,
        tenant_id as "tenantId",
        user_id as "userId",
        folder_id as "folderId",
        title,
        description,
        duration_seconds as "durationSeconds",
        file_size_bytes as "fileSizeBytes",
        recording_type as "recordingType",
        mux_upload_id as "muxUploadId",
        mux_asset_id as "muxAssetId",
        mux_playback_id as "muxPlaybackId",
        thumbnail_url as "thumbnailUrl",
        status,
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
    `
    return (result.rows[0] as Video | undefined) ?? null
  })
}

/**
 * Update video status (used by webhooks)
 */
export async function updateVideoStatus(
  tenantId: string,
  videoId: string,
  status: VideoStatus,
  errorMessage?: string,
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE videos
      SET
        status = ${status},
        error_message = ${errorMessage ?? null},
        updated_at = now()
      WHERE id = ${videoId}
        AND tenant_id = ${tenantId}
    `
  })
}

/**
 * Update video with Mux asset info (used by webhooks)
 */
export async function updateVideoMuxInfo(
  tenantId: string,
  videoId: string,
  muxAssetId: string,
  muxPlaybackId: string | null,
  durationSeconds: number | null,
  thumbnailUrl: string | null,
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE videos
      SET
        mux_asset_id = ${muxAssetId},
        mux_playback_id = ${muxPlaybackId},
        duration_seconds = ${durationSeconds},
        thumbnail_url = ${thumbnailUrl},
        updated_at = now()
      WHERE id = ${videoId}
        AND tenant_id = ${tenantId}
    `
  })
}

/**
 * Soft delete a video
 */
export async function deleteVideo(
  tenantId: string,
  videoId: string,
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE videos
      SET
        status = 'deleted',
        deleted_at = now(),
        updated_at = now()
      WHERE id = ${videoId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `
    return (result.rowCount ?? 0) > 0
  })
}

// ============================================================================
// Folders CRUD
// ============================================================================

/**
 * Get a folder by ID
 */
export async function getFolder(
  tenantId: string,
  folderId: string,
): Promise<VideoFolder | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        user_id as "userId",
        parent_id as "parentId",
        name,
        created_at as "createdAt"
      FROM video_folders
      WHERE id = ${folderId}
        AND tenant_id = ${tenantId}
    `
    return (result.rows[0] as VideoFolder | undefined) ?? null
  })
}

/**
 * List folders for a user
 */
export async function getFolders(
  tenantId: string,
  userId: string,
  parentId?: string | null,
): Promise<VideoFolder[]> {
  return withTenant(tenantId, async () => {
    if (parentId === null) {
      // Get root folders
      const result = await sql`
        SELECT
          id,
          tenant_id as "tenantId",
          user_id as "userId",
          parent_id as "parentId",
          name,
          created_at as "createdAt"
        FROM video_folders
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND parent_id IS NULL
        ORDER BY name ASC
      `
      return result.rows as VideoFolder[]
    } else if (parentId) {
      // Get children of specific parent
      const result = await sql`
        SELECT
          id,
          tenant_id as "tenantId",
          user_id as "userId",
          parent_id as "parentId",
          name,
          created_at as "createdAt"
        FROM video_folders
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND parent_id = ${parentId}
        ORDER BY name ASC
      `
      return result.rows as VideoFolder[]
    } else {
      // Get all folders
      const result = await sql`
        SELECT
          id,
          tenant_id as "tenantId",
          user_id as "userId",
          parent_id as "parentId",
          name,
          created_at as "createdAt"
        FROM video_folders
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
        ORDER BY name ASC
      `
      return result.rows as VideoFolder[]
    }
  })
}

/**
 * Get all folders for a user (flat list)
 */
export async function getAllFolders(
  tenantId: string,
  userId: string,
): Promise<VideoFolder[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        user_id as "userId",
        parent_id as "parentId",
        name,
        created_at as "createdAt"
      FROM video_folders
      WHERE tenant_id = ${tenantId}
        AND user_id = ${userId}
      ORDER BY name ASC
    `
    return result.rows as VideoFolder[]
  })
}

/**
 * Create a folder
 */
export async function createFolder(
  tenantId: string,
  userId: string,
  input: CreateFolderInput,
): Promise<VideoFolder> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO video_folders (
        tenant_id,
        user_id,
        name,
        parent_id
      ) VALUES (
        ${tenantId},
        ${userId},
        ${input.name},
        ${input.parentId ?? null}
      )
      RETURNING
        id,
        tenant_id as "tenantId",
        user_id as "userId",
        parent_id as "parentId",
        name,
        created_at as "createdAt"
    `
    return result.rows[0] as VideoFolder
  })
}

/**
 * Update a folder
 */
export async function updateFolder(
  tenantId: string,
  folderId: string,
  input: UpdateFolderInput,
): Promise<VideoFolder | null> {
  return withTenant(tenantId, async () => {
    if (input.name === undefined && input.parentId === undefined) {
      return getFolder(tenantId, folderId)
    }

    // Get current folder
    const current = await getFolder(tenantId, folderId)
    if (!current) return null

    // Apply updates
    const name = input.name !== undefined ? input.name : current.name
    const parentId =
      input.parentId !== undefined ? input.parentId : current.parentId

    const result = await sql`
      UPDATE video_folders
      SET
        name = ${name},
        parent_id = ${parentId}
      WHERE id = ${folderId}
        AND tenant_id = ${tenantId}
      RETURNING
        id,
        tenant_id as "tenantId",
        user_id as "userId",
        parent_id as "parentId",
        name,
        created_at as "createdAt"
    `
    return (result.rows[0] as VideoFolder | undefined) ?? null
  })
}

/**
 * Delete a folder (cascades to subfolders)
 */
export async function deleteFolder(
  tenantId: string,
  folderId: string,
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM video_folders
      WHERE id = ${folderId}
        AND tenant_id = ${tenantId}
    `
    return (result.rowCount ?? 0) > 0
  })
}
