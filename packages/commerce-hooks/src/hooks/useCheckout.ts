'use client'

/**
 * Checkout Hooks
 *
 * Hooks for checkout operations and URL management.
 *
 * @example
 * ```tsx
 * const { checkoutUrl, redirectToCheckout, isRedirecting } = useCheckout()
 *
 * <button onClick={redirectToCheckout} disabled={isRedirecting}>
 *   {isRedirecting ? 'Redirecting...' : 'Checkout'}
 * </button>
 * ```
 */

import { useCallback, useState } from 'react'
import { useCart } from './useCart'
import type { UseCheckoutReturn } from '../context/types'

/**
 * Hook for checkout operations
 *
 * Provides checkout URL and redirect functionality.
 *
 * @example
 * ```tsx
 * function CheckoutButton() {
 *   const { checkoutUrl, redirectToCheckout, isRedirecting } = useCheckout()
 *
 *   return (
 *     <button
 *       onClick={redirectToCheckout}
 *       disabled={!checkoutUrl || isRedirecting}
 *     >
 *       {isRedirecting ? 'Redirecting...' : 'Proceed to Checkout'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useCheckout(): UseCheckoutReturn {
  const { cart, getCheckoutUrl } = useCart()
  const [isRedirecting, setIsRedirecting] = useState(false)

  const checkoutUrl = cart?.checkoutUrl ?? null

  const redirectToCheckout = useCallback(() => {
    const url = getCheckoutUrl()
    if (url) {
      setIsRedirecting(true)
      // Use setTimeout to allow UI to update before redirect
      setTimeout(() => {
        window.location.href = url
      }, 0)
    }
  }, [getCheckoutUrl])

  return {
    checkoutUrl,
    isRedirecting,
    redirectToCheckout,
    getCheckoutUrl,
  }
}

/**
 * Hook to get just the checkout URL
 *
 * Lighter weight than useCheckout when you only need the URL.
 *
 * @example
 * ```tsx
 * function ShareCartButton() {
 *   const checkoutUrl = useCheckoutUrl()
 *
 *   if (!checkoutUrl) return null
 *
 *   return (
 *     <button onClick={() => navigator.clipboard.writeText(checkoutUrl)}>
 *       Copy Checkout Link
 *     </button>
 *   )
 * }
 * ```
 */
export function useCheckoutUrl(): string | null {
  const { cart } = useCart()
  return cart?.checkoutUrl ?? null
}

/**
 * Hook to check if checkout is possible
 *
 * Returns true if cart has items and checkout URL is available.
 *
 * @example
 * ```tsx
 * function CartFooter() {
 *   const canCheckout = useCanCheckout()
 *
 *   return (
 *     <div>
 *       <CartTotal />
 *       <CheckoutButton disabled={!canCheckout} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useCanCheckout(): boolean {
  const { cart, isLoading, isUpdating } = useCart()

  if (isLoading || isUpdating) return false
  if (!cart) return false
  if (cart.lines.length === 0) return false
  if (!cart.checkoutUrl) return false

  return true
}
