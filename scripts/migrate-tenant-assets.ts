#!/usr/bin/env tsx
/**
 * Migrate Tenant Assets to Vercel Blob Storage
 *
 * This script uploads tenant assets from a local directory to their
 * own Vercel Blob Storage account. Each tenant manages their own
 * Blob Storage instance - this ensures WordPress-style self-hosted architecture.
 *
 * Usage:
 *   npx tsx scripts/migrate-tenant-assets.ts ./assets/meliusly [BLOB_TOKEN]
 *   npx tsx scripts/migrate-tenant-assets.ts ./assets/meliusly [BLOB_TOKEN] --dry-run
 *
 * Arguments:
 *   SOURCE_DIR  - Directory containing assets to upload
 *   BLOB_TOKEN  - Vercel Blob Storage read-write token (or set BLOB_READ_WRITE_TOKEN env var)
 *   --dry-run   - Preview what would be uploaded without actually uploading
 *
 * Environment Variables:
 *   BLOB_READ_WRITE_TOKEN - Default blob token if not provided as argument
 *
 * Examples:
 *   # Upload all assets from local directory
 *   npx tsx scripts/migrate-tenant-assets.ts ./assets/meliusly vercel_blob_rw_abc123
 *
 *   # Preview what would be uploaded
 *   npx tsx scripts/migrate-tenant-assets.ts ./assets/meliusly --dry-run
 *
 *   # Use environment variable for token
 *   export BLOB_READ_WRITE_TOKEN=vercel_blob_rw_abc123
 *   npx tsx scripts/migrate-tenant-assets.ts ./assets/meliusly
 */

import { readdir, stat, readFile } from 'fs/promises'
import { join, relative, sep } from 'path'
import { put } from '@vercel/blob'

interface UploadResult {
  localPath: string
  blobPath: string
  url: string
  size: number
}

interface UploadStats {
  totalFiles: number
  totalBytes: number
  uploadedFiles: number
  uploadedBytes: number
  failedFiles: number
  skippedFiles: number
}

/**
 * Get all files recursively from a directory
 */
async function getAllFiles(dirPath: string): Promise<string[]> {
  const files: string[] = []
  const items = await readdir(dirPath)

  for (const item of items) {
    const itemPath = join(dirPath, item)
    const itemStat = await stat(itemPath)

    if (itemStat.isDirectory()) {
      const subFiles = await getAllFiles(itemPath)
      files.push(...subFiles)
    } else {
      files.push(itemPath)
    }
  }

  return files
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',

    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',

    // Fonts
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
    eot: 'application/vnd.ms-fontobject',

    // Documents
    pdf: 'application/pdf',
    json: 'application/json',
    xml: 'application/xml',

    // Text
    txt: 'text/plain',
    css: 'text/css',
    html: 'text/html',
    js: 'text/javascript',
    md: 'text/markdown',
  }

  return mimeTypes[ext || ''] || 'application/octet-stream'
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Upload a single file to Vercel Blob Storage
 */
async function uploadFile(
  filePath: string,
  blobPath: string,
  token: string,
  dryRun: boolean
): Promise<UploadResult> {
  const fileContent = await readFile(filePath)
  const fileSize = fileContent.length

  if (dryRun) {
    return {
      localPath: filePath,
      blobPath,
      url: `https://[blob-storage]/${blobPath}`,
      size: fileSize,
    }
  }

  const result = await put(blobPath, fileContent, {
    access: 'public',
    token,
    contentType: getMimeType(filePath),
  })

  return {
    localPath: filePath,
    blobPath,
    url: result.url,
    size: fileSize,
  }
}

/**
 * Main migration function
 */
async function migrateAssets() {
  const args = process.argv.slice(2)

  // Parse arguments
  let sourceDir: string | undefined
  let blobToken: string | undefined
  let dryRun = false

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true
    } else if (!sourceDir) {
      sourceDir = arg
    } else if (!blobToken) {
      blobToken = arg
    }
  }

  // Validate source directory
  if (!sourceDir) {
    console.error('Error: Source directory is required\n')
    console.error('Usage:')
    console.error(
      '  npx tsx scripts/migrate-tenant-assets.ts <SOURCE_DIR> [BLOB_TOKEN] [--dry-run]\n'
    )
    console.error('Examples:')
    console.error('  npx tsx scripts/migrate-tenant-assets.ts ./assets/meliusly')
    console.error(
      '  npx tsx scripts/migrate-tenant-assets.ts ./assets/meliusly vercel_blob_rw_abc123'
    )
    console.error('  npx tsx scripts/migrate-tenant-assets.ts ./assets/meliusly --dry-run')
    process.exit(1)
  }

  // Get blob token from argument or environment
  const token = blobToken || process.env.BLOB_READ_WRITE_TOKEN

  if (!token && !dryRun) {
    console.error('Error: BLOB_READ_WRITE_TOKEN is required\n')
    console.error('Either:')
    console.error('  1. Pass as argument: npx tsx scripts/migrate-tenant-assets.ts <DIR> <TOKEN>')
    console.error('  2. Set environment variable: export BLOB_READ_WRITE_TOKEN=your_token')
    console.error('  3. Use --dry-run to preview without uploading')
    process.exit(1)
  }

  // Verify source directory exists
  try {
    const dirStat = await stat(sourceDir)
    if (!dirStat.isDirectory()) {
      console.error(`Error: ${sourceDir} is not a directory`)
      process.exit(1)
    }
  } catch (error) {
    console.error(`Error: Source directory "${sourceDir}" not found`)
    process.exit(1)
  }

  console.log('=== Tenant Asset Migration ===\n')
  console.log(`Source Directory: ${sourceDir}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN (preview only)' : 'UPLOAD'}`)
  console.log('')

  // Get all files
  console.log('Scanning files...\n')
  const files = await getAllFiles(sourceDir)

  if (files.length === 0) {
    console.log('No files found to upload.')
    process.exit(0)
  }

  console.log(`Found ${files.length} files to upload\n`)

  // Initialize stats
  const stats: UploadStats = {
    totalFiles: files.length,
    totalBytes: 0,
    uploadedFiles: 0,
    uploadedBytes: 0,
    failedFiles: 0,
    skippedFiles: 0,
  }

  const results: UploadResult[] = []

  // Upload files
  console.log('Uploading files...\n')

  for (const filePath of files) {
    try {
      // Calculate relative path from source directory
      const relativePath = relative(sourceDir, filePath)
      // Normalize path separators to forward slashes for blob storage
      const blobPath = relativePath.split(sep).join('/')

      const fileSize = (await stat(filePath)).size
      stats.totalBytes += fileSize

      console.log(`  ${dryRun ? '[DRY RUN]' : 'Uploading'} ${blobPath} (${formatBytes(fileSize)})`)

      const result = await uploadFile(filePath, blobPath, token || '', dryRun)

      results.push(result)
      stats.uploadedFiles++
      stats.uploadedBytes += fileSize

      if (!dryRun) {
        console.log(`    → ${result.url}`)
      }
    } catch (error) {
      stats.failedFiles++
      console.error(`    ✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Print summary
  console.log('\n=== Migration Summary ===\n')
  console.log(`Total Files:     ${stats.totalFiles}`)
  console.log(`Total Size:      ${formatBytes(stats.totalBytes)}`)
  console.log(`Uploaded:        ${stats.uploadedFiles} files (${formatBytes(stats.uploadedBytes)})`)
  if (stats.failedFiles > 0) {
    console.log(`Failed:          ${stats.failedFiles} files`)
  }

  if (dryRun) {
    console.log('\nThis was a dry run. No files were actually uploaded.')
    console.log('Remove --dry-run flag to perform the actual upload.')
  } else {
    console.log('\nMigration complete!')
    console.log('\nNext steps:')
    console.log('1. Get your Blob Storage base URL from Vercel dashboard')
    console.log('2. Add to your .env.local file:')
    console.log('   NEXT_PUBLIC_ASSET_BASE_URL=https://[your-blob-url]')
    console.log('3. Use assets in code:')
    console.log('   import { getAssetUrl } from "@/lib/assets"')
    console.log('   const url = await getAssetUrl(tenantSlug, "images/logo.png")')
  }

  if (stats.failedFiles > 0) {
    process.exit(1)
  }

  process.exit(0)
}

// Run migration
migrateAssets().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
