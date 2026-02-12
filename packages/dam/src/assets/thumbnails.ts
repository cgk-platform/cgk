/**
 * Thumbnail Generation
 * Creates thumbnails for uploaded assets
 */

import type { AssetType } from '../types.js'

export interface ThumbnailOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'jpeg' | 'webp' | 'png'
}

export interface ThumbnailResult {
  buffer: Buffer
  contentType: string
  width: number
  height: number
}

const DEFAULT_THUMBNAIL_OPTIONS: Required<ThumbnailOptions> = {
  width: 400,
  height: 400,
  quality: 80,
  format: 'webp',
}

/**
 * Generate thumbnail for an image
 */
export async function generateImageThumbnail(
  buffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult | null> {
  const sharp = await import('sharp').catch(() => null)

  if (!sharp) {
    console.warn('Sharp not available, skipping thumbnail generation')
    return null
  }

  const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options }

  try {
    const image = sharp.default(buffer)

    // Resize maintaining aspect ratio, fitting within bounds
    const resized = image.resize(opts.width, opts.height, {
      fit: 'inside',
      withoutEnlargement: true,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let output: any
    let contentType: string

    switch (opts.format) {
      case 'jpeg':
        output = resized.jpeg({ quality: opts.quality })
        contentType = 'image/jpeg'
        break
      case 'png':
        output = resized.png({ quality: opts.quality })
        contentType = 'image/png'
        break
      case 'webp':
      default:
        output = resized.webp({ quality: opts.quality })
        contentType = 'image/webp'
        break
    }

    const outputBuffer = await output.toBuffer()
    const outputMetadata = await sharp.default(outputBuffer).metadata()

    return {
      buffer: outputBuffer,
      contentType,
      width: outputMetadata.width || opts.width,
      height: outputMetadata.height || opts.height,
    }
  } catch (error) {
    console.error('Failed to generate image thumbnail:', error)
    return null
  }
}

/**
 * Generate a placeholder thumbnail for videos
 * Note: Full video thumbnail extraction requires ffmpeg
 * This creates a placeholder image with video icon
 */
export async function generateVideoPlaceholder(
  _buffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult | null> {
  const sharp = await import('sharp').catch(() => null)

  if (!sharp) {
    return null
  }

  const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options }

  try {
    // Create a gradient placeholder with play icon
    const svg = `
      <svg width="${opts.width}" height="${opts.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1e293b"/>
            <stop offset="100%" style="stop-color:#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <circle cx="${opts.width / 2}" cy="${opts.height / 2}" r="40" fill="rgba(255,255,255,0.1)"/>
        <polygon points="${opts.width / 2 - 15},${opts.height / 2 - 20} ${opts.width / 2 - 15},${opts.height / 2 + 20} ${opts.width / 2 + 20},${opts.height / 2}" fill="rgba(255,255,255,0.8)"/>
      </svg>
    `

    const outputBuffer = await sharp.default(Buffer.from(svg))
      .webp({ quality: opts.quality })
      .toBuffer()

    return {
      buffer: outputBuffer,
      contentType: 'image/webp',
      width: opts.width,
      height: opts.height,
    }
  } catch (error) {
    console.error('Failed to generate video placeholder:', error)
    return null
  }
}

/**
 * Generate a placeholder thumbnail for audio files
 */
export async function generateAudioPlaceholder(
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult | null> {
  const sharp = await import('sharp').catch(() => null)

  if (!sharp) {
    return null
  }

  const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options }

  try {
    // Create waveform-style placeholder
    const svg = `
      <svg width="${opts.width}" height="${opts.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#7c3aed"/>
            <stop offset="100%" style="stop-color:#4c1d95"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <g stroke="rgba(255,255,255,0.6)" stroke-width="3" fill="none">
          ${Array.from({ length: 12 }, (_, i) => {
            const x = 50 + i * 25
            const h = 20 + Math.sin(i * 0.8) * 40 + Math.random() * 30
            const y = opts.height / 2 - h / 2
            return `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + h}"/>`
          }).join('')}
        </g>
      </svg>
    `

    const outputBuffer = await sharp.default(Buffer.from(svg))
      .webp({ quality: opts.quality })
      .toBuffer()

    return {
      buffer: outputBuffer,
      contentType: 'image/webp',
      width: opts.width,
      height: opts.height,
    }
  } catch (error) {
    console.error('Failed to generate audio placeholder:', error)
    return null
  }
}

/**
 * Generate a placeholder thumbnail for documents
 */
export async function generateDocumentPlaceholder(
  mimeType: string,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult | null> {
  const sharp = await import('sharp').catch(() => null)

  if (!sharp) {
    return null
  }

  const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options }

  // Determine document type icon/color
  const docStyles: Record<string, { color: string; label: string }> = {
    'application/pdf': { color: '#ef4444', label: 'PDF' },
    'application/msword': { color: '#3b82f6', label: 'DOC' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      color: '#3b82f6',
      label: 'DOCX',
    },
    'application/vnd.ms-excel': { color: '#22c55e', label: 'XLS' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
      color: '#22c55e',
      label: 'XLSX',
    },
    'text/plain': { color: '#6b7280', label: 'TXT' },
    'text/csv': { color: '#22c55e', label: 'CSV' },
  }

  const style = docStyles[mimeType] || { color: '#6b7280', label: 'FILE' }

  try {
    const svg = `
      <svg width="${opts.width}" height="${opts.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <rect x="${opts.width / 2 - 60}" y="${opts.height / 2 - 80}" width="120" height="150" rx="8" fill="white" stroke="#e2e8f0" stroke-width="2"/>
        <rect x="${opts.width / 2 - 60}" y="${opts.height / 2 - 80}" width="120" height="35" rx="8" fill="${style.color}"/>
        <text x="${opts.width / 2}" y="${opts.height / 2 - 55}" text-anchor="middle" fill="white" font-family="system-ui" font-size="16" font-weight="bold">${style.label}</text>
        <rect x="${opts.width / 2 - 40}" y="${opts.height / 2 - 25}" width="80" height="8" rx="2" fill="#e2e8f0"/>
        <rect x="${opts.width / 2 - 40}" y="${opts.height / 2 - 5}" width="60" height="8" rx="2" fill="#e2e8f0"/>
        <rect x="${opts.width / 2 - 40}" y="${opts.height / 2 + 15}" width="70" height="8" rx="2" fill="#e2e8f0"/>
        <rect x="${opts.width / 2 - 40}" y="${opts.height / 2 + 35}" width="50" height="8" rx="2" fill="#e2e8f0"/>
      </svg>
    `

    const outputBuffer = await sharp.default(Buffer.from(svg))
      .webp({ quality: opts.quality })
      .toBuffer()

    return {
      buffer: outputBuffer,
      contentType: 'image/webp',
      width: opts.width,
      height: opts.height,
    }
  } catch (error) {
    console.error('Failed to generate document placeholder:', error)
    return null
  }
}

/**
 * Main thumbnail generation function
 * Routes to appropriate generator based on asset type
 */
export async function generateThumbnail(
  buffer: Buffer,
  assetType: AssetType,
  mimeType: string,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult | null> {
  switch (assetType) {
    case 'image':
      return generateImageThumbnail(buffer, options)
    case 'video':
      return generateVideoPlaceholder(buffer, options)
    case 'audio':
      return generateAudioPlaceholder(options)
    case 'document':
      return generateDocumentPlaceholder(mimeType, options)
    default:
      return null
  }
}

/**
 * Generate multiple thumbnail sizes
 */
export async function generateThumbnailSizes(
  buffer: Buffer,
  assetType: AssetType,
  mimeType: string
): Promise<Map<string, ThumbnailResult>> {
  const sizes = [
    { name: 'small', width: 150, height: 150 },
    { name: 'medium', width: 400, height: 400 },
    { name: 'large', width: 800, height: 800 },
  ]

  const results = new Map<string, ThumbnailResult>()

  for (const size of sizes) {
    const thumb = await generateThumbnail(buffer, assetType, mimeType, {
      width: size.width,
      height: size.height,
    })
    if (thumb) {
      results.set(size.name, thumb)
    }
  }

  return results
}
