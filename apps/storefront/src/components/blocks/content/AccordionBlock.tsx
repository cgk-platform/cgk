/**
 * Accordion Block Component
 *
 * Expandable accordion sections with animated expand/collapse,
 * configurable icon styles (plus/minus or chevron), and
 * support for multiple open items.
 */

'use client'

import { useState, useCallback } from 'react'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, AccordionConfig, AccordionItem } from '../types'
import { LucideIcon } from '../icons'

/**
 * Single Accordion Item Component
 */
function AccordionItemComponent({
  item,
  index,
  isOpen,
  onToggle,
  iconStyle,
}: {
  item: AccordionItem
  index: number
  isOpen: boolean
  onToggle: () => void
  iconStyle: 'plus-minus' | 'chevron'
}) {
  return (
    <div
      className={cn(
        'group overflow-hidden rounded-xl border transition-all duration-300',
        isOpen
          ? 'border-[hsl(var(--portal-primary))]/30 bg-[hsl(var(--portal-primary))]/5 shadow-lg shadow-[hsl(var(--portal-primary))]/5'
          : 'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] hover:border-[hsl(var(--portal-primary))]/20',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header / Trigger */}
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between gap-4 p-6 text-left',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[hsl(var(--portal-primary))]',
          'focus-visible:ring-offset-2 rounded-xl'
        )}
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${item.id}`}
      >
        <span
          className={cn(
            'text-lg font-semibold transition-colors duration-200',
            isOpen
              ? 'text-[hsl(var(--portal-primary))]'
              : 'text-[hsl(var(--portal-foreground))]'
          )}
        >
          {item.title}
        </span>

        {/* Icon */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            'transition-all duration-300',
            isOpen
              ? 'bg-[hsl(var(--portal-primary))] text-white'
              : 'bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]'
          )}
        >
          {iconStyle === 'plus-minus' ? (
            <div className="relative h-4 w-4">
              {/* Horizontal line (always visible) */}
              <span
                className={cn(
                  'absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2',
                  'bg-current transition-transform duration-300'
                )}
              />
              {/* Vertical line (rotates on open) */}
              <span
                className={cn(
                  'absolute left-1/2 top-0 h-4 w-0.5 -translate-x-1/2',
                  'bg-current transition-transform duration-300',
                  isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                )}
              />
            </div>
          ) : (
            <LucideIcon
              name="ChevronDown"
              className={cn(
                'h-4 w-4 transition-transform duration-300',
                isOpen && 'rotate-180'
              )}
            />
          )}
        </div>
      </button>

      {/* Content Panel */}
      <div
        id={`accordion-content-${item.id}`}
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pt-0">
            {/* Support for HTML content */}
            {item.content.includes('<') ? (
              <div
                className="prose prose-sm max-w-none text-[hsl(var(--portal-muted-foreground))] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            ) : (
              <p className="text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
                {item.content}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Accordion Block Component
 */
export function AccordionBlock({ block, className }: BlockProps<AccordionConfig>) {
  const {
    headline,
    subheadline,
    items,
    allowMultipleOpen = false,
    defaultOpenItems = [],
    iconStyle = 'chevron',
    backgroundColor,
  } = block.config

  // Initialize open items from defaults
  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    const initial = new Set<string>(defaultOpenItems)
    // If no defaults and we have items, open the first one
    const firstItem = items[0]
    if (initial.size === 0 && firstItem) {
      initial.add(firstItem.id)
    }
    return initial
  })

  const handleToggle = useCallback(
    (itemId: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev)
        if (next.has(itemId)) {
          next.delete(itemId)
        } else {
          if (allowMultipleOpen) {
            next.add(itemId)
          } else {
            next.clear()
            next.add(itemId)
          }
        }
        return next
      })
    },
    [allowMultipleOpen]
  )

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-4xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline) && (
          <div className="mx-auto mb-12 max-w-3xl text-center">
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

        {/* Accordion Items */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <AccordionItemComponent
              key={item.id}
              item={item}
              index={index}
              isOpen={openItems.has(item.id)}
              onToggle={() => handleToggle(item.id)}
              iconStyle={iconStyle}
            />
          ))}
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
