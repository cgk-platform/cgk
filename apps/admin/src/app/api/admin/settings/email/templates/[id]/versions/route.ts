export const dynamic = 'force-dynamic'

import {
  getTemplateVersions,
  restoreVersion,
} from '@cgk-platform/communications'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/settings/email/templates/[id]/versions
 *
 * Get version history for a template
 */
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

  const versions = await getTemplateVersions(tenantSlug, id)

  return NextResponse.json({ versions })
}

/**
 * POST /api/admin/settings/email/templates/[id]/versions
 *
 * Restore a template to a specific version
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { version: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.version !== 'number') {
    return NextResponse.json({ error: 'version is required and must be a number' }, { status: 400 })
  }

  try {
    const template = await restoreVersion(tenantSlug, id, body.version, userId || undefined)

    return NextResponse.json({
      success: true,
      message: `Restored to version ${body.version}`,
      template,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    throw error
  }
}
