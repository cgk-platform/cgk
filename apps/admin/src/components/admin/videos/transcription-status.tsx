'use client'

/**
 * TranscriptionStatus Component
 *
 * Displays the current transcription status with:
 * - Status badge (pending/processing/completed/failed)
 * - Retry button for failed transcriptions
 * - Progress indicator for processing state
 *
 * @ai-pattern editorial-studio
 */

import { useState } from 'react'
import { Badge, Button, Spinner } from '@cgk-platform/ui'

export type TranscriptionStatusType = 'pending' | 'processing' | 'completed' | 'failed'

interface TranscriptionStatusProps {
  status: TranscriptionStatusType
  videoId: string
  onRetry?: () => Promise<void>
  className?: string
}

const STATUS_CONFIG: Record<
  TranscriptionStatusType,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className: string
  }
> = {
  pending: {
    label: 'Pending',
    variant: 'outline',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
  },
  processing: {
    label: 'Transcribing',
    variant: 'secondary',
    className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  },
  completed: {
    label: 'Transcribed',
    variant: 'default',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  },
  failed: {
    label: 'Failed',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  },
}

export function TranscriptionStatus({
  status,
  videoId: _videoId,
  onRetry,
  className = '',
}: TranscriptionStatusProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const config = STATUS_CONFIG[status]

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return

    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Badge
        variant={config.variant}
        className={`${config.className} font-mono text-xs uppercase tracking-wider px-2.5 py-1`}
      >
        {status === 'processing' && (
          <Spinner size="sm" className="mr-1.5 h-3 w-3" />
        )}
        {config.label}
      </Badge>

      {status === 'failed' && onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={isRetrying}
          className="h-7 px-3 text-xs font-medium border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          {isRetrying ? (
            <>
              <Spinner size="sm" className="mr-1.5 h-3 w-3" />
              Retrying...
            </>
          ) : (
            <>
              <RetryIcon className="mr-1.5 h-3 w-3" />
              Retry
            </>
          )}
        </Button>
      )}

      {status === 'pending' && onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={isRetrying}
          className="h-7 px-3 text-xs font-medium"
        >
          {isRetrying ? (
            <>
              <Spinner size="sm" className="mr-1.5 h-3 w-3" />
              Starting...
            </>
          ) : (
            <>
              <PlayIcon className="mr-1.5 h-3 w-3" />
              Start Transcription
            </>
          )}
        </Button>
      )}
    </div>
  )
}

function RetryIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6.39-2.908a.75.75 0 01.766.027l3.5 2.25a.75.75 0 010 1.262l-3.5 2.25A.75.75 0 018 12.25v-4.5a.75.75 0 01.39-.658z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default TranscriptionStatus
