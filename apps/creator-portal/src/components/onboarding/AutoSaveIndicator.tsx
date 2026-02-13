'use client'

import { cn } from '@cgk-platform/ui'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutoSaveIndicatorProps {
  status: SaveStatus
  className?: string
}

/**
 * Auto-save status indicator
 *
 * Shows saving progress with subtle animations.
 * Fades in/out smoothly to avoid jarring the user.
 */
export function AutoSaveIndicator({
  status,
  className,
}: AutoSaveIndicatorProps): React.JSX.Element | null {
  if (status === 'idle') {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs transition-opacity duration-300',
        status === 'saving' && 'text-muted-foreground',
        status === 'saved' && 'text-green-600',
        status === 'error' && 'text-destructive',
        className
      )}
    >
      {status === 'saving' && (
        <>
          <SpinnerIcon className="h-3 w-3 animate-spin" />
          <span>Saving progress...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <CheckIcon className="h-3 w-3" />
          <span>Progress saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertIcon className="h-3 w-3" />
          <span>Failed to save</span>
        </>
      )}
    </div>
  )
}

function SpinnerIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}
