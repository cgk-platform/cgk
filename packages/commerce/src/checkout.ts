/**
 * Checkout operations
 */

export type { Checkout, CheckoutLineItem } from './types'

/**
 * Create a checkout from a cart
 * @placeholder Implementation depends on configured commerce provider
 */
export async function createCheckout(_cartId: string): Promise<never> {
  // TODO: Implement via commerce client
  throw new Error('createCheckout requires a commerce client - use createCommerceClient()')
}
