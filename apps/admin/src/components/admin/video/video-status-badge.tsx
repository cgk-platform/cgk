'use client'

import { Badge } from '@cgk/ui'
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Upload,
  Trash2,
} from 'lucide-react'

import type { VideoStatus } from '@cgk/video'

interface VideoStatusBadgeProps {
  status: VideoStatus
}

const statusConfig: Record<
  VideoStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: React.ElementType
    className: string
  }
> = {
  uploading: {
    label: 'Uploading',
    variant: 'outline',
    icon: Upload,
    className: 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  processing: {
    label: 'Processing',
    variant: 'outline',
    icon: Loader2,
    className: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  ready: {
    label: 'Ready',
    variant: 'outline',
    icon: CheckCircle,
    className: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  error: {
    label: 'Error',
    variant: 'destructive',
    icon: AlertCircle,
    className: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
  },
  deleted: {
    label: 'Deleted',
    variant: 'secondary',
    icon: Trash2,
    className: 'border-zinc-500/50 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  },
}

export function VideoStatusBadge({ status }: VideoStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon
  const isAnimated = status === 'processing' || status === 'uploading'

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon
        className={`mr-1 h-3 w-3 ${isAnimated ? 'animate-spin' : ''}`}
      />
      {config.label}
    </Badge>
  )
}
