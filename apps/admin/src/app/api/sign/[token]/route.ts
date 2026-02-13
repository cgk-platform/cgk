/**
 * Public Signing Session API
 *
 * GET /api/sign/[token] - Get signing session data
 * POST /api/sign/[token] - Submit signature
 */

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import {
  getSignerByToken,
  markSignerViewed,
  markSignerSigned,
  markSignerDeclined,
  setFieldValues,
  areRequiredFieldsFilled,
  getSignerFields,
  checkAllSignersSigned,
  markDocumentCompleted,
  markDocumentInProgress,
  createSignature,
  logDocumentViewed,
  logDocumentSigned,
  logDocumentDeclined,
  type EsignField,
} from '@cgk-platform/esign'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * Find which tenant a signer token belongs to
 */
async function findTenantForToken(token: string): Promise<string | null> {
  // Query public schema to find the tenant
  // This is a cross-tenant lookup, which is okay for signing URLs
  const result = await sql`
    SELECT t.slug
    FROM public.tenants t
    WHERE EXISTS (
      SELECT 1 FROM pg_catalog.pg_tables
      WHERE schemaname = 'tenant_' || t.slug
      AND tablename = 'esign_signers'
    )
  `

  for (const row of result.rows) {
    const tenantSlug = row.slug as string
    const signer = await getSignerByToken(tenantSlug, token)
    if (signer) {
      return tenantSlug
    }
  }

  return null
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { token } = await params

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Find tenant for this token
    const tenantSlug = await findTenantForToken(token)
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Invalid or expired signing link' }, { status: 404 })
    }

    // Get signer
    const signer = await getSignerByToken(tenantSlug, token)
    if (!signer) {
      return NextResponse.json({ error: 'Invalid or expired signing link' }, { status: 404 })
    }

    // Check signer status
    if (signer.status === 'signed') {
      return NextResponse.json({
        error: 'This document has already been signed',
        status: 'signed',
      }, { status: 400 })
    }

    if (signer.status === 'declined') {
      return NextResponse.json({
        error: 'This document has been declined',
        status: 'declined',
      }, { status: 400 })
    }

    // Get document
    const document = await withTenant(tenantSlug, async () => {
      const result = await sql`
        SELECT d.*, t.name as template_name, t.file_url as template_file_url
        FROM esign_documents d
        LEFT JOIN esign_templates t ON t.id = d.template_id
        WHERE d.id = ${signer.document_id}
      `
      return result.rows[0]
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check document status
    if (document.status === 'voided') {
      return NextResponse.json({
        error: 'This document has been voided',
        status: 'voided',
      }, { status: 400 })
    }

    if (document.status === 'expired') {
      return NextResponse.json({
        error: 'This document has expired',
        status: 'expired',
      }, { status: 400 })
    }

    if (document.expires_at && new Date(document.expires_at as string) < new Date()) {
      return NextResponse.json({
        error: 'This document has expired',
        status: 'expired',
      }, { status: 400 })
    }

    // Mark as viewed if first time
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    if (!signer.viewed_at) {
      await markSignerViewed(tenantSlug, signer.id, ipAddress, userAgent)
      await logDocumentViewed(tenantSlug, document.id as string, signer.id, ipAddress, userAgent)

      // Update document status if still pending
      if (document.status === 'pending') {
        await markDocumentInProgress(tenantSlug, document.id as string)
      }
    }

    // Get fields for this signer
    const fields = await getSignerFields(tenantSlug, signer.id)

    return NextResponse.json({
      signer: {
        id: signer.id,
        name: signer.name,
        email: signer.email,
        role: signer.role,
        status: signer.status,
      },
      document: {
        id: document.id,
        name: document.name,
        fileUrl: document.file_url,
        message: document.message,
        expiresAt: document.expires_at,
      },
      fields: fields.map((f: EsignField) => ({
        id: f.id,
        type: f.type,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        required: f.required,
        placeholder: f.placeholder,
        defaultValue: f.default_value,
        options: f.options,
        value: f.value,
      })),
    })
  } catch (error) {
    console.error('Error loading signing session:', error)
    return NextResponse.json(
      { error: 'Failed to load signing session' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { token } = await params

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Find tenant for this token
    const tenantSlug = await findTenantForToken(token)
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Invalid or expired signing link' }, { status: 404 })
    }

    // Get signer
    const signer = await getSignerByToken(tenantSlug, token)
    if (!signer) {
      return NextResponse.json({ error: 'Invalid or expired signing link' }, { status: 404 })
    }

    // Verify signer can still sign
    if (signer.status === 'signed') {
      return NextResponse.json({ error: 'Already signed' }, { status: 400 })
    }
    if (signer.status === 'declined') {
      return NextResponse.json({ error: 'Already declined' }, { status: 400 })
    }

    const body = await request.json()
    const { action, fields, signature, declineReason } = body

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Handle decline
    if (action === 'decline') {
      await markSignerDeclined(tenantSlug, signer.id, declineReason, ipAddress, userAgent)
      await logDocumentDeclined(tenantSlug, signer.document_id, signer.id, declineReason, ipAddress, userAgent)

      return NextResponse.json({
        success: true,
        message: 'Document declined',
      })
    }

    // Handle sign
    if (action !== 'sign') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Validate signature
    if (!signature || !signature.imageUrl) {
      return NextResponse.json({ error: 'Signature is required' }, { status: 400 })
    }

    // Save field values
    if (fields && Array.isArray(fields) && fields.length > 0) {
      await setFieldValues(tenantSlug, fields)
    }

    // Check all required fields are filled
    const allFilled = await areRequiredFieldsFilled(tenantSlug, signer.id)
    if (!allFilled) {
      return NextResponse.json({ error: 'Please fill all required fields' }, { status: 400 })
    }

    // Save signature
    await createSignature(tenantSlug, {
      signer_id: signer.id,
      type: signature.type || 'drawn',
      image_url: signature.imageUrl,
      font_name: signature.fontName,
    })

    // Mark signer as signed
    await markSignerSigned(tenantSlug, signer.id, ipAddress, userAgent)
    await logDocumentSigned(tenantSlug, signer.document_id, signer.id, ipAddress, userAgent)

    // Check if all signers have signed
    const allSigned = await checkAllSignersSigned(tenantSlug, signer.document_id)
    if (allSigned) {
      // Get document file URL for signed version (in production, generate signed PDF)
      const document = await withTenant(tenantSlug, async () => {
        const result = await sql`SELECT file_url FROM esign_documents WHERE id = ${signer.document_id}`
        return result.rows[0]
      })

      // Mark document complete (using original file URL for now - PDF generation is separate phase)
      await markDocumentCompleted(
        tenantSlug,
        signer.document_id,
        document?.file_url as string || ''
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Document signed successfully',
      allComplete: allSigned,
    })
  } catch (error) {
    console.error('Error processing signature:', error)
    return NextResponse.json(
      { error: 'Failed to process signature' },
      { status: 500 }
    )
  }
}
