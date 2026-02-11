export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSEOSettings, updateSEOSettings } from '@/lib/landing-pages/db'
import type { SEOSettings } from '@/lib/landing-pages/types'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const settings = await withTenant(tenantSlug, () => getSEOSettings())

  // Return defaults if no settings exist
  if (!settings) {
    return NextResponse.json({
      settings: {
        default_title_template: '%s | Brand',
        default_description: '',
        site_name: 'Brand',
        og_default_image: null,
        twitter_handle: null,
        google_site_verification: null,
        bing_site_verification: null,
        robots_txt: 'User-agent: *\nAllow: /',
        sitemap_enabled: true,
      },
    })
  }

  return NextResponse.json({ settings })
}

export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: Partial<SEOSettings>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const settings = await withTenant(tenantSlug, () => updateSEOSettings(body))

  return NextResponse.json({ settings })
}
