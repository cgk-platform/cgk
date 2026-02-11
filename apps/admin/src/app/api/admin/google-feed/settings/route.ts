export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getGoogleFeedSettings,
  createGoogleFeedSettings,
  updateGoogleFeedSettings,
} from '@/lib/google-feed/db'
import type { GoogleFeedSettingsUpdateRequest } from '@/lib/google-feed/types'

/**
 * GET /api/admin/google-feed/settings
 *
 * Get Google Feed settings
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const settings = await withTenant(tenantSlug, async () => {
    return getGoogleFeedSettings()
  })

  return NextResponse.json({ settings })
}

/**
 * PUT /api/admin/google-feed/settings
 *
 * Update Google Feed settings
 */
export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: GoogleFeedSettingsUpdateRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const settings = await withTenant(tenantSlug, async () => {
    const existing = await getGoogleFeedSettings()

    if (existing) {
      return updateGoogleFeedSettings(existing.id, body)
    } else {
      return createGoogleFeedSettings(body)
    }
  })

  return NextResponse.json({ settings })
}
