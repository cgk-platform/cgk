export const dynamic = 'force-dynamic'

import { createTicket } from '@cgk/support'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/support/tickets
 * Public endpoint for creating tickets from forms
 * No authentication required - used for customer-facing forms
 */
export async function POST(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const input = body as {
    subject?: string
    description?: string
    customerEmail?: string
    customerName?: string
    priority?: string
  }

  // Validate required fields
  if (!input.subject || !input.description || !input.customerEmail) {
    return NextResponse.json(
      { error: 'Missing required fields: subject, description, customerEmail' },
      { status: 400 }
    )
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(input.customerEmail)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    )
  }

  // Sanitize and limit input lengths
  const sanitizedSubject = input.subject.slice(0, 500)
  const sanitizedDescription = input.description.slice(0, 10000)
  const sanitizedName = input.customerName?.slice(0, 255)

  try {
    const ticket = await createTicket(
      tenantId,
      {
        subject: sanitizedSubject,
        description: sanitizedDescription,
        priority: (input.priority as 'low' | 'normal' | 'high' | 'urgent') || 'normal',
        channel: 'form',
        customerEmail: input.customerEmail.toLowerCase(),
        customerName: sanitizedName,
      },
      undefined, // No actor for public submissions
      'Customer Form',
      true // Run sentiment analysis
    )

    // Return limited info for public response
    return NextResponse.json(
      {
        ticketNumber: ticket.ticketNumber,
        message: 'Your support request has been submitted. You will receive a confirmation email shortly.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating ticket from form:', error)
    return NextResponse.json(
      { error: 'Failed to submit support request. Please try again.' },
      { status: 500 }
    )
  }
}
