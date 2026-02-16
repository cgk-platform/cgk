export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { checkAndMarkWebhook } from '@cgk-platform/db'

import {
  findTenantByTwilioNumber,
  getTwilioAuthTokenForWebhook,
  getTwilioCredentials,
  handleStatusWebhook,
  parseFormData,
  verifyTwilioSignature,
} from '@cgk-platform/communications'

/**
 * POST /api/webhooks/twilio/status
 * Handle message delivery status callbacks from Twilio
 *
 * Configure this URL as the Status Callback URL when sending SMS:
 * https://your-domain.com/api/webhooks/twilio/status
 *
 * Security: Verifies X-Twilio-Signature header to ensure request is from Twilio
 */
export async function POST(request: Request) {
  try {
    // Clone the request to read body twice (once for signature, once for form data)
    const clonedRequest = request.clone()

    // Parse form data from Twilio
    const body = await parseFormData(clonedRequest)

    // Find tenant by the "From" number (our Twilio number) to get the auth token
    const fromNumber = body.From
    let authToken: string | null = null

    if (fromNumber) {
      const tenantId = await findTenantByTwilioNumber(fromNumber)
      if (tenantId) {
        // Try to get tenant-specific auth token
        const credentials = await getTwilioCredentials(tenantId)
        if (credentials) {
          authToken = credentials.authToken
        }
      }
    }

    // Fall back to platform-level token if tenant token not found
    if (!authToken) {
      authToken = getTwilioAuthTokenForWebhook()
    }

    if (!authToken) {
      console.error('[Twilio Status Webhook] No auth token available for verification')
      return NextResponse.json(
        { error: 'Webhook verification not configured' },
        { status: 500 }
      )
    }

    // Verify Twilio signature
    const signature = request.headers.get('X-Twilio-Signature') || ''
    const url = new URL(request.url)
    const webhookUrl = url.toString()

    if (!verifyTwilioSignature(authToken, signature, webhookUrl, body)) {
      console.error('[Twilio Status Webhook] Invalid signature - request rejected')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      )
    }

    if (!body.MessageSid || !body.MessageStatus) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    // Check idempotency using MessageSid + Status combination
    const idempotencyId = `${body.MessageSid}:${body.MessageStatus}`
    const isDuplicate = await checkAndMarkWebhook('twilio-status', idempotencyId, {
      messageSid: body.MessageSid,
      status: body.MessageStatus,
    })

    if (isDuplicate) {
      console.log('[Twilio Status Webhook] Duplicate status update ignored:', idempotencyId)
      return NextResponse.json({ status: 'duplicate_ignored' })
    }

    // Validate From number exists
    if (!fromNumber) {
      return NextResponse.json(
        { error: 'Missing From number' },
        { status: 400 }
      )
    }

    // Re-fetch tenantId for processing (already found during auth token lookup)
    const tenantIdForProcessing = await findTenantByTwilioNumber(fromNumber)

    if (!tenantIdForProcessing) {
      // Unknown number - might be from a different system
      return NextResponse.json({ status: 'ignored', reason: 'unknown_tenant' })
    }

    // Process the status update
    const result = await handleStatusWebhook(tenantIdForProcessing, body)

    return new Response(result.response, {
      status: 200,
      headers: { 'Content-Type': result.contentType },
    })
  } catch (error) {
    console.error('Error handling status webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
