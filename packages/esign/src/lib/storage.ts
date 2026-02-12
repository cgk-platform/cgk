/**
 * E-Sign Storage Operations
 *
 * Handles file storage for e-signatures:
 * - Signature image storage to Vercel Blob
 * - Signed document finalization and upload
 * - Preview PDF generation
 * - File path management
 */

import { put, del } from '@vercel/blob'
import { embedFieldsInPDF, forceFlattenPdf, verifyPdfFlattened } from './pdf.js'
import type { EsignField, EsignSigner } from '../types.js'
import { STORAGE_PATHS } from '../constants.js'

// ============================================================================
// TYPES
// ============================================================================

export interface FinalizeDocumentOptions {
  tenantId: string
  documentId: string
  originalPdfUrl: string
  fields: EsignField[]
  signers: EsignSigner[]
}

export interface PreviewOptions {
  tenantId: string
  documentId: string
  originalPdfUrl: string
  fields: EsignField[]
  signers: EsignSigner[]
}

export interface SignatureImageOptions {
  tenantId: string
  signerId: string
  imageData: string // data:image/png;base64,... or data:image/jpeg;base64,...
}

export interface UploadResult {
  url: string
  downloadUrl: string
  pathname: string
  contentType: string
}

// ============================================================================
// STORAGE PATHS
// ============================================================================

/**
 * Generate storage path for a signed document
 */
export function getSignedDocumentPath(tenantId: string, documentId: string): string {
  return `${STORAGE_PATHS.SIGNED}/${tenantId}/${documentId}/signed.pdf`
}

/**
 * Generate storage path for a preview PDF
 */
export function getPreviewPath(tenantId: string, documentId: string, timestamp?: number): string {
  const ts = timestamp || Date.now()
  return `${STORAGE_PATHS.PREVIEWS}/${tenantId}/${documentId}-${ts}.pdf`
}

/**
 * Generate storage path for a signature image
 */
export function getSignatureImagePath(
  tenantId: string,
  signerId: string,
  format: string,
  timestamp?: number
): string {
  const ts = timestamp || Date.now()
  return `${STORAGE_PATHS.SIGNATURES}/${tenantId}/${signerId}/${ts}.${format}`
}

/**
 * Generate storage path for a template PDF
 */
export function getTemplatePath(tenantId: string, templateId: string): string {
  return `${STORAGE_PATHS.TEMPLATES}/${tenantId}/${templateId}/template.pdf`
}

/**
 * Generate storage path for a template thumbnail
 */
export function getThumbnailPath(tenantId: string, templateId: string): string {
  return `${STORAGE_PATHS.THUMBNAILS}/${tenantId}/${templateId}/thumbnail.png`
}

/**
 * Generate storage path for a document working copy
 */
export function getDocumentPath(tenantId: string, documentId: string): string {
  return `${STORAGE_PATHS.DOCUMENTS}/${tenantId}/${documentId}/document.pdf`
}

// ============================================================================
// DOCUMENT FINALIZATION
// ============================================================================

/**
 * Finalize a signed document:
 * 1. Embed all field values into PDF
 * 2. Flatten the PDF to remove interactive elements
 * 3. Verify the PDF is properly flattened
 * 4. Upload to Vercel Blob
 *
 * @param options - Finalization options
 * @returns URL of the signed document
 */
export async function finalizeSignedDocument(options: FinalizeDocumentOptions): Promise<string> {
  const { tenantId, documentId, originalPdfUrl, fields, signers } = options

  // Step 1: Embed all field values
  let pdfBytes = await embedFieldsInPDF({
    originalPdf: originalPdfUrl,
    fields,
    signers,
  })

  // Step 2: Flatten the PDF
  pdfBytes = await forceFlattenPdf(pdfBytes)

  // Step 3: Verify flattening
  const verification = await verifyPdfFlattened(pdfBytes)
  if (!verification.isFlat) {
    console.warn('PDF flattening verification issues:', verification.issues)
    // Continue anyway - issues are logged but shouldn't block signing
    // In production, you may want stricter handling
  }

  // Step 4: Upload to Vercel Blob
  const storagePath = getSignedDocumentPath(tenantId, documentId)

  const blob = await put(storagePath, Buffer.from(pdfBytes), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/pdf',
  })

  return blob.url
}

/**
 * Generate a preview PDF with current field values
 * Used during signing process to show progress
 *
 * @param options - Preview options
 * @returns URL of the preview PDF
 */
export async function generatePreviewPdf(options: PreviewOptions): Promise<string> {
  const { tenantId, documentId, originalPdfUrl, fields, signers } = options

  // Embed field values (no flattening for preview)
  const pdfBytes = await embedFieldsInPDF({
    originalPdf: originalPdfUrl,
    fields,
    signers,
  })

  // Upload with timestamp to allow multiple previews
  const timestamp = Date.now()
  const storagePath = getPreviewPath(tenantId, documentId, timestamp)

  const blob = await put(storagePath, Buffer.from(pdfBytes), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/pdf',
  })

  return blob.url
}

// ============================================================================
// SIGNATURE IMAGE STORAGE
// ============================================================================

/**
 * Extract base64 data and format from data URL
 */
function parseDataUrl(dataUrl: string): { format: string; base64: string } | null {
  const matches = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/)
  if (!matches || !matches[1] || !matches[2]) {
    return null
  }

  // Normalize jpeg to jpg
  const format = matches[1] === 'jpeg' ? 'jpg' : matches[1]
  return { format, base64: matches[2] }
}

/**
 * Save signature image to Vercel Blob
 *
 * @param options - Signature image options
 * @returns URL of the stored signature image
 */
export async function saveSignatureImage(options: SignatureImageOptions): Promise<string> {
  const { tenantId, signerId, imageData } = options

  // Parse data URL
  const parsed = parseDataUrl(imageData)
  if (!parsed) {
    throw new Error('Invalid image format. Expected data:image/png;base64 or data:image/jpeg;base64')
  }

  // Decode base64 to buffer
  const binaryString = atob(parsed.base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  // Generate storage path
  const timestamp = Date.now()
  const storagePath = getSignatureImagePath(tenantId, signerId, parsed.format, timestamp)

  // Upload to Vercel Blob
  const blob = await put(storagePath, Buffer.from(bytes), {
    access: 'public',
    addRandomSuffix: false,
    contentType: `image/${parsed.format === 'jpg' ? 'jpeg' : parsed.format}`,
  })

  return blob.url
}

/**
 * Delete a signature image from storage
 */
export async function deleteSignatureImage(url: string): Promise<void> {
  try {
    await del(url)
  } catch (error) {
    console.warn('Failed to delete signature image:', error)
  }
}

// ============================================================================
// TEMPLATE STORAGE
// ============================================================================

/**
 * Upload a template PDF
 */
export async function uploadTemplatePdf(
  tenantId: string,
  templateId: string,
  pdfData: Uint8Array | ArrayBuffer
): Promise<string> {
  const storagePath = getTemplatePath(tenantId, templateId)
  const bytes = pdfData instanceof Uint8Array ? pdfData : new Uint8Array(pdfData)

  const blob = await put(storagePath, Buffer.from(bytes), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/pdf',
  })

  return blob.url
}

/**
 * Upload a template thumbnail
 */
export async function uploadTemplateThumbnail(
  tenantId: string,
  templateId: string,
  imageData: Uint8Array | ArrayBuffer
): Promise<string> {
  const storagePath = getThumbnailPath(tenantId, templateId)
  const bytes = imageData instanceof Uint8Array ? imageData : new Uint8Array(imageData)

  const blob = await put(storagePath, Buffer.from(bytes), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'image/png',
  })

  return blob.url
}

/**
 * Delete a template and its associated files
 */
export async function deleteTemplateFiles(
  templateUrl: string,
  thumbnailUrl?: string | null
): Promise<void> {
  const deletePromises = [del(templateUrl)]
  if (thumbnailUrl) {
    deletePromises.push(del(thumbnailUrl))
  }

  await Promise.allSettled(deletePromises)
}

// ============================================================================
// DOCUMENT STORAGE
// ============================================================================

/**
 * Upload a document working copy
 */
export async function uploadDocumentPdf(
  tenantId: string,
  documentId: string,
  pdfData: Uint8Array | ArrayBuffer
): Promise<string> {
  const storagePath = getDocumentPath(tenantId, documentId)
  const bytes = pdfData instanceof Uint8Array ? pdfData : new Uint8Array(pdfData)

  const blob = await put(storagePath, Buffer.from(bytes), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/pdf',
  })

  return blob.url
}

/**
 * Delete a document and its associated files
 */
export async function deleteDocumentFiles(
  documentUrl: string,
  signedUrl?: string | null
): Promise<void> {
  const deletePromises = [del(documentUrl)]
  if (signedUrl) {
    deletePromises.push(del(signedUrl))
  }

  await Promise.allSettled(deletePromises)
}

// ============================================================================
// PREVIEW CLEANUP
// ============================================================================

/**
 * Delete old preview PDFs for a document
 * Call this periodically or after document completion
 */
export async function cleanupPreviews(
  _tenantId: string,
  _documentId: string,
  previewUrls: string[]
): Promise<void> {
  if (previewUrls.length === 0) return

  const deletePromises = previewUrls.map((url) =>
    del(url).catch((error) => console.warn('Failed to delete preview:', error))
  )

  await Promise.allSettled(deletePromises)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a download URL with content-disposition header
 */
export function getDownloadUrl(url: string, filename: string): string {
  const encodedFilename = encodeURIComponent(filename)
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}download=${encodedFilename}`
}

/**
 * Check if a URL is a Vercel Blob URL
 */
export function isVercelBlobUrl(url: string): boolean {
  return url.includes('.public.blob.vercel-storage.com') || url.includes('.vercel-storage.com')
}

/**
 * Extract the pathname from a Vercel Blob URL
 */
export function extractBlobPathname(url: string): string | null {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.pathname
  } catch {
    return null
  }
}
