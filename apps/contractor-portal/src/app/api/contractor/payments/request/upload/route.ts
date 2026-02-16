/**
 * Payment Request Attachment Upload API
 *
 * POST /api/contractor/payments/request/upload - Upload invoice attachment
 *
 * Security features:
 * - Magic byte validation to verify actual file type
 * - Filename sanitization and length limits
 * - File size limits
 * - Vercel Blob storage for secure file hosting
 */

import { put } from '@vercel/blob'
import { createPaymentAttachment } from '@cgk-platform/payments'

import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Max filename length
const MAX_FILENAME_LENGTH = 255

// File signatures (magic bytes) for validation
// Format: { mimeType: { signature: number[], offset?: number } }
const FILE_SIGNATURES: Record<string, { signature: number[]; offset?: number }[]> = {
  'application/pdf': [
    { signature: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  ],
  'image/png': [
    { signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }, // PNG header
  ],
  'image/jpeg': [
    { signature: [0xff, 0xd8, 0xff] }, // JPEG/JFIF
  ],
  'image/gif': [
    { signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  'image/webp': [
    { signature: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF at start
    // WebP also has WEBP at offset 8, but checking RIFF is sufficient
  ],
}

// Allowed MIME types (keys of FILE_SIGNATURES)
const ALLOWED_MIME_TYPES = Object.keys(FILE_SIGNATURES)

/**
 * Validate file content against magic bytes
 */
async function validateMagicBytes(file: File, declaredMimeType: string): Promise<boolean> {
  const signatures = FILE_SIGNATURES[declaredMimeType]
  if (!signatures) {
    return false
  }

  // Read enough bytes to check all signatures
  const maxBytesNeeded = Math.max(
    ...signatures.map((s) => (s.offset || 0) + s.signature.length)
  )

  const buffer = await file.slice(0, maxBytesNeeded).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // Check if any signature matches
  return signatures.some(({ signature, offset = 0 }) => {
    if (bytes.length < offset + signature.length) {
      return false
    }
    return signature.every((byte, i) => bytes[offset + i] === byte)
  })
}

/**
 * Sanitize filename to prevent path traversal and other issues
 */
function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  let sanitized = filename
    .replace(/[/\\]/g, '_')
    .replace(/\0/g, '')
    .replace(/\.\./g, '_')

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '')

  // Replace any remaining problematic characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_')

  // Truncate to max length while preserving extension
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = sanitized.split('.').pop() || ''
    const nameWithoutExt = sanitized.slice(0, sanitized.length - ext.length - 1)
    const maxNameLength = MAX_FILENAME_LENGTH - ext.length - 1
    sanitized = `${nameWithoutExt.slice(0, maxNameLength)}.${ext}`
  }

  // If empty after sanitization, use a default name
  if (!sanitized || sanitized === '.') {
    sanitized = 'attachment'
  }

  return sanitized
}

export async function POST(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  try {
    // Check for BLOB_READ_WRITE_TOKEN
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not configured')
      return Response.json(
        { error: 'File storage is not configured' },
        { status: 503 }
      )
    }

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

    // Validate filename length
    if (file.name.length > MAX_FILENAME_LENGTH) {
      return Response.json(
        { error: `Filename exceeds ${MAX_FILENAME_LENGTH} character limit` },
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

    // Validate magic bytes to ensure file content matches declared type
    const isValidContent = await validateMagicBytes(file, file.type)
    if (!isValidContent) {
      return Response.json(
        { error: 'File content does not match declared file type' },
        { status: 400 }
      )
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name)

    // Generate storage path with tenant isolation
    const storagePath = `tenants/${auth.tenantSlug}/contractors/${auth.contractorId}/invoices/${sanitizedFilename}`

    // Upload to Vercel Blob with random suffix for uniqueness
    const blob = await put(storagePath, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: true,
    })

    // Create attachment record with real URL
    const attachment = await createPaymentAttachment(
      auth.contractorId,
      auth.tenantSlug,
      {
        url: blob.url,
        filename: sanitizedFilename,
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
