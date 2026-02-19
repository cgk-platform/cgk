export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { sql } from '@cgk-platform/db'
import {
  getTenantResendClient,
  getTenantResendSenderConfig,
} from '@cgk-platform/integrations'

import { updateApplicationStatus, getApplicationById } from '@/lib/creators-admin-ops'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const {
      commissionPercent,
      discountCode,
      notes,
      sendNotification,
    } = body as {
      commissionPercent?: number
      discountCode?: string
      notes?: string
      sendNotification?: boolean
    }

    // Fetch application from tenant schema
    const application = await getApplicationById(tenantSlug, id)
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Generate discount code if not provided
    const finalCode = discountCode || generateDiscountCode(application.name)

    // Create creator record in PUBLIC schema (creators table uses UUID, name field)
    const creatorResult = await sql`
      INSERT INTO creators (
        email, name, phone, status
      ) VALUES (
        ${application.email},
        ${application.name},
        ${application.phone || null},
        'active'::creator_status
      )
      ON CONFLICT (email) DO UPDATE SET
        status = 'active'::creator_status,
        updated_at = NOW()
      RETURNING id
    `

    const creatorRow = creatorResult.rows[0]
    if (!creatorRow) {
      return NextResponse.json(
        { error: 'Failed to create creator record' },
        { status: 500 }
      )
    }
    const creatorId = creatorRow.id as string

    // Create brand membership in PUBLIC schema (creator_brand_memberships)
    await sql`
      INSERT INTO creator_brand_memberships (
        creator_id, organization_id, status,
        commission_percent, discount_code
      ) VALUES (
        ${creatorId}::uuid,
        ${tenantId}::uuid,
        'active'::creator_membership_status,
        ${commissionPercent || 15},
        ${finalCode}
      )
      ON CONFLICT (creator_id, organization_id) DO UPDATE SET
        status = 'active'::creator_membership_status,
        commission_percent = ${commissionPercent || 15},
        discount_code = ${finalCode},
        updated_at = NOW()
    `

    // Update application status in tenant schema
    await updateApplicationStatus(tenantSlug, id, 'approved', userId, {
      internalNotes: notes,
      creatorId,
    })

    // Send notification email with magic link for password setup
    let notificationSent = false
    if (sendNotification && application.email) {
      try {
        // Create a magic link token for the creator to set up their password
        const { createMagicLink } = await import('@cgk-platform/auth')
        const magicToken = await createMagicLink(application.email, 'signup')

        const portalUrl =
          process.env.NEXT_PUBLIC_CREATOR_PORTAL_URL ||
          'https://creators.cgk.com'
        const setupUrl = `${portalUrl}/auth/verify?token=${encodeURIComponent(magicToken)}&email=${encodeURIComponent(application.email)}`

        const resend = await getTenantResendClient(tenantSlug)
        if (resend) {
          const senderConfig = await getTenantResendSenderConfig(tenantSlug)
          const fromEmail = senderConfig?.from || `noreply@${tenantSlug}.com`

          await resend.emails.send({
            from: fromEmail,
            to: application.email,
            replyTo: senderConfig?.replyTo,
            subject: 'Welcome! Your creator application has been approved',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to the team, ${application.name.split(' ')[0] || application.name}!</h2>
                <p>Great news! Your creator application has been approved.</p>
                <p>Here are your details:</p>
                <ul>
                  <li><strong>Discount Code:</strong> ${finalCode}</li>
                  <li><strong>Commission Rate:</strong> ${commissionPercent || 15}%</li>
                </ul>
                <p style="margin: 24px 0;">
                  <a href="${setupUrl}"
                     style="background-color: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Set Up Your Account
                  </a>
                </p>
                <p>Click the button above to set your password and access the Creator Portal.</p>
                <p style="color: #666; font-size: 14px;">
                  This link expires in 24 hours. If you have any questions, reply to this email.
                </p>
              </div>
            `,
          })
          notificationSent = true
        } else {
          // Log magic link in dev mode
          console.log(`[DEV] Creator setup link for ${application.email}: ${setupUrl}`)
          notificationSent = true
        }
      } catch (emailError) {
        console.error('Failed to send approval notification email:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      creatorId,
      notificationSent,
    })
  } catch (error) {
    console.error('Error approving application:', error)
    return NextResponse.json(
      { error: 'Failed to approve application' },
      { status: 500 }
    )
  }
}

function generateDiscountCode(name: string): string {
  const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 6)
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0')
  return `${cleanName}${random}`
}
