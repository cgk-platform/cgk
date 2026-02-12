/**
 * File Upload Helper Functions (Client-safe)
 *
 * Constants and utilities for file validation that can be used
 * in both client and server components.
 */

/**
 * Maximum file size (100MB)
 */
export const MAX_FILE_SIZE = 100 * 1024 * 1024

/**
 * Allowed file types for project deliverables
 */
export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  video: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  audio: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/aac'],
  archive: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
}

/**
 * All allowed MIME types flattened
 */
export const ALL_ALLOWED_TYPES = Object.values(ALLOWED_FILE_TYPES).flat()

/**
 * Get file type category from MIME type
 */
export function getFileCategory(contentType: string): keyof typeof ALLOWED_FILE_TYPES | 'unknown' {
  for (const [category, types] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (types.includes(contentType)) {
      return category as keyof typeof ALLOWED_FILE_TYPES
    }
  }
  return 'unknown'
}

/**
 * Validate file for upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` }
  }

  if (!ALL_ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` }
  }

  return { valid: true }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Get file extension from name
 */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

/**
 * Get appropriate icon name for file type
 */
export function getFileIcon(contentType: string): string {
  const category = getFileCategory(contentType)

  const icons: Record<string, string> = {
    video: 'video',
    image: 'image',
    document: 'file-text',
    audio: 'music',
    archive: 'archive',
    unknown: 'file',
  }

  return icons[category] || 'file'
}
