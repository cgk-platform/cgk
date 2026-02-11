/**
 * Creator Password Change API Route
 *
 * POST /api/creator/settings/password
 * Changes the creator's password with current password verification.
 */

import { sql } from '@cgk/db'

import { hashPassword, requireCreatorAuth, verifyPassword, type CreatorAuthContext } from '@/lib/auth'
import { validatePassword } from '@/lib/auth/password'

export const dynamic = 'force-dynamic'

interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export async function POST(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  let body: ChangePasswordRequest

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { currentPassword, newPassword, confirmPassword } = body

  // Validate required fields
  if (!currentPassword || !newPassword || !confirmPassword) {
    return Response.json(
      { error: 'All password fields are required' },
      { status: 400 }
    )
  }

  // Check new passwords match
  if (newPassword !== confirmPassword) {
    return Response.json(
      { error: 'New passwords do not match' },
      { status: 400 }
    )
  }

  // Validate new password strength
  const validation = validatePassword(newPassword)
  if (!validation.isValid) {
    return Response.json(
      { error: validation.error },
      { status: 400 }
    )
  }

  // Check current password is different from new
  if (currentPassword === newPassword) {
    return Response.json(
      { error: 'New password must be different from current password' },
      { status: 400 }
    )
  }

  try {
    // Get current password hash
    const result = await sql`
      SELECT password_hash FROM creators
      WHERE id = ${context.creatorId}
    `

    const creator = result.rows[0]
    if (!creator) {
      return Response.json({ error: 'Creator not found' }, { status: 404 })
    }

    if (!creator.password_hash) {
      return Response.json(
        { error: 'Password login not enabled for your account. Please contact support.' },
        { status: 400 }
      )
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, creator.password_hash as string)
    if (!isValid) {
      return Response.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password
    await sql`
      UPDATE creators
      SET password_hash = ${newPasswordHash},
          updated_at = NOW()
      WHERE id = ${context.creatorId}
    `

    return Response.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Error changing password:', error)
    return Response.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
