export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { withTenant, sql } from '@cgk-platform/db'
import {
  getTenantResendClient,
  getTenantResendSenderConfig,
} from '@cgk-platform/integrations'

import { recordOnboardingReminder, getOnboardingConfig } from '@/lib/creators-admin-ops'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const { creatorId } = await params
    const body = await request.json()
    const { stepId } = body as { stepId: string }

    if (!stepId) {
      return NextResponse.json(
        { error: 'stepId is required' },
        { status: 400 }
      )
    }

    // Get creator details
    type CreatorRow = { email: string; first_name: string | null }
    const creator = await withTenant(tenantSlug, async () => {
      const result = await sql`
        SELECT email, first_name FROM creators WHERE id = ${creatorId}
      `
      return result.rows[0] as CreatorRow | undefined
    })

    if (!creator?.email) {
      return NextResponse.json(
        { error: 'Creator not found or has no email' },
        { status: 404 }
      )
    }

    // Get Resend client
    const resend = await getTenantResendClient(tenantSlug)
    if (!resend) {
      return NextResponse.json(
        { error: 'Email not configured for this tenant' },
        { status: 400 }
      )
    }

    // Get onboarding config for step name
    const onboardingConfig = await getOnboardingConfig(tenantSlug)
    const step = onboardingConfig?.steps?.find((s) => s.id === stepId)
    const stepName = step?.name || stepId

    const senderConfig = await getTenantResendSenderConfig(tenantSlug)
    const fromEmail = senderConfig?.from || `noreply@${tenantSlug}.com`
    const portalUrl =
      process.env.NEXT_PUBLIC_CREATOR_PORTAL_URL || 'https://creators.cgk.com'

    // Send reminder email
    try {
      await resend.emails.send({
        from: fromEmail,
        to: creator.email,
        replyTo: senderConfig?.replyTo,
        subject: `Reminder: Complete your onboarding - ${stepName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hi ${creator.first_name || 'there'},</h2>
            <p>This is a friendly reminder to complete the <strong>${stepName}</strong> step in your onboarding process.</p>
            <p>Completing your setup will help you get started faster!</p>
            <p style="margin: 24px 0;">
              <a href="${portalUrl}/onboarding"
                 style="background-color: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Continue Onboarding
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              If you have any questions, feel free to reply to this email.
            </p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send reminder email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send reminder email' },
        { status: 500 }
      )
    }

    // Record the reminder after successful send
    await recordOnboardingReminder(tenantSlug, creatorId, stepId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending reminder:', error)
    return NextResponse.json(
      { error: 'Failed to send reminder' },
      { status: 500 }
    )
  }
}
