'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { use } from 'react'

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
  collection?: {
    title: string
    description: string
  }
}

async function fetchCollectionProducts(handle: string): Promise<{
  products: Product[]
  collection: { title: string; description: string }
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3300'
    const res = await fetch(`${baseUrl}/api/collections/${handle}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error('Failed to fetch collection:', await res.text())
      return {
        products: [],
        collection: { title: formatCollectionTitle(handle), description: '' },
      }
    }

    const json = (await res.json()) as ProductsResponse

    if (!json.success || !json.data) {
      console.error('Invalid collection response:', json)
      return {
        products: [],
        collection: { title: formatCollectionTitle(handle), description: '' },
      }
    }

    return {
      products: json.data,
      collection: json.collection || {
        title: formatCollectionTitle(handle),
        description: '',
      },
    }
  } catch (error) {
    console.error('Error fetching collection:', error)
    return {
      products: [],
      collection: { title: formatCollectionTitle(handle), description: '' },
    }
  }
}

function formatCollectionTitle(handle: string): string {
  return handle
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatPrice(amount: string, currencyCode: string): string {
  const price = parseFloat(amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(price)
}

export default function CollectionPage({ params }: { params: Promise<{ handle: string }> }) {
  const resolvedParams = use(params)
  const { products, collection } = use(fetchCollectionProducts(resolvedParams.handle))

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-[#f3fafe] px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <nav className="mb-6 flex items-center gap-2 text-sm text-[#777777]">
            <Link href="/" className="hover:text-[#0268A0]">
              Home
            </Link>
            <span>/</span>
            <Link href="/collections/all" className="hover:text-[#0268A0]">
              Collections
            </Link>
            <span>/</span>
            <span className="text-[#161f2b]">{collection.title}</span>
          </nav>

          <h1 className="mb-4 text-center text-4xl font-semibold text-[#161f2b] lg:text-5xl">
            {collection.title}
          </h1>
          {collection.description && (
            <p className="mx-auto max-w-2xl text-center text-lg text-[#777777]">
              {collection.description}
            </p>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-8 flex items-center justify-between">
            <p className="text-lg text-[#777777]">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </p>
          </div>

          {products.length === 0 ? (
            <div className="py-20 text-center">
              <p className="mb-4 text-2xl font-semibold text-[#161f2b]">
                No products found in this collection
              </p>
              <Link
                href="/collections/all"
                className="inline-flex items-center gap-2 text-[#0268A0] hover:underline"
              >
                Browse all products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
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
                  <Link
                    key={product.id}
                    href={`/products/${product.handle}`}
                    className="group block"
                  >
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
          )}
        </div>
      </div>
    </main>
  )
}
