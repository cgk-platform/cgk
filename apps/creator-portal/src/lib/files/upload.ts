/**
 * File Upload Library for Creator Projects
 *
 * Handles file uploads to Vercel Blob storage with proper tenant isolation.
 */

import { put, del, head } from '@vercel/blob'
import { nanoid } from 'nanoid'

import { addProjectFile, deleteProjectFile } from '../projects'

export interface UploadResult {
  id: string
  url: string
  name: string
  originalName: string
  sizeBytes: number
  contentType: string
}

export interface UploadOptions {
  isDeliverable?: boolean
  notes?: string
}

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
 * Generate a unique storage path for a file
 */
export function generateStoragePath(
  tenantSlug: string,
  projectId: string,
  originalName: string
): string {
  const uniqueId = nanoid(12)
  const safeName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 100)

  return `tenants/${tenantSlug}/projects/${projectId}/${uniqueId}_${safeName}`
}

/**
 * Upload a file to Vercel Blob storage and create database record
 */
export async function uploadProjectFile(
  tenantSlug: string,
  projectId: string,
  creatorId: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  // Validate file
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Generate storage path
  const storagePath = generateStoragePath(tenantSlug, projectId, file.name)

  // Upload to Vercel Blob
  const blob = await put(storagePath, file, {
    access: 'public',
    contentType: file.type,
    addRandomSuffix: false,
  })

  // Create database record
  const projectFile = await addProjectFile(tenantSlug, projectId, creatorId, {
    name: storagePath.split('/').pop() || file.name,
    originalName: file.name,
    url: blob.url,
    sizeBytes: file.size,
    contentType: file.type,
    isDeliverable: options.isDeliverable ?? true,
    notes: options.notes,
  })

  return {
    id: projectFile.id,
    url: projectFile.url,
    name: projectFile.name,
    originalName: projectFile.originalName,
    sizeBytes: projectFile.sizeBytes,
    contentType: projectFile.contentType,
  }
}

/**
 * Upload a file from a Buffer (server-side)
 */
export async function uploadProjectFileFromBuffer(
  tenantSlug: string,
  projectId: string,
  creatorId: string,
  buffer: Buffer,
  fileName: string,
  contentType: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  // Validate size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  // Validate type
  if (!ALL_ALLOWED_TYPES.includes(contentType)) {
    throw new Error(`File type ${contentType} is not allowed`)
  }

  // Generate storage path
  const storagePath = generateStoragePath(tenantSlug, projectId, fileName)

  // Upload to Vercel Blob
  const blob = await put(storagePath, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  })

  // Create database record
  const projectFile = await addProjectFile(tenantSlug, projectId, creatorId, {
    name: storagePath.split('/').pop() || fileName,
    originalName: fileName,
    url: blob.url,
    sizeBytes: buffer.length,
    contentType,
    isDeliverable: options.isDeliverable ?? true,
    notes: options.notes,
  })

  return {
    id: projectFile.id,
    url: projectFile.url,
    name: projectFile.name,
    originalName: projectFile.originalName,
    sizeBytes: projectFile.sizeBytes,
    contentType: projectFile.contentType,
  }
}

/**
 * Delete a file from storage and database
 */
export async function removeProjectFile(
  tenantSlug: string,
  fileId: string,
  fileUrl: string,
  creatorId: string
): Promise<void> {
  // Delete from database first
  await deleteProjectFile(tenantSlug, fileId, creatorId)

  // Then delete from blob storage
  try {
    await del(fileUrl)
  } catch (error) {
    // Log but don't fail if blob deletion fails
    console.error('Failed to delete blob:', error)
  }
}

/**
 * Check if a file exists in blob storage
 */
export async function fileExists(url: string): Promise<boolean> {
  try {
    await head(url)
    return true
  } catch {
    return false
  }
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
