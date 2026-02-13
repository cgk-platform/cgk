export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

import {
  findTenantByTwilioNumber,
  handleStatusWebhook,
  parseFormData,
} from '@cgk-platform/communications'

/**
 * POST /api/webhooks/twilio/status
 * Handle message delivery status callbacks from Twilio
 *
 * Configure this URL as the Status Callback URL when sending SMS:
 * https://your-domain.com/api/webhooks/twilio/status
 */
export async function POST(request: Request) {
  try {
    // Parse form data from Twilio
    const body = await parseFormData(request)

    if (!body.MessageSid || !body.MessageStatus) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    // Find tenant by the "From" number (our Twilio number)
    const fromNumber = body.From
    if (!fromNumber) {
      return NextResponse.json(
        { error: 'Missing From number' },
        { status: 400 }
      )
    }

    const tenantId = await findTenantByTwilioNumber(fromNumber)

    if (!tenantId) {
      // Unknown number - might be from a different system
      return NextResponse.json({ status: 'ignored', reason: 'unknown_tenant' })
    }

    // Process the status update
    const result = await handleStatusWebhook(tenantId, body)

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
