/**
 * Asset Management Utilities
 *
 * Handles loading assets from tenant-owned Vercel Blob Storage.
 * Ensures each tenant manages their own asset infrastructure.
 */

import { getTenantConfig } from './tenant'
import { logger } from '@cgk-platform/logging'

/**
 * Asset configuration for a tenant
 */
interface AssetConfig {
  baseUrl: string
  cdnDomain?: string
}

/**
 * Get asset base URL for a tenant
 *
 * Returns the base URL where tenant assets are hosted.
 * Throws error if not configured.
 *
 * @param tenantSlug - The tenant slug
 * @returns The asset base URL
 * @throws Error if asset base URL is not configured
 */
export async function getAssetBaseUrl(tenantSlug: string): Promise<string> {
  // First check for global NEXT_PUBLIC_ASSET_BASE_URL
  const globalAssetUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL
  if (globalAssetUrl) {
    return globalAssetUrl
  }

  // Load tenant config and check for asset settings
  try {
    const config = await getTenantConfig()

    if (!config || config.slug !== tenantSlug) {
      throw new Error(`Tenant configuration not found for slug: ${tenantSlug}`)
    }

    // Check if tenant has asset base URL configured
    const assetBaseUrl = config.settings?.assets?.baseUrl as string | undefined

    if (!assetBaseUrl) {
      throw new Error(
        `Asset base URL not configured for tenant "${tenantSlug}". ` +
          'Please set NEXT_PUBLIC_ASSET_BASE_URL environment variable or configure ' +
          'tenant.settings.assets.baseUrl in the database.'
      )
    }

    return assetBaseUrl
  } catch (error) {
    logger.error('Failed to get asset base URL:', error)
    throw error
  }
}

/**
 * Get full asset URL for a tenant
 *
 * Constructs the full URL to an asset hosted on tenant's Vercel Blob Storage.
 * Handles both relative and absolute asset paths.
 *
 * @param tenantSlug - The tenant slug
 * @param assetPath - The relative path to the asset (e.g., "images/logo.png")
 * @returns The full asset URL
 * @throws Error if asset base URL is not configured
 *
 * @example
 * ```typescript
 * // Get logo URL
 * const logoUrl = await getAssetUrl('meliusly', 'images/logo.png')
 * // Returns: https://[tenant-blob-url]/images/logo.png
 *
 * // Get product image URL
 * const productImageUrl = await getAssetUrl('meliusly', 'products/bedding-set.jpg')
 * // Returns: https://[tenant-blob-url]/products/bedding-set.jpg
 * ```
 */
export async function getAssetUrl(tenantSlug: string, assetPath: string): Promise<string> {
  // If assetPath is already a full URL, return as-is
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath
  }

  const baseUrl = await getAssetBaseUrl(tenantSlug)

  // Remove leading slash from assetPath if present
  const normalizedPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath

  // Remove trailing slash from baseUrl if present
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  return `${normalizedBaseUrl}/${normalizedPath}`
}

/**
 * Get asset configuration for a tenant
 *
 * Returns full asset configuration including CDN settings.
 *
 * @param tenantSlug - The tenant slug
 * @returns Asset configuration
 */
export async function getAssetConfig(tenantSlug: string): Promise<AssetConfig> {
  const config = await getTenantConfig()

  if (!config || config.slug !== tenantSlug) {
    throw new Error(`Tenant configuration not found for slug: ${tenantSlug}`)
  }

  const assetSettings = config.settings?.assets as
    | { baseUrl?: string; cdnDomain?: string }
    | undefined

  const baseUrl =
    process.env.NEXT_PUBLIC_ASSET_BASE_URL ||
    assetSettings?.baseUrl ||
    (() => {
      throw new Error(
        `Asset base URL not configured for tenant "${tenantSlug}". ` +
          'Please set NEXT_PUBLIC_ASSET_BASE_URL environment variable.'
      )
    })()

  return {
    baseUrl,
    cdnDomain: assetSettings?.cdnDomain,
  }
}

/**
 * Validate asset URL configuration
 *
 * Checks if asset management is properly configured for a tenant.
 * Useful for debugging and health checks.
 *
 * @param tenantSlug - The tenant slug
 * @returns True if configured, false otherwise
 */
export async function isAssetConfigured(tenantSlug: string): Promise<boolean> {
  try {
    await getAssetBaseUrl(tenantSlug)
    return true
  } catch {
    return false
  }
}
