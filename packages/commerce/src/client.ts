/**
 * Commerce client factory
 *
 * Creates a CommerceProvider based on configuration.
 * Currently supports Shopify; Custom+Stripe provider is planned.
 */

import { createShopifyProvider } from './providers/shopify'
import type { CommerceConfig, CommerceProvider } from './types'

/**
 * Create a commerce provider for the configured backend
 */
export function createCommerceProvider(config: CommerceConfig): CommerceProvider {
  switch (config.provider) {
    case 'shopify':
      return createShopifyProvider(config)
    case 'custom':
      throw new Error(
        'Custom commerce provider is not yet implemented. Use "shopify" provider.'
      )
    default:
      throw new Error(`Unknown commerce provider: ${config.provider}`)
  }
}
