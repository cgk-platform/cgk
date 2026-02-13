'use client'

import { cn } from '@cgk-platform/ui'
import { Lock } from 'lucide-react'

interface InternalNoteBadgeProps {
  className?: string
}

export function InternalNoteBadge({ className }: InternalNoteBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:bg-amber-900 dark:text-amber-300',
        className
      )}
    >
      <Lock className="h-2.5 w-2.5" />
      Internal
    </span>
  )
}
