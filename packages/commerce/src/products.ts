/**
 * Product operations
 */

export type { Product, ProductVariant, ProductImage, PriceRange, Money, SelectedOption, GetProductsOptions } from './types'

/**
 * Get a single product by ID
 * @placeholder Implementation depends on configured commerce provider
 */
export async function getProduct(_id: string): Promise<null> {
  // TODO: Implement via commerce client
  throw new Error('getProduct requires a commerce client - use createCommerceClient()')
}

/**
 * Get a list of products
 * @placeholder Implementation depends on configured commerce provider
 */
export async function getProducts(): Promise<never[]> {
  // TODO: Implement via commerce client
  throw new Error('getProducts requires a commerce client - use createCommerceClient()')
}
