import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

/**
 * POST /api/contact
 * Handles contact form submissions
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContactFormData

    // Validate required fields
    if (!body.name || !body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    // For MVP, just log the submission
    // In production, this would save to database with tenant context and/or send email
    logger.info('Contact form submission:', {
      name: body.name,
      email: body.email,
      subject: body.subject,
      message: body.message,
      timestamp: new Date().toISOString(),
    })

    // Database integration will be added with tenant context

    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
    })
  } catch (error) {
    logger.error('Contact form error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit contact form',
      },
      { status: 500 }
    )
  }
}
