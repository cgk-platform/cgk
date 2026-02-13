export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getClusterById,
  updateCluster,
  deleteCluster,
  addPostToCluster,
  removePostFromCluster,
} from '@/lib/blog/clusters-db'
import type { UpdateClusterInput } from '@/lib/blog/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const cluster = await withTenant(tenantSlug, () => getClusterById(id))

  if (!cluster) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
  }

  return NextResponse.json({ cluster })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: Partial<UpdateClusterInput>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validColors = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'orange', 'teal']
  if (body.color && !validColors.includes(body.color)) {
    return NextResponse.json(
      { error: `Invalid color. Must be one of: ${validColors.join(', ')}` },
      { status: 400 }
    )
  }

  const cluster = await withTenant(tenantSlug, () =>
    updateCluster({ ...body, id })
  )

  if (!cluster) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
  }

  return NextResponse.json({ cluster })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const deleted = await withTenant(tenantSlug, () => deleteCluster(id))

  if (!deleted) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id: clusterId } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { action: string; postId: string; role?: 'pillar' | 'spoke' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.action || !body.postId) {
    return NextResponse.json(
      { error: 'Missing required fields: action, postId' },
      { status: 400 }
    )
  }

  if (body.action === 'add-post') {
    const role = body.role || 'spoke'
    if (role !== 'pillar' && role !== 'spoke') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "pillar" or "spoke"' },
        { status: 400 }
      )
    }

    const association = await withTenant(tenantSlug, () =>
      addPostToCluster(body.postId, clusterId, role)
    )

    return NextResponse.json({ association })
  }

  if (body.action === 'remove-post') {
    const removed = await withTenant(tenantSlug, () =>
      removePostFromCluster(body.postId, clusterId)
    )

    if (!removed) {
      return NextResponse.json(
        { error: 'Post not in cluster' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
