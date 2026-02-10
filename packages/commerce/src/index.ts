/**
 * @cgk/commerce - Commerce provider abstraction
 *
 * @ai-pattern commerce-abstraction
 * @ai-note Provider-agnostic commerce operations
 */

// Provider interface
export type { CommerceProvider, CommerceConfig } from './types'

// Operations
export { createCommerceClient, type CommerceClient } from './client'

// Product operations
export { getProduct, getProducts, type Product, type ProductVariant } from './products'

// Order operations
export { getOrder, getOrders, type Order, type OrderLineItem } from './orders'

// Cart operations
export { createCart, addToCart, removeFromCart, type Cart, type CartItem } from './cart'

// Checkout operations
export { createCheckout, type Checkout, type CheckoutLineItem } from './checkout'
