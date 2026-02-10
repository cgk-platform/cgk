/**
 * Cart operations
 */

export type { Cart, CartItem, CartCost, CartItemCost, CartItemInput } from './types'

/**
 * Create a new cart
 * @placeholder Implementation depends on configured commerce provider
 */
export async function createCart(): Promise<never> {
  // TODO: Implement via commerce client
  throw new Error('createCart requires a commerce client - use createCommerceClient()')
}

/**
 * Add an item to a cart
 * @placeholder Implementation depends on configured commerce provider
 */
export async function addToCart(_cartId: string, _item: unknown): Promise<never> {
  // TODO: Implement via commerce client
  throw new Error('addToCart requires a commerce client - use createCommerceClient()')
}

/**
 * Remove an item from a cart
 * @placeholder Implementation depends on configured commerce provider
 */
export async function removeFromCart(_cartId: string, _lineId: string): Promise<never> {
  // TODO: Implement via commerce client
  throw new Error('removeFromCart requires a commerce client - use createCommerceClient()')
}
