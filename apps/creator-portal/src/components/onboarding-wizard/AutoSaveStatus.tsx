'use client'

import { cn } from '@cgk/ui'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutoSaveStatusProps {
  status: SaveStatus
}

/**
 * Auto-save Status Indicator
 *
 * Minimal status indicator showing save progress.
 * Designed to be unobtrusive yet informative.
 */
export function AutoSaveStatus({
  status,
}: AutoSaveStatusProps): React.JSX.Element | null {
  if (status === 'idle') {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-all duration-300',
        status === 'saving' && 'bg-wizard-hover text-wizard-muted',
        status === 'saved' && 'bg-wizard-success/10 text-wizard-success',
        status === 'error' && 'bg-red-50 text-red-600'
      )}
    >
      {status === 'saving' && (
        <>
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-wizard-muted/30 border-t-wizard-muted" />
          <span>Saving...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span>Saved</span>
        </>
      )}

      {status === 'error' && (
        <>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Failed to save</span>
        </>
      )}
    </div>
  )
}
