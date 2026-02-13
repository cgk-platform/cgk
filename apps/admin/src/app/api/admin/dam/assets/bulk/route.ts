export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { bulkOperation, type BulkOperationInput } from '@cgk-platform/dam'

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id') || 'system'

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: BulkOperationInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.operation || !body.asset_ids || body.asset_ids.length === 0) {
    return NextResponse.json(
      { error: 'Missing required fields: operation, asset_ids' },
      { status: 400 }
    )
  }

  const validOperations = ['move', 'tag', 'delete', 'archive', 'unarchive', 'favorite', 'unfavorite']
  if (!validOperations.includes(body.operation)) {
    return NextResponse.json(
      { error: `Invalid operation. Must be one of: ${validOperations.join(', ')}` },
      { status: 400 }
    )
  }

  const result = await withTenant(tenantSlug, () => bulkOperation(tenantSlug, userId, body))

  return NextResponse.json(result)
}
