/**
 * E-Signature Templates API
 *
 * GET /api/admin/esign/templates - List templates
 * POST /api/admin/esign/templates - Create template
 */

import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import { createTemplate } from '@cgk-platform/esign'
import { NextResponse } from 'next/server'
import { listTemplates, getTemplateStats, getTemplateFieldCount } from '@/lib/esign'
import type { EsignTemplateStatus } from '@/lib/esign/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantContext(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status') as EsignTemplateStatus | null
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const { templates, total } = await listTemplates(tenantId, {
      status: status || undefined,
      page,
      limit,
    })

    // Enrich with stats
    const templatesWithStats = await Promise.all(
      templates.map(async (template) => {
        const stats = await getTemplateStats(tenantId, template.id)
        const fieldCount = await getTemplateFieldCount(tenantId, template.id)
        return {
          ...template,
          documentCount: stats.documentCount,
          fieldCount,
        }
      })
    )

    return NextResponse.json({
      templates: templatesWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, fileUrl, fileSize, pageCount, thumbnailUrl } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 })
    }

    const template = await createTemplate(auth.tenantId, {
      name: name.trim(),
      description: description?.trim() || undefined,
      file_url: fileUrl,
      file_size: fileSize || undefined,
      page_count: pageCount || undefined,
      thumbnail_url: thumbnailUrl || undefined,
      created_by: auth.userId || auth.email || 'unknown',
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
