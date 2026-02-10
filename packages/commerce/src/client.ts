/**
 * Commerce client factory
 */

import type { CommerceConfig, CommerceProvider, Product, Order, Cart, Checkout, CartItemInput, GetProductsOptions, GetOrdersOptions } from './types'

export interface CommerceClient {
  readonly provider: CommerceProvider
  getProduct(id: string): Promise<Product | null>
  getProducts(options?: GetProductsOptions): Promise<Product[]>
  getOrder(id: string): Promise<Order | null>
  getOrders(options?: GetOrdersOptions): Promise<Order[]>
  createCart(): Promise<Cart>
  addToCart(cartId: string, item: CartItemInput): Promise<Cart>
  removeFromCart(cartId: string, lineId: string): Promise<Cart>
  createCheckout(cartId: string): Promise<Checkout>
}

/**
 * Create a commerce client for the configured provider
 */
export function createCommerceClient(config: CommerceConfig): CommerceClient {
  // TODO: Implement provider-specific clients
  // For now, return a placeholder that throws
  const provider: CommerceProvider = {
    name: config.provider,
    config,
    async getProduct(_id) {
      throw new Error(`Commerce provider '${config.provider}' not implemented`)
    },
    async getProducts(_options) {
      throw new Error(`Commerce provider '${config.provider}' not implemented`)
    },
    async getOrder(_id) {
      throw new Error(`Commerce provider '${config.provider}' not implemented`)
    },
    async getOrders(_options) {
      throw new Error(`Commerce provider '${config.provider}' not implemented`)
    },
    async createCart() {
      throw new Error(`Commerce provider '${config.provider}' not implemented`)
    },
    async addToCart(_cartId, _item) {
      throw new Error(`Commerce provider '${config.provider}' not implemented`)
    },
    async removeFromCart(_cartId, _lineId) {
      throw new Error(`Commerce provider '${config.provider}' not implemented`)
    },
    async createCheckout(_cartId) {
      throw new Error(`Commerce provider '${config.provider}' not implemented`)
    },
  }

  return {
    provider,
    getProduct: (id) => provider.getProduct(id),
    getProducts: (options) => provider.getProducts(options),
    getOrder: (id) => provider.getOrder(id),
    getOrders: (options) => provider.getOrders(options),
    createCart: () => provider.createCart(),
    addToCart: (cartId, item) => provider.addToCart(cartId, item),
    removeFromCart: (cartId, lineId) => provider.removeFromCart(cartId, lineId),
    createCheckout: (cartId) => provider.createCheckout(cartId),
  }
}
