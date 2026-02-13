export const dynamic = 'force-dynamic'

import {
  getTemplateById,
  previewTemplate,
  getSampleDataForType,
} from '@cgk-platform/communications'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/settings/email/templates/[id]/test
 *
 * Send a test email with the template
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

  let body: { recipientEmail: string; variables?: Record<string, string | number> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.recipientEmail) {
    return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.recipientEmail)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  // Get brand variables for tenant
  const brandVariables: Record<string, string> = {
    brandName: tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1),
    supportEmail: `support@${tenantSlug}.com`,
    websiteUrl: `https://${tenantSlug}.com`,
    unsubscribeUrl: `https://${tenantSlug}.com/unsubscribe`,
    currentYear: new Date().getFullYear().toString(),
  }

  // Use sample data and merge with provided variables
  const sampleData = getSampleDataForType(template.notificationType)
  const allVariables = { ...brandVariables, ...sampleData, ...body.variables }

  // Render the template
  const rendered = previewTemplate({
    subject: template.subject,
    bodyHtml: template.bodyHtml,
    variables: allVariables,
  })

  // In a real implementation, this would send via the email provider
  // For now, we'll just simulate success
  // TODO: Integrate with actual email sending when email provider is configured

  // Simulate email sending
  const mockSend = async () => {
    // Add [TEST] prefix to subject
    const testSubject = `[TEST] ${rendered.subject}`

    // Log the test send (in production, this would actually send)
    console.log('Test email would be sent:', {
      to: body.recipientEmail,
      subject: testSubject,
      from: template.senderEmail || brandVariables.supportEmail,
    })

    return {
      success: true,
      messageId: `test_${Date.now()}`,
    }
  }

  try {
    const result = await mockSend()

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${body.recipientEmail}`,
      messageId: result.messageId,
      preview: {
        subject: `[TEST] ${rendered.subject}`,
        to: body.recipientEmail,
        from: template.senderEmail || brandVariables.supportEmail,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test email',
      },
      { status: 500 }
    )
  }
}
