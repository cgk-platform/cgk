export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getDrawRequestWithDetails,
  approveDrawRequest,
  rejectDrawRequest,
  cancelDrawRequest,
  updateDrawRequestPdf,
  markWithdrawalsFromDrawRequest,
} from '@/lib/treasury/db/requests'
import { logOutboundEmail } from '@/lib/treasury/db/communications'
import { generatePdf, uploadPdf } from '@/lib/treasury/pdf-generator'
import { buildApprovalRequestEmail, sendEmail } from '@/lib/treasury/email'
import {
  notifyDrawRequestApproved,
  notifyDrawRequestRejected,
} from '@/lib/treasury/slack'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/treasury/requests/[id]
 * Get a single draw request with full details
 */
export async function GET(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params
  const drawRequest = await getDrawRequestWithDetails(tenantSlug, id)

  if (!drawRequest) {
    return NextResponse.json({ error: 'Draw request not found' }, { status: 404 })
  }

  return NextResponse.json({ request: drawRequest })
}

/**
 * PATCH /api/admin/treasury/requests/[id]
 * Update draw request status (approve, reject, cancel, withdraw)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')
  const userEmail = headerList.get('x-user-email') || 'admin'

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = await params

  let body: { action: string; reason?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, reason, message } = body

  if (!action) {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 })
  }

  // Get the request to return after update
  let drawRequest = await getDrawRequestWithDetails(tenantSlug, id)
  if (!drawRequest) {
    return NextResponse.json({ error: 'Draw request not found' }, { status: 404 })
  }

  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.cgk.dev'
  let success = false

  switch (action) {
    case 'approve': {
      success = await approveDrawRequest(tenantSlug, id, userEmail, message)
      if (success) {
        // Mark linked withdrawals as approved
        await markWithdrawalsFromDrawRequest(tenantSlug, id, 'approved')

        // Send Slack notification
        await notifyDrawRequestApproved(tenantSlug, drawRequest, userEmail, adminUrl)
      }
      break
    }

    case 'reject': {
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        )
      }
      success = await rejectDrawRequest(tenantSlug, id, userEmail, reason)
      if (success) {
        // Send Slack notification
        await notifyDrawRequestRejected(tenantSlug, drawRequest, userEmail, reason, adminUrl)
      }
      break
    }

    case 'cancel': {
      success = await cancelDrawRequest(tenantSlug, id, userEmail)
      break
    }

    case 'generate-pdf': {
      // Generate and upload PDF
      const pdfResult = await generatePdf(drawRequest, {
        companyName: process.env.COMPANY_NAME || 'CGK Platform',
      })

      if (pdfResult.success && pdfResult.buffer) {
        const uploadResult = await uploadPdf(
          pdfResult.buffer,
          `${drawRequest.request_number}.pdf`,
          tenantSlug
        )

        if (uploadResult.success && uploadResult.url) {
          await updateDrawRequestPdf(tenantSlug, id, uploadResult.url)
          success = true
        }
      }
      break
    }

    case 'send-email': {
      // Generate PDF if not already done
      if (!drawRequest.pdf_url) {
        const pdfResult = await generatePdf(drawRequest, {
          companyName: process.env.COMPANY_NAME || 'CGK Platform',
        })

        if (pdfResult.success && pdfResult.buffer) {
          const uploadResult = await uploadPdf(
            pdfResult.buffer,
            `${drawRequest.request_number}.pdf`,
            tenantSlug
          )

          if (uploadResult.success && uploadResult.url) {
            await updateDrawRequestPdf(tenantSlug, id, uploadResult.url)
            drawRequest = {
              ...drawRequest,
              pdf_url: uploadResult.url,
            }
          }
        }
      }

      // Build and send email
      const emailContent = buildApprovalRequestEmail(drawRequest, {
        from: process.env.TREASURY_EMAIL_FROM || 'treasury@cgk.dev',
        replyTo: process.env.TREASURY_EMAIL_REPLY_TO || 'treasury-reply@cgk.dev',
        baseUrl: adminUrl,
      })

      const emailResult = await sendEmail(
        drawRequest.treasurer_email,
        emailContent.subject,
        emailContent.body,
        emailContent.html
      )

      if (emailResult.success) {
        // Log the outbound communication
        await logOutboundEmail(
          tenantSlug,
          id,
          emailContent.subject,
          emailContent.body,
          drawRequest.treasurer_email
        )
        success = true
      } else {
        return NextResponse.json(
          { error: emailResult.error || 'Failed to send email' },
          { status: 500 }
        )
      }
      break
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      )
  }

  if (!success && action !== 'send-email') {
    return NextResponse.json(
      { error: `Failed to ${action} draw request` },
      { status: 400 }
    )
  }

  // Fetch updated request
  const updatedRequest = await getDrawRequestWithDetails(tenantSlug, id)

  return NextResponse.json({ request: updatedRequest })
}

/**
 * DELETE /api/admin/treasury/requests/[id]
 * Delete a draft draw request
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = await params

  // Only allow deleting drafts
  const drawRequest = await getDrawRequestWithDetails(tenantSlug, id)
  if (!drawRequest) {
    return NextResponse.json({ error: 'Draw request not found' }, { status: 404 })
  }

  if (!drawRequest.is_draft) {
    return NextResponse.json(
      { error: 'Only draft requests can be deleted' },
      { status: 400 }
    )
  }

  // Cancel instead of hard delete to preserve audit trail
  const success = await cancelDrawRequest(tenantSlug, id, userId)

  if (!success) {
    return NextResponse.json(
      { error: 'Failed to delete draw request' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
