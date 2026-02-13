/**
 * RecentlyViewedProducts Component
 *
 * Displays products the user has recently viewed, stored in localStorage.
 * Client component that handles tracking and display.
 */

'use client'

import type { Product } from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'
import { useCallback, useEffect, useState } from 'react'

import { ProductCard } from './ProductCard'

const STORAGE_KEY = 'cgk_recently_viewed'
const MAX_ITEMS = 12

interface RecentlyViewedItem {
  id: string
  handle: string
  title: string
  viewedAt: number
}

interface RecentlyViewedProductsProps {
  /** Current product to exclude from display */
  currentProductId?: string
  /** Maximum products to show */
  maxDisplay?: number
  /** Product data fetcher (server action) */
  fetchProductsAction: (handles: string[]) => Promise<Product[]>
  /** Title for the section */
  title?: string
  /** Custom class name */
  className?: string
}

export function RecentlyViewedProducts({
  currentProductId,
  maxDisplay = 4,
  fetchProductsAction,
  title = 'Recently Viewed',
  className,
}: RecentlyViewedProductsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      const stored = getStoredItems()

      // Filter out current product and get handles
      const handles = stored
        .filter((item) => item.id !== currentProductId)
        .slice(0, maxDisplay)
        .map((item) => item.handle)

      if (handles.length === 0) {
        setIsLoading(false)
        return
      }

      try {
        const fetchedProducts = await fetchProductsAction(handles)
        setProducts(fetchedProducts)
      } catch (error) {
        console.error('Failed to fetch recently viewed products:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [currentProductId, maxDisplay, fetchProductsAction])

  if (isLoading) {
    return (
      <section className={cn('py-8', className)}>
        <h2 className="mb-6 text-xl font-bold">{title}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: maxDisplay }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return null // Don't render if no recently viewed products
  }

  return (
    <section className={cn('py-8', className)}>
      <h2 className="mb-6 text-xl font-bold">{title}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={index < 2}
          />
        ))}
      </div>
    </section>
  )
}

/**
 * Hook to track recently viewed products
 */
export function useRecentlyViewed() {
  const trackView = useCallback(
    (product: { id: string; handle: string; title: string }) => {
      if (typeof window === 'undefined') return

      const stored = getStoredItems()

      // Remove existing entry for this product
      const filtered = stored.filter((item) => item.id !== product.id)

      // Add new entry at the beginning
      const newItem: RecentlyViewedItem = {
        id: product.id,
        handle: product.handle,
        title: product.title,
        viewedAt: Date.now(),
      }

      const updated = [newItem, ...filtered].slice(0, MAX_ITEMS)

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Failed to save recently viewed:', error)
      }
    },
    []
  )

  const clearHistory = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear recently viewed:', error)
    }
  }, [])

  return { trackView, clearHistory }
}

/**
 * Component to track a product view
 * Include this on product detail pages
 */
interface TrackProductViewProps {
  product: { id: string; handle: string; title: string }
}

export function TrackProductView({ product }: TrackProductViewProps) {
  const { trackView } = useRecentlyViewed()

  useEffect(() => {
    trackView(product)
  }, [product, trackView])

  return null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStoredItems(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    // Validate items
    return parsed.filter(
      (item): item is RecentlyViewedItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.handle === 'string' &&
        typeof item.title === 'string' &&
        typeof item.viewedAt === 'number'
    )
  } catch {
    return []
  }
}

function ProductSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="aspect-square rounded-lg bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
    </div>
  )
}

export default RecentlyViewedProducts
