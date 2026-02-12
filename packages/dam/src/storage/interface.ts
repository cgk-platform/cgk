/**
 * Storage Provider Interface
 * Defines the contract for storage backends
 */

export interface UploadOptions {
  filename: string
  contentType: string
  folder?: string
  metadata?: Record<string, string>
  access?: 'public' | 'private'
}

export interface UploadResult {
  url: string
  pathname: string
  contentType: string
  size: number
}

export interface CopyOptions {
  destinationFilename: string
  destinationFolder?: string
  metadata?: Record<string, string>
}

export interface ListOptions {
  prefix?: string
  limit?: number
  cursor?: string
}

export interface ListResult {
  blobs: {
    url: string
    pathname: string
    size: number
    uploadedAt: Date
  }[]
  cursor?: string
  hasMore: boolean
}

/**
 * Storage provider interface
 * Implementations must handle all file operations
 */
export interface IStorageProvider {
  /**
   * Upload a file to storage
   */
  upload(file: Buffer | Blob, options: UploadOptions): Promise<UploadResult>

  /**
   * Delete a file from storage
   */
  delete(url: string): Promise<boolean>

  /**
   * Get a signed URL for temporary access
   */
  getSignedUrl(url: string, expiresIn?: number): Promise<string>

  /**
   * Copy a file to a new location
   */
  copy(sourceUrl: string, options: CopyOptions): Promise<UploadResult>

  /**
   * List files in storage
   */
  list(options?: ListOptions): Promise<ListResult>

  /**
   * Check if a file exists
   */
  exists(url: string): Promise<boolean>

  /**
   * Get file metadata
   */
  getMetadata(url: string): Promise<{
    size: number
    contentType: string
    uploadedAt: Date
    metadata?: Record<string, string>
  } | null>
}

/**
 * Factory function type for creating storage providers
 */
export type StorageProviderFactory = (config: Record<string, unknown>) => IStorageProvider

/**
 * Storage configuration
 */
export interface StorageConfig {
  provider: 'vercel-blob' | 'gdrive' | 's3'
  config: Record<string, unknown>
}

/**
 * Generate a unique filename with timestamp
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = originalFilename.split('.').pop() || ''
  const name = originalFilename.replace(/\.[^/.]+$/, '')
  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50)
  return `${safeName}-${timestamp}-${random}${ext ? `.${ext}` : ''}`
}

/**
 * Generate folder path for tenant assets
 */
export function getTenantAssetPath(tenantId: string, assetType: string): string {
  return `tenants/${tenantId}/assets/${assetType}`
}

/**
 * Generate folder path for tenant thumbnails
 */
export function getTenantThumbnailPath(tenantId: string): string {
  return `tenants/${tenantId}/thumbnails`
}

/**
 * Parse a storage URL to extract components
 */
export function parseStorageUrl(url: string): {
  provider: string
  bucket?: string
  path: string
} | null {
  try {
    const parsed = new URL(url)

    // Vercel Blob URLs
    if (parsed.hostname.includes('vercel-storage.com')) {
      return {
        provider: 'vercel-blob',
        path: parsed.pathname.substring(1),
      }
    }

    // Google Cloud Storage URLs
    if (parsed.hostname.includes('storage.googleapis.com')) {
      const parts = parsed.pathname.split('/')
      return {
        provider: 'gcs',
        bucket: parts[1],
        path: parts.slice(2).join('/'),
      }
    }

    // S3 URLs
    if (parsed.hostname.includes('s3.amazonaws.com') || parsed.hostname.includes('s3.')) {
      const parts = parsed.pathname.split('/')
      return {
        provider: 's3',
        bucket: parsed.hostname.split('.')[0],
        path: parts.slice(1).join('/'),
      }
    }

    return null
  } catch {
    return null
  }
}
