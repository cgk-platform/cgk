/**
 * @cgk-platform/video - Mux asset management
 *
 * Operations for managing video assets in Mux.
 * Supports both platform-level and tenant-managed Mux credentials.
 */

import { getMuxClient, getMuxClientAsync } from './client.js'

/**
 * Asset information from Mux
 */
export interface MuxAssetInfo {
  assetId: string
  playbackId: string | null
  status: string
  duration: number | null
  aspectRatio: string | null
  resolution: string | null
  maxStoredResolution: string | null
  maxStoredFrameRate: number | null
  mp4Support: string | null
}

/**
 * Get asset information
 *
 * @param assetId - The Mux asset ID
 * @returns Asset information
 */
export async function getAsset(assetId: string): Promise<MuxAssetInfo> {
  const mux = getMuxClient()
  const asset = await mux.video.assets.retrieve(assetId)

  // Get the public playback ID
  const playbackId =
    asset.playback_ids?.find((p) => p.policy === 'public')?.id ?? null

  return {
    assetId: asset.id,
    playbackId,
    status: asset.status,
    duration: asset.duration ?? null,
    aspectRatio: asset.aspect_ratio ?? null,
    resolution: asset.resolution_tier ?? null,
    maxStoredResolution: asset.max_stored_resolution ?? null,
    maxStoredFrameRate: asset.max_stored_frame_rate ?? null,
    mp4Support: asset.mp4_support ?? null,
  }
}

/**
 * Delete a Mux asset
 *
 * @param assetId - The Mux asset ID to delete
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const mux = getMuxClient()
  await mux.video.assets.delete(assetId)
}

/**
 * Create a playback ID for an asset
 *
 * @param assetId - The Mux asset ID
 * @param policy - Playback policy ('public' or 'signed')
 * @returns The new playback ID
 */
export async function createPlaybackId(
  assetId: string,
  policy: 'public' | 'signed' = 'public',
): Promise<string> {
  const mux = getMuxClient()
  const playbackId = await mux.video.assets.createPlaybackId(assetId, {
    policy,
  })
  return playbackId.id
}

/**
 * Delete a playback ID
 *
 * @param assetId - The Mux asset ID
 * @param playbackId - The playback ID to delete
 */
export async function deletePlaybackId(
  assetId: string,
  playbackId: string,
): Promise<void> {
  const mux = getMuxClient()
  await mux.video.assets.deletePlaybackId(assetId, playbackId)
}

/**
 * Get the MP4 download URL for an asset
 *
 * @param assetId - The Mux asset ID
 * @returns Download URL if available, null otherwise
 */
export async function getMp4DownloadUrl(
  assetId: string,
): Promise<string | null> {
  const mux = getMuxClient()
  const asset = await mux.video.assets.retrieve(assetId)

  // Find the static rendition
  const rendition = asset.static_renditions?.files?.find(
    (f) => f.ext === 'mp4',
  )

  if (!rendition) {
    return null
  }

  // Get the first playback ID
  const playbackId = asset.playback_ids?.[0]?.id
  if (!playbackId) {
    return null
  }

  // Construct download URL
  return `https://stream.mux.com/${playbackId}/${rendition.name}`
}

/**
 * Update asset metadata
 *
 * @param assetId - The Mux asset ID
 * @param passthrough - Passthrough metadata to store
 */
export async function updateAssetPassthrough(
  assetId: string,
  passthrough: string,
): Promise<void> {
  const mux = getMuxClient()
  await mux.video.assets.update(assetId, {
    passthrough,
  })
}

// =============================================================================
// Tenant-Aware Functions
// =============================================================================

/**
 * Get asset information with tenant credential support
 *
 * @param assetId - The Mux asset ID
 * @param tenantId - Optional tenant ID for tenant-managed credentials
 * @returns Asset information
 */
export async function getAssetForTenant(
  assetId: string,
  tenantId?: string,
): Promise<MuxAssetInfo> {
  const mux = await getMuxClientAsync(tenantId)
  if (!mux) {
    throw new Error(
      tenantId
        ? `Mux not configured for tenant ${tenantId} or platform`
        : 'Mux not configured',
    )
  }

  const asset = await mux.video.assets.retrieve(assetId)

  const playbackId =
    asset.playback_ids?.find((p) => p.policy === 'public')?.id ?? null

  return {
    assetId: asset.id,
    playbackId,
    status: asset.status,
    duration: asset.duration ?? null,
    aspectRatio: asset.aspect_ratio ?? null,
    resolution: asset.resolution_tier ?? null,
    maxStoredResolution: asset.max_stored_resolution ?? null,
    maxStoredFrameRate: asset.max_stored_frame_rate ?? null,
    mp4Support: asset.mp4_support ?? null,
  }
}

/**
 * Delete a Mux asset with tenant credential support
 *
 * @param assetId - The Mux asset ID to delete
 * @param tenantId - Optional tenant ID for tenant-managed credentials
 */
export async function deleteAssetForTenant(
  assetId: string,
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
  await mux.video.assets.delete(assetId)
}

/**
 * Create a playback ID for an asset with tenant credential support
 *
 * @param assetId - The Mux asset ID
 * @param policy - Playback policy ('public' or 'signed')
 * @param tenantId - Optional tenant ID for tenant-managed credentials
 * @returns The new playback ID
 */
export async function createPlaybackIdForTenant(
  assetId: string,
  policy: 'public' | 'signed' = 'public',
  tenantId?: string,
): Promise<string> {
  const mux = await getMuxClientAsync(tenantId)
  if (!mux) {
    throw new Error(
      tenantId
        ? `Mux not configured for tenant ${tenantId} or platform`
        : 'Mux not configured',
    )
  }
  const playbackId = await mux.video.assets.createPlaybackId(assetId, {
    policy,
  })
  return playbackId.id
}

/**
 * Delete a playback ID with tenant credential support
 *
 * @param assetId - The Mux asset ID
 * @param playbackId - The playback ID to delete
 * @param tenantId - Optional tenant ID for tenant-managed credentials
 */
export async function deletePlaybackIdForTenant(
  assetId: string,
  playbackId: string,
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
  await mux.video.assets.deletePlaybackId(assetId, playbackId)
}

/**
 * Get the MP4 download URL for an asset with tenant credential support
 *
 * @param assetId - The Mux asset ID
 * @param tenantId - Optional tenant ID for tenant-managed credentials
 * @returns Download URL if available, null otherwise
 */
export async function getMp4DownloadUrlForTenant(
  assetId: string,
  tenantId?: string,
): Promise<string | null> {
  const mux = await getMuxClientAsync(tenantId)
  if (!mux) {
    throw new Error(
      tenantId
        ? `Mux not configured for tenant ${tenantId} or platform`
        : 'Mux not configured',
    )
  }

  const asset = await mux.video.assets.retrieve(assetId)

  const rendition = asset.static_renditions?.files?.find(
    (f) => f.ext === 'mp4',
  )

  if (!rendition) {
    return null
  }

  const playbackId = asset.playback_ids?.[0]?.id
  if (!playbackId) {
    return null
  }

  return `https://stream.mux.com/${playbackId}/${rendition.name}`
}

/**
 * Update asset metadata with tenant credential support
 *
 * @param assetId - The Mux asset ID
 * @param passthrough - Passthrough metadata to store
 * @param tenantId - Optional tenant ID for tenant-managed credentials
 */
export async function updateAssetPassthroughForTenant(
  assetId: string,
  passthrough: string,
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
  await mux.video.assets.update(assetId, {
    passthrough,
  })
}
