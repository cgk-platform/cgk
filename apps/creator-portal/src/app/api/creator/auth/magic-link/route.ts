/**
 * Creator Magic Link API Route
 *
 * POST /api/creator/auth/magic-link
 * Sends a magic link email for passwordless authentication.
 */

import { sql } from '@cgk-platform/db'

import {
  checkRateLimit,
  createCreatorMagicLink,
  getClientIP,
  getRateLimitHeaders,
  recordRateLimitAttempt,
  sendCreatorMagicLinkEmail,
} from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface MagicLinkRequest {
  email: string
}

export async function POST(req: Request): Promise<Response> {
  const ip = getClientIP(req)

  // Check rate limit (use auth limit for magic links too)
  const { isLimited, remaining, resetAt } = checkRateLimit(ip, 'magic_link')
  if (isLimited) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: getRateLimitHeaders(remaining, resetAt),
      }
    )
  }

  // Record the attempt
  recordRateLimitAttempt(ip, 'magic_link')

  let body: MagicLinkRequest

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

  // Always return success to prevent email enumeration
  // Even if the email doesn't exist
  try {
    // Check if creator exists
    const creatorResult = await sql`
      SELECT id, status FROM creators
      WHERE email = ${email.toLowerCase().trim()}
    `

    const creator = creatorResult.rows[0]

    // Only send magic link if creator exists and is not suspended
    if (creator && creator.status !== 'suspended') {
      const token = await createCreatorMagicLink(email)
      await sendCreatorMagicLinkEmail(email, token)
    }

    // Always return the same response to prevent email enumeration
    return Response.json(
      {
        success: true,
        message: 'If an account exists with that email, a magic link has been sent.',
      },
      {
        headers: getRateLimitHeaders(remaining - 1, resetAt),
      }
    )
  } catch (error) {
    console.error('Magic link error:', error)

    // Still return success to prevent enumeration
    return Response.json(
      {
        success: true,
        message: 'If an account exists with that email, a magic link has been sent.',
      },
      {
        headers: getRateLimitHeaders(remaining - 1, resetAt),
      }
    )
  }
}
