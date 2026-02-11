/**
 * Resend Inbound Email Webhook for Treasury
 *
 * Handles incoming emails for draw request approvals/rejections
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'

import { sql, withTenant } from '@cgk/db'
import { logInboundEmail } from '@/lib/treasury/db/communications'
import {
  approveDrawRequest,
  rejectDrawRequest,
  getDrawRequest,
  markWithdrawalsFromDrawRequest,
} from '@/lib/treasury/db/requests'
import {
  parseApprovalEmail,
  validateSenderEmail,
  extractRequestIdFromSubject,
  isAutoReply,
} from '@/lib/treasury/approval-parser'
import {
  notifyDrawRequestApproved,
  notifyDrawRequestRejected,
} from '@/lib/treasury/slack'

interface InboundEmailPayload {
  from: string
  to: string
  subject: string
  text: string
  html?: string
  headers?: Record<string, string>
  messageId?: string
}

/**
 * Verify Resend webhook signature
 */
function verifyResendSignature(payload: string, signature: string): boolean {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.warn('RESEND_WEBHOOK_SECRET not configured, skipping signature verification')
    return true // Allow in development
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Find the draw request and tenant from the email
 */
async function findRequestFromEmail(
  toEmail: string,
  subject: string
): Promise<{ requestId: string; tenantSlug: string; treasurerEmail: string } | null> {
  // Try to extract request ID from subject
  const requestNumber = extractRequestIdFromSubject(subject)

  if (requestNumber) {
    // Look up request by request number across all tenants
    const result = await sql`
      SELECT
        dr.id as request_id,
        o.slug as tenant_slug,
        dr.treasurer_email
      FROM public.organizations o
      JOIN information_schema.schemata s ON s.schema_name = 'tenant_' || o.slug
      CROSS JOIN LATERAL (
        SELECT id, treasurer_email
        FROM tenant_${sql.raw('||o.slug||')}.treasury_draw_requests
        WHERE request_number = ${requestNumber}
        AND status = 'pending'
        LIMIT 1
      ) dr
    `

    if (result.rows.length > 0) {
      return {
        requestId: result.rows[0].request_id as string,
        tenantSlug: result.rows[0].tenant_slug as string,
        treasurerEmail: result.rows[0].treasurer_email as string,
      }
    }
  }

  // Fallback: parse the reply-to address for routing info
  // Format: treasury-reply+{tenant}+{requestId}@cgk.dev
  const replyMatch = toEmail.match(/treasury-reply\+([^+]+)\+([^@]+)@/)
  if (replyMatch) {
    const [, tenantSlug, requestId] = replyMatch

    // Verify request exists
    const request = await withTenant(tenantSlug, async () => {
      const result = await sql`
        SELECT treasurer_email FROM treasury_draw_requests
        WHERE id = ${requestId} AND status = 'pending'
      `
      return result.rows[0]
    })

    if (request) {
      return {
        requestId,
        tenantSlug,
        treasurerEmail: request.treasurer_email as string,
      }
    }
  }

  return null
}

/**
 * POST /api/webhooks/resend/treasury
 * Handle inbound email webhook from Resend
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const signature = headerList.get('resend-signature') || ''

  // Get raw body for signature verification
  const rawBody = await request.text()

  // Verify signature in production
  if (process.env.NODE_ENV === 'production') {
    if (!verifyResendSignature(rawBody, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: InboundEmailPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { from, to, subject, text, html, headers: emailHeaders } = payload

  // Validate required fields
  if (!from || !to || !text) {
    return NextResponse.json(
      { error: 'Missing required fields: from, to, text' },
      { status: 400 }
    )
  }

  // Check for auto-reply/out-of-office
  if (isAutoReply(subject, text, emailHeaders)) {
    console.log('Ignoring auto-reply from:', from)
    return NextResponse.json({ status: 'ignored', reason: 'auto-reply' })
  }

  // Find the associated draw request
  const requestInfo = await findRequestFromEmail(to, subject)
  if (!requestInfo) {
    console.warn('Could not find draw request for email:', { from, to, subject })
    return NextResponse.json({ status: 'ignored', reason: 'no-matching-request' })
  }

  const { requestId, tenantSlug, treasurerEmail } = requestInfo

  // Validate sender is the treasurer
  if (!validateSenderEmail(from, treasurerEmail)) {
    console.warn('Email from unauthorized sender:', from, 'expected:', treasurerEmail)
    return NextResponse.json({ status: 'ignored', reason: 'unauthorized-sender' })
  }

  // Parse the email for approval/rejection
  const parseResult = parseApprovalEmail(text)

  // Log the inbound communication
  await logInboundEmail(
    tenantSlug,
    requestId,
    subject,
    text,
    from,
    to,
    parseResult.status,
    parseResult.confidence,
    parseResult.matched_keywords
  )

  // If high confidence, auto-process the request
  if (parseResult.confidence === 'high' && parseResult.status !== 'unclear') {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.cgk.dev'

    if (parseResult.status === 'approved') {
      const success = await approveDrawRequest(
        tenantSlug,
        requestId,
        from,
        parseResult.extracted_message
      )

      if (success) {
        await markWithdrawalsFromDrawRequest(tenantSlug, requestId, 'approved')

        const drawRequest = await getDrawRequest(tenantSlug, requestId)
        if (drawRequest) {
          await notifyDrawRequestApproved(tenantSlug, drawRequest, from, adminUrl)
        }

        return NextResponse.json({
          status: 'processed',
          action: 'approved',
          confidence: parseResult.confidence,
        })
      }
    } else if (parseResult.status === 'rejected') {
      const reason = parseResult.extracted_message || 'Rejected via email'
      const success = await rejectDrawRequest(tenantSlug, requestId, from, reason)

      if (success) {
        const drawRequest = await getDrawRequest(tenantSlug, requestId)
        if (drawRequest) {
          await notifyDrawRequestRejected(tenantSlug, drawRequest, from, reason, adminUrl)
        }

        return NextResponse.json({
          status: 'processed',
          action: 'rejected',
          confidence: parseResult.confidence,
          reason,
        })
      }
    }
  }

  // For low/medium confidence or unclear status, just log and notify admin
  return NextResponse.json({
    status: 'logged',
    parsed: {
      status: parseResult.status,
      confidence: parseResult.confidence,
      keywords: parseResult.matched_keywords,
    },
    requiresManualReview: true,
  })
}
