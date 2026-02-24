/**
 * Shopify Collection GraphQL queries
 */

import type { StorefrontClient } from '../storefront'
import type {
  ShopifyCollection,
  ShopifyProduct,
  ShopifyPageInfo,
} from '../types'

// ---------------------------------------------------------------------------
// Fragments
// ---------------------------------------------------------------------------

const COLLECTION_FRAGMENT = `
  fragment CollectionFields on Collection {
    id
    title
    handle
    description
    descriptionHtml
    image {
      id
      url
      altText
      width
      height
    }
  }
`

const COLLECTION_PRODUCT_FRAGMENT = `
  fragment CollectionProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    vendor
    productType
    tags
    availableForSale
    createdAt
    updatedAt
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    variants(first: 100) {
      edges {
        node {
          id
          title
          sku
          availableForSale
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          selectedOptions { name value }
          image { id url altText width height }
        }
      }
    }
    images(first: 20) {
      edges {
        node { id url altText width height }
      }
    }
  }
`

// ---------------------------------------------------------------------------
// Response Types
// ---------------------------------------------------------------------------

interface CollectionsResponse {
  collections: {
    edges: Array<{ node: ShopifyCollection }>
    pageInfo: ShopifyPageInfo
  }
}

interface CollectionByHandleResponse {
  collection: ShopifyCollection | null
}

interface CollectionProductsResponse {
  collection: {
    products: {
      edges: Array<{ node: ShopifyProduct }>
      pageInfo: ShopifyPageInfo
      filters: ShopifyProductFilter[]
    }
  } | null
}

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

export interface ListCollectionsParams {
  first?: number
  after?: string
  query?: string
  sortKey?: 'TITLE' | 'UPDATED_AT' | 'ID'
  reverse?: boolean
}

export interface CollectionProductsParams {
  first?: number
  after?: string
  filters?: ProductFilter[]
  sortKey?: 'TITLE' | 'PRICE' | 'CREATED' | 'BEST_SELLING' | 'MANUAL' | 'COLLECTION_DEFAULT'
  reverse?: boolean
}

export interface ProductFilter {
  variantOption?: { name: string; value: string }
  price?: { min?: number; max?: number }
  available?: boolean
  productType?: string
  tag?: string
}

export interface ShopifyProductFilter {
  id: string
  label: string
  type: string
  values: Array<{
    id: string
    label: string
    count: number
    input: string
  }>
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listCollections(
  client: StorefrontClient,
  params: ListCollectionsParams = {}
): Promise<{ collections: ShopifyCollection[]; pageInfo: ShopifyPageInfo }> {
  const { first = 20, after, query, sortKey, reverse } = params

  const result = await client.query<CollectionsResponse>(
    `
    ${COLLECTION_FRAGMENT}
    query Collections($first: Int!, $after: String, $query: String, $sortKey: CollectionSortKeys, $reverse: Boolean) {
      collections(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges { node { ...CollectionFields } }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
    `,
    { first, after, query, sortKey, reverse }
  )

  return {
    collections: result.collections.edges.map((edge) => edge.node),
    pageInfo: result.collections.pageInfo,
  }
}

export async function getCollectionByHandle(
  client: StorefrontClient,
  handle: string
): Promise<ShopifyCollection | null> {
  const result = await client.query<CollectionByHandleResponse>(
    `
    ${COLLECTION_FRAGMENT}
    query CollectionByHandle($handle: String!) {
      collection(handle: $handle) { ...CollectionFields }
    }
    `,
    { handle }
  )

  return result.collection
}

export async function getCollectionProducts(
  client: StorefrontClient,
  handle: string,
  params: CollectionProductsParams = {}
): Promise<{
  products: ShopifyProduct[]
  pageInfo: ShopifyPageInfo
  filters: ShopifyProductFilter[]
} | null> {
  const { first = 20, after, filters, sortKey, reverse } = params

  const shopifyFilters = filters?.map((f) => {
    if (f.variantOption) {
      return { variantOption: f.variantOption }
    }
    if (f.price) {
      return { price: f.price }
    }
    if (f.available !== undefined) {
      return { available: f.available }
    }
    if (f.productType) {
      return { productType: f.productType }
    }
    if (f.tag) {
      return { tag: f.tag }
    }
    return {}
  })

  const result = await client.query<CollectionProductsResponse>(
    `
    ${COLLECTION_PRODUCT_FRAGMENT}
    query CollectionProducts(
      $handle: String!,
      $first: Int!,
      $after: String,
      $filters: [ProductFilter!],
      $sortKey: ProductCollectionSortKeys,
      $reverse: Boolean
    ) {
      collection(handle: $handle) {
        products(first: $first, after: $after, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
          edges { node { ...CollectionProductFields } }
          pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
          filters {
            id
            label
            type
            values {
              id
              label
              count
              input
            }
          }
        }
      }
    }
    `,
    { handle, first, after, filters: shopifyFilters, sortKey, reverse }
  )

  if (!result.collection) return null

  return {
    products: result.collection.products.edges.map((edge) => edge.node),
    pageInfo: result.collection.products.pageInfo,
    filters: result.collection.products.filters,
  }
}
