/**
 * Treasury email utilities
 *
 * Handles sending approval request emails to treasurers
 */

import type { DrawRequestWithItems, TreasuryCommunication } from './types'

// Email templates
const APPROVAL_REQUEST_SUBJECT = (requestNumber: string) =>
  `Draw Request ${requestNumber} - Approval Required`

const APPROVAL_REQUEST_BODY = (
  request: DrawRequestWithItems,
  pdfUrl: string | null,
  approveUrl: string,
  rejectUrl: string
) => `
Dear ${request.treasurer_name},

A new draw request requires your approval:

REQUEST DETAILS
---------------
Request Number: ${request.request_number}
Description: ${request.description}
Total Amount: $${(request.total_amount_cents / 100).toFixed(2)}
Due Date: ${request.due_date || 'Not specified'}

PAYEES
------
${request.items.map((item) => `- ${item.creator_name}: $${(item.net_amount_cents / 100).toFixed(2)}${item.project_description ? ` (${item.project_description})` : ''}`).join('\n')}

${pdfUrl ? `VIEW PDF: ${pdfUrl}` : ''}

TO APPROVE OR REJECT
--------------------
You can respond to this email with:
- "Approved" to approve this request
- "Rejected: [reason]" to reject with a reason

Or use the links below:
- Approve: ${approveUrl}
- Reject: ${rejectUrl}

If you have any questions, please contact the admin team.

Best regards,
CGK Treasury System
`.trim()

const REMINDER_SUBJECT = (requestNumber: string) =>
  `REMINDER: Draw Request ${requestNumber} - Approval Still Needed`

const REMINDER_BODY = (
  request: DrawRequestWithItems,
  daysPending: number,
  pdfUrl: string | null,
  approveUrl: string,
  rejectUrl: string
) => `
Dear ${request.treasurer_name},

This is a reminder that the following draw request has been pending for ${daysPending} days:

REQUEST DETAILS
---------------
Request Number: ${request.request_number}
Description: ${request.description}
Total Amount: $${(request.total_amount_cents / 100).toFixed(2)}
Due Date: ${request.due_date || 'Not specified'}

${pdfUrl ? `VIEW PDF: ${pdfUrl}` : ''}

TO APPROVE OR REJECT
--------------------
Reply with "Approved" or "Rejected: [reason]"

Or use the links:
- Approve: ${approveUrl}
- Reject: ${rejectUrl}

Best regards,
CGK Treasury System
`.trim()

const APPROVED_NOTIFICATION_SUBJECT = (requestNumber: string) =>
  `Draw Request ${requestNumber} - Approved`

const APPROVED_NOTIFICATION_BODY = (
  request: DrawRequestWithItems,
  approvedBy: string,
  message: string | null
) => `
The following draw request has been APPROVED:

REQUEST DETAILS
---------------
Request Number: ${request.request_number}
Description: ${request.description}
Total Amount: $${(request.total_amount_cents / 100).toFixed(2)}

APPROVAL INFO
-------------
Approved By: ${approvedBy}
Approved At: ${new Date().toLocaleString()}
${message ? `Message: ${message}` : ''}

The payouts will now be processed.

Best regards,
CGK Treasury System
`.trim()

const REJECTED_NOTIFICATION_SUBJECT = (requestNumber: string) =>
  `Draw Request ${requestNumber} - Rejected`

const REJECTED_NOTIFICATION_BODY = (
  request: DrawRequestWithItems,
  rejectedBy: string,
  reason: string
) => `
The following draw request has been REJECTED:

REQUEST DETAILS
---------------
Request Number: ${request.request_number}
Description: ${request.description}
Total Amount: $${(request.total_amount_cents / 100).toFixed(2)}

REJECTION INFO
--------------
Rejected By: ${rejectedBy}
Rejected At: ${new Date().toLocaleString()}
Reason: ${reason}

Please review and make any necessary adjustments.

Best regards,
CGK Treasury System
`.trim()

/**
 * Email configuration interface
 */
export interface EmailConfig {
  from: string
  replyTo?: string
  baseUrl: string
}

/**
 * Build approval request email content
 */
export function buildApprovalRequestEmail(
  request: DrawRequestWithItems,
  config: EmailConfig
): { subject: string; body: string; html?: string } {
  const approveUrl = `${config.baseUrl}/api/admin/treasury/requests/${request.id}/action?action=approve&token=${generateActionToken(request.id, 'approve')}`
  const rejectUrl = `${config.baseUrl}/api/admin/treasury/requests/${request.id}/action?action=reject&token=${generateActionToken(request.id, 'reject')}`

  return {
    subject: APPROVAL_REQUEST_SUBJECT(request.request_number),
    body: APPROVAL_REQUEST_BODY(request, request.pdf_url, approveUrl, rejectUrl),
    html: buildHtmlEmail(
      APPROVAL_REQUEST_SUBJECT(request.request_number),
      APPROVAL_REQUEST_BODY(request, request.pdf_url, approveUrl, rejectUrl),
      [
        { label: 'Approve', url: approveUrl, primary: true },
        { label: 'Reject', url: rejectUrl, primary: false },
      ]
    ),
  }
}

/**
 * Build reminder email content
 */
export function buildReminderEmail(
  request: DrawRequestWithItems,
  daysPending: number,
  config: EmailConfig
): { subject: string; body: string; html?: string } {
  const approveUrl = `${config.baseUrl}/api/admin/treasury/requests/${request.id}/action?action=approve&token=${generateActionToken(request.id, 'approve')}`
  const rejectUrl = `${config.baseUrl}/api/admin/treasury/requests/${request.id}/action?action=reject&token=${generateActionToken(request.id, 'reject')}`

  return {
    subject: REMINDER_SUBJECT(request.request_number),
    body: REMINDER_BODY(request, daysPending, request.pdf_url, approveUrl, rejectUrl),
  }
}

/**
 * Build approved notification email content
 */
export function buildApprovedNotificationEmail(
  request: DrawRequestWithItems,
  approvedBy: string,
  message: string | null
): { subject: string; body: string } {
  return {
    subject: APPROVED_NOTIFICATION_SUBJECT(request.request_number),
    body: APPROVED_NOTIFICATION_BODY(request, approvedBy, message),
  }
}

/**
 * Build rejected notification email content
 */
export function buildRejectedNotificationEmail(
  request: DrawRequestWithItems,
  rejectedBy: string,
  reason: string
): { subject: string; body: string } {
  return {
    subject: REJECTED_NOTIFICATION_SUBJECT(request.request_number),
    body: REJECTED_NOTIFICATION_BODY(request, rejectedBy, reason),
  }
}

/**
 * Generate a simple action token for email links
 * In production, use a proper JWT or signed token
 */
function generateActionToken(requestId: string, action: string): string {
  const payload = `${requestId}:${action}:${Date.now()}`
  // Simple base64 encoding - in production, use proper signing
  return Buffer.from(payload).toString('base64url')
}

/**
 * Verify an action token
 */
export function verifyActionToken(
  token: string,
  expectedRequestId: string,
  expectedAction: string,
  maxAgeMs = 7 * 24 * 60 * 60 * 1000 // 7 days
): boolean {
  try {
    const payload = Buffer.from(token, 'base64url').toString()
    const [requestId, action, timestamp] = payload.split(':')

    if (requestId !== expectedRequestId || action !== expectedAction) {
      return false
    }

    const tokenTime = parseInt(timestamp, 10)
    if (Date.now() - tokenTime > maxAgeMs) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Build a simple HTML email wrapper
 */
function buildHtmlEmail(
  subject: string,
  textContent: string,
  buttons?: { label: string; url: string; primary: boolean }[]
): string {
  const buttonHtml = buttons
    ?.map(
      (btn) => `
      <a href="${btn.url}" style="
        display: inline-block;
        padding: 12px 24px;
        margin: 8px;
        background-color: ${btn.primary ? '#2563eb' : '#6b7280'};
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
      ">${btn.label}</a>
    `
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="margin: 0 0 10px; color: #1e293b; font-size: 24px;">${subject}</h1>
  </div>

  <div style="white-space: pre-wrap; font-size: 14px;">
${textContent}
  </div>

  ${
    buttonHtml
      ? `
  <div style="margin-top: 30px; text-align: center;">
    ${buttonHtml}
  </div>
  `
      : ''
  }

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
    <p>This is an automated message from CGK Treasury.</p>
  </div>
</body>
</html>
`.trim()
}

/**
 * Send email using Resend API
 * This is a placeholder - actual implementation depends on email provider setup
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  html?: string,
  config?: EmailConfig
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not set, skipping email send')
    return { success: false, error: 'Email not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config?.from || 'treasury@cgk.dev',
        reply_to: config?.replyTo || 'treasury-reply@cgk.dev',
        to: [to],
        subject,
        text: body,
        html: html || undefined,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.message || 'Failed to send email' }
    }

    const data = await response.json()
    return { success: true, messageId: data.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

/**
 * Parse inbound email webhook from Resend
 */
export interface InboundEmailPayload {
  from: string
  to: string
  subject: string
  text: string
  html?: string
  headers?: Record<string, string>
  messageId?: string
}

export function parseResendWebhook(body: unknown): InboundEmailPayload | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const data = body as Record<string, unknown>

  // Extract required fields
  const from = data.from as string
  const to = data.to as string
  const subject = data.subject as string
  const text = data.text as string

  if (!from || !to || !subject || !text) {
    return null
  }

  return {
    from,
    to,
    subject,
    text,
    html: data.html as string | undefined,
    headers: data.headers as Record<string, string> | undefined,
    messageId: data.messageId as string | undefined,
  }
}
