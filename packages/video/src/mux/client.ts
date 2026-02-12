/**
 * @cgk/video - Mux API client
 *
 * Wrapper around Mux SDK for video hosting and streaming.
 */

import Mux from '@mux/mux-node'

let muxClient: Mux | null = null

/**
 * Get or create Mux client instance
 */
export function getMuxClient(): Mux {
  if (!muxClient) {
    const tokenId = process.env.MUX_TOKEN_ID
    const tokenSecret = process.env.MUX_TOKEN_SECRET

    if (!tokenId || !tokenSecret) {
      throw new Error(
        'Missing Mux credentials: MUX_TOKEN_ID and MUX_TOKEN_SECRET are required',
      )
    }

    muxClient = new Mux({
      tokenId,
      tokenSecret,
    })
  }

  return muxClient
}

/**
 * Check if Mux is configured
 */
export function isMuxConfigured(): boolean {
  return !!(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET)
}

/**
 * Get the webhook signing secret
 */
export function getMuxWebhookSecret(): string {
  const secret = process.env.MUX_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('Missing MUX_WEBHOOK_SECRET environment variable')
  }
  return secret
}

/**
 * Check if running in test mode
 */
export function isTestMode(): boolean {
  return process.env.MUX_TEST_MODE === 'true' || process.env.NODE_ENV === 'test'
}
