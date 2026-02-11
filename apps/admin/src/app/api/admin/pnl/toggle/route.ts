export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk/db'

import type { ToggleableItemType } from '@/lib/expenses/types'

const VALID_ITEM_TYPES: ToggleableItemType[] = [
  'operating_expense',
  'vendor_payout',
  'contractor_payout',
  'creator_payout',
]

/**
 * Toggle P&L inclusion for various expense types
 */
export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    item_type?: string
    item_id?: string
    count_for_pnl?: boolean
    exclusion_reason?: string
    // Batch mode
    items?: Array<{
      item_type: string
      item_id: string
      count_for_pnl: boolean
      exclusion_reason?: string
    }>
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Batch update
  if (body.items && Array.isArray(body.items)) {
    const results: Array<{ item_type: string; item_id: string; success: boolean; error?: string }> = []

    for (const item of body.items) {
      if (!item.item_type || !VALID_ITEM_TYPES.includes(item.item_type as ToggleableItemType)) {
        results.push({
          item_type: item.item_type,
          item_id: item.item_id,
          success: false,
          error: `Invalid item_type. Must be one of: ${VALID_ITEM_TYPES.join(', ')}`,
        })
        continue
      }

      if (!item.item_id) {
        results.push({
          item_type: item.item_type,
          item_id: item.item_id,
          success: false,
          error: 'item_id is required',
        })
        continue
      }

      if (typeof item.count_for_pnl !== 'boolean') {
        results.push({
          item_type: item.item_type,
          item_id: item.item_id,
          success: false,
          error: 'count_for_pnl must be a boolean',
        })
        continue
      }

      // Require reason when excluding
      if (!item.count_for_pnl && !item.exclusion_reason) {
        results.push({
          item_type: item.item_type,
          item_id: item.item_id,
          success: false,
          error: 'exclusion_reason is required when excluding from P&L',
        })
        continue
      }

      try {
        const success = await toggleItemPnl(
          tenantSlug,
          item.item_type as ToggleableItemType,
          item.item_id,
          item.count_for_pnl,
          item.exclusion_reason
        )

        results.push({
          item_type: item.item_type,
          item_id: item.item_id,
          success,
          error: success ? undefined : 'Item not found',
        })
      } catch (error) {
        results.push({
          item_type: item.item_type,
          item_id: item.item_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const allSuccess = results.every((r) => r.success)
    return NextResponse.json({
      success: allSuccess,
      results,
      total: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    })
  }

  // Single update
  if (!body.item_type || !VALID_ITEM_TYPES.includes(body.item_type as ToggleableItemType)) {
    return NextResponse.json(
      { error: `item_type is required and must be one of: ${VALID_ITEM_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  if (!body.item_id) {
    return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
  }

  if (typeof body.count_for_pnl !== 'boolean') {
    return NextResponse.json({ error: 'count_for_pnl must be a boolean' }, { status: 400 })
  }

  // Require reason when excluding
  if (!body.count_for_pnl && !body.exclusion_reason) {
    return NextResponse.json(
      { error: 'exclusion_reason is required when excluding from P&L' },
      { status: 400 }
    )
  }

  const success = await toggleItemPnl(
    tenantSlug,
    body.item_type as ToggleableItemType,
    body.item_id,
    body.count_for_pnl,
    body.exclusion_reason
  )

  if (!success) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

/**
 * Toggle P&L inclusion for a specific item
 */
async function toggleItemPnl(
  tenantSlug: string,
  itemType: ToggleableItemType,
  itemId: string,
  countForPnl: boolean,
  exclusionReason?: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    let result

    switch (itemType) {
      case 'operating_expense':
        result = await sql`
          UPDATE operating_expenses
          SET
            count_for_pnl = ${countForPnl},
            pnl_exclusion_reason = ${countForPnl ? null : (exclusionReason || null)},
            updated_at = NOW()
          WHERE id = ${itemId}
          RETURNING id
        `
        break

      case 'vendor_payout':
        result = await sql`
          UPDATE vendor_payouts
          SET
            count_for_pnl = ${countForPnl},
            pnl_exclusion_reason = ${countForPnl ? null : (exclusionReason || null)},
            updated_at = NOW()
          WHERE id = ${itemId}
          RETURNING id
        `
        break

      case 'contractor_payout':
        result = await sql`
          UPDATE contractor_payouts
          SET
            count_for_pnl = ${countForPnl},
            pnl_exclusion_reason = ${countForPnl ? null : (exclusionReason || null)},
            updated_at = NOW()
          WHERE id = ${itemId}
          RETURNING id
        `
        break

      case 'creator_payout':
        // Creator payouts don't have a toggle - they're always included
        // But we could add a metadata field if needed
        return false

      default:
        return false
    }

    return (result.rowCount ?? 0) > 0
  })
}
