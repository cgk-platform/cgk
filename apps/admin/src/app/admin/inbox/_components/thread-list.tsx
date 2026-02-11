'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, MessageSquare, User } from 'lucide-react'

import { cn } from '@cgk/ui'

interface Thread {
  id: string
  contact: {
    id: string
    name: string
    email: string | null
    avatarUrl: string | null
    contactType: string
  }
  subject: string | null
  status: string
  priority: string
  lastMessageAt: string | null
  lastMessagePreview: string | null
  lastMessageSender: string | null
  unreadCount: number
  assignedTo: {
    id: string
    name: string
  } | null
}

interface ThreadListProps {
  threads: Thread[]
  selectedThreadId?: string
}

export function ThreadList({ threads, selectedThreadId }: ThreadListProps) {
  const searchParams = useSearchParams()
  const status = searchParams.get('status') || 'open'

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="h-2 w-2 rounded-full bg-destructive" />
      case 'high':
        return <span className="h-2 w-2 rounded-full bg-amber-500" />
      case 'normal':
        return null
      case 'low':
        return <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
      default:
        return null
    }
  }

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'creator':
        return <User className="h-4 w-4" />
      case 'customer':
        return <User className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-muted/50 p-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 font-medium">No threads</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {status === 'open'
            ? 'All caught up! No open threads.'
            : `No ${status} threads found.`}
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {threads.map((thread) => {
        const isSelected = thread.id === selectedThreadId
        const hasUnread = thread.unreadCount > 0

        return (
          <Link
            key={thread.id}
            href={`/admin/inbox/thread/${thread.id}`}
            className={cn(
              'block px-4 py-3 transition-colors',
              isSelected
                ? 'bg-primary/5 border-l-2 border-l-primary'
                : 'hover:bg-muted/50',
              hasUnread && 'bg-primary/[0.02]'
            )}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                  hasUnread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                {thread.contact.avatarUrl ? (
                  <img
                    src={thread.contact.avatarUrl}
                    alt={thread.contact.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  getContactIcon(thread.contact.contactType)
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getPriorityIndicator(thread.priority)}
                    <span
                      className={cn(
                        'truncate',
                        hasUnread ? 'font-semibold text-foreground' : 'font-medium'
                      )}
                    >
                      {thread.contact.name}
                    </span>
                    {hasUnread && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {thread.lastMessageAt
                      ? formatRelativeTime(new Date(thread.lastMessageAt))
                      : ''}
                  </span>
                </div>

                {thread.subject && (
                  <div
                    className={cn(
                      'mt-0.5 truncate text-sm',
                      hasUnread ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {thread.subject}
                  </div>
                )}

                {thread.lastMessagePreview && (
                  <div className="mt-1 truncate text-sm text-muted-foreground">
                    {thread.lastMessageSender === 'team_member' && (
                      <span className="text-primary">You: </span>
                    )}
                    {thread.lastMessagePreview}
                  </div>
                )}

                {/* Assignment indicator */}
                {thread.assignedTo && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{thread.assignedTo.name}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
