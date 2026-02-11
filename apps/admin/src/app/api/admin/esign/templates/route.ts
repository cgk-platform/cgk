/**
 * E-Signature Templates API
 *
 * GET /api/admin/esign/templates - List templates
 */

import { getTenantContext } from '@cgk/auth'
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
