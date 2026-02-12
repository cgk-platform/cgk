/**
 * Password reset functionality for contractors
 */

import { createHash, randomBytes } from 'crypto'

import { sql, withTenant } from '@cgk/db'

const RESET_TOKEN_LENGTH = 48
const RESET_TOKEN_EXPIRATION_HOURS = 1 // 1 hour expiry for security

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
  return randomBytes(RESET_TOKEN_LENGTH).toString('hex')
}

/**
 * Create a password reset token for a contractor
 *
 * @param email - Contractor email
 * @param tenantSlug - Tenant slug for schema access
 * @param ipAddress - IP address of requester
 * @returns Raw token to include in reset URL, or null if contractor not found
 */
export async function createPasswordResetToken(
  email: string,
  tenantSlug: string,
  ipAddress: string | null
): Promise<string | null> {
  const normalizedEmail = email.toLowerCase().trim()

  // Check if contractor exists
  const contractorResult = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT id FROM contractors
      WHERE email = ${normalizedEmail}
    `
  })

  const contractor = contractorResult.rows[0]
  if (!contractor) {
    return null
  }

  const token = generateToken()
  const tokenHash = hashToken(token)

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRATION_HOURS)

  // Invalidate any existing tokens for this contractor
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE contractor_password_reset_tokens
      SET used_at = NOW()
      WHERE contractor_id = ${contractor.id}
        AND used_at IS NULL
    `
  })

  // Create new token
  await withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO contractor_password_reset_tokens (
        contractor_id, email, token_hash, expires_at, ip_address
      )
      VALUES (
        ${contractor.id}, ${normalizedEmail}, ${tokenHash},
        ${expiresAt.toISOString()}, ${ipAddress}
      )
    `
  })

  return token
}

/**
 * Verify a password reset token
 *
 * @param email - Contractor email
 * @param token - Raw token from reset URL
 * @param tenantSlug - Tenant slug for schema access
 * @returns Contractor ID if valid, throws otherwise
 */
export async function verifyPasswordResetToken(
  email: string,
  token: string,
  tenantSlug: string
): Promise<string> {
  const tokenHash = hashToken(token)
  const normalizedEmail = email.toLowerCase().trim()

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT * FROM contractor_password_reset_tokens
      WHERE email = ${normalizedEmail}
        AND token_hash = ${tokenHash}
        AND expires_at > NOW()
        AND used_at IS NULL
    `
  })

  const tokenRecord = result.rows[0]
  if (!tokenRecord) {
    throw new Error('Invalid or expired password reset link')
  }

  return tokenRecord.contractor_id as string
}

/**
 * Mark a password reset token as used
 *
 * @param email - Contractor email
 * @param token - Raw token that was used
 * @param tenantSlug - Tenant slug for schema access
 */
export async function markPasswordResetTokenUsed(
  email: string,
  token: string,
  tenantSlug: string
): Promise<void> {
  const tokenHash = hashToken(token)
  const normalizedEmail = email.toLowerCase().trim()

  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE contractor_password_reset_tokens
      SET used_at = NOW()
      WHERE email = ${normalizedEmail}
        AND token_hash = ${tokenHash}
    `
  })
}

/**
 * Send password reset email to contractor
 *
 * @param email - Contractor email
 * @param token - Raw token to include in reset URL
 * @param tenantSlug - Tenant slug for URL
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  tenantSlug: string
): Promise<void> {
  const baseUrl = process.env.CONTRACTOR_PORTAL_URL || 'http://localhost:3500'
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&tenant=${encodeURIComponent(tenantSlug)}`

  // Check if Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    // Development mode: log the reset link
    console.log(`[DEV] Contractor password reset for ${email}:`)
    console.log(`[DEV] ${resetUrl}`)
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
      subject: 'Reset your Contractor Portal password',
      html: getPasswordResetEmailHtml(resetUrl),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to send contractor password reset email:', error)
    throw new Error('Failed to send password reset email')
  }
}

/**
 * Generate password reset email HTML
 */
function getPasswordResetEmailHtml(url: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px 20px; background: #F8F6F3;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 4px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid #EDE9E3;">
    <h1 style="margin: 0 0 20px; font-size: 24px; color: #2D2D2D; font-family: 'DM Mono', monospace; letter-spacing: -0.5px;">Password Reset</h1>
    <p style="color: #4A4A4A; line-height: 1.6; font-size: 16px;">We received a request to reset your Contractor Portal password. Click the button below to create a new password.</p>
    <a href="${url}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: #FF6B35; color: white; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">Reset Password</a>
    <p style="color: #6B6B6B; font-size: 14px; margin-top: 32px; border-top: 1px solid #EDE9E3; padding-top: 24px;">This link expires in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.</p>
    <p style="color: #6B6B6B; font-size: 12px; margin-top: 16px; word-break: break-all;">Or copy this link: ${url}</p>
  </div>
</body>
</html>
  `.trim()
}
