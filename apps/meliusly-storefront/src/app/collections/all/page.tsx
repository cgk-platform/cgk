import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/sections/ProductCard'
import type { Product } from '@/components/sections/ProductGrid'
import { logger } from '@cgk-platform/logging'

interface ProductsResponse {
  success: boolean
  data: Product[]
}

async function fetchProducts(): Promise<Product[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3300'
    const res = await fetch(`${baseUrl}/api/products?first=50&sortKey=BEST_SELLING`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      logger.error('Failed to fetch products:', new Error(await res.text()))
      return []
    }

    const json = (await res.json()) as ProductsResponse

    if (!json.success || !json.data) {
      logger.error('Invalid products response:', undefined, { response: json })
      return []
    }

    return json.data
  } catch (error) {
    logger.error(
      'Error fetching products:',
      error instanceof Error ? error : new Error(String(error))
    )
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

export default async function AllCollectionsPage() {
  const products = await fetchProducts()

  return (
    <main className="min-h-screen bg-white">
      {/* Collections Band - Figma 1:4176 */}
      <div className="bg-[#F6F6F6] px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-[1440px]">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm">
            <ol className="flex items-center gap-2 text-[#777777]">
              <li>
                <Link href="/" className="hover:text-[#0268A0]">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li className="text-[#161F2B]">All Products</li>
            </ol>
          </nav>

          {/* Title */}
          <h1 className="mb-4 text-center text-[32px] leading-[1.3] font-semibold text-[#161F2B] lg:text-[40px]">
            All Products
          </h1>

          {/* Description */}
          <p className="mx-auto max-w-2xl text-center text-[16px] leading-relaxed font-medium text-[#777777] lg:text-[18px]">
            Browse our complete collection of premium sofa bed support solutions
          </p>
        </div>
      </div>

      {/* Filter Bar - Figma 1:4178 */}
      <div className="border-b border-[#E5E5E5] bg-white px-6 py-4 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex items-center justify-between">
            {/* Product Count */}
            <p className="text-[14px] font-medium text-[#777777] lg:text-[16px]">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </p>

            {/* Sort (placeholder for future implementation) */}
            <div className="text-[14px] font-medium text-[#777777] lg:text-[16px]">
              Sort: <span className="text-[#0268A0]">Best Selling</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid - Figma 1:4182 */}
      <div className="px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          {/* Empty State */}
          {products.length === 0 && (
            <div className="py-24 text-center">
              <p className="text-[16px] font-medium text-[#777777] lg:text-[18px]">
                No products found.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
