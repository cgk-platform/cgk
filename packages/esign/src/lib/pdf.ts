/**
 * E-Sign PDF Engine
 *
 * Handles PDF manipulation for e-signatures:
 * - Embedding field values into PDF
 * - Signature image embedding with proper scaling
 * - PDF flattening to remove interactive elements
 * - Verification of flattened PDFs
 */

import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  PDFName,
  PDFDict,
  PDFArray,
  rgb,
  StandardFonts,
  degrees,
} from 'pdf-lib'
import { toPdfCoordinates, fromPdfCoordinates, type PdfCoordinates } from './coordinates.js'
import type { EsignField, EsignSigner, FieldType } from '../types.js'

// ============================================================================
// TYPES
// ============================================================================

export interface EmbedOptions {
  /** URL or bytes of the original PDF */
  originalPdf: string | Uint8Array
  /** Fields to embed */
  fields: EsignField[]
  /** Signers for reference (for signature images) */
  signers: EsignSigner[]
}

export interface EmbedContext {
  pdfDoc: PDFDocument
  helvetica: PDFFont
  helveticaBold: PDFFont
  signatureCache: Map<string, PDFImage>
}

export interface VerificationResult {
  isFlat: boolean
  issues: string[]
}

export interface PdfPageInfo {
  pageNumber: number
  width: number
  height: number
}

// ============================================================================
// MAIN EMBEDDING FUNCTION
// ============================================================================

/**
 * Embed all filled field values into a PDF
 *
 * @param options - Embedding options with PDF source and fields
 * @returns PDF bytes with embedded fields
 */
export async function embedFieldsInPDF(options: EmbedOptions): Promise<Uint8Array> {
  const { originalPdf, fields } = options

  // Load PDF
  let pdfBytes: ArrayBuffer
  if (typeof originalPdf === 'string') {
    const response = await fetch(originalPdf)
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`)
    }
    pdfBytes = await response.arrayBuffer()
  } else {
    pdfBytes = originalPdf.buffer as ArrayBuffer
  }

  const pdfDoc = await PDFDocument.load(pdfBytes)

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Context for embedding operations
  const ctx: EmbedContext = {
    pdfDoc,
    helvetica,
    helveticaBold,
    signatureCache: new Map(),
  }

  // Group fields by page
  const fieldsByPage = new Map<number, EsignField[]>()
  for (const field of fields) {
    // Skip fields without values
    if (!field.value && !field.default_value) continue

    const pageFields = fieldsByPage.get(field.page) || []
    pageFields.push(field)
    fieldsByPage.set(field.page, pageFields)
  }

  // Process each page
  const pages = pdfDoc.getPages()
  for (const [pageNum, pageFields] of fieldsByPage) {
    // pdf-lib uses 0-indexed pages
    const pageIndex = pageNum - 1
    if (pageIndex < 0 || pageIndex >= pages.length) {
      console.warn(`Page ${pageNum} does not exist in PDF (total pages: ${pages.length})`)
      continue
    }

    const page = pages[pageIndex]
    if (!page) continue

    const { width: pageWidth, height: pageHeight } = page.getSize()

    for (const field of pageFields) {
      const value = field.value || field.default_value || ''
      if (!value) continue

      // Convert to PDF coordinates
      const coords = toPdfCoordinates(
        {
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
        },
        pageWidth,
        pageHeight
      )

      await embedField(page, field, value, coords, ctx)
    }
  }

  return pdfDoc.save()
}

/**
 * Get information about all pages in a PDF
 */
export async function getPdfPageInfo(pdfSource: string | Uint8Array): Promise<PdfPageInfo[]> {
  let pdfBytes: ArrayBuffer
  if (typeof pdfSource === 'string') {
    const response = await fetch(pdfSource)
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`)
    }
    pdfBytes = await response.arrayBuffer()
  } else {
    pdfBytes = pdfSource.buffer as ArrayBuffer
  }

  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pages = pdfDoc.getPages()

  return pages.map((page, index) => {
    const { width, height } = page.getSize()
    return {
      pageNumber: index + 1,
      width,
      height,
    }
  })
}

/**
 * Get the number of pages in a PDF
 */
export async function getPdfPageCount(pdfSource: string | Uint8Array): Promise<number> {
  let pdfBytes: ArrayBuffer
  if (typeof pdfSource === 'string') {
    const response = await fetch(pdfSource)
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`)
    }
    pdfBytes = await response.arrayBuffer()
  } else {
    pdfBytes = pdfSource.buffer as ArrayBuffer
  }

  const pdfDoc = await PDFDocument.load(pdfBytes)
  return pdfDoc.getPageCount()
}

// ============================================================================
// FIELD TYPE DISPATCHING
// ============================================================================

/**
 * Embed a single field based on its type
 */
async function embedField(
  page: PDFPage,
  field: EsignField,
  value: string,
  coords: PdfCoordinates,
  ctx: EmbedContext
): Promise<void> {
  const fieldType = field.type as FieldType

  switch (fieldType) {
    case 'signature':
    case 'initial':
      await embedSignatureImage(page, value, coords, ctx)
      break

    case 'text':
    case 'textarea':
    case 'dropdown':
    case 'radio_group':
      embedText(page, value, coords, ctx, false)
      break

    case 'name':
      embedText(page, value, coords, ctx, true) // Bold for names
      break

    case 'email':
    case 'company':
    case 'title':
      embedText(page, value, coords, ctx, false)
      break

    case 'date':
    case 'date_signed':
      embedDate(page, value, coords, ctx)
      break

    case 'checkbox':
      embedCheckmark(page, value, coords)
      break

    case 'checkbox_group':
      // For checkbox groups, value is comma-separated checked items
      embedText(page, value, coords, ctx, false)
      break

    case 'number':
      embedNumber(page, value, coords, ctx)
      break

    case 'formula':
      // Formula results are just text
      embedText(page, value, coords, ctx, false)
      break

    case 'note':
      // Notes are static labels, typically already in PDF
      break

    case 'attachment':
      // Attachments are stored separately, not embedded in PDF
      break

    default: {
      // Handle any unknown field type as text
      const _exhaustiveCheck: never = fieldType
      console.warn(`Unknown field type: ${_exhaustiveCheck}`)
      embedText(page, value, coords, ctx, false)
    }
  }
}

// ============================================================================
// SIGNATURE EMBEDDING
// ============================================================================

/**
 * Check if bytes represent a PNG image
 */
function isPNG(bytes: ArrayBuffer): boolean {
  const view = new Uint8Array(bytes)
  // PNG magic number: 89 50 4E 47 0D 0A 1A 0A
  return (
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47 &&
    view[4] === 0x0d &&
    view[5] === 0x0a &&
    view[6] === 0x1a &&
    view[7] === 0x0a
  )
}

/**
 * Check if bytes represent a JPEG image
 */
function isJPEG(bytes: ArrayBuffer): boolean {
  const view = new Uint8Array(bytes)
  // JPEG magic number: FF D8 FF
  return view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff
}

/**
 * Extract base64 data from data URL
 */
function extractBase64FromDataUrl(dataUrl: string): { format: string; data: string } | null {
  const matches = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,(.+)$/)
  if (!matches || !matches[1] || !matches[2]) return null
  return { format: matches[1], data: matches[2] }
}

/**
 * Embed signature image into PDF
 * Handles both URL and data URL formats
 */
async function embedSignatureImage(
  page: PDFPage,
  imageUrl: string,
  coords: PdfCoordinates,
  ctx: EmbedContext
): Promise<void> {
  try {
    // Check cache first
    let signatureImage = ctx.signatureCache.get(imageUrl)

    if (!signatureImage) {
      let imageBytes: ArrayBuffer

      // Handle data URL
      if (imageUrl.startsWith('data:image/')) {
        const extracted = extractBase64FromDataUrl(imageUrl)
        if (!extracted) {
          console.warn('Invalid signature data URL format')
          return
        }

        // Handle SVG by skipping (SVG needs rasterization first)
        if (extracted.format === 'svg+xml') {
          console.warn('SVG signatures must be rasterized before embedding')
          return
        }

        // Decode base64
        const binaryString = atob(extracted.data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        imageBytes = bytes.buffer as ArrayBuffer
      } else {
        // Fetch from URL
        const response = await fetch(imageUrl)
        if (!response.ok) {
          console.warn(`Failed to fetch signature image: ${response.statusText}`)
          return
        }
        imageBytes = await response.arrayBuffer()
      }

      // Detect format and embed
      if (isPNG(imageBytes)) {
        signatureImage = await ctx.pdfDoc.embedPng(imageBytes)
      } else if (isJPEG(imageBytes)) {
        signatureImage = await ctx.pdfDoc.embedJpg(imageBytes)
      } else {
        // Try PNG as fallback (works for most cases)
        try {
          signatureImage = await ctx.pdfDoc.embedPng(imageBytes)
        } catch {
          console.warn('Unable to embed signature image - unsupported format')
          return
        }
      }

      // Cache for reuse
      ctx.signatureCache.set(imageUrl, signatureImage)
    }

    // Scale to fit field with proper aspect ratio
    const sigDims = signatureImage.scale(1)
    const scaleX = coords.width / sigDims.width
    const scaleY = coords.height / sigDims.height
    const scale = Math.min(scaleX, scaleY) // Fit within bounds

    const scaledWidth = sigDims.width * scale
    const scaledHeight = sigDims.height * scale

    // Center within the field
    const offsetX = (coords.width - scaledWidth) / 2
    const offsetY = (coords.height - scaledHeight) / 2

    page.drawImage(signatureImage, {
      x: coords.x + offsetX,
      y: coords.y + offsetY,
      width: scaledWidth,
      height: scaledHeight,
    })
  } catch (error) {
    console.error('Error embedding signature:', error)
  }
}

// ============================================================================
// TEXT EMBEDDING
// ============================================================================

/**
 * Calculate optimal font size to fit text in field
 */
function calculateFontSize(
  text: string,
  maxWidth: number,
  maxHeight: number,
  font: PDFFont
): number {
  const maxFontSize = Math.min(14, maxHeight * 0.7)
  const minFontSize = 6

  for (let size = maxFontSize; size >= minFontSize; size -= 0.5) {
    const width = font.widthOfTextAtSize(text, size)
    if (width <= maxWidth - 4) return size
  }

  return minFontSize
}

/**
 * Embed text into PDF field
 */
function embedText(
  page: PDFPage,
  value: string,
  coords: PdfCoordinates,
  ctx: EmbedContext,
  bold: boolean
): void {
  const font = bold ? ctx.helveticaBold : ctx.helvetica
  const fontSize = calculateFontSize(value, coords.width, coords.height, font)

  // Calculate vertical centering
  const textHeight = fontSize
  const yOffset = (coords.height - textHeight) / 2

  page.drawText(value, {
    x: coords.x + 2, // Small left padding
    y: coords.y + yOffset + fontSize * 0.15, // Baseline adjustment
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
    maxWidth: coords.width - 4,
  })
}

/**
 * Embed date into PDF field
 * Formats date if it's an ISO string
 */
function embedDate(
  page: PDFPage,
  value: string,
  coords: PdfCoordinates,
  ctx: EmbedContext
): void {
  let displayValue = value

  // Try to format ISO date
  try {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      displayValue = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
  } catch {
    // Use original value if parsing fails
  }

  embedText(page, displayValue, coords, ctx, false)
}

/**
 * Embed number into PDF field
 * Handles decimal formatting
 */
function embedNumber(
  page: PDFPage,
  value: string,
  coords: PdfCoordinates,
  ctx: EmbedContext
): void {
  let displayValue = value

  // Try to format number
  try {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      displayValue = num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    }
  } catch {
    // Use original value if parsing fails
  }

  embedText(page, displayValue, coords, ctx, false)
}

// ============================================================================
// CHECKBOX EMBEDDING
// ============================================================================

/**
 * Embed checkmark for checkbox fields
 */
function embedCheckmark(page: PDFPage, value: string, coords: PdfCoordinates): void {
  // Check if the checkbox is checked
  const isChecked =
    value === 'true' || value === '1' || value === 'checked' || value.toLowerCase() === 'yes'

  if (!isChecked) return

  const checkSize = Math.min(coords.width, coords.height) * 0.7
  const centerX = coords.x + coords.width / 2
  const centerY = coords.y + coords.height / 2

  // Draw checkmark using two lines
  // Line 1: Short downward stroke
  page.drawLine({
    start: { x: centerX - checkSize * 0.35, y: centerY },
    end: { x: centerX - checkSize * 0.1, y: centerY - checkSize * 0.3 },
    thickness: 2,
    color: rgb(0, 0, 0),
  })

  // Line 2: Long upward stroke
  page.drawLine({
    start: { x: centerX - checkSize * 0.1, y: centerY - checkSize * 0.3 },
    end: { x: centerX + checkSize * 0.4, y: centerY + checkSize * 0.35 },
    thickness: 2,
    color: rgb(0, 0, 0),
  })
}

/**
 * Embed an X mark for checkbox fields (alternative style)
 */
export function embedXMark(page: PDFPage, value: string, coords: PdfCoordinates): void {
  const isChecked =
    value === 'true' || value === '1' || value === 'checked' || value.toLowerCase() === 'yes'

  if (!isChecked) return

  const markSize = Math.min(coords.width, coords.height) * 0.6
  const centerX = coords.x + coords.width / 2
  const centerY = coords.y + coords.height / 2

  // Draw X using two diagonal lines
  page.drawLine({
    start: { x: centerX - markSize / 2, y: centerY - markSize / 2 },
    end: { x: centerX + markSize / 2, y: centerY + markSize / 2 },
    thickness: 2,
    color: rgb(0, 0, 0),
  })

  page.drawLine({
    start: { x: centerX - markSize / 2, y: centerY + markSize / 2 },
    end: { x: centerX + markSize / 2, y: centerY - markSize / 2 },
    thickness: 2,
    color: rgb(0, 0, 0),
  })
}

// ============================================================================
// PDF FLATTENING
// ============================================================================

/**
 * Force flatten a PDF by removing interactive elements
 * pdf-lib's drawText/drawImage creates flat content,
 * but this removes existing form fields or annotations
 */
export async function forceFlattenPdf(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)

  // Remove AcroForm (interactive form fields)
  try {
    const catalog = pdfDoc.catalog
    if (catalog.has(PDFName.of('AcroForm'))) {
      catalog.delete(PDFName.of('AcroForm'))
    }
  } catch (error) {
    console.warn('Could not remove AcroForm:', error)
  }

  // Remove annotations from each page
  const pages = pdfDoc.getPages()
  for (const page of pages) {
    try {
      const annots = page.node.get(PDFName.of('Annots'))
      if (annots) {
        page.node.delete(PDFName.of('Annots'))
      }
    } catch (error) {
      console.warn('Could not remove annotations from page:', error)
    }
  }

  return pdfDoc.save()
}

/**
 * Verify PDF is properly flattened
 * Returns issues found if any
 */
export async function verifyPdfFlattened(pdfBytes: Uint8Array): Promise<VerificationResult> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const issues: string[] = []

  // Check for AcroForm
  try {
    const acroForm = pdfDoc.catalog.lookup(PDFName.of('AcroForm'))
    if (acroForm && acroForm instanceof PDFDict) {
      const fields = acroForm.lookup(PDFName.of('Fields'))
      if (fields && fields instanceof PDFArray && fields.size() > 0) {
        issues.push(`PDF contains ${fields.size()} interactive form fields`)
      }
    }
  } catch {
    // No AcroForm is fine
  }

  // Check for editable annotations on each page
  const pages = pdfDoc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    if (!page) continue

    try {
      const annots = page.node.lookup(PDFName.of('Annots'))
      if (annots && annots instanceof PDFArray) {
        for (let j = 0; j < annots.size(); j++) {
          const annot = annots.lookup(j)
          if (annot && annot instanceof PDFDict) {
            const subtype = annot.lookup(PDFName.of('Subtype'))
            if (subtype) {
              const subtypeStr = subtype.toString()
              // Check for editable annotation types
              if (
                subtypeStr.includes('Widget') ||
                subtypeStr.includes('FreeText') ||
                subtypeStr.includes('Text')
              ) {
                issues.push(`Page ${i + 1} has editable annotation: ${subtypeStr}`)
              }
            }
          }
        }
      }
    } catch {
      // No annotations is fine
    }
  }

  return {
    isFlat: issues.length === 0,
    issues,
  }
}

// ============================================================================
// PDF UTILITIES
// ============================================================================

/**
 * Create a new PDF document
 */
export async function createPdfDocument(): Promise<PDFDocument> {
  return PDFDocument.create()
}

/**
 * Load a PDF from URL or bytes
 */
export async function loadPdf(source: string | Uint8Array): Promise<PDFDocument> {
  if (typeof source === 'string') {
    const response = await fetch(source)
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`)
    }
    const bytes = await response.arrayBuffer()
    return PDFDocument.load(bytes)
  }
  return PDFDocument.load(source)
}

/**
 * Merge multiple PDFs into one
 */
export async function mergePdfs(pdfs: (string | Uint8Array)[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create()

  for (const pdf of pdfs) {
    const sourceDoc = await loadPdf(pdf)
    const copiedPages = await mergedDoc.copyPages(sourceDoc, sourceDoc.getPageIndices())
    copiedPages.forEach((page) => mergedDoc.addPage(page))
  }

  return mergedDoc.save()
}

/**
 * Extract specific pages from a PDF
 */
export async function extractPages(
  source: string | Uint8Array,
  pageNumbers: number[]
): Promise<Uint8Array> {
  const sourceDoc = await loadPdf(source)
  const newDoc = await PDFDocument.create()

  // Convert 1-indexed to 0-indexed
  const pageIndices = pageNumbers.map((n) => n - 1).filter((i) => i >= 0 && i < sourceDoc.getPageCount())

  const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices)
  copiedPages.forEach((page) => newDoc.addPage(page))

  return newDoc.save()
}

/**
 * Add a watermark to all pages
 */
export async function addWatermark(
  source: string | Uint8Array,
  text: string,
  options: { opacity?: number; fontSize?: number; rotation?: number } = {}
): Promise<Uint8Array> {
  const { opacity = 0.3, fontSize = 48, rotation = 45 } = options

  const pdfDoc = await loadPdf(source)
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const page of pages) {
    const { width, height } = page.getSize()
    const textWidth = helvetica.widthOfTextAtSize(text, fontSize)

    // Calculate center position
    const centerX = width / 2 - textWidth / 2
    const centerY = height / 2

    page.drawText(text, {
      x: centerX,
      y: centerY,
      size: fontSize,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(rotation),
    })
  }

  return pdfDoc.save()
}

// ============================================================================
// SIGNATURE POSITIONING UTILITIES
// ============================================================================

export interface SignaturePosition {
  /** Page number (1-indexed) */
  page: number
  /** X position in percentage (0-100) from left */
  x: number
  /** Y position in percentage (0-100) from top */
  y: number
  /** Width in percentage (0-100) */
  width: number
  /** Height in percentage (0-100) */
  height: number
}

export interface SignaturePlacementResult {
  /** Whether placement is valid */
  valid: boolean
  /** Adjusted position (if clamping was needed) */
  position: SignaturePosition
  /** Warnings about placement */
  warnings: string[]
}

/**
 * Validate and optionally adjust signature position
 * Ensures the signature fits within page bounds
 */
export function validateSignaturePosition(
  position: SignaturePosition,
  options: { clamp?: boolean } = {}
): SignaturePlacementResult {
  const { clamp = true } = options
  const warnings: string[] = []
  let adjusted = { ...position }

  // Validate page number
  if (position.page < 1) {
    warnings.push('Page number must be at least 1')
    if (clamp) adjusted.page = 1
  }

  // Validate dimensions
  if (position.width <= 0 || position.height <= 0) {
    warnings.push('Width and height must be positive')
    if (clamp) {
      adjusted.width = Math.max(1, position.width)
      adjusted.height = Math.max(1, position.height)
    }
  }

  // Validate and clamp x position
  if (position.x < 0) {
    warnings.push('X position was negative, clamped to 0')
    if (clamp) adjusted.x = 0
  } else if (position.x + position.width > 100) {
    warnings.push('Signature extends beyond right edge, adjusted')
    if (clamp) adjusted.x = Math.max(0, 100 - position.width)
  }

  // Validate and clamp y position
  if (position.y < 0) {
    warnings.push('Y position was negative, clamped to 0')
    if (clamp) adjusted.y = 0
  } else if (position.y + position.height > 100) {
    warnings.push('Signature extends beyond bottom edge, adjusted')
    if (clamp) adjusted.y = Math.max(0, 100 - position.height)
  }

  // Check for reasonable size (signature should be visible but not too large)
  if (position.width > 50) {
    warnings.push('Signature width is unusually large (>50%)')
  }
  if (position.height > 20) {
    warnings.push('Signature height is unusually large (>20%)')
  }
  if (position.width < 5) {
    warnings.push('Signature width is very small (<5%)')
  }
  if (position.height < 2) {
    warnings.push('Signature height is very small (<2%)')
  }

  return {
    valid: warnings.length === 0,
    position: clamp ? adjusted : position,
    warnings,
  }
}

/**
 * Calculate optimal signature size based on available space
 * @param availableWidth - Available width in percentage (0-100)
 * @param availableHeight - Available height in percentage (0-100)
 * @param aspectRatio - Desired aspect ratio (width/height), default 3:1
 */
export function calculateOptimalSignatureSize(
  availableWidth: number,
  availableHeight: number,
  aspectRatio: number = 3
): { width: number; height: number } {
  // Default signature size targets
  const targetWidth = 20 // 20% of page width
  const targetHeight = 5 // 5% of page height

  // Start with target dimensions, constrained by available space
  let width = Math.min(availableWidth * 0.9, targetWidth)
  let height = Math.min(availableHeight * 0.9, targetHeight)

  // Adjust to maintain aspect ratio while respecting constraints
  const currentRatio = width / height
  if (currentRatio > aspectRatio) {
    // Width is too large relative to height, reduce width
    width = height * aspectRatio
  } else if (currentRatio < aspectRatio) {
    // Height is too large relative to width, reduce height
    height = width / aspectRatio
  }

  // Re-check if height fits after aspect ratio adjustment
  if (height > availableHeight * 0.9) {
    height = availableHeight * 0.9
    width = height * aspectRatio
  }

  // Ensure minimum size
  width = Math.max(5, width)
  height = Math.max(2, height)

  return { width, height }
}

// ============================================================================
// PDF WITH SIGNATURE PREVIEW
// ============================================================================

export interface SignatureOverlayOptions {
  /** Original PDF source (URL or bytes) */
  pdfSource: string | Uint8Array
  /** Signature positions and images */
  signatures: Array<{
    position: SignaturePosition
    imageUrl: string // data URL or URL
    signerId?: string
    signerName?: string
  }>
  /** Whether to add visual indicators (borders) for preview */
  showBorders?: boolean
  /** Border color as RGB values (0-1) */
  borderColor?: { r: number; g: number; b: number }
}

/**
 * Create a PDF with signature overlays for preview
 * This allows showing what the document will look like with signatures
 * without committing the changes
 */
export async function createSignaturePreview(
  options: SignatureOverlayOptions
): Promise<Uint8Array> {
  const { pdfSource, signatures, showBorders = false, borderColor = { r: 0.2, g: 0.6, b: 0.4 } } = options

  const pdfDoc = await loadPdf(pdfSource)
  const pages = pdfDoc.getPages()
  const signatureCache = new Map<string, PDFImage>()

  for (const sig of signatures) {
    const pageIndex = sig.position.page - 1
    if (pageIndex < 0 || pageIndex >= pages.length) {
      console.warn(`Page ${sig.position.page} does not exist in PDF`)
      continue
    }

    const page = pages[pageIndex]
    if (!page) continue

    const { width: pageWidth, height: pageHeight } = page.getSize()

    // Convert percentage to PDF coordinates
    const coords = toPdfCoordinates(
      {
        x: sig.position.x,
        y: sig.position.y,
        width: sig.position.width,
        height: sig.position.height,
      },
      pageWidth,
      pageHeight
    )

    // Draw border if preview mode
    if (showBorders) {
      page.drawRectangle({
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height,
        borderColor: rgb(borderColor.r, borderColor.g, borderColor.b),
        borderWidth: 1,
        opacity: 0.5,
      })
    }

    // Embed signature image
    try {
      let signatureImage = signatureCache.get(sig.imageUrl)

      if (!signatureImage) {
        let imageBytes: ArrayBuffer

        if (sig.imageUrl.startsWith('data:image/')) {
          // Handle data URL
          const matches = sig.imageUrl.match(/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,(.+)$/)
          if (!matches || !matches[2]) {
            console.warn('Invalid signature data URL format')
            continue
          }

          if (matches[1] === 'svg+xml') {
            console.warn('SVG signatures need rasterization')
            continue
          }

          const binaryString = atob(matches[2])
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          imageBytes = bytes.buffer as ArrayBuffer
        } else {
          // Fetch from URL
          const response = await fetch(sig.imageUrl)
          if (!response.ok) {
            console.warn(`Failed to fetch signature: ${response.statusText}`)
            continue
          }
          imageBytes = await response.arrayBuffer()
        }

        // Detect and embed
        if (isPNG(imageBytes)) {
          signatureImage = await pdfDoc.embedPng(imageBytes)
        } else if (isJPEG(imageBytes)) {
          signatureImage = await pdfDoc.embedJpg(imageBytes)
        } else {
          try {
            signatureImage = await pdfDoc.embedPng(imageBytes)
          } catch {
            console.warn('Unable to embed signature - unsupported format')
            continue
          }
        }

        signatureCache.set(sig.imageUrl, signatureImage)
      }

      // Scale to fit
      const sigDims = signatureImage.scale(1)
      const scaleX = coords.width / sigDims.width
      const scaleY = coords.height / sigDims.height
      const scale = Math.min(scaleX, scaleY)

      const scaledWidth = sigDims.width * scale
      const scaledHeight = sigDims.height * scale

      // Center within field
      const offsetX = (coords.width - scaledWidth) / 2
      const offsetY = (coords.height - scaledHeight) / 2

      page.drawImage(signatureImage, {
        x: coords.x + offsetX,
        y: coords.y + offsetY,
        width: scaledWidth,
        height: scaledHeight,
      })
    } catch (error) {
      console.error('Error embedding signature in preview:', error)
    }
  }

  return pdfDoc.save()
}

// ============================================================================
// CERTIFICATE OF COMPLETION
// ============================================================================

export interface CertificateOfCompletionData {
  documentId: string
  documentName: string
  completedAt: Date
  signers: Array<{
    name: string
    email: string
    signedAt: Date
    ipAddress?: string
  }>
  /** Optional tenant/company name */
  issuedBy?: string
}

/**
 * Generate a Certificate of Completion page to append to signed documents
 * This provides a legal record of all signatures
 */
export async function generateCertificateOfCompletion(
  data: CertificateOfCompletionData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // Letter size
  const { width, height } = page.getSize()

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let y = height - 60

  // Title
  const title = 'Certificate of Completion'
  const titleWidth = helveticaBold.widthOfTextAtSize(title, 20)
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y,
    size: 20,
    font: helveticaBold,
    color: rgb(0.15, 0.3, 0.25),
  })
  y -= 40

  // Document info
  page.drawText('Document Details', {
    x: 50,
    y,
    size: 14,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  })
  y -= 25

  page.drawText(`Document Name: ${data.documentName}`, {
    x: 50,
    y,
    size: 11,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  })
  y -= 18

  page.drawText(`Document ID: ${data.documentId}`, {
    x: 50,
    y,
    size: 11,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  })
  y -= 18

  page.drawText(`Completed: ${data.completedAt.toISOString().split('T')[0]} at ${data.completedAt.toLocaleTimeString()}`, {
    x: 50,
    y,
    size: 11,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  })
  y -= 40

  // Signers
  page.drawText('Signers', {
    x: 50,
    y,
    size: 14,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  })
  y -= 25

  // Draw table header
  page.drawLine({
    start: { x: 50, y: y + 5 },
    end: { x: width - 50, y: y + 5 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  })
  y -= 5

  page.drawText('Name', { x: 55, y, size: 10, font: helveticaBold, color: rgb(0.3, 0.3, 0.3) })
  page.drawText('Email', { x: 180, y, size: 10, font: helveticaBold, color: rgb(0.3, 0.3, 0.3) })
  page.drawText('Signed At', { x: 350, y, size: 10, font: helveticaBold, color: rgb(0.3, 0.3, 0.3) })
  page.drawText('IP Address', { x: 480, y, size: 10, font: helveticaBold, color: rgb(0.3, 0.3, 0.3) })
  y -= 15

  page.drawLine({
    start: { x: 50, y: y + 5 },
    end: { x: width - 50, y: y + 5 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })

  // Draw each signer
  for (const signer of data.signers) {
    y -= 20

    // Truncate long values
    const name = signer.name.length > 20 ? signer.name.substring(0, 18) + '...' : signer.name
    const email = signer.email.length > 25 ? signer.email.substring(0, 23) + '...' : signer.email
    const signedAt = signer.signedAt.toISOString().split('T').join(' ').substring(0, 16)
    const ip = signer.ipAddress || 'N/A'

    page.drawText(name, { x: 55, y, size: 10, font: helvetica, color: rgb(0.3, 0.3, 0.3) })
    page.drawText(email, { x: 180, y, size: 10, font: helvetica, color: rgb(0.3, 0.3, 0.3) })
    page.drawText(signedAt, { x: 350, y, size: 10, font: helvetica, color: rgb(0.3, 0.3, 0.3) })
    page.drawText(ip, { x: 480, y, size: 10, font: helvetica, color: rgb(0.3, 0.3, 0.3) })
  }

  y -= 30
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  })

  // Footer
  y -= 40
  if (data.issuedBy) {
    page.drawText(`Issued by: ${data.issuedBy}`, {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  y -= 20
  page.drawText('This certificate confirms that all parties have electronically signed the above document.', {
    x: 50,
    y,
    size: 9,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  })
  y -= 15
  page.drawText('Electronic signatures are legally binding under ESIGN Act and UETA.', {
    x: 50,
    y,
    size: 9,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  })

  return pdfDoc.save()
}

/**
 * Append certificate of completion to a signed document
 */
export async function appendCertificateOfCompletion(
  signedPdfSource: string | Uint8Array,
  certificateData: CertificateOfCompletionData
): Promise<Uint8Array> {
  // Generate certificate
  const certificateBytes = await generateCertificateOfCompletion(certificateData)

  // Merge with signed document
  return mergePdfs([signedPdfSource, certificateBytes])
}

// ============================================================================
// SIGNATURE FIELD DETECTION
// ============================================================================

export interface DetectedSignatureField {
  page: number
  x: number
  y: number
  width: number
  height: number
  fieldName?: string
}

/**
 * Detect existing signature form fields in a PDF
 * Useful for importing PDFs that already have form fields defined
 */
export async function detectSignatureFields(
  pdfSource: string | Uint8Array
): Promise<DetectedSignatureField[]> {
  const pdfDoc = await loadPdf(pdfSource)
  const fields: DetectedSignatureField[] = []

  // Check for AcroForm
  try {
    const acroForm = pdfDoc.catalog.lookup(PDFName.of('AcroForm'))
    if (!acroForm || !(acroForm instanceof PDFDict)) {
      return fields
    }

    const formFields = acroForm.lookup(PDFName.of('Fields'))
    if (!formFields || !(formFields instanceof PDFArray)) {
      return fields
    }

    // Get pages for coordinate conversion
    const pages = pdfDoc.getPages()

    // Iterate through form fields
    for (let i = 0; i < formFields.size(); i++) {
      const fieldRef = formFields.get(i)
      const field = pdfDoc.context.lookup(fieldRef)

      if (!(field instanceof PDFDict)) continue

      // Check if it's a signature field
      const fieldType = field.lookup(PDFName.of('FT'))
      if (!fieldType || fieldType.toString() !== '/Sig') continue

      // Get field name
      const fieldNameObj = field.lookup(PDFName.of('T'))
      const fieldName = fieldNameObj ? fieldNameObj.toString().replace(/[()]/g, '') : undefined

      // Get widget annotation with position
      const widgetRect = field.lookup(PDFName.of('Rect'))
      if (!widgetRect || !(widgetRect instanceof PDFArray)) continue

      const rect = {
        x1: Number(widgetRect.get(0)?.toString() || 0),
        y1: Number(widgetRect.get(1)?.toString() || 0),
        x2: Number(widgetRect.get(2)?.toString() || 0),
        y2: Number(widgetRect.get(3)?.toString() || 0),
      }

      // Determine which page this field is on
      let pageNumber = 1
      const pageRef = field.lookup(PDFName.of('P'))
      if (pageRef) {
        for (let p = 0; p < pages.length; p++) {
          const page = pages[p]
          if (page && page.ref === pageRef) {
            pageNumber = p + 1
            break
          }
        }
      }

      const page = pages[pageNumber - 1]
      if (!page) continue

      const { width: pageWidth, height: pageHeight } = page.getSize()

      // Convert PDF coordinates to our percentage-based format
      const position = fromPdfCoordinates(
        rect.x1,
        rect.y1,
        rect.x2 - rect.x1,
        rect.y2 - rect.y1,
        pageWidth,
        pageHeight
      )

      fields.push({
        page: pageNumber,
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
        fieldName,
      })
    }
  } catch (error) {
    console.warn('Error detecting signature fields:', error)
  }

  return fields
}
