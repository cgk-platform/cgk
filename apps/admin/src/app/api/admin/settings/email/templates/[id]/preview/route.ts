export const dynamic = 'force-dynamic'

import {
  getTemplateById,
  previewTemplate,
  getSampleDataForType,
} from '@cgk-platform/communications'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/settings/email/templates/[id]/preview
 *
 * Preview a template with variables
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Get the template
  const template = await getTemplateById(tenantSlug, id)

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  let body: { variables?: Record<string, string | number>; useSampleData?: boolean }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  // Get brand variables for tenant
  const brandVariables: Record<string, string> = {
    brandName: tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1),
    supportEmail: `support@${tenantSlug}.com`,
    websiteUrl: `https://${tenantSlug}.com`,
    unsubscribeUrl: `https://${tenantSlug}.com/unsubscribe`,
    currentYear: new Date().getFullYear().toString(),
  }

  // Use sample data if requested or no variables provided
  let variables = body.variables || {}

  if (body.useSampleData || Object.keys(variables).length === 0) {
    const sampleData = getSampleDataForType(template.notificationType)
    variables = { ...sampleData, ...variables }
  }

  // Merge with brand variables
  const allVariables = { ...brandVariables, ...variables }

  // Preview the template
  const preview = previewTemplate({
    subject: template.subject,
    bodyHtml: template.bodyHtml,
    variables: allVariables,
  })

  return NextResponse.json({
    preview: {
      subject: preview.subject,
      bodyHtml: preview.bodyHtml,
      bodyText: preview.bodyText,
    },
    variables: allVariables,
  })
}
