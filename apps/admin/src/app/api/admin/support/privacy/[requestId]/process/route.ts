/**
 * Privacy Request Processing API
 *
 * POST /api/admin/support/privacy/[requestId]/process - Process request (export/delete)
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@cgk/auth'
import {
  getPrivacyRequest,
  processDataDeletion,
  processDataExport,
  updateRequestStatus,
} from '@cgk/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const auth = await requireAuth(req)
    const tenantId = auth.tenantId

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const { requestId } = await params

    // Verify request exists
    const existingRequest = await getPrivacyRequest(tenantId, requestId)
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    // Check if request is in a processable state
    if (existingRequest.status === 'completed') {
      return NextResponse.json(
        { error: 'Request has already been processed' },
        { status: 400 }
      )
    }

    if (existingRequest.status === 'rejected') {
      return NextResponse.json(
        { error: 'Request has been rejected and cannot be processed' },
        { status: 400 }
      )
    }

    // Check if verified (required for processing)
    if (!existingRequest.verifiedAt) {
      return NextResponse.json(
        { error: 'Request must be verified before processing' },
        { status: 400 }
      )
    }

    // Update status to processing
    await updateRequestStatus(tenantId, requestId, 'processing', auth.userId)

    // Process based on request type
    let resultUrl: string | null = null

    try {
      switch (existingRequest.requestType) {
        case 'export':
          resultUrl = await processDataExport(tenantId, requestId)
          break

        case 'delete':
          await processDataDeletion(tenantId, requestId)
          break

        case 'do_not_sell':
          // Mark in consent records
          const { recordConsent } = await import('@cgk/support')
          await recordConsent(tenantId, {
            customerEmail: existingRequest.customerEmail,
            customerId: existingRequest.customerId ?? undefined,
            consentType: 'third_party',
            granted: false,
            source: `privacy_request_${requestId}`,
          })
          await updateRequestStatus(tenantId, requestId, 'completed', auth.userId)
          break

        case 'disclosure':
          // For disclosure requests, we generate a report similar to export
          // but with additional metadata about data usage
          resultUrl = await processDataExport(tenantId, requestId)
          break

        default:
          return NextResponse.json(
            { error: 'Unknown request type' },
            { status: 400 }
          )
      }
    } catch (processingError) {
      // Revert to pending on error
      await updateRequestStatus(tenantId, requestId, 'pending', undefined)
      throw processingError
    }

    // Get updated request
    const request = await getPrivacyRequest(tenantId, requestId)

    return NextResponse.json({
      request,
      resultUrl,
    })
  } catch (error) {
    console.error('[privacy/process] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    )
  }
}
