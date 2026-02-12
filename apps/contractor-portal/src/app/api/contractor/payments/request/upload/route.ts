/**
 * Payment Request Attachment Upload API
 *
 * POST /api/contractor/payments/request/upload - Upload invoice attachment
 *
 * Note: This is a placeholder implementation. In production, you would integrate
 * with a blob storage service like Vercel Blob, S3, or Cloudflare R2.
 */

import { createPaymentAttachment } from '@cgk/payments'

import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]

export async function POST(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return Response.json(
        { error: 'Invalid file type. Allowed: PDF, PNG, JPEG, GIF, WebP' },
        { status: 400 }
      )
    }

    // In production, upload to blob storage (Vercel Blob, S3, R2, etc.)
    // For now, use a placeholder URL pattern
    // TODO: Integrate with actual blob storage
    const placeholderUrl = `https://storage.example.com/tenants/${auth.tenantSlug}/contractors/${auth.contractorId}/invoices/${Date.now()}-${encodeURIComponent(file.name)}`

    // Create attachment record
    const attachment = await createPaymentAttachment(
      auth.contractorId,
      auth.tenantSlug,
      {
        url: placeholderUrl,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      }
    )

    return Response.json({
      success: true,
      attachment: {
        id: attachment.id,
        url: attachment.url,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        uploadedAt: attachment.uploadedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error uploading attachment:', error)
    return Response.json(
      { error: 'Failed to upload attachment' },
      { status: 500 }
    )
  }
}
