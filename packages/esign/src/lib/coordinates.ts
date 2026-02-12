/**
 * E-Sign Coordinate System
 *
 * Handles coordinate conversion between different systems:
 * 1. OUR STORAGE FORMAT (Percentage-based, CSS-style origin):
 *    - Origin: TOP-LEFT corner
 *    - x, y: 0-100% from left/top edge
 *
 * 2. PDF COORDINATE SYSTEM (pdf-lib):
 *    - Origin: BOTTOM-LEFT corner
 *    - x, y: points from left/bottom edge (72 points = 1 inch)
 *
 * 3. PIXEL COORDINATES (Drag-drop UI):
 *    - Origin: TOP-LEFT corner
 *    - x, y: pixels from container edges
 */

import type { CSSProperties } from 'react'
import { FIELD_CONFIG } from '../constants.js'
import type { FieldType } from '../types.js'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Field position as percentages (our storage format)
 */
export interface FieldPosition {
  x: number // 0-100% from left
  y: number // 0-100% from top (CSS-style)
  width: number // 0-100%
  height: number // 0-100%
  page: number // 1-indexed
}

/**
 * PDF coordinates (for pdf-lib)
 */
export interface PdfCoordinates {
  x: number // Points from left
  y: number // Points from bottom (PDF origin!)
  width: number // Points
  height: number // Points
}

/**
 * Standard page sizes in points (72 points = 1 inch)
 */
export const PAGE_SIZES = {
  LETTER: { width: 612, height: 792 }, // 8.5" x 11"
  A4: { width: 595.28, height: 841.89 },
  LEGAL: { width: 612, height: 1008 },
  TABLOID: { width: 792, height: 1224 },
} as const

export type PageSizeName = keyof typeof PAGE_SIZES
export type PageSize = { width: number; height: number }

// ============================================================================
// COORDINATE CONVERSIONS
// ============================================================================

/**
 * Convert percentage position to CSS styles for preview
 * Used with react-pdf overlay positioning
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
 * Convert percentage position to CSS styles with pixel offset
 * Useful for drag-drop operations that need transform origin
 */
export function toPreviewCSSWithPx(
  field: FieldPosition,
  containerWidth: number,
  containerHeight: number
): CSSProperties {
  return {
    position: 'absolute',
    left: `${(field.x / 100) * containerWidth}px`,
    top: `${(field.y / 100) * containerHeight}px`,
    width: `${(field.width / 100) * containerWidth}px`,
    height: `${(field.height / 100) * containerHeight}px`,
  }
}

/**
 * Convert percentage position to PDF coordinates
 * CRITICAL: This flips the Y axis!
 *
 * @param field - Field position in percentage (0-100)
 * @param pageWidth - PDF page width in points
 * @param pageHeight - PDF page height in points
 * @returns PDF coordinates in points
 */
export function toPdfCoordinates(
  field: Omit<FieldPosition, 'page'>,
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
 *
 * @param pdfX - X position in points from left
 * @param pdfY - Y position in points from bottom
 * @param pdfWidth - Width in points
 * @param pdfHeight - Height in points
 * @param pageWidth - PDF page width in points
 * @param pageHeight - PDF page height in points
 * @returns Position in percentages (0-100)
 */
export function fromPdfCoordinates(
  pdfX: number,
  pdfY: number,
  pdfWidth: number,
  pdfHeight: number,
  pageWidth: number,
  pageHeight: number
): Omit<FieldPosition, 'page'> {
  // Reverse the Y flip: CSS y = pageHeight - pdfY - fieldHeight
  const cssY = ((pageHeight - pdfY - pdfHeight) / pageHeight) * 100

  return {
    x: (pdfX / pageWidth) * 100,
    y: cssY,
    width: (pdfWidth / pageWidth) * 100,
    height: (pdfHeight / pageHeight) * 100,
  }
}

/**
 * Convert pixel coordinates from drag-drop UI to percentages
 *
 * @param pixelX - X position in pixels from container left
 * @param pixelY - Y position in pixels from container top
 * @param pixelWidth - Width in pixels
 * @param pixelHeight - Height in pixels
 * @param containerWidth - Container width in pixels
 * @param containerHeight - Container height in pixels
 * @returns Position in percentages (0-100)
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

/**
 * Convert percentages to pixel coordinates for UI rendering
 */
export function toPixelCoordinates(
  field: Omit<FieldPosition, 'page'>,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: (field.x / 100) * containerWidth,
    y: (field.y / 100) * containerHeight,
    width: (field.width / 100) * containerWidth,
    height: (field.height / 100) * containerHeight,
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Clamp field position to valid bounds (0-100%)
 * Ensures field doesn't extend outside page boundaries
 */
export function clampPosition(field: FieldPosition): FieldPosition {
  const x = Math.max(0, Math.min(100 - field.width, field.x))
  const y = Math.max(0, Math.min(100 - field.height, field.y))
  const width = Math.max(FIELD_CONFIG.MIN_WIDTH, Math.min(100 - x, field.width))
  const height = Math.max(FIELD_CONFIG.MIN_HEIGHT, Math.min(100 - y, field.height))
  const page = Math.max(1, Math.floor(field.page))

  return { x, y, width, height, page }
}

/**
 * Check if position is valid (within 0-100% bounds)
 */
export function isValidPosition(field: FieldPosition): boolean {
  if (field.x < 0 || field.y < 0) return false
  if (field.width < FIELD_CONFIG.MIN_WIDTH || field.height < FIELD_CONFIG.MIN_HEIGHT) return false
  if (field.x + field.width > 100) return false
  if (field.y + field.height > 100) return false
  if (field.page < 1 || !Number.isInteger(field.page)) return false
  return true
}

/**
 * Check if two fields overlap on the same page
 */
export function fieldsOverlap(field1: FieldPosition, field2: FieldPosition): boolean {
  // Different pages don't overlap
  if (field1.page !== field2.page) return false

  // Check for no overlap conditions
  const noOverlapX = field1.x + field1.width <= field2.x || field2.x + field2.width <= field1.x
  const noOverlapY = field1.y + field1.height <= field2.y || field2.y + field2.height <= field1.y

  return !noOverlapX && !noOverlapY
}

/**
 * Get default field size for a given type
 * Sizes are in percentages (0-100)
 */
export function getDefaultFieldSize(type: FieldType): { width: number; height: number } {
  return FIELD_CONFIG.DEFAULT_SIZES[type] || { width: 20, height: 4 }
}

/**
 * Snap field position to grid
 * Helps with field alignment during drag-drop
 *
 * @param field - Field position
 * @param gridSize - Grid size in percentage (default: 0.5%)
 * @returns Snapped position
 */
export function snapToGrid(field: FieldPosition, gridSize?: number): FieldPosition {
  const grid = gridSize ?? FIELD_CONFIG.GRID_SNAP_SIZE

  return {
    x: Math.round(field.x / grid) * grid,
    y: Math.round(field.y / grid) * grid,
    width: Math.round(field.width / grid) * grid,
    height: Math.round(field.height / grid) * grid,
    page: field.page,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the bounding box of multiple fields
 */
export function getBoundingBox(
  fields: FieldPosition[]
): Omit<FieldPosition, 'page'> & { page?: number } | null {
  if (fields.length === 0) return null

  const firstField = fields[0]
  if (!firstField) return null

  const samePageFields = fields.filter((f) => f.page === firstField.page)
  if (samePageFields.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const field of samePageFields) {
    minX = Math.min(minX, field.x)
    minY = Math.min(minY, field.y)
    maxX = Math.max(maxX, field.x + field.width)
    maxY = Math.max(maxY, field.y + field.height)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    page: firstField.page,
  }
}

/**
 * Center a field within the page
 */
export function centerField(
  field: Omit<FieldPosition, 'page'>,
  horizontal = true,
  vertical = true
): Omit<FieldPosition, 'page'> {
  return {
    x: horizontal ? (100 - field.width) / 2 : field.x,
    y: vertical ? (100 - field.height) / 2 : field.y,
    width: field.width,
    height: field.height,
  }
}

/**
 * Distribute fields evenly (horizontal or vertical)
 */
export function distributeFields(
  fields: FieldPosition[],
  direction: 'horizontal' | 'vertical' = 'horizontal'
): FieldPosition[] {
  if (fields.length < 3) return fields

  const sorted = [...fields].sort((a, b) =>
    direction === 'horizontal' ? a.x - b.x : a.y - b.y
  )

  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  if (!first || !last) return fields

  const totalSpace =
    direction === 'horizontal'
      ? last.x + last.width - first.x
      : last.y + last.height - first.y

  const totalFieldSize = sorted.reduce(
    (sum, f) => sum + (direction === 'horizontal' ? f.width : f.height),
    0
  )

  const gap = (totalSpace - totalFieldSize) / (sorted.length - 1)

  let currentPos = direction === 'horizontal' ? first.x : first.y

  return sorted.map((field) => {
    const newField = {
      ...field,
      [direction === 'horizontal' ? 'x' : 'y']: currentPos,
    }
    currentPos += (direction === 'horizontal' ? field.width : field.height) + gap
    return newField
  })
}

/**
 * Align fields to a common edge
 */
export function alignFields(
  fields: FieldPosition[],
  alignment: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY'
): FieldPosition[] {
  if (fields.length === 0) return fields

  let alignValue: number

  switch (alignment) {
    case 'left':
      alignValue = Math.min(...fields.map((f) => f.x))
      return fields.map((f) => ({ ...f, x: alignValue }))
    case 'right':
      alignValue = Math.max(...fields.map((f) => f.x + f.width))
      return fields.map((f) => ({ ...f, x: alignValue - f.width }))
    case 'top':
      alignValue = Math.min(...fields.map((f) => f.y))
      return fields.map((f) => ({ ...f, y: alignValue }))
    case 'bottom':
      alignValue = Math.max(...fields.map((f) => f.y + f.height))
      return fields.map((f) => ({ ...f, y: alignValue - f.height }))
    case 'centerX':
      alignValue = fields.reduce((sum, f) => sum + f.x + f.width / 2, 0) / fields.length
      return fields.map((f) => ({ ...f, x: alignValue - f.width / 2 }))
    case 'centerY':
      alignValue = fields.reduce((sum, f) => sum + f.y + f.height / 2, 0) / fields.length
      return fields.map((f) => ({ ...f, y: alignValue - f.height / 2 }))
    default:
      return fields
  }
}

/**
 * Calculate the center point of a field
 */
export function getFieldCenter(field: Omit<FieldPosition, 'page'>): { x: number; y: number } {
  return {
    x: field.x + field.width / 2,
    y: field.y + field.height / 2,
  }
}

/**
 * Calculate distance between two field centers
 */
export function getFieldDistance(field1: FieldPosition, field2: FieldPosition): number {
  if (field1.page !== field2.page) return Infinity

  const center1 = getFieldCenter(field1)
  const center2 = getFieldCenter(field2)

  return Math.sqrt(Math.pow(center2.x - center1.x, 2) + Math.pow(center2.y - center1.y, 2))
}
