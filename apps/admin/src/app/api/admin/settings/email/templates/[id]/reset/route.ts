export const dynamic = 'force-dynamic'

import {
  getTemplateById,
  resetToDefault,
} from '@cgk/communications'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/settings/email/templates/[id]/reset
 *
 * Reset a template to its default content
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Get the current template to find its type and key
  const currentTemplate = await getTemplateById(tenantSlug, id)

  if (!currentTemplate) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const template = await resetToDefault(
    tenantSlug,
    currentTemplate.notificationType,
    currentTemplate.templateKey,
    userId || undefined
  )

  if (!template) {
    return NextResponse.json(
      { error: 'No default template available for this type' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Template reset to default',
    template,
  })
}
