import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { withTenant } from '@cgk-platform/db'
import { getTenantSlug } from '@/lib/tenant'
import { logger } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface NewsletterSubscribeRequest {
  email: string
}

export async function POST(request: NextRequest) {
  try {
    const tenantSlug = await getTenantSlug()

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    const body = (await request.json()) as NewsletterSubscribeRequest

    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const email = body.email.toLowerCase().trim()

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Store newsletter subscription in tenant schema
    await withTenant(tenantSlug, async () => {
      // Check if email already exists
      const existingSubscriber = await sql`
        SELECT id FROM newsletter_subscribers
        WHERE email = ${email}
        LIMIT 1
      `

      if (existingSubscriber.rows.length > 0) {
        // Update subscription status if previously unsubscribed
        await sql`
          UPDATE newsletter_subscribers
          SET subscribed = true, updated_at = NOW()
          WHERE email = ${email}
        `
      } else {
        // Insert new subscriber
        await sql`
          INSERT INTO newsletter_subscribers (email, subscribed, source, created_at, updated_at)
          VALUES (${email}, true, 'footer_form', NOW(), NOW())
        `
      }
    })

    // TODO: Integrate with email service provider (Klaviyo, Mailchimp, etc.)
    // await klaviyoClient.subscribe(email, tenantSlug)

    return NextResponse.json({ success: true, message: 'Successfully subscribed to newsletter' })
  } catch (error) {
    logger.error('Newsletter subscription error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again later.' },
      { status: 500 }
    )
  }
}
