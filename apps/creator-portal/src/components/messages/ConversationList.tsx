'use client'

import { cn } from '@cgk-platform/ui'

interface Conversation {
  id: string
  subject: string | null
  brandName: string | null
  coordinatorName: string | null
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
}

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/**
 * Format relative time
 */
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps): React.JSX.Element {
  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground/50"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p className="mt-4 text-sm text-muted-foreground">No conversations yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Messages from your coordinators will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          type="button"
          onClick={() => onSelect(conversation.id)}
          className={cn(
            'w-full px-4 py-3 text-left transition-colors hover:bg-accent',
            selectedId === conversation.id && 'bg-accent'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {conversation.subject || conversation.brandName || 'General'}
                </span>
                {conversation.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
              {conversation.coordinatorName && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {conversation.coordinatorName}
                </p>
              )}
              {conversation.lastMessagePreview && (
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {conversation.lastMessagePreview}
                </p>
              )}
            </div>
            {conversation.lastMessageAt && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatRelativeTime(conversation.lastMessageAt)}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
