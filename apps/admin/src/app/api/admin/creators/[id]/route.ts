export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getCreator,
  updateCreatorFull,
  deleteCreator,
  getCreatorProjects,
  getCreatorEarnings,
} from '@/lib/creators/db'
import type { CreatorProfile } from '@/lib/creators/types'
import { CREATOR_STATUSES, CREATOR_TIERS } from '@/lib/creators/types'

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

  let body: Partial<CreatorProfile>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate status if provided
  if (body.status && !CREATOR_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${CREATOR_STATUSES.join(', ')}` },
      { status: 400 },
    )
  }

  // Validate tier if provided
  if (body.tier && !CREATOR_TIERS.includes(body.tier)) {
    return NextResponse.json(
      { error: `Invalid tier. Must be one of: ${CREATOR_TIERS.join(', ')}` },
      { status: 400 },
    )
  }

  // Validate commission percent if provided
  if (body.commission_percent !== undefined) {
    if (body.commission_percent < 0 || body.commission_percent > 100) {
      return NextResponse.json(
        { error: 'Commission percent must be between 0 and 100' },
        { status: 400 },
      )
    }
  }

  // Validate email format if provided
  if (body.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
  }

  try {
    const creator = await updateCreatorFull(tenantSlug, id, body)

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, creator })
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      return NextResponse.json(
        { error: 'A creator with this email already exists' },
        { status: 409 },
      )
    }
    throw error
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const hard = url.searchParams.get('hard') === 'true'

  const success = await deleteCreator(tenantSlug, id, hard)

  if (!success) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    message: hard ? 'Creator permanently deleted' : 'Creator deactivated',
  })
}
