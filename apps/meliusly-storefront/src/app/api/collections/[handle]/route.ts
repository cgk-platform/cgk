import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTenantIdFromDomain } from '@/lib/tenant-resolution'
import { getShopifyClientForTenant } from '@/lib/shopify-from-database'

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
      return NextResponse.json(
        {
          success: false,
          error: `No tenant found for host: ${host}`,
          data: [],
        },
        { status: 404 }
      )
    }

    // Get Shopify client for this tenant
    const shopify = await getShopifyClientForTenant(tenantId)

    // Fetch collection from Shopify
    const response = (await shopify.query(COLLECTION_PRODUCTS_QUERY, { handle })) as {
      data?: {
        collection?: {
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
    }

    if (!response.data?.collection) {
      console.warn(`[collections] Collection "${handle}" not found in Shopify`)
      return NextResponse.json(
        {
          success: false,
          error: `Collection "${handle}" not found`,
          data: [],
        },
        { status: 404 }
      )
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
