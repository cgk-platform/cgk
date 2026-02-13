'use client'

/**
 * Feature Cards Block Component
 *
 * Grid of feature cards with icons, titles, descriptions,
 * and optional call-to-action buttons.
 */

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, FeatureCardsConfig, FeatureCardItem } from '../types'
import { LucideIcon } from '../icons'

/**
 * Column class mapping
 */
const columnClasses = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
}

/**
 * Card style class mapping
 */
const cardStyleClasses = {
  elevated: cn(
    'bg-[hsl(var(--portal-card))] shadow-lg',
    'hover:shadow-xl hover:-translate-y-1'
  ),
  bordered: cn(
    'bg-transparent border border-[hsl(var(--portal-border))]',
    'hover:border-[hsl(var(--portal-primary))]/30 hover:bg-[hsl(var(--portal-card))]'
  ),
  flat: cn(
    'bg-[hsl(var(--portal-muted))]/30',
    'hover:bg-[hsl(var(--portal-muted))]/50'
  ),
}

/**
 * Single feature card component
 */
function FeatureCard({
  card,
  index,
  cardStyle,
}: {
  card: FeatureCardItem
  index: number
  cardStyle: 'elevated' | 'bordered' | 'flat'
}) {
  return (
    <div
      className={cn(
        'group relative rounded-2xl p-8 transition-all duration-300',
        cardStyleClasses[cardStyle],
        'animate-fade-in-up'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Badge */}
      {card.badge && (
        <div className="absolute -top-3 left-6">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1',
              'bg-[hsl(var(--portal-primary))] text-white',
              'text-xs font-semibold uppercase tracking-wide',
              'shadow-md'
            )}
          >
            {card.badge}
          </span>
        </div>
      )}

      {/* Icon or Image */}
      {card.image?.src ? (
        <div className="relative mb-6 aspect-video overflow-hidden rounded-xl">
          <Image
            src={card.image.src}
            alt={card.image.alt || card.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      ) : card.icon ? (
        <div
          className={cn(
            'mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl',
            'bg-[hsl(var(--portal-primary))]/10',
            'transition-all duration-300',
            'group-hover:bg-[hsl(var(--portal-primary))] group-hover:shadow-lg',
            'group-hover:shadow-[hsl(var(--portal-primary))]/20'
          )}
        >
          <LucideIcon
            name={card.icon}
            className={cn(
              'h-7 w-7 transition-colors duration-300',
              'text-[hsl(var(--portal-primary))]',
              'group-hover:text-white'
            )}
          />
        </div>
      ) : null}

      {/* Title */}
      <h3 className="text-xl font-semibold text-[hsl(var(--portal-foreground))]">
        {card.title}
      </h3>

      {/* Description */}
      <p className="mt-3 text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
        {card.description}
      </p>

      {/* Button */}
      {card.button && (
        <div className="mt-6">
          <Link
            href={card.button.href}
            className={cn(
              'inline-flex items-center gap-2 text-sm font-semibold',
              'text-[hsl(var(--portal-primary))]',
              'transition-all duration-200',
              'hover:gap-3'
            )}
            {...(card.button.openInNewTab && {
              target: '_blank',
              rel: 'noopener noreferrer',
            })}
          >
            {card.button.text}
            <LucideIcon name="ArrowRight" className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Hover gradient overlay */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300',
          'bg-gradient-to-br from-[hsl(var(--portal-primary))]/5 to-transparent',
          'group-hover:opacity-100 pointer-events-none'
        )}
      />
    </div>
  )
}

/**
 * Feature Cards Block Component
 */
export function FeatureCardsBlock({ block, className }: BlockProps<FeatureCardsConfig>) {
  const {
    headline,
    subheadline,
    cards,
    columns = 3,
    cardStyle = 'elevated',
    backgroundColor,
  } = block.config

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

        {/* Cards Grid */}
        <div className={cn('grid gap-8', columnClasses[columns])}>
          {cards.map((card, index) => (
            <FeatureCard
              key={index}
              card={card}
              index={index}
              cardStyle={cardStyle}
            />
          ))}
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
