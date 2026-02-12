/**
 * Teleprompter Script API (single script)
 *
 * GET /api/admin/videos/scripts/[id] - Get script
 * PATCH /api/admin/videos/scripts/[id] - Update script
 * DELETE /api/admin/videos/scripts/[id] - Delete script
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  deleteScript,
  duplicateScript,
  getScript,
  updateScript,
  validateScriptInput,
  type UpdateScriptInput,
} from '@cgk/video/creator-tools'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params
  const script = await getScript(tenantSlug, id)

  if (!script) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 })
  }

  return NextResponse.json({ script })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = await params

  let body: UpdateScriptInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = validateScriptInput(body)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 })
  }

  const script = await updateScript(tenantSlug, userId, id, body)

  if (!script) {
    return NextResponse.json({ error: 'Script not found or not owned by user' }, { status: 404 })
  }

  return NextResponse.json({ script })
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = await params

  // Check for duplicate action
  const url = new URL(request.url)
  if (url.searchParams.get('action') === 'duplicate') {
    const newTitle = url.searchParams.get('title') || undefined
    const duplicated = await duplicateScript(tenantSlug, userId, id, newTitle)

    if (!duplicated) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    return NextResponse.json({ script: duplicated }, { status: 201 })
  }

  const deleted = await deleteScript(tenantSlug, userId, id)

  if (!deleted) {
    return NextResponse.json({ error: 'Script not found or not owned by user' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
