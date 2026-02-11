export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getCreators,
  getCreatorsByStage,
  getCreatorsDirectory,
  createCreator,
  getAllCreatorTags,
} from '@/lib/creators/db'
import type { CreatorProfile } from '@/lib/creators/types'
import { CREATOR_STATUSES, CREATOR_TIERS } from '@/lib/creators/types'
import { parseCreatorFilters, parseCreatorDirectoryFilters } from '@/lib/search-params'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const view = url.searchParams.get('view')

  // Pipeline view (Kanban)
  if (view === 'pipeline') {
    const stages = await getCreatorsByStage(tenantSlug)
    return NextResponse.json({ stages })
  }

  // Tags list for filters
  if (view === 'tags') {
    const tags = await getAllCreatorTags(tenantSlug)
    return NextResponse.json({ tags })
  }

  const params: Record<string, string | string[] | undefined> = {}
  url.searchParams.forEach((value, key) => {
    const existing = params[key]
    if (existing) {
      if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        params[key] = [existing, value]
      }
    } else {
      params[key] = value
    }
  })

  // Check if directory view (has tags or date filters)
  const hasDirectoryFilters =
    params.tags || params.dateFrom || params.dateTo || params.dateField

  if (hasDirectoryFilters) {
    const filters = parseCreatorDirectoryFilters(params as Record<string, string | undefined>)
    const { rows, totalCount } = await getCreatorsDirectory(tenantSlug, filters)

    return NextResponse.json({
      creators: rows,
      totalCount,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(totalCount / filters.limit),
    })
  }

  // Basic filters
  const filters = parseCreatorFilters(params as Record<string, string | undefined>)
  const { rows, totalCount } = await getCreators(tenantSlug, filters)

  return NextResponse.json({
    creators: rows,
    totalCount,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(totalCount / filters.limit),
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: Partial<CreatorProfile>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.email || !body.first_name || !body.last_name) {
    return NextResponse.json(
      { error: 'Email, first name, and last name are required' },
      { status: 400 },
    )
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  // Validate status
  if (body.status && !CREATOR_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${CREATOR_STATUSES.join(', ')}` },
      { status: 400 },
    )
  }

  // Validate tier
  if (body.tier && !CREATOR_TIERS.includes(body.tier)) {
    return NextResponse.json(
      { error: `Invalid tier. Must be one of: ${CREATOR_TIERS.join(', ')}` },
      { status: 400 },
    )
  }

  // Validate commission percent
  const commissionPercent = body.commission_percent ?? 10
  if (commissionPercent < 0 || commissionPercent > 100) {
    return NextResponse.json(
      { error: 'Commission percent must be between 0 and 100' },
      { status: 400 },
    )
  }

  const creatorData: CreatorProfile = {
    email: body.email,
    first_name: body.first_name,
    last_name: body.last_name,
    display_name: body.display_name || null,
    phone: body.phone || null,
    bio: body.bio || null,
    status: body.status || 'applied',
    tier: body.tier || null,
    commission_percent: commissionPercent,
    discount_code: body.discount_code || null,
    tags: body.tags || [],
    social_links: body.social_links || null,
    internal_notes: body.internal_notes || null,
  }

  try {
    const creator = await createCreator(tenantSlug, creatorData)

    if (!creator) {
      return NextResponse.json({ error: 'Failed to create creator' }, { status: 500 })
    }

    return NextResponse.json({ success: true, creator }, { status: 201 })
  } catch (error) {
    // Check for duplicate email error
    if (error instanceof Error && error.message.includes('duplicate')) {
      return NextResponse.json(
        { error: 'A creator with this email already exists' },
        { status: 409 },
      )
    }
    throw error
  }
}
