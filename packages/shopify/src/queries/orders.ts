/**
 * Shopify Order GraphQL queries (Admin API)
 */

import type { AdminClient } from '../admin'
import type { ShopifyOrder, ShopifyPageInfo } from '../types'

const ORDER_FRAGMENT = `
  fragment OrderFields on Order {
    id
    name
    orderNumber: legacyResourceId
    email
    createdAt
    updatedAt
    fulfillmentStatus: displayFulfillmentStatus
    financialStatus: displayFinancialStatus
    totalPrice: totalPriceSet {
      shopMoney { amount currencyCode }
    }
    subtotalPrice: subtotalPriceSet {
      shopMoney { amount currencyCode }
    }
    totalTax: totalTaxSet {
      shopMoney { amount currencyCode }
    }
    totalShippingPrice: totalShippingPriceSet {
      shopMoney { amount currencyCode }
    }
    shippingAddress {
      firstName lastName address1 address2
      city province provinceCode country countryCode zip phone
    }
    billingAddress {
      firstName lastName address1 address2
      city province provinceCode country countryCode zip phone
    }
    lineItems(first: 100) {
      edges {
        node {
          id
          title
          quantity
          originalUnitPriceSet {
            shopMoney { amount currencyCode }
          }
          discountedTotalSet {
            shopMoney { amount currencyCode }
          }
          variant {
            id
            title
            sku
            price
            image { id url altText width height }
            selectedOptions { name value }
          }
        }
      }
    }
  }
`

interface OrdersResponse {
  orders: {
    edges: Array<{ node: ShopifyOrder }>
    pageInfo: ShopifyPageInfo
  }
}

interface OrderResponse {
  order: ShopifyOrder | null
}

export interface ListOrdersParams {
  first?: number
  after?: string
  query?: string
  sortKey?: 'CREATED_AT' | 'UPDATED_AT' | 'TOTAL_PRICE' | 'ORDER_NUMBER'
  reverse?: boolean
}

export async function listOrders(
  client: AdminClient,
  params: ListOrdersParams = {}
): Promise<{ orders: ShopifyOrder[]; pageInfo: ShopifyPageInfo }> {
  const { first = 20, after, query, sortKey = 'CREATED_AT', reverse = true } = params

  const result = await client.query<OrdersResponse>(
    `
    ${ORDER_FRAGMENT}
    query Orders($first: Int!, $after: String, $query: String, $sortKey: OrderSortKeys, $reverse: Boolean) {
      orders(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges { node { ...OrderFields } }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
    `,
    { first, after, query, sortKey, reverse }
  )

  return {
    orders: result.orders.edges.map((edge) => edge.node),
    pageInfo: result.orders.pageInfo,
  }
}

export async function getOrder(
  client: AdminClient,
  id: string
): Promise<ShopifyOrder | null> {
  const result = await client.query<OrderResponse>(
    `
    ${ORDER_FRAGMENT}
    query Order($id: ID!) {
      order(id: $id) { ...OrderFields }
    }
    `,
    { id }
  )

  return result.order
}
