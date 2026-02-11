'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Clock, Inbox, Users, X } from 'lucide-react'

import { cn } from '@cgk/ui'

interface InboxSidebarProps {
  stats: {
    openThreads: number
    snoozedThreads: number
    closedThreads: number
    unreadCount: number
  }
}

export function InboxSidebar({ stats }: InboxSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('status') || 'open'
  const currentPriority = searchParams.get('priority') || ''

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/admin/inbox?${params.toString()}`)
  }

  const statusOptions = [
    { value: 'open', label: 'Open', icon: Inbox, count: stats.openThreads },
    { value: 'snoozed', label: 'Snoozed', icon: Clock, count: stats.snoozedThreads },
    { value: 'closed', label: 'Closed', icon: X, count: stats.closedThreads },
  ]

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'urgent', label: 'Urgent', color: 'text-destructive' },
    { value: 'high', label: 'High', color: 'text-amber-500' },
    { value: 'normal', label: 'Normal', color: 'text-foreground' },
    { value: 'low', label: 'Low', color: 'text-muted-foreground' },
  ]

  return (
    <div className="flex h-full w-56 flex-col border-r bg-muted/20">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          <h2 className="font-semibold">Inbox</h2>
          {stats.unreadCount > 0 && (
            <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {stats.unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Status Filter */}
      <div className="p-2">
        <div className="text-xs font-medium text-muted-foreground px-2 py-1">
          Status
        </div>
        <nav className="space-y-0.5">
          {statusOptions.map((option) => {
            const Icon = option.icon
            const isActive = currentStatus === option.value

            return (
              <button
                key={option.value}
                onClick={() => updateFilter('status', option.value)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{option.label}</span>
                <span
                  className={cn(
                    'text-xs',
                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {option.count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Priority Filter */}
      <div className="p-2">
        <div className="text-xs font-medium text-muted-foreground px-2 py-1">
          Priority
        </div>
        <nav className="space-y-0.5">
          {priorityOptions.map((option) => {
            const isActive = currentPriority === option.value

            return (
              <button
                key={option.value}
                onClick={() => updateFilter('priority', option.value)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {option.color && (
                  <span className={cn('h-2 w-2 rounded-full bg-current', option.color)} />
                )}
                <span className={cn('flex-1 text-left', option.color)}>{option.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Quick Links */}
      <div className="mt-auto border-t p-2">
        <button
          onClick={() => router.push('/admin/inbox/contacts')}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
            'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Users className="h-4 w-4" />
          <span>Contacts</span>
        </button>
      </div>
    </div>
  )
}
