/**
 * Magic link authentication for creators
 *
 * Provides passwordless authentication as an alternative to email/password.
 */

import { createHash, randomBytes } from 'crypto'

import { sql } from '@cgk-platform/db'

const MAGIC_LINK_TOKEN_LENGTH = 48
const MAGIC_LINK_EXPIRATION_HOURS = 24

/**
 * Hash a token using SHA-256
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return randomBytes(MAGIC_LINK_TOKEN_LENGTH).toString('hex')
}

/**
 * Result of verifying a magic link
 */
export interface CreatorMagicLinkResult {
  creatorId: string | null
  email: string
}

/**
 * Create a magic link for creator authentication
 *
 * @param email - Email address to send magic link to
 * @returns Raw token to include in the magic link URL
 */
export async function createCreatorMagicLink(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim()
  const token = generateToken()
  const tokenHash = hashToken(token)

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + MAGIC_LINK_EXPIRATION_HOURS)

  // Store in a creator-specific magic links table
  // We'll use the existing magic_links table but add purpose filtering
  await sql`
    INSERT INTO magic_links (email, token_hash, purpose, expires_at)
    VALUES (${normalizedEmail}, ${tokenHash}, 'creator_login', ${expiresAt.toISOString()})
  `

  return token
}

/**
 * Verify a creator magic link token
 *
 * @param email - Email the magic link was sent to
 * @param token - Raw token from the magic link URL
 * @returns Verification result with creatorId if user exists
 * @throws Error if token is invalid, expired, or already used
 */
export async function verifyCreatorMagicLink(
  email: string,
  token: string
): Promise<CreatorMagicLinkResult> {
  const normalizedEmail = email.toLowerCase().trim()
  const tokenHash = hashToken(token)

  // Find and validate the magic link
  const linkResult = await sql`
    SELECT * FROM magic_links
    WHERE email = ${normalizedEmail}
      AND token_hash = ${tokenHash}
      AND purpose = 'creator_login'
      AND expires_at > NOW()
      AND used_at IS NULL
  `

  const link = linkResult.rows[0]
  if (!link) {
    throw new Error('Invalid or expired magic link')
  }

  // Mark as used
  await sql`
    UPDATE magic_links
    SET used_at = NOW()
    WHERE id = ${link.id}
  `

  // Check if creator exists
  const creatorResult = await sql`
    SELECT id FROM creators
    WHERE email = ${normalizedEmail}
  `

  const creatorRow = creatorResult.rows[0]

  return {
    creatorId: creatorRow ? (creatorRow.id as string) : null,
    email: normalizedEmail,
  }
}

/**
 * Send a creator magic link email
 *
 * @param email - Email address to send to
 * @param token - Raw token to include in the link
 */
export async function sendCreatorMagicLinkEmail(
  email: string,
  token: string
): Promise<void> {
  const baseUrl = process.env.CREATOR_PORTAL_URL
  if (!baseUrl) {
    throw new Error('CREATOR_PORTAL_URL environment variable is required')
  }
  const magicLinkUrl = `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

  // Check if Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    // Development mode: log the magic link
    console.log(`[DEV] Creator magic link for ${email}:`)
    console.log(`[DEV] ${magicLinkUrl}`)
    console.log(`[DEV] Token: ${token}`)
    return
  }

  // Send email via Resend
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Creator Portal <noreply@cgk.dev>',
      to: [email],
      subject: 'Sign in to Creator Portal',
      html: getMagicLinkEmailHtml(magicLinkUrl),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to send creator magic link email:', error)
    throw new Error('Failed to send magic link email')
  }
}

/**
 * Generate magic link email HTML
 */
function getMagicLinkEmailHtml(magicLinkUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background: #f5f5f5;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="margin: 0 0 20px; font-size: 24px; color: #111;">Creator Portal</h1>
    <h2 style="margin: 0 0 16px; font-size: 18px; color: #333;">Sign in to your account</h2>
    <p style="color: #555; line-height: 1.6;">
      Click the button below to securely sign in to your Creator Portal account.
    </p>
    <a href="${magicLinkUrl}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #111; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Sign In
    </a>
    <p style="color: #888; font-size: 14px; margin-top: 20px;">
      This link will expire in 24 hours for security reasons.
    </p>
    <p style="color: #888; font-size: 14px;">
      If you didn't request this, you can safely ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #aaa; font-size: 11px; word-break: break-all;">
      Or copy this link: ${magicLinkUrl}
    </p>
  </div>
</body>
</html>
  `.trim()
}
