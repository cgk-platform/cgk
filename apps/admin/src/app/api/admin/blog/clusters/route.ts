export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getClusters, createCluster } from '@/lib/blog/clusters-db'
import type { CreateClusterInput } from '@/lib/blog/types'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const clusters = await withTenant(tenantSlug, () => getClusters())

  return NextResponse.json({ clusters })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateClusterInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name || !body.slug) {
    return NextResponse.json(
      { error: 'Missing required fields: name, slug' },
      { status: 400 }
    )
  }

  const validColors = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'orange', 'teal']
  if (body.color && !validColors.includes(body.color)) {
    return NextResponse.json(
      { error: `Invalid color. Must be one of: ${validColors.join(', ')}` },
      { status: 400 }
    )
  }

  const cluster = await withTenant(tenantSlug, () => createCluster(body))

  return NextResponse.json({ cluster }, { status: 201 })
}
