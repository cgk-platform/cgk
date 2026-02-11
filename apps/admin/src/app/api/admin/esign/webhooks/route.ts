/**
 * E-Signature Webhooks API
 *
 * GET /api/admin/esign/webhooks - List webhooks
 * POST /api/admin/esign/webhooks - Create webhook
 */

import { requireAuth } from '@cgk/auth'
import { NextResponse } from 'next/server'
import { listWebhooks, createWebhook } from '@/lib/esign'
import type { EsignWebhookEvent } from '@/lib/esign/types'

export const dynamic = 'force-dynamic'

const VALID_EVENTS: EsignWebhookEvent[] = [
  'document.sent',
  'document.viewed',
  'document.signed',
  'document.completed',
  'document.declined',
  'document.expired',
  'document.voided',
]

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const webhooks = await listWebhooks(auth.tenantId)

    // Mask secret keys in response
    const maskedWebhooks = webhooks.map((w) => ({
      ...w,
      secretKey: w.secretKey.substring(0, 8) + '...',
    }))

    return NextResponse.json({ webhooks: maskedWebhooks })
  } catch (error) {
    console.error('Error fetching webhooks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
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
    const { name, endpointUrl, events } = body

    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    if (!endpointUrl) {
      return NextResponse.json({ error: 'Endpoint URL required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(endpointUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid endpoint URL' }, { status: 400 })
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ error: 'At least one event required' }, { status: 400 })
    }

    // Validate events
    for (const event of events) {
      if (!VALID_EVENTS.includes(event)) {
        return NextResponse.json(
          { error: `Invalid event: ${event}. Valid events: ${VALID_EVENTS.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const webhook = await createWebhook(auth.tenantId, {
      name,
      endpointUrl,
      events,
    })

    return NextResponse.json({
      success: true,
      webhook: {
        ...webhook,
        // Return full secret only on creation
        secretKey: webhook.secretKey,
      },
    })
  } catch (error) {
    console.error('Error creating webhook:', error)
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    )
  }
}
