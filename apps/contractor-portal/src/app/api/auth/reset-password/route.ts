export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { sql, withTenant } from '@cgk-platform/db'

import { hashPassword } from '@/lib/auth/password'
import {
  markPasswordResetTokenUsed,
  verifyPasswordResetToken,
} from '@/lib/auth/password-reset'
import { revokeAllContractorSessions } from '@/lib/auth/session'

/**
 * POST /api/auth/reset-password
 * Verify reset token and set new password
 */
export async function POST(req: Request): Promise<Response> {
  let body: { email?: string; token?: string; password?: string; tenantSlug?: string }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, token, password } = body
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

  // Resolve tenant
  const headerList = await headers()
  const tenantSlug =
    body.tenantSlug ||
    headerList.get('x-tenant-slug') ||
    process.env.TENANT_SLUG

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context is required' }, { status: 400 })
  }

  try {
    // Verify the reset token
    const contractorId = await verifyPasswordResetToken(email, token, tenantSlug)

    // Hash the new password
    const passwordHash = await hashPassword(password)

    // Update the contractor's password
    await withTenant(tenantSlug, async () => {
      await sql`
        UPDATE contractors
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${contractorId}
      `
    })

    // Mark token as used
    await markPasswordResetTokenUsed(email, token, tenantSlug)

    // Revoke all existing sessions (force re-login with new password)
    await revokeAllContractorSessions(contractorId, tenantSlug)

    return Response.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    const message = error instanceof Error ? error.message : 'Password reset failed'
    return Response.json({ error: message }, { status: 400 })
  }
}
