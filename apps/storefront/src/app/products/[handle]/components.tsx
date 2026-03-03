/**
 * Product Detail Page Components
 *
 * Client components for product interaction.
 */

'use client'

import type { Product } from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'

import {
  VariantSelector,
  PriceDisplay,
  SizeSelector,
  DeliveryEstimate,
} from '@/components/products'
import { AddToCartButton } from '@/components/cart'
import { CartProvider } from '@/components/cart/CartProvider'

interface ProductInfoProps {
  product: Product
  options: Array<{ name: string; values: string[] }>
  hasMultipleVariants: boolean
  tenantSlug: string
  isSleepSaver?: boolean
}

export function ProductInfo({
  product,
  options,
  hasMultipleVariants,
  tenantSlug,
  isSleepSaver = false,
}: ProductInfoProps) {
  return (
    <CartProvider tenantSlug={tenantSlug}>
      <ProductInfoInner
        product={product}
        options={options}
        hasMultipleVariants={hasMultipleVariants}
        isSleepSaver={isSleepSaver}
      />
    </CartProvider>
  )
}

interface ProductInfoInnerProps {
  product: Product
  options: Array<{ name: string; values: string[] }>
  hasMultipleVariants: boolean
  isSleepSaver: boolean
}

function ProductInfoInner({
  product,
  options,
  hasMultipleVariants,
  isSleepSaver,
}: ProductInfoInnerProps) {
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

  // For SleepSaver, track selected variant by ID
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    isSleepSaver && hasMultipleVariants ? undefined : product.variants[0]?.id
  )

  // Find the selected variant based on current options or ID
  const selectedVariant = useMemo(() => {
    if (!hasMultipleVariants) {
      return product.variants[0]
    }

    if (isSleepSaver && selectedVariantId) {
      return product.variants.find((v) => v.id === selectedVariantId)
    }

    return product.variants.find((variant) =>
      variant.selectedOptions.every((opt) => selectedOptions[opt.name.toLowerCase()] === opt.value)
    )
  }, [product.variants, selectedOptions, hasMultipleVariants, isSleepSaver, selectedVariantId])

  const handleOptionChange = useCallback((name: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [name.toLowerCase()]: value,
    }))
  }, [])

  const handleSizeSelect = useCallback((variantId: string) => {
    setSelectedVariantId(variantId)
  }, [])

  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(99, prev + delta)))
  }, [])

  const isAvailable = selectedVariant?.availableForSale ?? product.availableForSale

  // Track visibility of the main add-to-cart button for mobile sticky bar
  const addToCartRef = useRef<HTMLDivElement>(null)
  const [showStickyBar, setShowStickyBar] = useState(false)

  useEffect(() => {
    const target = addToCartRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky bar when main button is NOT visible
        setShowStickyBar(!entry!.isIntersecting)
      },
      { threshold: 0 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  // Prepare SizeSelector variants if SleepSaver
  const sizeVariants = useMemo(() => {
    if (!isSleepSaver || !hasMultipleVariants) return []

    return product.variants.map((variant) => {
      // Extract dimensions from variant title or metafields
      // Expected format: "Twin Size - 35\" x 64\""
      const titleParts = variant.title.split(' - ')
      const sizeName = titleParts[0] || variant.title
      const dimensions = titleParts[1] || ''

      return {
        id: variant.id,
        title: sizeName,
        dimensions,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
      }
    })
  }, [isSleepSaver, hasMultipleVariants, product.variants])

  return (
    <div className="space-y-6">
      {/* Variant Selector - Conditional */}
      {isSleepSaver ? (
        <>
          {/* SizeSelector for SleepSaver */}
          {hasMultipleVariants && sizeVariants.length > 0 && (
            <SizeSelector
              variants={sizeVariants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={handleSizeSelect}
            />
          )}

          {/* Delivery Estimate for SleepSaver */}
          <DeliveryEstimate zipCode="90210" />
        </>
      ) : (
        <>
          {/* Standard VariantSelector for non-SleepSaver */}
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
                <span className="text-sm text-muted-foreground">{selectedVariant.title}</span>
                <PriceDisplay
                  price={selectedVariant.price}
                  compareAtPrice={selectedVariant.compareAtPrice}
                  size="lg"
                />
              </div>
            </div>
          )}
        </>
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
      <div ref={addToCartRef} className="flex flex-col gap-3 sm:flex-row">
        {selectedVariant ? (
          <AddToCartButton
            variantId={selectedVariant.id}
            productTitle={product.title}
            quantity={quantity}
            available={isAvailable}
            className="flex-1"
          />
        ) : (
          <button
            type="button"
            disabled
            className={cn(
              'flex-1 rounded-xl px-6 py-4 text-lg font-semibold',
              'cursor-not-allowed bg-muted text-muted-foreground'
            )}
          >
            {isSleepSaver ? 'Select A Size' : 'Select Options'}
          </button>
        )}

        {/* Wishlist Button */}
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-xl border px-6 py-4 font-medium transition-colors hover:bg-muted"
          aria-label="Add to wishlist"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <span className="text-green-700 dark:text-green-400">In Stock</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-red-700 dark:text-red-400">Out of Stock</span>
          </>
        )}
      </div>

      {/* Trust Signals */}
      <div className="grid grid-cols-3 gap-4 border-t pt-6 text-center text-xs text-muted-foreground">
        <div className="flex flex-col items-center gap-1">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Mobile Sticky Add-to-Cart Bar */}
      {showStickyBar && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white shadow-lg lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm font-semibold text-cgk-navy">
              {selectedVariant
                ? `$${parseFloat(selectedVariant.price.amount).toFixed(2)}`
                : `$${parseFloat(product.priceRange.minVariantPrice.amount).toFixed(2)}`}
            </div>
            {selectedVariant ? (
              <AddToCartButton
                variantId={selectedVariant.id}
                productTitle={product.title}
                quantity={quantity}
                available={isAvailable}
                className="rounded-lg px-6 py-2.5 text-sm"
              />
            ) : (
              <button
                type="button"
                disabled
                className="rounded-lg bg-muted px-6 py-2.5 text-sm font-semibold text-muted-foreground"
              >
                Select Options
              </button>
            )}
          </div>
        </div>
      )}
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

// Note: RelatedProducts is now implemented in ./sections.tsx
