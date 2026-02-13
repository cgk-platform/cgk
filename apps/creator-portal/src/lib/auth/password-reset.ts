/**
 * Password reset token management
 *
 * Handles secure token generation, validation, and cleanup for
 * the forgot/reset password flow.
 */

import { createHash, randomBytes } from 'crypto'

import { sql } from '@cgk-platform/db'

import type { PasswordResetToken } from '../types'

const TOKEN_LENGTH = 32
const TOKEN_EXPIRATION_HOURS = 1

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
  return randomBytes(TOKEN_LENGTH).toString('hex')
}

/**
 * Map database row to PasswordResetToken
 */
function mapRowToToken(row: Record<string, unknown>): PasswordResetToken {
  return {
    id: row.id as string,
    creatorId: row.creator_id as string,
    email: row.email as string,
    tokenHash: row.token_hash as string,
    expiresAt: new Date(row.expires_at as string),
    usedAt: row.used_at ? new Date(row.used_at as string) : null,
    ipAddress: (row.ip_address as string) || null,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Create a password reset token for a creator
 *
 * @param creatorId - Creator ID
 * @param email - Creator email
 * @param ipAddress - IP address of the request
 * @returns Raw token (to include in email link)
 */
export async function createPasswordResetToken(
  creatorId: string,
  email: string,
  ipAddress?: string
): Promise<string> {
  const token = generateToken()
  const tokenHash = hashToken(token)

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRATION_HOURS)

  // Invalidate any existing tokens for this creator
  await sql`
    UPDATE creator_password_reset_tokens
    SET used_at = NOW()
    WHERE creator_id = ${creatorId}
      AND used_at IS NULL
      AND expires_at > NOW()
  `

  await sql`
    INSERT INTO creator_password_reset_tokens (
      creator_id, email, token_hash, expires_at, ip_address
    )
    VALUES (
      ${creatorId}, ${email.toLowerCase()}, ${tokenHash},
      ${expiresAt.toISOString()}, ${ipAddress || null}
    )
  `

  return token
}

/**
 * Validate a password reset token
 *
 * @param email - Email address the token was sent to
 * @param token - Raw token from the reset link
 * @returns Token record if valid
 * @throws Error if token is invalid, expired, or already used
 */
export async function validatePasswordResetToken(
  email: string,
  token: string
): Promise<PasswordResetToken> {
  const tokenHash = hashToken(token)
  const normalizedEmail = email.toLowerCase()

  const result = await sql`
    SELECT * FROM creator_password_reset_tokens
    WHERE email = ${normalizedEmail}
      AND token_hash = ${tokenHash}
      AND expires_at > NOW()
      AND used_at IS NULL
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Invalid or expired reset token')
  }

  return mapRowToToken(row as Record<string, unknown>)
}

/**
 * Mark a password reset token as used
 *
 * @param tokenId - Token ID to mark as used
 */
export async function markPasswordResetTokenUsed(tokenId: string): Promise<void> {
  await sql`
    UPDATE creator_password_reset_tokens
    SET used_at = NOW()
    WHERE id = ${tokenId}
  `
}

/**
 * Get password reset request count for rate limiting
 *
 * @param email - Email to check
 * @param hours - Time window in hours
 * @returns Number of requests in the time window
 */
export async function getPasswordResetRequestCount(
  email: string,
  hours: number = 1
): Promise<number> {
  const normalizedEmail = email.toLowerCase()

  const result = await sql`
    SELECT COUNT(*) as count
    FROM creator_password_reset_tokens
    WHERE email = ${normalizedEmail}
      AND created_at > NOW() - INTERVAL '${hours} hours'
  `

  return parseInt((result.rows[0]?.count as string) || '0', 10)
}

/**
 * Clean up expired password reset tokens (call periodically)
 */
export async function cleanupExpiredPasswordResetTokens(): Promise<number> {
  const result = await sql`
    DELETE FROM creator_password_reset_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days'
    OR used_at IS NOT NULL
  `
  return result.rowCount ?? 0
}

/**
 * Send password reset email
 *
 * @param email - Email to send to
 * @param token - Raw token to include in the link
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const baseUrl = process.env.CREATOR_PORTAL_URL || 'http://localhost:3400'
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

  // Check if Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    // Development mode: log the link
    console.log(`[DEV] Password reset link for ${email}:`)
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
      from: process.env.EMAIL_FROM || 'Creator Portal <noreply@cgk.dev>',
      to: [email],
      subject: 'Reset your Creator Portal password',
      html: getPasswordResetEmailHtml(resetUrl),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }
}

/**
 * Generate password reset email HTML
 */
function getPasswordResetEmailHtml(resetUrl: string): string {
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
    <h2 style="margin: 0 0 16px; font-size: 18px; color: #333;">Reset your password</h2>
    <p style="color: #555; line-height: 1.6;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>
    <a href="${resetUrl}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #111; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Reset Password
    </a>
    <p style="color: #888; font-size: 14px; margin-top: 20px;">
      This link will expire in 1 hour for security reasons.
    </p>
    <p style="color: #888; font-size: 14px;">
      If you didn't request this, you can safely ignore this email. Your password won't be changed.
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #888; font-size: 12px;">
      Need help? Contact us at support@cgk.dev
    </p>
    <p style="color: #aaa; font-size: 11px; margin-top: 10px; word-break: break-all;">
      Or copy this link: ${resetUrl}
    </p>
  </div>
</body>
</html>
  `.trim()
}
