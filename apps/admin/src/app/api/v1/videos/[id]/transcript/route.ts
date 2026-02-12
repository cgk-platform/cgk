/**
 * GET /api/v1/videos/[id]/transcript
 *
 * Get video transcript with words, chapters, and AI content
 *
 * Query params:
 * - format: 'json' | 'vtt' | 'srt' (default: 'json')
 *
 * @ai-pattern tenant-isolation
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import {
  getVideoTranscription,
  generateCaptions,
  getCaptionContentType,
  getCaptionExtension,
  type CaptionFormat,
} from '@cgk/video'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Get format from query params
  const url = new URL(request.url)
  const format = url.searchParams.get('format') || 'json'

  // Get transcript data
  const video = await getVideoTranscription(tenantSlug, videoId)

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  // Handle caption format exports
  if (format === 'vtt' || format === 'srt') {
    if (!video.transcriptionWords || video.transcriptionWords.length === 0) {
      return NextResponse.json(
        { error: 'No transcript available' },
        { status: 404 }
      )
    }

    const captions = generateCaptions(video.transcriptionWords, {
      format: format as CaptionFormat,
    })

    const contentType = getCaptionContentType(format as CaptionFormat)
    const extension = getCaptionExtension(format as CaptionFormat)
    const filename = `${video.title || 'transcript'}${extension}`

    return new NextResponse(captions, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // Return JSON format
  return NextResponse.json({
    id: video.id,
    title: video.title,
    transcription: {
      status: video.transcriptionStatus,
      text: video.transcriptionText,
      words: video.transcriptionWords,
    },
    ai: {
      title: video.aiTitle,
      summary: video.aiSummary,
      chapters: video.aiChapters,
      tasks: video.aiTasks,
    },
  })
}
