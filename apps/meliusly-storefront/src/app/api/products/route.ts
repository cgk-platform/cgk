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

    // Get Shopify client with database credentials
    const shopify = await getShopifyClientForTenant(tenant.id)

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const first = parseInt(searchParams.get('first') || '8', 10)
    const sortKey = searchParams.get('sortKey') || 'BEST_SELLING'

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
