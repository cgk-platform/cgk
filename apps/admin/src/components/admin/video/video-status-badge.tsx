/**
 * Video Status Badge
 *
 * Specialized badge with animated icons for processing states.
 */

'use client'

import { StatusBadge, type StatusBadgeProps, cn } from '@cgk-platform/ui'
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Upload,
  Trash2,
} from 'lucide-react'

import type { VideoStatus } from '@cgk-platform/video'

interface VideoStatusBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  status: VideoStatus
}

const statusIcons: Record<VideoStatus, React.ElementType> = {
  uploading: Upload,
  processing: Loader2,
  ready: CheckCircle,
  error: AlertCircle,
  deleted: Trash2,
}

export function VideoStatusBadge({ status, className, ...props }: VideoStatusBadgeProps) {
  const Icon = statusIcons[status]
  const isAnimated = status === 'processing' || status === 'uploading'

  return (
    <StatusBadge
      status={status}
      className={cn('gap-1', className)}
      {...props}
    >
      <Icon className={cn('h-3 w-3', isAnimated && 'animate-spin')} />
    </StatusBadge>
  )
}
