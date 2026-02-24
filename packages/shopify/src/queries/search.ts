/**
 * Shopify Search GraphQL queries
 */

import type { StorefrontClient } from '../storefront'
import type { ShopifyProduct, ShopifyCollection, ShopifyPageInfo } from '../types'

// ---------------------------------------------------------------------------
// Response Types
// ---------------------------------------------------------------------------

interface PredictiveSearchResponse {
  predictiveSearch: {
    products: ShopifyProduct[]
    collections: ShopifyCollection[]
    queries: Array<{
      text: string
      styledText: string
    }>
  }
}

interface SearchResponse {
  search: {
    edges: Array<{
      node: ShopifyProduct
    }>
    pageInfo: ShopifyPageInfo
    totalCount: number
    productFilters: ShopifySearchFilter[]
  }
}

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

export interface PredictiveSearchParams {
  query: string
  types?: Array<'PRODUCT' | 'COLLECTION' | 'QUERY'>
  limit?: number
}

export interface SearchParams {
  query: string
  first?: number
  after?: string
  sortKey?: 'RELEVANCE' | 'PRICE'
  reverse?: boolean
  productFilters?: SearchFilter[]
}

export interface SearchFilter {
  variantOption?: { name: string; value: string }
  price?: { min?: number; max?: number }
  available?: boolean
  productType?: string
}

export interface ShopifySearchFilter {
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

export async function predictiveSearch(
  client: StorefrontClient,
  params: PredictiveSearchParams
): Promise<{
  products: ShopifyProduct[]
  collections: ShopifyCollection[]
  queries: Array<{ text: string; styledText: string }>
}> {
  const { query, types = ['PRODUCT', 'COLLECTION', 'QUERY'], limit = 4 } = params

  const result = await client.query<PredictiveSearchResponse>(
    `
    query PredictiveSearch($query: String!, $types: [PredictiveSearchType!], $limit: Int!) {
      predictiveSearch(query: $query, types: $types, limit: $limit) {
        products {
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
          variants(first: 1) {
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
          images(first: 1) {
            edges {
              node { id url altText width height }
            }
          }
        }
        collections {
          id
          title
          handle
          description
          descriptionHtml
          image { id url altText width height }
        }
        queries {
          text
          styledText
        }
      }
    }
    `,
    { query, types, limit }
  )

  return result.predictiveSearch
}

export async function searchProducts(
  client: StorefrontClient,
  params: SearchParams
): Promise<{
  products: ShopifyProduct[]
  pageInfo: ShopifyPageInfo
  totalCount: number
  filters: ShopifySearchFilter[]
}> {
  const { query, first = 20, after, sortKey, reverse, productFilters } = params

  const result = await client.query<SearchResponse>(
    `
    query Search(
      $query: String!,
      $first: Int!,
      $after: String,
      $sortKey: SearchSortKeys,
      $reverse: Boolean,
      $productFilters: [ProductFilter!]
    ) {
      search(
        query: $query,
        types: PRODUCT,
        first: $first,
        after: $after,
        sortKey: $sortKey,
        reverse: $reverse,
        productFilters: $productFilters
      ) {
        edges {
          node {
            ... on Product {
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
          }
        }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        totalCount
        productFilters {
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
    `,
    { query, first, after, sortKey, reverse, productFilters }
  )

  return {
    products: result.search.edges.map((edge) => edge.node),
    pageInfo: result.search.pageInfo,
    totalCount: result.search.totalCount,
    filters: result.search.productFilters,
  }
}
