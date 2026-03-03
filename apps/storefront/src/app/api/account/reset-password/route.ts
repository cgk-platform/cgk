export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createHash } from 'crypto'
import { headers } from 'next/headers'

import { sql, withTenant } from '@cgk-platform/db'
import { logger } from '@cgk-platform/logging'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * POST /api/account/reset-password
 * Validates reset token and updates customer password.
 * Revokes all existing sessions to force re-login.
 */
export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { email, token, password } = body as {
      email?: string
      token?: string
      password?: string
    }

    if (!email || !token || !password) {
      return Response.json(
        { error: 'Email, token, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return Response.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const headerList = await headers()
    const tenantSlug = headerList.get('x-tenant-slug')
    if (!tenantSlug) {
      return Response.json({ error: 'Tenant context required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const tokenHash = hashToken(token)

    // Verify the reset token
    const tokenResult = await withTenant(tenantSlug, async () => {
      return sql`
        SELECT * FROM customer_password_resets
        WHERE email = ${normalizedEmail}
          AND token_hash = ${tokenHash}
          AND expires_at > NOW()
          AND used_at IS NULL
      `
    })

    const resetRecord = tokenResult.rows[0]
    if (!resetRecord) {
      return Response.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      )
    }

    // Hash new password using the same bcrypt utility as signin
    const { hashPassword } = await import('@cgk-platform/auth/node')
    const passwordHash = await hashPassword(password)

    // Update customer password
    await withTenant(tenantSlug, async () => {
      await sql`
        UPDATE customers
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${resetRecord.customer_id}
      `
    })

    // Mark token as used
    await withTenant(tenantSlug, async () => {
      await sql`
        UPDATE customer_password_resets
        SET used_at = NOW()
        WHERE id = ${resetRecord.id}
      `
    })

    // Revoke all customer sessions (force re-login)
    await withTenant(tenantSlug, async () => {
      await sql`
        DELETE FROM customer_sessions
        WHERE customer_id = ${resetRecord.customer_id}
      `
    })

    return Response.json({ success: true })
  } catch (error) {
    logger.error('Reset password error:', error)
    return Response.json(
      { error: 'Password reset failed. Please try again.' },
      { status: 500 }
    )
  }
}
