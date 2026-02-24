/**
 * Referral Link Handler
 *
 * Sets a referral_code cookie and redirects to the homepage.
 */

import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ code: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { code } = await params

  const response = NextResponse.redirect(new URL('/', _request.url))

  response.cookies.set('referral_code', code, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
