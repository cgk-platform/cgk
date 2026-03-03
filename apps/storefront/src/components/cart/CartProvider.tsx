/**
 * Cart Context Provider
 *
 * Provides cart state and operations to the entire storefront.
 * Uses server actions for cart mutations with optimistic updates.
 */

'use client'

import type { Cart } from '@cgk-platform/commerce'
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useTransition,
  type ReactNode,
} from 'react'

import type { CartContextValue, AddToCartInput } from '@/lib/cart/types'
import {
  getCurrentCart,
  addToCart as addToCartAction,
  updateCartLine as updateCartLineAction,
  removeFromCart as removeFromCartAction,
  applyDiscountCode as applyDiscountCodeAction,
  removeDiscountCodes as removeDiscountCodesAction,
} from '@/lib/cart/actions'

const CartContext = createContext<CartContextValue | null>(null)

interface CartProviderProps {
  children: ReactNode
  /** Initial cart data from server */
  initialCart?: Cart | null
  /** Tenant slug for attribution */
  tenantSlug: string
}

export function CartProvider({
  children,
  initialCart = null,
  tenantSlug: _tenantSlug,
}: CartProviderProps) {
  const [cart, setCart] = useState<Cart | null>(initialCart)
  const [isLoading, setIsLoading] = useState(!initialCart)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Fetch cart on mount if not provided
  useEffect(() => {
    if (!initialCart) {
      getCurrentCart()
        .then((fetchedCart) => {
          setCart(fetchedCart)
          setIsLoading(false)
        })
        .catch((err) => {
          console.error('Failed to fetch cart:', err)
          setIsLoading(false)
        })
    }
  }, [initialCart])

  // Add item to cart
  const addItem = useCallback(
    async (input: AddToCartInput) => {
      setIsUpdating(true)
      setError(null)

      // Optimistic update - add a placeholder line
      const previousCart = cart

      try {
        const updatedCart = await addToCartAction(input.variantId, input.quantity)
        startTransition(() => {
          setCart(updatedCart)
          setIsUpdating(false)
        })
      } catch (err) {
        console.error('Failed to add to cart:', err)
        setError(err instanceof Error ? err.message : 'Failed to add to cart')
        // Rollback optimistic update
        setCart(previousCart)
        setIsUpdating(false)
      }
    },
    [cart]
  )

  // Update line quantity
  const updateQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cart) return

      setIsUpdating(true)
      setError(null)

      // Optimistic update
      const previousCart = cart
      const optimisticCart: Cart = {
        ...cart,
        lines: cart.lines.map((line) =>
          line.id === lineId ? { ...line, quantity } : line
        ),
      }
      setCart(optimisticCart)

      try {
        const updatedCart = await updateCartLineAction(lineId, quantity)
        startTransition(() => {
          setCart(updatedCart)
          setIsUpdating(false)
        })
      } catch (err) {
        console.error('Failed to update cart:', err)
        setError(err instanceof Error ? err.message : 'Failed to update cart')
        setCart(previousCart)
        setIsUpdating(false)
      }
    },
    [cart]
  )

  // Remove item from cart
  const removeItem = useCallback(
    async (lineId: string) => {
      if (!cart) return

      setIsUpdating(true)
      setError(null)

      // Optimistic update
      const previousCart = cart
      const optimisticCart: Cart = {
        ...cart,
        lines: cart.lines.filter((line) => line.id !== lineId),
        totalQuantity: cart.totalQuantity - (cart.lines.find((l) => l.id === lineId)?.quantity ?? 0),
      }
      setCart(optimisticCart)

      try {
        const updatedCart = await removeFromCartAction(lineId)
        startTransition(() => {
          setCart(updatedCart)
          setIsUpdating(false)
        })
      } catch (err) {
        console.error('Failed to remove from cart:', err)
        setError(err instanceof Error ? err.message : 'Failed to remove item')
        setCart(previousCart)
        setIsUpdating(false)
      }
    },
    [cart]
  )

  // Redirect to checkout
  const checkout = useCallback(() => {
    if (cart?.checkoutUrl) {
      window.location.href = cart.checkoutUrl
    }
  }, [cart])

  // Get checkout URL without redirecting
  const getCheckoutUrl = useCallback(() => {
    return cart?.checkoutUrl ?? null
  }, [cart])

  // Clear error state
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Refresh cart from server
  const refreshCart = useCallback(async () => {
    setIsLoading(true)
    try {
      const freshCart = await getCurrentCart()
      setCart(freshCart)
    } catch (err) {
      console.error('Failed to refresh cart:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh cart')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Apply discount code
  const applyDiscount = useCallback(async (code: string): Promise<boolean> => {
    setIsUpdating(true)
    setError(null)

    try {
      const updatedCart = await applyDiscountCodeAction(code)
      startTransition(() => {
        setCart(updatedCart)
        setIsUpdating(false)
      })

      // Check if discount was actually applied (applicable = true)
      const appliedDiscount = updatedCart.discountCodes?.find(
        (dc: { code: string; applicable: boolean }) => dc.code.toUpperCase() === code.toUpperCase()
      )

      if (appliedDiscount && !appliedDiscount.applicable) {
        setError('This discount code is not applicable to your cart')
        return false
      }

      return true
    } catch (err) {
      console.error('Failed to apply discount:', err)
      setError(err instanceof Error ? err.message : 'Invalid discount code')
      setIsUpdating(false)
      return false
    }
  }, [])

  // Remove discount codes
  const removeDiscounts = useCallback(async () => {
    if (!cart) return

    setIsUpdating(true)
    setError(null)

    try {
      const updatedCart = await removeDiscountCodesAction()
      startTransition(() => {
        setCart(updatedCart)
        setIsUpdating(false)
      })
    } catch (err) {
      console.error('Failed to remove discounts:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove discount')
      setIsUpdating(false)
    }
  }, [cart])

  const value: CartContextValue = {
    cart,
    isLoading: isLoading || isPending,
    isUpdating: isUpdating || isPending,
    error,
    addItem,
    updateQuantity,
    removeItem,
    checkout,
    getCheckoutUrl,
    clearError,
    refreshCart,
    applyDiscount,
    removeDiscounts,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

/**
 * Hook to access cart context
 * @throws Error if used outside CartProvider
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }

  return context
}

/**
 * Hook to get cart item count (safe to use outside provider)
 */
export function useCartCount(): number {
  const context = useContext(CartContext)
  return context?.cart?.totalQuantity ?? 0
}
