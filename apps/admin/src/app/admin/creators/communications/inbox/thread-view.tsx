'use client'

import { Button, cn } from '@cgk-platform/ui'
import {
  Archive,
  Check,
  Clock,
  MoreHorizontal,
  Paperclip,
  Send,
  Star,
  User,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { Conversation, ConversationMessage } from '@/lib/creator-communications/types'

interface ThreadViewProps {
  conversation: Conversation
  messages: ConversationMessage[]
}

export function ThreadView({ conversation, messages }: ThreadViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [content, setContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (!content.trim()) return

    setIsSending(true)
    try {
      const response = await fetch(
        `/api/admin/creators/communications/inbox/${conversation.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, isInternal }),
        },
      )

      if (response.ok) {
        setContent('')
        setIsInternal(false)
        startTransition(() => {
          router.refresh()
        })
      }
    } finally {
      setIsSending(false)
    }
  }

  const handleAction = async (action: string, value?: boolean) => {
    const body: Record<string, unknown> = {}
    if (action === 'star') body.starred = value
    if (action === 'archive') body.archived = value
    if (action === 'status') body.status = value ? 'closed' : 'open'

    await fetch(`/api/admin/creators/communications/inbox/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    startTransition(() => {
      router.refresh()
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }


  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = formatDate(message.created_at)
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
      return groups
    },
    {} as Record<string, ConversationMessage[]>,
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-medium">
            {conversation.creator_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h2 className="font-medium">{conversation.creator_name}</h2>
            <p className="text-xs text-muted-foreground">{conversation.creator_email}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleAction('star', !conversation.is_starred)}
          >
            <Star
              className={cn(
                'h-4 w-4',
                conversation.is_starred && 'fill-amber-400 text-amber-400',
              )}
            />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleAction('archive', !conversation.is_archived)}
          >
            <Archive className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleAction('status', conversation.status !== 'closed')}
          >
            {conversation.status === 'closed' ? (
              <X className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Subject bar */}
      {conversation.subject && (
        <div className="border-b bg-muted/30 px-4 py-2">
          <p className="text-sm font-medium">{conversation.subject}</p>
          {conversation.project_name && (
            <p className="text-xs text-muted-foreground">
              Project: {conversation.project_name}
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date} className="mb-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{date}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-4">
              {dateMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  creatorName={conversation.creator_name}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t p-4">
        {/* Internal note toggle */}
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsInternal(!isInternal)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              isInternal
                ? 'bg-amber-100 text-amber-700'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            <User className="h-3 w-3" />
            {isInternal ? 'Internal Note' : 'Send as Email'}
          </button>

          {isInternal && (
            <span className="text-xs text-muted-foreground">
              Only visible to your team
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                isInternal
                  ? 'Add an internal note...'
                  : 'Type your message...'
              }
              className={cn(
                'min-h-[80px] w-full resize-none rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20',
                isInternal && 'border-amber-200 bg-amber-50/50',
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSend()
                }
              }}
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Paperclip className="mr-1.5 h-4 w-4" />
              Attach
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Clock className="mr-1.5 h-4 w-4" />
              Schedule
            </Button>
          </div>

          <Button
            size="sm"
            onClick={handleSend}
            disabled={!content.trim() || isSending}
          >
            <Send className="mr-1.5 h-4 w-4" />
            {isSending ? 'Sending...' : isInternal ? 'Add Note' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  creatorName,
}: {
  message: ConversationMessage
  creatorName: string
}) {
  const isOutbound = message.direction === 'outbound'
  const isInternal = message.is_internal

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div
      className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2.5',
          isInternal
            ? 'border-2 border-dashed border-amber-300 bg-amber-50'
            : isOutbound
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted',
        )}
      >
        <div className="mb-1 flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-medium',
              isInternal
                ? 'text-amber-700'
                : isOutbound
                  ? 'text-primary-foreground/80'
                  : 'text-muted-foreground',
            )}
          >
            {isInternal ? (
              <>
                <User className="mr-1 inline h-3 w-3" />
                Internal Note
              </>
            ) : isOutbound ? (
              message.sender_name || 'You'
            ) : (
              creatorName
            )}
          </span>
          <span
            className={cn(
              'text-xs',
              isInternal
                ? 'text-amber-600/70'
                : isOutbound
                  ? 'text-primary-foreground/60'
                  : 'text-muted-foreground/70',
            )}
          >
            {formatTime(message.created_at)}
          </span>
        </div>

        <p
          className={cn(
            'whitespace-pre-wrap text-sm',
            isInternal && 'text-amber-900',
          )}
        >
          {message.body_text || message.body_html}
        </p>

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.attachments.map((attachment, i) => (
              <a
                key={i}
                href={attachment.blob_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors',
                  isOutbound
                    ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                    : 'bg-background hover:bg-background/80',
                )}
              >
                <Paperclip className="h-3 w-3" />
                {attachment.filename}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
