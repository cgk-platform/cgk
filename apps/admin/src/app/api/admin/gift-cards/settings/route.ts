export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getGiftCardSettings,
  updateGiftCardSettings,
  type GiftCardSettings,
} from '@/lib/gift-card'

/**
 * GET /api/admin/gift-cards/settings
 * Get gift card settings
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const settings = await withTenant(tenantSlug, async () => {
    return getGiftCardSettings()
  })

  return NextResponse.json({ settings })
}

/**
 * PUT /api/admin/gift-cards/settings
 * Update gift card settings
 */
export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: Partial<GiftCardSettings>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate settings
  if (body.default_amount_cents !== undefined && body.default_amount_cents < 0) {
    return NextResponse.json({ error: 'Default amount cannot be negative' }, { status: 400 })
  }

  if (body.from_email !== undefined && body.from_email && !body.from_email.includes('@')) {
    return NextResponse.json({ error: 'Invalid from email address' }, { status: 400 })
  }

  if (
    body.admin_notification_enabled &&
    body.admin_notification_email !== undefined &&
    body.admin_notification_email &&
    !body.admin_notification_email.includes('@')
  ) {
    return NextResponse.json({ error: 'Invalid admin notification email address' }, { status: 400 })
  }

  const settings = await withTenant(tenantSlug, async () => {
    return updateGiftCardSettings(body)
  })

  return NextResponse.json({ settings })
}
