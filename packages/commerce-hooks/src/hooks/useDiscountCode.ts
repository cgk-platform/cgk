'use client'

/**
 * Discount Code Hooks
 *
 * Hooks for discount code validation and management.
 *
 * @example
 * ```tsx
 * // Validate before applying
 * const { validate, discount, error, isValidating } = useDiscountCode(discountActions)
 *
 * // Apply discount to cart
 * const { applyDiscount, removeDiscounts } = useCart()
 * ```
 */

import { useState, useCallback } from 'react'
import type { Discount } from '@cgk-platform/commerce'
import { useCart } from './useCart'
import type { UseDiscountCodeReturn, DiscountActions } from '../context/types'

/**
 * Hook for discount code validation
 *
 * Validates discount codes before applying to cart.
 *
 * @param actions - Discount actions for server integration
 *
 * @example
 * ```tsx
 * function DiscountInput() {
 *   const [code, setCode] = useState('')
 *   const { validate, discount, error, isValidating, reset } = useDiscountCode(discountActions)
 *   const { applyDiscount } = useCart()
 *
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault()
 *     const valid = await validate(code)
 *     if (valid) {
 *       await applyDiscount(code)
 *       setCode('')
 *       reset()
 *     }
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={code}
 *         onChange={e => setCode(e.target.value)}
 *         placeholder="Discount code"
 *       />
 *       <button type="submit" disabled={isValidating}>
 *         {isValidating ? 'Checking...' : 'Apply'}
 *       </button>
 *       {error && <span className="error">{error}</span>}
 *       {discount && <span className="success">{discount.code} - {discount.value}% off</span>}
 *     </form>
 *   )
 * }
 * ```
 */
export function useDiscountCode(actions: DiscountActions): UseDiscountCodeReturn {
  const [isValidating, setIsValidating] = useState(false)
  const [discount, setDiscount] = useState<Discount | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback(
    async (code: string): Promise<boolean> => {
      if (!code.trim()) {
        setError('Please enter a discount code')
        return false
      }

      setIsValidating(true)
      setError(null)
      setDiscount(null)

      try {
        const result = await actions.validateCode(code.trim().toUpperCase())

        if (!result) {
          setError('Invalid discount code')
          return false
        }

        // Check if discount is expired
        if (result.endsAt && new Date(result.endsAt) < new Date()) {
          setError('This discount code has expired')
          return false
        }

        // Check if discount hasn't started yet
        if (result.startsAt && new Date(result.startsAt) > new Date()) {
          setError('This discount code is not yet active')
          return false
        }

        // Check usage limits
        if (result.usageLimit && result.usageCount >= result.usageLimit) {
          setError('This discount code has reached its usage limit')
          return false
        }

        setDiscount(result)
        return true
      } catch (err) {
        console.error('Failed to validate discount code:', err)
        setError(err instanceof Error ? err.message : 'Failed to validate discount code')
        return false
      } finally {
        setIsValidating(false)
      }
    },
    [actions]
  )

  const reset = useCallback(() => {
    setDiscount(null)
    setError(null)
    setIsValidating(false)
  }, [])

  return {
    isValidating,
    discount,
    error,
    validate,
    reset,
  }
}

/**
 * Hook for managing discount codes in cart
 *
 * Combines cart discount operations with validation.
 *
 * @example
 * ```tsx
 * function DiscountManager() {
 *   const {
 *     appliedCodes,
 *     applyCode,
 *     removeCode,
 *     removeAllCodes,
 *     isApplying,
 *     error,
 *   } = useCartDiscounts()
 *
 *   return (
 *     <div>
 *       {appliedCodes.map(code => (
 *         <Tag key={code.code}>
 *           {code.code}
 *           {code.applicable ? <Check /> : <X />}
 *           <button onClick={() => removeCode(code.code)}>Remove</button>
 *         </Tag>
 *       ))}
 *       <DiscountInput onApply={applyCode} isApplying={isApplying} />
 *       {error && <ErrorMessage>{error}</ErrorMessage>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useCartDiscounts() {
  const { cart, applyDiscount, removeDiscounts, isUpdating, error } = useCart()

  const appliedCodes = cart?.discountCodes ?? []
  const applicableCodes = appliedCodes.filter((dc) => dc.applicable)
  const totalDiscount = cart?.discountAllocations?.reduce(
    (sum, allocation) => sum + parseFloat(allocation.discountedAmount.amount),
    0
  ) ?? 0

  const applyCode = useCallback(
    async (code: string): Promise<boolean> => {
      return applyDiscount(code)
    },
    [applyDiscount]
  )

  const removeCode = useCallback(async () => {
    // Note: Shopify removes all codes at once
    // For individual code removal, a different API would be needed
    await removeDiscounts()
  }, [removeDiscounts])

  const removeAllCodes = useCallback(async () => {
    await removeDiscounts()
  }, [removeDiscounts])

  return {
    /** All discount codes on cart */
    appliedCodes,
    /** Only applicable discount codes */
    applicableCodes,
    /** Has at least one applicable discount */
    hasDiscount: applicableCodes.length > 0,
    /** Total discount amount */
    totalDiscount,
    /** Apply a discount code */
    applyCode,
    /** Remove all discount codes */
    removeCode,
    /** Remove all discount codes */
    removeAllCodes,
    /** Is currently applying/removing */
    isApplying: isUpdating,
    /** Error message */
    error,
  }
}
