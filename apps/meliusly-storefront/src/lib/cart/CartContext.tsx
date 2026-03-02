'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Cart, CartItem, CartContextValue } from './types'

const CART_STORAGE_KEY = 'meliusly_cart'
const CART_SYNC_INTERVAL = 30000 // Sync every 30 seconds

const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

interface CartProviderProps {
  children: React.ReactNode
}

function calculateSubtotal(items: CartItem[]): { amount: string; currencyCode: string } {
  if (items.length === 0) {
    return { amount: '0.00', currencyCode: 'USD' }
  }

  const total = items.reduce((sum, item) => {
    const itemTotal = parseFloat(item.price.amount) * item.quantity
    return sum + itemTotal
  }, 0)

  return {
    amount: total.toFixed(2),
    currencyCode: items[0].price.currencyCode || 'USD',
  }
}

function calculateItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0)
}

export function CartProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      try {
        const storedCart = localStorage.getItem(CART_STORAGE_KEY)
        if (storedCart) {
          const parsed = JSON.parse(storedCart) as Cart
          setCart(parsed)
        } else {
          // Initialize empty cart
          setCart({
            items: [],
            subtotal: { amount: '0.00', currencyCode: 'USD' },
            itemCount: 0,
          })
        }
      } catch (err) {
        console.error('Failed to load cart from storage:', err)
        setCart({
          items: [],
          subtotal: { amount: '0.00', currencyCode: 'USD' },
          itemCount: 0,
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadCart()
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart && !isLoading) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
      } catch (err) {
        console.error('Failed to save cart to storage:', err)
      }
    }
  }, [cart, isLoading])

  // Sync cart to database periodically
  useEffect(() => {
    if (!cart || isLoading) return

    const syncToDatabase = async () => {
      try {
        await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart }),
        })
      } catch (err) {
        console.error('Failed to sync cart to database:', err)
      }
    }

    // Initial sync
    syncToDatabase()

    // Set up periodic sync
    const interval = setInterval(syncToDatabase, CART_SYNC_INTERVAL)

    return () => clearInterval(interval)
  }, [cart, isLoading])

  const addItem = useCallback(async (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    try {
      setError(null)

      setCart((prevCart) => {
        if (!prevCart) {
          return {
            items: [{ ...item, quantity }],
            subtotal: calculateSubtotal([{ ...item, quantity }]),
            itemCount: quantity,
          }
        }

        // Check if item already exists
        const existingItemIndex = prevCart.items.findIndex((i) => i.variantId === item.variantId)

        let newItems: CartItem[]
        if (existingItemIndex >= 0) {
          // Update quantity of existing item
          newItems = [...prevCart.items]
          newItems[existingItemIndex] = {
            ...newItems[existingItemIndex],
            quantity: newItems[existingItemIndex].quantity + quantity,
          }
        } else {
          // Add new item
          newItems = [...prevCart.items, { ...item, quantity }]
        }

        return {
          ...prevCart,
          items: newItems,
          subtotal: calculateSubtotal(newItems),
          itemCount: calculateItemCount(newItems),
          updatedAt: new Date(),
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item to cart')
      throw err
    }
  }, [])

  const updateQuantity = useCallback(async (variantId: string, quantity: number) => {
    try {
      setError(null)

      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        setCart((prevCart) => {
          if (!prevCart) return null

          const newItems = prevCart.items.filter((item) => item.variantId !== variantId)

          return {
            ...prevCart,
            items: newItems,
            subtotal: calculateSubtotal(newItems),
            itemCount: calculateItemCount(newItems),
            updatedAt: new Date(),
          }
        })
        return
      }

      setCart((prevCart) => {
        if (!prevCart) return null

        const newItems = prevCart.items.map((item) =>
          item.variantId === variantId ? { ...item, quantity } : item
        )

        return {
          ...prevCart,
          items: newItems,
          subtotal: calculateSubtotal(newItems),
          itemCount: calculateItemCount(newItems),
          updatedAt: new Date(),
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item quantity')
      throw err
    }
  }, [])

  const removeItem = useCallback(async (variantId: string) => {
    try {
      setError(null)

      setCart((prevCart) => {
        if (!prevCart) return null

        const newItems = prevCart.items.filter((item) => item.variantId !== variantId)

        return {
          ...prevCart,
          items: newItems,
          subtotal: calculateSubtotal(newItems),
          itemCount: calculateItemCount(newItems),
          updatedAt: new Date(),
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item from cart')
      throw err
    }
  }, [])

  const clearCart = useCallback(async () => {
    try {
      setError(null)

      setCart({
        items: [],
        subtotal: { amount: '0.00', currencyCode: 'USD' },
        itemCount: 0,
        updatedAt: new Date(),
      })

      // Clear from database
      await fetch('/api/cart', {
        method: 'DELETE',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cart')
      throw err
    }
  }, [])

  const refreshCart = useCallback(async () => {
    try {
      setError(null)
      setIsLoading(true)

      // Fetch cart from database
      const response = await fetch('/api/cart')
      if (response.ok) {
        const data = (await response.json()) as { cart: Cart }
        if (data.cart) {
          setCart(data.cart)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh cart')
      console.error('Failed to refresh cart:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const value: CartContextValue = {
    cart,
    isLoading,
    error,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
