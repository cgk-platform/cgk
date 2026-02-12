'use client'

/**
 * Benefits Block Component
 *
 * Displays key benefits in a grid or list layout with icons,
 * titles, and descriptions. Supports multiple column configurations.
 */

import Image from 'next/image'
import { cn } from '@cgk/ui'
import type { BlockProps, BenefitsConfig, BenefitItem } from '../types'
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
 * Single benefit item component
 */
function BenefitItemCard({
  item,
  index,
  layout,
}: {
  item: BenefitItem
  index: number
  layout: 'grid' | 'list' | 'alternating'
}) {
  const isAlternating = layout === 'alternating'
  const isEven = index % 2 === 0

  if (layout === 'list') {
    return (
      <div
        className={cn(
          'group flex gap-6',
          'animate-fade-in-up'
        )}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Icon */}
        <div className="flex-shrink-0">
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-2xl',
              'bg-[hsl(var(--portal-primary))]/10',
              'ring-1 ring-[hsl(var(--portal-primary))]/20',
              'transition-all duration-300',
              'group-hover:bg-[hsl(var(--portal-primary))] group-hover:ring-0',
              'group-hover:shadow-lg group-hover:shadow-[hsl(var(--portal-primary))]/20'
            )}
          >
            <LucideIcon
              name={item.icon || 'check'}
              className={cn(
                'h-6 w-6 transition-colors duration-300',
                'text-[hsl(var(--portal-primary))]',
                'group-hover:text-white'
              )}
              style={{ color: item.iconColor }}
            />
          </div>
        </div>
        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[hsl(var(--portal-foreground))]">
            {item.title}
          </h3>
          <p className="mt-2 text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>
    )
  }

  if (isAlternating && item.image) {
    return (
      <div
        className={cn(
          'grid gap-8 lg:grid-cols-2 lg:gap-16',
          'items-center',
          'animate-fade-in-up'
        )}
        style={{ animationDelay: `${index * 150}ms` }}
      >
        {/* Image */}
        <div
          className={cn(
            'relative aspect-[4/3] overflow-hidden rounded-3xl',
            !isEven && 'lg:order-2'
          )}
        >
          <Image
            src={item.image.src}
            alt={item.image.alt}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          {/* Decorative corner */}
          <div
            className={cn(
              'absolute h-24 w-24 bg-[hsl(var(--portal-primary))]/10',
              isEven ? '-bottom-4 -right-4 rounded-tl-3xl' : '-bottom-4 -left-4 rounded-tr-3xl'
            )}
          />
        </div>
        {/* Content */}
        <div className={cn(!isEven && 'lg:order-1')}>
          {item.icon && (
            <div
              className={cn(
                'mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl',
                'bg-[hsl(var(--portal-primary))]/10'
              )}
            >
              <LucideIcon
                name={item.icon}
                className="h-6 w-6 text-[hsl(var(--portal-primary))]"
              />
            </div>
          )}
          <h3 className="text-2xl font-bold text-[hsl(var(--portal-foreground))] sm:text-3xl">
            {item.title}
          </h3>
          <p className="mt-4 text-lg text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>
    )
  }

  // Default grid card
  return (
    <div
      className={cn(
        'group relative rounded-2xl p-8',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'transition-all duration-300',
        'hover:border-[hsl(var(--portal-primary))]/30',
        'hover:shadow-xl hover:shadow-[hsl(var(--portal-primary))]/5',
        'hover:-translate-y-1',
        'animate-fade-in-up'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Gradient hover effect */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300',
          'bg-gradient-to-br from-[hsl(var(--portal-primary))]/5 to-transparent',
          'group-hover:opacity-100'
        )}
      />

      {/* Icon or Image */}
      {item.image ? (
        <div className="relative mb-6 aspect-video overflow-hidden rounded-xl">
          <Image
            src={item.image.src}
            alt={item.image.alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      ) : (
        <div
          className={cn(
            'relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl',
            'bg-[hsl(var(--portal-primary))]/10',
            'transition-all duration-300',
            'group-hover:bg-[hsl(var(--portal-primary))]'
          )}
        >
          <LucideIcon
            name={item.icon || 'sparkles'}
            className={cn(
              'h-7 w-7 transition-colors duration-300',
              'text-[hsl(var(--portal-primary))]',
              'group-hover:text-white'
            )}
          />
        </div>
      )}

      {/* Content */}
      <h3 className="relative text-xl font-semibold text-[hsl(var(--portal-foreground))]">
        {item.title}
      </h3>
      <p className="relative mt-3 text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
        {item.description}
      </p>

      {/* Corner decoration */}
      <div
        className={cn(
          'absolute bottom-0 right-0 h-16 w-16',
          'bg-gradient-to-tl from-[hsl(var(--portal-primary))]/5 to-transparent',
          'rounded-2xl opacity-0 transition-opacity duration-300',
          'group-hover:opacity-100'
        )}
      />
    </div>
  )
}

/**
 * Benefits Block Component
 */
export function BenefitsBlock({ block, className }: BlockProps<BenefitsConfig>) {
  const {
    headline,
    subheadline,
    items,
    columns = 3,
    layout = 'grid',
    showDividers = false,
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

        {/* Benefits */}
        {layout === 'alternating' ? (
          <div className="space-y-20 lg:space-y-32">
            {items.map((item, index) => (
              <BenefitItemCard
                key={index}
                item={item}
                index={index}
                layout={layout}
              />
            ))}
          </div>
        ) : layout === 'list' ? (
          <div className="mx-auto max-w-3xl space-y-10">
            {items.map((item, index) => (
              <div key={index}>
                <BenefitItemCard item={item} index={index} layout={layout} />
                {showDividers && index < items.length - 1 && (
                  <div className="mt-10 h-px bg-gradient-to-r from-transparent via-[hsl(var(--portal-border))] to-transparent" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={cn('grid gap-8', columnClasses[columns])}>
            {items.map((item, index) => (
              <BenefitItemCard key={index} item={item} index={index} layout={layout} />
            ))}
          </div>
        )}
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
