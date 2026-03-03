import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTenantIdFromDomain } from '@/lib/tenant-resolution'
import { getShopifyClientForTenant } from '@/lib/shopify-from-database'
import { createLogger } from '@cgk-platform/logging'

const logger = createLogger({
  meta: { service: 'meliusly-storefront', component: 'collections-api' }
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteContext {
  params: Promise<{
    handle: string
  }>
}

interface CollectionResponse {
  collection: {
    id: string
    title: string
    description: string
    products: {
      edges: Array<{
        node: {
          id: string
          title: string
          handle: string
          description: string
          priceRange: { minVariantPrice: { amount: string; currencyCode: string } }
          compareAtPriceRange?: { minVariantPrice: { amount: string; currencyCode: string } }
          featuredImage?: { url: string; altText: string }
          images: { edges: Array<{ node: { url: string; altText: string } }> }
          tags: string[]
          availableForSale: boolean
        }
      }>
    }
  }
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
    const host = headersList.get('host') || 'localhost:3300'
    const tenantId = await getTenantIdFromDomain(host)

    if (!tenantId) {
      logger.warn('[Collections API] No tenant found for host', { host })
      return NextResponse.json(
        {
          success: false,
          error: `No tenant found for host: ${host}`,
          data: []
        },
        { status: 404 }
      )
    }

    logger.info('[Collections API] Fetching collection', {
      tenantId,
      handle,
      host
    })

    // Get Shopify client (Hydrogen React with dual token source)
    const shopify = await getShopifyClientForTenant(tenantId)

    // Fetch collection using Hydrogen React query method
    const { data, errors } = await shopify.query<CollectionResponse>(
      COLLECTION_PRODUCTS_QUERY,
      { handle }
    )

    if (errors) {
      logger.error('[Collections API] GraphQL errors', undefined, { errors })
      return NextResponse.json(
        {
          success: false,
          error: 'GraphQL query failed',
          details: errors,
          data: []
        },
        { status: 500 }
      )
    }

    if (!data.collection) {
      logger.warn('[Collections API] Collection not found', { handle })
      return NextResponse.json(
        {
          success: false,
          error: `Collection "${handle}" not found`,
          data: []
        },
        { status: 404 }
      )
    }

    const collection = data.collection

    // Transform Shopify products to our format
    const products = collection.products.edges.map((edge: unknown) => {
      const e = edge as Record<string, unknown>
      const product = e.node as Record<string, unknown>
      const priceRange = product.priceRange as Record<string, unknown>
      const minVariantPrice = priceRange.minVariantPrice as Record<string, unknown>
      const compareAtPriceRange = product.compareAtPriceRange as Record<string, unknown> | undefined
      const compareAtMinVariantPrice = compareAtPriceRange?.minVariantPrice as Record<string, unknown> | undefined
      const featuredImage = product.featuredImage as Record<string, unknown> | undefined
      const images = product.images as Record<string, unknown>
      const imageEdges = images.edges as Array<Record<string, unknown>>

      return {
        id: product.id as unknown as string,
        title: product.title as unknown as string,
        handle: product.handle as unknown as string,
        description: product.description as unknown as string,
        price: parseFloat(minVariantPrice.amount as unknown as string),
        compareAtPrice: compareAtMinVariantPrice?.amount
          ? parseFloat(compareAtMinVariantPrice.amount as unknown as string)
          : null,
        image: (featuredImage?.url as unknown as string) || ((imageEdges[0] as Record<string, unknown>)?.node as Record<string, unknown>)?.url as unknown as string || null,
        images: imageEdges.map((img: unknown) => {
          const i = img as Record<string, unknown>
          const node = i.node as Record<string, unknown>
          return {
            url: node.url as unknown as string,
            alt: (node.altText as unknown as string) || (product.title as unknown as string)
          }
        }),
        tags: product.tags as unknown as string[],
        availableForSale: product.availableForSale as unknown as boolean
      }
    })

    logger.info('[Collections API] Collection fetched', {
      handle,
      productCount: products.length,
      tokenSource: shopify._metadata.tokenSource
    })

    return NextResponse.json({
      success: true,
      data: products,
      collection: {
        title: collection.title,
        description: collection.description
      },
      source: 'shopify-hydrogen',
      tokenSource: shopify._metadata.tokenSource
    })
  } catch (error) {
    logger.error(
      '[Collections API] Failed',
      error instanceof Error ? error : undefined,
      {
        errorType: error instanceof Error ? error.constructor.name : typeof error
      }
    )
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch collection',
        data: []
      },
      { status: 500 }
    )
  }
}
