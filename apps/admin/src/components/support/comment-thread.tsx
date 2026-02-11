'use client'

import { useState } from 'react'
import { Button, cn, Textarea } from '@cgk/ui'
import { MessageSquare, User, Bot, Lock, Send, Loader2 } from 'lucide-react'
import type { TicketComment } from '@cgk/support'
import { InternalNoteBadge } from './internal-note-badge'

interface CommentThreadProps {
  ticketId: string
  comments: TicketComment[]
  onAddComment: (content: string, isInternal: boolean) => Promise<void>
  className?: string
}

function formatDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function getAuthorIcon(authorType: TicketComment['authorType']) {
  switch (authorType) {
    case 'agent':
      return User
    case 'customer':
      return MessageSquare
    case 'system':
      return Bot
    default:
      return User
  }
}

export function CommentThread({
  ticketId: _ticketId,
  comments,
  onAddComment,
  className,
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      await onAddComment(newComment.trim(), isInternal)
      setNewComment('')
      setIsInternal(false)
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Comments list */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No comments yet. Start the conversation.
          </div>
        ) : (
          comments.map((comment) => {
            const Icon = getAuthorIcon(comment.authorType)
            const isAgent = comment.authorType === 'agent'
            const isSystem = comment.authorType === 'system'

            return (
              <div
                key={comment.id}
                className={cn(
                  'relative flex gap-3',
                  isSystem && 'opacity-60'
                )}
              >
                {/* Avatar/Icon */}
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    isAgent
                      ? 'bg-primary/10 text-primary'
                      : isSystem
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Comment content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{comment.authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(new Date(comment.createdAt))}
                    </span>
                    {comment.isInternal && <InternalNoteBadge />}
                  </div>

                  <div
                    className={cn(
                      'mt-1 rounded-lg px-3 py-2 text-sm',
                      comment.isInternal
                        ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800'
                        : isSystem
                          ? 'bg-muted/50 italic'
                          : 'bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{comment.content}</p>
                  </div>

                  {/* Attachments */}
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {comment.attachments.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Attachment {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* New comment form */}
      <div className="mt-4 border-t pt-4">
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isInternal ? 'Add internal note...' : 'Reply to customer...'}
              className={cn(
                'min-h-[80px] pr-12 resize-none',
                isInternal && 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950'
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsInternal(!isInternal)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                isInternal
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Lock className="h-3 w-3" />
              {isInternal ? 'Internal note (hidden from customer)' : 'Mark as internal'}
            </button>

            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
