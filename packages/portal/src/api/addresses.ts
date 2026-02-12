/**
 * Customer Addresses API
 *
 * GraphQL queries and mutations for customer address data.
 */

import { customerQuery, customerMutation } from './client'
import type { CustomerAddress, AddressInput, UserError } from '../types'

interface AddressesResponse {
  customer: {
    addresses: {
      nodes: Array<{
        id: string
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
      }>
    }
    defaultAddress: {
      id: string
    } | null
  }
}

interface AddressMutationResponse {
  customerAddressCreate?: {
    customerAddress: AddressesResponse['customer']['addresses']['nodes'][0] | null
    userErrors: UserError[]
  }
  customerAddressUpdate?: {
    customerAddress: AddressesResponse['customer']['addresses']['nodes'][0] | null
    userErrors: UserError[]
  }
  customerAddressDelete?: {
    deletedAddressId: string | null
    userErrors: UserError[]
  }
  customerDefaultAddressUpdate?: {
    customer: { defaultAddress: { id: string } | null } | null
    userErrors: UserError[]
  }
}

const GET_ADDRESSES_QUERY = `
  query GetAddresses {
    customer {
      addresses(first: 20) {
        nodes {
          id
          firstName lastName company
          address1 address2 city
          province provinceCode
          country countryCode zip phone
        }
      }
      defaultAddress {
        id
      }
    }
  }
`

const CREATE_ADDRESS_MUTATION = `
  mutation CreateAddress($address: CustomerAddressInput!) {
    customerAddressCreate(address: $address) {
      customerAddress {
        id
        firstName lastName company
        address1 address2 city
        province provinceCode
        country countryCode zip phone
      }
      userErrors { field message }
    }
  }
`

const UPDATE_ADDRESS_MUTATION = `
  mutation UpdateAddress($addressId: ID!, $address: CustomerAddressInput!) {
    customerAddressUpdate(addressId: $addressId, address: $address) {
      customerAddress {
        id
        firstName lastName company
        address1 address2 city
        province provinceCode
        country countryCode zip phone
      }
      userErrors { field message }
    }
  }
`

const DELETE_ADDRESS_MUTATION = `
  mutation DeleteAddress($addressId: ID!) {
    customerAddressDelete(addressId: $addressId) {
      deletedAddressId
      userErrors { field message }
    }
  }
`

const SET_DEFAULT_ADDRESS_MUTATION = `
  mutation SetDefaultAddress($addressId: ID!) {
    customerDefaultAddressUpdate(addressId: $addressId) {
      customer {
        defaultAddress { id }
      }
      userErrors { field message }
    }
  }
`

/**
 * Get all customer addresses
 */
export async function getAddresses(
  tenantId: string,
  accessToken: string
): Promise<CustomerAddress[]> {
  const result = await customerQuery<AddressesResponse>(tenantId, accessToken, {
    query: GET_ADDRESSES_QUERY,
  })

  if (result.errors?.length || !result.data?.customer) {
    console.error('Failed to get addresses:', result.errors)
    return []
  }

  const { addresses, defaultAddress } = result.data.customer
  const defaultId = defaultAddress?.id

  return addresses.nodes.map((addr) => ({
    id: addr.id,
    firstName: addr.firstName,
    lastName: addr.lastName,
    company: addr.company,
    address1: addr.address1,
    address2: addr.address2,
    city: addr.city,
    province: addr.province,
    provinceCode: addr.provinceCode,
    country: addr.country,
    countryCode: addr.countryCode,
    zip: addr.zip,
    phone: addr.phone,
    isDefault: addr.id === defaultId,
  }))
}

/**
 * Create a new address
 */
export async function createAddress(
  tenantId: string,
  accessToken: string,
  input: AddressInput
): Promise<{ address: CustomerAddress | null; errors: UserError[] }> {
  const result = await customerMutation<AddressMutationResponse>(tenantId, accessToken, {
    query: CREATE_ADDRESS_MUTATION,
    variables: { address: input },
  })

  if (result.errors?.length) {
    return {
      address: null,
      errors: result.errors.map((e) => ({ field: null, message: e.message })),
    }
  }

  const data = result.data?.customerAddressCreate
  if (!data || data.userErrors.length > 0) {
    return { address: null, errors: data?.userErrors || [] }
  }

  if (!data.customerAddress) {
    return { address: null, errors: [{ field: null, message: 'Address not created' }] }
  }

  const addr = data.customerAddress
  return {
    address: {
      id: addr.id,
      firstName: addr.firstName,
      lastName: addr.lastName,
      company: addr.company,
      address1: addr.address1,
      address2: addr.address2,
      city: addr.city,
      province: addr.province,
      provinceCode: addr.provinceCode,
      country: addr.country,
      countryCode: addr.countryCode,
      zip: addr.zip,
      phone: addr.phone,
      isDefault: false,
    },
    errors: [],
  }
}

/**
 * Update an existing address
 */
export async function updateAddress(
  tenantId: string,
  accessToken: string,
  addressId: string,
  input: AddressInput
): Promise<{ address: CustomerAddress | null; errors: UserError[] }> {
  const result = await customerMutation<AddressMutationResponse>(tenantId, accessToken, {
    query: UPDATE_ADDRESS_MUTATION,
    variables: { addressId, address: input },
  })

  if (result.errors?.length) {
    return {
      address: null,
      errors: result.errors.map((e) => ({ field: null, message: e.message })),
    }
  }

  const data = result.data?.customerAddressUpdate
  if (!data || data.userErrors.length > 0) {
    return { address: null, errors: data?.userErrors || [] }
  }

  if (!data.customerAddress) {
    return { address: null, errors: [{ field: null, message: 'Address not updated' }] }
  }

  const addr = data.customerAddress
  return {
    address: {
      id: addr.id,
      firstName: addr.firstName,
      lastName: addr.lastName,
      company: addr.company,
      address1: addr.address1,
      address2: addr.address2,
      city: addr.city,
      province: addr.province,
      provinceCode: addr.provinceCode,
      country: addr.country,
      countryCode: addr.countryCode,
      zip: addr.zip,
      phone: addr.phone,
      isDefault: false,
    },
    errors: [],
  }
}

/**
 * Delete an address
 */
export async function deleteAddress(
  tenantId: string,
  accessToken: string,
  addressId: string
): Promise<{ success: boolean; errors: UserError[] }> {
  const result = await customerMutation<AddressMutationResponse>(tenantId, accessToken, {
    query: DELETE_ADDRESS_MUTATION,
    variables: { addressId },
  })

  if (result.errors?.length) {
    return {
      success: false,
      errors: result.errors.map((e) => ({ field: null, message: e.message })),
    }
  }

  const data = result.data?.customerAddressDelete
  if (!data || data.userErrors.length > 0) {
    return { success: false, errors: data?.userErrors || [] }
  }

  return { success: true, errors: [] }
}

/**
 * Set an address as the default
 */
export async function setDefaultAddress(
  tenantId: string,
  accessToken: string,
  addressId: string
): Promise<{ success: boolean; errors: UserError[] }> {
  const result = await customerMutation<AddressMutationResponse>(tenantId, accessToken, {
    query: SET_DEFAULT_ADDRESS_MUTATION,
    variables: { addressId },
  })

  if (result.errors?.length) {
    return {
      success: false,
      errors: result.errors.map((e) => ({ field: null, message: e.message })),
    }
  }

  const data = result.data?.customerDefaultAddressUpdate
  if (!data || data.userErrors.length > 0) {
    return { success: false, errors: data?.userErrors || [] }
  }

  return { success: true, errors: [] }
}
