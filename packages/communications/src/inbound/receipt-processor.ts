/**
 * Receipt Email Processor
 *
 * Processes receipt emails, stores attachments in Vercel Blob,
 * and creates treasury receipt records for admin review.
 *
 * @ai-pattern inbound-email
 * @ai-note Attachments stored under tenants/{tenantId}/receipts/
 */

import type {
  CreateTreasuryReceiptInput,
  InboundAttachment,
  InboundEmail,
  ProcessedReceipt,
  StoredAttachment,
  TreasuryReceipt,
  UpdateTreasuryReceiptInput,
} from './types.js'

// ============================================================================
// Attachment Validation
// ============================================================================

/**
 * Valid content types for receipt attachments
 */
export const RECEIPT_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

/**
 * Maximum attachment size in bytes (10MB)
 */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

/**
 * Check if content type is valid for receipts
 */
export function isReceiptAttachment(contentType: string): boolean {
  const normalized = contentType.toLowerCase().split(';')[0]?.trim() || ''
  return RECEIPT_CONTENT_TYPES.includes(normalized as typeof RECEIPT_CONTENT_TYPES[number])
}

/**
 * Check if attachment size is within limits
 */
export function isValidAttachmentSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_ATTACHMENT_SIZE
}

/**
 * Filter valid receipt attachments
 */
export function filterReceiptAttachments(
  attachments: InboundAttachment[]
): InboundAttachment[] {
  return attachments.filter(
    (att) =>
      isReceiptAttachment(att.contentType) && isValidAttachmentSize(att.sizeBytes)
  )
}

// ============================================================================
// Blob Storage Interface
// ============================================================================

/**
 * Upload function interface for Vercel Blob
 */
export type UploadToBlobFn = (
  path: string,
  content: Buffer | string,
  contentType: string
) => Promise<string>

/**
 * Default blob upload function (to be replaced by actual implementation)
 */
export const defaultUploadToBlob: UploadToBlobFn = async (
  path,
  _content,
  _contentType
) => {
  // This is a placeholder - actual implementation should use @vercel/blob
  return `https://blob.vercel-storage.com/${path}`
}

// ============================================================================
// Receipt Processing
// ============================================================================

/**
 * Generate blob storage path for receipt attachment
 */
export function generateReceiptBlobPath(
  tenantId: string,
  filename: string
): string {
  const timestamp = Date.now()
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `tenants/${tenantId}/receipts/${timestamp}-${safeFilename}`
}

/**
 * Store attachment in Vercel Blob
 */
async function storeAttachment(
  tenantId: string,
  attachment: InboundAttachment,
  uploadFn: UploadToBlobFn
): Promise<StoredAttachment | null> {
  if (!attachment.content) {
    return null
  }

  const path = generateReceiptBlobPath(tenantId, attachment.filename)

  // Convert base64 to buffer if needed
  const content =
    typeof attachment.content === 'string'
      ? Buffer.from(attachment.content, 'base64')
      : attachment.content

  try {
    const blobUrl = await uploadFn(path, content, attachment.contentType)

    return {
      filename: attachment.filename,
      contentType: attachment.contentType,
      blobUrl,
      sizeBytes: attachment.sizeBytes,
    }
  } catch (error) {
    console.error(`Failed to store attachment ${attachment.filename}:`, error)
    return null
  }
}

/**
 * Process receipt email
 *
 * Stores valid attachments in Vercel Blob and creates a treasury receipt record.
 *
 * @param tenantId - Tenant identifier
 * @param email - Inbound email to process
 * @param uploadFn - Function to upload to blob storage
 * @param createReceiptFn - Function to create receipt in database
 * @returns Processed receipt with stored attachments
 */
export async function processReceiptEmail(
  tenantId: string,
  email: InboundEmail,
  uploadFn: UploadToBlobFn,
  createReceiptFn: (
    input: CreateTreasuryReceiptInput
  ) => Promise<TreasuryReceipt>
): Promise<ProcessedReceipt> {
  const attachments: StoredAttachment[] = []

  // Filter and store valid attachments
  const validAttachments = filterReceiptAttachments(email.attachments || [])

  for (const attachment of validAttachments) {
    const stored = await storeAttachment(tenantId, attachment, uploadFn)
    if (stored) {
      attachments.push(stored)
    }
  }

  // Create receipt record
  const receipt = await createReceiptFn({
    inboundEmailId: email.id,
    fromAddress: email.from,
    subject: email.subject,
    body: email.bodyText,
    attachments,
    status: 'pending',
  })

  return {
    receiptId: receipt.id,
    attachments,
  }
}

// ============================================================================
// Receipt Data Extraction
// ============================================================================

/**
 * Patterns for extracting amount from email
 */
const AMOUNT_PATTERNS = [
  /\$[\d,]+\.?\d*/g, // $123.45 or $1,234.56
  /USD\s*[\d,]+\.?\d*/gi, // USD 123.45
  /total:?\s*\$?[\d,]+\.?\d*/gi, // Total: $123.45
  /amount:?\s*\$?[\d,]+\.?\d*/gi, // Amount: $123.45
]

/**
 * Try to extract amount from email text
 */
export function extractAmountFromText(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const matches = text.match(pattern)
    if (matches && matches.length > 0) {
      // Get the last match (often the total)
      const match = matches[matches.length - 1]
      if (match) {
        // Extract just the number
        const numberStr = match.replace(/[^\d.]/g, '')
        const amount = parseFloat(numberStr)
        if (!isNaN(amount) && amount > 0) {
          return Math.round(amount * 100) // Convert to cents
        }
      }
    }
  }
  return null
}

/**
 * Patterns for extracting date from email
 */
const DATE_PATTERNS = [
  /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
  /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
  /(\w+)\s+(\d{1,2}),?\s+(\d{4})/, // Month DD, YYYY
]

/**
 * Try to extract date from email text
 */
export function extractDateFromText(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (match && match[0]) {
      try {
        const date = new Date(match[0])
        if (!isNaN(date.getTime())) {
          const isoDate = date.toISOString().split('T')[0]
          return isoDate || null
        }
      } catch {
        continue
      }
    }
  }
  return null
}

/**
 * Common vendor name patterns
 */
const VENDOR_PATTERNS = [
  /from:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\s*<|$)/i, // From: Vendor Name
  /vendor:?\s*([A-Za-z0-9\s&.,'-]+)/i, // Vendor: Name
  /merchant:?\s*([A-Za-z0-9\s&.,'-]+)/i, // Merchant: Name
  /receipt from\s+([A-Za-z0-9\s&.,'-]+)/i, // Receipt from Vendor
]

/**
 * Try to extract vendor name from email
 */
export function extractVendorFromText(
  text: string,
  fromAddress: string
): string | null {
  // Try patterns first
  for (const pattern of VENDOR_PATTERNS) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const vendor = match[1].trim()
      if (vendor.length > 2 && vendor.length < 100) {
        return vendor
      }
    }
  }

  // Fall back to extracting from email domain
  const domainMatch = fromAddress.match(/@([^.]+)/)
  if (domainMatch && domainMatch[1]) {
    const domain = domainMatch[1]
    // Capitalize first letter
    return domain.charAt(0).toUpperCase() + domain.slice(1).toLowerCase()
  }

  return null
}

/**
 * Extract receipt data from email
 */
export function extractReceiptData(
  email: InboundEmail
): Partial<UpdateTreasuryReceiptInput> {
  const text = `${email.subject || ''} ${email.bodyText || ''}`

  return {
    amountCents: extractAmountFromText(text) ?? undefined,
    receiptDate: extractDateFromText(text) ?? undefined,
    vendorName: extractVendorFromText(text, email.from) ?? undefined,
  }
}
