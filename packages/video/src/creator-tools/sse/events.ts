/**
 * @cgk-platform/video - SSE Event Stream
 *
 * Server-Sent Events implementation for real-time video status updates.
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { VideoStatus } from '../../types.js'

/**
 * SSE event types
 */
export type SSEEventType =
  | 'connected'
  | 'status'
  | 'transcription'
  | 'comment'
  | 'reaction'
  | 'complete'
  | 'error'
  | 'timeout'
  | 'keepalive'

/**
 * SSE event payload structure
 */
export interface SSEEvent<T = unknown> {
  type: SSEEventType
  data?: T
  timestamp: number
}

/**
 * Video status update event data
 */
export interface VideoStatusEventData {
  videoId: string
  status: VideoStatus
  transcriptionStatus?: string
  progress?: number
  duration?: number
  thumbnailUrl?: string
  playbackId?: string
}

/**
 * Comment event data
 */
export interface CommentEventData {
  commentId: string
  videoId: string
  userId: string
  userName: string
  content: string
  timestampSeconds: number | null
  parentId: string | null
  createdAt: string
}

/**
 * Reaction event data
 */
export interface ReactionEventData {
  videoId: string
  emoji: string
  count: number
  userId: string
  action: 'added' | 'removed'
}

/**
 * SSE stream options
 */
export interface SSEStreamOptions {
  /** Polling interval in milliseconds */
  pollInterval?: number
  /** Maximum stream duration in milliseconds */
  timeout?: number
  /** Include keepalive messages */
  keepalive?: boolean
  /** Keepalive interval in milliseconds */
  keepaliveInterval?: number
}

/**
 * Default SSE options
 */
export const DEFAULT_SSE_OPTIONS: Required<SSEStreamOptions> = {
  pollInterval: 2000,
  timeout: 600000, // 10 minutes
  keepalive: true,
  keepaliveInterval: 30000, // 30 seconds
}

/**
 * Format SSE message
 */
export function formatSSEMessage(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

/**
 * Create SSE headers
 */
export function createSSEHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  }
}

/**
 * Get current video status for SSE event
 */
export async function getVideoStatus(
  tenantId: string,
  videoId: string
): Promise<VideoStatusEventData | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        status,
        duration_seconds,
        thumbnail_url,
        mux_playback_id
      FROM videos
      WHERE id = ${videoId} AND tenant_id = ${tenantId}
    `

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return {
      videoId: row.id as string,
      status: row.status as VideoStatus,
      duration: row.duration_seconds as number | undefined,
      thumbnailUrl: row.thumbnail_url as string | undefined,
      playbackId: row.mux_playback_id as string | undefined,
    }
  })
}

/**
 * Create a video status SSE stream
 *
 * @ai-pattern Real-time updates via Server-Sent Events
 * @ai-gotcha Stream has 10-minute timeout by default
 */
export function createVideoStatusStream(
  tenantId: string,
  videoId: string,
  options: SSEStreamOptions = {}
): ReadableStream<Uint8Array> {
  const opts = { ...DEFAULT_SSE_OPTIONS, ...options }
  const encoder = new TextEncoder()
  let lastStatus: VideoStatus | null = null
  let pollInterval: ReturnType<typeof setInterval> | null = null
  let keepaliveInterval: ReturnType<typeof setInterval> | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return new ReadableStream({
    async start(controller) {
      // Send connected event
      const connectedEvent: SSEEvent = {
        type: 'connected',
        timestamp: Date.now(),
      }
      controller.enqueue(encoder.encode(formatSSEMessage(connectedEvent)))

      // Set up polling
      pollInterval = setInterval(async () => {
        try {
          const videoStatus = await getVideoStatus(tenantId, videoId)

          if (!videoStatus) {
            const errorEvent: SSEEvent = {
              type: 'error',
              data: { message: 'Video not found' },
              timestamp: Date.now(),
            }
            controller.enqueue(encoder.encode(formatSSEMessage(errorEvent)))
            cleanup()
            controller.close()
            return
          }

          // Only send if status changed
          if (videoStatus.status !== lastStatus) {
            lastStatus = videoStatus.status

            const statusEvent: SSEEvent<VideoStatusEventData> = {
              type: 'status',
              data: videoStatus,
              timestamp: Date.now(),
            }
            controller.enqueue(encoder.encode(formatSSEMessage(statusEvent)))

            // Close stream if video is ready or errored
            if (videoStatus.status === 'ready' || videoStatus.status === 'error') {
              const completeEvent: SSEEvent = {
                type: 'complete',
                data: { finalStatus: videoStatus.status },
                timestamp: Date.now(),
              }
              controller.enqueue(encoder.encode(formatSSEMessage(completeEvent)))
              cleanup()
              controller.close()
            }
          }
        } catch (error) {
          const errorEvent: SSEEvent = {
            type: 'error',
            data: { message: error instanceof Error ? error.message : 'Unknown error' },
            timestamp: Date.now(),
          }
          controller.enqueue(encoder.encode(formatSSEMessage(errorEvent)))
        }
      }, opts.pollInterval)

      // Set up keepalive
      if (opts.keepalive) {
        keepaliveInterval = setInterval(() => {
          const keepaliveEvent: SSEEvent = {
            type: 'keepalive',
            timestamp: Date.now(),
          }
          controller.enqueue(encoder.encode(formatSSEMessage(keepaliveEvent)))
        }, opts.keepaliveInterval)
      }

      // Set up timeout
      timeoutId = setTimeout(() => {
        const timeoutEvent: SSEEvent = {
          type: 'timeout',
          data: { message: 'Stream timeout reached' },
          timestamp: Date.now(),
        }
        controller.enqueue(encoder.encode(formatSSEMessage(timeoutEvent)))
        cleanup()
        controller.close()
      }, opts.timeout)

      function cleanup() {
        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
        if (keepaliveInterval) {
          clearInterval(keepaliveInterval)
          keepaliveInterval = null
        }
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
      }
    },

    cancel() {
      // Clean up on client disconnect
      if (pollInterval) clearInterval(pollInterval)
      if (keepaliveInterval) clearInterval(keepaliveInterval)
      if (timeoutId) clearTimeout(timeoutId)
    },
  })
}

/**
 * Create SSE Response from stream
 */
export function createSSEResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: createSSEHeaders(),
  })
}
