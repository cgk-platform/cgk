'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Product } from './ProductGrid'

function formatPrice(amount: string, currencyCode: string): string {
  const price = parseFloat(amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(price)
}

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const currentPrice = formatPrice(
    product.priceRange.minVariantPrice.amount,
    product.priceRange.minVariantPrice.currencyCode
  )

  const compareAtPrice = product.compareAtPriceRange?.minVariantPrice
    ? formatPrice(
        product.compareAtPriceRange.minVariantPrice.amount,
        product.compareAtPriceRange.minVariantPrice.currencyCode
      )
    : null

  const hasDiscount =
    compareAtPrice &&
    product.compareAtPriceRange &&
    parseFloat(product.compareAtPriceRange.minVariantPrice.amount) >
      parseFloat(product.priceRange.minVariantPrice.amount)

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group block"
      style={{
        animation: 'fadeInUp 0.6s ease-out forwards',
        animationDelay: `${index * 50}ms`,
        opacity: 0,
      }}
    >
      <article className="h-full overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]">
        <div className="flex flex-col gap-5 md:gap-[26px]">
          {/* Product Image */}
          <div className="relative aspect-[328/220] overflow-hidden rounded-xl bg-[#F6F6F6] md:aspect-square">
            <Image
              src={product.featuredImage?.url || '/assets/product-display.webp'}
              alt={product.featuredImage?.altText || product.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading={index < 4 ? 'eager' : 'lazy'}
              priority={index < 4}
              onError={(e) => {
                const target = e.currentTarget
                if (target.src !== '/assets/product-display.webp') {
                  target.src = '/assets/product-display.webp'
                }
              }}
            />
          </div>

          {/* Product Info */}
          <div className="flex flex-col gap-[22px] px-1 pb-5">
            <h3 className="font-manrope line-clamp-2 min-h-[3.5rem] text-[18px] leading-[1.3] font-semibold text-[#161F2B] transition-colors duration-200 group-hover:text-[#0268A0]">
              {product.title}
            </h3>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="font-manrope text-[24px] font-bold text-[#0268A0]">
                {currentPrice}
              </span>
              {hasDiscount && (
                <span className="font-manrope text-[18px] font-medium text-[#777777] line-through">
                  {compareAtPrice}
                </span>
              )}
            </div>

            {/* CTA Button */}
            <div className="font-manrope flex items-center justify-between text-[14px] font-semibold tracking-wide text-[#0268A0]">
              <span>View Details</span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
