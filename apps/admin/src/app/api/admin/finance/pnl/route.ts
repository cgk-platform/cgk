export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getPLFormulaConfig,
  upsertPLFormulaConfig,
  resetPLFormulaConfig,
  logPLConfigChange,
  DEFAULT_PL_FORMULA_CONFIG,
  type PLFormulaConfigUpdate,
} from '@/lib/finance'

/**
 * GET /api/admin/finance/pnl
 * Get the tenant's P&L formula configuration
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const config = await getPLFormulaConfig(tenantSlug, tenantId)

  // Return config or defaults
  if (!config) {
    return NextResponse.json({
      config: {
        ...DEFAULT_PL_FORMULA_CONFIG,
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
 * PUT /api/admin/finance/pnl
 * Update the tenant's P&L formula configuration
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

  let body: PLFormulaConfigUpdate

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Get existing config for audit log
  const existingConfig = await getPLFormulaConfig(tenantSlug, tenantId)

  const config = await upsertPLFormulaConfig(tenantSlug, tenantId, body, userId)

  // Log the change
  await logPLConfigChange(tenantSlug, tenantId, 'formula', 'update', userId, {
    oldValue: existingConfig,
    newValue: config,
    ipAddress: headerList.get('x-forwarded-for') ?? undefined,
    userAgent: headerList.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ success: true, config })
}

/**
 * DELETE /api/admin/finance/pnl
 * Reset P&L formula to defaults
 */
export async function DELETE() {
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

  // Get existing config for audit log
  const existingConfig = await getPLFormulaConfig(tenantSlug, tenantId)

  const success = await resetPLFormulaConfig(tenantSlug, tenantId)

  if (existingConfig) {
    await logPLConfigChange(tenantSlug, tenantId, 'formula', 'delete', userId, {
      oldValue: existingConfig,
    })
  }

  return NextResponse.json({ success, message: 'Reset to defaults' })
}
