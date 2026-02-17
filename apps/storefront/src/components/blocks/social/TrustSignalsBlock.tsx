'use client'

/**
 * Trust Signals Block Component
 *
 * Displays configurable trust badges with icons and text
 * to build customer confidence (secure checkout, money-back guarantee, etc.).
 */

import { cn } from '@cgk-platform/ui'
import type { BlockProps, TrustSignalsConfig, TrustSignalItem } from '../types'
import { LucideIcon } from '../icons'

/**
 * Default trust signals if none provided
 */
const DEFAULT_SIGNALS: TrustSignalItem[] = [
  { icon: 'Shield', text: 'Secure Checkout', subtext: '256-bit SSL encryption' },
  { icon: 'RotateCcw', text: '30-Day Returns', subtext: 'No questions asked' },
  { icon: 'Truck', text: 'Free Shipping', subtext: 'On orders over $50' },
  { icon: 'Award', text: 'Quality Guarantee', subtext: '100% satisfaction' },
]

/**
 * Trust Signals Block Component
 */
export function TrustSignalsBlock({ block, className }: BlockProps<TrustSignalsConfig>) {
  const {
    signals = DEFAULT_SIGNALS,
    layout = 'inline',
    showDividers = true,
    backgroundColor,
  } = block.config

  const displaySignals = signals.length > 0 ? signals : DEFAULT_SIGNALS

  return (
    <section
      className={cn(
        'py-8 sm:py-12',
        className
      )}
      style={{ backgroundColor }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {layout === 'inline' ? (
          <div
            className={cn(
              'flex flex-wrap items-center justify-center',
              showDividers ? 'gap-0' : 'gap-8'
            )}
          >
            {displaySignals.map((signal, index) => (
              <div
                key={signal.text}
                className={cn(
                  'animate-fade-in-up flex items-center gap-3 px-6 py-4',
                  showDividers && index !== displaySignals.length - 1 && 'border-r border-[hsl(var(--portal-border))]'
                )}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--portal-primary))]/10">
                  <LucideIcon
                    name={signal.icon}
                    fallback="Check"
                    className="h-5 w-5 text-[hsl(var(--portal-primary))]"
                  />
                </div>
                <div>
                  <div className="font-semibold text-[hsl(var(--portal-foreground))]">
                    {signal.text}
                  </div>
                  {signal.subtext && (
                    <div className="text-sm text-[hsl(var(--portal-muted-foreground))]">
                      {signal.subtext}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={cn(
              'grid gap-6',
              displaySignals.length === 2 && 'grid-cols-1 sm:grid-cols-2',
              displaySignals.length === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
              displaySignals.length >= 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            )}
          >
            {displaySignals.map((signal, index) => (
              <div
                key={signal.text}
                className={cn(
                  'animate-fade-in-up flex flex-col items-center rounded-xl p-6 text-center',
                  'border border-[hsl(var(--portal-border))]',
                  'bg-[hsl(var(--portal-card))]',
                  'transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5'
                )}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--portal-primary))]/10">
                  <LucideIcon
                    name={signal.icon}
                    fallback="Check"
                    className="h-7 w-7 text-[hsl(var(--portal-primary))]"
                  />
                </div>
                <h3 className="text-lg font-semibold text-[hsl(var(--portal-foreground))]">
                  {signal.text}
                </h3>
                {signal.subtext && (
                  <p className="mt-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
                    {signal.subtext}
                  </p>
                )}
              </div>
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
