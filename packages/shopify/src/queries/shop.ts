/**
 * Shopify Shop & Navigation GraphQL queries
 */

import type { StorefrontClient } from '../storefront'

// ---------------------------------------------------------------------------
// Response Types
// ---------------------------------------------------------------------------

interface ShopResponse {
  shop: ShopInfo
}

interface MenuResponse {
  menu: ShopifyMenu | null
}

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

export interface ShopInfo {
  name: string
  description: string
  primaryDomain: {
    url: string
    host: string
  }
  paymentSettings: {
    currencyCode: string
    acceptedCardBrands: string[]
    enabledPresentmentCurrencies: string[]
  }
  brand: {
    logo: {
      image: {
        url: string
        altText: string | null
        width: number
        height: number
      }
    } | null
    slogan: string | null
    shortDescription: string | null
    colors: {
      primary: Array<{ background: string; foreground: string }>
      secondary: Array<{ background: string; foreground: string }>
    }
  } | null
}

export interface ShopifyMenu {
  id: string
  handle: string
  title: string
  items: ShopifyMenuItem[]
}

export interface ShopifyMenuItem {
  id: string
  title: string
  url: string
  type: string
  resourceId: string | null
  items: ShopifyMenuItem[]
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getShop(
  client: StorefrontClient
): Promise<ShopInfo> {
  const result = await client.query<ShopResponse>(
    `
    query Shop {
      shop {
        name
        description
        primaryDomain {
          url
          host
        }
        paymentSettings {
          currencyCode
          acceptedCardBrands
          enabledPresentmentCurrencies
        }
        brand {
          logo {
            image {
              url
              altText
              width
              height
            }
          }
          slogan
          shortDescription
          colors {
            primary { background foreground }
            secondary { background foreground }
          }
        }
      }
    }
    `
  )

  return result.shop
}

// ---------------------------------------------------------------------------
// Shop Policy Types
// ---------------------------------------------------------------------------

export interface ShopPolicy {
  title: string
  body: string
  handle: string
}

export interface ShopPolicies {
  privacyPolicy: ShopPolicy | null
  termsOfService: ShopPolicy | null
  shippingPolicy: ShopPolicy | null
  refundPolicy: ShopPolicy | null
}

interface ShopPoliciesResponse {
  shop: ShopPolicies
}

/**
 * Fetch shop legal policies (privacy, terms, shipping, refund)
 */
export async function getShopPolicies(
  client: StorefrontClient
): Promise<ShopPolicies> {
  const result = await client.query<ShopPoliciesResponse>(
    `
    query ShopPolicies {
      shop {
        privacyPolicy {
          title
          body
          handle
        }
        termsOfService {
          title
          body
          handle
        }
        shippingPolicy {
          title
          body
          handle
        }
        refundPolicy {
          title
          body
          handle
        }
      }
    }
    `
  )

  return result.shop
}

export async function getMenu(
  client: StorefrontClient,
  handle: string
): Promise<ShopifyMenu | null> {
  const result = await client.query<MenuResponse>(
    `
    query Menu($handle: String!) {
      menu(handle: $handle) {
        id
        handle
        title
        items {
          id
          title
          url
          type
          resourceId
          items {
            id
            title
            url
            type
            resourceId
            items {
              id
              title
              url
              type
              resourceId
            }
          }
        }
      }
    }
    `,
    { handle }
  )

  return result.menu
}
