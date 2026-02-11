/**
 * Geo Detection
 *
 * Provides IP-based geo detection utilities.
 * Uses Cloudflare/Vercel headers when available.
 */

import type { DeviceType } from '../types.js'

/**
 * Geo data extracted from request
 */
export interface GeoData {
  country?: string
  region?: string
  city?: string
  latitude?: number
  longitude?: number
  timezone?: string
}

/**
 * Device data extracted from User-Agent
 */
export interface DeviceData {
  deviceType: DeviceType
  browser?: string
  os?: string
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isBot: boolean
}

/**
 * Extract geo data from request headers
 *
 * Supports Cloudflare, Vercel, and standard headers
 */
export function extractGeoFromHeaders(headers: Headers): GeoData {
  const geo: GeoData = {}

  // Cloudflare headers
  geo.country = headers.get('cf-ipcountry') || undefined
  geo.city = headers.get('cf-ipcity') || undefined
  geo.latitude = parseFloat(headers.get('cf-iplat') || '') || undefined
  geo.longitude = parseFloat(headers.get('cf-iplon') || '') || undefined

  // Vercel headers (if Cloudflare not present)
  if (!geo.country) {
    geo.country = headers.get('x-vercel-ip-country') || undefined
  }
  if (!geo.region) {
    geo.region = headers.get('x-vercel-ip-country-region') || undefined
  }
  if (!geo.city) {
    geo.city = headers.get('x-vercel-ip-city') || undefined
  }
  if (!geo.latitude) {
    geo.latitude = parseFloat(headers.get('x-vercel-ip-latitude') || '') || undefined
  }
  if (!geo.longitude) {
    geo.longitude = parseFloat(headers.get('x-vercel-ip-longitude') || '') || undefined
  }
  geo.timezone = headers.get('x-vercel-ip-timezone') || undefined

  // Decode URL-encoded city names
  if (geo.city) {
    try {
      geo.city = decodeURIComponent(geo.city)
    } catch {
      // Keep as-is if decoding fails
    }
  }

  return geo
}

/**
 * Hash an IP address for privacy-safe storage
 *
 * @param ip - IP address to hash
 * @returns Hashed IP (first 8 chars of hex)
 */
export function hashIp(ip: string): string {
  // Simple hash for privacy (not cryptographic)
  let hash = 0
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8)
}

/**
 * Extract client IP from headers
 */
export function extractIpFromHeaders(headers: Headers): string | undefined {
  // Check various headers in order of preference
  const ipHeaders = [
    'cf-connecting-ip', // Cloudflare
    'x-real-ip', // Nginx
    'x-forwarded-for', // Standard proxy header
    'x-client-ip', // Some proxies
  ]

  for (const header of ipHeaders) {
    const value = headers.get(header)
    if (value) {
      // x-forwarded-for can contain multiple IPs
      const ip = value.split(',')[0]?.trim()
      if (ip && isValidIp(ip)) {
        return ip
      }
    }
  }

  return undefined
}

/**
 * Basic IP validation
 */
function isValidIp(ip: string): boolean {
  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    return true
  }
  // IPv6 (simplified check)
  if (/^[0-9a-fA-F:]+$/.test(ip) && ip.includes(':')) {
    return true
  }
  return false
}

/**
 * Parse User-Agent to extract device information
 */
export function parseUserAgent(userAgent: string): DeviceData {
  const ua = userAgent.toLowerCase()

  // Detect bots first
  const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp/i.test(ua)

  // Detect device type
  const isMobile = /mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)
  const isTablet = /tablet|ipad|playbook|silk/i.test(ua)
  const isDesktop = !isMobile && !isTablet

  let deviceType: DeviceType = 'desktop'
  if (isMobile) deviceType = 'mobile'
  else if (isTablet) deviceType = 'tablet'

  // Detect browser
  let browser: string | undefined
  if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('edg/')) browser = 'Edge'
  else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome'
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera'
  else if (ua.includes('msie') || ua.includes('trident')) browser = 'IE'

  // Detect OS
  let os: string | undefined
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac os') || ua.includes('macintosh')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'

  return {
    deviceType,
    browser,
    os,
    isMobile,
    isTablet,
    isDesktop,
    isBot,
  }
}

/**
 * Get device type from User-Agent string
 */
export function getDeviceType(userAgent: string): DeviceType {
  return parseUserAgent(userAgent).deviceType
}

/**
 * Check if User-Agent is from a bot
 */
export function isBot(userAgent: string): boolean {
  return parseUserAgent(userAgent).isBot
}
