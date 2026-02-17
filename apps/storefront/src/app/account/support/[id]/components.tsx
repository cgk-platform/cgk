/**
 * Ticket Detail Page Components
 *
 * Client components for ticket reply and actions.
 */

'use client'

import { Button, cn } from '@cgk-platform/ui'
import { useRouter } from 'next/navigation'
import { useState, useRef, type FormEvent } from 'react'

import { replyToTicket, closeTicket } from '@/lib/account/api'

interface TicketReplyFormProps {
  ticketId: string
}

export function TicketReplyForm({ ticketId }: TicketReplyFormProps) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      await replyToTicket({
        ticketId,
        message: message.trim(),
        attachments: [], // File uploads would be handled separately
      })
      setMessage('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Auto-resize textarea
  const handleTextareaChange = (value: string) => {
    setMessage(value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => handleTextareaChange(e.target.value)}
          placeholder="Type your reply..."
          rows={2}
          className={cn(
            'w-full rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]',
            'py-3 px-4 text-sm resize-none',
            'placeholder:text-[hsl(var(--portal-muted-foreground))]',
            'focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]',
            'transition-all duration-200'
          )}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-[hsl(var(--portal-muted-foreground))]">
          Press Enter to send or Shift+Enter for new line
        </div>
        <Button
          type="submit"
          disabled={!message.trim() || isSubmitting}
          className="rounded-lg"
        >
          {isSubmitting ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Sending...
            </>
          ) : (
            <>
              Send Reply
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

interface CloseTicketButtonProps {
  ticketId: string
}

export function CloseTicketButton({ ticketId }: CloseTicketButtonProps) {
  const router = useRouter()
  const [isClosing, setIsClosing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClose = async () => {
    setIsClosing(true)
    try {
      await closeTicket(ticketId)
      router.refresh()
    } catch (err) {
      console.error('Failed to close ticket:', err)
    } finally {
      setIsClosing(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[hsl(var(--portal-muted-foreground))]">
          Close this ticket?
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={isClosing}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClose}
          disabled={isClosing}
        >
          {isClosing ? 'Closing...' : 'Yes, Close'}
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowConfirm(true)}
      className="text-[hsl(var(--portal-muted-foreground))]"
    >
      <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Close Ticket
    </Button>
  )
}
