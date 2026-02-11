export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCreator, updateCreator, getCreatorProjects, getCreatorEarnings } from '@/lib/creators/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const creator = await getCreator(tenantSlug, id)
  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  }

  const [projects, earnings] = await Promise.all([
    getCreatorProjects(tenantSlug, id),
    getCreatorEarnings(tenantSlug, id),
  ])

  return NextResponse.json({ creator, projects, earnings })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { notes?: string; tags?: string[]; tier?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: { notes?: string; tags?: string[]; tier?: 'bronze' | 'silver' | 'gold' | 'platinum' } = {}

  if (body.notes !== undefined) {
    updates.notes = body.notes
  }
  if (body.tags !== undefined) {
    updates.tags = body.tags
  }
  if (body.tier !== undefined) {
    const validTiers = ['bronze', 'silver', 'gold', 'platinum']
    if (!validTiers.includes(body.tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }
    updates.tier = body.tier as 'bronze' | 'silver' | 'gold' | 'platinum'
  }

  const success = await updateCreator(tenantSlug, id, updates)
  if (!success) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
