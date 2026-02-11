/**
 * Reprocess Inbound Email API
 *
 * POST /api/admin/communications/inbound/[id]/reprocess - Reprocess failed email
 *
 * @ai-pattern api-route
 * @ai-note Tenant-isolated via x-tenant-slug header
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { withTenant } from '@cgk/db'
import {
  getInboundEmailById,
  updateInboundLogStatus,
  routeEmail,
  type InboundEmail,
  type InboundAddressPurpose,
} from '@cgk/communications'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  const result = await withTenant(tenantSlug, async () => {
    // Get the email
    const emailLog = await getInboundEmailById(id)

    if (!emailLog) {
      return { error: 'Inbound email not found', status: 404 }
    }

    // Only allow reprocessing of failed emails
    if (emailLog.processingStatus !== 'failed') {
      return {
        error: `Cannot reprocess email with status: ${emailLog.processingStatus}`,
        status: 400,
      }
    }

    // Reset status to pending
    await updateInboundLogStatus(id, 'pending')

    // Reconstruct email object
    const email: InboundEmail = {
      id: emailLog.id,
      from: emailLog.fromAddress,
      fromName: emailLog.fromName || undefined,
      to: emailLog.toAddress,
      subject: emailLog.subject || undefined,
      bodyText: emailLog.bodyText || undefined,
      bodyHtml: emailLog.bodyHtml || undefined,
      messageId: emailLog.messageId || undefined,
      inReplyTo: emailLog.inReplyTo || undefined,
      references: emailLog.referencesList || undefined,
      attachments: emailLog.attachments,
      rawPayload: emailLog.rawPayload || undefined,
      resendEmailId: emailLog.resendEmailId || undefined,
      receivedAt: emailLog.receivedAt,
    }

    // Determine purpose from email type
    const purposeMap: Record<string, InboundAddressPurpose> = {
      treasury_approval: 'treasury',
      receipt: 'receipts',
      support: 'support',
      creator_reply: 'creator',
      unknown: 'general',
    }
    const purpose = purposeMap[emailLog.emailType] || 'general'

    try {
      // Reprocess
      const routeResult = await routeEmail(tenantId, email, id, purpose)

      return {
        success: true,
        handler: routeResult.handler,
        result: routeResult.result,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      await updateInboundLogStatus(id, 'failed', message)
      return { error: message, status: 500 }
    }
  })

  if ('error' in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 500 }
    )
  }

  return NextResponse.json(result)
}
