/**
 * Attribution storage utilities
 *
 * Handles cookie storage for attribution data.
 */

import type { AttributionCookieData, AttributionTouchpoint } from './types'

const ATTRIBUTION_COOKIE_NAME = 'cgk_attribution'
const COOKIE_EXPIRY_DAYS = 30

/**
 * Get attribution data from cookie (client-side)
 */
export function getAttributionFromCookie(): AttributionCookieData | null {
  if (typeof window === 'undefined') return null

  const match = document.cookie.match(new RegExp(`${ATTRIBUTION_COOKIE_NAME}=([^;]+)`))
  if (!match || !match[1]) return null

  try {
    return JSON.parse(decodeURIComponent(match[1]))
  } catch {
    return null
  }
}

/**
 * Save attribution data to cookie (client-side)
 */
export function saveAttributionToCookie(data: AttributionCookieData): void {
  if (typeof window === 'undefined') return

  const expires = new Date()
  expires.setDate(expires.getDate() + COOKIE_EXPIRY_DAYS)

  document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(data))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

/**
 * Update last touch attribution (client-side)
 */
export function updateLastTouch(touchpoint: AttributionTouchpoint): AttributionCookieData {
  const existing = getAttributionFromCookie()

  const data: AttributionCookieData = {
    visitorId: touchpoint.visitorId,
    firstTouch: existing?.firstTouch ?? touchpoint,
    lastTouch: touchpoint,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  saveAttributionToCookie(data)
  return data
}

/**
 * Parse cookie header on server side
 */
export function parseServerAttributionCookie(cookieHeader: string): AttributionCookieData | null {
  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      if (key && value) {
        acc[key] = value
      }
      return acc
    },
    {} as Record<string, string>
  )

  const attrCookie = cookies[ATTRIBUTION_COOKIE_NAME]
  if (!attrCookie) return null

  try {
    return JSON.parse(decodeURIComponent(attrCookie))
  } catch {
    return null
  }
}

/**
 * Build Set-Cookie header value for attribution
 */
export function buildAttributionSetCookieHeader(data: AttributionCookieData): string {
  const expires = new Date()
  expires.setDate(expires.getDate() + COOKIE_EXPIRY_DAYS)

  return `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(data))}; Expires=${expires.toUTCString()}; Path=/; SameSite=Lax`
}

/**
 * Get visitor ID from attribution cookie
 */
export function getVisitorIdFromAttributionCookie(): string | null {
  const data = getAttributionFromCookie()
  return data?.visitorId ?? null
}

/**
 * Clear attribution cookie
 */
export function clearAttributionCookie(): void {
  if (typeof window === 'undefined') return

  document.cookie = `${ATTRIBUTION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}
