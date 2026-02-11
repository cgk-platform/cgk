/**
 * Shopify Cart queries (Storefront API)
 */

import type { StorefrontClient } from '../storefront'

export interface ShopifyCart {
  id: string
  checkoutUrl: string
  totalQuantity: number
  createdAt: string
  updatedAt: string
  cost: {
    subtotalAmount: { amount: string; currencyCode: string }
    totalAmount: { amount: string; currencyCode: string }
    totalTaxAmount: { amount: string; currencyCode: string } | null
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
        }
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
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
      totalTaxAmount { amount currencyCode }
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
