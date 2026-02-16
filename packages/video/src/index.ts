/**
 * @cgk-platform/video - Video Management Package
 *
 * Provides:
 * - Video hosting and streaming via Mux
 * - Transcription via AssemblyAI
 * - AI content generation via Claude
 * - Folder organization and permissions
 * - Analytics and view tracking
 * - Creator tools (teleprompter, trimming, CTA)
 * - Interactions (comments, reactions)
 *
 * @ai-pattern video-package
 * @ai-pattern tenant-isolation
 * @ai-required All video operations MUST use tenant context
 */

// Core types
export type {
  RecordingType,
  VideoStatus,
  PermissionLevel,
  Video,
  CreateVideoInput,
  UpdateVideoInput,
  VideoFolder,
  CreateFolderInput,
  UpdateFolderInput,
  VideoPermission,
  CreatePermissionInput,
  VideoView,
  TrackViewInput,
  VideoAnalytics,
  DirectUploadResult,
  MuxAssetInfo,
  PlaybackUrlOptions,
  ThumbnailOptions,
  AnimatedThumbnailOptions,
  ListOptions,
  PaginatedResult,
  MuxWebhookEventType,
  MuxWebhookPayload,
} from './types.js'

// Schema definitions
export {
  VIDEO_MIGRATION_SQL,
  VIDEOS_TABLE_SQL,
  VIDEO_FOLDERS_TABLE_SQL,
  VIDEO_PERMISSIONS_TABLE_SQL,
  VIDEO_VIEWS_TABLE_SQL,
  VIDEOS_UPDATED_AT_TRIGGER_SQL,
} from './schema.js'

// Database operations
export {
  getVideo,
  getVideoByMuxUploadId,
  getVideoByMuxAssetId,
  getVideos,
  createVideo,
  updateVideo,
  updateVideoStatus,
  updateVideoMuxInfo,
  deleteVideo,
  getFolder,
  getFolders,
  getAllFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} from './db.js'

// Mux integration
export {
  getMuxClient,
  getMuxClientAsync,
  isMuxConfigured,
  isMuxConfiguredAsync,
  getMuxWebhookSecret,
  isTestMode,
  clearMuxClientCache,
  // Upload functions (platform-level)
  createDirectUpload,
  cancelDirectUpload,
  getUploadStatus,
  // Upload functions (tenant-aware)
  createDirectUploadForTenant,
  cancelDirectUploadForTenant,
  getUploadStatusForTenant,
  // Asset functions (platform-level)
  getAsset,
  deleteAsset,
  createPlaybackId,
  deletePlaybackId,
  getMp4DownloadUrl,
  updateAssetPassthrough,
  // Asset functions (tenant-aware)
  getAssetForTenant,
  deleteAssetForTenant,
  createPlaybackIdForTenant,
  deletePlaybackIdForTenant,
  getMp4DownloadUrlForTenant,
  updateAssetPassthroughForTenant,
  getStreamUrl,
  getThumbnailUrl,
  getAnimatedThumbnailUrl,
  getStoryboardUrl,
  getPosterUrl,
  getEmbedUrl,
  getAllPlaybackUrls,
  verifyWebhookSignature,
  parseWebhookPayload,
  processWebhookEvent,
  parsePassthrough,
  createPassthrough,
  type DirectUploadOptions,
  type TenantDirectUploadOptions,
  type WebhookVerificationResult,
  type WebhookHandlers,
  type StoryboardOptions,
} from './mux/index.js'

// Permissions
export {
  getVideoPermissions,
  getPermission,
  createPermission,
  updatePermission,
  deletePermission,
  deleteVideoPermissions,
  hasPublicPermission,
  getUserPermission,
  getEmailPermission,
  checkVideoPermission,
  canEditVideo,
  canDeleteVideo,
  canCommentOnVideo,
  permissionIncludes,
  type PermissionCheckResult,
  type PermissionTargetType,
  type PermissionTarget,
  type PermissionUserContext,
} from './permissions/index.js'

// Analytics
export {
  trackView,
  updateView,
  getVideoViews,
  getLastView,
  getVideoAnalytics,
  getViewCount,
  getUniqueViewerCount,
  getViewsOverTime,
  getTopVideos,
  getWatchTimeDistribution,
} from './analytics/index.js'

// Re-export transcription module
export * from './transcription/index.js'

// Re-export AI module
export * from './ai/index.js'

// Re-export creator tools
export * from './creator-tools/index.js'

// Re-export interactions
export * from './interactions/index.js'
