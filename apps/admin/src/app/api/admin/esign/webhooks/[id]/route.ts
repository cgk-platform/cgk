/**
 * E-Signature Webhook Detail API
 *
 * GET /api/admin/esign/webhooks/[id] - Get webhook details
 * PATCH /api/admin/esign/webhooks/[id] - Update webhook
 * DELETE /api/admin/esign/webhooks/[id] - Delete webhook
 */

import { requireAuth } from '@cgk/auth'
import { NextResponse } from 'next/server'
import {
  getWebhook,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
} from '@/lib/esign'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id } = await params
    const webhook = await getWebhook(auth.tenantId, id)

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    return NextResponse.json({
      webhook: {
        ...webhook,
        secretKey: webhook.secretKey.substring(0, 8) + '...',
      },
    })
  } catch (error) {
    console.error('Error fetching webhook:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, endpointUrl, events, isActive, regenerateSecret } = body

    // Handle secret regeneration
    if (regenerateSecret) {
      const newSecret = await regenerateWebhookSecret(auth.tenantId, id)
      if (!newSecret) {
        return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
      }
      return NextResponse.json({
        success: true,
        secretKey: newSecret,
      })
    }

    // Validate URL if provided
    if (endpointUrl) {
      try {
        new URL(endpointUrl)
      } catch {
        return NextResponse.json({ error: 'Invalid endpoint URL' }, { status: 400 })
      }
    }

    const webhook = await updateWebhook(auth.tenantId, id, {
      name,
      endpointUrl,
      events,
      isActive,
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      webhook: {
        ...webhook,
        secretKey: webhook.secretKey.substring(0, 8) + '...',
      },
    })
  } catch (error) {
    console.error('Error updating webhook:', error)
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id } = await params
    const success = await deleteWebhook(auth.tenantId, id)

    if (!success) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting webhook:', error)
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    )
  }
}
