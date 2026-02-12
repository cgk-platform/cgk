/**
 * Order Detail Page Components
 *
 * Client components for order detail interactivity.
 */

'use client'

import { Button, cn } from '@cgk/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { CancelOrderModal } from '@/components/account/CancelOrderModal'
import { ReturnRequestModal } from '@/components/account/ReturnRequestModal'
import { cancelOrder, requestReturn } from '@/lib/account/api'
import { getContent } from '@/lib/account/content'
import type {
  CancellationReason,
  Order,
  PortalContentStrings,
  ReturnReason,
  ReturnRequestItem,
} from '@/lib/account/types'

interface OrderDetailActionsProps {
  order: Order
  content: PortalContentStrings
}

export function OrderDetailActions({ order, content }: OrderDetailActionsProps) {
  const router = useRouter()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)

  const handleCancelOrder = async (
    reason: CancellationReason,
    details: string | null
  ) => {
    await cancelOrder({
      orderId: order.id,
      reason,
      reasonDetails: details,
    })
    router.refresh()
  }

  const handleReturnRequest = async (
    items: ReturnRequestItem[],
    reason: ReturnReason,
    details: string | null,
    resolution: 'refund' | 'exchange' | 'store_credit'
  ) => {
    await requestReturn({
      orderId: order.id,
      items,
      reason,
      reasonDetails: details,
      preferredResolution: resolution,
    })
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {order.canCancel && (
          <Button
            variant="outline"
            onClick={() => setShowCancelModal(true)}
            className="rounded-lg border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {getContent(content, 'orders.cancel.confirm')}
          </Button>
        )}
        {order.canReturn && (
          <Button
            variant="outline"
            onClick={() => setShowReturnModal(true)}
            className="rounded-lg"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            {getContent(content, 'orders.return.title')}
          </Button>
        )}
      </div>

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        order={order}
        content={content}
        onConfirm={handleCancelOrder}
      />

      {/* Return Request Modal */}
      <ReturnRequestModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        order={order}
        content={content}
        onSubmit={handleReturnRequest}
      />
    </>
  )
}

interface OrderTrackingSectionProps {
  order: Order
  content: PortalContentStrings
}

export function OrderTrackingSection({ order, content }: OrderTrackingSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const tracking = order.tracking
  if (!tracking) return null

  return (
    <section
      className={cn(
        'rounded-xl border border-[hsl(var(--portal-border))]',
        'bg-gradient-to-r from-indigo-50 to-blue-50',
        'overflow-hidden'
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
            <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-indigo-900" style={{ fontFamily: 'var(--portal-heading-font)' }}>
              {getContent(content, 'orders.tracking.title')}
            </h2>
            <p className="text-sm text-indigo-700">
              {tracking.carrier}: {tracking.trackingNumber}
            </p>
          </div>
        </div>
        <svg
          className={cn('h-5 w-5 text-indigo-600 transition-transform', isExpanded && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-indigo-100 px-6 py-4">
          {/* Estimated Delivery */}
          {tracking.estimatedDelivery && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-white/60 p-3">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span className="text-sm font-medium text-indigo-900">
                {getContent(content, 'orders.tracking.estimated_delivery')}:{' '}
                {new Date(tracking.estimatedDelivery).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* Tracking Events */}
          {tracking.events.length > 0 && (
            <div className="relative ml-4 space-y-4">
              <div className="absolute left-0 top-2 bottom-2 w-px bg-indigo-200" />
              {tracking.events.map((event, index) => (
                <div key={index} className="relative pl-6">
                  <div
                    className={cn(
                      'absolute left-0 top-1 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-white',
                      index === 0 ? 'bg-indigo-600' : 'bg-indigo-300'
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-indigo-900">{event.status}</p>
                    <p className="text-xs text-indigo-700">{event.description}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-indigo-600">
                      <span>
                        {new Date(event.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      {event.location && (
                        <>
                          <span>-</span>
                          <span>{event.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Track Package Link */}
          {tracking.trackingUrl && (
            <div className="mt-4">
              <a
                href={tracking.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2',
                  'text-sm font-medium text-white',
                  'transition-colors hover:bg-indigo-700',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                )}
              >
                Track on {tracking.carrier}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
