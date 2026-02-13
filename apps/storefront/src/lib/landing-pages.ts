/**
 * Landing Page Data Access
 *
 * Functions for fetching landing page configurations from the database.
 * Respects tenant isolation - pages are scoped to the current tenant.
 */

import { sql, withTenant } from '@cgk-platform/db'
import { cache } from 'react'
import type {
  LandingPageConfig,
  LandingPageSEO,
  LandingPageSettings,
  LandingPageStatus,
  BlockType,
} from '@/lib/theme/types'

/**
 * Database row type for landing pages
 */
interface LandingPageRow {
  id: string
  slug: string
  title: string
  status: LandingPageStatus
  settings: LandingPageSettings | null
  seo: LandingPageSEO | null
  blocks: Array<{
    id: string
    type: string
    order: number
    config: Record<string, unknown>
  }> | null
  created_at: Date
  updated_at: Date
}

/**
 * Transform database row to LandingPageConfig
 */
function transformLandingPage(row: LandingPageRow): LandingPageConfig {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    settings: row.settings ?? {
      showNavigation: true,
      showFooter: true,
    },
    seo: row.seo ?? {},
    blocks: (row.blocks ?? []).map((block) => ({
      id: block.id,
      type: block.type as BlockType,
      order: block.order,
      config: block.config,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Get a landing page by slug for the current tenant
 * Cached per request to avoid multiple DB queries
 *
 * @param tenantSlug - The tenant identifier
 * @param pageSlug - The landing page slug
 * @returns The landing page config or null if not found
 */
export const getLandingPage = cache(
  async (tenantSlug: string, pageSlug: string): Promise<LandingPageConfig | null> => {
    try {
      const result = await withTenant(tenantSlug, async () => {
        return sql<LandingPageRow>`
          SELECT
            id,
            slug,
            title,
            status,
            settings,
            seo,
            blocks,
            created_at,
            updated_at
          FROM landing_pages
          WHERE slug = ${pageSlug}
            AND status = 'published'
          LIMIT 1
        `
      })

      const row = result.rows[0]
      if (!row) {
        return null
      }

      return transformLandingPage(row)
    } catch (error) {
      console.error('Failed to fetch landing page:', error)
      return null
    }
  }
)

/**
 * Get a landing page by ID for the current tenant (includes drafts)
 * Used for admin preview functionality
 *
 * @param tenantSlug - The tenant identifier
 * @param pageId - The landing page ID
 * @returns The landing page config or null if not found
 */
export const getLandingPageById = cache(
  async (tenantSlug: string, pageId: string): Promise<LandingPageConfig | null> => {
    try {
      const result = await withTenant(tenantSlug, async () => {
        return sql<LandingPageRow>`
          SELECT
            id,
            slug,
            title,
            status,
            settings,
            seo,
            blocks,
            created_at,
            updated_at
          FROM landing_pages
          WHERE id = ${pageId}
          LIMIT 1
        `
      })

      const row = result.rows[0]
      if (!row) {
        return null
      }

      return transformLandingPage(row)
    } catch (error) {
      console.error('Failed to fetch landing page by ID:', error)
      return null
    }
  }
)

/**
 * Get all published landing pages for a tenant
 *
 * @param tenantSlug - The tenant identifier
 * @returns Array of landing page configs
 */
export const getPublishedLandingPages = cache(
  async (tenantSlug: string): Promise<LandingPageConfig[]> => {
    try {
      const result = await withTenant(tenantSlug, async () => {
        return sql<LandingPageRow>`
          SELECT
            id,
            slug,
            title,
            status,
            settings,
            seo,
            blocks,
            created_at,
            updated_at
          FROM landing_pages
          WHERE status = 'published'
          ORDER BY updated_at DESC
        `
      })

      return result.rows.map(transformLandingPage)
    } catch (error) {
      console.error('Failed to fetch published landing pages:', error)
      return []
    }
  }
)

/**
 * Check if a landing page exists with the given slug
 *
 * @param tenantSlug - The tenant identifier
 * @param pageSlug - The landing page slug
 * @returns True if the page exists and is published
 */
export const landingPageExists = cache(
  async (tenantSlug: string, pageSlug: string): Promise<boolean> => {
    try {
      const result = await withTenant(tenantSlug, async () => {
        return sql<{ exists: boolean }>`
          SELECT EXISTS(
            SELECT 1 FROM landing_pages
            WHERE slug = ${pageSlug}
              AND status = 'published'
          ) as exists
        `
      })

      return result.rows[0]?.exists ?? false
    } catch {
      return false
    }
  }
)

/**
 * Generate static params for landing pages
 * Used for static site generation
 *
 * @param tenantSlug - The tenant identifier
 * @returns Array of slug params for generateStaticParams
 */
export async function getLandingPageSlugs(
  tenantSlug: string
): Promise<Array<{ slug: string }>> {
  const pages = await getPublishedLandingPages(tenantSlug)
  return pages.map((page) => ({ slug: page.slug }))
}
