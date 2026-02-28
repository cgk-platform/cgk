/**
 * @cgk-platform/video - Video Management Package (Client-Safe Exports)
 *
 * This module contains client-safe exports:
 * - Type definitions
 * - Playback URL generators (no API calls, just string builders)
 *
 * For server-side operations (DB, Mux API, webhooks), use:
 * import { ... } from '@cgk-platform/video/server'
 *
 * @ai-pattern video-package
 * @ai-pattern client-safe
 */

// ============================================================================
// TYPES - All type exports are client-safe
// ============================================================================

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

// ============================================================================
// CLIENT-SAFE PLAYBACK FUNCTIONS - No API calls, just URL generation
// ============================================================================

export {
  getStreamUrl,
  getThumbnailUrl,
  getAnimatedThumbnailUrl,
  getStoryboardUrl,
  getPosterUrl,
  getEmbedUrl,
  getAllPlaybackUrls,
} from './mux/index.js'

// ============================================================================
// For server-side operations, import from '@cgk-platform/video/server':
// - Database operations (getVideo, createVideo, etc.)
// - Mux client (getMuxClient, createDirectUpload, etc.)
// - Permissions (checkVideoPermission, etc.)
// - Analytics (trackView, getVideoAnalytics, etc.)
// - Transcription, AI, creator tools, interactions
// ============================================================================
