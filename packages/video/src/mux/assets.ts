/**
 * @cgk-platform/video - Mux asset management
 *
 * Operations for managing video assets in Mux.
 */

import { getMuxClient } from './client.js'

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
