export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getEmailTemplate } from '@/lib/reviews/db'

interface TestEmailRequest {
  email: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: TestEmailRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.email || typeof body.email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  const template = await getEmailTemplate(tenantSlug, id)

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Replace template variables with sample data
  const sampleData = {
    '{{customer_name}}': 'John Doe',
    '{{product_name}}': 'Sample Product',
    '{{order_number}}': '#12345',
    '{{review_link}}': 'https://example.com/review/abc123',
    '{{incentive_code}}': 'REVIEW20OFF',
    '{{brand_name}}': 'Your Brand',
  }

  let processedSubject = template.subject
  let processedBody = template.body_html

  for (const [variable, value] of Object.entries(sampleData)) {
    processedSubject = processedSubject.replaceAll(variable, value)
    processedBody = processedBody.replaceAll(variable, value)
  }

  // In production, this would send the email using a service like Resend
  // For now, return the processed template for preview
  console.log(`Test email would be sent to: ${body.email}`)
  console.log(`Subject: ${processedSubject}`)

  return NextResponse.json({
    success: true,
    preview: {
      subject: processedSubject,
      body_html: processedBody,
      sent_to: body.email,
    },
    message: 'Test email preview generated. In production, this would send the email.',
  })
}
