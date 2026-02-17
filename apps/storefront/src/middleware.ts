/**
 * Storefront middleware for tenant detection
 *
 * Detects tenant from:
 * 1. Custom domain mapping (www.mybrand.com -> tenant_slug)
 * 2. Subdomain (mybrand.platform.com -> mybrand)
 * 3. x-tenant-id header (for testing/API calls)
 *
 * Sets x-tenant-id header for downstream handlers.
 */

import { NextResponse, type NextRequest } from 'next/server'

// Reserved subdomains that should not be treated as tenant slugs
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'admin',
  'app',
  'dashboard',
  'help',
  'support',
  'docs',
  'status',
  'cdn',
  'assets',
  'static',
])

// Platform domains - subdomains of these are tenant slugs
const PLATFORM_DOMAINS = [
  'cgk.dev',
  'cgk.com',
  'commercegrowthkit.com',
  'localhost',
]

/**
 * Extract tenant slug from subdomain
 */
function extractTenantFromSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0] ?? ''

  // Skip localhost without subdomain
  if (host === 'localhost') {
    return null
  }

  // Check for IP addresses
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null
  }

  // Split by dots
  const parts = host.split('.')

  // For localhost subdomains (e.g., rawdog.localhost:3300)
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    const subdomain = parts[0]
    if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
      return subdomain
    }
    return null
  }

  // Need at least 3 parts for subdomain.domain.tld
  if (parts.length < 3) {
    return null
  }

  // Check if this is a platform domain
  const domainWithTld = parts.slice(-2).join('.')
  const isPlatformDomain = PLATFORM_DOMAINS.some((d) => {
    if (d === 'localhost') return false
    return domainWithTld === d || host.endsWith(`.${d}`)
  })

  if (isPlatformDomain) {
    const subdomain = parts[0]
    if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
      return subdomain
    }
  }

  return null
}

/**
 * In-memory cache for domain lookups
 * This is a simple LRU-style cache that expires entries after 5 minutes
 */
const domainCache = new Map<string, { slug: string | null; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Look up tenant from custom domain mapping
 * Custom domains are stored in organizations.domains JSONB column
 *
 * In Edge runtime, we use fetch to call an internal API for domain lookup
 * to avoid direct database access from middleware.
 */
async function lookupTenantFromCustomDomain(hostname: string): Promise<string | null> {
  // Remove port
  const host = hostname.split(':')[0] ?? ''

  // Skip platform domains and localhost
  if (PLATFORM_DOMAINS.some((d) => host.endsWith(d)) || host === 'localhost') {
    return null
  }

  // Check cache first
  const cached = domainCache.get(host)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.slug
  }

  // Call internal API endpoint to perform database lookup
  // The Edge runtime cannot directly access the database
  const internalApiUrl = process.env.INTERNAL_API_URL || process.env.APP_URL || ''
  const internalApiKey = process.env.INTERNAL_API_KEY

  if (!internalApiUrl) {
    // No API URL configured, cache null result
    domainCache.set(host, { slug: null, timestamp: Date.now() })
    return null
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Include internal API key if configured
    if (internalApiKey) {
      headers['x-internal-key'] = internalApiKey
    }

    const response = await fetch(`${internalApiUrl}/api/internal/domain-lookup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ domain: host }),
    })

    if (response.ok) {
      const data = (await response.json()) as { tenantSlug?: string | null }
      const slug = data.tenantSlug || null
      domainCache.set(host, { slug, timestamp: Date.now() })
      return slug
    }
  } catch {
    // Fall through to return null on network/parsing errors
  }

  // Cache null result to avoid repeated lookups for unknown domains
  domainCache.set(host, { slug: null, timestamp: Date.now() })
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl

  // Skip middleware for static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next()
  }

  // Check for existing x-tenant-id header (for testing)
  let tenantSlug = request.headers.get('x-tenant-slug')

  // Try to extract tenant from subdomain
  if (!tenantSlug) {
    tenantSlug = extractTenantFromSubdomain(hostname)
  }

  // Try to look up from custom domain
  if (!tenantSlug) {
    tenantSlug = await lookupTenantFromCustomDomain(hostname)
  }

  // If no tenant found, show a generic store or redirect to platform
  if (!tenantSlug) {
    // For development, default to a demo tenant
    if (process.env.NODE_ENV === 'development') {
      tenantSlug = process.env.DEFAULT_TENANT_SLUG ?? 'demo'
    } else {
      // In production, you might want to redirect or show an error
      // For now, we'll continue with no tenant and let pages handle it
      return NextResponse.next()
    }
  }

  // Validate tenant slug format (alphanumeric + underscore)
  if (!/^[a-z0-9_]+$/.test(tenantSlug)) {
    return new NextResponse('Invalid store', { status: 400 })
  }

  // Clone headers and add tenant context
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', tenantSlug)

  // Return response with modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (robots.txt, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
