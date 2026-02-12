/**
 * Customer Profile API
 *
 * GraphQL queries for customer profile data.
 */

import { customerQuery, customerMutation } from './client'
import type { CustomerInfo, UserError } from '../types'

interface CustomerResponse {
  customer: {
    id: string
    emailAddress: { emailAddress: string } | null
    firstName: string | null
    lastName: string | null
    phoneNumber: { phoneNumber: string } | null
    acceptsMarketing: boolean
    createdAt: string
  }
}

interface CustomerUpdateResponse {
  customerUpdate: {
    customer: CustomerResponse['customer'] | null
    userErrors: UserError[]
  }
}

const GET_CUSTOMER_QUERY = `
  query GetCustomer {
    customer {
      id
      emailAddress { emailAddress }
      firstName
      lastName
      phoneNumber { phoneNumber }
      acceptsMarketing
      createdAt
    }
  }
`

const UPDATE_CUSTOMER_MUTATION = `
  mutation UpdateCustomer($input: CustomerUpdateInput!) {
    customerUpdate(input: $input) {
      customer {
        id
        emailAddress { emailAddress }
        firstName
        lastName
        phoneNumber { phoneNumber }
        acceptsMarketing
        createdAt
      }
      userErrors {
        field
        message
      }
    }
  }
`

/**
 * Get current customer profile
 */
export async function getCustomer(
  tenantId: string,
  accessToken: string
): Promise<CustomerInfo | null> {
  const result = await customerQuery<CustomerResponse>(tenantId, accessToken, {
    query: GET_CUSTOMER_QUERY,
  })

  if (result.errors?.length || !result.data?.customer) {
    console.error('Failed to get customer:', result.errors)
    return null
  }

  const customer = result.data.customer
  return {
    id: customer.id,
    email: customer.emailAddress?.emailAddress || '',
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phoneNumber?.phoneNumber || null,
    acceptsMarketing: customer.acceptsMarketing,
    createdAt: customer.createdAt,
  }
}

/**
 * Update customer profile
 */
export async function updateCustomer(
  tenantId: string,
  accessToken: string,
  input: {
    firstName?: string
    lastName?: string
    phone?: string
    acceptsMarketing?: boolean
  }
): Promise<{ customer: CustomerInfo | null; errors: UserError[] }> {
  // Build input object with only provided fields
  const customerInput: Record<string, unknown> = {}

  if (input.firstName !== undefined) {
    customerInput.firstName = input.firstName
  }
  if (input.lastName !== undefined) {
    customerInput.lastName = input.lastName
  }
  if (input.phone !== undefined) {
    customerInput.phoneNumber = input.phone
  }
  if (input.acceptsMarketing !== undefined) {
    customerInput.acceptsMarketing = input.acceptsMarketing
  }

  const result = await customerMutation<CustomerUpdateResponse>(tenantId, accessToken, {
    query: UPDATE_CUSTOMER_MUTATION,
    variables: { input: customerInput },
  })

  if (result.errors?.length) {
    console.error('Failed to update customer:', result.errors)
    return {
      customer: null,
      errors: result.errors.map((e) => ({ field: null, message: e.message })),
    }
  }

  const data = result.data?.customerUpdate
  if (!data) {
    return { customer: null, errors: [{ field: null, message: 'No response data' }] }
  }

  if (data.userErrors.length > 0) {
    return { customer: null, errors: data.userErrors }
  }

  if (!data.customer) {
    return { customer: null, errors: [{ field: null, message: 'Customer not returned' }] }
  }

  return {
    customer: {
      id: data.customer.id,
      email: data.customer.emailAddress?.emailAddress || '',
      firstName: data.customer.firstName,
      lastName: data.customer.lastName,
      phone: data.customer.phoneNumber?.phoneNumber || null,
      acceptsMarketing: data.customer.acceptsMarketing,
      createdAt: data.customer.createdAt,
    },
    errors: [],
  }
}
