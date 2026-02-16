/**
 * @cgk-platform/video - Direct upload handling
 *
 * Creates Mux direct upload URLs for browser-to-Mux uploads.
 * Supports both platform-level and tenant-managed Mux credentials.
 */

import { getMuxClient, getMuxClientAsync, isTestMode } from './client.js'

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

// =============================================================================
// Tenant-Aware Functions
// =============================================================================

/**
 * Options for creating a direct upload with tenant support
 */
export interface TenantDirectUploadOptions extends DirectUploadOptions {
  /**
   * Tenant ID for tenant-managed Mux credentials
   */
  tenantId?: string
}

/**
 * Create a direct upload URL with tenant credential support
 *
 * @param options - Upload configuration options including optional tenantId
 * @returns Upload URL and ID
 * @throws Error if Mux is not configured for tenant or platform
 */
export async function createDirectUploadForTenant(
  options: TenantDirectUploadOptions = {},
): Promise<DirectUploadResult> {
  const { tenantId, corsOrigin = '*', maxDurationSeconds, passthrough } = options

  const mux = await getMuxClientAsync(tenantId)
  if (!mux) {
    throw new Error(
      tenantId
        ? `Mux not configured for tenant ${tenantId} or platform`
        : 'Mux not configured: MUX_TOKEN_ID and MUX_TOKEN_SECRET are required',
    )
  }

  const upload = await mux.video.uploads.create({
    cors_origin: corsOrigin,
    new_asset_settings: {
      playback_policy: ['public'],
      mp4_support: 'capped-1080p',
      normalize_audio: true,
      master_access: 'temporary',
      passthrough,
    },
    test: isTestMode(),
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
 * Cancel a direct upload with tenant credential support
 *
 * @param uploadId - The Mux upload ID to cancel
 * @param tenantId - Optional tenant ID for tenant-managed credentials
 */
export async function cancelDirectUploadForTenant(
  uploadId: string,
  tenantId?: string,
): Promise<void> {
  const mux = await getMuxClientAsync(tenantId)
  if (!mux) {
    throw new Error(
      tenantId
        ? `Mux not configured for tenant ${tenantId} or platform`
        : 'Mux not configured',
    )
  }
  await mux.video.uploads.cancel(uploadId)
}

/**
 * Get upload status with tenant credential support
 *
 * @param uploadId - The Mux upload ID
 * @param tenantId - Optional tenant ID for tenant-managed credentials
 * @returns Upload status information
 */
export async function getUploadStatusForTenant(
  uploadId: string,
  tenantId?: string,
): Promise<{
  status: 'waiting' | 'asset_created' | 'errored' | 'cancelled' | 'timed_out'
  assetId: string | null
  error: string | null
}> {
  const mux = await getMuxClientAsync(tenantId)
  if (!mux) {
    throw new Error(
      tenantId
        ? `Mux not configured for tenant ${tenantId} or platform`
        : 'Mux not configured',
    )
  }

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
