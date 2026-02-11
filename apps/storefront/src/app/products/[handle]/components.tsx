/**
 * Product Detail Page Components
 *
 * Client components for product interaction.
 */

'use client'

import type { Product } from '@cgk/commerce'
import { cn } from '@cgk/ui'
import { useState, useMemo } from 'react'

import { VariantSelector, PriceDisplay } from '@/components/products'


interface ProductInfoProps {
  product: Product
  options: Array<{ name: string; values: string[] }>
  hasMultipleVariants: boolean
}

export function ProductInfo({
  product,
  options,
  hasMultipleVariants,
}: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    // Initialize with first available options
    const initial: Record<string, string> = {}
    for (const option of options) {
      const firstValue = option.values[0]
      if (firstValue) {
        initial[option.name.toLowerCase()] = firstValue
      }
    }
    return initial
  })

  // Find the selected variant based on current options
  const selectedVariant = useMemo(() => {
    if (!hasMultipleVariants) {
      return product.variants[0]
    }

    return product.variants.find((variant) =>
      variant.selectedOptions.every(
        (opt) => selectedOptions[opt.name.toLowerCase()] === opt.value
      )
    )
  }, [product.variants, selectedOptions, hasMultipleVariants])

  const handleOptionChange = (name: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [name.toLowerCase()]: value,
    }))
  }

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(99, prev + delta)))
  }

  const isAvailable = selectedVariant?.availableForSale ?? product.availableForSale

  return (
    <div className="space-y-6">
      {/* Variant Selector */}
      {hasMultipleVariants && options.length > 0 && (
        <VariantSelector
          options={options}
          variants={product.variants}
          selectedOptions={selectedOptions}
          onOptionChange={handleOptionChange}
        />
      )}

      {/* Selected Variant Price (if different from default) */}
      {selectedVariant && hasMultipleVariants && (
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedVariant.title}
            </span>
            <PriceDisplay
              price={selectedVariant.price}
              compareAtPrice={selectedVariant.compareAtPrice}
              size="lg"
            />
          </div>
        </div>
      )}

      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Quantity</label>
        <div className="flex items-center rounded-lg border">
          <button
            type="button"
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
            className="flex h-10 w-10 items-center justify-center text-lg hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <input
            type="number"
            min="1"
            max="99"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
            className="h-10 w-16 border-x bg-transparent text-center text-sm focus:outline-none"
            aria-label="Quantity"
          />
          <button
            type="button"
            onClick={() => handleQuantityChange(1)}
            disabled={quantity >= 99}
            className="flex h-10 w-10 items-center justify-center text-lg hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* Add to Cart Button */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={!isAvailable || !selectedVariant}
          className={cn(
            'flex-1 rounded-lg px-6 py-4 text-lg font-semibold transition-colors',
            isAvailable
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'cursor-not-allowed bg-gray-300 text-gray-500'
          )}
        >
          {isAvailable ? 'Add to Cart' : 'Sold Out'}
        </button>

        {/* Wishlist Button */}
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg border px-6 py-4 font-medium transition-colors hover:bg-muted"
          aria-label="Add to wishlist"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className="hidden sm:inline">Wishlist</span>
        </button>
      </div>

      {/* Stock Status */}
      <div className="flex items-center gap-2 text-sm">
        {isAvailable ? (
          <>
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-green-700">In Stock</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-red-700">Out of Stock</span>
          </>
        )}
      </div>

      {/* Trust Signals */}
      <div className="grid grid-cols-3 gap-4 border-t pt-6 text-center text-xs text-muted-foreground">
        <div className="flex flex-col items-center gap-1">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          <span>Free Returns</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Secure Payment</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <span>Fast Shipping</span>
        </div>
      </div>
    </div>
  )
}

export function ProductSkeleton() {
  return (
    <div className="grid animate-pulse gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="space-y-4">
        <div className="aspect-square rounded-lg bg-muted" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 w-20 rounded-md bg-muted" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-8 w-3/4 rounded bg-muted" />
        <div className="h-6 w-32 rounded bg-muted" />
        <div className="h-32 w-full rounded bg-muted" />
        <div className="h-14 w-full rounded bg-muted" />
      </div>
    </div>
  )
}

interface RelatedProductsProps {
  productType: string
  currentProductId: string
}

export async function RelatedProducts({
  productType,
}: RelatedProductsProps) {
  // This would fetch related products from the commerce provider
  // For now, return a placeholder
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
      Related products would be shown here for type: {productType}
    </div>
  )
}
