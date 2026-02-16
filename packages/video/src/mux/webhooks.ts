/**
 * @cgk-platform/video - Mux webhook handling
 *
 * Verifies webhook signatures and processes Mux events.
 */

import { createHmac, timingSafeEqual } from 'crypto'

import { getMuxWebhookSecret } from './client.js'

import type { MuxWebhookEventType, MuxWebhookPayload } from '../types.js'

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult {
  valid: boolean
  error?: string
}

/**
 * Verify Mux webhook signature
 *
 * @param payload - Raw request body as string
 * @param signature - Mux-Signature header value
 * @returns Verification result
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
): WebhookVerificationResult {
  try {
    const secret = getMuxWebhookSecret()

    // Parse the signature header
    // Format: t=timestamp,v1=signature
    const parts = signature.split(',')
    const timestampPart = parts.find((p) => p.startsWith('t='))
    const signaturePart = parts.find((p) => p.startsWith('v1='))

    if (!timestampPart || !signaturePart) {
      return {
        valid: false,
        error: 'Invalid signature format',
      }
    }

    const timestamp = timestampPart.slice(2)
    const expectedSignature = signaturePart.slice(3)

    // Check timestamp is within tolerance (5 minutes)
    const timestampMs = parseInt(timestamp, 10) * 1000
    const now = Date.now()
    const tolerance = 5 * 60 * 1000 // 5 minutes

    if (Math.abs(now - timestampMs) > tolerance) {
      return {
        valid: false,
        error: 'Webhook timestamp too old or in the future',
      }
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`
    const computedSignature = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex')

    // Compare signatures using timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    const computedBuffer = Buffer.from(computedSignature, 'hex')

    if (expectedBuffer.length !== computedBuffer.length) {
      return {
        valid: false,
        error: 'Signature length mismatch',
      }
    }

    const valid = timingSafeEqual(expectedBuffer, computedBuffer)

    return {
      valid,
      error: valid ? undefined : 'Signature mismatch',
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Parse webhook payload
 *
 * @param body - Raw request body
 * @returns Parsed webhook payload
 */
export function parseWebhookPayload(body: string): MuxWebhookPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new Error('Invalid JSON in webhook payload')
  }

  // Type guard for parsed object
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Webhook payload must be an object')
  }

  const payload = parsed as Record<string, unknown>
  const data = (payload.data ?? payload.object ?? {}) as Record<string, unknown>

  return {
    type: (payload.type as MuxWebhookEventType) ?? 'unknown',
    data: {
      id: (data.id as string) ?? '',
      upload_id: data.upload_id as string | undefined,
      playback_ids: data.playback_ids as Array<{ id: string; policy: string }> | undefined,
      duration: data.duration as number | undefined,
      aspect_ratio: data.aspect_ratio as string | undefined,
      resolution_tier: data.resolution_tier as string | undefined,
      status: data.status as string | undefined,
      errors: data.errors as Array<{ type: string; message: string }> | undefined,
    },
  }
}

/**
 * Webhook event handlers
 */
export interface WebhookHandlers {
  onUploadAssetCreated?: (uploadId: string, assetId: string) => Promise<void>
  onUploadCancelled?: (uploadId: string) => Promise<void>
  onUploadErrored?: (uploadId: string, error: string) => Promise<void>
  onAssetReady?: (
    assetId: string,
    playbackId: string | null,
    duration: number | null,
  ) => Promise<void>
  onAssetErrored?: (assetId: string, error: string) => Promise<void>
  onAssetDeleted?: (assetId: string) => Promise<void>
  onStaticRenditionsReady?: (assetId: string) => Promise<void>
}

/**
 * Process a webhook event
 *
 * @param payload - Parsed webhook payload
 * @param handlers - Event handlers
 */
export async function processWebhookEvent(
  payload: MuxWebhookPayload,
  handlers: WebhookHandlers,
): Promise<void> {
  const { type, data } = payload

  switch (type) {
    case 'video.upload.asset_created':
      if (handlers.onUploadAssetCreated && data.upload_id) {
        await handlers.onUploadAssetCreated(data.upload_id, data.id)
      }
      break

    case 'video.upload.cancelled':
      if (handlers.onUploadCancelled && data.upload_id) {
        await handlers.onUploadCancelled(data.upload_id)
      }
      break

    case 'video.upload.errored':
      if (handlers.onUploadErrored && data.upload_id) {
        const error = data.errors?.[0]?.message ?? 'Upload failed'
        await handlers.onUploadErrored(data.upload_id, error)
      }
      break

    case 'video.asset.ready':
      if (handlers.onAssetReady) {
        const playbackId = data.playback_ids?.[0]?.id ?? null
        await handlers.onAssetReady(data.id, playbackId, data.duration ?? null)
      }
      break

    case 'video.asset.errored':
      if (handlers.onAssetErrored) {
        const error = data.errors?.[0]?.message ?? 'Asset processing failed'
        await handlers.onAssetErrored(data.id, error)
      }
      break

    case 'video.asset.deleted':
      if (handlers.onAssetDeleted) {
        await handlers.onAssetDeleted(data.id)
      }
      break

    case 'video.asset.static_renditions.ready':
      if (handlers.onStaticRenditionsReady) {
        await handlers.onStaticRenditionsReady(data.id)
      }
      break

    default:
      // Unknown event type, ignore
      break
  }
}

/**
 * Extract tenant ID and video ID from passthrough data
 *
 * @param passthrough - Passthrough string from Mux
 * @returns Parsed tenant and video IDs, or null if invalid
 */
export function parsePassthrough(
  passthrough: string | undefined,
): { tenantId: string; videoId: string } | null {
  if (!passthrough) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(passthrough)
    // Validate expected shape
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'tenantId' in parsed &&
      'videoId' in parsed &&
      typeof (parsed as Record<string, unknown>).tenantId === 'string' &&
      typeof (parsed as Record<string, unknown>).videoId === 'string'
    ) {
      return {
        tenantId: (parsed as Record<string, unknown>).tenantId as string,
        videoId: (parsed as Record<string, unknown>).videoId as string,
      }
    }
  } catch {
    // Try simple format: tenantId:videoId
    const parts = passthrough.split(':')
    if (parts.length === 2 && parts[0] && parts[1]) {
      return {
        tenantId: parts[0],
        videoId: parts[1],
      }
    }
  }

  return null
}

/**
 * Create passthrough data for Mux
 *
 * @param tenantId - Tenant ID
 * @param videoId - Video ID
 * @returns Passthrough string
 */
export function createPassthrough(tenantId: string, videoId: string): string {
  return JSON.stringify({ tenantId, videoId })
}
