import { NextResponse } from 'next/server'
import { getMockProducts } from '@/lib/mock-products'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteContext {
  params: Promise<{
    handle: string
  }>
}

// Collection mapping for mock products
const COLLECTION_FILTERS: Record<
  string,
  { title: string; description: string; filter: (product: any) => boolean }
> = {
  'sofa-support': {
    title: 'Sofa Support',
    description: 'Premium support solutions for sofas and chairs',
    filter: (p) =>
      p.title.toLowerCase().includes('sofa') || p.title.toLowerCase().includes('chair'),
  },
  'sleeper-sofa-support': {
    title: 'Sleeper Sofa Support',
    description: 'Specialized support boards for sleeper sofas',
    filter: (p) => p.title.toLowerCase().includes('sleeper'),
  },
  'bed-support': {
    title: 'Bed Support',
    description: 'Support solutions for beds and mattresses',
    filter: (p) => p.title.toLowerCase().includes('bed') || p.title.toLowerCase().includes('elite'),
  },
  all: {
    title: 'All Products',
    description: 'Browse our complete collection',
    filter: () => true,
  },
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { handle } = await context.params

    // Try Shopify first (will implement once connection is set up)
    // For now, use mock products with filtering

    const collectionConfig = COLLECTION_FILTERS[handle] ||
      COLLECTION_FILTERS['all'] || {
        title: handle
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        description: '',
        filter: () => true,
      }

    const allProducts = getMockProducts()
    const filteredProducts = allProducts.filter(collectionConfig.filter)

    console.log(
      `📦 Collection "${handle}": ${filteredProducts.length}/${allProducts.length} products`
    )

    return NextResponse.json({
      success: true,
      data: filteredProducts,
      collection: {
        title: collectionConfig.title,
        description: collectionConfig.description,
      },
      mock: true,
      message: 'Using mock data - connect Shopify for real collections',
    })
  } catch (error) {
    console.error('Error fetching collection:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch collection',
        data: [],
      },
      { status: 500 }
    )
  }
}
