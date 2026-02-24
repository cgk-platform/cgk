export const dynamic = 'force-dynamic'

import { checkPermissionOrRespond, requireAuth, type AuthContext } from '@cgk-platform/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { createBundle, getBundles } from '@/lib/bundles/db'
import type { CreateBundleInput } from '@/lib/bundles/types'
import { validateCreateBundle } from '@/lib/bundles/validation'

/**
 * GET /api/admin/bundles
 * List bundle configurations
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantId = headerList.get('x-tenant-id')
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantId || !tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const denied = await checkPermissionOrRespond(auth.userId, tenantId, 'products.view')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 500))
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
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
  const tenantId = headerList.get('x-tenant-id')
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantId || !tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const denied = await checkPermissionOrRespond(auth.userId, tenantId, 'products.sync')
  if (denied) return denied

  let body: CreateBundleInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validationErrors = validateCreateBundle(body)
  if (validationErrors.length > 0) {
    return NextResponse.json({ errors: validationErrors }, { status: 422 })
  }

  try {
    const bundle = await createBundle(tenantSlug, body, auth.userId)
    return NextResponse.json({ bundle }, { status: 201 })
  } catch (error) {
    console.error('Error creating bundle:', error)
    return NextResponse.json({ error: 'Failed to create bundle' }, { status: 500 })
  }
}
