import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/sections/ProductCard'
import type { Product } from '@/components/sections/ProductGrid'

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

export default async function CollectionPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const { products, collection } = await fetchCollectionProducts(handle)

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
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
