export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getCOGSConfig,
  upsertCOGSConfig,
  logPLConfigChange,
  DEFAULT_COGS_CONFIG,
  type COGSConfigUpdate,
} from '@/lib/finance'

/**
 * GET /api/admin/finance/cogs
 * Get the tenant's COGS source configuration
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const config = await getCOGSConfig(tenantSlug, tenantId)

  // Return config or defaults
  if (!config) {
    return NextResponse.json({
      config: {
        ...DEFAULT_COGS_CONFIG,
        id: null,
        tenantId,
        updatedAt: null,
        updatedBy: null,
      },
      isDefault: true,
    })
  }

  return NextResponse.json({ config, isDefault: false })
}

/**
 * PUT /api/admin/finance/cogs
 * Update the tenant's COGS source configuration
 */
export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: COGSConfigUpdate

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate source
  if (body.source && !['shopify', 'internal'].includes(body.source)) {
    return NextResponse.json(
      { error: 'COGS source must be either "shopify" or "internal"' },
      { status: 400 },
    )
  }

  // Validate sync frequency
  if (body.shopifySyncFrequency && !['realtime', 'hourly', 'daily'].includes(body.shopifySyncFrequency)) {
    return NextResponse.json(
      { error: 'Invalid sync frequency' },
      { status: 400 },
    )
  }

  // Validate fallback behavior
  if (body.fallbackBehavior && !['zero', 'skip_pnl', 'use_default', 'percentage_of_price'].includes(body.fallbackBehavior)) {
    return NextResponse.json(
      { error: 'Invalid fallback behavior' },
      { status: 400 },
    )
  }

  // Validate fallback percent if using percentage_of_price
  if (body.fallbackBehavior === 'percentage_of_price') {
    if (body.fallbackPercent === undefined || body.fallbackPercent < 0 || body.fallbackPercent > 1) {
      return NextResponse.json(
        { error: 'Fallback percent must be between 0 and 100%' },
        { status: 400 },
      )
    }
  }

  // Get existing config for audit log
  const existingConfig = await getCOGSConfig(tenantSlug, tenantId)

  const config = await upsertCOGSConfig(tenantSlug, tenantId, body, userId)

  // Log the change
  await logPLConfigChange(tenantSlug, tenantId, 'cogs_source', 'update', userId, {
    oldValue: existingConfig,
    newValue: config,
    ipAddress: headerList.get('x-forwarded-for') ?? undefined,
    userAgent: headerList.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ success: true, config })
}
