/**
 * Shopify Cart queries (Storefront API)
 */

import type { StorefrontClient } from '../storefront'

export interface ShopifyCartDiscountCode {
  code: string
  applicable: boolean
}

export interface ShopifyCartDiscountAllocation {
  discountedAmount: { amount: string; currencyCode: string }
}

export interface ShopifyCart {
  id: string
  checkoutUrl: string
  totalQuantity: number
  createdAt: string
  updatedAt: string
  attributes: Array<{ key: string; value: string }>
  discountCodes: ShopifyCartDiscountCode[]
  discountAllocations: ShopifyCartDiscountAllocation[]
  cost: {
    subtotalAmount: { amount: string; currencyCode: string }
    totalAmount: { amount: string; currencyCode: string }
    totalTaxAmount: { amount: string; currencyCode: string } | null
    totalDutyAmount: { amount: string; currencyCode: string } | null
  }
  lines: {
    edges: Array<{
      node: {
        id: string
        quantity: number
        merchandise: {
          id: string
          title: string
          product: { id: string; title: string; handle: string }
          price: { amount: string; currencyCode: string }
          image: { url: string; altText: string | null } | null
          selectedOptions: Array<{ name: string; value: string }>
        }
        cost: {
          amountPerQuantity: { amount: string; currencyCode: string }
          totalAmount: { amount: string; currencyCode: string }
          compareAtAmountPerQuantity: { amount: string; currencyCode: string } | null
        }
        discountAllocations: ShopifyCartDiscountAllocation[]
      }
    }>
  }
}

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    createdAt
    updatedAt
    attributes {
      key
      value
    }
    discountCodes {
      code
      applicable
    }
    discountAllocations {
      discountedAmount {
        amount
        currencyCode
      }
    }
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
      totalTaxAmount { amount currencyCode }
      totalDutyAmount { amount currencyCode }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              product { id title handle }
              price { amount currencyCode }
              image { url altText }
              selectedOptions { name value }
            }
          }
          cost {
            amountPerQuantity { amount currencyCode }
            totalAmount { amount currencyCode }
            compareAtAmountPerQuantity { amount currencyCode }
          }
          discountAllocations {
            discountedAmount {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`

interface CartResponse {
  cartCreate?: { cart: ShopifyCart }
  cart?: ShopifyCart
  cartLinesAdd?: { cart: ShopifyCart }
  cartLinesUpdate?: { cart: ShopifyCart }
  cartLinesRemove?: { cart: ShopifyCart }
  cartAttributesUpdate?: { cart: ShopifyCart; userErrors: Array<{ field: string[]; message: string }> }
  cartDiscountCodesUpdate?: { cart: ShopifyCart; userErrors: Array<{ field: string[]; message: string }> }
}

export async function createCart(client: StorefrontClient): Promise<ShopifyCart> {
  const result = await client.query<CartResponse>(
    `
    ${CART_FRAGMENT}
    mutation CartCreate {
      cartCreate { cart { ...CartFields } }
    }
    `
  )

  return result.cartCreate!.cart
}

export async function getCart(client: StorefrontClient, cartId: string): Promise<ShopifyCart | null> {
  const result = await client.query<CartResponse>(
    `
    ${CART_FRAGMENT}
    query Cart($cartId: ID!) {
      cart(id: $cartId) { ...CartFields }
    }
    `,
    { cartId }
  )

  return result.cart ?? null
}

export interface CartLineInput {
  merchandiseId: string
  quantity: number
  attributes?: Array<{ key: string; value: string }>
}

export async function addCartLines(
  client: StorefrontClient,
  cartId: string,
  lines: CartLineInput[]
): Promise<ShopifyCart> {
  const result = await client.query<CartResponse>(
    `
    ${CART_FRAGMENT}
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
      }
    }
    `,
    { cartId, lines }
  )

  return result.cartLinesAdd!.cart
}

export async function updateCartLines(
  client: StorefrontClient,
  cartId: string,
  lines: Array<{ id: string; quantity: number }>
): Promise<ShopifyCart> {
  const result = await client.query<CartResponse>(
    `
    ${CART_FRAGMENT}
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
      }
    }
    `,
    { cartId, lines }
  )

  return result.cartLinesUpdate!.cart
}

export async function removeCartLines(
  client: StorefrontClient,
  cartId: string,
  lineIds: string[]
): Promise<ShopifyCart> {
  const result = await client.query<CartResponse>(
    `
    ${CART_FRAGMENT}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFields }
      }
    }
    `,
    { cartId, lineIds }
  )

  return result.cartLinesRemove!.cart
}

/**
 * Update cart attributes
 */
export async function updateCartAttributes(
  client: StorefrontClient,
  cartId: string,
  attributes: Array<{ key: string; value: string }>
): Promise<ShopifyCart> {
  const result = await client.query<CartResponse>(
    `
    ${CART_FRAGMENT}
    mutation CartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
      cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
        cart { ...CartFields }
        userErrors {
          field
          message
        }
      }
    }
    `,
    { cartId, attributes }
  )

  const userErrors = result.cartAttributesUpdate?.userErrors
  if (userErrors && userErrors.length > 0) {
    throw new Error(userErrors[0]?.message ?? 'Failed to update cart attributes')
  }

  if (!result.cartAttributesUpdate?.cart) {
    throw new Error('Failed to update cart attributes')
  }

  return result.cartAttributesUpdate.cart
}

/**
 * Apply discount codes to cart
 */
export async function applyCartDiscountCodes(
  client: StorefrontClient,
  cartId: string,
  discountCodes: string[]
): Promise<ShopifyCart> {
  const result = await client.query<CartResponse>(
    `
    ${CART_FRAGMENT}
    mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
      cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
        cart { ...CartFields }
        userErrors {
          field
          message
        }
      }
    }
    `,
    { cartId, discountCodes }
  )

  const discountErrors = result.cartDiscountCodesUpdate?.userErrors
  if (discountErrors && discountErrors.length > 0) {
    throw new Error(discountErrors[0]?.message ?? 'Failed to apply discount code')
  }

  if (!result.cartDiscountCodesUpdate?.cart) {
    throw new Error('Failed to apply discount code')
  }

  return result.cartDiscountCodesUpdate.cart
}

/**
 * Remove discount codes from cart (pass empty array)
 */
export async function removeCartDiscountCodes(
  client: StorefrontClient,
  cartId: string
): Promise<ShopifyCart> {
  return applyCartDiscountCodes(client, cartId, [])
}
