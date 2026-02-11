export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getVariableCostConfig,
  upsertVariableCostConfig,
  resetVariableCostConfig,
  logPLConfigChange,
  DEFAULT_VARIABLE_COST_CONFIG,
  type VariableCostConfigUpdate,
} from '@/lib/finance'

/**
 * GET /api/admin/finance/costs
 * Get the tenant's variable cost configuration
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const config = await getVariableCostConfig(tenantSlug, tenantId)

  // Return config or defaults
  if (!config) {
    return NextResponse.json({
      config: {
        ...DEFAULT_VARIABLE_COST_CONFIG,
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
 * PUT /api/admin/finance/costs
 * Update the tenant's variable cost configuration
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

  let body: VariableCostConfigUpdate

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Get existing config for audit log
  const existingConfig = await getVariableCostConfig(tenantSlug, tenantId)

  // Validate payment processing rates
  if (body.paymentProcessing) {
    const pp = body.paymentProcessing
    if (pp.percentageRate !== undefined && (pp.percentageRate < 0 || pp.percentageRate > 0.2)) {
      return NextResponse.json(
        { error: 'Payment processing percentage rate must be between 0% and 20%' },
        { status: 400 },
      )
    }
    if (pp.fixedFeeCents !== undefined && (pp.fixedFeeCents < 0 || pp.fixedFeeCents > 500)) {
      return NextResponse.json(
        { error: 'Payment processing fixed fee must be between $0.00 and $5.00' },
        { status: 400 },
      )
    }
  }

  // Validate fulfillment costs
  if (body.fulfillment) {
    const ff = body.fulfillment
    if (ff.pickPackFeeCents !== undefined && ff.pickPackFeeCents < 0) {
      return NextResponse.json({ error: 'Pick/pack fee cannot be negative' }, { status: 400 })
    }
    if (ff.packagingCostCents !== undefined && ff.packagingCostCents < 0) {
      return NextResponse.json({ error: 'Packaging cost cannot be negative' }, { status: 400 })
    }
  }

  const config = await upsertVariableCostConfig(tenantSlug, tenantId, body, userId)

  // Log the change
  await logPLConfigChange(tenantSlug, tenantId, 'variable_costs', 'update', userId, {
    oldValue: existingConfig,
    newValue: config,
    ipAddress: headerList.get('x-forwarded-for') ?? undefined,
    userAgent: headerList.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ success: true, config })
}

/**
 * DELETE /api/admin/finance/costs
 * Reset to default configuration
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
  const existingConfig = await getVariableCostConfig(tenantSlug, tenantId)

  const success = await resetVariableCostConfig(tenantSlug, tenantId)

  if (existingConfig) {
    await logPLConfigChange(tenantSlug, tenantId, 'variable_costs', 'delete', userId, {
      oldValue: existingConfig,
    })
  }

  return NextResponse.json({ success, message: 'Reset to defaults' })
}
