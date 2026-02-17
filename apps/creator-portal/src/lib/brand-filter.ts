/**
 * Brand Filter Utilities for API Routes
 *
 * Provides server-side helpers for reading the selected brand from cookies
 * and filtering data based on brand selection.
 */

import type { CreatorAuthContext } from './auth'

// Cookie name (must match brand-context.tsx)
const SELECTED_BRAND_COOKIE = 'cgk_creator_selected_brand'

/**
 * Extract selected brand slug from request cookies
 */
export function getSelectedBrandSlugFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === SELECTED_BRAND_COOKIE && value) {
      return decodeURIComponent(value)
    }
  }
  return null
}

/**
 * Get the selected brand context from request and auth context
 *
 * Returns the brand info if:
 * 1. A brand is selected via cookie
 * 2. The creator has access to that brand
 *
 * Returns null if "All Brands" is selected or invalid brand
 */
export function getSelectedBrandFromRequest(
  req: Request,
  context: CreatorAuthContext
): { brandId: string; brandSlug: string } | null {
  const selectedSlug = getSelectedBrandSlugFromRequest(req)

  if (!selectedSlug) {
    return null // "All Brands" mode
  }

  // Find the brand in the creator's memberships
  const membership = context.memberships.find(
    (m) => m.brandSlug === selectedSlug && m.status === 'active'
  )

  if (!membership) {
    return null // Brand not found or not active
  }

  return {
    brandId: membership.brandId,
    brandSlug: membership.brandSlug,
  }
}

/**
 * Build a brand filter for SQL queries
 *
 * @param context - Creator auth context
 * @param req - Request object
 * @param brandIdColumn - The column name for brand_id in the query
 * @returns Object with brandId filter value or null for all brands
 */
export function getBrandFilter(
  req: Request,
  context: CreatorAuthContext
): { brandId: string | null; brandSlug: string | null } {
  const selected = getSelectedBrandFromRequest(req, context)

  return {
    brandId: selected?.brandId ?? null,
    brandSlug: selected?.brandSlug ?? null,
  }
}

/**
 * Get accessible brand IDs for a creator (all active memberships)
 */
export function getAccessibleBrandIds(context: CreatorAuthContext): string[] {
  return context.memberships
    .filter((m) => m.status === 'active')
    .map((m) => m.brandId)
}

/**
 * Get accessible brand slugs for a creator (all active memberships)
 */
export function getAccessibleBrandSlugs(context: CreatorAuthContext): string[] {
  return context.memberships
    .filter((m) => m.status === 'active')
    .map((m) => m.brandSlug)
}

export { SELECTED_BRAND_COOKIE }
