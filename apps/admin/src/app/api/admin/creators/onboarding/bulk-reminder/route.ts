export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { withTenant, sql } from '@cgk-platform/db'
import {
  getTenantResendClient,
  getTenantResendSenderConfig,
} from '@cgk-platform/integrations'

import { recordOnboardingReminder, getOnboardingConfig } from '@/lib/creators-admin-ops'

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { creatorIds, stepId } = body as {
      creatorIds: string[]
      stepId?: string
    }

    if (!Array.isArray(creatorIds) || creatorIds.length === 0) {
      return NextResponse.json(
        { error: 'creatorIds array is required' },
        { status: 400 }
      )
    }

    // Get Resend client and sender config
    const resend = await getTenantResendClient(tenantSlug)
    if (!resend) {
      return NextResponse.json(
        { error: 'Email not configured for this tenant' },
        { status: 400 }
      )
    }

    const senderConfig = await getTenantResendSenderConfig(tenantSlug)
    const fromEmail = senderConfig?.from || `noreply@${tenantSlug}.com`
    const portalUrl =
      process.env.NEXT_PUBLIC_CREATOR_PORTAL_URL || 'https://creators.cgk.com'

    // Get onboarding config for step names
    const onboardingConfig = await getOnboardingConfig(tenantSlug)
    const stepMap = new Map(
      onboardingConfig?.steps?.map((s) => [s.id, s.name]) || []
    )
    const stepName = stepId ? stepMap.get(stepId) || stepId : 'onboarding'

    // Get creator details for all IDs
    type CreatorRow = { id: string; email: string; first_name: string | null }
    const creators = await withTenant(tenantSlug, async () => {
      const idsArray = `{${creatorIds.join(',')}}`
      const result = await sql`
        SELECT id, email, first_name FROM creators
        WHERE id = ANY(${idsArray}::text[])
      `
      return result.rows as CreatorRow[]
    })

    const creatorMap = new Map(creators.map((c) => [c.id, c]))

    let sent = 0
    const errors: string[] = []

    for (const creatorId of creatorIds) {
      const creator = creatorMap.get(creatorId)
      if (!creator?.email) {
        errors.push(`Creator ${creatorId}: No email found`)
        continue
      }

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

        if (stepId) {
          await recordOnboardingReminder(tenantSlug, creatorId, stepId)
        }
        sent++
      } catch (emailError) {
        errors.push(
          `Creator ${creatorId}: ${emailError instanceof Error ? emailError.message : 'Failed to send'}`
        )
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      total: creatorIds.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error sending bulk reminders:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
