import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

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

interface ProductsResponse {
  success: boolean
  data: Product[]
  tenant?: {
    id: string
    slug: string
    name: string
  }
}

async function fetchProducts(): Promise<Product[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3300'
    const res = await fetch(`${baseUrl}/api/products?first=8&sortKey=BEST_SELLING`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      console.error('Failed to fetch products:', await res.text())
      return []
    }

    const json = (await res.json()) as ProductsResponse

    if (!json.success || !json.data) {
      console.error('Invalid products response:', json)
      return []
    }

    return json.data
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
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
      className="group block"
      style={{
        animation: 'fadeInUp 0.6s ease-out forwards',
        animationDelay: `${index * 50}ms`,
        opacity: 0,
      }}
    >
      <article className="h-full overflow-hidden rounded-lg bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]">
        {/* Product Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-[#F6F6F6]">
          {product.featuredImage ? (
            <Image
              src={product.featuredImage.url}
              alt={product.featuredImage.altText || product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading={index < 4 ? 'eager' : 'lazy'}
              priority={index < 4}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#161F2B]/20">
              <span className="text-sm font-medium">No image</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-5">
          <h3 className="mb-3 line-clamp-2 min-h-[3.5rem] text-lg font-semibold text-[#161F2B] transition-colors duration-200 group-hover:text-[#0268A0]">
            {product.title}
          </h3>

          {/* Price */}
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0268A0]">{currentPrice}</span>
            {hasDiscount && (
              <span className="text-lg font-medium text-[#777777] line-through">
                {compareAtPrice}
              </span>
            )}
          </div>

          {/* CTA Button */}
          <div className="flex items-center justify-between text-sm font-semibold tracking-wide text-[#0268A0]">
            <span>View Details</span>
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              strokeWidth={2.5}
            />
          </div>
        </div>
      </article>
    </Link>
  )
}

export default async function ProductGrid() {
  const products = await fetchProducts()

  if (products.length === 0) {
    return null
  }

  return (
    <>
      {/* CSS Animation Keyframes */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <section className="bg-white px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          {/* Section Header */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-semibold text-[#161F2B] md:text-5xl">
              Our Best Sellers
            </h2>
            <div className="mx-auto h-1 w-20 rounded-full bg-[#0268A0]"></div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
            {products.slice(0, 8).map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          {/* Shop All Link */}
          <div className="mt-12 text-center">
            <Link
              href="/collections/all"
              className="inline-flex items-center gap-2 rounded-full bg-[#0268A0] px-8 py-3 text-base font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-[#015580] hover:shadow-lg"
            >
              Shop All Products
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
