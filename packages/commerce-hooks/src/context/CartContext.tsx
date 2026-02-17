'use client'

/**
 * Cart Context Definition
 *
 * Provides cart state context to the component tree.
 * Use with CartProvider component and useCart hook.
 */

import { createContext } from 'react'
import type { CartContextValue } from './types'

/**
 * Cart context for accessing cart state and operations.
 *
 * @example
 * ```tsx
 * // In a component
 * const { cart, addItem, isLoading } = useCart()
 * ```
 */
export const CartContext = createContext<CartContextValue | null>(null)

CartContext.displayName = 'CartContext'
