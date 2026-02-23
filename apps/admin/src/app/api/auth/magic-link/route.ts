export const dynamic = 'force-dynamic'

import {
  createMagicLink,
  getUserByEmail,
  sendMagicLinkEmail,
} from '@cgk-platform/auth'

/**
 * POST /api/auth/magic-link
 * Send a magic link email to a tenant user
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

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists (anti-enumeration: always return success)
    const user = await getUserByEmail(normalizedEmail)
    if (!user) {
      // Don't reveal that user doesn't exist
      return Response.json({ success: true })
    }

    // Create and send magic link
    const token = await createMagicLink(normalizedEmail, 'login')
    await sendMagicLinkEmail(normalizedEmail, token, 'login')

    return Response.json({ success: true })
  } catch (error) {
    console.error('Magic link error:', error)
    return Response.json(
      { error: 'Failed to send magic link' },
      { status: 500 }
    )
  }
}
