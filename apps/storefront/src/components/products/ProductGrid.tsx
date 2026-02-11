/**
 * ProductGrid Component
 *
 * Responsive grid layout for displaying product cards.
 */

import type { Product } from '@cgk/commerce'
import { cn } from '@cgk/ui'

import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: Product[]
  /** Number of columns at each breakpoint */
  columns?: {
    sm?: 2 | 3 | 4
    md?: 2 | 3 | 4
    lg?: 3 | 4 | 5 | 6
  }
  /** Show vendor name on cards */
  showVendor?: boolean
  /** Priority load first N images */
  priorityCount?: number
  /** Custom class name */
  className?: string
}

export function ProductGrid({
  products,
  columns = { sm: 2, md: 3, lg: 4 },
  showVendor = false,
  priorityCount = 4,
  className,
}: ProductGridProps) {
  const gridColsClass = cn(
    'grid gap-4 sm:gap-6',
    columns.sm === 2 && 'grid-cols-2',
    columns.sm === 3 && 'grid-cols-3',
    columns.sm === 4 && 'grid-cols-4',
    columns.md === 2 && 'md:grid-cols-2',
    columns.md === 3 && 'md:grid-cols-3',
    columns.md === 4 && 'md:grid-cols-4',
    columns.lg === 3 && 'lg:grid-cols-3',
    columns.lg === 4 && 'lg:grid-cols-4',
    columns.lg === 5 && 'lg:grid-cols-5',
    columns.lg === 6 && 'lg:grid-cols-6'
  )

  if (products.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <svg
          className="mb-4 h-12 w-12 text-muted-foreground"
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
        <p className="text-muted-foreground">No products found</p>
      </div>
    )
  }

  return (
    <div className={cn(gridColsClass, className)}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          showVendor={showVendor}
          priority={index < priorityCount}
        />
      ))}
    </div>
  )
}

export default ProductGrid
