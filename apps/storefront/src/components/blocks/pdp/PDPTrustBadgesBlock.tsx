/**
 * PDP Trust Badges Block Component
 *
 * Displays trust signals and security badges to build customer confidence.
 * Supports inline, grid, and compact layouts.
 */

import { cn } from '@cgk-platform/ui'
import type { BlockProps, PDPTrustBadgesConfig, TrustBadgeItem } from '../types'
import { LucideIcon } from '../icons'

/**
 * Single trust badge component
 */
function TrustBadge({
  badge,
  layout,
  index,
}: {
  badge: TrustBadgeItem
  layout: 'inline' | 'grid' | 'compact'
  index: number
}) {
  if (layout === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5',
          'text-[hsl(var(--portal-muted-foreground))]',
          'animate-fade-in'
        )}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <LucideIcon
          name={badge.icon}
          className="h-4 w-4 text-[hsl(var(--portal-primary))]"
        />
        <span className="text-sm font-medium">{badge.title}</span>
      </div>
    )
  }

  if (layout === 'grid') {
    return (
      <div
        className={cn(
          'group flex flex-col items-center text-center p-6',
          'rounded-xl bg-[hsl(var(--portal-card))]',
          'border border-[hsl(var(--portal-border))]',
          'transition-all duration-300',
          'hover:border-[hsl(var(--portal-primary))]/20 hover:shadow-lg',
          'animate-fade-in'
        )}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div
          className={cn(
            'mb-4 flex h-14 w-14 items-center justify-center rounded-full',
            'bg-[hsl(var(--portal-primary))]/10',
            'transition-all duration-300',
            'group-hover:bg-[hsl(var(--portal-primary))] group-hover:shadow-lg',
            'group-hover:shadow-[hsl(var(--portal-primary))]/20'
          )}
        >
          <LucideIcon
            name={badge.icon}
            className={cn(
              'h-6 w-6 transition-colors duration-300',
              'text-[hsl(var(--portal-primary))]',
              'group-hover:text-white'
            )}
          />
        </div>
        <h3 className="font-semibold text-[hsl(var(--portal-foreground))]">
          {badge.title}
        </h3>
        {badge.description && (
          <p className="mt-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
            {badge.description}
          </p>
        )}
      </div>
    )
  }

  // Inline layout (default)
  return (
    <div
      className={cn(
        'flex items-center gap-4 py-3',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
          'bg-[hsl(var(--portal-primary))]/10'
        )}
      >
        <LucideIcon
          name={badge.icon}
          className="h-5 w-5 text-[hsl(var(--portal-primary))]"
        />
      </div>
      <div>
        <h3 className="font-semibold text-[hsl(var(--portal-foreground))]">
          {badge.title}
        </h3>
        {badge.description && (
          <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
            {badge.description}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * PDP Trust Badges Block Component
 */
export function PDPTrustBadgesBlock({ block, className }: BlockProps<PDPTrustBadgesConfig>) {
  const {
    headline,
    badges,
    layout = 'inline',
    showDividers = true,
    backgroundColor,
  } = block.config

  if (!badges || badges.length === 0) {
    return null
  }

  return (
    <section
      className={cn('py-12 sm:py-16', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Headline */}
        {headline && (
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-3xl">
            {headline}
          </h2>
        )}

        {/* Compact layout */}
        {layout === 'compact' && (
          <div
            className={cn(
              'flex flex-wrap items-center justify-center gap-4',
              'rounded-xl bg-[hsl(var(--portal-muted))]/30 py-4 px-6'
            )}
          >
            {badges.map((badge, index) => (
              <TrustBadge
                key={index}
                badge={badge}
                layout={layout}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Grid layout */}
        {layout === 'grid' && (
          <div
            className={cn(
              'grid gap-6',
              badges.length === 2 && 'sm:grid-cols-2',
              badges.length === 3 && 'sm:grid-cols-3',
              badges.length >= 4 && 'sm:grid-cols-2 lg:grid-cols-4'
            )}
          >
            {badges.map((badge, index) => (
              <TrustBadge
                key={index}
                badge={badge}
                layout={layout}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Inline layout */}
        {layout === 'inline' && (
          <div
            className={cn(
              'grid gap-4',
              'sm:grid-cols-2 lg:grid-cols-4',
              showDividers && 'divide-y sm:divide-y-0 sm:divide-x divide-[hsl(var(--portal-border))]'
            )}
          >
            {badges.map((badge, index) => (
              <div
                key={index}
                className={cn(
                  'flex justify-center',
                  showDividers && index > 0 && 'pt-4 sm:pt-0 sm:pl-4'
                )}
              >
                <TrustBadge
                  badge={badge}
                  layout={layout}
                  index={index}
                />
              </div>
            ))}
          </div>
        )}
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
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
