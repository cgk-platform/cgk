/**
 * Bundle Builder Server Actions
 *
 * Adds all bundle items to the cart as individual lines,
 * each annotated with _bundle_* line item properties so the
 * backend can identify and group them.
 */

'use server'

import type { CartAttribute } from '@cgk-platform/commerce'

import { addToCart } from '@/lib/cart/actions'

import type { BundleCartItem } from './types'

export async function addBundleToCart(
  items: BundleCartItem[]
): Promise<{ success: boolean; error?: string }> {
  if (items.length === 0) {
    return { success: false, error: 'No items in bundle' }
  }

  try {
    for (const item of items) {
      const attributes: CartAttribute[] = Object.entries(item.properties).map(
        ([key, value]) => ({ key, value })
      )

      await addToCart(item.variantId, item.quantity, attributes)
    }

    return { success: true }
  } catch (err) {
    console.error('[BundleBuilder] Failed to add bundle to cart:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add bundle to cart',
    }
  }
}
