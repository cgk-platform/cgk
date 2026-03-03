export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/video-editor/projects/sync
 *
 * Receives full session state from an openCLAW agent and upserts a
 * video-editor project identified by openclaw_session_id.
 * Authenticated via tenant API key.
 */

import { NextResponse } from 'next/server'

import { validateTenantApiKey } from '@/lib/api-key-auth'
import { syncProject } from '@cgk-platform/video-editor/server'

import type { SyncProjectInput, SyncSceneInput, SyncCaptionInput } from '@cgk-platform/video-editor'
import { logger } from '@cgk-platform/logging'

export async function POST(request: Request) {
  const auth = await validateTenantApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    openclawSessionId,
    openclawProfile,
    title,
    status,
    storyboard,
    scenes,
    captions,
    voiceId,
    voiceName,
    voiceoverScript,
    voiceoverUrl,
    captionStyle,
    captionConfig,
    musicUrl,
    musicAttribution,
    musicVolume,
    aspectRatio,
    templateId,
    mode,
    renderUrl,
    qcResults,
    brandDefaults,
  } = body as Record<string, unknown>

  if (!openclawSessionId || typeof openclawSessionId !== 'string') {
    return NextResponse.json({ error: 'openclawSessionId is required' }, { status: 400 })
  }
  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const VALID_STATUSES = [
    'draft',
    'storyboarding',
    'producing',
    'rendering',
    'rendered',
    'delivered',
    'archived',
  ]
  const VALID_MODES = ['original', 'clone']

  const syncInput: SyncProjectInput = {
    openclawSessionId,
    openclawProfile: typeof openclawProfile === 'string' ? openclawProfile : 'cgk',
    title,
    status:
      typeof status === 'string' && VALID_STATUSES.includes(status)
        ? (status as SyncProjectInput['status'])
        : 'draft',
    storyboard: storyboard != null ? (storyboard as Record<string, unknown>) : undefined,
    voiceId: typeof voiceId === 'string' ? voiceId : undefined,
    voiceName: typeof voiceName === 'string' ? voiceName : undefined,
    voiceoverScript: typeof voiceoverScript === 'string' ? voiceoverScript : undefined,
    voiceoverUrl: typeof voiceoverUrl === 'string' ? voiceoverUrl : undefined,
    captionStyle: typeof captionStyle === 'string' ? captionStyle : undefined,
    captionConfig: captionConfig != null ? (captionConfig as Record<string, unknown>) : undefined,
    musicUrl: typeof musicUrl === 'string' ? musicUrl : undefined,
    musicAttribution: typeof musicAttribution === 'string' ? musicAttribution : undefined,
    musicVolume: typeof musicVolume === 'number' ? musicVolume : undefined,
    aspectRatio: typeof aspectRatio === 'string' ? aspectRatio : undefined,
    templateId: typeof templateId === 'string' ? templateId : undefined,
    mode:
      typeof mode === 'string' && VALID_MODES.includes(mode)
        ? (mode as SyncProjectInput['mode'])
        : undefined,
    renderUrl: typeof renderUrl === 'string' ? renderUrl : undefined,
    qcResults: qcResults != null ? (qcResults as SyncProjectInput['qcResults']) : undefined,
    brandDefaults: brandDefaults != null ? (brandDefaults as Record<string, unknown>) : undefined,
    scenes: Array.isArray(scenes)
      ? scenes.map(
          (s: Record<string, unknown>, i: number): SyncSceneInput => ({
            sceneNumber: typeof s.sceneNumber === 'number' ? s.sceneNumber : i + 1,
            role: typeof s.role === 'string' ? s.role : undefined,
            duration: typeof s.duration === 'number' ? s.duration : undefined,
            clipAssetId: typeof s.clipAssetId === 'string' ? s.clipAssetId : undefined,
            clipSegmentId: typeof s.clipSegmentId === 'string' ? s.clipSegmentId : undefined,
            clipStart: typeof s.clipStart === 'number' ? s.clipStart : undefined,
            clipEnd: typeof s.clipEnd === 'number' ? s.clipEnd : undefined,
            transition: typeof s.transition === 'string' ? s.transition : undefined,
            textOverlays:
              s.textOverlays != null
                ? (s.textOverlays as SyncSceneInput['textOverlays'])
                : undefined,
            footageHint: typeof s.footageHint === 'string' ? s.footageHint : undefined,
            sourceType: typeof s.sourceType === 'string' ? s.sourceType : undefined,
            sourceReference: typeof s.sourceReference === 'string' ? s.sourceReference : undefined,
          })
        )
      : undefined,
    captions: Array.isArray(captions)
      ? captions.map(
          (c: Record<string, unknown>): SyncCaptionInput => ({
            word: typeof c.word === 'string' ? c.word : '',
            startTime: typeof c.startTime === 'number' ? c.startTime : 0,
            endTime: typeof c.endTime === 'number' ? c.endTime : 0,
          })
        )
      : undefined,
  }

  try {
    const { project, isNew } = await syncProject(auth.tenantSlug, null, syncInput)

    return NextResponse.json(
      {
        projectId: project.id,
        isNew,
        message: 'Project synced',
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Video editor sync error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
