/**
 * Shopify Product GraphQL queries
 */

import type { AdminClient } from '../admin'
import type { StorefrontClient } from '../storefront'
import type {
  ShopifyProduct,
  ShopifyProductConnection,
  ShopifyPageInfo,
} from '../types'

// ---------------------------------------------------------------------------
// Storefront API - Product Queries (public, no admin token needed)
// ---------------------------------------------------------------------------

const STOREFRONT_PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
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

interface StorefrontProductsResponse {
  products: {
    edges: Array<{ node: ShopifyProduct }>
    pageInfo: ShopifyPageInfo
  }
}

interface StorefrontProductByHandleResponse {
  productByHandle: ShopifyProduct | null
}

interface StorefrontProductByIdResponse {
  product: ShopifyProduct | null
}

export interface ListProductsParams {
  first?: number
  after?: string
  query?: string
  sortKey?: 'TITLE' | 'PRICE' | 'CREATED_AT' | 'UPDATED_AT' | 'BEST_SELLING'
  reverse?: boolean
}

export async function listProducts(
  client: StorefrontClient,
  params: ListProductsParams = {}
): Promise<{ products: ShopifyProduct[]; pageInfo: ShopifyPageInfo }> {
  const { first = 20, after, query, sortKey, reverse } = params

  const result = await client.query<StorefrontProductsResponse>(
    `
    ${STOREFRONT_PRODUCT_FRAGMENT}
    query Products($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
      products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges { node { ...ProductFields } }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
    `,
    { first, after, query, sortKey, reverse }
  )

  return {
    products: result.products.edges.map((edge) => edge.node),
    pageInfo: result.products.pageInfo,
  }
}

export async function getProductByHandle(
  client: StorefrontClient,
  handle: string
): Promise<ShopifyProduct | null> {
  const result = await client.query<StorefrontProductByHandleResponse>(
    `
    ${STOREFRONT_PRODUCT_FRAGMENT}
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) { ...ProductFields }
    }
    `,
    { handle }
  )

  return result.productByHandle
}

export async function getProductById(
  client: StorefrontClient,
  id: string
): Promise<ShopifyProduct | null> {
  const result = await client.query<StorefrontProductByIdResponse>(
    `
    ${STOREFRONT_PRODUCT_FRAGMENT}
    query Product($id: ID!) {
      product(id: $id) { ...ProductFields }
    }
    `,
    { id }
  )

  return result.product
}

// ---------------------------------------------------------------------------
// Admin API - Product Queries (requires admin token)
// ---------------------------------------------------------------------------

const ADMIN_PRODUCT_FRAGMENT = `
  fragment AdminProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    vendor
    productType
    tags
    status
    createdAt
    updatedAt
    totalInventory
    priceRangeV2 {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    variants(first: 100) {
      edges {
        node {
          id
          title
          sku
          price
          compareAtPrice
          inventoryQuantity
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

interface AdminProductsResponse {
  products: ShopifyProductConnection
}

interface AdminProductResponse {
  product: ShopifyProduct | null
}

export async function adminListProducts(
  client: AdminClient,
  params: ListProductsParams = {}
): Promise<{ products: ShopifyProduct[]; pageInfo: ShopifyPageInfo }> {
  const { first = 20, after, query, sortKey, reverse } = params

  const result = await client.query<AdminProductsResponse>(
    `
    ${ADMIN_PRODUCT_FRAGMENT}
    query Products($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
      products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges { node { ...AdminProductFields } }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
    `,
    { first, after, query, sortKey, reverse }
  )

  return {
    products: result.products.edges.map((edge) => edge.node),
    pageInfo: result.products.pageInfo,
  }
}

export async function adminGetProduct(
  client: AdminClient,
  id: string
): Promise<ShopifyProduct | null> {
  const result = await client.query<AdminProductResponse>(
    `
    ${ADMIN_PRODUCT_FRAGMENT}
    query Product($id: ID!) {
      product(id: $id) { ...AdminProductFields }
    }
    `,
    { id }
  )

  return result.product
}
