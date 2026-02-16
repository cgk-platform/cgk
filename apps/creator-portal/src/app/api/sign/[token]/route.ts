/**
 * Public Signing API Route
 *
 * GET /api/sign/[token] - Get signing session by token
 * POST /api/sign/[token] - Sign the document
 * DELETE /api/sign/[token] - Decline to sign
 */

import { getSigningSessionByToken, signDocument, declineDocument, type SignDocumentInput } from '@/lib/esign'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * Extract tenant slug from request
 * For signing, we need to determine the tenant from the hostname or a query param
 * Returns null if tenant cannot be determined - callers must handle this case
 */
function getTenantSlug(req: Request): string | null {
  const url = new URL(req.url)

  // Check query param first (for development)
  const tenantParam = url.searchParams.get('tenant')
  if (tenantParam) {
    return tenantParam
  }

  // Extract from subdomain (creator.{tenant}.example.com or {tenant}.example.com)
  const hostname = url.hostname
  const parts = hostname.split('.')

  // For localhost and direct IP addresses, require explicit tenant query param
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    // Tenant must be provided via query param for local development
    return null
  }

  // Handle subdomains
  if (parts.length >= 3) {
    // Remove 'creator' prefix if present
    const subdomain = parts[0] === 'creator' ? parts[1] : parts[0]
    if (subdomain) {
      return subdomain
    }
  }

  // Cannot determine tenant - return null
  return null
}

/**
 * Get signing session
 */
export async function GET(req: Request, { params }: RouteParams): Promise<Response> {
  try {
    const { token } = await params
    const tenantSlug = getTenantSlug(req)

    if (!tenantSlug) {
      return Response.json({
        error: 'Tenant context required',
        code: 'TENANT_REQUIRED',
      }, { status: 401 })
    }

    const session = await getSigningSessionByToken(tenantSlug, token)

    if (!session) {
      return Response.json({
        error: 'Invalid or expired signing link',
        code: 'INVALID_TOKEN',
      }, { status: 404 })
    }

    // Return session data (excluding sensitive fields)
    return Response.json({
      document: {
        id: session.document.id,
        name: session.document.name,
        fileUrl: session.document.fileUrl,
        message: session.document.message,
        expiresAt: session.document.expiresAt,
      },
      signer: {
        id: session.signer.id,
        name: session.signer.name,
        email: session.signer.email,
        role: session.signer.role,
        status: session.signer.status,
      },
      fields: session.fields.map((f) => ({
        id: f.id,
        type: f.type,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        required: f.required,
        placeholder: f.placeholder,
        defaultValue: f.defaultValue,
        options: f.options,
        value: f.value,
        readOnly: f.readOnly,
      })),
      hasExistingSignature: !!session.existingSignature,
    })
  } catch (error) {
    console.error('Error fetching signing session:', error)
    return Response.json({ error: 'Failed to load document' }, { status: 500 })
  }
}

/**
 * Sign the document
 */
export async function POST(req: Request, { params }: RouteParams): Promise<Response> {
  try {
    const { token } = await params
    const tenantSlug = getTenantSlug(req)

    if (!tenantSlug) {
      return Response.json({
        error: 'Tenant context required',
        code: 'TENANT_REQUIRED',
      }, { status: 401 })
    }

    const body = (await req.json()) as SignDocumentInput

    // Validate required fields
    if (!body.signatureData) {
      return Response.json({ error: 'Signature is required' }, { status: 400 })
    }

    if (!body.signatureType || !['drawn', 'typed', 'uploaded'].includes(body.signatureType)) {
      return Response.json({ error: 'Invalid signature type' }, { status: 400 })
    }

    // Get client info for audit
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const result = await signDocument(tenantSlug, token, body, ipAddress, userAgent)

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 })
    }

    return Response.json({
      success: true,
      message: 'Document signed successfully',
      document: result.document,
    })
  } catch (error) {
    console.error('Error signing document:', error)
    const message = error instanceof Error ? error.message : 'Failed to sign document'
    return Response.json({ error: message }, { status: 500 })
  }
}

/**
 * Decline to sign
 */
export async function DELETE(req: Request, { params }: RouteParams): Promise<Response> {
  try {
    const { token } = await params
    const tenantSlug = getTenantSlug(req)

    if (!tenantSlug) {
      return Response.json({
        error: 'Tenant context required',
        code: 'TENANT_REQUIRED',
      }, { status: 401 })
    }

    const body = (await req.json()) as { reason?: string }
    const reason = body.reason || 'No reason provided'

    // Get client info for audit
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const result = await declineDocument(tenantSlug, token, reason, ipAddress, userAgent)

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 })
    }

    return Response.json({
      success: true,
      message: 'Document declined',
    })
  } catch (error) {
    console.error('Error declining document:', error)
    const message = error instanceof Error ? error.message : 'Failed to decline document'
    return Response.json({ error: message }, { status: 500 })
  }
}
