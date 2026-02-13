/**
 * E-Signature Template Detail API
 *
 * GET /api/admin/esign/templates/[id] - Get template with fields
 * POST /api/admin/esign/templates/[id]/duplicate - Duplicate template
 * DELETE /api/admin/esign/templates/[id] - Archive template
 */

import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'
import {
  getTemplateWithFields,
  getTemplateStats,
  duplicateTemplate,
  archiveTemplate,
  activateTemplate,
} from '@/lib/esign'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantContext(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id } = await params
    const template = await getTemplateWithFields(tenantId, id)

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const stats = await getTemplateStats(tenantId, id)

    return NextResponse.json({
      template,
      stats,
    })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'duplicate') {
      const body = await request.json()
      const { name } = body

      if (!name) {
        return NextResponse.json({ error: 'Name required' }, { status: 400 })
      }

      const newTemplate = await duplicateTemplate(auth.tenantId, id, name, auth.userId)

      if (!newTemplate) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      return NextResponse.json({ template: newTemplate })
    }

    if (action === 'activate') {
      const success = await activateTemplate(auth.tenantId, id)
      return NextResponse.json({ success })
    }

    if (action === 'archive') {
      const success = await archiveTemplate(auth.tenantId, id)
      return NextResponse.json({ success })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Error with template action:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id } = await params
    const success = await archiveTemplate(auth.tenantId, id)

    if (!success) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error archiving template:', error)
    return NextResponse.json(
      { error: 'Failed to archive template' },
      { status: 500 }
    )
  }
}
