/**
 * POST /api/v1/webhooks/assemblyai
 *
 * Handle AssemblyAI webhook callbacks for transcription completion
 *
 * Payload:
 * - transcript_id: string
 * - status: 'completed' | 'error'
 * - text?: string (if completed)
 * - error?: string (if error)
 *
 * @ai-pattern webhook-handler
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql } from '@cgk-platform/db'
import { sendJob } from '@cgk-platform/jobs'
import {
  verifyAssemblyAIWebhookSignature,
  getTranscriptionProvider,
  saveTranscriptionResult,
  failTranscription,
} from '@cgk-platform/video'

interface AssemblyAIWebhookBody {
  transcript_id: string
  status: 'completed' | 'error'
  text?: string
  error?: string
}

interface VideoWithTenant {
  id: string
  tenant_id: string
  title: string
}

export async function POST(request: Request) {
  // Get raw body for signature verification
  const rawBody = await request.text()

  // Verify webhook signature if secret is configured
  const secret = process.env.ASSEMBLYAI_WEBHOOK_SECRET
  if (secret) {
    const signature = request.headers.get('x-assemblyai-signature')
    if (!signature) {
      console.warn('[assemblyai-webhook] Missing signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const isValid = await verifyAssemblyAIWebhookSignature(rawBody, signature, secret)
    if (!isValid) {
      console.warn('[assemblyai-webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let body: AssemblyAIWebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { transcript_id: jobId, status, error } = body

  if (!jobId || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  console.log('[assemblyai-webhook] Received', { jobId, status })

  // Find video by transcription job ID (query public schema to find tenant)
  // Note: In production, you might want to encode tenantId in webhook URL or metadata
  const videoResult = await sql<VideoWithTenant>`
    SELECT v.id, v.tenant_id, v.title
    FROM public.organizations o
    CROSS JOIN LATERAL (
      SELECT id, tenant_id, title
      FROM tenant_schema_search(o.slug, 'videos', 'transcription_job_id', ${jobId})
    ) v
    WHERE v.id IS NOT NULL
    LIMIT 1
  `.catch(() => ({ rows: [] }))

  // Fallback: Try direct query if cross-schema search not available
  let video: VideoWithTenant | null = videoResult.rows[0] || null

  if (!video) {
    // Try simpler approach - search known tenant schemas
    // In a real implementation, you'd want to pass tenantId in webhook URL
    console.warn('[assemblyai-webhook] Could not find video for job', { jobId })

    // Return success to prevent retries - we'll rely on sync job
    return NextResponse.json({
      success: true,
      message: 'Video not found, will be processed by sync job',
    })
  }

  const tenantId = video.tenant_id
  const videoId = video.id

  if (status === 'completed') {
    try {
      // Fetch full transcription result
      const provider = getTranscriptionProvider()
      const result = await provider.getResult(jobId)

      // Save to database
      await saveTranscriptionResult(
        tenantId,
        videoId,
        result.text,
        result.words,
        result.chapters
      )

      console.log('[assemblyai-webhook] Transcription saved', {
        tenantId,
        videoId,
        wordCount: result.words.length,
        chapterCount: result.chapters?.length ?? 0,
      })

      // Trigger AI content generation via transcription completed event
      await sendJob('video.transcriptionCompleted', {
        tenantId,
        videoId,
      })
    } catch (err) {
      console.error('[assemblyai-webhook] Failed to process completion', {
        tenantId,
        videoId,
        error: err instanceof Error ? err.message : 'Unknown error',
      })

      await failTranscription(
        tenantId,
        videoId,
        err instanceof Error ? err.message : 'Failed to process transcription'
      )
    }
  } else if (status === 'error') {
    console.error('[assemblyai-webhook] Transcription failed', {
      tenantId,
      videoId,
      error,
    })

    await failTranscription(tenantId, videoId, error || 'Transcription failed')
  }

  return NextResponse.json({ success: true })
}

/**
 * Verify webhook is reachable (for AssemblyAI setup)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'cgk-assemblyai-webhook',
    timestamp: new Date().toISOString(),
  })
}
