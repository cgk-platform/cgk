/**
 * Support Page Components
 *
 * Client components for support page interactivity.
 */

'use client'

import { cn } from '@cgk-platform/ui'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { FaqCategory, FaqItem } from '@/lib/account/types'

interface SupportSearchProps {
  initialQuery: string
}

export function SupportSearch({ initialQuery }: SupportSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [isPending, startTransition] = useTransition()

  const handleSearch = (value: string) => {
    setQuery(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    params.delete('page')
    startTransition(() => {
      router.push(`/account/support?${params.toString()}`)
    })
  }

  return (
    <div className="relative">
      <svg
        className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--portal-muted-foreground))]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search tickets by number or subject..."
        className={cn(
          'w-full rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]',
          'py-3 pl-12 pr-4 text-sm',
          'placeholder:text-[hsl(var(--portal-muted-foreground))]',
          'focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]',
          'transition-all duration-200',
          isPending && 'opacity-70'
        )}
      />
      {isPending && (
        <svg
          className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-[hsl(var(--portal-primary))]"
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
      )}
    </div>
  )
}

interface FaqAccordionProps {
  categories: FaqCategory[]
}

export function FaqAccordion({ categories }: FaqAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const toggleItem = (itemId: string) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(itemId)) {
      newOpenItems.delete(itemId)
    } else {
      newOpenItems.add(itemId)
    }
    setOpenItems(newOpenItems)
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category.id}>
          <h3 className="text-sm font-medium text-[hsl(var(--portal-muted-foreground))] uppercase tracking-wide mb-3">
            {category.name}
          </h3>
          <div className="space-y-2">
            {category.items.map((item) => (
              <FaqItemAccordion
                key={item.id}
                item={item}
                isOpen={openItems.has(item.id)}
                onToggle={() => toggleItem(item.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface FaqItemAccordionProps {
  item: FaqItem
  isOpen: boolean
  onToggle: () => void
}

function FaqItemAccordion({ item, isOpen, onToggle }: FaqItemAccordionProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[hsl(var(--portal-border))]',
        'bg-[hsl(var(--portal-card))] overflow-hidden transition-all'
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-[hsl(var(--portal-foreground))]">
          {item.question}
        </span>
        <svg
          className={cn(
            'h-5 w-5 flex-shrink-0 text-[hsl(var(--portal-muted-foreground))] transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          <p className="text-sm text-[hsl(var(--portal-muted-foreground))] whitespace-pre-wrap">
            {item.answer}
          </p>
          <FaqFeedback itemId={item.id} />
        </div>
      )}
    </div>
  )
}

interface FaqFeedbackProps {
  itemId: string
}

function FaqFeedback({ itemId }: FaqFeedbackProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitFeedback = async (helpful: boolean) => {
    if (feedback) return

    setIsSubmitting(true)
    try {
      await fetch(`/api/account/support/faq/${itemId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      })
      setFeedback(helpful ? 'helpful' : 'not_helpful')
    } catch {
      // Silently fail
    } finally {
      setIsSubmitting(false)
    }
  }

  if (feedback) {
    return (
      <p className="mt-3 text-xs text-[hsl(var(--portal-muted-foreground))]">
        Thanks for your feedback!
      </p>
    )
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-xs text-[hsl(var(--portal-muted-foreground))]">
        Was this helpful?
      </span>
      <button
        onClick={() => submitFeedback(true)}
        disabled={isSubmitting}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs',
          'border border-[hsl(var(--portal-border))] hover:bg-[hsl(var(--portal-muted))]',
          'transition-colors disabled:opacity-50'
        )}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
        Yes
      </button>
      <button
        onClick={() => submitFeedback(false)}
        disabled={isSubmitting}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs',
          'border border-[hsl(var(--portal-border))] hover:bg-[hsl(var(--portal-muted))]',
          'transition-colors disabled:opacity-50'
        )}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
        </svg>
        No
      </button>
    </div>
  )
}
