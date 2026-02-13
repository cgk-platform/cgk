export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getGiftCardEmailById,
  resetEmailToPending,
  skipEmail,
  processGiftCardEmail,
} from '@/lib/gift-card'

/**
 * POST /api/admin/gift-cards/emails/[id]/send
 * Send, retry, or skip an email
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    action: 'send' | 'retry' | 'skip'
    store_url?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.action) {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 })
  }

  if (!['send', 'retry', 'skip'].includes(body.action)) {
    return NextResponse.json({ error: 'Action must be "send", "retry", or "skip"' }, { status: 400 })
  }

  const result = await withTenant(tenantSlug, async () => {
    // Check if email exists
    const existing = await getGiftCardEmailById(id)
    if (!existing) {
      return { error: 'Email not found', status: 404 }
    }

    if (body.action === 'skip') {
      const email = await skipEmail(id)
      return { email, success: true }
    }

    if (body.action === 'retry') {
      // Only allow retry of failed emails
      if (existing.status !== 'failed') {
        return {
          error: `Cannot retry email with status "${existing.status}". Only failed emails can be retried.`,
          status: 400,
        }
      }
      const email = await resetEmailToPending(id)
      return { email, success: true, message: 'Email queued for retry' }
    }

    if (body.action === 'send') {
      // Only allow sending pending emails
      if (existing.status !== 'pending') {
        return {
          error: `Cannot send email with status "${existing.status}". Only pending emails can be sent.`,
          status: 400,
        }
      }

      const storeUrl = body.store_url || 'https://example.com'
      const sendResult = await processGiftCardEmail(existing, storeUrl)

      if (sendResult.success) {
        const updatedEmail = await getGiftCardEmailById(id)
        return { email: updatedEmail, success: true, message: 'Email sent successfully' }
      } else {
        return { error: sendResult.error || 'Failed to send email', status: 500 }
      }
    }

    return { error: 'Invalid action', status: 400 }
  })

  if ('error' in result && result.status) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
}
