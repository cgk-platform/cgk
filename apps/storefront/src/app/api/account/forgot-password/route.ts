export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createHash, randomBytes } from 'crypto'
import { headers } from 'next/headers'

import { sql, withTenant } from '@cgk-platform/db'
import { logger } from '@cgk-platform/logging'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * POST /api/account/forgot-password
 * Initiates password reset flow - sends reset email with secure token.
 * Always returns success to prevent email enumeration.
 */
export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { email } = body as { email?: string }
    if (!email || typeof email !== 'string') {
      return Response.json({ error: 'Email is required' }, { status: 400 })
    }

    const headerList = await headers()
    const tenantSlug = headerList.get('x-tenant-slug')
    if (!tenantSlug) {
      return Response.json({ error: 'Tenant context required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null

    // Look up customer (but always return success)
    const customerResult = await withTenant(tenantSlug, async () => {
      return sql`
        SELECT id FROM customers WHERE email = ${normalizedEmail}
      `
    })

    const customer = customerResult.rows[0]
    if (customer) {
      // Generate token
      const token = randomBytes(48).toString('hex')
      const tokenHash = hashToken(token)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1)

      // Invalidate existing tokens
      await withTenant(tenantSlug, async () => {
        await sql`
          UPDATE customer_password_resets
          SET used_at = NOW()
          WHERE customer_id = ${customer.id}
            AND used_at IS NULL
        `
      })

      // Store new token
      await withTenant(tenantSlug, async () => {
        await sql`
          INSERT INTO customer_password_resets (
            customer_id, email, token_hash, expires_at, ip_address
          )
          VALUES (
            ${customer.id}, ${normalizedEmail}, ${tokenHash},
            ${expiresAt.toISOString()}, ${clientIp}
          )
        `
      })

      // Send email
      const baseUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.APP_URL
      const resetUrl = `${baseUrl}/account/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(normalizedEmail)}`

      const resendApiKey = process.env.RESEND_API_KEY
      if (!resendApiKey) {
        logger.info(`[DEV] Password reset for ${normalizedEmail}:`)
        logger.info(`[DEV] ${resetUrl}`)
      } else {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'noreply@cgk.dev',
            to: [normalizedEmail],
            subject: 'Reset your password',
            html: `
              <div style="max-width:480px;margin:0 auto;padding:40px 20px;font-family:sans-serif;">
                <h2>Reset Your Password</h2>
                <p>Click the link below to reset your password. This link expires in 1 hour.</p>
                <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:white;text-decoration:none;border-radius:6px;">Reset Password</a>
                <p style="color:#888;font-size:14px;margin-top:20px;">If you didn't request this, you can safely ignore this email.</p>
              </div>
            `.trim(),
          }),
        }).catch((err) => {
          logger.error('Failed to send password reset email:', err)
        })
      }
    }

    // Always return success (anti-enumeration)
    return Response.json({ success: true })
  } catch (error) {
    logger.error('Forgot password error:', error instanceof Error ? error : new Error(String(error)))
    return Response.json({ success: true })
  }
}
