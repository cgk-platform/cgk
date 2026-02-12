'use client'

import { cn } from '@cgk/ui'
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { VideoStatus } from '@cgk/video'
import type { SSEEvent, VideoStatusEventData } from '@cgk/video/creator-tools'

interface StatusIndicatorProps {
  videoId: string
  initialStatus?: VideoStatus
  onStatusChange?: (status: VideoStatus) => void
  onComplete?: () => void
  className?: string
}

/**
 * Real-time video status indicator using SSE
 *
 * Features:
 * - Auto-connects to SSE stream
 * - Shows processing progress
 * - Auto-closes on completion
 */
export function StatusIndicator({
  videoId,
  initialStatus = 'uploading',
  onStatusChange,
  onComplete,
  className,
}: StatusIndicatorProps) {
  const [status, setStatus] = useState<VideoStatus>(initialStatus)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      // Use fetch with ReadableStream for SSE (works better with Next.js)
      const url = `/api/admin/videos/${videoId}/events`

      eventSource = new EventSource(url)

      eventSource.onopen = () => {
        setIsConnected(true)
        setError(null)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent<VideoStatusEventData>

          switch (data.type) {
            case 'connected':
              setIsConnected(true)
              break

            case 'status':
              if (data.data?.status) {
                setStatus(data.data.status)
                onStatusChange?.(data.data.status)
              }
              break

            case 'complete':
              onComplete?.()
              eventSource?.close()
              break

            case 'error':
              setError((data.data as { message?: string })?.message || 'Unknown error')
              break

            case 'timeout':
              eventSource?.close()
              break
          }
        } catch (err) {
          console.error('Failed to parse SSE event:', err)
        }
      }

      eventSource.onerror = () => {
        setIsConnected(false)
        eventSource?.close()

        // Attempt to reconnect after 5 seconds
        reconnectTimeout = setTimeout(() => {
          if (status !== 'ready' && status !== 'error') {
            connect()
          }
        }, 5000)
      }
    }

    // Only connect if video is still processing
    if (status === 'uploading' || status === 'processing') {
      connect()
    }

    return () => {
      eventSource?.close()
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [videoId, status, onStatusChange, onComplete])

  const statusConfig = getStatusConfig(status)

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Status icon */}
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', statusConfig.bgClass)}>
        {statusConfig.icon}
      </div>

      {/* Status text */}
      <div>
        <div className="flex items-center gap-2">
          <span className={cn('font-medium', statusConfig.textClass)}>
            {statusConfig.label}
          </span>
          {isConnected && status !== 'ready' && status !== 'error' && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <Circle className="h-2 w-2 fill-current" />
              Live
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {statusConfig.description}
        </p>
        {error && (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  )
}

function getStatusConfig(status: VideoStatus) {
  switch (status) {
    case 'uploading':
      return {
        label: 'Uploading',
        description: 'Your video is being uploaded to the server',
        icon: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
        bgClass: 'bg-blue-500/10',
        textClass: 'text-blue-500',
      }
    case 'processing':
      return {
        label: 'Processing',
        description: 'Encoding video for optimal playback',
        icon: <Loader2 className="h-5 w-5 animate-spin text-amber-500" />,
        bgClass: 'bg-amber-500/10',
        textClass: 'text-amber-500',
      }
    case 'ready':
      return {
        label: 'Ready',
        description: 'Video is ready for playback',
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        bgClass: 'bg-green-500/10',
        textClass: 'text-green-500',
      }
    case 'error':
      return {
        label: 'Error',
        description: 'Something went wrong during processing',
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        bgClass: 'bg-red-500/10',
        textClass: 'text-red-500',
      }
    case 'deleted':
      return {
        label: 'Deleted',
        description: 'This video has been deleted',
        icon: <XCircle className="h-5 w-5 text-zinc-500" />,
        bgClass: 'bg-zinc-500/10',
        textClass: 'text-zinc-500',
      }
    default:
      return {
        label: 'Unknown',
        description: 'Unknown status',
        icon: <Circle className="h-5 w-5 text-zinc-500" />,
        bgClass: 'bg-zinc-500/10',
        textClass: 'text-zinc-500',
      }
  }
}

interface StatusBadgeProps {
  status: VideoStatus
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Compact status badge for lists
 */
export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const config = getStatusConfig(status)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.bgClass,
        config.textClass,
        className
      )}
    >
      {(status === 'uploading' || status === 'processing') && (
        <Loader2 className={cn('animate-spin', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      )}
      {config.label}
    </span>
  )
}
