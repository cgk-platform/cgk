/**
 * Cart Line Item Component
 *
 * Displays a single item in the cart with:
 * - Product image thumbnail
 * - Title and variant info
 * - Price display
 * - Quantity controls
 * - Remove button
 */

'use client'

import type { CartLine, Money } from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useCallback } from 'react'

import { formatMoney } from '@/lib/cart/types'
import { useCart } from './CartProvider'

interface CartLineItemProps {
  /** Cart line data */
  line: CartLine
  /** Optional product handle for linking */
  productHandle?: string
  /** Whether to show a compact version */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

export function CartLineItem({
  line,
  productHandle,
  compact = false,
  className,
}: CartLineItemProps) {
  const { updateQuantity, removeItem, isUpdating } = useCart()
  const [isRemoving, setIsRemoving] = useState(false)
  const [localQuantity, setLocalQuantity] = useState(line.quantity)

  const { merchandise } = line
  const imageUrl = merchandise.image?.url
  const variantOptions = merchandise.selectedOptions
    .map((opt) => opt.value)
    .join(' / ')

  // Handle item removal
  const handleRemove = useCallback(async () => {
    setIsRemoving(true)
    try {
      await removeItem(line.id)
    } catch (error) {
      console.error('Failed to remove item:', error)
      setIsRemoving(false)
    }
  }, [line.id, removeItem])

  // Handle quantity change
  const handleQuantityChange = useCallback(
    async (newQuantity: number) => {
      if (newQuantity < 1) {
        handleRemove()
        return
      }
      if (newQuantity > 99) return

      setLocalQuantity(newQuantity)
      await updateQuantity(line.id, newQuantity)
    },
    [line.id, updateQuantity, handleRemove]
  )

  // Product link
  const productUrl = productHandle ? `/products/${productHandle}` : '#'

  return (
    <div
      className={cn(
        'group relative',
        'transition-all duration-300',
        isRemoving && 'opacity-50 scale-95 pointer-events-none',
        className
      )}
    >
      <div
        className={cn(
          'flex gap-4',
          compact ? 'py-3' : 'py-4'
        )}
      >
        {/* Product Image */}
        <Link
          href={productUrl}
          className={cn(
            'relative flex-shrink-0 overflow-hidden rounded-lg bg-muted',
            'ring-1 ring-black/5 transition-transform group-hover:scale-[1.02]',
            compact ? 'h-16 w-16' : 'h-20 w-20'
          )}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={merchandise.title}
              fill
              sizes={compact ? '64px' : '80px'}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <PlaceholderIcon />
            </div>
          )}
        </Link>

        {/* Product Info */}
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            {/* Title */}
            <Link
              href={productUrl}
              className={cn(
                'block font-medium text-foreground hover:underline truncate',
                compact ? 'text-sm' : 'text-base'
              )}
            >
              {merchandise.title}
            </Link>

            {/* Variant Options */}
            {variantOptions && (
              <p className="mt-0.5 text-sm text-muted-foreground truncate">
                {variantOptions}
              </p>
            )}
          </div>

          {/* Price and Quantity (mobile layout for compact) */}
          {compact ? (
            <div className="mt-2 flex items-center justify-between">
              <QuantitySelector
                quantity={localQuantity}
                onChange={handleQuantityChange}
                disabled={isUpdating}
                size="sm"
              />
              <span className="font-medium">
                {formatMoney(line.cost.totalAmount)}
              </span>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-4">
              <QuantitySelector
                quantity={localQuantity}
                onChange={handleQuantityChange}
                disabled={isUpdating}
                size="md"
              />
            </div>
          )}
        </div>

        {/* Price and Remove (desktop layout for non-compact) */}
        {!compact && (
          <div className="flex flex-col items-end justify-between">
            <PriceDisplay
              price={line.cost.totalAmount}
              unitPrice={line.cost.amountPerQuantity}
              quantity={line.quantity}
            />
            <RemoveButton onClick={handleRemove} disabled={isUpdating} />
          </div>
        )}

        {/* Remove button for compact mode */}
        {compact && (
          <button
            onClick={handleRemove}
            disabled={isUpdating}
            className={cn(
              'absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center',
              'rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label={`Remove ${merchandise.title} from cart`}
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// --- Sub-components ---

interface QuantitySelectorProps {
  quantity: number
  onChange: (quantity: number) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

function QuantitySelector({
  quantity,
  onChange,
  disabled,
  size = 'md',
}: QuantitySelectorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border',
        size === 'sm' ? 'h-8' : 'h-10'
      )}
    >
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-center transition-colors',
          'hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed',
          size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base'
        )}
        aria-label="Decrease quantity"
      >
        <span className="sr-only">Decrease</span>
        <MinusIcon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      </button>

      <span
        className={cn(
          'flex items-center justify-center border-x font-medium tabular-nums',
          size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-12 text-base'
        )}
      >
        {quantity}
      </span>

      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={disabled || quantity >= 99}
        className={cn(
          'flex items-center justify-center transition-colors',
          'hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed',
          size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base'
        )}
        aria-label="Increase quantity"
      >
        <span className="sr-only">Increase</span>
        <PlusIcon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      </button>
    </div>
  )
}

interface PriceDisplayProps {
  price: Money
  unitPrice: Money
  quantity: number
}

function PriceDisplay({ price, unitPrice, quantity }: PriceDisplayProps) {
  const showUnitPrice = quantity > 1

  return (
    <div className="text-right">
      <p className="font-semibold text-foreground">{formatMoney(price)}</p>
      {showUnitPrice && (
        <p className="text-sm text-muted-foreground">
          {formatMoney(unitPrice)} each
        </p>
      )}
    </div>
  )
}

interface RemoveButtonProps {
  onClick: () => void
  disabled?: boolean
}

function RemoveButton({ onClick, disabled }: RemoveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm text-muted-foreground',
        'hover:text-destructive transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      <TrashIcon className="h-4 w-4" />
      <span>Remove</span>
    </button>
  )
}

// --- Icons ---

function PlaceholderIcon() {
  return (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}
