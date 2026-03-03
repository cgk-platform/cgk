import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTenantIdFromDomain } from '@/lib/tenant-resolution'
import { getShopifyClientForTenant } from '@/lib/shopify-from-database'
import { getMockProducts } from '@/lib/mock-products'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteContext {
  params: Promise<{
    handle: string
  }>
}

// Shopify GraphQL query for collection products
const COLLECTION_PRODUCTS_QUERY = `
  query getCollectionByHandle($handle: String!) {
    collection(handle: $handle) {
      id
      title
      description
      products(first: 50) {
        edges {
          node {
            id
            title
            handle
            description
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            featuredImage {
              url
              altText
            }
            images(first: 5) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            tags
            availableForSale
          }
        }
      }
    }
  }
`

export async function GET(request: Request, context: RouteContext) {
  try {
    const { handle } = await context.params

    // Resolve tenant from domain
    const headersList = await headers()
    const host = headersList.get('host')
    const tenantId = await getTenantIdFromDomain(host)

    if (!tenantId) {
      console.warn(`[collections] No tenant found for host: ${host}`)
      return fallbackToMockProducts(handle)
    }

    // Get Shopify client for this tenant
    let shopify
    try {
      shopify = await getShopifyClientForTenant(tenantId)
    } catch (error) {
      console.warn(`[collections] Shopify not connected for tenant ${tenantId}:`, error)
      return fallbackToMockProducts(handle)
    }

    // Fetch collection from Shopify
    const response = await shopify.query(COLLECTION_PRODUCTS_QUERY, { handle })

    if (!response.data?.collection) {
      console.warn(`[collections] Collection "${handle}" not found in Shopify`)
      return fallbackToMockProducts(handle)
    }

    const collection = response.data.collection

    // Transform Shopify products to our format
    const products = collection.products.edges.map((edge: any) => {
      const product = edge.node
      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.description,
        price: parseFloat(product.priceRange.minVariantPrice.amount),
        compareAtPrice: product.compareAtPriceRange?.minVariantPrice?.amount
          ? parseFloat(product.compareAtPriceRange.minVariantPrice.amount)
          : null,
        image: product.featuredImage?.url || product.images.edges[0]?.node.url || null,
        images: product.images.edges.map((img: any) => ({
          url: img.node.url,
          alt: img.node.altText || product.title,
        })),
        tags: product.tags,
        availableForSale: product.availableForSale,
      }
    })

    console.log(
      `📦 [Shopify] Collection "${handle}": ${products.length} products from ${collection.title}`
    )

    return NextResponse.json({
      success: true,
      data: products,
      collection: {
        title: collection.title,
        description: collection.description,
      },
      source: 'shopify',
    })
  } catch (error) {
    console.error('[collections] Error fetching collection:', error)
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

// Fallback to mock products if Shopify unavailable
function fallbackToMockProducts(handle: string) {
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
      filter: (p) =>
        p.title.toLowerCase().includes('bed') || p.title.toLowerCase().includes('elite'),
    },
    all: {
      title: 'All Products',
      description: 'Browse our complete collection',
      filter: () => true,
    },
  }

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

  console.log(`📦 [Mock] Collection "${handle}": ${filteredProducts.length} products (fallback)`)

  return NextResponse.json({
    success: true,
    data: filteredProducts,
    collection: {
      title: collectionConfig.title,
      description: collectionConfig.description,
    },
    source: 'mock',
    message: 'Using mock data - Shopify not connected',
  })
}
