/**
 * Platform configuration schema and helpers
 */

export interface BrandConfig {
  name: string
  slug: string
  domain?: string
}

export interface ThemeConfig {
  colors?: {
    primary?: string
    accent?: string
    background?: string
    foreground?: string
  }
  fonts?: {
    heading?: string
    body?: string
  }
}

export interface FeaturesConfig {
  creators?: boolean
  abTesting?: boolean
  attribution?:
    | boolean
    | {
        enabled: boolean
        models?: string[]
      }
  reviews?: boolean
  subscriptions?: boolean
}

export interface ShopifyConfig {
  storeDomain: string
  apiVersion?: string
}

export interface DeploymentConfig {
  profile?: 'small' | 'medium' | 'large' | 'enterprise'
  region?: string
}

export interface PlatformConfig {
  brand: BrandConfig
  theme?: ThemeConfig
  features?: FeaturesConfig
  shopify?: ShopifyConfig
  deployment?: DeploymentConfig
}

/**
 * Define platform configuration with type safety
 *
 * @example
 * ```ts
 * // platform.config.ts
 * import { defineConfig } from '@cgk/core'
 *
 * export default defineConfig({
 *   brand: {
 *     name: 'My Brand',
 *     slug: 'mybrand',
 *   },
 * })
 * ```
 */
export function defineConfig(config: PlatformConfig): PlatformConfig {
  return config
}
