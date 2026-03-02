/**
 * Products API Route
 *
 * Fetches products from Shopify using database-driven credentials.
 * Resolves tenant from request domain automatically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantFromDomain } from '@/lib/tenant-resolution'
import { getShopifyClientForTenant } from '@/lib/shopify-from-database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/products
 *
 * Query params:
 * - first: Number of products to fetch (default: 8)
 * - sortKey: Sort key (BEST_SELLING, CREATED_AT, PRICE, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // Resolve tenant from domain
    const host = request.headers.get('host')
    const tenant = await resolveTenantFromDomain(host)

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const first = parseInt(searchParams.get('first') || '8', 10)
    const sortKey = searchParams.get('sortKey') || 'BEST_SELLING'

    try {
      // Get Shopify client with database credentials
      const shopify = await getShopifyClientForTenant(tenant.id)

      // Fetch products from Shopify
      const result = (await shopify.query(
        `
        query getProducts($first: Int!, $sortKey: ProductCollectionSortKeys) {
          products(first: $first, sortKey: $sortKey) {
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
                  width
                  height
                }
                images(first: 5) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
                variants(first: 10) {
                  edges {
                    node {
                      id
                      title
                      availableForSale
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
        { first, sortKey }
      )) as { products: { edges: Array<{ node: unknown }> } }

      const products = result.products.edges.map((edge) => edge.node)

      // Log image URLs for debugging
      products.forEach((product: any) => {
        if (!product.featuredImage?.url) {
          console.warn(`Product "${product.title}" is missing featuredImage`)
        } else {
          console.log(`Product "${product.title}" has image: ${product.featuredImage.url}`)
        }
      })

      return NextResponse.json({
        success: true,
        data: products,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
        },
      })
    } catch (shopifyError) {
      // If Shopify connection fails, return mock data for development
      console.warn('Shopify connection not available, using mock data:', shopifyError)

      const mockProducts = generateMockProducts(first)

      return NextResponse.json({
        success: true,
        data: mockProducts,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
        },
        mock: true,
      })
    }
  } catch (error) {
    console.error('Failed to fetch products:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      },
      { status: 500 }
    )
  }
}

/**
 * Generate mock products for development when Shopify is not connected
 */
function generateMockProducts(count: number) {
  const products = []
  const productNames = [
    'SleepSaver Pro',
    'Classic Sleeper',
    'Flex Sleeper',
    'Premium Support Board',
    'Comfort Plus',
    'Elite Sleeper',
    'Standard Support',
    'Deluxe Support Board',
  ]

  for (let i = 0; i < Math.min(count, productNames.length); i++) {
    const name = productNames[i]
    const handle = name.toLowerCase().replace(/\s+/g, '-')
    const basePrice = 99.99 + i * 20
    const hasDiscount = i % 3 === 0

    products.push({
      id: `gid://shopify/Product/mock-${i + 1}`,
      title: name,
      handle,
      description: `Premium sofa bed support solution - ${name}`,
      priceRange: {
        minVariantPrice: {
          amount: basePrice.toString(),
          currencyCode: 'USD',
        },
      },
      compareAtPriceRange: hasDiscount
        ? {
            minVariantPrice: {
              amount: (basePrice * 1.2).toString(),
              currencyCode: 'USD',
            },
          }
        : null,
      featuredImage: {
        url: `https://placehold.co/800x800/F6F6F6/0268A0?text=${encodeURIComponent(name)}`,
        altText: name,
        width: 800,
        height: 800,
      },
    })
  }

  return products
}
