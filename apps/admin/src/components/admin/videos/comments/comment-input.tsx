'use client'

import { Button, cn, Textarea } from '@cgk-platform/ui'
import { Clock, Loader2, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { formatCommentTimestamp } from '@cgk-platform/video/interactions'

interface CommentInputProps {
  currentTime?: number
  onSubmit: (content: string, timestampSeconds: number | null) => Promise<void>
  onCancel?: () => void
  placeholder?: string
  showTimestamp?: boolean
  autoFocus?: boolean
  className?: string
}

/**
 * Comment input with optional timestamp attachment
 *
 * Features:
 * - Attach current video timestamp
 * - Auto-resize textarea
 * - Submit on Cmd/Ctrl+Enter
 */
export function CommentInput({
  currentTime = 0,
  onSubmit,
  onCancel,
  placeholder = 'Add a comment...',
  showTimestamp = true,
  autoFocus = false,
  className,
}: CommentInputProps) {
  const [content, setContent] = useState('')
  const [attachTimestamp, setAttachTimestamp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [content])

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const timestamp = attachTimestamp ? Math.floor(currentTime) : null
      await onSubmit(content.trim(), timestamp)
      setContent('')
      setAttachTimestamp(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel()
    }
  }

  const hasContent = content.trim().length > 0

  return (
    <div className={cn('space-y-2', className)}>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-[60px] resize-none"
        rows={1}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showTimestamp && (
            <button
              onClick={() => setAttachTimestamp(!attachTimestamp)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                attachTimestamp
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {attachTimestamp ? (
                <>
                  <span className="font-mono">{formatCommentTimestamp(Math.floor(currentTime))}</span>
                  <X className="h-3 w-3" />
                </>
              ) : (
                'Add timestamp'
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!hasContent || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Post
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Press <kbd className="rounded border bg-muted px-1">Cmd</kbd>+
        <kbd className="rounded border bg-muted px-1">Enter</kbd> to post
      </p>
    </div>
  )
}
