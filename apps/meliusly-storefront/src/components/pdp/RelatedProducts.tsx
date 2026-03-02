'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'

interface Product {
  id: string
  title: string
  handle: string
  priceRange: {
    minVariantPrice: {
      amount: string
      currencyCode: string
    }
  }
  compareAtPriceRange?: {
    minVariantPrice: {
      amount: string
      currencyCode: string
    }
  }
  featuredImage: {
    url: string
    altText: string | null
    width: number
    height: number
  }
}

interface RelatedProductsProps {
  products: Product[]
  currentProductId?: string
}

function formatPrice(amount: string, currencyCode: string): string {
  const price = parseFloat(amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(price)
}

function ProductCard({ product, index }: { product: Product; index: number }) {
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
      className="group block h-full"
      style={{
        animation: 'fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        animationDelay: `${index * 80}ms`,
        opacity: 0,
      }}
    >
      <article className="flex h-full flex-col overflow-hidden rounded-xl bg-white transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(2,104,160,0.25)]">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-[#F8FAFB] to-[#EFF3F5]">
          {/* Decorative accent line */}
          <div className="from-meliusly-primary to-meliusly-accent absolute top-0 left-0 z-10 h-1 w-0 bg-gradient-to-r transition-all duration-500 group-hover:w-full" />

          <Image
            src={product.featuredImage?.url || '/assets/product-display.webp'}
            alt={product.featuredImage?.altText || product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-1"
            loading={index < 4 ? 'eager' : 'lazy'}
            priority={index < 4}
            onError={(e) => {
              const target = e.currentTarget
              if (target.src !== '/assets/product-display.webp') {
                target.src = '/assets/product-display.webp'
              }
            }}
          />

          {/* Discount Badge */}
          {hasDiscount && (
            <div className="bg-meliusly-accent absolute top-3 right-3 rounded-full px-3 py-1.5 shadow-lg">
              <span className="font-manrope text-xs font-bold tracking-wider text-white uppercase">
                Sale
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-1 flex-col p-4 md:p-5">
          <h3 className="font-manrope text-meliusly-dark group-hover:text-meliusly-primary mb-3 line-clamp-2 min-h-[2.8rem] text-base leading-tight font-semibold transition-colors duration-300">
            {product.title}
          </h3>

          {/* Price */}
          <div className="mt-auto mb-4 flex items-baseline gap-2">
            <span className="font-manrope text-meliusly-primary text-lg font-bold md:text-xl">
              {currentPrice}
            </span>
            {hasDiscount && (
              <span className="font-manrope text-meliusly-dark/40 text-sm font-medium line-through">
                {compareAtPrice}
              </span>
            )}
          </div>

          {/* CTA Button */}
          <div className="border-meliusly-primary/20 bg-meliusly-primary/5 group-hover:border-meliusly-primary group-hover:bg-meliusly-primary flex items-center justify-between rounded-lg border px-4 py-2.5 transition-all duration-300">
            <span className="font-manrope text-meliusly-primary text-sm font-semibold tracking-wide transition-colors duration-300 group-hover:text-white">
              View Details
            </span>
            <ArrowRight
              className="text-meliusly-primary h-4 w-4 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white"
              strokeWidth={2.5}
            />
          </div>
        </div>
      </article>
    </Link>
  )
}

export default function RelatedProducts({ products, currentProductId }: RelatedProductsProps) {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Filter out current product and limit to 8 products
  const relatedProducts = products.filter((p) => p.id !== currentProductId).slice(0, 8)

  if (relatedProducts.length === 0) {
    return null
  }

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('related-products-scroll')
    if (!container) return

    const scrollAmount = container.clientWidth * 0.8
    const newPosition =
      direction === 'left'
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount)

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth',
    })

    setScrollPosition(newPosition)
    setCanScrollLeft(newPosition > 0)
    setCanScrollRight(newPosition < container.scrollWidth - container.clientWidth)
  }

  return (
    <>
      {/* CSS Animation Keyframes */}

      <section className="relative w-full overflow-hidden bg-gradient-to-b from-white to-[#F8FAFB] py-12 md:py-20">
        {/* Decorative background elements */}
        <div className="via-meliusly-primary/20 absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent to-transparent" />
        <div className="via-meliusly-primary/20 absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent to-transparent" />

        <div className="max-w-store mx-auto px-4 md:px-20">
          {/* Section Header */}
          <div className="mb-8 md:mb-12">
            <div className="mb-4 flex items-center gap-4">
              <div className="to-meliusly-primary/30 h-px flex-1 bg-gradient-to-r from-transparent" />
              <h2 className="font-manrope leading-heading text-meliusly-dark text-2xl font-semibold md:text-4xl">
                You May Also Love
              </h2>
              <div className="to-meliusly-primary/30 h-px flex-1 bg-gradient-to-l from-transparent" />
            </div>

            <p className="font-manrope text-meliusly-dark/60 text-center text-sm font-medium md:text-base">
              Handpicked products to complete your sleep sanctuary
            </p>
          </div>

          {/* Desktop: Scrollable Grid with Navigation */}
          <div className="relative hidden md:block">
            {/* Navigation Buttons */}
            {canScrollLeft && (
              <button
                onClick={() => handleScroll('left')}
                className="hover:bg-meliusly-primary absolute top-1/2 -left-5 z-20 -translate-y-1/2 rounded-full bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 hover:scale-110 hover:shadow-[0_8px_30px_rgba(2,104,160,0.3)]"
                aria-label="Scroll left"
              >
                <ChevronLeft
                  className="text-meliusly-primary h-6 w-6 transition-colors hover:text-white"
                  strokeWidth={2.5}
                />
              </button>
            )}

            {canScrollRight && (
              <button
                onClick={() => handleScroll('right')}
                className="hover:bg-meliusly-primary absolute top-1/2 -right-5 z-20 -translate-y-1/2 rounded-full bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 hover:scale-110 hover:shadow-[0_8px_30px_rgba(2,104,160,0.3)]"
                aria-label="Scroll right"
              >
                <ChevronRight
                  className="text-meliusly-primary h-6 w-6 transition-colors hover:text-white"
                  strokeWidth={2.5}
                />
              </button>
            )}

            {/* Scrollable Container */}
            <div
              id="related-products-scroll"
              className="hide-scrollbar overflow-x-auto"
              onScroll={(e) => {
                const target = e.target as HTMLDivElement
                setScrollPosition(target.scrollLeft)
                setCanScrollLeft(target.scrollLeft > 0)
                setCanScrollRight(target.scrollLeft < target.scrollWidth - target.clientWidth - 10)
              }}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <div className="grid auto-cols-[minmax(280px,1fr)] grid-flow-col gap-6 pb-2">
                {relatedProducts.map((product, index) => (
                  <div key={product.id} className="w-[280px]">
                    <ProductCard product={product} index={index} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile: 2-Column Grid */}
          <div className="grid grid-cols-2 gap-4 md:hidden">
            {relatedProducts.slice(0, 6).map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          {/* Shimmer loading indicator for visual interest */}
          <div className="shimmer-line mx-auto mt-8 h-1 w-32 rounded-full" />
        </div>
      </section>
    </>
  )
}
