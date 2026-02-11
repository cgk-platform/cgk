export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCreativeIdeas, createCreativeIdea } from '@/lib/bri/db'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const filters = {
    type: url.searchParams.get('type') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    platform: url.searchParams.get('platform') ?? undefined,
    tag: url.searchParams.get('tag') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
  }

  const ideas = await getCreativeIdeas(tenantSlug, filters)

  return NextResponse.json({ ideas })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()

  const idea = await createCreativeIdea(tenantSlug, {
    title: body.title,
    type: body.type ?? 'hook',
    status: body.status ?? 'draft',
    description: body.description ?? null,
    content: body.content ?? null,
    products: body.products ?? [],
    platforms: body.platforms ?? [],
    formats: body.formats ?? [],
    tags: body.tags ?? [],
    performanceScore: body.performanceScore ?? null,
    bestExample: body.bestExample ?? null,
    notes: body.notes ?? null,
  })

  return NextResponse.json({ idea })
}
