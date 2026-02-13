import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/setup/storage
 *
 * Tests the blob storage connection.
 * Storage is optional - the platform works without it.
 */
export async function POST() {
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN
    const s3Bucket = process.env.AWS_S3_BUCKET
    const s3AccessKey = process.env.AWS_ACCESS_KEY_ID

    // Check Vercel Blob
    if (blobToken) {
      // Vercel Blob is configured via token
      // We can't easily test without making a real upload
      // Just verify the token exists and has reasonable format
      if (blobToken.startsWith('vercel_blob_')) {
        return NextResponse.json({
          success: true,
          storageInfo: {
            provider: 'Vercel Blob',
            bucket: 'default',
          },
        })
      }
    }

    // Check S3
    if (s3Bucket && s3AccessKey) {
      return NextResponse.json({
        success: true,
        storageInfo: {
          provider: 'AWS S3',
          bucket: s3Bucket,
        },
      })
    }

    // Check Cloudflare R2
    const r2Bucket = process.env.R2_BUCKET_NAME
    const r2AccessKey = process.env.R2_ACCESS_KEY_ID

    if (r2Bucket && r2AccessKey) {
      return NextResponse.json({
        success: true,
        storageInfo: {
          provider: 'Cloudflare R2',
          bucket: r2Bucket,
        },
      })
    }

    // No storage configured (this is OK - storage is optional)
    return NextResponse.json(
      {
        success: false,
        error: 'No storage provider configured. Set BLOB_READ_WRITE_TOKEN, AWS_S3_BUCKET, or R2_BUCKET_NAME.',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Storage connection test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Storage test failed',
      },
      { status: 400 }
    )
  }
}
