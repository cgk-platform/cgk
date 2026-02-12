/**
 * RelatedProducts Component
 *
 * Displays related products based on product type, vendor, or tags.
 * Server component that fetches from commerce provider.
 */

import type { Product } from '@cgk/commerce'
import { cn } from '@cgk/ui'

import { ProductCard } from './ProductCard'
import { ProductGrid } from './ProductGrid'

interface RelatedProductsProps {
  /** Products to display */
  products: Product[]
  /** Section title */
  title?: string
  /** Maximum products to show */
  maxDisplay?: number
  /** Custom class name */
  className?: string
}

export function RelatedProducts({
  products,
  title = 'You May Also Like',
  maxDisplay = 4,
  className,
}: RelatedProductsProps) {
  const displayProducts = products.slice(0, maxDisplay)

  if (displayProducts.length === 0) {
    return null
  }

  return (
    <section className={cn('py-8', className)} aria-labelledby="related-heading">
      <h2 id="related-heading" className="mb-6 text-xl font-bold">
        {title}
      </h2>
      <ProductGrid
        products={displayProducts}
        columns={{ sm: 2, md: 3, lg: 4 }}
        priorityCount={2}
      />
    </section>
  )
}

/**
 * Related Products with horizontal scroll for mobile
 */
interface RelatedProductsScrollProps {
  products: Product[]
  title?: string
  maxDisplay?: number
  className?: string
}

export function RelatedProductsScroll({
  products,
  title = 'You May Also Like',
  maxDisplay = 8,
  className,
}: RelatedProductsScrollProps) {
  const displayProducts = products.slice(0, maxDisplay)

  if (displayProducts.length === 0) {
    return null
  }

  return (
    <section className={cn('py-8', className)} aria-labelledby="related-scroll-heading">
      <h2 id="related-scroll-heading" className="mb-6 text-xl font-bold">
        {title}
      </h2>
      <div className="-mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:pb-0">
          {displayProducts.map((product, index) => (
            <div
              key={product.id}
              className="w-[160px] flex-shrink-0 md:w-auto"
            >
              <ProductCard product={product} priority={index < 2} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Skeleton loader for related products
 */
interface RelatedProductsSkeletonProps {
  count?: number
  className?: string
}

export function RelatedProductsSkeleton({
  count = 4,
  className,
}: RelatedProductsSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-4 md:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-3">
          <div className="aspect-square rounded-lg bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

export default RelatedProducts
