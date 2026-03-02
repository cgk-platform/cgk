/**
 * Product Detail API Route
 *
 * Fetches a single product by handle from Shopify using database-driven credentials.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantFromDomain } from '@/lib/tenant-resolution'
import { getShopifyClientForTenant } from '@/lib/shopify-from-database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{
    handle: string
  }>
}

/**
 * GET /api/products/:handle
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { handle } = await params

    // Resolve tenant from domain
    const host = request.headers.get('host')
    const tenant = await resolveTenantFromDomain(host)

    // Get Shopify client with database credentials
    const shopify = await getShopifyClientForTenant(tenant.id)

    // Fetch product from Shopify
    const result = (await shopify.query(
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
    )) as { product: unknown }

    if (!result.product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.product,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
    })
  } catch (error) {
    console.error('Failed to fetch product:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product',
      },
      { status: 500 }
    )
  }
}
