export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  calculateSegmentCount,
  deleteSmsTemplate,
  getSmsTemplateByType,
  previewSmsTemplate,
  updateSmsTemplate,
} from '@cgk/communications'

interface RouteParams {
  params: Promise<{ type: string }>
}

/**
 * GET /api/admin/sms/templates/[type]
 * Get an SMS template by notification type
 */
export async function GET(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { type } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const template = await getSmsTemplateByType(tenantSlug, type)

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Get preview with sample data
  const preview = previewSmsTemplate(template.content, type)

  return NextResponse.json({
    template,
    preview,
  })
}

/**
 * PATCH /api/admin/sms/templates/[type]
 * Update an SMS template
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { type } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const template = await getSmsTemplateByType(tenantSlug, type)

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const body = await request.json()
  const { content, availableVariables, shortenLinks } = body

  // Validate content if provided
  if (content !== undefined) {
    if (content.length > 1600) {
      return NextResponse.json(
        { error: 'Content exceeds maximum length (1600 characters)' },
        { status: 400 }
      )
    }

    // Calculate segment info for response
    const segmentInfo = calculateSegmentCount(content)
    if (segmentInfo.segmentCount > 10) {
      return NextResponse.json(
        { error: 'Content would require too many SMS segments (max 10)' },
        { status: 400 }
      )
    }
  }

  const updated = await updateSmsTemplate(tenantSlug, template.id, {
    content,
    availableVariables,
    shortenLinks,
  })

  if (!updated) {
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }

  // Get updated preview
  const preview = previewSmsTemplate(updated.content, type)

  return NextResponse.json({
    template: updated,
    preview,
  })
}

/**
 * DELETE /api/admin/sms/templates/[type]
 * Delete an SMS template
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { type } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const template = await getSmsTemplateByType(tenantSlug, type)

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const deleted = await deleteSmsTemplate(tenantSlug, template.id)

  if (!deleted) {
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
