export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSmsQueueEntry,
  markSmsSkipped,
  maskPhoneNumber,
  scheduleSmsRetry,
} from '@cgk/communications'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/sms/queue/[id]
 * Get a single SMS queue entry
 */
export async function GET(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const entry = await getSmsQueueEntry(tenantSlug, id)

  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  // Mask phone number for privacy
  const maskedEntry = {
    ...entry,
    phoneNumber: maskPhoneNumber(entry.phoneNumber),
  }

  return NextResponse.json({ entry: maskedEntry })
}

/**
 * PATCH /api/admin/sms/queue/[id]
 * Update an SMS queue entry (skip or retry)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const entry = await getSmsQueueEntry(tenantSlug, id)

  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  const body = await request.json()
  const { action, skipReason } = body

  if (action === 'skip') {
    if (!skipReason) {
      return NextResponse.json({ error: 'Skip reason is required' }, { status: 400 })
    }

    if (!['pending', 'scheduled', 'failed'].includes(entry.status)) {
      return NextResponse.json(
        { error: 'Entry cannot be skipped in current status' },
        { status: 400 }
      )
    }

    await markSmsSkipped(tenantSlug, id, skipReason)
    return NextResponse.json({ success: true, action: 'skipped' })
  }

  if (action === 'retry') {
    if (entry.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed entries can be retried' },
        { status: 400 }
      )
    }

    if (entry.attempts >= entry.maxAttempts) {
      return NextResponse.json(
        { error: 'Entry has exceeded max retry attempts' },
        { status: 400 }
      )
    }

    await scheduleSmsRetry(tenantSlug, id)
    return NextResponse.json({ success: true, action: 'scheduled_retry' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
