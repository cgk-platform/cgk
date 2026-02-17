'use client'

/**
 * Timeline Block Component
 *
 * Company history and brand story timeline with events,
 * supporting vertical and alternating layouts.
 */

import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, TimelineConfig, TimelineEvent } from '../types'
import { LucideIcon } from '../icons'

/**
 * Timeline event card component
 */
function TimelineEventCard({
  event,
  index,
  isAlternating,
  showConnectors,
}: {
  event: TimelineEvent
  index: number
  isAlternating: boolean
  showConnectors: boolean
}) {
  const isEven = index % 2 === 0

  return (
    <div
      className={cn(
        'relative',
        isAlternating && 'md:grid md:grid-cols-2 md:gap-8',
        isAlternating && !isEven && 'md:flex-row-reverse'
      )}
    >
      {/* Connector line for vertical layout */}
      {showConnectors && (
        <div
          className={cn(
            'absolute top-0 h-full w-0.5',
            'bg-gradient-to-b from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-primary))]/20',
            isAlternating ? 'left-1/2 hidden md:block' : 'left-6'
          )}
        />
      )}

      {/* Year marker */}
      <div
        className={cn(
          'absolute z-10 flex items-center justify-center',
          'h-12 w-12 rounded-full',
          'bg-[hsl(var(--portal-primary))] text-white',
          'shadow-lg shadow-[hsl(var(--portal-primary))]/20',
          'text-sm font-bold',
          isAlternating
            ? 'left-1/2 -translate-x-1/2 hidden md:flex'
            : 'left-0'
        )}
      >
        {event.icon ? (
          <LucideIcon name={event.icon} className="h-5 w-5" />
        ) : (
          event.year.slice(-2)
        )}
      </div>

      {/* Content card */}
      <div
        className={cn(
          'ml-20 md:ml-0',
          isAlternating && isEven && 'md:col-start-2 md:pl-16',
          isAlternating && !isEven && 'md:col-start-1 md:pr-16 md:text-right',
          !isAlternating && 'md:ml-20',
          'animate-fade-in-up'
        )}
        style={{ animationDelay: `${index * 150}ms` }}
      >
        <div
          className={cn(
            'rounded-2xl p-6 transition-all duration-300',
            'bg-[hsl(var(--portal-card))]',
            'border border-[hsl(var(--portal-border))]',
            'hover:shadow-xl hover:-translate-y-1'
          )}
        >
          {/* Year badge */}
          <span
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1',
              'bg-[hsl(var(--portal-primary))]/10 text-[hsl(var(--portal-primary))]',
              'text-sm font-semibold',
              'mb-4'
            )}
          >
            {event.year}
          </span>

          {/* Image */}
          {event.image?.src && (
            <div className="relative mb-4 aspect-video overflow-hidden rounded-xl">
              <Image
                src={event.image.src}
                alt={event.image.alt || event.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}

          {/* Title */}
          <h3 className="text-xl font-semibold text-[hsl(var(--portal-foreground))]">
            {event.title}
          </h3>

          {/* Description */}
          <p className="mt-2 text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
            {event.description}
          </p>
        </div>
      </div>

      {/* Spacer for alternating layout */}
      {isAlternating && (
        <div className={cn('hidden md:block', isEven ? 'md:col-start-1' : 'md:col-start-2')} />
      )}
    </div>
  )
}

/**
 * Timeline Block Component
 */
export function TimelineBlock({ block, className }: BlockProps<TimelineConfig>) {
  const {
    headline,
    subheadline,
    events,
    layout = 'vertical',
    showConnectors = true,
    backgroundColor,
  } = block.config

  const isAlternating = layout === 'alternating'

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
              <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl lg:text-5xl">
                {headline}
              </h2>
            )}
          </div>
        )}

        {/* Timeline */}
        <div className={cn('relative', isAlternating && 'max-w-5xl mx-auto')}>
          <div className="space-y-12">
            {events.map((event, index) => (
              <TimelineEventCard
                key={event.id}
                event={event}
                index={index}
                isAlternating={isAlternating}
                showConnectors={showConnectors}
              />
            ))}
          </div>

          {/* End marker */}
          {showConnectors && (
            <div
              className={cn(
                'absolute bottom-0 flex items-center justify-center',
                'h-8 w-8 rounded-full',
                'bg-[hsl(var(--portal-muted))]',
                'border-4 border-[hsl(var(--portal-background))]',
                isAlternating
                  ? 'left-1/2 -translate-x-1/2 hidden md:flex'
                  : 'left-2'
              )}
            >
              <LucideIcon
                name="Check"
                className="h-4 w-4 text-[hsl(var(--portal-muted-foreground))]"
              />
            </div>
          )}
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
