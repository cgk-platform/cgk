export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
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
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { reason, sendNotification } = body as {
      reason: string
      sendNotification?: boolean
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      )
    }

    // Get application details for the email
    const application = await getApplicationById(tenantSlug, id)

    await updateApplicationStatus(tenantSlug, id, 'rejected', userId, {
      rejectionReason: reason,
    })

    // Send rejection email if sendNotification is true
    let notificationSent = false
    if (sendNotification && application?.email) {
      const resend = await getTenantResendClient(tenantSlug)
      if (resend) {
        const senderConfig = await getTenantResendSenderConfig(tenantSlug)
        const fromEmail = senderConfig?.from || `noreply@${tenantSlug}.com`

        try {
          await resend.emails.send({
            from: fromEmail,
            to: application.email,
            replyTo: senderConfig?.replyTo,
            subject: 'Update on your creator application',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Hi ${application.name.split(' ')[0] || application.name},</h2>
                <p>Thank you for your interest in joining our creator program.</p>
                <p>After careful review, we've decided not to move forward with your application at this time.</p>
                ${reason ? `<p><strong>Feedback:</strong> ${reason}</p>` : ''}
                <p>We appreciate your interest and encourage you to apply again in the future as our program evolves.</p>
                <p style="color: #666; font-size: 14px;">
                  If you have any questions, feel free to reply to this email.
                </p>
              </div>
            `,
          })
          notificationSent = true
        } catch (emailError) {
          console.error('Failed to send rejection notification email:', emailError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      notificationSent,
    })
  } catch (error) {
    console.error('Error rejecting application:', error)
    return NextResponse.json(
      { error: 'Failed to reject application' },
      { status: 500 }
    )
  }
}
