/**
 * GET/POST /api/admin/creator-pipeline/filters
 * Saved filter management
 */

import { headers } from 'next/headers'

import { getSavedFilters, createSavedFilter, getCreatorsForFilter } from '@/lib/pipeline/db'
import type { PipelineFilters } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const [filters, creators] = await Promise.all([
      getSavedFilters(tenantSlug, userId || undefined),
      getCreatorsForFilter(tenantSlug),
    ])

    return Response.json({ filters, creators })
  } catch (error) {
    console.error('Saved filters error:', error)
    return Response.json(
      { error: 'Failed to fetch saved filters' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = (await request.json()) as {
      name: string
      filters: PipelineFilters
      isDefault?: boolean
    }

    if (!body.name) {
      return Response.json({ error: 'name is required' }, { status: 400 })
    }

    if (!body.filters) {
      return Response.json({ error: 'filters object is required' }, { status: 400 })
    }

    const filter = await createSavedFilter(tenantSlug, {
      userId: userId || undefined,
      name: body.name,
      filters: body.filters,
      isDefault: body.isDefault,
    })

    return Response.json({ success: true, filter })
  } catch (error) {
    console.error('Saved filter create error:', error)
    return Response.json(
      { error: 'Failed to create saved filter' },
      { status: 500 }
    )
  }
}
