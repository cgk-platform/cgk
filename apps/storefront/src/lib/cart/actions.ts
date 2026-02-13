/**
 * Cart Server Actions
 *
 * Server-side cart operations that go through the Commerce Provider.
 * All operations include tenant tracking via cart attributes.
 */

'use server'

import type { Cart, CartAttribute } from '@cgk-platform/commerce'
import { cookies } from 'next/headers'

import { requireCommerceProvider } from '../commerce'
import { getTenantSlug } from '../tenant'
import { buildCartAttributes, generateVisitorId, generateSessionId } from './attributes'

const CART_ID_COOKIE = 'cgk_cart_id'
const VISITOR_ID_COOKIE = 'cgk_visitor_id'
const CART_COOKIE_DAYS = 7
const VISITOR_COOKIE_DAYS = 365

/**
 * Get or create cart for current session
 */
export async function getOrCreateCart(): Promise<Cart> {
  const commerce = await requireCommerceProvider()
  const cookieStore = await cookies()

  // Try to get existing cart
  const cartId = cookieStore.get(CART_ID_COOKIE)?.value
  if (cartId) {
    const existingCart = await commerce.cart.get(cartId)
    if (existingCart) {
      return existingCart
    }
  }

  // Create new cart with tenant attributes
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    throw new Error('Tenant context required for cart operations')
  }

  // Get or create visitor ID
  let visitorId = cookieStore.get(VISITOR_ID_COOKIE)?.value
  if (!visitorId) {
    visitorId = generateVisitorId()
    cookieStore.set(VISITOR_ID_COOKIE, visitorId, {
      maxAge: VISITOR_COOKIE_DAYS * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })
  }

  // Create cart
  const cart = await commerce.cart.create()

  // Set cart attributes for tenant tracking
  const attributes = buildCartAttributes(tenantSlug, visitorId, {
    sessionId: generateSessionId(),
  })

  // Update cart with attributes
  const cartWithAttributes = await setCartAttributesInternal(cart.id, attributes)

  // Store cart ID in cookie
  cookieStore.set(CART_ID_COOKIE, cart.id, {
    maxAge: CART_COOKIE_DAYS * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
  })

  return cartWithAttributes
}

/**
 * Get current cart (returns null if no cart exists)
 */
export async function getCurrentCart(): Promise<Cart | null> {
  const commerce = await requireCommerceProvider()
  const cookieStore = await cookies()

  const cartId = cookieStore.get(CART_ID_COOKIE)?.value
  if (!cartId) {
    return null
  }

  const cart = await commerce.cart.get(cartId)

  // If cart doesn't exist or is empty, clean up cookie
  if (!cart) {
    cookieStore.delete(CART_ID_COOKIE)
    return null
  }

  return cart
}

/**
 * Add item to cart
 */
export async function addToCart(
  variantId: string,
  quantity: number = 1,
  lineAttributes?: CartAttribute[]
): Promise<Cart> {
  const commerce = await requireCommerceProvider()
  const cart = await getOrCreateCart()

  // Merge line attributes with platform tracking
  const attributes = lineAttributes ?? []

  const updatedCart = await commerce.cart.addItem(cart.id, {
    merchandiseId: variantId,
    quantity,
    attributes,
  })

  return updatedCart
}

/**
 * Update cart line quantity
 */
export async function updateCartLine(
  lineId: string,
  quantity: number
): Promise<Cart> {
  const commerce = await requireCommerceProvider()
  const cart = await getOrCreateCart()

  if (quantity <= 0) {
    // Remove line if quantity is 0 or negative
    return commerce.cart.removeItem(cart.id, lineId)
  }

  return commerce.cart.updateItem(cart.id, lineId, quantity)
}

/**
 * Remove line from cart
 */
export async function removeFromCart(lineId: string): Promise<Cart> {
  const commerce = await requireCommerceProvider()
  const cart = await getOrCreateCart()

  return commerce.cart.removeItem(cart.id, lineId)
}

/**
 * Get checkout URL for current cart
 */
export async function getCheckoutUrl(): Promise<string | null> {
  const cart = await getCurrentCart()
  return cart?.checkoutUrl ?? null
}

/**
 * Update cart attributes with UTM parameters
 */
export async function updateCartAttribution(params: {
  utmSource?: string
  utmCampaign?: string
  utmMedium?: string
  abTestId?: string
  abVariantId?: string
}): Promise<Cart | null> {
  const cart = await getCurrentCart()
  if (!cart) return null

  const tenantSlug = await getTenantSlug()
  const cookieStore = await cookies()
  const visitorId = cookieStore.get(VISITOR_ID_COOKIE)?.value ?? generateVisitorId()

  const attributes = buildCartAttributes(tenantSlug ?? 'unknown', visitorId, {
    utmSource: params.utmSource,
    utmCampaign: params.utmCampaign,
    utmMedium: params.utmMedium,
    abTestId: params.abTestId,
    abVariantId: params.abVariantId,
  })

  return setCartAttributesInternal(cart.id, attributes)
}

/**
 * Internal: Set cart attributes
 * Note: Shopify cart attributes require the cartAttributesUpdate mutation
 */
async function setCartAttributesInternal(
  cartId: string,
  attributes: CartAttribute[]
): Promise<Cart> {
  const commerce = await requireCommerceProvider()

  try {
    // Try to set attributes via commerce provider
    return await commerce.cart.setAttributes(cartId, attributes)
  } catch (error) {
    // If setAttributes is not implemented, log and return current cart
    console.warn('Cart attributes update not supported by provider:', error)
    const cart = await commerce.cart.get(cartId)
    if (!cart) {
      throw new Error(`Cart ${cartId} not found`)
    }
    return cart
  }
}

/**
 * Clear cart (delete cart ID cookie)
 */
export async function clearCart(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(CART_ID_COOKIE)
}

/**
 * Apply discount code to cart
 */
export async function applyDiscountCode(code: string): Promise<Cart> {
  const commerce = await requireCommerceProvider()
  const cart = await getOrCreateCart()

  return commerce.cart.applyDiscountCode(cart.id, code.trim().toUpperCase())
}

/**
 * Remove all discount codes from cart
 */
export async function removeDiscountCodes(): Promise<Cart> {
  const commerce = await requireCommerceProvider()
  const cart = await getCurrentCart()

  if (!cart) {
    throw new Error('No cart found')
  }

  return commerce.cart.removeDiscountCodes(cart.id)
}
