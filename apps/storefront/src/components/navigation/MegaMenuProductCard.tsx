/**
 * Mega Menu Product Card
 *
 * Premium product card component for mega menu dropdowns.
 * Features 3D product render, optional badge, elegant hover effects.
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@cgk-platform/ui'

export interface MegaMenuProduct {
  title: string
  description: string
  price: string
  handle: string
  image: {
    url: string
    alt: string
  }
  badge?: string
}

interface MegaMenuProductCardProps {
  product: MegaMenuProduct
  onClick?: () => void
}

export function MegaMenuProductCard({ product, onClick }: MegaMenuProductCardProps) {
  return (
    <Link
      href={`/products/${product.handle}`}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white',
        'transition-all duration-300 ease-out',
        'hover:scale-[1.02] hover:shadow-2xl hover:shadow-meliusly-primary/10',
        'focus:outline-none focus:ring-2 focus:ring-meliusly-primary focus:ring-offset-2'
      )}
    >
      {/* Badge Overlay */}
      {product.badge && (
        <div className="absolute left-3 top-3 z-10">
          <div
            className={cn(
              'rounded bg-meliusly-primary px-3 py-1.5 shadow-lg',
              'transform-gpu transition-transform duration-300',
              'group-hover:scale-105'
            )}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              {product.badge}
            </span>
          </div>
        </div>
      )}

      {/* Product Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
        <Image
          src={product.image.url}
          alt={product.image.alt}
          fill
          className={cn(
            'object-contain p-6 transition-transform duration-500 ease-out',
            'group-hover:scale-105'
          )}
          sizes="(min-width: 1024px) 350px, 280px"
        />
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col p-5">
        {/* Product Title */}
        <h3
          className={cn(
            'mb-2 font-manrope text-base font-semibold leading-tight text-meliusly-dark',
            'transition-colors duration-200',
            'group-hover:text-meliusly-primary'
          )}
        >
          {product.title}
        </h3>

        {/* Product Description */}
        <p
          className={cn(
            'mb-4 line-clamp-2 flex-1 font-manrope text-sm leading-relaxed text-meliusly-dark-gray'
          )}
        >
          {product.description}
        </p>

        {/* Price & CTA */}
        <div className="flex items-center justify-between">
          <span className="font-manrope text-lg font-semibold text-meliusly-dark">
            {product.price}
          </span>
          <div
            className={cn(
              'rounded-md bg-meliusly-primary px-4 py-2',
              'transition-all duration-200',
              'group-hover:bg-meliusly-primary/90 group-hover:shadow-lg'
            )}
          >
            <span className="text-sm font-medium text-white">View</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
