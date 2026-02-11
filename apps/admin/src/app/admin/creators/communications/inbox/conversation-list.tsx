'use client'

import { cn } from '@cgk/ui'
import { Star, User } from 'lucide-react'
import Link from 'next/link'

import type { Conversation } from '@/lib/creator-communications/types'

interface ConversationListProps {
  conversations: Conversation[]
  activeId?: string
}

export function ConversationList({ conversations, activeId }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No conversations found.
      </div>
    )
  }

  return (
    <div className="divide-y">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === activeId}
        />
      ))}
    </div>
  )
}

function ConversationItem({
  conversation,
  isActive,
}: {
  conversation: Conversation
  isActive: boolean
}) {
  const initials = conversation.creator_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const formatTime = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const statusColors = {
    open: 'bg-emerald-500',
    pending: 'bg-amber-500',
    closed: 'bg-slate-400',
  }

  return (
    <Link
      href={`/admin/creators/communications/inbox?conversation=${conversation.id}`}
      className={cn(
        'block p-4 transition-colors',
        isActive ? 'bg-muted' : 'hover:bg-muted/50',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {conversation.creator_avatar_url ? (
            <img
              src={conversation.creator_avatar_url}
              alt={conversation.creator_name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">
              {initials}
            </div>
          )}
          {conversation.unread_count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'truncate text-sm font-medium',
                conversation.unread_count > 0 && 'font-semibold',
              )}
            >
              {conversation.creator_name}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              {conversation.is_starred && (
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              )}
              <span className="text-xs text-muted-foreground">
                {formatTime(conversation.last_message_at)}
              </span>
            </div>
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            {conversation.subject && (
              <span className="truncate text-sm text-muted-foreground">
                {conversation.subject}
              </span>
            )}
          </div>

          {conversation.last_message_preview && (
            <p
              className={cn(
                'mt-1 truncate text-xs',
                conversation.unread_count > 0
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {conversation.last_message_preview}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex h-1.5 w-1.5 rounded-full',
                statusColors[conversation.status],
              )}
            />
            <span className="text-xs capitalize text-muted-foreground">
              {conversation.status}
            </span>

            {conversation.assigned_name && (
              <>
                <span className="text-muted-foreground/50">-</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {conversation.assigned_name}
                </span>
              </>
            )}

            {conversation.project_name && (
              <>
                <span className="text-muted-foreground/50">-</span>
                <span className="truncate text-xs text-muted-foreground">
                  {conversation.project_name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
