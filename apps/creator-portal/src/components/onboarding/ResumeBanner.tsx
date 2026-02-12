'use client'

import { Button } from '@cgk/ui'
import { cn } from '@cgk/ui'

interface ResumeBannerProps {
  email: string
  step: number
  onResume: () => void
  onStartFresh: () => void
  className?: string
}

/**
 * Resume Application Banner
 *
 * Shown to returning users who have an incomplete application.
 * Allows them to resume where they left off or start fresh.
 */
export function ResumeBanner({
  email,
  step,
  onResume,
  onStartFresh,
  className,
}: ResumeBannerProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-primary/5 p-4',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium text-foreground">
            Welcome back!
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            We found an incomplete application for{' '}
            <span className="font-medium text-foreground">{email}</span>.
            You were on step {step} of 4.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onStartFresh}
          >
            Start Fresh
          </Button>
          <Button
            size="sm"
            onClick={onResume}
          >
            Resume Application
          </Button>
        </div>
      </div>
    </div>
  )
}
