import { createMagicLink, sendMagicLinkEmail, getUserByEmail } from '@cgk-platform/auth'

export const dynamic = 'force-dynamic'

interface LoginRequestBody {
  email: string
}

/**
 * POST /api/auth/login
 *
 * Request a magic link for authentication.
 * Creates a magic link and sends it to the user's email.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequestBody

    if (!body.email) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const email = body.email.toLowerCase().trim()

    // Validate email format
    if (!isValidEmail(email)) {
      return Response.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user exists to determine purpose
    const existingUser = await getUserByEmail(email)
    const purpose = existingUser ? 'login' : 'signup'

    // Create and send magic link
    const token = await createMagicLink(email, purpose)
    await sendMagicLinkEmail(email, token, purpose)

    return Response.json({
      success: true,
      message: 'Magic link sent to your email',
    })
  } catch (error) {
    console.error('Login error:', error)
    return Response.json(
      { error: 'Failed to send magic link' },
      { status: 500 }
    )
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
