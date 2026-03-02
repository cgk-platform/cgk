import Link from 'next/link'
import Image from 'next/image'
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
}

async function fetchProducts(): Promise<Product[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3300'
    const res = await fetch(`${baseUrl}/api/products?first=50&sortKey=BEST_SELLING`, {
      cache: 'no-store',
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
            {products.map((product) => {
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
                <Link key={product.id} href={`/products/${product.handle}`} className="group block">
                  <article className="h-full overflow-hidden rounded-lg bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                    {/* Product Image */}
                    <div className="relative aspect-square overflow-hidden bg-[#F6F6F6]">
                      <Image
                        src={product.featuredImage?.url || '/assets/product-display.webp'}
                        alt={product.featuredImage?.altText || product.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.currentTarget
                          if (target.src !== '/assets/product-display.webp') {
                            target.src = '/assets/product-display.webp'
                          }
                        }}
                      />
                    </div>

                    {/* Product Info */}
                    <div className="p-4 lg:p-6">
                      <h3 className="mb-2 line-clamp-2 min-h-[3rem] text-[14px] leading-snug font-semibold text-[#161F2B] lg:text-[16px]">
                        {product.title}
                      </h3>

                      {/* Price */}
                      <div className="mb-3 flex items-baseline gap-2">
                        <span className="text-[18px] font-bold text-[#0268A0] lg:text-[20px]">
                          {currentPrice}
                        </span>
                        {hasDiscount && (
                          <span className="text-[14px] font-medium text-[#777777] line-through lg:text-[16px]">
                            {compareAtPrice}
                          </span>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-between text-[13px] font-semibold text-[#0268A0] lg:text-[14px]">
                        <span>View Details</span>
                        <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2.5} />
                      </div>
                    </div>
                  </article>
                </Link>
              )
            })}
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
