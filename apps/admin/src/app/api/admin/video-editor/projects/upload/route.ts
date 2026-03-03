export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/video-editor/projects/upload
 *
 * Accepts multipart file uploads (renders, voiceovers, music) from the
 * openCLAW agent and stores them in Vercel Blob. Updates the project
 * record with the public URL. For render uploads, also creates a
 * render record in video_editor_renders.
 *
 * Auth: tenant API key (agent calls) or session auth (UI calls).
 */

import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { sql, withTenant } from '@cgk-platform/db'

import { validateTenantApiKey } from '@/lib/api-key-auth'
import { createRenderRecord } from '@cgk-platform/video-editor/server'
import { logger } from '@cgk-platform/logging'

const VALID_TYPES = ['render', 'voiceover', 'music'] as const
type UploadType = (typeof VALID_TYPES)[number]

const ALLOWED_CONTENT_TYPES: Record<UploadType, string[]> = {
  render: ['video/mp4', 'video/webm', 'video/quicktime'],
  voiceover: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/ogg'],
  music: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/ogg'],
}

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

  const projectId = formData.get('projectId') as string | null
  const type = formData.get('type') as string | null
  const file = formData.get('file') as File | null

  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }
  if (!type || !VALID_TYPES.includes(type as UploadType)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    )
  }
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }

  // 500 MB file size limit
  const MAX_FILE_SIZE = 500 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB` },
      { status: 413 }
    )
  }

  const uploadType = type as UploadType
  const allowedTypes = ALLOWED_CONTENT_TYPES[uploadType]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      {
        error: `Invalid content type ${file.type} for ${uploadType}. Allowed: ${allowedTypes.join(', ')}`,
      },
      { status: 400 }
    )
  }

  const { tenantSlug } = auth

  // Verify project exists
  const projectExists = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id FROM video_editor_projects
      WHERE id = ${projectId} AND tenant_id = ${tenantSlug}
    `
    return result.rows.length > 0
  })

  if (!projectExists) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() ?? 'bin'
    const timestamp = Date.now()
    const blobPath = `video-editor/${tenantSlug}/${projectId}/${uploadType}-${timestamp}.${ext}`

    const blob = await put(blobPath, buffer, {
      access: 'public',
      contentType: file.type,
    })

    // Update the project record with the blob URL
    await withTenant(tenantSlug, async () => {
      if (uploadType === 'render') {
        await sql`
          UPDATE video_editor_projects SET render_url = ${blob.url}
          WHERE id = ${projectId} AND tenant_id = ${tenantSlug}
        `
      } else if (uploadType === 'voiceover') {
        await sql`
          UPDATE video_editor_projects SET voiceover_url = ${blob.url}
          WHERE id = ${projectId} AND tenant_id = ${tenantSlug}
        `
      } else if (uploadType === 'music') {
        await sql`
          UPDATE video_editor_projects SET music_url = ${blob.url}
          WHERE id = ${projectId} AND tenant_id = ${tenantSlug}
        `
      }
    })

    // For render uploads, also create a render record
    if (uploadType === 'render') {
      await createRenderRecord(tenantSlug, {
        projectId,
        renderUrl: blob.url,
        fileSizeBytes: buffer.byteLength,
      })
    }

    return NextResponse.json({
      blobUrl: blob.url,
      type: uploadType,
      projectId,
    })
  } catch (error) {
    logger.error('Video editor upload error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
