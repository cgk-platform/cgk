import { endImpersonation, AUTH_COOKIE_NAME } from '@cgk-platform/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/impersonation/end
 *
 * End the current impersonation session and clear the auth cookie.
 * This is called from the impersonation banner when the user (or impersonator
 * viewing as the user) wants to exit the impersonation session.
 *
 * The response will redirect to the login page.
 */
export async function POST() {
  try {
    const headerList = await headers()
    const isImpersonation = headerList.get('x-is-impersonation') === 'true'
    const sessionId = headerList.get('x-session-id')
    const impersonatorId = headerList.get('x-impersonator-id')

    if (!isImpersonation || !sessionId) {
      return NextResponse.json(
        { error: 'Not in an impersonation session' },
        { status: 400 }
      )
    }

    // End the impersonation session in the database
    await endImpersonation(sessionId, 'manual_end', impersonatorId || undefined)

    // Create response with cookie cleared
    const response = NextResponse.json({
      success: true,
      message: 'Impersonation session ended',
      redirectTo: '/login',
    })

    // Clear the auth cookie by setting it to expire immediately
    response.cookies.set(AUTH_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('End impersonation error:', error)
    return NextResponse.json(
      { error: 'Failed to end impersonation session' },
      { status: 500 }
    )
  }
}
