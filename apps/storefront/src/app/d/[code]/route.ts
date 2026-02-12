/**
 * Shareable discount link route
 *
 * Handles: /d/{CODE}
 *
 * Flow:
 * 1. Parse code from URL
 * 2. Get platform metadata (OG settings, redirect target)
 * 3. If social crawler: Return page with OG meta tags
 * 4. If user visit:
 *    - Set discount cookie/session
 *    - Redirect to target (product/collection/home)
 *    - Track visit for attribution
 */

import { withTenant, sql } from '@cgk/db'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface PromoCodeMetadata {
  id: string
  code: string
  shopify_discount_id: string | null
  creator_id: string | null
  og_title: string | null
  og_description: string | null
  og_image: string | null
  redirect_target: 'HOME' | 'PRODUCT' | 'COLLECTION'
  redirect_handle: string | null
}

interface RouteContext {
  params: Promise<{ code: string }>
}

// User agents that are likely social media crawlers
const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'Pinterest',
  'Slackbot',
  'TelegramBot',
  'WhatsApp',
  'Discordbot',
]

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  return CRAWLER_USER_AGENTS.some((crawler) =>
    userAgent.toLowerCase().includes(crawler.toLowerCase()),
  )
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Get promo code metadata
  const metadata = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, code, shopify_discount_id, creator_id,
        og_title, og_description, og_image,
        redirect_target, redirect_handle
      FROM promo_code_metadata
      WHERE code = ${code.toUpperCase()}
      LIMIT 1
    `
    return result.rows[0] as PromoCodeMetadata | undefined
  })

  // If code not found in our system, redirect to home with the code as a query param
  // Shopify can still try to apply it
  if (!metadata) {
    return NextResponse.redirect(
      new URL(`/?discount=${encodeURIComponent(code)}`, request.url),
    )
  }

  const userAgent = request.headers.get('user-agent')

  // For social media crawlers, return an HTML page with OG meta tags
  if (isCrawler(userAgent)) {
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Shop'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

    const title = metadata.og_title || `${metadata.code} - Discount Code`
    const description =
      metadata.og_description ||
      `Use code ${metadata.code} for a special discount at ${siteName}`
    const image = metadata.og_image || `${siteUrl}/og-default.png`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${siteUrl}/d/${metadata.code}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
</head>
<body>
  <p>Redirecting to ${escapeHtml(siteName)}...</p>
</body>
</html>
`.trim()

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  // For regular users, set discount cookie and redirect
  const cookieStore = await cookies()

  // Set discount code cookie (Shopify will read this)
  cookieStore.set('discount_code', metadata.code, {
    httpOnly: false, // Needs to be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  // Set attribution cookie for creator tracking
  if (metadata.creator_id) {
    cookieStore.set('attribution_creator', metadata.creator_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
  }

  // Track the visit
  await trackPromoCodeVisit(tenantSlug, metadata.id)

  // Determine redirect URL
  let redirectPath = '/'

  switch (metadata.redirect_target) {
    case 'PRODUCT':
      if (metadata.redirect_handle) {
        redirectPath = `/products/${metadata.redirect_handle}`
      }
      break
    case 'COLLECTION':
      if (metadata.redirect_handle) {
        redirectPath = `/collections/${metadata.redirect_handle}`
      }
      break
    case 'HOME':
    default:
      redirectPath = '/'
  }

  // Add discount code to URL for Shopify
  const redirectUrl = new URL(redirectPath, request.url)
  redirectUrl.searchParams.set('discount', metadata.code)

  return NextResponse.redirect(redirectUrl)
}

/**
 * Track promo code visit for analytics
 */
async function trackPromoCodeVisit(
  tenantSlug: string,
  promoCodeId: string,
): Promise<void> {
  try {
    await withTenant(tenantSlug, async () => {
      // Simple increment - we could add more detailed tracking later
      await sql`
        UPDATE promo_code_metadata
        SET uses_count = uses_count + 1
        WHERE id = ${promoCodeId}
      `
    })
  } catch (error) {
    // Don't fail the redirect if tracking fails
    console.error('Failed to track promo code visit:', error)
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
