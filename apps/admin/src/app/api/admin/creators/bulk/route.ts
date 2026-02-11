export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { bulkUpdateCreators, deleteCreator } from '@/lib/creators/db'
import type { BulkAction, CreatorStatus, CreatorTier } from '@/lib/creators/types'
import { CREATOR_STATUSES, CREATOR_TIERS } from '@/lib/creators/types'

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: BulkAction
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate action type
  const validActions = ['status', 'tags', 'tier', 'deactivate', 'delete']
  if (!validActions.includes(body.type)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
      { status: 400 },
    )
  }

  // Validate creator IDs
  if (!body.creatorIds || !Array.isArray(body.creatorIds) || body.creatorIds.length === 0) {
    return NextResponse.json({ error: 'creatorIds array is required' }, { status: 400 })
  }

  // Limit bulk operations to 100 creators at a time
  if (body.creatorIds.length > 100) {
    return NextResponse.json(
      { error: 'Maximum 100 creators per bulk operation' },
      { status: 400 },
    )
  }

  let result: { success: number; failed: number }

  switch (body.type) {
    case 'status': {
      if (!body.payload?.status || !CREATOR_STATUSES.includes(body.payload.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${CREATOR_STATUSES.join(', ')}` },
          { status: 400 },
        )
      }
      result = await bulkUpdateCreators(tenantSlug, body.creatorIds, {
        status: body.payload.status as CreatorStatus,
      })
      break
    }

    case 'tier': {
      if (!body.payload?.tier || !CREATOR_TIERS.includes(body.payload.tier)) {
        return NextResponse.json(
          { error: `Invalid tier. Must be one of: ${CREATOR_TIERS.join(', ')}` },
          { status: 400 },
        )
      }
      result = await bulkUpdateCreators(tenantSlug, body.creatorIds, {
        tier: body.payload.tier as CreatorTier,
      })
      break
    }

    case 'tags': {
      if (!body.payload?.tags) {
        return NextResponse.json({ error: 'tags payload is required' }, { status: 400 })
      }
      result = await bulkUpdateCreators(tenantSlug, body.creatorIds, {
        addTags: body.payload.tags.add,
        removeTags: body.payload.tags.remove,
      })
      break
    }

    case 'deactivate': {
      result = await bulkUpdateCreators(tenantSlug, body.creatorIds, {
        status: 'inactive',
      })
      break
    }

    case 'delete': {
      // Soft delete all selected creators
      let success = 0
      let failed = 0
      for (const id of body.creatorIds) {
        const deleted = await deleteCreator(tenantSlug, id, false)
        if (deleted) {
          success++
        } else {
          failed++
        }
      }
      result = { success, failed }
      break
    }

    default:
      return NextResponse.json({ error: 'Invalid action type' }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    affected: result.success,
    failed: result.failed,
    total: body.creatorIds.length,
  })
}
