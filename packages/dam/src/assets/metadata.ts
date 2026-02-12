/**
 * Asset Metadata Extraction
 * Extracts metadata from uploaded files (EXIF, dimensions, duration)
 */

import type { AssetType } from '../types.js'

export interface ExtractedMetadata {
  width?: number
  height?: number
  duration_seconds?: number
  exif_data?: Record<string, unknown>
  file_hash?: string
}

export interface ImageDimensions {
  width: number
  height: number
}

/**
 * Extract metadata from an image buffer
 * Uses sharp for image processing
 */
export async function extractImageMetadata(
  buffer: Buffer
): Promise<ExtractedMetadata> {
  // Dynamic import to handle environments where sharp isn't available
  const sharp = await import('sharp').catch(() => null)

  if (!sharp) {
    return {}
  }

  try {
    const image = sharp.default(buffer)
    const metadata = await image.metadata()

    const result: ExtractedMetadata = {
      width: metadata.width,
      height: metadata.height,
    }

    // Extract EXIF data if available
    // Note: exif-reader requires separate installation if EXIF extraction is needed
    if (metadata.exif) {
      try {
        // Store raw EXIF buffer info for now - full parsing requires exif-reader package
        result.exif_data = {
          hasExif: true,
          bufferLength: metadata.exif.length,
        }
      } catch {
        // EXIF parsing failed, continue without it
      }
    }

    return result
  } catch (error) {
    console.error('Failed to extract image metadata:', error)
    return {}
  }
}

/**
 * Extract metadata from a video buffer
 * Note: Full video metadata extraction requires ffprobe
 * This is a simplified version that returns basic info
 */
export async function extractVideoMetadata(
  _buffer: Buffer,
  mimeType: string
): Promise<ExtractedMetadata> {
  // Video metadata extraction typically requires ffprobe
  // For now, return basic info based on the MIME type
  const result: ExtractedMetadata = {}

  // Common video container detection
  const videoFormats: Record<string, { typical_codec: string }> = {
    'video/mp4': { typical_codec: 'H.264' },
    'video/quicktime': { typical_codec: 'ProRes' },
    'video/webm': { typical_codec: 'VP9' },
    'video/x-matroska': { typical_codec: 'H.264/H.265' },
  }

  if (videoFormats[mimeType]) {
    result.exif_data = {
      container: mimeType.split('/')[1],
      likely_codec: videoFormats[mimeType].typical_codec,
    }
  }

  return result
}

/**
 * Extract metadata from an audio buffer
 */
export async function extractAudioMetadata(
  _buffer: Buffer,
  mimeType: string
): Promise<ExtractedMetadata> {
  const result: ExtractedMetadata = {}

  // Basic audio format info
  const audioFormats: Record<string, { format: string }> = {
    'audio/mpeg': { format: 'MP3' },
    'audio/wav': { format: 'WAV' },
    'audio/mp4': { format: 'M4A' },
    'audio/aac': { format: 'AAC' },
    'audio/ogg': { format: 'OGG' },
    'audio/flac': { format: 'FLAC' },
  }

  if (audioFormats[mimeType]) {
    result.exif_data = {
      format: audioFormats[mimeType].format,
    }
  }

  return result
}

/**
 * Extract metadata from a document
 */
export async function extractDocumentMetadata(
  _buffer: Buffer,
  mimeType: string
): Promise<ExtractedMetadata> {
  const result: ExtractedMetadata = {}

  // Basic document type info
  const docTypes: Record<string, { format: string; editable: boolean }> = {
    'application/pdf': { format: 'PDF', editable: false },
    'application/msword': { format: 'Word Document', editable: true },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      format: 'Word Document (DOCX)',
      editable: true,
    },
    'application/vnd.ms-excel': { format: 'Excel Spreadsheet', editable: true },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
      format: 'Excel Spreadsheet (XLSX)',
      editable: true,
    },
    'text/plain': { format: 'Plain Text', editable: true },
    'text/csv': { format: 'CSV', editable: true },
  }

  if (docTypes[mimeType]) {
    result.exif_data = {
      format: docTypes[mimeType].format,
      editable: docTypes[mimeType].editable,
    }
  }

  return result
}

/**
 * Main metadata extraction function
 * Routes to the appropriate extractor based on asset type
 */
export async function extractMetadata(
  buffer: Buffer,
  assetType: AssetType,
  mimeType: string
): Promise<ExtractedMetadata> {
  switch (assetType) {
    case 'image':
      return extractImageMetadata(buffer)
    case 'video':
      return extractVideoMetadata(buffer, mimeType)
    case 'audio':
      return extractAudioMetadata(buffer, mimeType)
    case 'document':
      return extractDocumentMetadata(buffer, mimeType)
    default:
      return {}
  }
}

/**
 * Compute file hash for deduplication
 */
export async function computeFileHash(buffer: Buffer): Promise<string> {
  const crypto = await import('node:crypto')
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Parse dimensions from a string like "1920x1080"
 */
export function parseDimensions(dimensionString: string): ImageDimensions | null {
  const match = dimensionString.match(/^(\d+)x(\d+)$/)
  if (!match || !match[1] || !match[2]) return null

  return {
    width: parseInt(match[1], 10),
    height: parseInt(match[2], 10),
  }
}

/**
 * Calculate aspect ratio
 */
export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(width, height)
  return `${width / divisor}:${height / divisor}`
}

/**
 * Determine quality tier based on dimensions
 */
export function determineQualityTier(
  width: number,
  height: number
): 'sd' | 'hd' | 'fullhd' | '4k' | '8k' {
  const pixels = width * height

  if (pixels >= 33177600) return '8k' // 7680x4320
  if (pixels >= 8294400) return '4k' // 3840x2160
  if (pixels >= 2073600) return 'fullhd' // 1920x1080
  if (pixels >= 921600) return 'hd' // 1280x720
  return 'sd'
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
