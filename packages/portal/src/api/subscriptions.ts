/**
 * Customer Subscriptions API
 *
 * GraphQL queries for customer subscription data.
 * Uses a provider abstraction pattern to support multiple subscription providers.
 */

import { customerQuery, customerMutation } from './client'
import type { CustomerSubscription, PageInfo, UserError } from '../types'

interface SubscriptionsResponse {
  customer: {
    subscriptionContracts: {
      nodes: Array<{
        id: string
        status: string
        nextBillingDate: string | null
        lastPaymentStatus: string | null
        createdAt: string
        billingPolicy: {
          intervalCount: number
          interval: string
        }
        deliveryPolicy: {
          intervalCount: number
          interval: string
        }
        lines: {
          nodes: Array<{
            id: string
            title: string
            quantity: number
            currentPrice: { amount: string; currencyCode: string }
            variantTitle: string | null
            variantImage: { url: string; altText: string | null } | null
            productId: string
            variantId: string
          }>
        }
        deliveryMethod: {
          address: {
            firstName: string | null
            lastName: string | null
            company: string | null
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
        } | null
        customerPaymentMethod: {
          id: string
          instrument: {
            brand: string
            lastDigits: string
            expiryMonth: number
            expiryYear: number
          } | null
        } | null
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

interface SubscriptionActionResponse {
  subscriptionContractUpdate?: {
    contract: { id: string; status: string } | null
    userErrors: UserError[]
  }
  subscriptionContractPause?: {
    contract: { id: string; status: string } | null
    userErrors: UserError[]
  }
  subscriptionContractActivate?: {
    contract: { id: string; status: string } | null
    userErrors: UserError[]
  }
  subscriptionBillingCycleSkip?: {
    billingCycleSkip: { skippedAt: string } | null
    userErrors: UserError[]
  }
}

const GET_SUBSCRIPTIONS_QUERY = `
  query GetSubscriptions($first: Int!, $after: String) {
    customer {
      subscriptionContracts(first: $first, after: $after) {
        nodes {
          id
          status
          nextBillingDate
          lastPaymentStatus
          createdAt
          billingPolicy {
            intervalCount
            interval
          }
          deliveryPolicy {
            intervalCount
            interval
          }
          lines(first: 10) {
            nodes {
              id
              title
              quantity
              currentPrice { amount currencyCode }
              variantTitle
              variantImage { url altText }
              productId
              variantId
            }
          }
          deliveryMethod {
            ... on SubscriptionDeliveryMethodShipping {
              address {
                firstName lastName company address1 address2
                city province provinceCode country countryCode zip phone
              }
            }
          }
          customerPaymentMethod {
            id
            instrument {
              ... on CustomerCreditCard {
                brand lastDigits expiryMonth expiryYear
              }
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

const GET_SUBSCRIPTION_QUERY = `
  query GetSubscription($id: ID!) {
    customer {
      subscriptionContract(id: $id) {
        id
        status
        nextBillingDate
        lastPaymentStatus
        createdAt
        billingPolicy {
          intervalCount
          interval
        }
        deliveryPolicy {
          intervalCount
          interval
        }
        lines(first: 50) {
          nodes {
            id
            title
            quantity
            currentPrice { amount currencyCode }
            variantTitle
            variantImage { url altText }
            productId
            variantId
          }
        }
        deliveryMethod {
          ... on SubscriptionDeliveryMethodShipping {
            address {
              firstName lastName company address1 address2
              city province provinceCode country countryCode zip phone
            }
          }
        }
        customerPaymentMethod {
          id
          instrument {
            ... on CustomerCreditCard {
              brand lastDigits expiryMonth expiryYear
            }
          }
        }
      }
    }
  }
`

const PAUSE_SUBSCRIPTION_MUTATION = `
  mutation PauseSubscription($id: ID!) {
    subscriptionContractPause(subscriptionContractId: $id) {
      contract { id status }
      userErrors { field message }
    }
  }
`

const RESUME_SUBSCRIPTION_MUTATION = `
  mutation ResumeSubscription($id: ID!) {
    subscriptionContractActivate(subscriptionContractId: $id) {
      contract { id status }
      userErrors { field message }
    }
  }
`

const SKIP_DELIVERY_MUTATION = `
  mutation SkipDelivery($contractId: ID!, $billingCycleIndex: Int!) {
    subscriptionBillingCycleSkip(
      subscriptionContractId: $contractId
      billingCycleIndex: $billingCycleIndex
    ) {
      billingCycleSkip { skippedAt }
      userErrors { field message }
    }
  }
`

const CANCEL_SUBSCRIPTION_MUTATION = `
  mutation CancelSubscription($id: ID!) {
    subscriptionContractUpdate(
      subscriptionContractId: $id
      input: { status: CANCELLED }
    ) {
      contract { id status }
      userErrors { field message }
    }
  }
`

/**
 * Get customer subscriptions with pagination
 */
export async function getSubscriptions(
  tenantId: string,
  accessToken: string,
  options: { first?: number; after?: string } = {}
): Promise<{ subscriptions: CustomerSubscription[]; pageInfo: PageInfo }> {
  const { first = 10, after } = options

  const result = await customerQuery<SubscriptionsResponse>(tenantId, accessToken, {
    query: GET_SUBSCRIPTIONS_QUERY,
    variables: { first, after },
  })

  if (result.errors?.length || !result.data?.customer) {
    console.error('Failed to get subscriptions:', result.errors)
    return {
      subscriptions: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    }
  }

  const { nodes, pageInfo } = result.data.customer.subscriptionContracts

  const subscriptions: CustomerSubscription[] = nodes.map(mapSubscription)

  return { subscriptions, pageInfo }
}

/**
 * Get a single subscription by ID
 */
export async function getSubscription(
  tenantId: string,
  accessToken: string,
  subscriptionId: string
): Promise<CustomerSubscription | null> {
  const result = await customerQuery<{
    customer: {
      subscriptionContract: SubscriptionsResponse['customer']['subscriptionContracts']['nodes'][0] | null
    }
  }>(tenantId, accessToken, {
    query: GET_SUBSCRIPTION_QUERY,
    variables: { id: subscriptionId },
  })

  if (result.errors?.length || !result.data?.customer?.subscriptionContract) {
    console.error('Failed to get subscription:', result.errors)
    return null
  }

  return mapSubscription(result.data.customer.subscriptionContract)
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(
  tenantId: string,
  accessToken: string,
  subscriptionId: string
): Promise<{ success: boolean; errors: UserError[] }> {
  const result = await customerMutation<SubscriptionActionResponse>(
    tenantId,
    accessToken,
    {
      query: PAUSE_SUBSCRIPTION_MUTATION,
      variables: { id: subscriptionId },
    }
  )

  if (result.errors?.length) {
    return {
      success: false,
      errors: result.errors.map((e) => ({ field: null, message: e.message })),
    }
  }

  const data = result.data?.subscriptionContractPause
  if (!data || data.userErrors.length > 0) {
    return { success: false, errors: data?.userErrors || [] }
  }

  return { success: true, errors: [] }
}

/**
 * Resume a paused subscription
 */
export async function resumeSubscription(
  tenantId: string,
  accessToken: string,
  subscriptionId: string
): Promise<{ success: boolean; errors: UserError[] }> {
  const result = await customerMutation<SubscriptionActionResponse>(
    tenantId,
    accessToken,
    {
      query: RESUME_SUBSCRIPTION_MUTATION,
      variables: { id: subscriptionId },
    }
  )

  if (result.errors?.length) {
    return {
      success: false,
      errors: result.errors.map((e) => ({ field: null, message: e.message })),
    }
  }

  const data = result.data?.subscriptionContractActivate
  if (!data || data.userErrors.length > 0) {
    return { success: false, errors: data?.userErrors || [] }
  }

  return { success: true, errors: [] }
}

/**
 * Skip next delivery
 */
export async function skipNextDelivery(
  tenantId: string,
  accessToken: string,
  subscriptionId: string,
  billingCycleIndex: number = 0
): Promise<{ success: boolean; errors: UserError[] }> {
  const result = await customerMutation<SubscriptionActionResponse>(
    tenantId,
    accessToken,
    {
      query: SKIP_DELIVERY_MUTATION,
      variables: { contractId: subscriptionId, billingCycleIndex },
    }
  )

  if (result.errors?.length) {
    return {
      success: false,
      errors: result.errors.map((e) => ({ field: null, message: e.message })),
    }
  }

  const data = result.data?.subscriptionBillingCycleSkip
  if (!data || data.userErrors.length > 0) {
    return { success: false, errors: data?.userErrors || [] }
  }

  return { success: true, errors: [] }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  tenantId: string,
  accessToken: string,
  subscriptionId: string,
  _reason?: string
): Promise<{ success: boolean; errors: UserError[] }> {
  const result = await customerMutation<SubscriptionActionResponse>(
    tenantId,
    accessToken,
    {
      query: CANCEL_SUBSCRIPTION_MUTATION,
      variables: { id: subscriptionId },
    }
  )

  if (result.errors?.length) {
    return {
      success: false,
      errors: result.errors.map((e) => ({ field: null, message: e.message })),
    }
  }

  const data = result.data?.subscriptionContractUpdate
  if (!data || data.userErrors.length > 0) {
    return { success: false, errors: data?.userErrors || [] }
  }

  return { success: true, errors: [] }
}

/**
 * Map GraphQL response to CustomerSubscription type
 */
function mapSubscription(
  node: SubscriptionsResponse['customer']['subscriptionContracts']['nodes'][0]
): CustomerSubscription {
  return {
    id: node.id,
    status: mapSubscriptionStatus(node.status),
    nextBillingDate: node.nextBillingDate,
    lastBillingDate: null, // Not available in this query
    createdAt: node.createdAt,
    billingPolicy: {
      intervalCount: node.billingPolicy.intervalCount,
      interval: node.billingPolicy.interval as 'DAY' | 'WEEK' | 'MONTH' | 'YEAR',
    },
    deliveryPolicy: {
      intervalCount: node.deliveryPolicy.intervalCount,
      interval: node.deliveryPolicy.interval as 'DAY' | 'WEEK' | 'MONTH' | 'YEAR',
    },
    lines: node.lines.nodes.map((line) => ({
      id: line.id,
      title: line.title,
      quantity: line.quantity,
      currentPrice: line.currentPrice,
      variantTitle: line.variantTitle,
      variantImage: line.variantImage,
      productId: line.productId,
      variantId: line.variantId,
    })),
    deliveryAddress: node.deliveryMethod?.address
      ? {
          id: '',
          firstName: node.deliveryMethod.address.firstName,
          lastName: node.deliveryMethod.address.lastName,
          company: node.deliveryMethod.address.company,
          address1: node.deliveryMethod.address.address1,
          address2: node.deliveryMethod.address.address2,
          city: node.deliveryMethod.address.city,
          province: node.deliveryMethod.address.province,
          provinceCode: node.deliveryMethod.address.provinceCode,
          country: node.deliveryMethod.address.country,
          countryCode: node.deliveryMethod.address.countryCode,
          zip: node.deliveryMethod.address.zip,
          phone: node.deliveryMethod.address.phone,
          isDefault: false,
        }
      : null,
    paymentMethod: node.customerPaymentMethod?.instrument
      ? {
          id: node.customerPaymentMethod.id,
          brand: node.customerPaymentMethod.instrument.brand,
          lastDigits: node.customerPaymentMethod.instrument.lastDigits,
          expiryMonth: node.customerPaymentMethod.instrument.expiryMonth,
          expiryYear: node.customerPaymentMethod.instrument.expiryYear,
        }
      : null,
  }
}

function mapSubscriptionStatus(status: string): CustomerSubscription['status'] {
  const mapping: Record<string, CustomerSubscription['status']> = {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED',
    FAILED: 'FAILED',
  }
  return mapping[status] || 'ACTIVE'
}
