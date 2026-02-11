/**
 * Shipping A/B Test Client Hooks
 *
 * React hooks for syncing shipping variant assignments to cart.
 * These run on the storefront to ensure cart has the correct attributes.
 */

/**
 * Shipping A/B test assignment data
 */
export interface ShippingAssignment {
  testId: string
  variantId: string
  suffix: string
  visitorId: string
}

/**
 * Cart sync state
 */
export interface CartSyncState {
  isSyncing: boolean
  isSynced: boolean
  error: string | null
}

/**
 * Sync shipping variant to cart via API
 *
 * This is a framework-agnostic function that can be used
 * in React hooks or other contexts.
 *
 * @param assignment - The shipping variant assignment
 * @param cartId - The Shopify cart ID
 * @param apiUrl - The API endpoint URL (defaults to /api/ab-tests/shipping-config)
 * @returns The attributes to set on the cart
 */
export async function syncShippingVariantToCart(
  assignment: ShippingAssignment,
  cartId: string,
  apiUrl: string = '/api/ab-tests/shipping-config'
): Promise<{
  success: boolean
  attributes?: Array<{ key: string; value: string }>
  error?: string
}> {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cartId,
        testId: assignment.testId,
        suffix: assignment.suffix,
        visitorId: assignment.visitorId,
      }),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string }
      return {
        success: false,
        error: errorData.error || 'Failed to sync cart attributes',
      }
    }

    const data = (await response.json()) as { attributes: Array<{ key: string; value: string }> }
    return {
      success: true,
      attributes: data.attributes,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

/**
 * React hook factory for shipping A/B test sync
 *
 * This returns the configuration for a React hook. The actual hook
 * implementation depends on the React version being used.
 *
 * Usage in storefront:
 * ```tsx
 * import { useEffect, useState, useCallback } from 'react'
 * import { createShippingABTestSyncHook } from '@cgk/ab-testing/shipping'
 *
 * export function useShippingABTestSync(testId: string) {
 *   const config = createShippingABTestSyncHook(testId)
 *   // ... implement with your React version and cart API
 * }
 * ```
 */
export function createShippingABTestSyncHook(testId: string) {
  return {
    testId,
    syncFn: syncShippingVariantToCart,
    storageKey: `_cgk_ab_shipping_${testId}`,
  }
}

/**
 * Extract shipping assignment from A/B cookie
 */
export function extractShippingAssignmentFromCookie(
  cookieValue: string | undefined,
  testId: string
): ShippingAssignment | null {
  if (!cookieValue) return null

  try {
    // Parse URL-safe base64
    const base64 = cookieValue.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    const cookie = JSON.parse(json) as {
      v: string
      t: Record<string, { var: string; at: number; sh?: string }>
    }

    const assignment = cookie.t[testId]
    if (!assignment?.sh) return null

    return {
      testId,
      variantId: assignment.var,
      suffix: assignment.sh,
      visitorId: cookie.v,
    }
  } catch {
    return null
  }
}

/**
 * Check if cart needs sync (attributes differ from assignment)
 */
export function cartNeedsSync(
  cartAttributes: Array<{ key: string; value: string }> | undefined,
  assignment: ShippingAssignment
): boolean {
  if (!cartAttributes) return true

  const currentSuffix = cartAttributes.find(
    (a) => a.key === '_ab_shipping_suffix'
  )?.value
  const currentTestId = cartAttributes.find(
    (a) => a.key === '_ab_test_id'
  )?.value

  // Need sync if suffix or test ID differs
  return currentSuffix !== assignment.suffix || currentTestId !== assignment.testId
}

/**
 * GraphQL mutation for updating cart attributes
 *
 * Use this with the Shopify Storefront API client.
 */
export const CART_ATTRIBUTES_UPDATE_MUTATION = `
  mutation cartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart {
        id
        attributes {
          key
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`
