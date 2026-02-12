/**
 * Customer Orders API
 *
 * GraphQL queries for customer order data.
 */

import { customerQuery } from './client'
import type { CustomerOrder, PageInfo } from '../types'

interface OrdersResponse {
  customer: {
    orders: {
      nodes: Array<{
        id: string
        name: string
        processedAt: string
        fulfillmentStatus: string
        financialStatus: string
        totalPrice: { amount: string; currencyCode: string }
        lineItems: {
          nodes: Array<{
            title: string
            quantity: number
            image: { url: string; altText: string | null } | null
            variant: {
              title: string
              price: { amount: string; currencyCode: string }
            } | null
          }>
        }
        shippingAddress: {
          firstName: string | null
          lastName: string | null
          address1: string
          address2: string | null
          city: string
          province: string | null
          provinceCode: string | null
          country: string
          countryCode: string
          zip: string
          phone: string | null
        } | null
        fulfillments: {
          nodes: Array<{
            trackingInfo: Array<{
              company: string | null
              number: string | null
              url: string | null
            }>
            status: string
            deliveredAt: string | null
            estimatedDeliveryAt: string | null
          }>
        }
      }>
      pageInfo: {
        hasNextPage: boolean
        hasPreviousPage: boolean
        startCursor: string | null
        endCursor: string | null
      }
    }
  }
}

interface OrderDetailResponse {
  customer: {
    orders: {
      nodes: Array<OrdersResponse['customer']['orders']['nodes'][0]>
    }
  }
}

const GET_ORDERS_QUERY = `
  query GetOrders($first: Int!, $after: String) {
    customer {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          fulfillmentStatus
          financialStatus
          totalPrice { amount currencyCode }
          lineItems(first: 10) {
            nodes {
              title
              quantity
              image { url altText }
              variant {
                title
                price { amount currencyCode }
              }
            }
          }
          shippingAddress {
            firstName lastName address1 address2
            city province provinceCode country countryCode zip phone
          }
          fulfillments(first: 5) {
            nodes {
              trackingInfo { company number url }
              status
              deliveredAt
              estimatedDeliveryAt
            }
          }
        }
        pageInfo {
          hasNextPage hasPreviousPage startCursor endCursor
        }
      }
    }
  }
`

const GET_ORDER_QUERY = `
  query GetOrder($orderId: ID!) {
    customer {
      orders(first: 1, query: $orderId) {
        nodes {
          id
          name
          processedAt
          fulfillmentStatus
          financialStatus
          totalPrice { amount currencyCode }
          lineItems(first: 50) {
            nodes {
              title
              quantity
              image { url altText }
              variant {
                title
                price { amount currencyCode }
              }
            }
          }
          shippingAddress {
            firstName lastName address1 address2
            city province provinceCode country countryCode zip phone
          }
          fulfillments(first: 10) {
            nodes {
              trackingInfo { company number url }
              status
              deliveredAt
              estimatedDeliveryAt
            }
          }
        }
      }
    }
  }
`

/**
 * Get customer orders with pagination
 */
export async function getOrders(
  tenantId: string,
  accessToken: string,
  options: { first?: number; after?: string } = {}
): Promise<{ orders: CustomerOrder[]; pageInfo: PageInfo }> {
  const { first = 10, after } = options

  const result = await customerQuery<OrdersResponse>(tenantId, accessToken, {
    query: GET_ORDERS_QUERY,
    variables: { first, after },
  })

  if (result.errors?.length || !result.data?.customer) {
    console.error('Failed to get orders:', result.errors)
    return {
      orders: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    }
  }

  const { nodes, pageInfo } = result.data.customer.orders

  const orders: CustomerOrder[] = nodes.map((order) => ({
    id: order.id,
    name: order.name,
    orderNumber: order.name.replace('#', ''),
    processedAt: order.processedAt,
    fulfillmentStatus: mapFulfillmentStatus(order.fulfillmentStatus),
    financialStatus: mapFinancialStatus(order.financialStatus),
    currentTotalPrice: order.totalPrice,
    lineItems: order.lineItems.nodes.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      image: item.image,
      variant: item.variant
        ? {
            title: item.variant.title,
            price: item.variant.price,
          }
        : null,
    })),
    shippingAddress: order.shippingAddress
      ? {
          id: '',
          firstName: order.shippingAddress.firstName,
          lastName: order.shippingAddress.lastName,
          company: null,
          address1: order.shippingAddress.address1,
          address2: order.shippingAddress.address2,
          city: order.shippingAddress.city,
          province: order.shippingAddress.province,
          provinceCode: order.shippingAddress.provinceCode,
          country: order.shippingAddress.country,
          countryCode: order.shippingAddress.countryCode,
          zip: order.shippingAddress.zip,
          phone: order.shippingAddress.phone,
          isDefault: false,
        }
      : null,
    fulfillments: order.fulfillments.nodes.map((f) => ({
      trackingCompany: f.trackingInfo[0]?.company || null,
      trackingNumber: f.trackingInfo[0]?.number || null,
      trackingUrl: f.trackingInfo[0]?.url || null,
      status: f.status,
      deliveredAt: f.deliveredAt,
      estimatedDeliveryAt: f.estimatedDeliveryAt,
    })),
  }))

  return { orders, pageInfo }
}

/**
 * Get a single order by ID
 */
export async function getOrder(
  tenantId: string,
  accessToken: string,
  orderId: string
): Promise<CustomerOrder | null> {
  const result = await customerQuery<OrderDetailResponse>(tenantId, accessToken, {
    query: GET_ORDER_QUERY,
    variables: { orderId },
  })

  if (result.errors?.length || !result.data?.customer) {
    console.error('Failed to get order:', result.errors)
    return null
  }

  const order = result.data.customer.orders.nodes[0]
  if (!order) {
    return null
  }

  return {
    id: order.id,
    name: order.name,
    orderNumber: order.name.replace('#', ''),
    processedAt: order.processedAt,
    fulfillmentStatus: mapFulfillmentStatus(order.fulfillmentStatus),
    financialStatus: mapFinancialStatus(order.financialStatus),
    currentTotalPrice: order.totalPrice,
    lineItems: order.lineItems.nodes.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      image: item.image,
      variant: item.variant
        ? {
            title: item.variant.title,
            price: item.variant.price,
          }
        : null,
    })),
    shippingAddress: order.shippingAddress
      ? {
          id: '',
          firstName: order.shippingAddress.firstName,
          lastName: order.shippingAddress.lastName,
          company: null,
          address1: order.shippingAddress.address1,
          address2: order.shippingAddress.address2,
          city: order.shippingAddress.city,
          province: order.shippingAddress.province,
          provinceCode: order.shippingAddress.provinceCode,
          country: order.shippingAddress.country,
          countryCode: order.shippingAddress.countryCode,
          zip: order.shippingAddress.zip,
          phone: order.shippingAddress.phone,
          isDefault: false,
        }
      : null,
    fulfillments: order.fulfillments.nodes.map((f) => ({
      trackingCompany: f.trackingInfo[0]?.company || null,
      trackingNumber: f.trackingInfo[0]?.number || null,
      trackingUrl: f.trackingInfo[0]?.url || null,
      status: f.status,
      deliveredAt: f.deliveredAt,
      estimatedDeliveryAt: f.estimatedDeliveryAt,
    })),
  }
}

function mapFulfillmentStatus(status: string): CustomerOrder['fulfillmentStatus'] {
  const mapping: Record<string, CustomerOrder['fulfillmentStatus']> = {
    UNFULFILLED: 'UNFULFILLED',
    PARTIALLY_FULFILLED: 'PARTIALLY_FULFILLED',
    FULFILLED: 'FULFILLED',
    RESTOCKED: 'RESTOCKED',
    PENDING_FULFILLMENT: 'PENDING_FULFILLMENT',
    OPEN: 'OPEN',
    IN_PROGRESS: 'IN_PROGRESS',
    ON_HOLD: 'ON_HOLD',
    SCHEDULED: 'SCHEDULED',
  }
  return mapping[status] || 'UNFULFILLED'
}

function mapFinancialStatus(status: string): CustomerOrder['financialStatus'] {
  const mapping: Record<string, CustomerOrder['financialStatus']> = {
    PENDING: 'PENDING',
    AUTHORIZED: 'AUTHORIZED',
    PARTIALLY_PAID: 'PARTIALLY_PAID',
    PAID: 'PAID',
    PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
    REFUNDED: 'REFUNDED',
    VOIDED: 'VOIDED',
  }
  return mapping[status] || 'PENDING'
}
