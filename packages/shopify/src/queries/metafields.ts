/**
 * Shopify Metafield GraphQL queries
 */

import type { StorefrontClient } from '../storefront'

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

export interface ShopifyMetafield {
  namespace: string
  key: string
  value: string
  type: string
}

export interface MetafieldIdentifier {
  namespace: string
  key: string
}

// ---------------------------------------------------------------------------
// Response Types
// ---------------------------------------------------------------------------

interface ProductMetafieldsResponse {
  product: {
    metafields: Array<ShopifyMetafield | null>
  } | null
}

interface CollectionMetafieldResponse {
  collection: {
    metafield: ShopifyMetafield | null
  } | null
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getProductMetafields(
  client: StorefrontClient,
  handle: string,
  identifiers: MetafieldIdentifier[]
): Promise<ShopifyMetafield[]> {
  const result = await client.query<ProductMetafieldsResponse>(
    `
    query ProductMetafields($handle: String!, $identifiers: [HasMetafieldsIdentifier!]!) {
      product(handle: $handle) {
        metafields(identifiers: $identifiers) {
          namespace
          key
          value
          type
        }
      }
    }
    `,
    { handle, identifiers }
  )

  if (!result.product) return []
  return result.product.metafields.filter((m): m is ShopifyMetafield => m !== null)
}

export async function getCollectionMetafield(
  client: StorefrontClient,
  handle: string,
  namespace: string,
  key: string
): Promise<ShopifyMetafield | null> {
  const result = await client.query<CollectionMetafieldResponse>(
    `
    query CollectionMetafield($handle: String!, $namespace: String!, $key: String!) {
      collection(handle: $handle) {
        metafield(namespace: $namespace, key: $key) {
          namespace
          key
          value
          type
        }
      }
    }
    `,
    { handle, namespace, key }
  )

  return result.collection?.metafield ?? null
}
