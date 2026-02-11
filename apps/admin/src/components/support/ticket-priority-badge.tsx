'use client'

import { cn } from '@cgk/ui'
import type { TicketPriority } from '@cgk/support'

interface TicketPriorityBadgeProps {
  priority: TicketPriority
  className?: string
}

const PRIORITY_CONFIG: Record<
  TicketPriority,
  { label: string; bgColor: string; textColor: string; dotColor: string }
> = {
  urgent: {
    label: 'Urgent',
    bgColor: 'bg-red-50 dark:bg-red-950',
    textColor: 'text-red-700 dark:text-red-300',
    dotColor: 'bg-red-500',
  },
  high: {
    label: 'High',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    textColor: 'text-orange-700 dark:text-orange-300',
    dotColor: 'bg-orange-500',
  },
  normal: {
    label: 'Normal',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    textColor: 'text-blue-700 dark:text-blue-300',
    dotColor: 'bg-blue-500',
  },
  low: {
    label: 'Low',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400',
    dotColor: 'bg-gray-400',
  },
}

export function TicketPriorityBadge({ priority, className }: TicketPriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotColor)} />
      {config.label}
    </span>
  )
}
