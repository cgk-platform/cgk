export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getBulkSendById,
  getBulkSendRecipients,
  updateBulkSendStatus,
} from '@/lib/creator-communications/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)

  const bulkSend = await getBulkSendById(tenantSlug, id)
  if (!bulkSend) {
    return NextResponse.json({ error: 'Bulk send not found' }, { status: 404 })
  }

  const { rows: recipients, totalCount } = await getBulkSendRecipients(tenantSlug, id, page, limit)

  return NextResponse.json({
    bulkSend,
    recipients,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()
  const { action } = body

  if (action === 'cancel') {
    const bulkSend = await getBulkSendById(tenantSlug, id)
    if (!bulkSend) {
      return NextResponse.json({ error: 'Bulk send not found' }, { status: 404 })
    }

    if (!['draft', 'scheduled', 'sending'].includes(bulkSend.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel a completed bulk send' },
        { status: 400 },
      )
    }

    await updateBulkSendStatus(tenantSlug, id, 'cancelled')

    return NextResponse.json({ success: true })
  }

  if (action === 'send') {
    const bulkSend = await getBulkSendById(tenantSlug, id)
    if (!bulkSend) {
      return NextResponse.json({ error: 'Bulk send not found' }, { status: 404 })
    }

    if (bulkSend.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft bulk sends can be sent' },
        { status: 400 },
      )
    }

    await updateBulkSendStatus(tenantSlug, id, 'sending')

    // Trigger background job to process the bulk send
    // This would be handled by Inngest/Trigger.dev in production
    // await jobs.send('creator.bulk-send.started', { tenantId: tenantSlug, bulkSendId: id })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
