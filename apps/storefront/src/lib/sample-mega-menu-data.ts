/**
 * Sample Mega Menu Data
 *
 * This file provides example data structure for the MegaMenu component.
 * In production, replace this with actual data from Shopify Storefront API.
 *
 * Usage:
 * import { sampleMenuData } from '@/lib/sample-mega-menu-data'
 * <MegaMenu items={sampleMenuData} />
 */

import type { MenuItem } from '@/components/layout/MegaMenu'

export const sampleMenuData: MenuItem[] = [
  {
    id: 'sleeper-sofa-support',
    title: 'Sleeper Sofa Support',
    url: '/collections/sleeper-sofa-support',
    items: [
      {
        id: 'support-boards',
        title: 'Support Boards',
        url: '/collections/support-boards',
        items: [],
      },
      {
        id: 'mattress-toppers',
        title: 'Mattress Toppers',
        url: '/collections/mattress-toppers',
        items: [],
      },
    ],
    featuredProducts: [
      {
        title: 'SleeperSaver Sofa Bed Support Board',
        description: 'Permanently installed sleeper sofa support board for sofa bed',
        price: '$199.00',
        handle: 'sleepersaver-sofa-bed-support-board',
        image: {
          url: 'https://cdn.shopify.com/s/files/1/0234/5678/products/sleepersaver-yellow.png',
          alt: 'SleeperSaver Support Board with yellow sofa',
        },
        badge: 'BEST SELLER',
      },
      {
        title: 'Classic Sleeper Sofa Support Board',
        description: 'Rigid, heavy-duty support for sofa beds',
        price: '$149.00',
        handle: 'classic-sleeper-sofa-support-board',
        image: {
          url: 'https://cdn.shopify.com/s/files/1/0234/5678/products/classic-orange.png',
          alt: 'Classic Support Board with orange sofa',
        },
      },
      {
        title: 'Flex Sleeper Sofa Support Board',
        description: 'Flexible, Comfort-First Support for Sofa Beds',
        price: '$179.00',
        handle: 'flex-sleeper-sofa-support-board',
        image: {
          url: 'https://cdn.shopify.com/s/files/1/0234/5678/products/flex-red.png',
          alt: 'Flex Support Board with red sofa',
        },
      },
    ],
  },
  {
    id: 'sofa-support',
    title: 'Sofa Support',
    url: '/collections/sofa-support',
    items: [
      {
        id: 'cushion-supports',
        title: 'Cushion Supports',
        url: '/collections/cushion-supports',
        items: [],
      },
      {
        id: 'frame-supports',
        title: 'Frame Supports',
        url: '/collections/frame-supports',
        items: [],
      },
    ],
    featuredProducts: [],
  },
  {
    id: 'bed-support',
    title: 'Bed Support',
    url: '/collections/bed-support',
    items: [
      {
        id: 'mattress-foundation',
        title: 'Mattress Foundation',
        url: '/collections/mattress-foundation',
        items: [],
      },
      {
        id: 'bed-slats',
        title: 'Bed Slats',
        url: '/collections/bed-slats',
        items: [],
      },
    ],
    featuredProducts: [],
  },
  {
    id: 'product-guides',
    title: 'Product Guides',
    url: '/pages/product-guides',
    items: [],
  },
  {
    id: 'help',
    title: 'Help',
    url: '/pages/help',
    items: [],
  },
]

/**
 * Fetch menu data from Shopify Storefront API
 *
 * Example implementation:
 *
 * ```typescript
 * import { storefront } from '@/lib/shopify'
 *
 * export async function fetchMenuData(): Promise<MenuItem[]> {
 *   const { menu } = await storefront.query({
 *     query: `#graphql
 *       query Menu {
 *         menu(handle: "main-menu") {
 *           items {
 *             id
 *             title
 *             url
 *             items {
 *               id
 *               title
 *               url
 *             }
 *           }
 *         }
 *       }
 *     `
 *   })
 *
 *   // Fetch featured products for each category
 *   const itemsWithProducts = await Promise.all(
 *     menu.items.map(async (item) => {
 *       if (item.url.includes('/collections/')) {
 *         const collectionHandle = item.url.split('/').pop()
 *         const products = await fetchFeaturedProducts(collectionHandle, 3)
 *         return { ...item, featuredProducts: products }
 *       }
 *       return item
 *     })
 *   )
 *
 *   return itemsWithProducts
 * }
 *
 * async function fetchFeaturedProducts(collectionHandle: string, limit: number) {
 *   const { collection } = await storefront.query({
 *     query: `#graphql
 *       query FeaturedProducts($handle: String!, $first: Int!) {
 *         collection(handle: $handle) {
 *           products(first: $first, sortKey: BEST_SELLING) {
 *             nodes {
 *               id
 *               title
 *               handle
 *               description
 *               priceRange {
 *                 minVariantPrice {
 *                   amount
 *                   currencyCode
 *                 }
 *               }
 *               featuredImage {
 *                 url
 *                 altText
 *               }
 *               tags
 *             }
 *           }
 *         }
 *       }
 *     `,
 *     variables: { handle: collectionHandle, first: limit }
 *   })
 *
 *   return collection.products.nodes.map((product: any) => ({
 *     title: product.title,
 *     description: product.description,
 *     price: new Intl.NumberFormat('en-US', {
 *       style: 'currency',
 *       currency: product.priceRange.minVariantPrice.currencyCode
 *     }).format(product.priceRange.minVariantPrice.amount),
 *     handle: product.handle,
 *     image: {
 *       url: product.featuredImage.url,
 *       alt: product.featuredImage.altText || product.title
 *     },
 *     badge: product.tags.includes('best-seller') ? 'BEST SELLER' : undefined
 *   }))
 * }
 * ```
 */
