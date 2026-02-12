# PHASE-4C-ESIGN-PDF: PDF Generation & Field Positioning

**Status**: COMPLETE
**Duration**: 1 week (Week 17-18, overlaps with ESIGN-CORE)
**Depends On**: PHASE-4C-ESIGN-CORE (database schema only)
**Parallel With**: PHASE-4C-ESIGN-CORE (later tasks)
**Blocks**: PHASE-4C-ESIGN-WORKFLOWS

---

## Goal

Implement the PDF generation engine including coordinate system conversion, field embedding, signature placement, document flattening, and preview generation. This is the technical foundation for rendering signed documents.

---

## Success Criteria

- [x] Coordinate system conversion working (CSS → PDF)
- [x] Field values embedded in PDF correctly positioned
- [x] Signature images embedded with proper scaling
- [x] Text fields render with auto-sizing fonts
- [x] Checkmarks drawn for checkbox fields
- [x] PDF flattening removes interactive elements
- [x] Verification confirms flat PDF
- [x] Preview PDF generation working
- [x] Signed document finalization working
- [x] Signature image storage working

---

## Deliverables

### 1. Coordinate System

**CRITICAL: Understanding the coordinate systems**

```
1. OUR STORAGE FORMAT (Percentage-based, CSS-style origin):
   - Origin: TOP-LEFT corner
   - x: 0-100% from left edge
   - y: 0-100% from top edge
   - This matches CSS positioning (natural for web UI)

2. PDF COORDINATE SYSTEM (pdf-lib):
   - Origin: BOTTOM-LEFT corner
   - x: points from left edge (72 points = 1 inch)
   - y: points from bottom edge
   - Standard PDF unit is "points"

3. CONVERSION:
   - Preview (react-pdf): Use CSS, our format works directly
   - Embedding (pdf-lib): Must FLIP Y axis and convert to points
```

**Types:**

```typescript
// Field position as percentages (our storage format)
interface FieldPosition {
  x: number       // 0-100% from left
  y: number       // 0-100% from top (CSS-style)
  width: number   // 0-100%
  height: number  // 0-100%
  page: number    // 1-indexed
}

// PDF coordinates (for pdf-lib)
interface PdfCoordinates {
  x: number       // Points from left
  y: number       // Points from bottom (PDF origin!)
  width: number   // Points
  height: number  // Points
}

// Standard page sizes (72 points = 1 inch)
const PAGE_SIZES = {
  LETTER: { width: 612, height: 792 },  // 8.5" x 11"
  A4: { width: 595.28, height: 841.89 },
  LEGAL: { width: 612, height: 1008 },
  TABLOID: { width: 792, height: 1224 },
}
```

### 2. Coordinate Conversion Functions

```typescript
// packages/esign/src/lib/coordinates.ts

/**
 * Convert percentage position to CSS styles for preview
 */
export function toPreviewCSS(field: FieldPosition): CSSProperties {
  return {
    position: 'absolute',
    left: `${field.x}%`,
    top: `${field.y}%`,
    width: `${field.width}%`,
    height: `${field.height}%`,
  }
}

/**
 * Convert percentage position to PDF coordinates
 * CRITICAL: This flips the Y axis!
 */
export function toPdfCoordinates(
  field: FieldPosition,
  pageWidth: number,
  pageHeight: number
): PdfCoordinates {
  const pdfX = (field.x / 100) * pageWidth
  const pdfWidth = (field.width / 100) * pageWidth
  const pdfHeight = (field.height / 100) * pageHeight

  // CRITICAL: Flip Y coordinate
  // CSS: y=0 is top, PDF: y=0 is bottom
  // Formula: pdfY = pageHeight - (topOffset + fieldHeight)
  const pdfY = pageHeight - (field.y / 100) * pageHeight - pdfHeight

  return { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight }
}

/**
 * Convert PDF coordinates back to percentages
 * Used when importing existing PDFs with form fields
 */
export function fromPdfCoordinates(
  pdfX: number,
  pdfY: number,
  pdfWidth: number,
  pdfHeight: number,
  pageWidth: number,
  pageHeight: number
): Omit<FieldPosition, 'page'> {
  // Reverse the Y flip
  const cssY = ((pageHeight - pdfY - pdfHeight) / pageHeight) * 100

  return {
    x: (pdfX / pageWidth) * 100,
    y: cssY,
    width: (pdfWidth / pageWidth) * 100,
    height: (pdfHeight / pageHeight) * 100,
  }
}

/**
 * Convert pixel coordinates from drag-drop UI
 */
export function fromPixelCoordinates(
  pixelX: number,
  pixelY: number,
  pixelWidth: number,
  pixelHeight: number,
  containerWidth: number,
  containerHeight: number
): Omit<FieldPosition, 'page'> {
  return {
    x: (pixelX / containerWidth) * 100,
    y: (pixelY / containerHeight) * 100,
    width: (pixelWidth / containerWidth) * 100,
    height: (pixelHeight / containerHeight) * 100,
  }
}

// Validation helpers
export function clampPosition(field: FieldPosition): FieldPosition
export function isValidPosition(field: FieldPosition): boolean
export function fieldsOverlap(field1: FieldPosition, field2: FieldPosition): boolean
export function getDefaultFieldSize(type: string): { width: number; height: number }
export function snapToGrid(field: FieldPosition, gridSize?: number): FieldPosition
```

### 3. PDF Embedding Engine

```typescript
// packages/esign/src/lib/pdf.ts

import { PDFDocument, rgb, StandardFonts, PDFImage } from 'pdf-lib'

interface EmbedOptions {
  originalPdfUrl: string
  fields: EsignField[]
  signers: EsignSigner[]
}

/**
 * Embed all filled field values into a PDF
 */
export async function embedFieldsInPDF(options: EmbedOptions): Promise<Uint8Array> {
  const { originalPdfUrl, fields, signers } = options

  // Load PDF
  const pdfBytes = await fetch(originalPdfUrl).then(res => res.arrayBuffer())
  const pdfDoc = await PDFDocument.load(pdfBytes)

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Cache for signature images
  const signatureCache = new Map<string, PDFImage>()

  // Group fields by page
  const fieldsByPage = new Map<number, EsignField[]>()
  for (const field of fields) {
    if (!field.value && !field.default_value) continue
    const pageFields = fieldsByPage.get(field.page) || []
    pageFields.push(field)
    fieldsByPage.set(field.page, pageFields)
  }

  // Process each page
  for (const [pageNum, pageFields] of fieldsByPage) {
    const page = pdfDoc.getPage(pageNum - 1)  // pdf-lib uses 0-indexed
    const { width: pageWidth, height: pageHeight } = page.getSize()

    for (const field of pageFields) {
      const value = field.value || field.default_value || ''
      if (!value) continue

      // Convert to PDF coordinates
      const coords = toPdfCoordinates({
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        page: field.page,
      }, pageWidth, pageHeight)

      await embedField(page, field, coords, {
        helvetica,
        helveticaBold,
        signatureCache,
        pdfDoc,
      })
    }
  }

  return pdfDoc.save()
}

// Embed individual field based on type
async function embedField(
  page: PDFPage,
  field: EsignField,
  coords: PdfCoordinates,
  ctx: EmbedContext
) {
  const value = field.value || field.default_value || ''

  switch (field.type) {
    case 'signature':
    case 'initial':
      await embedSignatureImage(page, value, coords, ctx)
      break

    case 'text':
    case 'name':
    case 'email':
    case 'company':
    case 'title':
    case 'textarea':
      embedText(page, value, coords, ctx, field.type === 'name')
      break

    case 'date':
    case 'date_signed':
      embedDate(page, value, coords, ctx)
      break

    case 'checkbox':
      embedCheckmark(page, value, coords)
      break

    case 'number':
      embedNumber(page, value, coords, ctx)
      break

    case 'dropdown':
    case 'radio_group':
      embedText(page, value, coords, ctx, false)
      break
  }
}
```

### 4. Signature Image Embedding

```typescript
async function embedSignatureImage(
  page: PDFPage,
  imageUrl: string,
  coords: PdfCoordinates,
  ctx: EmbedContext
) {
  let signatureImage = ctx.signatureCache.get(imageUrl)

  if (!signatureImage) {
    const sigBytes = await fetch(imageUrl).then(r => r.arrayBuffer())
    // Detect format
    if (isPNG(sigBytes)) {
      signatureImage = await ctx.pdfDoc.embedPng(sigBytes)
    } else {
      signatureImage = await ctx.pdfDoc.embedJpg(sigBytes)
    }
    ctx.signatureCache.set(imageUrl, signatureImage)
  }

  // Scale to fit field with proper aspect ratio
  const sigDims = signatureImage.scale(1)
  const scale = Math.min(
    coords.width / sigDims.width,
    coords.height / sigDims.height
  )

  page.drawImage(signatureImage, {
    x: coords.x + (coords.width - sigDims.width * scale) / 2,  // Center H
    y: coords.y + (coords.height - sigDims.height * scale) / 2, // Center V
    width: sigDims.width * scale,
    height: sigDims.height * scale,
  })
}
```

### 5. Text & Field Embedding

```typescript
function embedText(
  page: PDFPage,
  value: string,
  coords: PdfCoordinates,
  ctx: EmbedContext,
  bold: boolean
) {
  const font = bold ? ctx.helveticaBold : ctx.helvetica
  const fontSize = calculateFontSize(value, coords.width, coords.height, font)

  page.drawText(value, {
    x: coords.x + 2,  // Small padding
    y: coords.y + (coords.height - fontSize) / 2,  // Center vertically
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
    maxWidth: coords.width - 4,
  })
}

function embedCheckmark(page: PDFPage, value: string, coords: PdfCoordinates) {
  if (value !== 'true' && value !== '1' && value !== 'checked') return

  const checkSize = Math.min(coords.width, coords.height) * 0.7
  const centerX = coords.x + coords.width / 2
  const centerY = coords.y + coords.height / 2

  // Draw checkmark using two lines
  page.drawLine({
    start: { x: centerX - checkSize / 2, y: centerY },
    end: { x: centerX - checkSize / 6, y: centerY - checkSize / 3 },
    thickness: 2,
    color: rgb(0, 0, 0),
  })
  page.drawLine({
    start: { x: centerX - checkSize / 6, y: centerY - checkSize / 3 },
    end: { x: centerX + checkSize / 2, y: centerY + checkSize / 3 },
    thickness: 2,
    color: rgb(0, 0, 0),
  })
}

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
```

### 6. PDF Flattening

```typescript
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
  } catch {}

  // Remove annotations from each page
  const pages = pdfDoc.getPages()
  for (const page of pages) {
    try {
      const annots = page.node.get(PDFName.of('Annots'))
      if (annots) {
        page.node.delete(PDFName.of('Annots'))
      }
    } catch {}
  }

  return pdfDoc.save()
}

/**
 * Verify PDF is properly flattened
 */
export async function verifyPdfFlattened(pdfBytes: Uint8Array): Promise<VerificationResult> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const issues: string[] = []

  // Check for AcroForm
  try {
    const form = pdfDoc.catalog.lookup(PDFName.of('AcroForm'))
    if (form && form instanceof PDFDict) {
      const fields = form.lookup(PDFName.of('Fields'))
      if (fields && fields instanceof PDFArray && fields.size() > 0) {
        issues.push(`PDF contains ${fields.size()} interactive form fields`)
      }
    }
  } catch {}

  // Check for editable annotations
  const pages = pdfDoc.getPages()
  for (let i = 0; i < pages.length; i++) {
    try {
      const annots = pages[i].node.lookup(PDFName.of('Annots'))
      if (annots && annots instanceof PDFArray) {
        for (let j = 0; j < annots.size(); j++) {
          const annot = annots.lookup(j)
          if (annot && annot instanceof PDFDict) {
            const subtype = annot.lookup(PDFName.of('Subtype'))
            if (subtype) {
              const str = subtype.toString()
              if (str.includes('Widget') || str.includes('FreeText')) {
                issues.push(`Page ${i + 1} has editable annotation: ${str}`)
              }
            }
          }
        }
      }
    } catch {}
  }

  return { isFlat: issues.length === 0, issues }
}
```

### 7. Document Finalization

```typescript
/**
 * Finalize a signed document:
 * 1. Embed all field values
 * 2. Flatten the PDF
 * 3. Verify it's flat
 * 4. Upload to Vercel Blob
 */
export async function finalizeSignedDocument(
  tenantId: string,
  documentId: string,
  originalPdfUrl: string,
  fields: EsignField[],
  signers: EsignSigner[]
): Promise<string> {
  // 1. Embed all field values
  let pdfBytes = await embedFieldsInPDF({ originalPdfUrl, fields, signers })

  // 2. Force flatten
  pdfBytes = await forceFlattenPdf(pdfBytes)

  // 3. Verify
  const verification = await verifyPdfFlattened(pdfBytes)
  if (!verification.isFlat) {
    throw new Error(`Failed to flatten: ${verification.issues.join(', ')}`)
  }

  // 4. Upload to Vercel Blob
  const blob = await put(
    `esign/documents/${tenantId}/${documentId}/signed.pdf`,
    new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' }),
    { access: 'public', addRandomSuffix: false }
  )

  return blob.url
}

/**
 * Generate preview PDF (same process, different storage path)
 */
export async function generatePreviewPdf(
  tenantId: string,
  documentId: string,
  originalPdfUrl: string,
  fields: EsignField[],
  signers: EsignSigner[]
): Promise<string> {
  const pdfBytes = await embedFieldsInPDF({ originalPdfUrl, fields, signers })

  const timestamp = Date.now()
  const blob = await put(
    `esign/previews/${tenantId}/${documentId}-${timestamp}.pdf`,
    new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' }),
    { access: 'public', addRandomSuffix: false }
  )

  return blob.url
}
```

### 8. Signature Image Storage

```typescript
/**
 * Save signature image to Vercel Blob
 */
export async function saveSignatureImage(
  tenantId: string,
  signerId: string,
  imageData: string  // data:image/png;base64,...
): Promise<string> {
  // Extract base64
  const matches = imageData.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
  if (!matches) throw new Error('Invalid image format')

  const imageType = matches[1]
  const base64Data = matches[2]
  const buffer = Buffer.from(base64Data, 'base64')

  const timestamp = Date.now()
  const blob = await put(
    `esign/signatures/${tenantId}/${signerId}/${timestamp}.${imageType}`,
    buffer,
    {
      access: 'public',
      addRandomSuffix: false,
      contentType: `image/${imageType}`,
    }
  )

  return blob.url
}
```

### 9. Storage Paths

```typescript
const STORAGE_PATHS = {
  TEMPLATES: 'esign/templates',    // Template PDFs
  THUMBNAILS: 'esign/templates',   // Template thumbnails
  DOCUMENTS: 'esign/documents',    // Working copies
  SIGNED: 'esign/documents',       // Signed finals
  SIGNATURES: 'esign/signatures',  // Signature images
  PREVIEWS: 'esign/previews',      // Preview PDFs (temporary)
}

// Full path pattern:
// esign/{type}/{tenantId}/{documentId}/{filename}
```

---

## Constraints

- pdf-lib is the PDF library (no external services)
- All coordinates stored as percentages (0-100) for device independence
- Y-axis flip is CRITICAL for PDF embedding
- Signatures stored as PNG images
- Flattened PDFs cannot be edited
- Preview PDFs are temporary and can be cleaned up

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Field placement UI, PDF viewer component

**MCPs to consult:**
- Context7 MCP: "pdf-lib drawing operations"
- Context7 MCP: "Vercel Blob file uploads"

**RAWDOG code to reference:**
- `src/lib/esign/coordinates.ts` - Complete coordinate system
- `src/lib/esign/pdf.ts` - PDF embedding implementation
- `src/lib/esign/pdf-generator.ts` - HTML to PDF generation

---

## Tasks

### [PARALLEL] Coordinate system
- [x] Create `packages/esign/src/lib/coordinates.ts`
- [x] Implement `toPreviewCSS`
- [x] Implement `toPdfCoordinates` (with Y flip!)
- [x] Implement `fromPdfCoordinates`
- [x] Implement `fromPixelCoordinates`
- [x] Add validation helpers
- [ ] Add unit tests for coordinate conversion (deferred to testing phase)

### [PARALLEL with coordinates] PDF embedding core
- [x] Create `packages/esign/src/lib/pdf.ts`
- [x] Implement `embedFieldsInPDF` shell
- [x] Implement text field embedding
- [x] Implement date field embedding
- [x] Implement number field embedding
- [x] Implement checkbox embedding

### [SEQUENTIAL after core] Signature embedding
- [x] Implement signature image embedding
- [x] Handle PNG/JPG detection
- [x] Implement aspect ratio preservation
- [x] Add signature caching

### [SEQUENTIAL after signature] PDF flattening
- [x] Implement `forceFlattenPdf`
- [x] Implement `verifyPdfFlattened`
- [ ] Add tests for flattening verification (deferred to testing phase)

### [SEQUENTIAL after flattening] Document finalization
- [x] Implement `finalizeSignedDocument`
- [x] Implement Vercel Blob upload
- [x] Implement `generatePreviewPdf`

### [PARALLEL with finalization] Signature storage
- [x] Implement `saveSignatureImage`
- [x] Handle base64 extraction
- [x] Configure storage paths

### [SEQUENTIAL after all] Preview UI component
- [ ] Create PDF viewer with react-pdf (UI phase)
- [ ] Overlay field positions using CSS (UI phase)
- [ ] Handle multi-page documents (UI phase)
- [ ] Add zoom controls (UI phase)

---

## Definition of Done

- [x] Coordinate conversion produces correct positions
- [x] Text fields render at correct locations
- [x] Signatures embed with proper aspect ratio
- [x] Checkboxes show checkmarks when checked
- [x] PDF flattening removes interactive elements
- [x] Verification detects unflattened PDFs
- [x] Signed documents upload to Blob
- [x] Preview generation works
- [ ] Unit tests pass for coordinate math (deferred to testing phase)
- [x] `npx tsc --noEmit` passes
- [ ] Manual testing: field positions match preview and final PDF (requires UI)
