import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { ProjectEditorClient } from './project-editor-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectEditorPage({ params }: Props) {
  const { id: projectId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">No tenant configured.</p>
      </div>
    )
  }

  const data = await withTenant(tenantSlug, async () => {
    const [projectResult, scenesResult, captionsResult, activityResult, rendersResult] =
      await Promise.all([
        sql`
          SELECT * FROM video_editor_projects
          WHERE id = ${projectId} AND tenant_id = ${tenantSlug}
          LIMIT 1
        `,
        sql`
          SELECT * FROM video_editor_scenes
          WHERE project_id = ${projectId} AND tenant_id = ${tenantSlug}
          ORDER BY sort_order ASC
        `,
        sql`
          SELECT id, word, start_time, end_time, sort_order, is_edited
          FROM video_editor_captions
          WHERE project_id = ${projectId} AND tenant_id = ${tenantSlug}
          ORDER BY sort_order ASC
        `,
        sql`
          SELECT id, source, action, data, created_at
          FROM video_editor_activity
          WHERE project_id = ${projectId} AND tenant_id = ${tenantSlug}
          ORDER BY created_at DESC
          LIMIT 50
        `,
        sql`
          SELECT id, render_url, thumbnail_url, duration_seconds, caption_style, voice_name, rendered_at
          FROM video_editor_renders
          WHERE project_id = ${projectId} AND tenant_id = ${tenantSlug}
          ORDER BY rendered_at DESC
          LIMIT 10
        `,
      ])

    return {
      project: projectResult.rows[0] ?? null,
      scenes: scenesResult.rows,
      captions: captionsResult.rows,
      activity: activityResult.rows,
      renders: rendersResult.rows,
    }
  })

  if (!data.project) {
    notFound()
  }

  return (
    <ProjectEditorClient
      project={data.project as ProjectRecord}
      scenes={data.scenes as SceneRecord[]}
      captions={data.captions as CaptionRecord[]}
      activity={data.activity as ActivityRecord[]}
      renders={data.renders as RenderRecord[]}
      projectId={projectId}
    />
  )
}

export interface ProjectRecord {
  id: string
  title: string
  status: string
  mode: string | null
  aspect_ratio: string | null
  template_id: string | null
  voice_id: string | null
  voice_name: string | null
  voiceover_script: string | null
  voiceover_url: string | null
  caption_style: string | null
  render_url: string | null
  openclaw_session_id: string | null
  created_at: string
  updated_at: string
}

export interface SceneRecord {
  id: string
  scene_number: number
  role: string | null
  duration: number | null
  clip_asset_id: string | null
  footage_hint: string | null
  transition: string | null
  sort_order: number
}

export interface CaptionRecord {
  id: string
  word: string
  start_time: number
  end_time: number
  sort_order: number
  is_edited: boolean
}

export interface ActivityRecord {
  id: string
  source: 'agent' | 'user'
  action: string
  data: Record<string, unknown> | null
  created_at: string
}

export interface RenderRecord {
  id: string
  render_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  caption_style: string | null
  voice_name: string | null
  rendered_at: string
}
