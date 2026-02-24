/**
 * Cart Cookie Management
 *
 * Handles cart ID persistence using cookies for cross-session cart recovery.
 */

/** Get tenant-specific cookie name for cart ID */
function getCartCookieName(tenantSlug?: string): string {
  return tenantSlug ? `${tenantSlug}_cart_id` : 'cgk_cart_id'
}

/** Cookie name for visitor ID */
const VISITOR_ID_COOKIE = 'cgk_visitor_id'

/** Cookie name for session ID */
const SESSION_ID_COOKIE = 'cgk_session_id'

/** Cookie expiration in days */
const CART_COOKIE_DAYS = 7
const VISITOR_COOKIE_DAYS = 365
const SESSION_COOKIE_HOURS = 24

/**
 * Get cart ID from cookie (client-side)
 */
export function getCartIdFromCookie(tenantSlug?: string): string | null {
  if (typeof document === 'undefined') return null
  return getCookie(getCartCookieName(tenantSlug))
}

/**
 * Set cart ID in cookie (client-side)
 */
export function setCartIdCookie(cartId: string, tenantSlug?: string): void {
  if (typeof document === 'undefined') return
  setCookie(getCartCookieName(tenantSlug), cartId, CART_COOKIE_DAYS)
}

/**
 * Remove cart ID cookie (client-side)
 */
export function removeCartIdCookie(tenantSlug?: string): void {
  if (typeof document === 'undefined') return
  deleteCookie(getCartCookieName(tenantSlug))
}

/**
 * Get visitor ID from cookie (client-side)
 */
export function getVisitorIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  return getCookie(VISITOR_ID_COOKIE)
}

/**
 * Set visitor ID in cookie (client-side)
 */
export function setVisitorIdCookie(visitorId: string): void {
  if (typeof document === 'undefined') return
  setCookie(VISITOR_ID_COOKIE, visitorId, VISITOR_COOKIE_DAYS)
}

/**
 * Get session ID from cookie (client-side)
 */
export function getSessionIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  return getCookie(SESSION_ID_COOKIE)
}

/**
 * Set session ID in cookie (client-side)
 */
export function setSessionIdCookie(sessionId: string): void {
  if (typeof document === 'undefined') return
  // Session cookie expires in hours, not days
  const expires = new Date()
  expires.setTime(expires.getTime() + SESSION_COOKIE_HOURS * 60 * 60 * 1000)
  document.cookie = `${SESSION_ID_COOKIE}=${encodeURIComponent(sessionId)};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

// --- Cookie Utilities ---

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue ? decodeURIComponent(cookieValue) : null
  }
  return null
}

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
}

/**
 * Parse cart ID from request cookies (server-side)
 */
export function parseCartIdFromHeaders(cookieHeader: string | null, tenantSlug?: string): string | null {
  if (!cookieHeader) return null

  const cartCookieName = getCartCookieName(tenantSlug)
  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === cartCookieName && value) {
      return decodeURIComponent(value)
    }
  }
  return null
}

/**
 * Parse visitor ID from request cookies (server-side)
 */
export function parseVisitorIdFromHeaders(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === VISITOR_ID_COOKIE && value) {
      return decodeURIComponent(value)
    }
  }
  return null
}

/**
 * Build Set-Cookie header for cart ID (server-side)
 */
export function buildCartIdSetCookieHeader(cartId: string, tenantSlug?: string): string {
  const expires = new Date()
  expires.setTime(expires.getTime() + CART_COOKIE_DAYS * 24 * 60 * 60 * 1000)
  return `${getCartCookieName(tenantSlug)}=${encodeURIComponent(cartId)}; Expires=${expires.toUTCString()}; Path=/; SameSite=Lax`
}

/**
 * Build Set-Cookie header for visitor ID (server-side)
 */
export function buildVisitorIdSetCookieHeader(visitorId: string): string {
  const expires = new Date()
  expires.setTime(expires.getTime() + VISITOR_COOKIE_DAYS * 24 * 60 * 60 * 1000)
  return `${VISITOR_ID_COOKIE}=${encodeURIComponent(visitorId)}; Expires=${expires.toUTCString()}; Path=/; SameSite=Lax`
}
