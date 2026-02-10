import type { PlatformConfig } from './config'

/**
 * Validate platform configuration
 */
export function validateConfig(config: PlatformConfig): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Brand validation
  if (!config.brand) {
    errors.push('brand configuration is required')
  } else {
    if (!config.brand.name) {
      errors.push('brand.name is required')
    }
    if (!config.brand.slug) {
      errors.push('brand.slug is required')
    } else if (!/^[a-z0-9-]+$/.test(config.brand.slug)) {
      errors.push('brand.slug must contain only lowercase letters, numbers, and hyphens')
    }
  }

  // Shopify validation (if configured)
  if (config.shopify) {
    if (!config.shopify.storeDomain) {
      errors.push('shopify.storeDomain is required when shopify is configured')
    } else if (!config.shopify.storeDomain.includes('.myshopify.com')) {
      errors.push('shopify.storeDomain must be a valid myshopify.com domain')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
