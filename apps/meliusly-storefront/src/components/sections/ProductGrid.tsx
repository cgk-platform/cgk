import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProductCard } from './ProductCard'
import { logger } from '@cgk-platform/logging'

export interface Product {
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
      logger.error('Failed to fetch products:', await res.text())
      return []
    }

    const json = (await res.json()) as ProductsResponse

    if (!json.success || !json.data) {
      logger.error('Invalid products response:', json)
      return []
    }

    return json.data
  } catch (error) {
    logger.error('Error fetching products:', error)
    return []
  }
}
export default async function ProductGrid() {
  const products = await fetchProducts()

  if (products.length === 0) {
    return null
  }

  return (
    <section className="bg-white px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <h2 className="font-manrope mb-4 text-[32px] leading-[1.3] font-semibold text-[#161F2B] md:text-[40px]">
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
            className="font-manrope inline-flex items-center gap-2 rounded-lg bg-[#0268A0] px-8 py-3 text-[16px] font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-[#015580] hover:shadow-lg"
          >
            Shop All Products
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  )
}
