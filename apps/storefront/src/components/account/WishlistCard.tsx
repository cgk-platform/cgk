/**
 * Wishlist Item Card Component
 *
 * Displays a wishlist item with actions to move to cart or remove.
 */

'use client'

import { cn, formatCurrency } from '@cgk-platform/ui'
import Link from 'next/link'

import type { PortalContentStrings, WishlistItem } from '@/lib/account/types'
import { getContent } from '@/lib/account/content'

interface WishlistCardProps {
  item: WishlistItem
  content: PortalContentStrings
  currencyCode: string
  onRemove: (itemId: string) => void
  onMoveToCart: (itemId: string) => void
  isRemoving?: boolean
  isMovingToCart?: boolean
}

export function WishlistCard({
  item,
  content,
  currencyCode,
  onRemove,
  onMoveToCart,
  isRemoving = false,
  isMovingToCart = false,
}: WishlistCardProps) {
  const hasDiscount =
    item.comparePriceCents && item.comparePriceCents > item.priceCents
  const discountPercent = hasDiscount
    ? Math.round(
        ((item.comparePriceCents! - item.priceCents) / item.comparePriceCents!) *
          100
      )
    : 0

  const formattedDate = new Date(item.addedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="group relative overflow-hidden rounded-xl border border-stone-200 bg-white transition-all duration-200 hover:shadow-lg">
      {/* Discount Badge */}
      {hasDiscount && (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
          -{discountPercent}%
        </div>
      )}

      {/* Out of Stock Overlay */}
      {!item.inStock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
          <span className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">
            Out of Stock
          </span>
        </div>
      )}

      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        disabled={isRemoving}
        className={cn(
          'absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-stone-400 shadow-sm backdrop-blur-sm transition-all',
          'opacity-0 group-hover:opacity-100 hover:bg-white hover:text-red-500',
          isRemoving && 'opacity-100'
        )}
        aria-label={getContent(content, 'wishlist.remove')}
      >
        {isRemoving ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
        ) : (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
      </button>

      {/* Product Image */}
      <Link href={`/products/${item.handle}`}>
        <div className="relative aspect-square overflow-hidden bg-stone-100">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg
                className="h-12 w-12 text-stone-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4">
        <Link href={`/products/${item.handle}`}>
          <h3 className="line-clamp-2 text-sm font-medium text-stone-900 hover:text-amber-600">
            {item.title}
          </h3>
        </Link>

        {item.variantTitle && (
          <p className="mt-1 text-xs text-stone-500">{item.variantTitle}</p>
        )}

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-semibold text-stone-900">
            {formatCurrency(item.priceCents / 100, currencyCode)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-stone-400 line-through">
              {formatCurrency(item.comparePriceCents! / 100, currencyCode)}
            </span>
          )}
        </div>

        <p className="mt-1 text-xs text-stone-400">Added {formattedDate}</p>

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={() => onMoveToCart(item.id)}
          disabled={!item.inStock || isMovingToCart}
          className={cn(
            'mt-4 w-full rounded-lg py-2.5 text-sm font-medium transition-all duration-200',
            item.inStock
              ? 'bg-stone-900 text-white hover:bg-stone-800'
              : 'cursor-not-allowed bg-stone-100 text-stone-400'
          )}
        >
          {isMovingToCart ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
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
              Adding...
            </span>
          ) : (
            getContent(content, 'wishlist.add_to_cart')
          )}
        </button>
      </div>
    </div>
  )
}
