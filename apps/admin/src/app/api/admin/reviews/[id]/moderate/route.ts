export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

const VALID_ACTIONS: Record<string, string> = {
  approve: 'approved',
  reject: 'rejected',
  spam: 'spam',
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const newStatus = body.action ? VALID_ACTIONS[body.action] : undefined
  if (!newStatus) {
    return NextResponse.json({ error: 'Invalid action. Must be: approve, reject, or spam' }, { status: 400 })
  }

  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE reviews
      SET status = ${newStatus}::review_status, updated_at = NOW()
      WHERE id = ${id}
    `
  })

  return NextResponse.json({ success: true, status: newStatus })
}
