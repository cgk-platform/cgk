export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSurveys, createSurvey } from '@/lib/surveys'
import type { SurveyFilters, CreateSurveyInput } from '@/lib/surveys'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const filters: SurveyFilters = {
    page: Math.max(1, parseInt(url.searchParams.get('page') || '1', 10)),
    limit: Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10))),
    offset: 0,
    status: (url.searchParams.get('status') as SurveyFilters['status']) || 'all',
    type: (url.searchParams.get('type') as SurveyFilters['type']) || undefined,
    search: url.searchParams.get('search') || undefined,
  }
  filters.offset = (filters.page - 1) * filters.limit

  const result = await getSurveys(tenantSlug, filters)

  return NextResponse.json({
    surveys: result.rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalCount: result.totalCount,
      totalPages: Math.ceil(result.totalCount / filters.limit),
    },
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateSurveyInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name || !body.slug || !body.title) {
    return NextResponse.json(
      { error: 'Missing required fields: name, slug, title' },
      { status: 400 },
    )
  }

  try {
    const survey = await createSurvey(tenantSlug, body, userId || undefined)
    return NextResponse.json({ survey }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json({ error: 'Survey slug already exists' }, { status: 409 })
    }
    throw error
  }
}
