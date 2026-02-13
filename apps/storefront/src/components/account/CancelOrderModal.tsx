/**
 * Cancel Order Modal
 *
 * Allows customers to cancel eligible orders with reason selection.
 */

'use client'

import { Button } from '@cgk-platform/ui'
import { useState } from 'react'

import type {
  CancellationReason,
  Order,
  PortalContentStrings,
} from '@/lib/account/types'
import { cancellationReasonLabels, getContent } from '@/lib/account/content'

import { Modal, ModalFooter } from './Modal'

interface CancelOrderModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  content: PortalContentStrings
  onConfirm: (reason: CancellationReason, details: string | null) => Promise<void>
}

const cancellationReasons: CancellationReason[] = [
  'changed_mind',
  'found_better_price',
  'ordered_by_mistake',
  'shipping_too_long',
  'other',
]

export function CancelOrderModal({
  isOpen,
  onClose,
  order,
  content,
  onConfirm,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState<CancellationReason | null>(null)
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onConfirm(reason, details.trim() || null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setReason(null)
      setDetails('')
      setError(null)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getContent(content, 'orders.cancel.title')}
      description={getContent(content, 'orders.cancel.description')}
      size="md"
    >
      {/* Order Summary */}
      <div className="mb-6 rounded-lg bg-stone-50 p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-stone-900">
            Order {order.orderNumber}
          </span>
          {order.cancellationDeadline && (
            <span className="text-xs text-stone-500">
              Must cancel by{' '}
              {new Date(order.cancellationDeadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Reason Selection */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-stone-700">
          {getContent(content, 'orders.cancel.reason_label')}
        </label>
        <div className="space-y-2">
          {cancellationReasons.map((r) => (
            <label
              key={r}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                reason === r
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-stone-200 hover:bg-stone-50'
              }`}
            >
              <input
                type="radio"
                name="cancellation-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="h-4 w-4 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-stone-700">
                {cancellationReasonLabels[r]}
              </span>
            </label>
          ))}
        </div>

        {/* Additional Details */}
        {reason === 'other' && (
          <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <label
              htmlFor="cancel-details"
              className="mb-2 block text-sm font-medium text-stone-700"
            >
              Please provide more details
            </label>
            <textarea
              id="cancel-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us why you want to cancel..."
              rows={3}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Warning */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <p className="text-xs text-amber-800">
          This action cannot be undone. Your refund will be processed within
          3-5 business days.
        </p>
      </div>

      <ModalFooter>
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          Keep Order
        </Button>
        <Button
          variant="destructive"
          onClick={handleSubmit}
          disabled={!reason || isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Cancelling...
            </>
          ) : (
            getContent(content, 'orders.cancel.confirm')
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
