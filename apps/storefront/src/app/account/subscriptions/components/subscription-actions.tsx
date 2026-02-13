'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, Button, cn } from '@cgk-platform/ui'
import {
  orderNow,
  pauseSubscription,
  reactivateSubscription,
  resumeSubscription,
  skipNextOrder,
} from '@/lib/subscriptions/api'
import { formatDate, formatRelativeDate } from '@/lib/subscriptions/format'
import type { Subscription } from '@/lib/subscriptions/types'
import { ActionModal, ConfirmModal } from './modals'

interface SubscriptionActionsProps {
  subscription: Subscription
  className?: string
}

/**
 * Subscription action buttons for the detail view sidebar
 *
 * Renders context-appropriate actions based on subscription status:
 * - Active: Pause, Skip, Reschedule, Order Now, Cancel
 * - Paused: Resume, Cancel
 * - Cancelled: Reactivate
 */
export function SubscriptionActions({ subscription, className }: SubscriptionActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [showSkipModal, setShowSkipModal] = useState(false)
  const [showOrderNowModal, setShowOrderNowModal] = useState(false)

  const isActive = subscription.status === 'active'
  const isPaused = subscription.status === 'paused'
  const isCancelled = subscription.status === 'cancelled'
  const isExpired = subscription.status === 'expired'

  const refreshData = useCallback(() => {
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  const handlePause = useCallback(async () => {
    setError(null)
    const result = await pauseSubscription(subscription.id)
    if (result.success) {
      setShowPauseModal(false)
      refreshData()
    } else {
      setError(result.error || 'Failed to pause subscription')
    }
  }, [subscription.id, refreshData])

  const handleResume = useCallback(async () => {
    setError(null)
    const result = await resumeSubscription(subscription.id)
    if (result.success) {
      refreshData()
    } else {
      setError(result.error || 'Failed to resume subscription')
    }
  }, [subscription.id, refreshData])

  const handleSkip = useCallback(async () => {
    setError(null)
    const result = await skipNextOrder(subscription.id)
    if (result.success) {
      setShowSkipModal(false)
      refreshData()
    } else {
      setError(result.error || 'Failed to skip order')
    }
  }, [subscription.id, refreshData])

  const handleOrderNow = useCallback(async () => {
    setError(null)
    const result = await orderNow(subscription.id)
    if (result.success) {
      setShowOrderNowModal(false)
      refreshData()
    } else {
      setError(result.error || 'Failed to place order')
    }
  }, [subscription.id, refreshData])

  const handleReactivate = useCallback(async () => {
    setError(null)
    const result = await reactivateSubscription(subscription.id)
    if (result.success) {
      refreshData()
    } else {
      setError(result.error || 'Failed to reactivate subscription')
    }
  }, [subscription.id, refreshData])

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="font-semibold text-lg">Manage Subscription</h3>

      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {/* Active Subscription Actions */}
        {isActive && (
          <>
            {/* Order Now */}
            <Button
              variant="default"
              className="w-full justify-center"
              onClick={() => setShowOrderNowModal(true)}
              disabled={isPending}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Order Now
            </Button>

            {/* Skip Next Order */}
            <Button
              variant="outline"
              className="w-full justify-center"
              onClick={() => setShowSkipModal(true)}
              disabled={isPending}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
              Skip Next Order
            </Button>

            {/* Reschedule */}
            <Button
              variant="outline"
              className="w-full justify-center"
              onClick={() => router.push(`/account/subscriptions/${subscription.id}/reschedule`)}
              disabled={isPending}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Reschedule
            </Button>

            {/* Pause */}
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => setShowPauseModal(true)}
              disabled={isPending}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pause Subscription
            </Button>

            {/* Cancel */}
            <Button
              variant="ghost"
              className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => router.push(`/account/subscriptions/${subscription.id}/cancel`)}
              disabled={isPending}
            >
              Cancel Subscription
            </Button>
          </>
        )}

        {/* Paused Subscription Actions */}
        {isPaused && (
          <>
            <Button
              variant="default"
              className="w-full justify-center bg-emerald-600 hover:bg-emerald-700"
              onClick={handleResume}
              disabled={isPending}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Resume Subscription
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => router.push(`/account/subscriptions/${subscription.id}/cancel`)}
              disabled={isPending}
            >
              Cancel Subscription
            </Button>
          </>
        )}

        {/* Cancelled Subscription Actions */}
        {isCancelled && (
          <div className="space-y-4">
            <Alert variant="error" className="bg-red-50 border-red-200">
              <AlertDescription>
                <p className="font-medium mb-1">This subscription was cancelled</p>
                {subscription.cancelledAt && (
                  <p className="text-sm opacity-80">
                    on {formatDate(subscription.cancelledAt)}
                  </p>
                )}
                {subscription.cancellationReason && (
                  <p className="text-sm opacity-80 mt-2">
                    Reason: {subscription.cancellationReason}
                  </p>
                )}
              </AlertDescription>
            </Alert>

            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Changed your mind? You can reactivate your subscription and resume deliveries.
              </p>
              <Button
                variant="default"
                className="w-full justify-center bg-emerald-600 hover:bg-emerald-700"
                onClick={handleReactivate}
                disabled={isPending}
              >
                Reactivate Subscription
              </Button>
            </div>
          </div>
        )}

        {/* Expired Subscription Actions */}
        {isExpired && (
          <div className="space-y-4">
            <Alert variant="warning" className="bg-amber-50 border-amber-200">
              <AlertDescription>
                This subscription has expired. No further orders will be processed.
              </AlertDescription>
            </Alert>

            <Button
              variant="default"
              className="w-full justify-center"
              onClick={() => router.push('/products')}
            >
              Start New Subscription
            </Button>
          </div>
        )}
      </div>

      {/* Pause Modal */}
      <ConfirmModal
        open={showPauseModal}
        onOpenChange={setShowPauseModal}
        title="Pause Subscription"
        description="Are you sure you want to pause your subscription? You won't receive any deliveries until you resume."
        confirmLabel="Pause Subscription"
        confirmVariant="secondary"
        onConfirm={handlePause}
        isPending={isPending}
      />

      {/* Skip Modal */}
      <ConfirmModal
        open={showSkipModal}
        onOpenChange={setShowSkipModal}
        title="Skip Next Order"
        description={
          subscription.nextOrderDate
            ? `Are you sure you want to skip your next order scheduled for ${formatRelativeDate(subscription.nextOrderDate)}? Your subscription will remain active and the following delivery will be rescheduled.`
            : 'Are you sure you want to skip your next order? Your subscription will remain active and the following delivery will be rescheduled.'
        }
        confirmLabel="Skip Order"
        confirmVariant="secondary"
        onConfirm={handleSkip}
        isPending={isPending}
      />

      {/* Order Now Modal */}
      <ActionModal
        open={showOrderNowModal}
        onOpenChange={setShowOrderNowModal}
        title="Place Order Now"
        description="This will charge your payment method immediately and process an order today."
        confirmLabel="Place Order"
        onConfirm={handleOrderNow}
        isPending={isPending}
      >
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order Total</span>
            <span className="font-medium">
              ${(subscription.totalCents / 100).toFixed(2)} {subscription.currencyCode}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment Method</span>
            <span className="font-medium">
              {subscription.paymentMethod?.card
                ? `${subscription.paymentMethod.card.brand} ****${subscription.paymentMethod.card.lastDigits}`
                : 'On file'}
            </span>
          </div>
        </div>
      </ActionModal>
    </div>
  )
}
