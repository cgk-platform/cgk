/**
 * @cgk/video - Direct upload handling
 *
 * Creates Mux direct upload URLs for browser-to-Mux uploads.
 */

import { getMuxClient, isTestMode } from './client.js'

/**
 * Options for creating a direct upload
 */
export interface DirectUploadOptions {
  /**
   * CORS origin for the upload. Use '*' for any origin.
   */
  corsOrigin?: string

  /**
   * Maximum duration in seconds (default: unlimited)
   */
  maxDurationSeconds?: number

  /**
   * Passthrough data that will be included in webhooks
   */
  passthrough?: string
}

/**
 * Result from creating a direct upload
 */
export interface DirectUploadResult {
  /**
   * The URL to upload the video file to (PUT request)
   */
  uploadUrl: string

  /**
   * The Mux upload ID for tracking
   */
  uploadId: string
}

/**
 * Create a direct upload URL
 *
 * The client can upload directly to Mux without going through our server.
 * This saves bandwidth and improves upload speed.
 *
 * @param options - Upload configuration options
 * @returns Upload URL and ID
 */
export async function createDirectUpload(
  options: DirectUploadOptions = {},
): Promise<DirectUploadResult> {
  const mux = getMuxClient()
  const { corsOrigin = '*', maxDurationSeconds, passthrough } = options

  const upload = await mux.video.uploads.create({
    cors_origin: corsOrigin,
    new_asset_settings: {
      playback_policy: ['public'],
      // MP4 support is required for transcription
      mp4_support: 'capped-1080p',
      // Normalize audio levels
      normalize_audio: true,
      // Enable master access for storyboards
      master_access: 'temporary',
      // Include passthrough data in webhooks
      passthrough,
    },
    // Test mode for development
    test: isTestMode(),
    // Optional max duration
    ...(maxDurationSeconds && {
      timeout: maxDurationSeconds,
    }),
  })

  return {
    uploadUrl: upload.url,
    uploadId: upload.id,
  }
}

/**
 * Cancel a direct upload
 *
 * @param uploadId - The Mux upload ID to cancel
 */
export async function cancelDirectUpload(uploadId: string): Promise<void> {
  const mux = getMuxClient()
  await mux.video.uploads.cancel(uploadId)
}

/**
 * Get upload status
 *
 * @param uploadId - The Mux upload ID
 * @returns Upload status information
 */
export async function getUploadStatus(uploadId: string): Promise<{
  status: 'waiting' | 'asset_created' | 'errored' | 'cancelled' | 'timed_out'
  assetId: string | null
  error: string | null
}> {
  const mux = getMuxClient()
  const upload = await mux.video.uploads.retrieve(uploadId)

  return {
    status: upload.status as
      | 'waiting'
      | 'asset_created'
      | 'errored'
      | 'cancelled'
      | 'timed_out',
    assetId: upload.asset_id ?? null,
    error:
      upload.status === 'errored'
        ? upload.error?.message ?? 'Unknown error'
        : null,
  }
}
