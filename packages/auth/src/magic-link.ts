import { nanoid } from 'nanoid'

import { sql } from '@cgk-platform/db'

import { sha256 } from './crypto'
import type { MagicLinkPurpose, MagicLinkVerifyResult, UserRole } from './types'

const MAGIC_LINK_TOKEN_LENGTH = 48
const MAGIC_LINK_EXPIRATION_HOURS = 24

/**
 * Create a magic link for email authentication
 *
 * @param email - Email address to send magic link to
 * @param purpose - Purpose of the magic link
 * @param orgId - Optional organization ID for invites
 * @param inviteRole - Optional role for invite links
 * @returns Raw token to include in the magic link URL
 */
export async function createMagicLink(
  email: string,
  purpose: MagicLinkPurpose,
  orgId?: string,
  inviteRole?: UserRole
): Promise<string> {
  const token = nanoid(MAGIC_LINK_TOKEN_LENGTH)
  const tokenHash = await sha256(token)

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + MAGIC_LINK_EXPIRATION_HOURS)

  await sql`
    INSERT INTO public.magic_links (email, token_hash, purpose, organization_id, invite_role, expires_at)
    VALUES (
      ${email.toLowerCase()},
      ${tokenHash},
      ${purpose},
      ${orgId || null},
      ${inviteRole || null},
      ${expiresAt.toISOString()}
    )
  `

  return token
}

/**
 * Verify a magic link token
 *
 * @param email - Email the magic link was sent to
 * @param token - Raw token from the magic link URL
 * @returns Verification result with userId (if user exists), purpose, and org context
 * @throws Error if token is invalid, expired, or already used
 */
export async function verifyMagicLink(
  email: string,
  token: string
): Promise<MagicLinkVerifyResult> {
  const tokenHash = await sha256(token)
  const normalizedEmail = email.toLowerCase()

  // Find and validate the magic link
  const linkResult = await sql`
    SELECT * FROM public.magic_links
    WHERE email = ${normalizedEmail}
      AND token_hash = ${tokenHash}
      AND expires_at > NOW()
      AND used_at IS NULL
  `

  const link = linkResult.rows[0]
  if (!link) {
    throw new Error('Invalid or expired magic link')
  }

  // Mark as used
  await sql`
    UPDATE public.magic_links
    SET used_at = NOW()
    WHERE id = ${link.id}
  `

  // Check if user exists
  const userResult = await sql`
    SELECT id FROM public.users
    WHERE email = ${normalizedEmail}
  `

  const userRow = userResult.rows[0]
  const userId = userRow ? (userRow.id as string) : null

  return {
    userId,
    purpose: link.purpose as MagicLinkPurpose,
    orgId: (link.organization_id as string) || null,
    inviteRole: (link.invite_role as UserRole) || null,
  }
}

/**
 * Send a magic link email
 *
 * @param email - Email address to send to
 * @param token - Raw token to include in the link
 * @param purpose - Purpose of the magic link
 */
export async function sendMagicLinkEmail(
  email: string,
  token: string,
  purpose: MagicLinkPurpose
): Promise<void> {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    throw new Error('APP_URL or NEXT_PUBLIC_APP_URL environment variable is required')
  }
  const magicLinkUrl = `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

  const subject = getEmailSubject(purpose)

  // Check if Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    // Development mode: log the magic link
    console.log(`[DEV] Magic link for ${email}:`)
    console.log(`[DEV] ${magicLinkUrl}`)
    console.log(`[DEV] Token: ${token}`)
    return
  }

  // Send email via Resend
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'CGK Platform <noreply@cgk.dev>',
      to: [email],
      subject,
      html: getMagicLinkEmailHtml(magicLinkUrl, purpose),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to send magic link email:', error)
    throw new Error('Failed to send magic link email')
  }
}

/**
 * Get email subject based on purpose
 */
function getEmailSubject(purpose: MagicLinkPurpose): string {
  switch (purpose) {
    case 'login':
      return 'Sign in to CGK Platform'
    case 'signup':
      return 'Welcome to CGK Platform'
    case 'invite':
      return 'You\'ve been invited to CGK Platform'
    case 'password_reset':
      return 'Reset your CGK Platform password'
    default:
      return 'CGK Platform'
  }
}

/**
 * Generate magic link email HTML
 */
function getMagicLinkEmailHtml(url: string, purpose: MagicLinkPurpose): string {
  const actionText = purpose === 'login' ? 'Sign In' :
    purpose === 'signup' ? 'Get Started' :
    purpose === 'invite' ? 'Accept Invitation' :
    'Reset Password'

  const description = purpose === 'login' ? 'Click the button below to sign in to your account.' :
    purpose === 'signup' ? 'Click the button below to create your account.' :
    purpose === 'invite' ? 'You\'ve been invited to join an organization. Click the button below to accept.' :
    'Click the button below to reset your password.'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background: #f5f5f5;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="margin: 0 0 20px; font-size: 24px; color: #111;">CGK Platform</h1>
    <p style="color: #555; line-height: 1.6;">${description}</p>
    <a href="${url}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #111; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">${actionText}</a>
    <p style="color: #888; font-size: 14px; margin-top: 30px;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
    <p style="color: #888; font-size: 12px; margin-top: 20px;">Or copy this link: ${url}</p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Clean up expired magic links (call periodically)
 */
export async function cleanupExpiredMagicLinks(): Promise<number> {
  const result = await sql`
    DELETE FROM public.magic_links
    WHERE expires_at < NOW() - INTERVAL '7 days'
  `
  return result.rowCount ?? 0
}
