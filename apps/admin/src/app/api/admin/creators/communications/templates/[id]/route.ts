export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  deleteTemplate,
  getTemplateById,
  getTemplateVersions,
  restoreTemplateVersion,
  updateTemplate,
} from '@/lib/creator-communications/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const template = await getTemplateById(tenantSlug, id)
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const versions = await getTemplateVersions(tenantSlug, id)

  return NextResponse.json({ template, versions })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()

  const template = await updateTemplate(tenantSlug, id, body, userId)
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, template })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const deleted = await deleteTemplate(tenantSlug, id)
  if (!deleted) {
    return NextResponse.json(
      { error: 'Template not found or cannot be deleted (default templates are protected)' },
      { status: 400 },
    )
  }

  return NextResponse.json({ success: true })
}

// Restore version endpoint
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()
  const { action, versionId } = body

  if (action === 'restore' && versionId) {
    const template = await restoreTemplateVersion(tenantSlug, id, versionId, userId)
    if (!template) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, template })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
