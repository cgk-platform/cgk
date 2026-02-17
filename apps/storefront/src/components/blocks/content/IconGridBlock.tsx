/**
 * Icon Grid Block Component
 *
 * Displays a grid of icons with titles and optional descriptions.
 * Supports both Lucide icon names and custom SVG URLs.
 */

'use client'

import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, IconGridConfig, IconGridItem } from '../types'
import { LucideIcon, getIconByName } from '../icons'

/**
 * Icon size classes
 */
const iconSizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
} as const

const containerSizeClasses = {
  sm: 'h-14 w-14',
  md: 'h-20 w-20',
  lg: 'h-24 w-24',
} as const

/**
 * Check if a string is a URL
 */
function isUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/')
}

/**
 * Single Icon Grid Item Component
 */
function IconGridItemComponent({
  item,
  index,
  iconSize,
  showDescriptions,
}: {
  item: IconGridItem
  index: number
  iconSize: 'sm' | 'md' | 'lg'
  showDescriptions: boolean
}) {
  const isCustomIcon = isUrl(item.icon)
  const hasLucideIcon = !isCustomIcon && getIconByName(item.icon) !== null

  return (
    <div
      className={cn(
        'group flex flex-col items-center text-center',
        'rounded-2xl p-6',
        'transition-all duration-300',
        'hover:bg-[hsl(var(--portal-muted))]/50',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      {/* Icon Container */}
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl',
          'bg-gradient-to-br from-[hsl(var(--portal-primary))]/10 to-[hsl(var(--portal-primary))]/5',
          'transition-all duration-300',
          'group-hover:scale-110 group-hover:shadow-lg',
          'group-hover:from-[hsl(var(--portal-primary))]/20 group-hover:to-[hsl(var(--portal-primary))]/10',
          containerSizeClasses[iconSize]
        )}
      >
        {isCustomIcon ? (
          // Custom SVG URL
          <div className={cn('relative', iconSizeClasses[iconSize])}>
            <Image
              src={item.icon}
              alt={item.title}
              fill
              className="object-contain"
              sizes={iconSize === 'lg' ? '64px' : iconSize === 'md' ? '48px' : '32px'}
            />
          </div>
        ) : hasLucideIcon ? (
          // Lucide icon
          <LucideIcon
            name={item.icon}
            className={cn(
              iconSizeClasses[iconSize],
              'text-[hsl(var(--portal-primary))]',
              'transition-colors duration-300'
            )}
          />
        ) : (
          // Fallback icon
          <LucideIcon
            name="Circle"
            className={cn(
              iconSizeClasses[iconSize],
              'text-[hsl(var(--portal-muted-foreground))]'
            )}
          />
        )}
      </div>

      {/* Title */}
      <h3
        className={cn(
          'mt-4 font-semibold text-[hsl(var(--portal-foreground))]',
          iconSize === 'lg' ? 'text-lg' : 'text-base'
        )}
      >
        {item.title}
      </h3>

      {/* Description */}
      {showDescriptions && item.description && (
        <p className="mt-2 text-sm text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
          {item.description}
        </p>
      )}
    </div>
  )
}

/**
 * Icon Grid Block Component
 */
export function IconGridBlock({ block, className }: BlockProps<IconGridConfig>) {
  const {
    headline,
    subheadline,
    items,
    columns = 4,
    iconSize = 'md',
    showDescriptions = true,
    backgroundColor,
  } = block.config

  // Column class mapping
  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
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

        {/* Icon Grid */}
        <div className={cn('grid gap-6', columnClasses[columns] || columnClasses[4])}>
          {items.map((item, index) => (
            <IconGridItemComponent
              key={index}
              item={item}
              index={index}
              iconSize={iconSize}
              showDescriptions={showDescriptions}
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
