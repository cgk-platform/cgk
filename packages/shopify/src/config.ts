/**
 * Shopify configuration types
 */

export interface ShopifyConfig {
  storeDomain: string
  storefrontAccessToken?: string
  adminAccessToken?: string
  apiVersion?: string
}

export interface StorefrontConfig {
  storeDomain: string
  storefrontAccessToken: string
  apiVersion?: string
}

export interface AdminConfig {
  storeDomain: string
  adminAccessToken: string
  apiVersion?: string
}

export const DEFAULT_API_VERSION = '2024-01'

export function normalizeStoreDomain(domain: string): string {
  // Remove protocol if present
  let normalized = domain.replace(/^https?:\/\//, '')
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '')
  // Add .myshopify.com if not present
  if (!normalized.includes('.myshopify.com')) {
    normalized = `${normalized}.myshopify.com`
  }
  return normalized
}
