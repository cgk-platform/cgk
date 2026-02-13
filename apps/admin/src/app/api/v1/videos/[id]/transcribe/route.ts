/**
 * POST /api/v1/videos/[id]/transcribe
 *
 * Manually trigger transcription for a video
 * Can be used to retry failed transcriptions
 *
 * @ai-pattern tenant-isolation
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { withTenant, sql } from '@cgk-platform/db'
import { sendJob } from '@cgk-platform/jobs'
import { resetTranscription } from '@cgk-platform/video'

interface VideoRow {
  id: string
  mux_playback_id: string | null
  status: string
  transcription_status: string | null
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Get video and validate it can be transcribed
  const video = await withTenant(tenantSlug, async () => {
    const result = await sql<VideoRow>`
      SELECT id, mux_playback_id, status, transcription_status
      FROM videos
      WHERE id = ${videoId}
    `
    return result.rows[0] || null
  })

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  if (video.status !== 'ready') {
    return NextResponse.json(
      { error: 'Video is not ready for transcription' },
      { status: 400 }
    )
  }

  if (!video.mux_playback_id) {
    return NextResponse.json(
      { error: 'Video does not have a playback ID' },
      { status: 400 }
    )
  }

  if (video.transcription_status === 'processing') {
    return NextResponse.json(
      { error: 'Transcription already in progress' },
      { status: 400 }
    )
  }

  // Reset transcription state if retrying
  if (video.transcription_status === 'failed' || video.transcription_status === 'completed') {
    await resetTranscription(tenantSlug, videoId)
  }

  // Queue transcription job
  await sendJob('video.transcriptionStarted', {
    tenantId: tenantSlug,
    videoId,
  })

  // Update status to processing
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE videos
      SET transcription_status = 'processing', updated_at = NOW()
      WHERE id = ${videoId}
    `
  })

  return NextResponse.json({
    success: true,
    message: 'Transcription started',
    videoId,
  })
}
