export const dynamic = 'force-dynamic'

import {
  getTemplateLibrary,
  searchTemplates,
  filterTemplatesByStatus,
  type TemplateLibraryCategory,
  type TemplateLibraryItem,
  type TemplateLibraryResponse,
} from '@cgk/communications'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/templates
 *
 * Get all templates aggregated by category for the template library.
 * Supports filtering by status (all, custom, default) and search.
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const search = url.searchParams.get('search')
  const status = url.searchParams.get('status') as
    | 'all'
    | 'custom'
    | 'default'
    | null
  const category = url.searchParams.get('category')

  try {
    // Handle search
    if (search && search.trim()) {
      const results = await searchTemplates(tenantSlug, search.trim())
      return NextResponse.json({
        templates: results,
        isSearchResult: true,
      })
    }

    // Handle status filter
    if (status && status !== 'all') {
      const categories = await filterTemplatesByStatus(tenantSlug, status)
      return NextResponse.json({
        categories,
        totals: {
          total: categories.reduce((sum: number, c: TemplateLibraryCategory) => sum + c.templates.length, 0),
          custom: status === 'custom' ? categories.reduce((sum: number, c: TemplateLibraryCategory) => sum + c.templates.length, 0) : 0,
          default: status === 'default' ? categories.reduce((sum: number, c: TemplateLibraryCategory) => sum + c.templates.length, 0) : 0,
        },
      } as TemplateLibraryResponse)
    }

    // Get full library
    const library = await getTemplateLibrary(tenantSlug)

    // Filter by category if specified
    if (category) {
      const filtered = library.categories.filter((c: TemplateLibraryCategory) => c.slug === category)
      return NextResponse.json({
        categories: filtered,
        totals: {
          total: filtered.reduce((sum: number, c: TemplateLibraryCategory) => sum + c.templates.length, 0),
          custom: filtered.reduce(
            (sum: number, c: TemplateLibraryCategory) => sum + c.templates.filter((t: TemplateLibraryItem) => t.isCustom).length,
            0
          ),
          default: filtered.reduce(
            (sum: number, c: TemplateLibraryCategory) => sum + c.templates.filter((t: TemplateLibraryItem) => !t.isCustom).length,
            0
          ),
        },
      } as TemplateLibraryResponse)
    }

    return NextResponse.json(library)
  } catch (error) {
    console.error('Error fetching template library:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template library' },
      { status: 500 }
    )
  }
}
