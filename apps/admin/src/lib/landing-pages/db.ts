/**
 * Landing pages database operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk/db'

import type {
  LandingPage,
  LandingPageRow,
  Block,
  PageFilters,
  CreatePageInput,
  UpdatePageInput,
  SEOSettings,
} from './types'

const PAGE_SORT_COLUMNS: Record<string, string> = {
  created_at: 'created_at',
  updated_at: 'updated_at',
  published_at: 'published_at',
  title: 'title',
  status: 'status',
  slug: 'slug',
}

export async function getPages(filters: PageFilters): Promise<{ rows: LandingPageRow[]; totalCount: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  if (filters.search) {
    paramIndex++
    conditions.push(`(title ILIKE $${paramIndex} OR slug ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
  }
  if (filters.status) {
    paramIndex++
    conditions.push(`status = $${paramIndex}::page_status`)
    values.push(filters.status)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sortCol = PAGE_SORT_COLUMNS[filters.sort] || 'created_at'
  const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

  const dataResult = await sql.query(
    `SELECT id, slug, title, description, status, published_at, scheduled_at,
            jsonb_array_length(COALESCE(blocks, '[]'::jsonb)) as block_count,
            created_at, updated_at
     FROM landing_pages
     ${whereClause}
     ORDER BY ${sortCol} ${sortDir} NULLS LAST
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM landing_pages ${whereClause}`,
    countValues,
  )

  return {
    rows: dataResult.rows as LandingPageRow[],
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

export async function getPageById(id: string): Promise<LandingPage | null> {
  const result = await sql<LandingPage>`
    SELECT id, slug, title, description, status, published_at, scheduled_at,
           blocks, meta_title, meta_description, og_image_url, canonical_url,
           structured_data, created_at, updated_at
    FROM landing_pages
    WHERE id = ${id}
  `
  if (!result.rows[0]) return null

  // Parse blocks JSON if it's a string
  const page = result.rows[0]
  if (typeof page.blocks === 'string') {
    page.blocks = JSON.parse(page.blocks)
  }
  if (!page.blocks) page.blocks = []
  if (typeof page.structured_data === 'string') {
    page.structured_data = JSON.parse(page.structured_data)
  }

  return page
}

export async function getPageBySlug(slug: string): Promise<LandingPage | null> {
  const result = await sql<LandingPage>`
    SELECT id, slug, title, description, status, published_at, scheduled_at,
           blocks, meta_title, meta_description, og_image_url, canonical_url,
           structured_data, created_at, updated_at
    FROM landing_pages
    WHERE slug = ${slug}
  `
  if (!result.rows[0]) return null

  const page = result.rows[0]
  if (typeof page.blocks === 'string') {
    page.blocks = JSON.parse(page.blocks)
  }
  if (!page.blocks) page.blocks = []
  if (typeof page.structured_data === 'string') {
    page.structured_data = JSON.parse(page.structured_data)
  }

  return page
}

export async function createPage(input: CreatePageInput): Promise<LandingPage> {
  const publishedAt = input.status === 'published' ? new Date().toISOString() : null
  const blocks = input.blocks || []
  const structuredData = input.structured_data || null

  const result = await sql<LandingPage>`
    INSERT INTO landing_pages (
      slug, title, description, status, published_at, scheduled_at,
      blocks, meta_title, meta_description, og_image_url, canonical_url, structured_data
    ) VALUES (
      ${input.slug}, ${input.title}, ${input.description || null},
      ${input.status}::page_status, ${publishedAt}::timestamptz,
      ${input.scheduled_at || null}::timestamptz,
      ${JSON.stringify(blocks)}::jsonb, ${input.meta_title || null},
      ${input.meta_description || null}, ${input.og_image_url || null},
      ${input.canonical_url || null}, ${structuredData ? JSON.stringify(structuredData) : null}::jsonb
    )
    RETURNING id, slug, title, description, status, published_at, scheduled_at,
              blocks, meta_title, meta_description, og_image_url, canonical_url,
              structured_data, created_at, updated_at
  `

  const page = result.rows[0]
  if (!page) throw new Error('Failed to create page')
  if (typeof page.blocks === 'string') page.blocks = JSON.parse(page.blocks)
  if (!page.blocks) page.blocks = []
  if (typeof page.structured_data === 'string') page.structured_data = JSON.parse(page.structured_data)

  return page
}

export async function updatePage(input: UpdatePageInput): Promise<LandingPage | null> {
  const current = await getPageById(input.id)
  if (!current) return null

  const slug = input.slug ?? current.slug
  const title = input.title ?? current.title
  const description = input.description !== undefined ? input.description : current.description
  const status = input.status ?? current.status
  const scheduledAt = input.scheduled_at !== undefined ? input.scheduled_at : current.scheduled_at
  const blocks = input.blocks ?? current.blocks
  const metaTitle = input.meta_title !== undefined ? input.meta_title : current.meta_title
  const metaDescription = input.meta_description !== undefined ? input.meta_description : current.meta_description
  const ogImageUrl = input.og_image_url !== undefined ? input.og_image_url : current.og_image_url
  const canonicalUrl = input.canonical_url !== undefined ? input.canonical_url : current.canonical_url
  const structuredData = input.structured_data !== undefined ? input.structured_data : current.structured_data

  // Update published_at if transitioning to published
  let publishedAt = current.published_at
  if (status === 'published' && current.status !== 'published') {
    publishedAt = new Date().toISOString()
  }

  const result = await sql<LandingPage>`
    UPDATE landing_pages SET
      slug = ${slug}, title = ${title}, description = ${description},
      status = ${status}::page_status, published_at = ${publishedAt}::timestamptz,
      scheduled_at = ${scheduledAt}::timestamptz, blocks = ${JSON.stringify(blocks)}::jsonb,
      meta_title = ${metaTitle}, meta_description = ${metaDescription},
      og_image_url = ${ogImageUrl}, canonical_url = ${canonicalUrl},
      structured_data = ${structuredData ? JSON.stringify(structuredData) : null}::jsonb,
      updated_at = NOW()
    WHERE id = ${input.id}
    RETURNING id, slug, title, description, status, published_at, scheduled_at,
              blocks, meta_title, meta_description, og_image_url, canonical_url,
              structured_data, created_at, updated_at
  `

  if (!result.rows[0]) return null

  const page = result.rows[0]
  if (typeof page.blocks === 'string') page.blocks = JSON.parse(page.blocks)
  if (!page.blocks) page.blocks = []
  if (typeof page.structured_data === 'string') page.structured_data = JSON.parse(page.structured_data)

  return page
}

export async function deletePage(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM landing_pages WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

// Block operations

export async function updatePageBlocks(pageId: string, blocks: Block[]): Promise<LandingPage | null> {
  const result = await sql<LandingPage>`
    UPDATE landing_pages SET
      blocks = ${JSON.stringify(blocks)}::jsonb,
      updated_at = NOW()
    WHERE id = ${pageId}
    RETURNING id, slug, title, description, status, published_at, scheduled_at,
              blocks, meta_title, meta_description, og_image_url, canonical_url,
              structured_data, created_at, updated_at
  `

  if (!result.rows[0]) return null

  const page = result.rows[0]
  if (typeof page.blocks === 'string') page.blocks = JSON.parse(page.blocks)
  if (!page.blocks) page.blocks = []
  if (typeof page.structured_data === 'string') page.structured_data = JSON.parse(page.structured_data)

  return page
}

// SEO Settings operations

export async function getSEOSettings(): Promise<SEOSettings | null> {
  const result = await sql<SEOSettings>`
    SELECT default_title_template, default_description, site_name,
           og_default_image, twitter_handle, google_site_verification,
           bing_site_verification, robots_txt, sitemap_enabled
    FROM seo_settings
    LIMIT 1
  `
  return result.rows[0] || null
}

export async function updateSEOSettings(settings: Partial<SEOSettings>): Promise<SEOSettings> {
  const current = await getSEOSettings()

  if (!current) {
    // Insert new settings
    const result = await sql<SEOSettings>`
      INSERT INTO seo_settings (
        default_title_template, default_description, site_name,
        og_default_image, twitter_handle, google_site_verification,
        bing_site_verification, robots_txt, sitemap_enabled
      ) VALUES (
        ${settings.default_title_template || '%s | Brand'},
        ${settings.default_description || ''},
        ${settings.site_name || 'Brand'},
        ${settings.og_default_image || null},
        ${settings.twitter_handle || null},
        ${settings.google_site_verification || null},
        ${settings.bing_site_verification || null},
        ${settings.robots_txt || 'User-agent: *\nAllow: /'},
        ${settings.sitemap_enabled ?? true}
      )
      RETURNING default_title_template, default_description, site_name,
                og_default_image, twitter_handle, google_site_verification,
                bing_site_verification, robots_txt, sitemap_enabled
    `
    return result.rows[0]!
  }

  const result = await sql<SEOSettings>`
    UPDATE seo_settings SET
      default_title_template = ${settings.default_title_template ?? current.default_title_template},
      default_description = ${settings.default_description ?? current.default_description},
      site_name = ${settings.site_name ?? current.site_name},
      og_default_image = ${settings.og_default_image !== undefined ? settings.og_default_image : current.og_default_image},
      twitter_handle = ${settings.twitter_handle !== undefined ? settings.twitter_handle : current.twitter_handle},
      google_site_verification = ${settings.google_site_verification !== undefined ? settings.google_site_verification : current.google_site_verification},
      bing_site_verification = ${settings.bing_site_verification !== undefined ? settings.bing_site_verification : current.bing_site_verification},
      robots_txt = ${settings.robots_txt ?? current.robots_txt},
      sitemap_enabled = ${settings.sitemap_enabled ?? current.sitemap_enabled}
    RETURNING default_title_template, default_description, site_name,
              og_default_image, twitter_handle, google_site_verification,
              bing_site_verification, robots_txt, sitemap_enabled
  `
  return result.rows[0]!
}
