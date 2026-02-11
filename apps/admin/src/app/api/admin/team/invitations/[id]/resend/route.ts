export const dynamic = 'force-dynamic'

import {
  getInvitation,
  requireAuth,
  resendInvitation,
  type AuthContext,
} from '@cgk/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Verify invitation belongs to this tenant
    const invitation = await getInvitation(id)
    if (!invitation || invitation.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    const token = await resendInvitation(id, auth.userId)

    // Send the invitation email
    await sendResendInvitationEmail(invitation.email, token, invitation.tenantName)

    return NextResponse.json({
      success: true,
      message: `Invitation resent to ${invitation.email}`,
    })
  } catch (error) {
    console.error('Error resending invitation:', error)
    const message = error instanceof Error ? error.message : 'Failed to resend invitation'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

async function sendResendInvitationEmail(
  email: string,
  token: string,
  tenantName: string
): Promise<void> {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/join?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.log(`[DEV] Resent team invitation for ${email}:`)
    console.log(`[DEV] ${inviteUrl}`)
    console.log(`[DEV] Token: ${token}`)
    return
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background: #f5f5f5;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="margin: 0 0 20px; font-size: 24px; color: #111;">Invitation Reminder</h1>
    <p style="color: #555; line-height: 1.6;">This is a reminder that you've been invited to join <strong>${tenantName}</strong> on the CGK Platform.</p>
    <a href="${inviteUrl}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #111; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Accept Invitation</a>
    <p style="color: #888; font-size: 14px; margin-top: 30px;">This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
    <p style="color: #888; font-size: 12px; margin-top: 20px;">Or copy this link: ${inviteUrl}</p>
  </div>
</body>
</html>
  `.trim()

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'CGK Platform <noreply@cgk.dev>',
      to: [email],
      subject: `Reminder: You've been invited to join ${tenantName}`,
      html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to send invitation email:', error)
    throw new Error('Failed to send invitation email')
  }
}
