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
      {/* Hero Section */}
      <div className="bg-[#f3fafe] px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="mb-4 text-center text-4xl font-semibold text-[#161f2b] lg:text-5xl">
            All Products
          </h1>
          <p className="mx-auto max-w-2xl text-center text-lg text-[#777777]">
            Browse our complete collection of premium sofa bed support solutions
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-8 flex items-center justify-between">
            <p className="text-lg text-[#777777]">{products.length} products</p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
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
                      {product.featuredImage?.url ? (
                        <Image
                          src={product.featuredImage.url}
                          alt={product.featuredImage.altText || product.title}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#161F2B]/20">
                          <span className="text-sm font-medium">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="mb-2 line-clamp-2 min-h-[3rem] text-base font-semibold text-[#161F2B]">
                        {product.title}
                      </h3>

                      {/* Price */}
                      <div className="mb-3 flex items-baseline gap-2">
                        <span className="text-xl font-bold text-[#0268A0]">{currentPrice}</span>
                        {hasDiscount && (
                          <span className="text-sm font-medium text-[#777777] line-through">
                            {compareAtPrice}
                          </span>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-between text-sm font-semibold text-[#0268A0]">
                        <span>View Details</span>
                        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                      </div>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
