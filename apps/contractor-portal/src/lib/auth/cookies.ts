/**
 * Cookie utilities for contractor authentication
 */

const COOKIE_NAME = 'contractor_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/**
 * Get the Set-Cookie header value for setting auth cookie
 *
 * @param token - JWT token to set
 * @returns Set-Cookie header value
 */
export function getSetCookieHeader(token: string): string {
  const isProduction = process.env.NODE_ENV === 'production'

  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
  ]

  if (isProduction) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

/**
 * Get the Set-Cookie header value for clearing auth cookie
 *
 * @returns Set-Cookie header value that clears the cookie
 */
export function getClearCookieHeader(): string {
  const isProduction = process.env.NODE_ENV === 'production'

  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ]

  if (isProduction) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

/**
 * Extract auth token from request cookies
 *
 * @param req - Request object
 * @returns Token if present, null otherwise
 */
export function getAuthCookie(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) {
    return null
  }

  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [key, ...valueParts] = cookie.trim().split('=')
      if (key) {
        acc[key] = valueParts.join('=')
      }
      return acc
    },
    {} as Record<string, string>
  )

  return cookies[COOKIE_NAME] || null
}

/**
 * Cookie name export for middleware usage
 */
export const AUTH_COOKIE_NAME = COOKIE_NAME
