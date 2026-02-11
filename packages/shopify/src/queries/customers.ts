/**
 * Shopify Customer GraphQL queries (Admin API)
 */

import type { AdminClient } from '../admin'
import type { ShopifyCustomer, ShopifyOrder, ShopifyPageInfo } from '../types'

const CUSTOMER_FRAGMENT = `
  fragment CustomerFields on Customer {
    id
    email
    firstName
    lastName
    phone
    createdAt
    updatedAt
    defaultAddress {
      firstName lastName address1 address2
      city province provinceCode country countryCode zip phone
    }
    addresses(first: 10) {
      edges {
        node {
          firstName lastName address1 address2
          city province provinceCode country countryCode zip phone
        }
      }
    }
  }
`

interface CustomersResponse {
  customers: {
    edges: Array<{ node: ShopifyCustomer }>
    pageInfo: ShopifyPageInfo
  }
}

interface CustomerResponse {
  customer: ShopifyCustomer | null
}

interface CustomerOrdersResponse {
  customer: {
    orders: {
      edges: Array<{ node: ShopifyOrder }>
      pageInfo: ShopifyPageInfo
    }
  } | null
}

export interface ListCustomersParams {
  first?: number
  after?: string
  query?: string
  sortKey?: 'CREATED_AT' | 'UPDATED_AT' | 'NAME'
  reverse?: boolean
}

export async function listCustomers(
  client: AdminClient,
  params: ListCustomersParams = {}
): Promise<{ customers: ShopifyCustomer[]; pageInfo: ShopifyPageInfo }> {
  const { first = 20, after, query, sortKey = 'CREATED_AT', reverse = true } = params

  const result = await client.query<CustomersResponse>(
    `
    ${CUSTOMER_FRAGMENT}
    query Customers($first: Int!, $after: String, $query: String, $sortKey: CustomerSortKeys, $reverse: Boolean) {
      customers(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges { node { ...CustomerFields } }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
    `,
    { first, after, query, sortKey, reverse }
  )

  return {
    customers: result.customers.edges.map((edge) => edge.node),
    pageInfo: result.customers.pageInfo,
  }
}

export async function getCustomer(
  client: AdminClient,
  id: string
): Promise<ShopifyCustomer | null> {
  const result = await client.query<CustomerResponse>(
    `
    ${CUSTOMER_FRAGMENT}
    query Customer($id: ID!) {
      customer(id: $id) { ...CustomerFields }
    }
    `,
    { id }
  )

  return result.customer
}

export async function getCustomerOrders(
  client: AdminClient,
  customerId: string,
  params: { first?: number; after?: string } = {}
): Promise<{ orders: ShopifyOrder[]; pageInfo: ShopifyPageInfo }> {
  const { first = 20, after } = params

  const result = await client.query<CustomerOrdersResponse>(
    `
    query CustomerOrders($id: ID!, $first: Int!, $after: String) {
      customer(id: $id) {
        orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              createdAt
              updatedAt
              displayFulfillmentStatus
              displayFinancialStatus
              totalPriceSet {
                shopMoney { amount currencyCode }
              }
              lineItems(first: 10) {
                edges {
                  node { id title quantity }
                }
              }
            }
          }
          pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        }
      }
    }
    `,
    { id: customerId, first, after }
  )

  if (!result.customer) {
    return { orders: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } }
  }

  return {
    orders: result.customer.orders.edges.map((edge) => edge.node),
    pageInfo: result.customer.orders.pageInfo,
  }
}
