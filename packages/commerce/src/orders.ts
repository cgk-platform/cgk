/**
 * Order operations
 */

export type { Order, OrderLineItem, Address, GetOrdersOptions } from './types'

/**
 * Get a single order by ID
 * @placeholder Implementation depends on configured commerce provider
 */
export async function getOrder(_id: string): Promise<null> {
  // TODO: Implement via commerce client
  throw new Error('getOrder requires a commerce client - use createCommerceClient()')
}

/**
 * Get a list of orders
 * @placeholder Implementation depends on configured commerce provider
 */
export async function getOrders(): Promise<never[]> {
  // TODO: Implement via commerce client
  throw new Error('getOrders requires a commerce client - use createCommerceClient()')
}
