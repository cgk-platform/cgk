/**
 * @cgk-platform/video/mux - Mux integration exports
 */

export { getMuxClient, isMuxConfigured, getMuxWebhookSecret, isTestMode } from './client.js'

export {
  createDirectUpload,
  cancelDirectUpload,
  getUploadStatus,
  type DirectUploadOptions,
  type DirectUploadResult,
} from './uploads.js'

export {
  getAsset,
  deleteAsset,
  createPlaybackId,
  deletePlaybackId,
  getMp4DownloadUrl,
  updateAssetPassthrough,
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
