/**
 * Privacy Request Verification API
 *
 * POST /api/admin/support/privacy/[requestId]/verify - Verify request identity
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk-platform/auth'
import {
  getPrivacyRequest,
  verifyRequest,
  type VerificationMethod,
} from '@cgk-platform/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const VALID_METHODS: VerificationMethod[] = ['email', 'phone', 'identity']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const { requestId } = await params
    const body = await req.json() as { method: VerificationMethod }

    if (!body.method || !VALID_METHODS.includes(body.method)) {
      return NextResponse.json(
        { error: 'Valid verification method required (email, phone, identity)' },
        { status: 400 }
      )
    }

    // Verify request exists
    const existingRequest = await getPrivacyRequest(tenantId, requestId)
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    // Check if already verified
    if (existingRequest.verifiedAt) {
      return NextResponse.json(
        { error: 'Request has already been verified' },
        { status: 400 }
      )
    }

    const request = await verifyRequest(tenantId, requestId, { method: body.method })

    return NextResponse.json({ request })
  } catch (error) {
    console.error('[privacy/verify] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify request' },
      { status: 500 }
    )
  }
}
