/**
 * @cgk-platform/video - Type definitions
 *
 * Core types for video management, folders, permissions, and analytics.
 */

/**
 * Video recording source type
 */
export type RecordingType = 'screen' | 'camera' | 'screen_camera' | 'upload'

/**
 * Video processing status
 */
export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'error' | 'deleted'

/**
 * Permission level for video access
 */
export type PermissionLevel = 'viewer' | 'commenter' | 'editor' | 'owner'

/**
 * Video entity
 */
export interface Video {
  id: string
  tenantId: string
  userId: string
  folderId: string | null

  // Metadata
  title: string
  description: string | null
  durationSeconds: number | null
  fileSizeBytes: number | null
  recordingType: RecordingType | null

  // Mux integration
  muxUploadId: string | null
  muxAssetId: string | null
  muxPlaybackId: string | null
  thumbnailUrl: string | null

  // Status
  status: VideoStatus
  errorMessage: string | null

  // Timestamps
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

/**
 * Input for creating a new video
 */
export interface CreateVideoInput {
  title: string
  description?: string
  recordingType?: RecordingType
  folderId?: string
}

/**
 * Input for updating a video
 */
export interface UpdateVideoInput {
  title?: string
  description?: string
  folderId?: string | null
}

/**
 * Video folder for organization
 */
export interface VideoFolder {
  id: string
  tenantId: string
  userId: string
  parentId: string | null
  name: string
  createdAt: Date
}

/**
 * Input for creating a folder
 */
export interface CreateFolderInput {
  name: string
  parentId?: string
}

/**
 * Input for updating a folder
 */
export interface UpdateFolderInput {
  name?: string
  parentId?: string | null
}

/**
 * Video permission entry
 */
export interface VideoPermission {
  id: string
  tenantId: string
  videoId: string
  permission: PermissionLevel

  // Target (exactly one should be set)
  userId: string | null
  email: string | null
  isPublic: boolean
  isTeam: boolean

  // Optional security
  passwordHash: string | null
  expiresAt: Date | null

  createdAt: Date
}

/**
 * Input for creating a permission
 */
export interface CreatePermissionInput {
  permission: PermissionLevel
  userId?: string
  email?: string
  isPublic?: boolean
  isTeam?: boolean
  password?: string
  expiresAt?: Date
}

/**
 * Video view tracking entry
 */
export interface VideoView {
  id: string
  tenantId: string
  videoId: string
  userId: string | null
  watchDurationSeconds: number
  completed: boolean
  ipHash: string | null
  userAgent: string | null
  createdAt: Date
}

/**
 * Input for tracking a view
 */
export interface TrackViewInput {
  watchDurationSeconds: number
  completed?: boolean
  ipHash?: string
  userAgent?: string
}

/**
 * Aggregated view analytics
 */
export interface VideoAnalytics {
  totalViews: number
  uniqueViewers: number
  totalWatchTimeSeconds: number
  averageWatchTimeSeconds: number
  completionRate: number
}

/**
 * Mux direct upload response
 */
export interface DirectUploadResult {
  uploadUrl: string
  uploadId: string
  videoId: string
}

/**
 * Mux asset information
 */
export interface MuxAssetInfo {
  assetId: string
  playbackId: string
  status: string
  duration: number | null
  aspectRatio: string | null
  resolution: string | null
}

/**
 * Playback URL options
 */
export interface PlaybackUrlOptions {
  width?: number
  height?: number
  time?: number
  fit?: 'contain' | 'cover' | 'crop' | 'smartcrop'
}

/**
 * Thumbnail options
 */
export interface ThumbnailOptions {
  width?: number
  height?: number
  time?: number
  fit?: 'contain' | 'cover' | 'crop' | 'smartcrop'
}

/**
 * Animated thumbnail options
 */
export interface AnimatedThumbnailOptions {
  start?: number
  end?: number
  width?: number
  fps?: number
}

/**
 * List options for pagination
 */
export interface ListOptions {
  limit?: number
  offset?: number
  search?: string
  status?: VideoStatus
  folderId?: string | null
  sort?: 'created_at' | 'title' | 'duration_seconds'
  dir?: 'asc' | 'desc'
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  rows: T[]
  totalCount: number
}

/**
 * Webhook event types from Mux
 */
export type MuxWebhookEventType =
  | 'video.upload.asset_created'
  | 'video.upload.cancelled'
  | 'video.upload.errored'
  | 'video.asset.ready'
  | 'video.asset.errored'
  | 'video.asset.deleted'
  | 'video.asset.static_renditions.ready'

/**
 * Mux webhook payload
 */
export interface MuxWebhookPayload {
  type: MuxWebhookEventType
  data: {
    id: string
    upload_id?: string
    playback_ids?: Array<{ id: string; policy: string }>
    duration?: number
    aspect_ratio?: string
    resolution_tier?: string
    status?: string
    errors?: Array<{ type: string; message: string }>
  }
}
