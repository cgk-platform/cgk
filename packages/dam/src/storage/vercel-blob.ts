/**
 * Vercel Blob Storage Provider
 * Implementation using @vercel/blob
 */

import { put, del, list, head } from '@vercel/blob'

import type {
  IStorageProvider,
  UploadOptions,
  UploadResult,
  CopyOptions,
  ListOptions,
  ListResult,
} from './interface.js'
import { generateUniqueFilename } from './interface.js'

export interface VercelBlobConfig {
  token?: string
}

/**
 * Vercel Blob storage provider implementation
 */
export class VercelBlobStorage implements IStorageProvider {
  private token: string | undefined

  constructor(config: VercelBlobConfig = {}) {
    this.token = config.token || process.env.BLOB_READ_WRITE_TOKEN
  }

  async upload(file: Buffer | Blob, options: UploadOptions): Promise<UploadResult> {
    const filename = generateUniqueFilename(options.filename)
    const pathname = options.folder ? `${options.folder}/${filename}` : filename

    const blob = await put(pathname, file, {
      access: options.access === 'private' ? 'public' : 'public',
      contentType: options.contentType,
      token: this.token,
      addRandomSuffix: false,
    })

    // Get size - Buffer has length, Blob has size
    const fileSize = Buffer.isBuffer(file) ? file.length : (file as Blob).size

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: fileSize,
    }
  }

  async delete(url: string): Promise<boolean> {
    try {
      await del(url, { token: this.token })
      return true
    } catch (error) {
      console.error('Failed to delete blob:', error)
      return false
    }
  }

  async getSignedUrl(url: string, _expiresIn?: number): Promise<string> {
    // Vercel Blob doesn't support signed URLs in the same way as S3
    // Public blobs are always accessible via their URL
    // For private access, we would need to implement a proxy route
    return url
  }

  async copy(sourceUrl: string, options: CopyOptions): Promise<UploadResult> {
    // Fetch the source file
    const response = await fetch(sourceUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch source file: ${response.statusText}`)
    }

    const blob = await response.blob()
    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    return this.upload(blob, {
      filename: options.destinationFilename,
      contentType,
      folder: options.destinationFolder,
      metadata: options.metadata,
    })
  }

  async list(options: ListOptions = {}): Promise<ListResult> {
    const result = await list({
      prefix: options.prefix,
      limit: options.limit,
      cursor: options.cursor,
      token: this.token,
    })

    return {
      blobs: result.blobs.map((b) => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      })),
      cursor: result.cursor || undefined,
      hasMore: result.hasMore,
    }
  }

  async exists(url: string): Promise<boolean> {
    try {
      const result = await head(url, { token: this.token })
      return !!result
    } catch {
      return false
    }
  }

  async getMetadata(url: string): Promise<{
    size: number
    contentType: string
    uploadedAt: Date
    metadata?: Record<string, string>
  } | null> {
    try {
      const result = await head(url, { token: this.token })
      return {
        size: result.size,
        contentType: result.contentType,
        uploadedAt: result.uploadedAt,
      }
    } catch {
      return null
    }
  }
}

/**
 * Create a Vercel Blob storage provider instance
 */
export function createVercelBlobStorage(config: VercelBlobConfig = {}): IStorageProvider {
  return new VercelBlobStorage(config)
}
