'use client'

import { cn } from '@cgk-platform/ui'
import { Clock, MessageSquare, Reply, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { formatCommentTimestamp, type VideoComment } from '@cgk-platform/video/interactions'

import { CommentInput } from './comment-input'

interface CommentsSectionProps {
  comments: VideoComment[]
  currentUserId?: string
  currentTime?: number
  onAddComment: (content: string, timestampSeconds: number | null, parentId?: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  onSeekToTimestamp?: (seconds: number) => void
  className?: string
}

/**
 * Video comments section with threading support
 *
 * Features:
 * - Threaded comments with replies
 * - Timestamp links to seek video
 * - Reply functionality
 * - Delete for own comments
 */
export function CommentsSection({
  comments,
  currentUserId,
  currentTime = 0,
  onAddComment,
  onDeleteComment,
  onSeekToTimestamp,
  className,
}: CommentsSectionProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const handleAddComment = async (content: string, timestampSeconds: number | null) => {
    await onAddComment(content, timestampSeconds)
  }

  const handleAddReply = async (parentId: string, content: string) => {
    await onAddComment(content, null, parentId)
    setReplyingTo(null)
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b pb-4">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Comments</h3>
        <span className="text-sm text-muted-foreground">
          ({comments.length})
        </span>
      </div>

      {/* Add comment input */}
      <div className="py-4">
        <CommentInput
          currentTime={currentTime}
          onSubmit={handleAddComment}
          placeholder="Add a comment..."
        />
      </div>

      {/* Comments list */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              isReplyingTo={replyingTo === comment.id}
              onReply={() => setReplyingTo(comment.id)}
              onCancelReply={() => setReplyingTo(null)}
              onAddReply={(content) => handleAddReply(comment.id, content)}
              onDelete={() => onDeleteComment(comment.id)}
              onSeekToTimestamp={onSeekToTimestamp}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface CommentItemProps {
  comment: VideoComment
  currentUserId?: string
  isReplyingTo: boolean
  onReply: () => void
  onCancelReply: () => void
  onAddReply: (content: string) => Promise<void>
  onDelete: () => void
  onSeekToTimestamp?: (seconds: number) => void
  depth?: number
}

function CommentItem({
  comment,
  currentUserId,
  isReplyingTo,
  onReply,
  onCancelReply,
  onAddReply,
  onDelete,
  onSeekToTimestamp,
  depth = 0,
}: CommentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = currentUserId === comment.userId
  const hasTimestamp = comment.timestampSeconds !== null

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return
    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTimestampClick = () => {
    if (hasTimestamp && onSeekToTimestamp) {
      onSeekToTimestamp(comment.timestampSeconds!)
    }
  }

  // Get initials from user name
  const initials = comment.userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={cn('group', depth > 0 && 'ml-8 border-l-2 border-muted pl-4')}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {comment.userAvatarUrl ? (
            <img
              src={comment.userAvatarUrl}
              alt={comment.userName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.userName}</span>
            {hasTimestamp && (
              <button
                onClick={handleTimestampClick}
                className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-mono text-amber-500 transition-colors hover:bg-amber-500/20"
              >
                <Clock className="h-3 w-3" />
                {formatCommentTimestamp(comment.timestampSeconds)}
              </button>
            )}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>

          <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-4 opacity-0 transition-opacity group-hover:opacity-100">
            {depth === 0 && (
              <button
                onClick={onReply}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Reply className="h-3.5 w-3.5" />
                Reply
              </button>
            )}

            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>

          {/* Reply input */}
          {isReplyingTo && (
            <div className="mt-3">
              <CommentInput
                onSubmit={(content) => onAddReply(content)}
                onCancel={onCancelReply}
                placeholder={`Reply to ${comment.userName}...`}
                showTimestamp={false}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isReplyingTo={false}
              onReply={() => {}}
              onCancelReply={() => {}}
              onAddReply={async () => {}}
              onDelete={() => onDelete()}
              onSeekToTimestamp={onSeekToTimestamp}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}
