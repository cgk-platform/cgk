/**
 * Resend Inbound Email Webhook Handler
 *
 * Receives inbound emails from Resend webhooks, verifies signature,
 * looks up tenant, and routes to appropriate handler.
 *
 * @ai-pattern inbound-email
 * @ai-note This endpoint is publicly accessible but signature-verified
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withTenant, checkAndMarkWebhook } from '@cgk-platform/db'
import {
  verifyResendSignature,
  verifySvixSignature,
  parseInboundEmail,
  findInboundAddressByEmail,
  logInboundEmail,
  logUnknownInbound,
  updateInboundLogStatus,
  analyzeEmail,
  routeEmail,
  getEmailTypeFromPurpose,
} from '@cgk-platform/communications'

/**
 * Get webhook secret from environment
 */
function getWebhookSecret(): string {
  return process.env.RESEND_WEBHOOK_SECRET || ''
}

/**
 * POST /api/webhooks/resend/inbound
 *
 * Handle inbound email webhook from Resend
 */
export async function POST(request: Request) {
  // Get raw body for signature verification
  const rawBody = await request.text()

  // Verify webhook signature
  const secret = getWebhookSecret()

  // Try Svix signature first (Resend v2)
  const svixHeaders = {
    'svix-id': request.headers.get('svix-id'),
    'svix-timestamp': request.headers.get('svix-timestamp'),
    'svix-signature': request.headers.get('svix-signature'),
  }

  const isValidSvix = verifySvixSignature(rawBody, svixHeaders, secret)

  // Fall back to legacy Resend signature
  const resendSignature = request.headers.get('resend-signature')
  const isValidLegacy = verifyResendSignature(rawBody, resendSignature, secret)

  if (!isValidSvix && !isValidLegacy) {
    console.error('Invalid webhook signature')
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    )
  }

  // Parse payload
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error('Invalid JSON payload')
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    )
  }

  // Check event type
  const eventType = payload.type as string
  if (eventType && !eventType.includes('email.received')) {
    // Not an inbound email event, acknowledge and ignore
    return NextResponse.json({
      received: true,
      processed: false,
      reason: `Event type ${eventType} not handled`,
    })
  }

  // Check idempotency - prevent duplicate processing
  const eventId = (payload.data as { id?: string })?.id ||
    (payload as { id?: string }).id ||
    ''
  if (eventId) {
    const isDuplicate = await checkAndMarkWebhook('resend', eventId, {
      type: eventType,
    })

    if (isDuplicate) {
      console.log('[Resend Webhook] Duplicate event ignored:', eventId)
      return NextResponse.json({
        received: true,
        processed: false,
        reason: 'Duplicate event',
      })
    }
  }

  // Parse the inbound email
  const email = parseInboundEmail(payload)

  // Look up tenant by TO address
  const inboundAddress = await findInboundAddressByEmail(email.to)

  if (!inboundAddress) {
    // Log unknown email and acknowledge
    await logUnknownInbound(email)
    return NextResponse.json({
      received: true,
      processed: false,
      reason: 'Unknown recipient address',
    })
  }

  // Process within tenant context
  const result = await withTenant(inboundAddress.tenantSlug, async () => {
    // Analyze for auto-reply/spam
    const analysis = analyzeEmail({
      from: email.from,
      subject: email.subject,
      bodyText: email.bodyText,
    })

    // Determine email type from purpose
    const emailType = getEmailTypeFromPurpose(inboundAddress.purpose)

    // Log the inbound email
    const log = await logInboundEmail({
      fromAddress: email.from,
      fromName: email.fromName,
      toAddress: email.to,
      subject: email.subject,
      bodyText: email.bodyText,
      bodyHtml: email.bodyHtml,
      attachments: email.attachments,
      messageId: email.messageId,
      inReplyTo: email.inReplyTo,
      referencesList: email.references,
      emailType,
      inboundAddressId: inboundAddress.id,
      rawPayload: email.rawPayload,
      resendEmailId: email.resendEmailId,
      isAutoReply: analysis.isAutoReply,
      isSpam: analysis.isSpam,
      spamScore: analysis.spamScore,
    })

    // Skip processing if auto-reply or spam
    if (!analysis.shouldProcess) {
      await updateInboundLogStatus(
        log.id,
        'ignored',
        analysis.reason
      )
      return {
        received: true,
        processed: false,
        logId: log.id,
        reason: analysis.reason,
      }
    }

    // Route to appropriate handler
    try {
      const routeResult = await routeEmail(
        inboundAddress.tenantId,
        email,
        log.id,
        inboundAddress.purpose
      )

      return {
        received: true,
        processed: true,
        logId: log.id,
        tenantSlug: inboundAddress.tenantSlug,
        emailType,
        handler: routeResult.handler,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      await updateInboundLogStatus(log.id, 'failed', message)
      throw error
    }
  })

  return NextResponse.json(result)
}

/**
 * GET /api/webhooks/resend/inbound
 *
 * Health check for webhook endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'resend-inbound-webhook',
    timestamp: new Date().toISOString(),
  })
}
