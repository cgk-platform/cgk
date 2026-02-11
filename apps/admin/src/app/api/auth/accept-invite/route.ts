export const dynamic = 'force-dynamic'

import {
  acceptInvitation,
  AUTH_COOKIE_NAME,
  cookieOptions,
  createSession,
  createUser,
  getUserByEmail,
  getUserOrganizations,
  signJWT,
} from '@cgk/auth'
import { sql } from '@cgk/db'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  let body: { email?: string; token?: string; name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, token, name } = body

  if (!email || !token) {
    return NextResponse.json(
      { error: 'Email and token are required' },
      { status: 400 }
    )
  }

  try {
    // Check if user exists
    let user = await getUserByEmail(email)
    let isNewUser = false

    if (!user) {
      // Create new user
      user = await createUser({
        email,
        name: name || undefined,
        role: 'member',
      })
      isNewUser = true
    }

    // Accept the invitation
    const { tenantId, role } = await acceptInvitation(email, token, user.id)

    // Get tenant info for JWT
    const tenantResult = await sql`
      SELECT slug FROM organizations WHERE id = ${tenantId}
    `
    const tenantSlug = tenantResult.rows[0]?.slug as string

    // Get user's organizations
    const orgs = await getUserOrganizations(user.id)

    // Create session
    const { session } = await createSession(
      user.id,
      tenantId,
      request
    )

    // Create JWT
    const jwt = await signJWT({
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      orgSlug: tenantSlug,
      orgId: tenantId,
      role,
      orgs,
    })

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      isNewUser,
      tenantId,
      tenantSlug,
      role,
      redirectTo: '/admin',
    })

    // Set auth cookie
    response.cookies.set(AUTH_COOKIE_NAME, jwt, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    })

    // Send notification to inviter (in background)
    notifyInviterOfAcceptance(tenantId, email, user.name || email).catch(console.error)

    return response
  } catch (error) {
    console.error('Error accepting invitation:', error)
    const message = error instanceof Error ? error.message : 'Failed to accept invitation'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

async function notifyInviterOfAcceptance(
  tenantId: string,
  acceptedEmail: string,
  acceptedName: string
): Promise<void> {
  // Get the invitation and inviter details
  const result = await sql`
    SELECT
      u.email as inviter_email,
      u.name as inviter_name,
      o.name as tenant_name
    FROM team_invitations ti
    JOIN users u ON u.id = ti.invited_by
    JOIN organizations o ON o.id = ti.tenant_id
    WHERE ti.tenant_id = ${tenantId}
      AND ti.email = ${acceptedEmail.toLowerCase()}
      AND ti.status = 'accepted'
    ORDER BY ti.accepted_at DESC
    LIMIT 1
  `

  if (result.rows.length === 0) {
    return
  }

  const { inviter_email, tenant_name } = result.rows[0] as {
    inviter_email: string
    inviter_name: string | null
    tenant_name: string
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.log(`[DEV] Notification: ${acceptedName} accepted invitation to ${tenant_name}`)
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
    <h1 style="margin: 0 0 20px; font-size: 24px; color: #111;">Invitation Accepted</h1>
    <p style="color: #555; line-height: 1.6;"><strong>${acceptedName}</strong> (${acceptedEmail}) has accepted your invitation and joined <strong>${tenant_name}</strong>.</p>
    <p style="color: #888; font-size: 14px; margin-top: 30px;">You can manage your team members in the admin settings.</p>
  </div>
</body>
</html>
  `.trim()

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'CGK Platform <noreply@cgk.dev>',
      to: [inviter_email],
      subject: `${acceptedName} accepted your invitation`,
      html,
    }),
  })
}
