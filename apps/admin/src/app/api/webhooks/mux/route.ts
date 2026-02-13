export const dynamic = 'force-dynamic'

/**
 * Mux Webhook Handler
 *
 * Handles webhook events from Mux for video processing status updates.
 *
 * Events handled:
 * - video.upload.asset_created - Upload complete, asset created
 * - video.asset.ready - Asset ready for playback
 * - video.asset.errored - Asset processing failed
 * - video.asset.static_renditions.ready - MP4 renditions ready (triggers transcription)
 */

import { withTenant, sql } from '@cgk-platform/db'
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  processWebhookEvent,
  updateVideoStatus,
  getThumbnailUrl,
} from '@cgk-platform/video'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Get raw body for signature verification
  const body = await request.text()
  const signature = request.headers.get('mux-signature')

  if (!signature) {
    console.error('[Mux Webhook] Missing signature')
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  // Verify webhook signature
  const { valid, error: verifyError } = verifyWebhookSignature(body, signature)
  if (!valid) {
    console.error('[Mux Webhook] Invalid signature:', verifyError)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Parse the webhook payload
  let payload
  try {
    payload = parseWebhookPayload(body)
  } catch (error) {
    console.error('[Mux Webhook] Failed to parse payload:', error)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  console.log('[Mux Webhook] Received event:', payload.type, payload.data.id)

  // Process the webhook event
  await processWebhookEvent(payload, {
    onUploadAssetCreated: async (uploadId: string, assetId: string) => {
      console.log('[Mux Webhook] Upload asset created:', uploadId, assetId)

      // Find video by upload ID across all tenants
      // This requires checking the passthrough data or querying all tenants
      // For now, we'll search public schema for the mapping
      const result = await sql`
        SELECT v.id as video_id, v.tenant_id
        FROM public.mux_upload_mappings v
        WHERE v.mux_upload_id = ${uploadId}
        LIMIT 1
      `

      if (result.rows.length === 0) {
        console.error('[Mux Webhook] No video found for upload:', uploadId)
        return
      }

      const { video_id: videoId, tenant_id: tenantId } = result.rows[0] as {
        video_id: string
        tenant_id: string
      }

      // Update video with asset ID and status
      await withTenant(tenantId, async () => {
        await sql`
          UPDATE videos
          SET
            mux_asset_id = ${assetId},
            status = 'processing',
            updated_at = now()
          WHERE id = ${videoId}
        `
      })

      console.log('[Mux Webhook] Updated video with asset ID:', videoId, assetId)
    },

    onAssetReady: async (
      assetId: string,
      playbackId: string | null,
      duration: number | null,
    ) => {
      console.log('[Mux Webhook] Asset ready:', assetId, playbackId, duration)

      // Find video by asset ID
      const result = await sql`
        SELECT v.id as video_id, v.tenant_id
        FROM public.mux_upload_mappings v
        WHERE v.mux_asset_id = ${assetId}
        LIMIT 1
      `

      if (result.rows.length === 0) {
        console.error('[Mux Webhook] No video found for asset:', assetId)
        return
      }

      const { video_id: videoId, tenant_id: tenantId } = result.rows[0] as {
        video_id: string
        tenant_id: string
      }

      // Generate thumbnail URL
      const thumbnailUrl = playbackId
        ? getThumbnailUrl(playbackId, { width: 640, time: 2 })
        : null

      // Update video
      await withTenant(tenantId, async () => {
        await sql`
          UPDATE videos
          SET
            mux_playback_id = ${playbackId},
            duration_seconds = ${duration ? Math.round(duration) : null},
            thumbnail_url = ${thumbnailUrl},
            status = 'ready',
            updated_at = now()
          WHERE id = ${videoId}
        `
      })

      console.log('[Mux Webhook] Video ready:', videoId)
    },

    onAssetErrored: async (assetId: string, error: string) => {
      console.error('[Mux Webhook] Asset errored:', assetId, error)

      // Find video by asset ID
      const result = await sql`
        SELECT v.id as video_id, v.tenant_id
        FROM public.mux_upload_mappings v
        WHERE v.mux_asset_id = ${assetId}
        LIMIT 1
      `

      if (result.rows.length === 0) {
        console.error('[Mux Webhook] No video found for asset:', assetId)
        return
      }

      const { video_id: videoId, tenant_id: tenantId } = result.rows[0] as {
        video_id: string
        tenant_id: string
      }

      // Update video with error status
      await withTenant(tenantId, async () => {
        await updateVideoStatus(tenantId, videoId, 'error', error)
      })

      console.log('[Mux Webhook] Video marked as error:', videoId)
    },

    onStaticRenditionsReady: async (assetId: string) => {
      console.log('[Mux Webhook] Static renditions ready:', assetId)
      // This event can be used to trigger transcription
      // The transcription job would be triggered here
    },

    onUploadCancelled: async (uploadId: string) => {
      console.log('[Mux Webhook] Upload cancelled:', uploadId)
      // Optionally mark video as cancelled
    },

    onUploadErrored: async (uploadId: string, error: string) => {
      console.error('[Mux Webhook] Upload errored:', uploadId, error)

      // Find video by upload ID
      const result = await sql`
        SELECT v.id as video_id, v.tenant_id
        FROM public.mux_upload_mappings v
        WHERE v.mux_upload_id = ${uploadId}
        LIMIT 1
      `

      if (result.rows.length === 0) {
        console.error('[Mux Webhook] No video found for upload:', uploadId)
        return
      }

      const { video_id: videoId, tenant_id: tenantId } = result.rows[0] as {
        video_id: string
        tenant_id: string
      }

      // Update video with error status
      await withTenant(tenantId, async () => {
        await updateVideoStatus(tenantId, videoId, 'error', error)
      })
    },

    onAssetDeleted: async (assetId: string) => {
      console.log('[Mux Webhook] Asset deleted:', assetId)
      // Clean up mapping if needed
    },
  })

  return NextResponse.json({ received: true })
}
