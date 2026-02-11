/**
 * Tenant context utilities for storefront
 *
 * Provides server-side tenant context extraction and validation.
 */

import { sql } from '@cgk/db'
import { headers } from 'next/headers'
import { cache } from 'react'

/**
 * Tenant configuration for storefront
 */
export interface TenantConfig {
  id: string
  slug: string
  name: string
  settings: {
    theme?: {
      primaryColor?: string
      logo?: string
      favicon?: string
    }
    commerce?: {
      provider?: 'shopify' | 'custom'
      currencyCode?: string
      locale?: string
    }
    features?: Record<string, boolean>
  }
  shopify?: {
    storeDomain: string
    storefrontAccessToken: string
    checkoutDomain?: string
  }
}

/**
 * Get tenant slug from request headers
 * Set by middleware based on subdomain/domain detection
 */
export async function getTenantSlug(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-slug')
}

/**
 * Get full tenant configuration
 * Cached per request to avoid multiple DB queries
 */
export const getTenantConfig = cache(async (): Promise<TenantConfig | null> => {
  const slug = await getTenantSlug()

  if (!slug) {
    return null
  }

  try {
    const result = await sql<{
      id: string
      slug: string
      name: string
      settings: TenantConfig['settings']
      shopify_store_domain: string | null
      shopify_storefront_token: string | null
      shopify_config: {
        checkoutDomain?: string
        storefrontAccessToken?: string
      } | null
    }>`
      SELECT
        id,
        slug,
        name,
        settings,
        shopify_store_domain,
        shopify_config
      FROM public.organizations
      WHERE slug = ${slug}
        AND status = 'active'
      LIMIT 1
    `

    const org = result.rows[0]
    if (!org) {
      return null
    }

    // Build tenant config
    const config: TenantConfig = {
      id: org.id,
      slug: org.slug,
      name: org.name,
      settings: org.settings ?? {},
    }

    // Add Shopify config if available
    if (org.shopify_store_domain) {
      const storefrontToken =
        org.shopify_config?.storefrontAccessToken ??
        process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN

      if (storefrontToken) {
        config.shopify = {
          storeDomain: org.shopify_store_domain,
          storefrontAccessToken: storefrontToken,
          checkoutDomain: org.shopify_config?.checkoutDomain,
        }
      }
    }

    return config
  } catch (error) {
    console.error('Failed to get tenant config:', error)
    return null
  }
})

/**
 * Require tenant configuration
 * Throws if tenant not found
 */
export async function requireTenantConfig(): Promise<TenantConfig> {
  const config = await getTenantConfig()

  if (!config) {
    throw new Error('Tenant not found')
  }

  return config
}

/**
 * Check if a feature flag is enabled for the current tenant
 */
export async function isFeatureEnabled(flagKey: string): Promise<boolean> {
  const config = await getTenantConfig()

  if (!config) {
    return false
  }

  // Check tenant-level feature override first
  if (config.settings.features?.[flagKey] !== undefined) {
    return config.settings.features[flagKey]
  }

  // Check platform-wide feature flag
  try {
    const result = await sql<{
      default_value: boolean
    }>`
      SELECT
        COALESCE(
          (
            SELECT value::boolean
            FROM feature_flag_overrides
            WHERE flag_key = ${flagKey}
              AND tenant_id = ${config.slug}
              AND (expires_at IS NULL OR expires_at > NOW())
            LIMIT 1
          ),
          (
            SELECT (default_value)::boolean
            FROM feature_flags
            WHERE key = ${flagKey}
              AND status = 'active'
            LIMIT 1
          ),
          false
        ) as default_value
    `

    return result.rows[0]?.default_value ?? false
  } catch {
    return false
  }
}

/**
 * Get the commerce provider type for the current tenant
 */
export async function getCommerceProviderType(): Promise<'shopify' | 'custom'> {
  const config = await getTenantConfig()

  // Check tenant setting
  if (config?.settings.commerce?.provider) {
    return config.settings.commerce.provider
  }

  // Check feature flag
  const useCustomProvider = await isFeatureEnabled('commerce.provider.custom')
  if (useCustomProvider) {
    return 'custom'
  }

  // Default to Shopify
  return 'shopify'
}
