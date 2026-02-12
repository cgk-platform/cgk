/**
 * Return Request Modal
 *
 * Multi-step form for requesting returns on eligible orders.
 */

'use client'

import { Button, cn, formatCurrency } from '@cgk/ui'
import { useState } from 'react'

import type {
  Order,
  OrderLineItem,
  PortalContentStrings,
  ReturnReason,
  ReturnRequestItem,
} from '@/lib/account/types'
import {
  getContent,
  resolutionLabels,
  returnReasonLabels,
} from '@/lib/account/content'

import { Modal, ModalFooter } from './Modal'

interface ReturnRequestModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  content: PortalContentStrings
  onSubmit: (
    items: ReturnRequestItem[],
    reason: ReturnReason,
    details: string | null,
    resolution: 'refund' | 'exchange' | 'store_credit'
  ) => Promise<void>
}

const returnReasons: ReturnReason[] = [
  'defective',
  'wrong_item',
  'not_as_described',
  'changed_mind',
  'size_issue',
  'quality_issue',
  'other',
]

type Resolution = 'refund' | 'exchange' | 'store_credit'

const resolutions: Resolution[] = ['refund', 'exchange', 'store_credit']

export function ReturnRequestModal({
  isOpen,
  onClose,
  order,
  content,
  onSubmit,
}: ReturnRequestModalProps) {
  const [step, setStep] = useState<'items' | 'reason' | 'resolution'>(
    'items'
  )
  const [selectedItems, setSelectedItems] = useState<
    Record<string, { selected: boolean; quantity: number }>
  >(() =>
    Object.fromEntries(
      order.lineItems.map((item) => [
        item.id,
        { selected: false, quantity: item.quantity },
      ])
    )
  )
  const [reason, setReason] = useState<ReturnReason | null>(null)
  const [details, setDetails] = useState('')
  const [resolution, setResolution] = useState<Resolution>('refund')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedItemsList = Object.entries(selectedItems)
    .filter(([, v]) => v.selected)
    .map(([id, v]) => ({
      lineItemId: id,
      quantity: v.quantity,
    }))

  const handleClose = () => {
    if (!isSubmitting) {
      setStep('items')
      setSelectedItems(
        Object.fromEntries(
          order.lineItems.map((item) => [
            item.id,
            { selected: false, quantity: item.quantity },
          ])
        )
      )
      setReason(null)
      setDetails('')
      setResolution('refund')
      setError(null)
      onClose()
    }
  }

  const handleSubmit = async () => {
    if (!reason || selectedItemsList.length === 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit(
        selectedItemsList,
        reason,
        details.trim() || null,
        resolution
      )
      handleClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit return request'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId].selected },
    }))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    const item = order.lineItems.find((i) => i.id === itemId)
    if (!item) return

    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: Math.max(1, Math.min(quantity, item.quantity)),
      },
    }))
  }

  const getStepTitle = () => {
    switch (step) {
      case 'items':
        return getContent(content, 'orders.return.select_items')
      case 'reason':
        return getContent(content, 'orders.return.reason_label')
      case 'resolution':
        return getContent(content, 'orders.return.resolution_label')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getContent(content, 'orders.return.title')}
      description={getContent(content, 'orders.return.description')}
      size="lg"
    >
      {/* Progress Steps */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {['items', 'reason', 'resolution'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                step === s
                  ? 'bg-amber-500 text-white'
                  : i <
                      ['items', 'reason', 'resolution'].indexOf(step)
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-stone-100 text-stone-400'
              )}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div
                className={cn(
                  'mx-2 h-0.5 w-8 transition-colors',
                  i < ['items', 'reason', 'resolution'].indexOf(step)
                    ? 'bg-amber-300'
                    : 'bg-stone-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      <h3 className="mb-4 font-medium text-stone-900">{getStepTitle()}</h3>

      {/* Step 1: Select Items */}
      {step === 'items' && (
        <div className="space-y-3">
          {order.lineItems.map((item) => (
            <ItemSelector
              key={item.id}
              item={item}
              selected={selectedItems[item.id]?.selected ?? false}
              quantity={selectedItems[item.id]?.quantity ?? item.quantity}
              onToggle={() => toggleItem(item.id)}
              onQuantityChange={(q) => updateQuantity(item.id, q)}
              currencyCode={order.currencyCode}
            />
          ))}
        </div>
      )}

      {/* Step 2: Select Reason */}
      {step === 'reason' && (
        <div className="space-y-4">
          <div className="space-y-2">
            {returnReasons.map((r) => (
              <label
                key={r}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                  reason === r
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-stone-200 hover:bg-stone-50'
                )}
              >
                <input
                  type="radio"
                  name="return-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="h-4 w-4 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-stone-700">
                  {returnReasonLabels[r]}
                </span>
              </label>
            ))}
          </div>

          {reason === 'other' && (
            <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <label
                htmlFor="return-details"
                className="mb-2 block text-sm font-medium text-stone-700"
              >
                Please provide more details
              </label>
              <textarea
                id="return-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Step 3: Select Resolution */}
      {step === 'resolution' && (
        <div className="space-y-3">
          {resolutions.map((r) => (
            <label
              key={r}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                resolution === r
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-stone-200 hover:bg-stone-50'
              )}
            >
              <input
                type="radio"
                name="resolution"
                value={r}
                checked={resolution === r}
                onChange={() => setResolution(r)}
                className="mt-0.5 h-4 w-4 text-amber-500 focus:ring-amber-500"
              />
              <div>
                <span className="block text-sm font-medium text-stone-900">
                  {resolutionLabels[r]}
                </span>
                <span className="mt-1 block text-xs text-stone-500">
                  {r === 'refund' &&
                    'Receive a refund to your original payment method'}
                  {r === 'exchange' &&
                    'Exchange for a different size, color, or product'}
                  {r === 'store_credit' &&
                    'Receive store credit for future purchases'}
                </span>
              </div>
            </label>
          ))}

          {/* Summary */}
          <div className="mt-4 rounded-lg bg-stone-50 p-4">
            <h4 className="mb-2 text-sm font-medium text-stone-900">
              Return Summary
            </h4>
            <ul className="space-y-1">
              {selectedItemsList.map((sel) => {
                const item = order.lineItems.find(
                  (i) => i.id === sel.lineItemId
                )
                if (!item) return null
                return (
                  <li
                    key={sel.lineItemId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-stone-600">
                      {item.title} x {sel.quantity}
                    </span>
                    <span className="font-medium text-stone-900">
                      {formatCurrency(
                        (item.priceCents * sel.quantity) / 100,
                        order.currencyCode
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <ModalFooter>
        {step !== 'items' && (
          <Button
            variant="outline"
            onClick={() =>
              setStep(step === 'resolution' ? 'reason' : 'items')
            }
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Back
          </Button>
        )}
        {step === 'items' && (
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        )}

        {step !== 'resolution' && (
          <Button
            onClick={() =>
              setStep(step === 'items' ? 'reason' : 'resolution')
            }
            disabled={
              step === 'items'
                ? selectedItemsList.length === 0
                : !reason
            }
            className="w-full bg-stone-900 hover:bg-stone-800 sm:w-auto"
          >
            Continue
          </Button>
        )}

        {step === 'resolution' && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-amber-500 hover:bg-amber-600 sm:w-auto"
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
                Submitting...
              </>
            ) : (
              getContent(content, 'orders.return.submit')
            )}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}

interface ItemSelectorProps {
  item: OrderLineItem
  selected: boolean
  quantity: number
  onToggle: () => void
  onQuantityChange: (q: number) => void
  currencyCode: string
}

function ItemSelector({
  item,
  selected,
  quantity,
  onToggle,
  onQuantityChange,
  currencyCode,
}: ItemSelectorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border p-3 transition-colors',
        selected ? 'border-amber-500 bg-amber-50' : 'border-stone-200'
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="h-5 w-5 rounded text-amber-500 focus:ring-amber-500"
      />

      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.title}
          className="h-14 w-14 rounded-lg border border-stone-200 bg-stone-100 object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-stone-200 bg-stone-100">
          <svg
            className="h-5 w-5 text-stone-400"
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

      <div className="flex-1">
        <p className="text-sm font-medium text-stone-900">{item.title}</p>
        {item.variantTitle && (
          <p className="text-xs text-stone-500">{item.variantTitle}</p>
        )}
        <p className="text-sm font-medium text-stone-900">
          {formatCurrency(item.priceCents / 100, currencyCode)}
        </p>
      </div>

      {selected && item.quantity > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Qty:</span>
          <select
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value, 10))}
            className="rounded border border-stone-300 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {Array.from({ length: item.quantity }, (_, i) => i + 1).map(
              (n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              )
            )}
          </select>
        </div>
      )}
    </div>
  )
}
