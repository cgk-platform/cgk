/**
 * Creator Forgot Password API Route
 *
 * POST /api/creator/auth/forgot-password
 * Sends a password reset email to the creator.
 */

import { sql } from '@cgk/db'

import {
  checkPasswordResetRateLimit,
  createPasswordResetToken,
  getClientIP,
  getRateLimitHeaders,
  recordPasswordResetAttempt,
  sendPasswordResetEmail,
} from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface ForgotPasswordRequest {
  email: string
}

export async function POST(req: Request): Promise<Response> {
  const ip = getClientIP(req)

  let body: ForgotPasswordRequest

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email } = body

  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return Response.json({ error: 'Invalid email format' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check rate limit (3 requests per hour per email)
  const { isLimited, remaining, resetAt } = checkPasswordResetRateLimit(normalizedEmail)
  if (isLimited) {
    // Still return success to prevent enumeration
    return Response.json(
      {
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      },
      {
        headers: getRateLimitHeaders(remaining, resetAt),
      }
    )
  }

  // Record the attempt
  recordPasswordResetAttempt(normalizedEmail)

  // Always return success to prevent email enumeration
  try {
    // Check if creator exists
    const creatorResult = await sql`
      SELECT id, email, status FROM creators
      WHERE email = ${normalizedEmail}
    `

    const creator = creatorResult.rows[0]

    // Only send reset email if creator exists and is not suspended
    if (creator && creator.status !== 'suspended') {
      const token = await createPasswordResetToken(
        creator.id as string,
        normalizedEmail,
        ip
      )
      await sendPasswordResetEmail(normalizedEmail, token)
    }

    // Always return the same response to prevent email enumeration
    return Response.json(
      {
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      },
      {
        headers: getRateLimitHeaders(remaining - 1, resetAt),
      }
    )
  } catch (error) {
    console.error('Forgot password error:', error)

    // Still return success to prevent enumeration
    return Response.json(
      {
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      },
      {
        headers: getRateLimitHeaders(remaining - 1, resetAt),
      }
    )
  }
}
