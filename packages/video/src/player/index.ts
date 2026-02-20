/**
 * @cgk-platform/video/player - Client-safe video utilities
 *
 * This entry point exports ONLY client-safe functions that do NOT
 * depend on mux-node or any Node.js-only dependencies.
 * Safe for use in 'use client' components.
 */

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
} from '../mux/playback.js'

// Re-export client-safe types
export type {
  RecordingType,
  VideoStatus,
  PermissionLevel,
  Video,
  VideoFolder,
  VideoAnalytics,
  PlaybackUrlOptions,
  ListOptions,
  PaginatedResult,
} from '../types.js'
