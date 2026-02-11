/**
 * Cookie utilities for creator authentication
 */

import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export const CREATOR_AUTH_COOKIE_NAME = 'creator-auth-token'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

/**
 * Cookie options for auth token
 */
export const creatorCookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
}

/**
 * Set the auth cookie in a Response
 *
 * @param token - JWT token to set
 * @returns Cookie header value
 */
export function getSetCookieHeader(token: string): string {
  const parts = [
    `${CREATOR_AUTH_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${creatorCookieOptions.maxAge}`,
    `SameSite=${creatorCookieOptions.sameSite}`,
  ]

  if (IS_PRODUCTION) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

/**
 * Get the clear cookie header value
 */
export function getClearCookieHeader(): string {
  return `${CREATOR_AUTH_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=lax`
}

/**
 * Set auth cookie using Next.js cookies() function
 * Must be called from a Server Action or Route Handler
 */
export function setCreatorAuthCookie(
  cookiesFn: {
    set: (name: string, value: string, options?: Partial<ResponseCookie>) => void
  },
  token: string
): void {
  cookiesFn.set(CREATOR_AUTH_COOKIE_NAME, token, creatorCookieOptions)
}

/**
 * Get auth cookie value
 */
export function getCreatorAuthCookie(
  cookiesFn: {
    get: (name: string) => { value: string } | undefined
  }
): string | undefined {
  return cookiesFn.get(CREATOR_AUTH_COOKIE_NAME)?.value
}

/**
 * Clear auth cookie
 */
export function clearCreatorAuthCookie(
  cookiesFn: {
    delete: (name: string) => void
  }
): void {
  cookiesFn.delete(CREATOR_AUTH_COOKIE_NAME)
}

/**
 * Extract token from request cookies
 */
export function getTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map((c) => c.trim())
  const authCookie = cookies.find((c) => c.startsWith(`${CREATOR_AUTH_COOKIE_NAME}=`))

  if (!authCookie) return null

  return authCookie.substring(CREATOR_AUTH_COOKIE_NAME.length + 1)
}
