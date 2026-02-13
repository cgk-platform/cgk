/**
 * E-Sign Signature Storage
 * Manages signature capture and storage
 */

import { sql, withTenant } from '@cgk-platform/db'
import { nanoid } from 'nanoid'
import type { EsignSignature, CreateSignatureInput } from '../types.js'

// ============================================================================
// SIGNATURE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new signature record
 */
export async function createSignature(
  tenantSlug: string,
  input: CreateSignatureInput
): Promise<EsignSignature> {
  const id = `sig_${nanoid(12)}`

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO esign_signatures (
        id, signer_id, type, image_url, font_name
      ) VALUES (
        ${id},
        ${input.signer_id},
        ${input.type},
        ${input.image_url},
        ${input.font_name || null}
      )
      RETURNING *
    `

    return result.rows[0] as EsignSignature
  })
}

/**
 * Get signature by ID
 */
export async function getSignature(
  tenantSlug: string,
  id: string
): Promise<EsignSignature | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_signatures WHERE id = ${id}
    `

    return (result.rows[0] as EsignSignature) || null
  })
}

/**
 * Get signature by signer ID
 */
export async function getSignerSignature(
  tenantSlug: string,
  signerId: string
): Promise<EsignSignature | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_signatures
      WHERE signer_id = ${signerId}
      ORDER BY created_at DESC
      LIMIT 1
    `

    return (result.rows[0] as EsignSignature) || null
  })
}

/**
 * Get all signatures for a signer
 */
export async function getSignerSignatures(
  tenantSlug: string,
  signerId: string
): Promise<EsignSignature[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_signatures
      WHERE signer_id = ${signerId}
      ORDER BY created_at DESC
    `

    return result.rows as EsignSignature[]
  })
}

/**
 * Delete a signature
 */
export async function deleteSignature(
  tenantSlug: string,
  id: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM esign_signatures WHERE id = ${id}
    `
    return result.rowCount !== null && result.rowCount > 0
  })
}

/**
 * Update signature image
 */
export async function updateSignatureImage(
  tenantSlug: string,
  id: string,
  imageUrl: string
): Promise<EsignSignature | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_signatures
      SET image_url = ${imageUrl}
      WHERE id = ${id}
      RETURNING *
    `

    return (result.rows[0] as EsignSignature) || null
  })
}

// ============================================================================
// SIGNATURE VALIDATION
// ============================================================================

/**
 * Check if signer has a signature on file
 */
export async function hasSignature(
  tenantSlug: string,
  signerId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT 1 FROM esign_signatures
      WHERE signer_id = ${signerId}
      LIMIT 1
    `
    return result.rows.length > 0
  })
}

/**
 * Check if signature is drawn (has image data)
 */
export function isDrawnSignature(signature: EsignSignature): boolean {
  return signature.type === 'drawn' && signature.image_url.startsWith('data:image')
}

/**
 * Check if signature is typed
 */
export function isTypedSignature(signature: EsignSignature): boolean {
  return signature.type === 'typed' && signature.font_name !== null
}

// ============================================================================
// SIGNATURE IMAGE UTILITIES
// ============================================================================

/**
 * Validate base64 signature image
 */
export function validateSignatureImage(dataUrl: string): {
  valid: boolean
  error?: string
} {
  if (!dataUrl.startsWith('data:image/')) {
    return { valid: false, error: 'Invalid image format' }
  }

  const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!matches) {
    return { valid: false, error: 'Invalid base64 format' }
  }

  const format = matches[1]
  const data = matches[2]
  if (!format || !data) {
    return { valid: false, error: 'Invalid base64 format' }
  }

  const allowedFormats = ['png', 'jpeg', 'webp']
  if (!allowedFormats.includes(format)) {
    return { valid: false, error: `Image format must be one of: ${allowedFormats.join(', ')}` }
  }

  // Check approximate size (base64 is ~33% larger than binary)
  const sizeInBytes = (data.length * 3) / 4
  const maxSizeMB = 2
  if (sizeInBytes > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `Image must be smaller than ${maxSizeMB}MB` }
  }

  return { valid: true }
}

/**
 * Extract image dimensions from base64 (for PNG)
 */
export function getSignatureImageInfo(dataUrl: string): {
  format: string
  sizeBytes: number
} | null {
  const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!matches) return null

  const format = matches[1]
  const data = matches[2]
  if (!format || !data) return null

  const sizeBytes = Math.floor((data.length * 3) / 4)

  return { format, sizeBytes }
}

// ============================================================================
// SIGNATURE FONTS
// ============================================================================

export interface SignatureFont {
  name: string
  family: string
}

export const SIGNATURE_FONTS: SignatureFont[] = [
  { name: 'Dancing Script', family: "'Dancing Script', cursive" },
  { name: 'Great Vibes', family: "'Great Vibes', cursive" },
  { name: 'Alex Brush', family: "'Alex Brush', cursive" },
  { name: 'Pacifico', family: "'Pacifico', cursive" },
]

/**
 * Get signature font by name
 */
export function getSignatureFont(name: string): SignatureFont | undefined {
  return SIGNATURE_FONTS.find((f) => f.name === name)
}

/**
 * Check if font name is valid
 */
export function isValidSignatureFont(name: string): boolean {
  return SIGNATURE_FONTS.some((f) => f.name === name)
}

// ============================================================================
// TYPED SIGNATURE RENDERING
// ============================================================================

/**
 * Generate SVG for typed signature
 * Can be converted to image client-side
 */
export function generateTypedSignatureSvg(
  text: string,
  fontFamily: string,
  options: {
    width?: number
    height?: number
    fontSize?: number
    color?: string
  } = {}
): string {
  const {
    width = 400,
    height = 100,
    fontSize = 48,
    color = '#000000',
  } = options

  // Escape HTML entities
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=${fontFamily.split("'")[1]?.replace(/ /g, '+') || 'Dancing+Script'}');
  </style>
  <text
    x="50%"
    y="65%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="${fontFamily}"
    font-size="${fontSize}"
    fill="${color}"
  >${escapedText}</text>
</svg>`
}

/**
 * Convert SVG to data URL
 */
export function svgToDataUrl(svg: string): string {
  const encoded = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${encoded}`
}
