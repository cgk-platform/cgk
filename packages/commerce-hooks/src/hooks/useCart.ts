'use client'

/**
 * Cart Hooks
 *
 * Hooks for accessing cart state and operations.
 *
 * @example
 * ```tsx
 * // Full cart access
 * const { cart, addItem, isLoading, error } = useCart()
 *
 * // Just the count (safe outside provider)
 * const count = useCartCount()
 *
 * // Just the loading state
 * const isLoading = useCartLoading()
 * ```
 */

import { useContext } from 'react'
import { CartContext } from '../context/CartContext'
import type { CartContextValue } from '../context/types'

/**
 * Hook to access full cart context
 *
 * @throws Error if used outside CartProvider
 *
 * @example
 * ```tsx
 * function AddToCartButton({ variantId }: { variantId: string }) {
 *   const { addItem, isUpdating } = useCart()
 *
 *   return (
 *     <button
 *       onClick={() => addItem({ variantId, quantity: 1 })}
 *       disabled={isUpdating}
 *     >
 *       {isUpdating ? 'Adding...' : 'Add to Cart'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }

  return context
}

/**
 * Hook to get cart item count
 *
 * Safe to use outside CartProvider (returns 0)
 *
 * @example
 * ```tsx
 * function CartIcon() {
 *   const count = useCartCount()
 *
 *   return (
 *     <button>
 *       Cart
 *       {count > 0 && <span className="badge">{count}</span>}
 *     </button>
 *   )
 * }
 * ```
 */
export function useCartCount(): number {
  const context = useContext(CartContext)
  return context?.cart?.totalQuantity ?? 0
}

/**
 * Hook to get cart loading state
 *
 * Safe to use outside CartProvider (returns false)
 *
 * @example
 * ```tsx
 * function CartButton() {
 *   const isLoading = useCartLoading()
 *   const count = useCartCount()
 *
 *   if (isLoading) {
 *     return <Spinner />
 *   }
 *
 *   return <span>{count} items</span>
 * }
 * ```
 */
export function useCartLoading(): boolean {
  const context = useContext(CartContext)
  return context?.isLoading ?? false
}

/**
 * Hook to get cart updating state (add/remove/update operations)
 *
 * Safe to use outside CartProvider (returns false)
 *
 * @example
 * ```tsx
 * function CartStatus() {
 *   const isUpdating = useCartUpdating()
 *
 *   if (isUpdating) {
 *     return <span>Updating cart...</span>
 *   }
 *
 *   return null
 * }
 * ```
 */
export function useCartUpdating(): boolean {
  const context = useContext(CartContext)
  return context?.isUpdating ?? false
}

/**
 * Hook to get cart error state
 *
 * Safe to use outside CartProvider (returns null)
 *
 * @example
 * ```tsx
 * function CartError() {
 *   const error = useCartError()
 *   const { clearError } = useCart()
 *
 *   if (!error) return null
 *
 *   return (
 *     <div className="error">
 *       {error}
 *       <button onClick={clearError}>Dismiss</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useCartError(): string | null {
  const context = useContext(CartContext)
  return context?.error ?? null
}

/**
 * Hook to check if cart is empty
 *
 * Safe to use outside CartProvider (returns true)
 *
 * @example
 * ```tsx
 * function CartDrawer() {
 *   const isEmpty = useCartEmpty()
 *
 *   if (isEmpty) {
 *     return <p>Your cart is empty</p>
 *   }
 *
 *   return <CartLineItems />
 * }
 * ```
 */
export function useCartEmpty(): boolean {
  const context = useContext(CartContext)
  return !context?.cart || context.cart.lines.length === 0
}
