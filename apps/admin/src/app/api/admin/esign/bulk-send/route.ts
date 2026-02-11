/**
 * E-Signature Bulk Send API
 *
 * GET /api/admin/esign/bulk-send - List bulk sends
 * POST /api/admin/esign/bulk-send - Create new bulk send
 */

import { requireAuth } from '@cgk/auth'
import { NextResponse } from 'next/server'
import {
  listBulkSends,
  createBulkSend,
} from '@/lib/esign'
import type { CreateBulkSendInput, EsignBulkSendStatus } from '@/lib/esign/types'

export const dynamic = 'force-dynamic'

const MAX_RECIPIENTS = 100

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as EsignBulkSendStatus | null
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const { bulkSends, total } = await listBulkSends(auth.tenantId, {
      status: status || undefined,
      page,
      limit,
    })

    return NextResponse.json({
      bulkSends,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching bulk sends:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bulk sends' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const body = await request.json()
    const { templateId, name, recipients, message, expiresInDays, scheduledFor } = body

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'At least one recipient required' }, { status: 400 })
    }

    if (recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_RECIPIENTS} recipients per batch` },
        { status: 400 }
      )
    }

    // Validate recipients
    for (const recipient of recipients) {
      if (!recipient.name || !recipient.email) {
        return NextResponse.json(
          { error: 'Each recipient must have name and email' },
          { status: 400 }
        )
      }
    }

    // If more than 20 recipients and no schedule, require scheduling
    if (recipients.length > 20 && !scheduledFor) {
      return NextResponse.json(
        { error: 'Batches with more than 20 recipients require scheduling' },
        { status: 400 }
      )
    }

    const input: CreateBulkSendInput = {
      templateId,
      name,
      recipients,
      message,
      expiresInDays,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    }

    const bulkSend = await createBulkSend(auth.tenantId, input, auth.userId)

    return NextResponse.json({
      success: true,
      bulkSend,
    })
  } catch (error) {
    console.error('Error creating bulk send:', error)
    return NextResponse.json(
      { error: 'Failed to create bulk send' },
      { status: 500 }
    )
  }
}
