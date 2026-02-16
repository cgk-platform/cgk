export const dynamic = 'force-dynamic'

import {
  createInvitation,
  getInvitationCountToday,
  getInvitations,
  requireAuth,
  type AuthContext,
  type UserRole,
} from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

const MAX_INVITATIONS_PER_DAY = 50
const VALID_ROLES: UserRole[] = ['owner', 'admin', 'member']

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function GET(request: Request) {
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

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)
  const status = url.searchParams.get('status') === 'all' ? 'all' : 'pending'

  try {
    const { invitations, total } = await getInvitations(tenantId, {
      status: status as 'pending' | 'all',
      page,
      limit,
    })

    return NextResponse.json({
      invitations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const tenantSlug = headersList.get('x-tenant-slug')

  if (!tenantId || !tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only owners and admins can invite
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check rate limit
  const invitationsToday = await getInvitationCountToday(tenantId)
  if (invitationsToday >= MAX_INVITATIONS_PER_DAY) {
    return NextResponse.json(
      {
        error: `Daily invitation limit reached (${MAX_INVITATIONS_PER_DAY}). Try again tomorrow.`,
        code: 'RATE_LIMITED',
      },
      { status: 429 }
    )
  }

  let body: { email?: string; role?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate email
  if (!body.email || !isValidEmail(body.email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  // Validate role
  if (!body.role || !VALID_ROLES.includes(body.role as UserRole)) {
    return NextResponse.json(
      { error: `Role must be one of: ${VALID_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  // Non-owners cannot invite owners
  if (body.role === 'owner' && auth.role !== 'owner' && auth.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Only owners can invite new owners' },
      { status: 403 }
    )
  }

  try {
    const { invitationId, token } = await createInvitation(
      tenantId,
      body.email,
      body.role as UserRole,
      auth.userId,
      body.message
    )

    // Get tenant name for email
    const tenantResult = await sql`
      SELECT name FROM organizations WHERE id = ${tenantId}
    `
    const tenantName = (tenantResult.rows[0]?.name as string) || tenantSlug

    // Send invitation email
    await sendTeamInvitationEmail(body.email, token, tenantName, body.message)

    return NextResponse.json({
      success: true,
      invitationId,
      message: `Invitation sent to ${body.email}`,
    })
  } catch (error) {
    console.error('Error creating invitation:', error)
    const message = error instanceof Error ? error.message : 'Failed to create invitation'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

async function sendTeamInvitationEmail(
  email: string,
  token: string,
  tenantName: string,
  personalMessage?: string
): Promise<void> {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    throw new Error('APP_URL or NEXT_PUBLIC_APP_URL environment variable is required')
  }
  const inviteUrl = `${baseUrl}/join?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.log(`[DEV] Team invitation for ${email}:`)
    console.log(`[DEV] ${inviteUrl}`)
    console.log(`[DEV] Token: ${token}`)
    return
  }

  const messageHtml = personalMessage
    ? `<p style="color: #555; line-height: 1.6; font-style: italic; border-left: 3px solid #ddd; padding-left: 12px; margin: 20px 0;">${personalMessage}</p>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background: #f5f5f5;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="margin: 0 0 20px; font-size: 24px; color: #111;">You're Invited!</h1>
    <p style="color: #555; line-height: 1.6;">You've been invited to join <strong>${tenantName}</strong> on the CGK Platform.</p>
    ${messageHtml}
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
      subject: `You've been invited to join ${tenantName}`,
      html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to send invitation email:', error)
    throw new Error('Failed to send invitation email')
  }
}
