/**
 * Teleprompter Scripts API
 *
 * GET /api/admin/videos/scripts - List user's scripts
 * POST /api/admin/videos/scripts - Create a new script
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createScript,
  listScripts,
  validateScriptInput,
  type CreateScriptInput,
} from '@cgk/video/creator-tools'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const url = new URL(request.url)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const offset = (page - 1) * limit
  const search = url.searchParams.get('search') || undefined

  const result = await listScripts(tenantSlug, userId, { limit, offset, search })

  return NextResponse.json({
    scripts: result.scripts,
    pagination: {
      page,
      limit,
      totalCount: result.totalCount,
      totalPages: Math.ceil(result.totalCount / limit),
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

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: CreateScriptInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = validateScriptInput(body)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 })
  }

  const script = await createScript(tenantSlug, userId, body)

  return NextResponse.json({ script }, { status: 201 })
}
