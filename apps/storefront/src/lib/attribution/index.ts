/**
 * Attribution Tracking Module
 *
 * Captures and persists marketing attribution data including:
 * - UTM parameters (source, medium, campaign, term, content)
 * - Ad platform click IDs (fbclid, gclid, ttclid)
 * - Creator/affiliate codes
 *
 * Supports both first-touch and last-touch attribution models.
 */

import { withTenant, sql } from '@cgk/db'

import { generateVisitorId, generateSessionId } from '../cart/attributes'
import { getTenantSlug } from '../tenant'

import {
  getAttributionFromCookie,
  updateLastTouch,
} from './storage'
import type {
  AttributionCookieData,
  AttributionSummary,
  AttributionTouchpoint,
  ParsedAttributionParams,
  RecordTouchpointOptions,
} from './types'

export * from './types'
export {
  getAttributionFromCookie,
  saveAttributionToCookie,
  parseServerAttributionCookie,
  buildAttributionSetCookieHeader,
  getVisitorIdFromAttributionCookie,
  clearAttributionCookie,
} from './storage'

/**
 * Initialize attribution tracking on page load
 *
 * Call this on every page load to capture attribution data.
 * Only updates if there are new UTM parameters or click IDs.
 */
export function initAttributionTracking(): AttributionCookieData | null {
  if (typeof window === 'undefined') return null

  // Parse current URL parameters
  const params = parseAttributionParams(window.location.href)

  // Check if this is a new marketing touchpoint
  const hasMarketingParams = !!(
    params.utmSource ||
    params.fbclid ||
    params.gclid ||
    params.ttclid ||
    params.creatorCode
  )

  // Get existing attribution
  const existing = getAttributionFromCookie()

  // If no marketing params and we have existing attribution, skip
  if (!hasMarketingParams && existing) {
    return existing
  }

  // Build touchpoint
  const visitorId = existing?.visitorId ?? generateVisitorId()
  const touchpoint = buildTouchpoint(visitorId, params)

  // Update cookie with new last touch
  return updateLastTouch(touchpoint)
}

/**
 * Record a touchpoint to the database
 *
 * @param touchpoint - Touchpoint data to record
 * @param options - Recording options
 */
export async function recordTouchpoint(
  touchpoint?: Partial<AttributionTouchpoint>,
  options: RecordTouchpointOptions = {}
): Promise<void> {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return

  // Get touchpoint from cookie if not provided
  let fullTouchpoint: AttributionTouchpoint

  if (!touchpoint) {
    const cookieData = getAttributionFromCookie()
    if (!cookieData) return
    fullTouchpoint = cookieData.lastTouch
  } else {
    const visitorId = options.visitorId ?? generateVisitorId()
    fullTouchpoint = {
      visitorId,
      timestamp: new Date().toISOString(),
      landingPage: touchpoint.landingPage ?? '/',
      ...touchpoint,
    }
  }

  await withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO attribution_touchpoints (
        visitor_id,
        session_id,
        landing_page,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        fbclid,
        gclid,
        ttclid,
        creator_code,
        user_agent,
        device_type,
        created_at
      ) VALUES (
        ${fullTouchpoint.visitorId},
        ${fullTouchpoint.sessionId ?? null},
        ${fullTouchpoint.landingPage},
        ${fullTouchpoint.referrer ?? null},
        ${fullTouchpoint.utmSource ?? null},
        ${fullTouchpoint.utmMedium ?? null},
        ${fullTouchpoint.utmCampaign ?? null},
        ${fullTouchpoint.utmTerm ?? null},
        ${fullTouchpoint.utmContent ?? null},
        ${fullTouchpoint.fbclid ?? null},
        ${fullTouchpoint.gclid ?? null},
        ${fullTouchpoint.ttclid ?? null},
        ${fullTouchpoint.creatorCode ?? null},
        ${fullTouchpoint.userAgent ?? null},
        ${fullTouchpoint.deviceType ?? null},
        ${fullTouchpoint.timestamp}
      )
    `
  })
}

/**
 * Get stored attribution for current visitor
 */
export function getStoredAttribution(): AttributionCookieData | null {
  return getAttributionFromCookie()
}

/**
 * Get attribution summary for cart/checkout
 *
 * Returns a simplified view of attribution for order tagging.
 */
export function getAttributionSummary(): AttributionSummary | null {
  const data = getAttributionFromCookie()
  if (!data) return null

  // Use first touch for source/medium/campaign
  const firstTouch = data.firstTouch

  const summary: AttributionSummary = {}

  if (firstTouch.utmSource) {
    summary.source = firstTouch.utmSource
  }
  if (firstTouch.utmMedium) {
    summary.medium = firstTouch.utmMedium
  }
  if (firstTouch.utmCampaign) {
    summary.campaign = firstTouch.utmCampaign
  }
  if (firstTouch.creatorCode) {
    summary.creatorCode = firstTouch.creatorCode
  }

  // Use last touch click ID for conversion tracking
  const lastTouch = data.lastTouch

  if (lastTouch.fbclid) {
    summary.clickId = lastTouch.fbclid
    summary.clickPlatform = 'meta'
  } else if (lastTouch.gclid) {
    summary.clickId = lastTouch.gclid
    summary.clickPlatform = 'google'
  } else if (lastTouch.ttclid) {
    summary.clickId = lastTouch.ttclid
    summary.clickPlatform = 'tiktok'
  }

  return summary
}

/**
 * Parse attribution parameters from URL
 */
export function parseAttributionParams(url: string | URL): ParsedAttributionParams {
  const urlObj = typeof url === 'string' ? new URL(url, 'https://example.com') : url
  const params = urlObj.searchParams

  return {
    utmSource: params.get('utm_source') ?? undefined,
    utmMedium: params.get('utm_medium') ?? undefined,
    utmCampaign: params.get('utm_campaign') ?? undefined,
    utmTerm: params.get('utm_term') ?? undefined,
    utmContent: params.get('utm_content') ?? undefined,
    fbclid: params.get('fbclid') ?? undefined,
    gclid: params.get('gclid') ?? undefined,
    ttclid: params.get('ttclid') ?? undefined,
    creatorCode: params.get('ref') ?? params.get('creator') ?? undefined,
  }
}

/**
 * Build a touchpoint from parsed parameters
 */
function buildTouchpoint(
  visitorId: string,
  params: ParsedAttributionParams
): AttributionTouchpoint {
  const touchpoint: AttributionTouchpoint = {
    visitorId,
    timestamp: new Date().toISOString(),
    landingPage: typeof window !== 'undefined' ? window.location.pathname : '/',
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    sessionId: generateSessionId(),
  }

  // UTM parameters
  if (params.utmSource) touchpoint.utmSource = params.utmSource
  if (params.utmMedium) touchpoint.utmMedium = params.utmMedium
  if (params.utmCampaign) touchpoint.utmCampaign = params.utmCampaign
  if (params.utmTerm) touchpoint.utmTerm = params.utmTerm
  if (params.utmContent) touchpoint.utmContent = params.utmContent

  // Click IDs
  if (params.fbclid) touchpoint.fbclid = params.fbclid
  if (params.gclid) touchpoint.gclid = params.gclid
  if (params.ttclid) touchpoint.ttclid = params.ttclid

  // Creator code
  if (params.creatorCode) touchpoint.creatorCode = params.creatorCode

  // Device info
  if (typeof navigator !== 'undefined') {
    touchpoint.userAgent = navigator.userAgent
    touchpoint.deviceType = getDeviceType(navigator.userAgent)
  }

  return touchpoint
}

/**
 * Detect device type from user agent
 */
function getDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  const ua = userAgent.toLowerCase()

  // Check for tablets first (iPads, Android tablets)
  if (/ipad|tablet|playbook|silk/i.test(ua)) {
    return 'tablet'
  }

  // Check for mobile devices
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile'
  }

  return 'desktop'
}

/**
 * Get all touchpoints for a visitor from database
 */
export async function getVisitorTouchpoints(
  visitorId: string
): Promise<AttributionTouchpoint[]> {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return []

  return withTenant(tenantSlug, async () => {
    const result = await sql<{
      id: string
      visitor_id: string
      session_id: string | null
      landing_page: string
      referrer: string | null
      utm_source: string | null
      utm_medium: string | null
      utm_campaign: string | null
      utm_term: string | null
      utm_content: string | null
      fbclid: string | null
      gclid: string | null
      ttclid: string | null
      creator_code: string | null
      user_agent: string | null
      device_type: string | null
      created_at: string
    }>`
      SELECT *
      FROM attribution_touchpoints
      WHERE visitor_id = ${visitorId}
      ORDER BY created_at ASC
    `

    return result.rows.map((row) => ({
      id: row.id,
      visitorId: row.visitor_id,
      sessionId: row.session_id ?? undefined,
      landingPage: row.landing_page,
      referrer: row.referrer ?? undefined,
      utmSource: row.utm_source ?? undefined,
      utmMedium: row.utm_medium ?? undefined,
      utmCampaign: row.utm_campaign ?? undefined,
      utmTerm: row.utm_term ?? undefined,
      utmContent: row.utm_content ?? undefined,
      fbclid: row.fbclid ?? undefined,
      gclid: row.gclid ?? undefined,
      ttclid: row.ttclid ?? undefined,
      creatorCode: row.creator_code ?? undefined,
      userAgent: row.user_agent ?? undefined,
      deviceType: row.device_type as 'desktop' | 'mobile' | 'tablet' | undefined,
      timestamp: row.created_at,
    }))
  })
}
