import { NextResponse } from 'next/server'
import { logger } from '@cgk-platform/logging'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body as {
      name?: string
      email?: string
      subject?: string
      message?: string
    }

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address.' },
        { status: 400 }
      )
    }

    // Log the contact form submission
    // TODO: Wire to tenant's email provider (Resend/SendGrid) when configured
    logger.info(`[Contact Form] From: ${name} <${email}>, Subject: ${subject || 'N/A'}`)

    return NextResponse.json({ success: true, message: 'Message sent successfully.' })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }
}
