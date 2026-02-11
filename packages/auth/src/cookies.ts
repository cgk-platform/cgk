/**
 * Cookie utilities for authentication
 */

export const AUTH_COOKIE_NAME = 'cgk-auth-token'

/**
 * Cookie options for auth token
 */
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
}

/**
 * Set the auth cookie on a response
 *
 * @param response - Response object to set cookie on
 * @param token - JWT token to store in cookie
 * @returns New Response with cookie header set
 */
export function setAuthCookie(response: Response, token: string): Response {
  const headers = new Headers(response.headers)

  const cookieParts = [
    `${AUTH_COOKIE_NAME}=${token}`,
    `Path=${cookieOptions.path}`,
    `Max-Age=${cookieOptions.maxAge}`,
    `SameSite=${cookieOptions.sameSite}`,
  ]

  if (cookieOptions.httpOnly) {
    cookieParts.push('HttpOnly')
  }

  if (cookieOptions.secure) {
    cookieParts.push('Secure')
  }

  headers.append('Set-Cookie', cookieParts.join('; '))

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Get the auth token from request cookies
 *
 * @param request - Request object to extract cookie from
 * @returns JWT token if present, null otherwise
 */
export function getAuthCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) {
    return null
  }

  const cookies = parseCookies(cookieHeader)
  return cookies[AUTH_COOKIE_NAME] || null
}

/**
 * Clear the auth cookie on a response
 *
 * @param response - Response object to clear cookie on
 * @returns New Response with cookie cleared
 */
export function clearAuthCookie(response: Response): Response {
  const headers = new Headers(response.headers)

  const cookieParts = [
    `${AUTH_COOKIE_NAME}=`,
    `Path=${cookieOptions.path}`,
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ]

  if (cookieOptions.httpOnly) {
    cookieParts.push('HttpOnly')
  }

  if (cookieOptions.secure) {
    cookieParts.push('Secure')
  }

  headers.append('Set-Cookie', cookieParts.join('; '))

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Parse cookie header into key-value object
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}

  for (const pair of cookieHeader.split(';')) {
    const [key, ...valueParts] = pair.trim().split('=')
    if (key) {
      cookies[key] = valueParts.join('=')
    }
  }

  return cookies
}
