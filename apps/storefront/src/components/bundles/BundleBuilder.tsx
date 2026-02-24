/**
 * Bundle Builder
 *
 * Headless React component that replicates the Shopify Liquid bundle builder.
 * Supports tier-based pricing, quantity controls, progress tracking,
 * tier unlock notifications, free gifts, and variant selection.
 *
 * Drop this into any PDP to enable "build your own bundle" functionality.
 */

'use client'

import { cn } from '@cgk-platform/ui'
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

import { addBundleToCart } from './bundle-actions'
import { BundleProductCard } from './BundleProductCard'
import { BundleSummary } from './BundleSummary'
import type {
  BundleProduct,
  BundleVariant,
  BundleConfig,
  BundleCartItem,
  SelectedProduct,
  BundleTier,
} from './types'

interface BundleBuilderProps {
  /** Products available for this bundle */
  products: BundleProduct[]
  /** Tier config, discount type, limits */
  config: BundleConfig
  /** Section headline */
  headline?: string
  /** Section subheadline */
  subheadline?: string
  /** CTA button text */
  ctaText?: string
  /** Show "You save $X" callout */
  showSavings?: boolean
  /** Show the tier progress bar */
  showTierProgress?: boolean
  /** Grid columns on desktop */
  columns?: 2 | 3 | 4
  /** Image aspect ratio for product cards */
  imageAspectRatio?: 'square' | 'portrait' | 'landscape'
  /** Custom add-to-cart handler (overrides the default server action) */
  onAddToCart?: (items: BundleCartItem[]) => Promise<void>
  /** ISO 4217 currency code for formatting */
  currencyCode?: string
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error'

const COLUMN_CLASSES = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
} as const

export function BundleBuilder({
  products,
  config,
  headline,
  subheadline,
  ctaText = 'Add Bundle to Cart',
  showSavings = false,
  showTierProgress = false,
  columns = 3,
  imageAspectRatio = 'square',
  onAddToCart,
  currencyCode = 'USD',
}: BundleBuilderProps) {
  const [selectedProducts, setSelectedProducts] = useState<Map<string, SelectedProduct>>(
    () => new Map()
  )
  const [activeVariants, setActiveVariants] = useState<Map<string, BundleVariant>>(() => {
    const map = new Map<string, BundleVariant>()
    for (const product of products) {
      const firstAvailable = product.variants.find((v) => v.available) ?? product.variants[0]
      if (firstAvailable) {
        map.set(product.id, firstAvailable)
      }
    }
    return map
  })
  const [buttonState, setButtonState] = useState<ButtonState>('idle')
  const [notification, setNotification] = useState<string | null>(null)
  const previousTierIndexRef = useRef(-1)
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sortedTiers = useMemo(
    () => [...config.tiers].sort((a, b) => a.count - b.count),
    [config.tiers]
  )

  // -- Derived calculations --

  const totalItems = useMemo(() => {
    let count = 0
    selectedProducts.forEach((item) => { count += item.quantity })
    return count
  }, [selectedProducts])

  const subtotal = useMemo(() => {
    let sum = 0
    selectedProducts.forEach((item) => { sum += item.price * item.quantity })
    return sum
  }, [selectedProducts])

  const activeTier = useMemo((): BundleTier | null => {
    for (let i = sortedTiers.length - 1; i >= 0; i--) {
      const tier = sortedTiers[i]
      if (tier && totalItems >= tier.count) return tier
    }
    return null
  }, [totalItems, sortedTiers])

  const activeTierIndex = useMemo(() => {
    for (let i = sortedTiers.length - 1; i >= 0; i--) {
      const tier = sortedTiers[i]
      if (tier && totalItems >= tier.count) return i
    }
    return -1
  }, [totalItems, sortedTiers])

  const nextTier = useMemo((): BundleTier | null => {
    for (const tier of sortedTiers) {
      if (totalItems < tier.count) return tier
    }
    return null
  }, [totalItems, sortedTiers])

  const discountAmount = useMemo(() => {
    if (!activeTier) return 0
    if (config.discountType === 'percentage') {
      return Math.round(subtotal * (Math.min(activeTier.discount, 100) / 100))
    }
    return Math.min(activeTier.discount, subtotal)
  }, [activeTier, subtotal, config.discountType])

  const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount])
  const maxReached = totalItems >= config.maxItems
  const canAddToCart = totalItems >= config.minItems && totalItems > 0

  const freeGiftIds = useMemo(() => {
    const ids = new Set<string>(config.freeGiftVariantIds ?? [])
    for (const tier of sortedTiers) {
      if (tier.freeGiftVariantId) ids.add(tier.freeGiftVariantId)
    }
    return ids
  }, [config.freeGiftVariantIds, sortedTiers])

  // -- Tier unlock notification --

  useEffect(() => {
    if (activeTierIndex > previousTierIndexRef.current && previousTierIndexRef.current >= 0) {
      const tier = sortedTiers[activeTierIndex]
      if (tier) {
        const discLabel = config.discountType === 'percentage'
          ? `${tier.discount}% off`
          : `${formatMoney(tier.discount, currencyCode)} off`
        const msg = tier.label ? `${tier.label} unlocked! ${discLabel}` : `Discount unlocked: ${discLabel}`
        fireNotification(msg)
      }
    }
    previousTierIndexRef.current = activeTierIndex
  }, [activeTierIndex, sortedTiers, config.discountType, currencyCode])

  useEffect(() => {
    if (buttonState === 'success' || buttonState === 'error') {
      const timer = setTimeout(() => setButtonState('idle'), 2500)
      return () => clearTimeout(timer)
    }
  }, [buttonState])

  function fireNotification(message: string) {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current)
    setNotification(message)
    notificationTimerRef.current = setTimeout(() => {
      setNotification(null)
      notificationTimerRef.current = null
    }, 3000)
  }

  // -- Event handlers --

  const handleToggle = useCallback(
    (product: BundleProduct, variant: BundleVariant) => {
      setSelectedProducts((prev) => {
        const next = new Map(prev)
        if (next.has(variant.id)) {
          next.delete(variant.id)
        } else {
          let currentTotal = 0
          next.forEach((item) => { currentTotal += item.quantity })
          if (currentTotal >= config.maxItems) return prev
          next.set(variant.id, {
            productId: product.id,
            variantId: variant.id,
            title: product.title,
            price: variant.price,
            quantity: 1,
          })
        }
        return next
      })
    },
    [config.maxItems]
  )

  const handleQuantityChange = useCallback(
    (variantId: string, delta: number) => {
      setSelectedProducts((prev) => {
        const item = prev.get(variantId)
        if (!item) return prev
        const newQty = item.quantity + delta
        const next = new Map(prev)
        if (newQty < 1) {
          next.delete(variantId)
        } else {
          let totalOther = 0
          prev.forEach((it, key) => { if (key !== variantId) totalOther += it.quantity })
          if (totalOther + newQty > config.maxItems) return prev
          next.set(variantId, { ...item, quantity: newQty })
        }
        return next
      })
    },
    [config.maxItems]
  )

  const handleVariantChange = useCallback(
    (product: BundleProduct, variant: BundleVariant) => {
      const prevVariant = activeVariants.get(product.id)
      setActiveVariants((prev) => {
        const next = new Map(prev)
        next.set(product.id, variant)
        return next
      })
      if (prevVariant && selectedProducts.has(prevVariant.id)) {
        setSelectedProducts((prev) => {
          const oldItem = prev.get(prevVariant.id)
          if (!oldItem) return prev
          const next = new Map(prev)
          next.delete(prevVariant.id)
          if (variant.available) {
            next.set(variant.id, {
              productId: product.id,
              variantId: variant.id,
              title: product.title,
              price: variant.price,
              quantity: oldItem.quantity,
            })
          }
          return next
        })
      }
    },
    [activeVariants, selectedProducts]
  )

  const handleAddToCart = useCallback(async () => {
    if (buttonState === 'loading' || !canAddToCart) return
    setButtonState('loading')

    const items: BundleCartItem[] = []
    selectedProducts.forEach((item) => {
      const properties: Record<string, string> = {
        _bundle_id: config.bundleId,
        _bundle_name: config.bundleName,
        _bundle_size: String(totalItems),
      }
      if (activeTier) {
        properties._bundle_discount = String(activeTier.discount)
        properties._bundle_discount_type = config.discountType
      }
      if (activeTier?.label) {
        properties._bundle_tier = activeTier.label
      }
      items.push({ variantId: item.variantId, quantity: item.quantity, properties })
    })

    try {
      if (onAddToCart) {
        await onAddToCart(items)
      } else {
        const result = await addBundleToCart(items)
        if (!result.success) throw new Error(result.error)
      }
      setButtonState('success')
      if (config.cartRedirect) window.location.href = '/cart'
    } catch (err) {
      console.error('[BundleBuilder] Cart error:', err)
      setButtonState('error')
    }
  }, [buttonState, canAddToCart, selectedProducts, config, totalItems, activeTier, onAddToCart])

  // -- Tier progress --

  const tierProgress = useMemo(() => {
    if (sortedTiers.length === 0) return { percent: 0, label: '', hint: '' }
    if (nextTier) {
      const needed = nextTier.count - totalItems
      let percent: number
      if (activeTier) {
        percent = ((totalItems - activeTier.count) / (nextTier.count - activeTier.count)) * 100
      } else {
        percent = (totalItems / nextTier.count) * 100
      }
      percent = Math.min(100, Math.max(0, percent))
      const nextDisc = config.discountType === 'percentage'
        ? `${nextTier.discount}% off`
        : `${formatMoney(nextTier.discount, currencyCode)} off`
      const nextName = nextTier.label ? `${nextTier.label} \u2014 ${nextDisc}` : nextDisc
      let hint = ''
      if (activeTier) {
        const curDisc = config.discountType === 'percentage'
          ? `${activeTier.discount}% off`
          : `${formatMoney(activeTier.discount, currencyCode)} off`
        hint = `Current: ${activeTier.label ?? curDisc}`
      }
      return { percent, label: `Add ${needed} more for ${nextName}!`, hint }
    }
    if (activeTier) {
      const lbl = activeTier.label ? `${activeTier.label} unlocked!` : 'Max discount unlocked!'
      return { percent: 100, label: lbl, hint: '' }
    }
    return { percent: 0, label: 'Select items to unlock discounts', hint: '' }
  }, [totalItems, activeTier, nextTier, sortedTiers, config.discountType, currencyCode])

  const ctaLabel = useMemo(() => {
    if (buttonState === 'loading') return 'Adding...'
    if (buttonState === 'success') return 'Added to Cart!'
    if (buttonState === 'error') return 'Error \u2014 Try Again'
    if (canAddToCart && total > 0) return `${ctaText} \u2014 ${formatMoney(total, currencyCode)}`
    return ctaText
  }, [buttonState, canAddToCart, total, ctaText, currencyCode])

  const tierBadgeText = useMemo(() => {
    if (!activeTier) return null
    const disc = config.discountType === 'percentage'
      ? `${activeTier.discount}% off`
      : `${formatMoney(activeTier.discount, currencyCode)} off`
    return activeTier.label ? `${activeTier.label} \u2014 ${disc}` : disc
  }, [activeTier, config.discountType, currencyCode])

  return (
    <section className="mx-auto w-full max-w-store px-4 py-10 sm:px-6 lg:px-8 lg:py-14" aria-label={config.bundleName}>
      {(headline || subheadline) && (
        <div className="mb-8 text-center">
          {headline && (
            <h2 className="text-2xl font-bold tracking-tight text-cgk-navy sm:text-3xl lg:text-4xl">{headline}</h2>
          )}
          {subheadline && (
            <p className="mx-auto mt-2 max-w-2xl text-base text-gray-500 sm:text-lg">{subheadline}</p>
          )}
        </div>
      )}

      {/* Tier unlock notification */}
      <div
        className={cn(
          'fixed left-1/2 top-6 z-50 -translate-x-1/2 transition-all duration-300',
          notification ? 'translate-y-0 opacity-100' : '-translate-y-4 pointer-events-none opacity-0'
        )}
        aria-live="polite"
        role="status"
      >
        {notification && (
          <div className="flex items-center gap-2 rounded-full bg-cgk-navy px-5 py-2.5 text-sm font-semibold text-white shadow-xl">
            <svg className="h-4 w-4 text-cgk-gold" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            {notification}
          </div>
        )}
      </div>

      {/* Product grid */}
      {products.length > 0 ? (
        <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5', COLUMN_CLASSES[columns])}>
          {products.map((product) => {
            const variant = activeVariants.get(product.id) ?? product.variants[0]
            if (!variant) return null
            const isGift = freeGiftIds.has(variant.id) || product.variants.some((v) => freeGiftIds.has(v.id))
            return (
              <BundleProductCard
                key={product.id}
                product={product}
                selected={selectedProducts.get(variant.id)}
                activeVariant={variant}
                onToggle={handleToggle}
                onQuantityChange={handleQuantityChange}
                onVariantChange={handleVariantChange}
                maxReached={maxReached}
                isFreeGift={isGift}
                imageAspectRatio={imageAspectRatio}
              />
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 px-6 py-12 text-center">
          <p className="text-gray-400">No products configured for this bundle.</p>
        </div>
      )}

      <BundleSummary
        totalItems={totalItems}
        subtotal={subtotal}
        discountAmount={discountAmount}
        total={total}
        activeTier={activeTier}
        tierBadgeText={tierBadgeText}
        tierProgress={tierProgress}
        sortedTiers={sortedTiers}
        showTierProgress={showTierProgress}
        showSavings={showSavings}
        ctaLabel={ctaLabel}
        buttonState={buttonState}
        canAddToCart={canAddToCart}
        currencyCode={currencyCode}
        onAddToCart={handleAddToCart}
      />
    </section>
  )
}

function formatMoney(cents: number, currencyCode: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(cents / 100)
}
