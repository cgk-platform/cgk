import { cn } from '@cgk-platform/ui'
import Link from 'next/link'

import { ThreadStatusBadge } from '@/components/commerce/status-badge'
import { formatDateTime } from '@/lib/format'
import type { Thread } from '@/lib/messaging/types'

interface ThreadListProps {
  threads: Thread[]
  activeThreadId?: string
}

export function ThreadList({ threads, activeThreadId }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No conversations yet.
      </div>
    )
  }

  return (
    <div className="divide-y">
      {threads.map((thread) => (
        <ThreadListItem
          key={thread.id}
          thread={thread}
          isActive={thread.id === activeThreadId}
        />
      ))}
    </div>
  )
}

function ThreadListItem({ thread, isActive }: { thread: Thread; isActive: boolean }) {
  const initials = thread.creator_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Link
      href={`/admin/creators/inbox?thread=${thread.id}`}
      className={cn(
        'block p-4 transition-colors hover:bg-muted/50',
        isActive && 'bg-muted',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
          {thread.creator_avatar_url ? (
            <img
              src={thread.creator_avatar_url}
              alt={thread.creator_name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('truncate font-medium', thread.unread_count > 0 && 'font-bold')}>
              {thread.creator_name}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDateTime(thread.last_message_at)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="truncate text-sm text-muted-foreground">{thread.subject}</span>
            {thread.unread_count > 0 && (
              <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                {thread.unread_count}
              </span>
            )}
          </div>
          {thread.last_message_preview && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {thread.last_message_preview}
            </p>
          )}
          <div className="mt-2">
            <ThreadStatusBadge status={thread.status} />
          </div>
        </div>
      </div>
    </Link>
  )
}
