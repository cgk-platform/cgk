/**
 * Cart Bridge
 *
 * Manages cart attributes for shipping A/B tests.
 * Cart attributes are the mechanism for passing variant assignments to Shopify Functions.
 */

import { CART_ATTRIBUTE_KEYS } from './config.js'
import type { CartAttributeUpdate } from './types.js'

/**
 * Shopify client interface for cart operations
 * This is a minimal interface that any Shopify client implementation should satisfy
 */
export interface ShopifyCartClient {
  cartAttributesUpdate(
    cartId: string,
    attributes: CartAttributeUpdate[]
  ): Promise<{ cartId: string }>
}

/**
 * Build cart attributes for shipping variant assignment
 *
 * @param testId - The A/B test ID
 * @param variantSuffix - The assigned variant suffix (A, B, C, D)
 * @param visitorId - The visitor ID for attribution
 * @returns Array of cart attributes to set
 */
export function buildShippingCartAttributes(
  testId: string,
  variantSuffix: string,
  visitorId: string
): CartAttributeUpdate[] {
  return [
    { key: CART_ATTRIBUTE_KEYS.SHIPPING_SUFFIX, value: variantSuffix },
    { key: CART_ATTRIBUTE_KEYS.TEST_TYPE, value: 'shipping' },
    { key: CART_ATTRIBUTE_KEYS.TEST_ID, value: testId },
    { key: CART_ATTRIBUTE_KEYS.VISITOR_ID, value: visitorId },
  ]
}

/**
 * Set shipping variant suffix in cart attributes
 *
 * @param cartId - Shopify cart ID (gid://shopify/Cart/...)
 * @param testId - The A/B test ID
 * @param variantSuffix - The assigned variant suffix (A, B, C, D)
 * @param visitorId - The visitor ID for attribution
 * @param shopifyClient - Shopify client for API calls
 */
export async function setShippingVariantInCart(
  cartId: string,
  testId: string,
  variantSuffix: string,
  visitorId: string,
  shopifyClient: ShopifyCartClient
): Promise<void> {
  const attributes = buildShippingCartAttributes(testId, variantSuffix, visitorId)
  await shopifyClient.cartAttributesUpdate(cartId, attributes)
}

/**
 * Clear shipping A/B test attributes from cart
 *
 * @param cartId - Shopify cart ID
 * @param shopifyClient - Shopify client for API calls
 */
export async function clearShippingAttributesFromCart(
  cartId: string,
  shopifyClient: ShopifyCartClient
): Promise<void> {
  const attributes: CartAttributeUpdate[] = [
    { key: CART_ATTRIBUTE_KEYS.SHIPPING_SUFFIX, value: '' },
    { key: CART_ATTRIBUTE_KEYS.TEST_TYPE, value: '' },
    { key: CART_ATTRIBUTE_KEYS.TEST_ID, value: '' },
    { key: CART_ATTRIBUTE_KEYS.VISITOR_ID, value: '' },
  ]
  await shopifyClient.cartAttributesUpdate(cartId, attributes)
}

/**
 * Cart sync request payload for API route
 */
export interface CartSyncRequest {
  cartId: string
  testId: string
  suffix: string
  visitorId: string
}

/**
 * Validate cart sync request
 */
export function validateCartSyncRequest(
  body: unknown
): { valid: true; data: CartSyncRequest } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Request body must be an object' }
  }

  const { cartId, testId, suffix, visitorId } = body as Record<string, unknown>

  if (typeof cartId !== 'string' || !cartId) {
    return { valid: false, error: 'cartId is required' }
  }

  if (typeof testId !== 'string' || !testId) {
    return { valid: false, error: 'testId is required' }
  }

  if (typeof suffix !== 'string' || !suffix) {
    return { valid: false, error: 'suffix is required' }
  }

  if (!['A', 'B', 'C', 'D'].includes(suffix.toUpperCase())) {
    return { valid: false, error: 'suffix must be A, B, C, or D' }
  }

  if (typeof visitorId !== 'string' || !visitorId) {
    return { valid: false, error: 'visitorId is required' }
  }

  return {
    valid: true,
    data: {
      cartId,
      testId,
      suffix: suffix.toUpperCase(),
      visitorId,
    },
  }
}

/**
 * Extract A/B test data from cart/order note attributes
 */
export function extractABDataFromAttributes(
  attributes: Array<{ name: string; value: string }> | Array<{ key: string; value: string }> | undefined
): {
  suffix: string | null
  testId: string | null
  testType: string | null
  visitorId: string | null
} {
  if (!attributes || attributes.length === 0) {
    return { suffix: null, testId: null, testType: null, visitorId: null }
  }

  const getAttr = (key: string): string | null => {
    // Handle both noteAttributes (name/value) and cartAttributes (key/value)
    const attr = attributes.find((a) => {
      if ('name' in a) return a.name === key
      if ('key' in a) return a.key === key
      return false
    })
    if (!attr) return null
    return attr.value || null
  }

  return {
    suffix: getAttr(CART_ATTRIBUTE_KEYS.SHIPPING_SUFFIX),
    testId: getAttr(CART_ATTRIBUTE_KEYS.TEST_ID),
    testType: getAttr(CART_ATTRIBUTE_KEYS.TEST_TYPE),
    visitorId: getAttr(CART_ATTRIBUTE_KEYS.VISITOR_ID),
  }
}
