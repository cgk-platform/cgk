export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/dam/clips/upload
 *
 * Accepts a video/audio file via multipart form data, streams it to
 * Vercel Blob, and returns the public URL. Does NOT create a dam_assets
 * record — that's done via the ingest endpoint with the real Blob URL.
 *
 * Auth: tenant API key (same as video-editor upload).
 */

import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

import { validateTenantApiKey } from '@/lib/api-key-auth'
import { logger } from '@cgk-platform/logging'

const ALLOWED_CONTENT_PREFIXES = ['video/', 'audio/']
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB

export async function POST(request: Request) {
  const auth = await validateTenantApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const filenameOverride = formData.get('filename') as string | null

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB` },
      { status: 413 }
    )
  }

  if (!ALLOWED_CONTENT_PREFIXES.some((p) => file.type.startsWith(p))) {
    return NextResponse.json(
      { error: `Invalid content type ${file.type}. Allowed: video/*, audio/*` },
      { status: 400 }
    )
  }

  const { tenantSlug } = auth

  try {
    const originalName = (filenameOverride || file.name || 'clip.mp4').replace(/\.\./g, '')
    // Sanitize filename: keep alphanumeric, hyphens, underscores, dots
    const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-{2,}/g, '-')
    const timestamp = Date.now()
    const blobPath = `dam/${tenantSlug}/clips/${timestamp}-${sanitized}`

    const blob = await put(blobPath, file.stream(), {
      access: 'public',
      contentType: file.type,
    })

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      contentType: file.type,
    })
  } catch (error) {
    logger.error(
      'DAM clip upload error:',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
