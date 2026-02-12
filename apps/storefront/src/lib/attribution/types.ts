/**
 * Attribution tracking types
 */

/**
 * Attribution touchpoint data
 */
export interface AttributionTouchpoint {
  /** Unique touchpoint ID */
  id?: string
  /** Visitor ID */
  visitorId: string
  /** Session ID */
  sessionId?: string
  /** Touchpoint timestamp */
  timestamp: string
  /** Landing page URL */
  landingPage: string
  /** Referrer URL */
  referrer?: string

  // UTM parameters
  /** Traffic source (utm_source) */
  utmSource?: string
  /** Marketing medium (utm_medium) */
  utmMedium?: string
  /** Campaign name (utm_campaign) */
  utmCampaign?: string
  /** Paid keywords (utm_term) */
  utmTerm?: string
  /** Ad/link differentiator (utm_content) */
  utmContent?: string

  // Click IDs from ad platforms
  /** Meta/Facebook click ID */
  fbclid?: string
  /** Google Ads click ID */
  gclid?: string
  /** TikTok click ID */
  ttclid?: string

  // Additional identifiers
  /** Creator/affiliate code */
  creatorCode?: string

  // Device info
  /** User agent string */
  userAgent?: string
  /** Device type */
  deviceType?: 'desktop' | 'mobile' | 'tablet'
}

/**
 * Stored attribution data (persisted in cookie/session)
 */
export interface StoredAttribution {
  /** First touch attribution */
  firstTouch: AttributionTouchpoint
  /** Last touch attribution */
  lastTouch: AttributionTouchpoint
  /** All touchpoints in the journey */
  touchpoints: AttributionTouchpoint[]
  /** Total number of touchpoints */
  touchpointCount: number
}

/**
 * Attribution cookie data
 */
export interface AttributionCookieData {
  /** Visitor ID */
  visitorId: string
  /** First touchpoint */
  firstTouch: AttributionTouchpoint
  /** Last touchpoint */
  lastTouch: AttributionTouchpoint
  /** Cookie creation timestamp */
  createdAt: string
  /** Last updated timestamp */
  updatedAt: string
}

/**
 * Options for recording a touchpoint
 */
export interface RecordTouchpointOptions {
  /** Force record even if same session */
  forceNew?: boolean
  /** Custom visitor ID (defaults to cookie) */
  visitorId?: string
  /** Custom session ID */
  sessionId?: string
}

/**
 * Attribution summary for cart/checkout
 */
export interface AttributionSummary {
  /** Source of first visit */
  source?: string
  /** Medium of first visit */
  medium?: string
  /** Campaign that brought visitor */
  campaign?: string
  /** Creator code if affiliate */
  creatorCode?: string
  /** Click ID for conversion tracking */
  clickId?: string
  /** Platform of click ID */
  clickPlatform?: 'meta' | 'google' | 'tiktok'
}

/**
 * Parsed URL parameters for attribution
 */
export interface ParsedAttributionParams {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  fbclid?: string
  gclid?: string
  ttclid?: string
  creatorCode?: string
}
