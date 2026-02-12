/**
 * Order Card Component
 *
 * Displays an order summary with status, tracking, and action buttons.
 */

'use client'

import { cn, formatCurrency } from '@cgk/ui'
import Link from 'next/link'

import type { Order } from '@/lib/account/types'

import { StatusBadge } from './StatusBadge'

interface OrderCardProps {
  order: Order
  onCancelClick?: (order: Order) => void
  onReturnClick?: (order: Order) => void
  showActions?: boolean
}

export function OrderCard({
  order,
  onCancelClick,
  onReturnClick,
  showActions = true,
}: OrderCardProps) {
  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const firstThreeItems = order.lineItems.slice(0, 3)
  const remainingCount = order.lineItems.length - 3

  return (
    <div className="group overflow-hidden rounded-xl border border-stone-200 bg-white transition-shadow duration-200 hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-medium text-stone-900">
            Order {order.orderNumber}
          </span>
          <span className="text-sm text-stone-500">{formattedDate}</span>
        </div>
        <StatusBadge type="order" status={order.status} />
      </div>

      {/* Order Items */}
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap gap-4">
          {firstThreeItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-16 w-16 rounded-lg border border-stone-200 bg-stone-100 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-stone-200 bg-stone-100">
                  <svg
                    className="h-6 w-6 text-stone-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                </div>
              )}
              <div className="hidden sm:block">
                <p className="line-clamp-1 text-sm font-medium text-stone-900">
                  {item.title}
                </p>
                {item.variantTitle && (
                  <p className="text-xs text-stone-500">{item.variantTitle}</p>
                )}
                <p className="text-xs text-stone-500">Qty: {item.quantity}</p>
              </div>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-sm font-medium text-stone-600">
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Tracking Info */}
        {order.tracking && order.status === 'shipped' && (
          <div className="mt-4 rounded-lg bg-indigo-50 p-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                />
              </svg>
              <span className="text-sm font-medium text-indigo-900">
                {order.tracking.carrier}: {order.tracking.trackingNumber}
              </span>
            </div>
            {order.tracking.estimatedDelivery && (
              <p className="mt-1 text-xs text-indigo-700">
                Estimated delivery:{' '}
                {new Date(order.tracking.estimatedDelivery).toLocaleDateString()}
              </p>
            )}
            {order.tracking.trackingUrl && (
              <a
                href={order.tracking.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Track Package
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                  />
                </svg>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-stone-500">Total:</span>
          <span className="font-semibold text-stone-900">
            {formatCurrency(order.totalCents / 100, order.currencyCode)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {showActions && order.canCancel && (
            <button
              type="button"
              onClick={() => onCancelClick?.(order)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              Cancel Order
            </button>
          )}
          {showActions && order.canReturn && (
            <button
              type="button"
              onClick={() => onReturnClick?.(order)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Request Return
            </button>
          )}
          <Link
            href={`/account/orders/${order.id}`}
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  )
}
