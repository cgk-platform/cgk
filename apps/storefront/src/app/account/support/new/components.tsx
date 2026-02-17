/**
 * Create Ticket Form Components
 *
 * Client form for submitting new support tickets.
 */

'use client'

import { Button, cn } from '@cgk-platform/ui'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { createTicket } from '@/lib/account/api'
import { ticketCategoryLabels, defaultContent } from '@/lib/account/content'
import type { TicketCategory } from '@/lib/account/types'

const categories: TicketCategory[] = [
  'order_issue',
  'shipping',
  'return_refund',
  'product_inquiry',
  'account',
  'payment',
  'other',
]

export function CreateTicketForm() {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<TicketCategory | ''>('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!subject.trim() || !category || !message.trim()) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const ticket = await createTicket({
        subject: subject.trim(),
        category,
        message: message.trim(),
        orderId: null,
        attachments: [],
      })

      // Redirect to the new ticket
      router.push(`/account/support/${ticket.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-[hsl(var(--portal-foreground))] mb-2">
          {defaultContent['support.ticket.category']} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                'rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                'hover:border-[hsl(var(--portal-primary))] hover:bg-[hsl(var(--portal-primary))]/5',
                category === cat
                  ? 'border-[hsl(var(--portal-primary))] bg-[hsl(var(--portal-primary))]/10 text-[hsl(var(--portal-primary))]'
                  : 'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] text-[hsl(var(--portal-foreground))]'
              )}
            >
              {ticketCategoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label
          htmlFor="subject"
          className="block text-sm font-medium text-[hsl(var(--portal-foreground))] mb-2"
        >
          {defaultContent['support.ticket.subject']} <span className="text-red-500">*</span>
        </label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of your issue"
          maxLength={200}
          className={cn(
            'w-full rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]',
            'py-3 px-4 text-sm',
            'placeholder:text-[hsl(var(--portal-muted-foreground))]',
            'focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]',
            'transition-all duration-200'
          )}
        />
        <p className="mt-1 text-xs text-[hsl(var(--portal-muted-foreground))]">
          {subject.length}/200 characters
        </p>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-[hsl(var(--portal-foreground))] mb-2"
        >
          {defaultContent['support.ticket.message']} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please describe your issue in detail. Include any relevant order numbers, dates, or other information that will help us assist you."
          rows={6}
          className={cn(
            'w-full rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]',
            'py-3 px-4 text-sm resize-none',
            'placeholder:text-[hsl(var(--portal-muted-foreground))]',
            'focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]',
            'transition-all duration-200'
          )}
        />
      </div>

      {/* Submit Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!subject.trim() || !category || !message.trim() || isSubmitting}
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
              Submitting...
            </>
          ) : (
            <>
              {defaultContent['support.ticket.submit']}
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
