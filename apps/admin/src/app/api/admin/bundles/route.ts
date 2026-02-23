export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { createBundle, getBundles } from '@/lib/bundles/db'
import type { CreateBundleInput } from '@/lib/bundles/types'

/**
 * GET /api/admin/bundles
 * List bundle configurations
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const status = searchParams.get('status') || undefined

  try {
    const result = await getBundles(tenantSlug, { status, limit, offset })

    return NextResponse.json({
      bundles: result.bundles,
      totalCount: result.totalCount,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching bundles:', error)
    return NextResponse.json({ error: 'Failed to fetch bundles' }, { status: 500 })
  }
}

/**
 * POST /api/admin/bundles
 * Create a new bundle configuration
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id') || undefined

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateBundleInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  try {
    const bundle = await createBundle(tenantSlug, body, userId)
    return NextResponse.json({ bundle }, { status: 201 })
  } catch (error) {
    console.error('Error creating bundle:', error)
    return NextResponse.json({ error: 'Failed to create bundle' }, { status: 500 })
  }
}
