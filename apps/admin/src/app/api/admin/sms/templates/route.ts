export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createSmsTemplate,
  listSmsTemplates,
  SMS_NOTIFICATION_TYPES,
} from '@cgk/communications'

/**
 * GET /api/admin/sms/templates
 * List all SMS templates
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const templates = await listSmsTemplates(tenantSlug)

  // Add notification type metadata
  const templatesWithMeta = templates.map((template) => {
    const typeMeta = SMS_NOTIFICATION_TYPES.find((t) => t.type === template.notificationType)
    return {
      ...template,
      typeName: typeMeta?.name || template.notificationType,
      smsRecommended: typeMeta?.smsRecommended || false,
    }
  })

  return NextResponse.json({
    templates: templatesWithMeta,
    notificationTypes: SMS_NOTIFICATION_TYPES,
  })
}

/**
 * POST /api/admin/sms/templates
 * Create a new SMS template
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()
  const { notificationType, content, availableVariables, shortenLinks } = body

  if (!notificationType || !content) {
    return NextResponse.json(
      { error: 'Notification type and content are required' },
      { status: 400 }
    )
  }

  // Validate content length
  if (content.length > 1600) {
    return NextResponse.json(
      { error: 'Content exceeds maximum length (1600 characters)' },
      { status: 400 }
    )
  }

  const template = await createSmsTemplate({
    tenantId: tenantSlug,
    notificationType,
    content,
    availableVariables: availableVariables || [],
    shortenLinks: shortenLinks ?? true,
  })

  return NextResponse.json({ template }, { status: 201 })
}
