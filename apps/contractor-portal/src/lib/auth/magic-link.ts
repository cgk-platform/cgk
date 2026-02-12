/**
 * Magic link authentication for contractors
 *
 * Provides passwordless authentication via email.
 * Magic link tokens are stored in tenant schema.
 */

import { createHash, randomBytes } from 'crypto'

import { sql, withTenant } from '@cgk/db'

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

export type MagicLinkPurpose = 'login' | 'signup' | 'password_reset'

/**
 * Create a magic link for contractor authentication
 *
 * @param email - Email address to send magic link to
 * @param purpose - Purpose of the magic link
 * @param tenantSlug - Tenant slug for schema access
 * @returns Raw token to include in the magic link URL
 */
export async function createContractorMagicLink(
  email: string,
  purpose: MagicLinkPurpose,
  tenantSlug: string
): Promise<string> {
  const token = generateToken()
  const tokenHash = hashToken(token)

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + MAGIC_LINK_EXPIRATION_HOURS)

  await withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO contractor_magic_links (email, token_hash, purpose, expires_at)
      VALUES (
        ${email.toLowerCase()},
        ${tokenHash},
        ${purpose},
        ${expiresAt.toISOString()}
      )
    `
  })

  return token
}

/**
 * Verify a magic link token
 *
 * @param email - Email the magic link was sent to
 * @param token - Raw token from the magic link URL
 * @param tenantSlug - Tenant slug for schema access
 * @returns Verification result with contractorId (if exists) and purpose
 * @throws Error if token is invalid, expired, or already used
 */
export async function verifyContractorMagicLink(
  email: string,
  token: string,
  tenantSlug: string
): Promise<{ contractorId: string | null; purpose: MagicLinkPurpose }> {
  const tokenHash = hashToken(token)
  const normalizedEmail = email.toLowerCase()

  // Find and validate the magic link
  const linkResult = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT * FROM contractor_magic_links
      WHERE email = ${normalizedEmail}
        AND token_hash = ${tokenHash}
        AND expires_at > NOW()
        AND used_at IS NULL
    `
  })

  const link = linkResult.rows[0]
  if (!link) {
    throw new Error('Invalid or expired magic link')
  }

  // Mark as used
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE contractor_magic_links
      SET used_at = NOW()
      WHERE id = ${link.id}
    `
  })

  // Check if contractor exists
  const contractorResult = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT id FROM contractors
      WHERE email = ${normalizedEmail}
    `
  })

  const contractorRow = contractorResult.rows[0]
  const contractorId = contractorRow ? (contractorRow.id as string) : null

  return {
    contractorId,
    purpose: link.purpose as MagicLinkPurpose,
  }
}

/**
 * Send a magic link email to contractor
 *
 * @param email - Email address to send to
 * @param token - Raw token to include in the link
 * @param purpose - Purpose of the magic link
 * @param tenantSlug - Tenant slug for URL
 */
export async function sendContractorMagicLinkEmail(
  email: string,
  token: string,
  purpose: MagicLinkPurpose,
  tenantSlug: string
): Promise<void> {
  const baseUrl = process.env.CONTRACTOR_PORTAL_URL || 'http://localhost:3500'
  const magicLinkUrl = `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&tenant=${encodeURIComponent(tenantSlug)}`

  const subject = getEmailSubject(purpose)

  // Check if Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    // Development mode: log the magic link
    console.log(`[DEV] Contractor magic link for ${email}:`)
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
      from: process.env.EMAIL_FROM || 'CGK Platform <noreply@cgk.dev>',
      to: [email],
      subject,
      html: getMagicLinkEmailHtml(magicLinkUrl, purpose),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to send contractor magic link email:', error)
    throw new Error('Failed to send magic link email')
  }
}

/**
 * Get email subject based on purpose
 */
function getEmailSubject(purpose: MagicLinkPurpose): string {
  switch (purpose) {
    case 'login':
      return 'Sign in to Contractor Portal'
    case 'signup':
      return 'Complete your contractor registration'
    case 'password_reset':
      return 'Reset your Contractor Portal password'
    default:
      return 'Contractor Portal'
  }
}

/**
 * Generate magic link email HTML
 */
function getMagicLinkEmailHtml(url: string, purpose: MagicLinkPurpose): string {
  const actionText =
    purpose === 'login'
      ? 'Sign In'
      : purpose === 'signup'
        ? 'Complete Registration'
        : 'Reset Password'

  const description =
    purpose === 'login'
      ? 'Click the button below to sign in to your contractor account.'
      : purpose === 'signup'
        ? 'Click the button below to complete your contractor registration.'
        : 'Click the button below to reset your password.'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px 20px; background: #F8F6F3;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 4px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid #EDE9E3;">
    <h1 style="margin: 0 0 20px; font-size: 24px; color: #2D2D2D; font-family: 'DM Mono', monospace; letter-spacing: -0.5px;">Contractor Portal</h1>
    <p style="color: #4A4A4A; line-height: 1.6; font-size: 16px;">${description}</p>
    <a href="${url}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: #2D2D2D; color: white; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">${actionText}</a>
    <p style="color: #6B6B6B; font-size: 14px; margin-top: 32px; border-top: 1px solid #EDE9E3; padding-top: 24px;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
    <p style="color: #6B6B6B; font-size: 12px; margin-top: 16px; word-break: break-all;">Or copy this link: ${url}</p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Clean up expired magic links
 */
export async function cleanupExpiredContractorMagicLinks(
  tenantSlug: string
): Promise<number> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      DELETE FROM contractor_magic_links
      WHERE expires_at < NOW() - INTERVAL '7 days'
    `
  })
  return result.rowCount ?? 0
}
