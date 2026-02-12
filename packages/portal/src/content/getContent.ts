/**
 * Content Retrieval
 *
 * Retrieves content strings for the customer portal with tenant customization support.
 */

import { sql } from '@cgk/db'
import type { ContentKey, ContentStrings } from '../types'
import { DEFAULT_CONTENT } from './defaults'

interface ContentOverride {
  key: string
  value: string
}

/**
 * Cache for tenant content overrides
 * Key: tenantId, Value: Map<ContentKey, string>
 */
const contentCache = new Map<string, Map<ContentKey, string>>()
const cacheExpiry = new Map<string, number>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get content strings for a tenant
 * Merges default content with tenant-specific overrides
 */
export async function getContent(tenantId: string): Promise<ContentStrings> {
  const overrides = await getContentOverrides(tenantId)

  // Create a new object with defaults, then apply overrides
  const content = { ...DEFAULT_CONTENT }

  for (const [key, value] of overrides) {
    if (key in content) {
      content[key as ContentKey] = value
    }
  }

  return content
}

/**
 * Get a single content string with variable interpolation
 */
export async function getContentString(
  tenantId: string,
  key: ContentKey,
  variables?: Record<string, string>
): Promise<string> {
  const content = await getContent(tenantId)
  let value = content[key]

  if (variables) {
    for (const [varName, varValue] of Object.entries(variables)) {
      value = value.replace(new RegExp(`{{${varName}}}`, 'g'), varValue)
    }
  }

  return value
}

/**
 * Get content overrides from database with caching
 */
async function getContentOverrides(tenantId: string): Promise<Map<ContentKey, string>> {
  const now = Date.now()
  const expiry = cacheExpiry.get(tenantId)

  if (expiry && expiry > now) {
    const cached = contentCache.get(tenantId)
    if (cached) {
      return cached
    }
  }

  try {
    const result = await sql<ContentOverride>`
      SELECT key, value
      FROM public.content_overrides
      WHERE tenant_id = ${tenantId}
        AND namespace = 'portal'
        AND active = true
    `

    const overrides = new Map<ContentKey, string>()
    for (const row of result.rows) {
      overrides.set(row.key as ContentKey, row.value)
    }

    contentCache.set(tenantId, overrides)
    cacheExpiry.set(tenantId, now + CACHE_TTL)

    return overrides
  } catch (error) {
    // If table doesn't exist or query fails, return empty overrides
    console.warn('Failed to load content overrides:', error)
    return new Map()
  }
}

/**
 * Clear content cache for a tenant
 * Call this when content is updated in admin
 */
export function clearContentCache(tenantId: string): void {
  contentCache.delete(tenantId)
  cacheExpiry.delete(tenantId)
}

/**
 * Interpolate variables into a content string
 */
export function interpolate(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  }
  return result
}
