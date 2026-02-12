'use client'

import Image from 'next/image'
import Link from 'next/link'

import { Badge, Card, CardContent, cn } from '@cgk/ui'

import { formatDate, formatFrequency, formatPrice, formatRelativeDate, getStatusDisplay } from '@/lib/subscriptions/format'
import type { Subscription } from '@/lib/subscriptions/types'

interface SubscriptionCardProps {
  subscription: Subscription
  className?: string
}

/**
 * Subscription card for the list view
 *
 * Displays subscription summary with status, next order date,
 * product previews, and pricing.
 */
export function SubscriptionCard({ subscription, className }: SubscriptionCardProps) {
  const statusDisplay = getStatusDisplay(subscription.status)
  const isActive = subscription.status === 'active'
  const isPaused = subscription.status === 'paused'
  const isCancelled = subscription.status === 'cancelled' || subscription.status === 'expired'

  return (
    <Link
      href={`/account/subscriptions/${subscription.id}`}
      className={cn('block group', className)}
    >
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20">
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row">
            {/* Product Images */}
            <div className="relative w-full lg:w-48 h-40 lg:h-auto bg-muted/30 flex-shrink-0">
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="flex -space-x-3">
                  {subscription.items.slice(0, 3).map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        'relative w-16 h-16 rounded-lg border-2 border-background bg-white overflow-hidden shadow-sm',
                        'transition-transform duration-300 group-hover:scale-105',
                      )}
                      style={{
                        zIndex: 10 - index,
                        transitionDelay: `${index * 50}ms`,
                      }}
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center p-1">
                          {item.title.slice(0, 20)}
                        </div>
                      )}
                    </div>
                  ))}
                  {subscription.items.length > 3 && (
                    <div className="relative w-16 h-16 rounded-lg border-2 border-background bg-muted flex items-center justify-center shadow-sm">
                      <span className="text-sm font-medium text-muted-foreground">
                        +{subscription.items.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Left: Subscription Info */}
                <div className="flex-1 min-w-0">
                  {/* Status & ID */}
                  <div className="flex items-center gap-3 mb-2">
                    <Badge
                      variant={
                        statusDisplay.variant === 'success' ? 'default' :
                        statusDisplay.variant === 'warning' ? 'secondary' :
                        statusDisplay.variant === 'error' ? 'destructive' : 'outline'
                      }
                      className={cn(
                        'uppercase text-xs tracking-wider',
                        statusDisplay.variant === 'success' && 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
                        statusDisplay.variant === 'warning' && 'bg-amber-500/10 text-amber-700 border-amber-200',
                      )}
                    >
                      {statusDisplay.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      #{subscription.id.slice(-8).toUpperCase()}
                    </span>
                  </div>

                  {/* Product Names */}
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors truncate">
                    {subscription.items.map(item => item.title).slice(0, 2).join(', ')}
                    {subscription.items.length > 2 && ` +${subscription.items.length - 2} more`}
                  </h3>

                  {/* Frequency */}
                  <p className="text-sm text-muted-foreground mb-4">
                    {formatFrequency(subscription.frequency)}
                  </p>

                  {/* Status-specific Info */}
                  {isActive && subscription.nextOrderDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Next order:</span>
                      <span className="font-medium text-emerald-700">
                        {formatRelativeDate(subscription.nextOrderDate)}
                      </span>
                      <span className="text-muted-foreground">
                        ({formatDate(subscription.nextOrderDate)})
                      </span>
                    </div>
                  )}

                  {isPaused && (
                    <div className="flex items-center gap-2 text-sm text-amber-700">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        Paused
                        {subscription.pausedUntil && ` until ${formatDate(subscription.pausedUntil)}`}
                      </span>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>
                        Cancelled
                        {subscription.cancelledAt && ` on ${formatDate(subscription.cancelledAt)}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Pricing & CTA */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1 pt-2 sm:pt-0 border-t sm:border-0 border-border/50">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      {isActive ? 'Next Order' : 'Order Total'}
                    </p>
                    <p className="text-2xl font-semibold tracking-tight">
                      {formatPrice(subscription.totalCents, subscription.currencyCode)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                    <span>{isCancelled ? 'View Details' : 'Manage'}</span>
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

/**
 * Empty state when no subscriptions exist
 */
export function EmptySubscriptionsState() {
  return (
    <Card className="p-12 text-center">
      <div className="mx-auto w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold mb-3">No Subscriptions Yet</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Subscribe to your favorite products and save. Get automatic deliveries and never run out.
      </p>
      <Link
        href="/products"
        className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors"
      >
        Shop Products
      </Link>
    </Card>
  )
}

/**
 * Loading skeleton for subscription card
 */
export function SubscriptionCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row animate-pulse">
          <div className="w-full lg:w-48 h-40 lg:h-auto bg-muted" />
          <div className="flex-1 p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-16 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
                <div className="h-6 w-3/4 bg-muted rounded" />
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-4 w-48 bg-muted rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-8 w-24 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
