/**
 * Product Detail API Route
 *
 * Fetches a single product by handle from Shopify using Hydrogen React.
 * CRITICAL: Powers all 14 PDP components - preserves data structure and mock fallback.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantFromDomain } from '@/lib/tenant-resolution'
import { getShopifyClientForTenant } from '@/lib/shopify-from-database'
import { getMockProductByHandle } from '@/lib/mock-products'
import { createLogger } from '@cgk-platform/logging'

const logger = createLogger({
  meta: { service: 'meliusly-storefront', component: 'product-detail-api' }
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{
    handle: string
  }>
}

interface ProductDetailResponse {
  product: {
    id: string
    title: string
    handle: string
    description: string
    descriptionHtml: string
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
          compareAtPrice?: { amount: string; currencyCode: string }
          selectedOptions: Array<{ name: string; value: string }>
        }
      }>
    }
    options: Array<{
      id: string
      name: string
      values: string[]
    }>
  }
}

/**
 * GET /api/products/:handle
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { handle } = await params

    // Resolve tenant from domain
    const host = request.headers.get('host') || 'localhost:3300'
    const tenant = await resolveTenantFromDomain(host)

    logger.info('[Product API] Fetching single product', {
      tenantId: tenant.id,
      handle,
      host
    })

    try {
      // Get Shopify client (Hydrogen React with dual token source)
      const shopify = await getShopifyClientForTenant(tenant.id)

      // Fetch product using Hydrogen React query method
      const { data, errors } = await shopify.query<ProductDetailResponse>(
        `
        query getProduct($handle: String!) {
          product(handle: $handle) {
            id
            title
            handle
            description
            descriptionHtml
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
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
            options {
              id
              name
              values
            }
          }
        }
      `,
        { handle }
      )

      if (errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`)
      }

      if (!data.product) {
        // Try mock data fallback
        const mockProduct = getMockProductByHandle(handle)
        if (mockProduct) {
          logger.warn('[Product API] Product not in Shopify, using mock', { handle })
          return NextResponse.json({
            success: true,
            data: mockProduct,
            tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
            mock: true,
            message: 'Using mock product data'
          })
        }

        return NextResponse.json(
          {
            success: false,
            error: 'Product not found'
          },
          { status: 404 }
        )
      }

      logger.info('[Product API] Product fetched from Shopify', {
        handle,
        productId: data.product.id,
        tokenSource: shopify._metadata.tokenSource
      })

      return NextResponse.json({
        success: true,
        data: data.product,
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
        tokenSource: shopify._metadata.tokenSource
      })
    } catch (shopifyError) {
      // Shopify connection failed - use mock data
      logger.warn('[Product API] Shopify connection failed, using mock data', {
        error: shopifyError instanceof Error ? shopifyError.message : 'Unknown'
      })

      const mockProduct = getMockProductByHandle(handle)
      if (mockProduct) {
        return NextResponse.json({
          success: true,
          data: mockProduct,
          tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
          mock: true,
          message: 'Shopify unavailable, using mock data'
        })
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Product not found and no mock data available'
        },
        { status: 404 }
      )
    }
  } catch (error) {
    logger.error(
      '[Product API] Failed',
      error instanceof Error ? error : undefined,
      {
        errorType: error instanceof Error ? error.constructor.name : typeof error
      }
    )

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product'
      },
      { status: 500 }
    )
  }
}
