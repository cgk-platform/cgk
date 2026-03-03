/**
 * Products API Route
 *
 * Fetches products from Shopify using Hydrogen React client.
 * Uses dual token source (database primary + env fallback).
 * Resolves tenant from request domain automatically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantFromDomain } from '@/lib/tenant-resolution'
import { getShopifyClientForTenant } from '@/lib/shopify-from-database'
import { createLogger } from '@cgk-platform/logging'

const logger = createLogger({
  meta: { service: 'meliusly-storefront', component: 'products-api' }
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ProductsResponse {
  products: {
    edges: Array<{
      node: {
        id: string
        title: string
        handle: string
        description: string
        priceRange: {
          minVariantPrice: { amount: string; currencyCode: string }
        }
        compareAtPriceRange?: {
          minVariantPrice: { amount: string; currencyCode: string }
        }
        featuredImage?: {
          url: string
          altText: string
          width: number
          height: number
        }
        images: {
          edges: Array<{
            node: {
              url: string
              altText: string
              width: number
              height: number
            }
          }>
        }
        variants: {
          edges: Array<{
            node: {
              id: string
              title: string
              availableForSale: boolean
              price: { amount: string; currencyCode: string }
            }
          }>
        }
      }
    }>
  }
}

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
    const host = request.headers.get('host') || 'localhost:3300'
    const tenant = await resolveTenantFromDomain(host)

    logger.info('[Products API] Fetching products', {
      tenantId: tenant.id,
      host
    })

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const first = parseInt(searchParams.get('first') || '8', 10)
    const sortKey = searchParams.get('sortKey') || 'BEST_SELLING'

    // Get Shopify client (Hydrogen React with dual token source)
    const shopify = await getShopifyClientForTenant(tenant.id)

    // Fetch products using Hydrogen React query method
    const { data, errors } = await shopify.query<ProductsResponse>(
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
              images(first: 10) {
                edges {
                  node {
                    url
                    altText
                    width
                    height
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
    )

    if (errors) {
      logger.error('[Products API] GraphQL errors', undefined, { errors })
      return NextResponse.json(
        {
          success: false,
          error: 'GraphQL query failed',
          details: errors
        },
        { status: 500 }
      )
    }

    const products = data.products.edges.map((edge: { node: unknown }) => edge.node)

    logger.info('[Products API] Products fetched', {
      count: products.length,
      tokenSource: shopify._metadata.tokenSource
    })

    return NextResponse.json({
      success: true,
      data: products,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name
      },
      source: 'shopify-hydrogen',
      tokenSource: shopify._metadata.tokenSource
    })
  } catch (error) {
    logger.error(
      '[Products API] Failed',
      error instanceof Error ? error : undefined,
      {
        errorType: error instanceof Error ? error.constructor.name : typeof error
      }
    )

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products'
      },
      { status: 500 }
    )
  }
}
