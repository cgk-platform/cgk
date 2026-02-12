/**
 * FAQ Block Component
 *
 * Frequently asked questions in accordion or grid layout.
 * Supports single or multiple open items at once.
 */

'use client'

import { useState } from 'react'
import { cn } from '@cgk/ui'
import type { BlockProps, FAQConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Single FAQ item component
 */
function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
  index,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
  index: number
}) {
  return (
    <div
      className={cn(
        'group rounded-xl border transition-all duration-300',
        'animate-fade-in',
        isOpen
          ? 'border-[hsl(var(--portal-primary))]/30 bg-[hsl(var(--portal-primary))]/5 shadow-sm'
          : 'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] hover:border-[hsl(var(--portal-primary))]/20'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between gap-4 p-6 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--portal-primary))]',
          'focus-visible:ring-offset-2 rounded-xl'
        )}
        aria-expanded={isOpen}
      >
        <span
          className={cn(
            'text-lg font-semibold transition-colors duration-200',
            isOpen
              ? 'text-[hsl(var(--portal-primary))]'
              : 'text-[hsl(var(--portal-foreground))]'
          )}
        >
          {question}
        </span>
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            'transition-all duration-300',
            isOpen
              ? 'bg-[hsl(var(--portal-primary))] text-white rotate-180'
              : 'bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]'
          )}
        >
          <LucideIcon name="ChevronDown" className="h-4 w-4" />
        </div>
      </button>

      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pt-0">
            <p className="text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
              {answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * FAQ Grid Item (always visible)
 */
function FAQGridItem({
  question,
  answer,
  index,
}: {
  question: string
  answer: string
  index: number
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[hsl(var(--portal-border))]',
        'bg-[hsl(var(--portal-card))] p-6',
        'transition-all duration-300',
        'hover:border-[hsl(var(--portal-primary))]/30 hover:shadow-lg',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <h3 className="mb-3 text-lg font-semibold text-[hsl(var(--portal-foreground))]">
        {question}
      </h3>
      <p className="text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
        {answer}
      </p>
    </div>
  )
}

/**
 * FAQ Block Component
 */
export function FAQBlock({ block, className }: BlockProps<FAQConfig>) {
  const {
    headline,
    subheadline,
    items,
    layout = 'accordion',
    allowMultipleOpen = false,
    backgroundColor,
  } = block.config

  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]))

  const handleToggle = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        if (allowMultipleOpen) {
          next.add(index)
        } else {
          next.clear()
          next.add(index)
        }
      }
      return next
    })
  }

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline) && (
          <div className="mx-auto mb-16 max-w-3xl text-center">
            {subheadline && (
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[hsl(var(--portal-primary))]">
                {subheadline}
              </p>
            )}
            {headline && (
              <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
                {headline}
              </h2>
            )}
          </div>
        )}

        {/* FAQ Items */}
        {layout === 'accordion' ? (
          <div className="mx-auto max-w-3xl space-y-4">
            {items.map((item, index) => (
              <FAQItem
                key={index}
                question={item.question}
                answer={item.answer}
                isOpen={openItems.has(index)}
                onToggle={() => handleToggle(index)}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <FAQGridItem
                key={index}
                question={item.question}
                answer={item.answer}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-16 text-center">
          <p className="text-[hsl(var(--portal-muted-foreground))]">
            Still have questions?{' '}
            <a
              href="/contact"
              className="font-medium text-[hsl(var(--portal-primary))] hover:underline"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
