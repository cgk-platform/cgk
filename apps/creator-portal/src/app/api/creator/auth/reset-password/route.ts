/**
 * Creator Reset Password API Route
 *
 * POST /api/creator/auth/reset-password
 * Completes the password reset flow with a valid token.
 */

import { sql } from '@cgk/db'

import {
  hashPassword,
  markPasswordResetTokenUsed,
  revokeAllCreatorSessions,
  validatePasswordResetToken,
} from '@/lib/auth'
import { validatePassword } from '@/lib/auth/password'

export const dynamic = 'force-dynamic'

interface ResetPasswordRequest {
  email: string
  token: string
  password: string
  confirmPassword: string
}

export async function POST(req: Request): Promise<Response> {
  let body: ResetPasswordRequest

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, token, password, confirmPassword } = body

  // Validate required fields
  if (!email || !token) {
    return Response.json(
      { error: 'Email and token are required' },
      { status: 400 }
    )
  }

  if (!password || !confirmPassword) {
    return Response.json(
      { error: 'Password and confirmation are required' },
      { status: 400 }
    )
  }

  // Check passwords match
  if (password !== confirmPassword) {
    return Response.json(
      { error: 'Passwords do not match' },
      { status: 400 }
    )
  }

  // Validate password strength
  const validation = validatePassword(password)
  if (!validation.isValid) {
    return Response.json(
      { error: validation.error },
      { status: 400 }
    )
  }

  try {
    // Validate the reset token
    const resetToken = await validatePasswordResetToken(email, token)

    // Hash the new password
    const passwordHash = await hashPassword(password)

    // Update the creator's password
    await sql`
      UPDATE creators
      SET password_hash = ${passwordHash},
          updated_at = NOW()
      WHERE id = ${resetToken.creatorId}
    `

    // Mark the token as used
    await markPasswordResetTokenUsed(resetToken.id)

    // Revoke all existing sessions for security
    await revokeAllCreatorSessions(resetToken.creatorId)

    return Response.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password reset failed'
    return Response.json({ error: message }, { status: 400 })
  }
}
