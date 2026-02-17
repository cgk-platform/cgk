'use client'

/**
 * Values Grid Block Component
 *
 * Display company mission statement and core values
 * in a responsive grid with icons and descriptions.
 */

import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ValuesGridConfig, ValueItem } from '../types'
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
 * Value card component
 */
function ValueCard({
  value,
  index,
  showIcons,
}: {
  value: ValueItem
  index: number
  showIcons: boolean
}) {
  return (
    <div
      className={cn(
        'group relative rounded-2xl p-8 transition-all duration-300',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'hover:shadow-xl hover:-translate-y-1',
        'animate-fade-in-up'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Icon or Image */}
      {value.image?.src ? (
        <div className="relative mb-6 aspect-square w-16 overflow-hidden rounded-xl">
          <Image
            src={value.image.src}
            alt={value.image.alt || value.title}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      ) : showIcons && value.icon ? (
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
            name={value.icon}
            className={cn(
              'h-7 w-7 transition-colors duration-300',
              'text-[hsl(var(--portal-primary))]',
              'group-hover:text-white'
            )}
          />
        </div>
      ) : null}

      {/* Number badge */}
      {!showIcons && !value.image?.src && (
        <div
          className={cn(
            'mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full',
            'bg-gradient-to-br from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-accent))]',
            'text-xl font-bold text-white',
            'shadow-lg'
          )}
        >
          {index + 1}
        </div>
      )}

      {/* Title */}
      <h3 className="text-xl font-semibold text-[hsl(var(--portal-foreground))]">
        {value.title}
      </h3>

      {/* Description */}
      <p className="mt-3 text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
        {value.description}
      </p>

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
 * Value list item component
 */
function ValueListItem({
  value,
  index,
  showIcons,
}: {
  value: ValueItem
  index: number
  showIcons: boolean
}) {
  return (
    <div
      className={cn(
        'flex gap-6 rounded-2xl p-6 transition-all duration-300',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'hover:shadow-lg',
        'animate-fade-in-up'
      )}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      {/* Icon */}
      {showIcons && value.icon && (
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            'bg-[hsl(var(--portal-primary))]/10'
          )}
        >
          <LucideIcon
            name={value.icon}
            className="h-6 w-6 text-[hsl(var(--portal-primary))]"
          />
        </div>
      )}

      {/* Content */}
      <div>
        <h3 className="text-lg font-semibold text-[hsl(var(--portal-foreground))]">
          {value.title}
        </h3>
        <p className="mt-2 text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
          {value.description}
        </p>
      </div>
    </div>
  )
}

/**
 * Values Grid Block Component
 */
export function ValuesGridBlock({ block, className }: BlockProps<ValuesGridConfig>) {
  const {
    headline,
    subheadline,
    missionStatement,
    values,
    columns = 3,
    layout = 'grid',
    showIcons = true,
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
          <div className="mx-auto mb-12 max-w-3xl text-center">
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

        {/* Mission Statement */}
        {missionStatement && (
          <div className="mx-auto mb-16 max-w-4xl">
            <blockquote
              className={cn(
                'relative rounded-2xl p-8 sm:p-12',
                'bg-gradient-to-br from-[hsl(var(--portal-primary))]/5 to-transparent',
                'border border-[hsl(var(--portal-primary))]/20',
                'text-center'
              )}
            >
              {/* Quote marks */}
              <div className="absolute -top-4 left-8">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    'bg-[hsl(var(--portal-primary))]',
                    'shadow-lg shadow-[hsl(var(--portal-primary))]/20'
                  )}
                >
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
              </div>

              <p className="text-xl font-medium leading-relaxed text-[hsl(var(--portal-foreground))] sm:text-2xl">
                {missionStatement}
              </p>

              <div className="mt-6 flex justify-center">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--portal-primary))]">
                  <LucideIcon name="Target" className="h-4 w-4" />
                  Our Mission
                </span>
              </div>
            </blockquote>
          </div>
        )}

        {/* Values */}
        {layout === 'grid' || layout === 'cards' ? (
          <div className={cn('grid gap-8', columnClasses[columns])}>
            {values.map((value, index) => (
              <ValueCard
                key={value.id}
                value={value}
                index={index}
                showIcons={showIcons}
              />
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {values.map((value, index) => (
              <ValueListItem
                key={value.id}
                value={value}
                index={index}
                showIcons={showIcons}
              />
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
