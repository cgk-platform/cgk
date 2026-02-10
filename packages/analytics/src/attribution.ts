/**
 * Attribution tracking
 */

export interface AttributionData {
  source: AttributionSource
  medium?: string
  campaign?: string
  term?: string
  content?: string
  creatorCode?: string
  referrer?: string
  landingPage?: string
  timestamp: number
  sessionId?: string
}

export type AttributionSource =
  | 'direct'
  | 'organic'
  | 'paid'
  | 'social'
  | 'email'
  | 'affiliate'
  | 'creator'
  | 'referral'

const ATTRIBUTION_COOKIE = 'cgk_attribution'
const ATTRIBUTION_EXPIRY_DAYS = 30

/**
 * Parse attribution parameters from URL
 */
export function parseAttributionParams(url: string | URL): Partial<AttributionData> {
  const urlObj = typeof url === 'string' ? new URL(url) : url
  const params = urlObj.searchParams

  const data: Partial<AttributionData> = {
    timestamp: Date.now(),
    landingPage: urlObj.pathname,
  }

  // UTM parameters
  if (params.get('utm_source')) data.source = categorizeSource(params.get('utm_source')!)
  if (params.get('utm_medium')) data.medium = params.get('utm_medium')!
  if (params.get('utm_campaign')) data.campaign = params.get('utm_campaign')!
  if (params.get('utm_term')) data.term = params.get('utm_term')!
  if (params.get('utm_content')) data.content = params.get('utm_content')!

  // Creator code (custom parameter)
  if (params.get('ref') || params.get('creator')) {
    data.creatorCode = params.get('ref') ?? params.get('creator') ?? undefined
    data.source = 'creator'
  }

  return data
}

/**
 * Categorize traffic source
 */
function categorizeSource(source: string): AttributionSource {
  const lowered = source.toLowerCase()

  if (['google', 'bing', 'yahoo', 'duckduckgo'].some((s) => lowered.includes(s))) {
    return 'organic'
  }
  if (['facebook', 'instagram', 'twitter', 'tiktok', 'linkedin'].some((s) => lowered.includes(s))) {
    return 'social'
  }
  if (lowered.includes('email') || lowered.includes('newsletter')) {
    return 'email'
  }
  if (lowered.includes('affiliate')) {
    return 'affiliate'
  }

  return 'referral'
}

/**
 * Track attribution data
 */
export function trackAttribution(data: Partial<AttributionData>): void {
  if (typeof window === 'undefined') return

  const existingData = getAttributionFromCookie()

  // Only update if this is a new session or has campaign data
  if (existingData && !data.campaign && !data.creatorCode) {
    return
  }

  const attribution: AttributionData = {
    source: data.source ?? 'direct',
    medium: data.medium,
    campaign: data.campaign,
    term: data.term,
    content: data.content,
    creatorCode: data.creatorCode,
    referrer: data.referrer ?? document.referrer,
    landingPage: data.landingPage ?? window.location.pathname,
    timestamp: data.timestamp ?? Date.now(),
    sessionId: data.sessionId,
  }

  // Store in cookie
  const expires = new Date()
  expires.setDate(expires.getDate() + ATTRIBUTION_EXPIRY_DAYS)

  document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(attribution))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

/**
 * Get attribution data from cookie
 */
export function getAttributionFromCookie(): AttributionData | null {
  if (typeof window === 'undefined') return null

  const match = document.cookie.match(new RegExp(`${ATTRIBUTION_COOKIE}=([^;]+)`))
  if (!match || !match[1]) return null

  try {
    return JSON.parse(decodeURIComponent(match[1]))
  } catch {
    return null
  }
}
