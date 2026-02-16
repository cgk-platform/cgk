/**
 * @cgk-platform/video/mux - Mux integration exports
 */

export {
  getMuxClient,
  getMuxClientAsync,
  isMuxConfigured,
  isMuxConfiguredAsync,
  getMuxWebhookSecret,
  isTestMode,
  clearMuxClientCache,
} from './client.js'

export {
  createDirectUpload,
  createDirectUploadForTenant,
  cancelDirectUpload,
  cancelDirectUploadForTenant,
  getUploadStatus,
  getUploadStatusForTenant,
  type DirectUploadOptions,
  type DirectUploadResult,
  type TenantDirectUploadOptions,
} from './uploads.js'

export {
  getAsset,
  getAssetForTenant,
  deleteAsset,
  deleteAssetForTenant,
  createPlaybackId,
  createPlaybackIdForTenant,
  deletePlaybackId,
  deletePlaybackIdForTenant,
  getMp4DownloadUrl,
  getMp4DownloadUrlForTenant,
  updateAssetPassthrough,
  updateAssetPassthroughForTenant,
  type MuxAssetInfo,
} from './assets.js'

export {
  getStreamUrl,
  getThumbnailUrl,
  getAnimatedThumbnailUrl,
  getStoryboardUrl,
  getPosterUrl,
  getEmbedUrl,
  getAllPlaybackUrls,
  type ThumbnailOptions,
  type AnimatedThumbnailOptions,
  type StoryboardOptions,
} from './playback.js'

export {
  verifyWebhookSignature,
  parseWebhookPayload,
  processWebhookEvent,
  parsePassthrough,
  createPassthrough,
  type WebhookVerificationResult,
  type WebhookHandlers,
} from './webhooks.js'
