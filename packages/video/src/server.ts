/**
 * @cgk-platform/video/server - Server-Only Video Operations
 *
 * This module contains server-side video operations that require:
 * - Database access
 * - Mux API client
 * - Webhook processing
 * - Tenant credentials
 *
 * DO NOT import this in client components!
 * Use '@cgk-platform/video' for client-safe exports (types, playback URLs).
 *
 * @ai-pattern server-only
 * @ai-required All operations MUST use tenant context
 */

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

// Mux integration (client and API operations)
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

// Permissions (require DB access)
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

// Analytics (require DB access)
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

// Transcription module (requires AI APIs)
export * from './transcription/index.js'

// AI module (requires Anthropic API)
export * from './ai/index.js'

// Creator tools (may require DB access)
export * from './creator-tools/index.js'

// Interactions (require DB access)
export * from './interactions/index.js'
