/**
 * @cgk-platform/video-editor - Project CRUD operations
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries MUST use withTenant() wrapper
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  CreateProjectInput,
  ProjectListOptions,
  UpdateProjectInput,
  VideoEditorProject,
} from '../types.js'
import { mapProjectRow } from './internal.js'

// ============================================================================
// CRUD Operations
// ============================================================================

export async function createProject(
  tenantId: string,
  userId: string,
  input: CreateProjectInput
): Promise<VideoEditorProject> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO video_editor_projects (
        tenant_id,
        title,
        openclaw_session_id,
        openclaw_profile,
        mode,
        aspect_ratio,
        template_id,
        created_by
      ) VALUES (
        ${tenantId},
        ${input.title},
        ${input.openclawSessionId ?? null},
        ${input.openclawProfile ?? null},
        ${input.mode ?? null},
        ${input.aspectRatio ?? '9:16'},
        ${input.templateId ?? null},
        ${userId}
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create video editor project')
    }
    return mapProjectRow(row as Record<string, unknown>)
  })
}

export async function getProject(
  tenantId: string,
  projectId: string
): Promise<VideoEditorProject | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT *
      FROM video_editor_projects
      WHERE id = ${projectId}
        AND tenant_id = ${tenantId}
    `
    const row = result.rows[0]
    if (!row) return null
    return mapProjectRow(row as Record<string, unknown>)
  })
}

export async function getProjects(
  tenantId: string,
  options: ProjectListOptions = {}
): Promise<{ rows: VideoEditorProject[]; totalCount: number }> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0
  const sort = options.sort ?? 'created_at'
  const dir = options.dir ?? 'desc'

  return withTenant(tenantId, async () => {
    // Count query helper -- filter combinations without ORDER BY
    const getCount = async (status?: string, searchPattern?: string) => {
      if (status && searchPattern) {
        return sql`
          SELECT COUNT(*) as count FROM video_editor_projects
          WHERE tenant_id = ${tenantId} AND status = ${status} AND title ILIKE ${searchPattern}
        `
      }
      if (status) {
        return sql`
          SELECT COUNT(*) as count FROM video_editor_projects
          WHERE tenant_id = ${tenantId} AND status = ${status}
        `
      }
      if (searchPattern) {
        return sql`
          SELECT COUNT(*) as count FROM video_editor_projects
          WHERE tenant_id = ${tenantId} AND title ILIKE ${searchPattern}
        `
      }
      return sql`
        SELECT COUNT(*) as count FROM video_editor_projects
        WHERE tenant_id = ${tenantId}
      `
    }

    // Data query helper -- separate branches for each sort column and direction
    // because @vercel/postgres does not support dynamic column names.
    const getData = async (status?: string, searchPattern?: string) => {
      // Sort by title ASC
      if (sort === 'title' && dir === 'asc') {
        if (status && searchPattern) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND status = ${status} AND title ILIKE ${searchPattern} ORDER BY title ASC LIMIT ${limit} OFFSET ${offset}`
        }
        if (status) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY title ASC LIMIT ${limit} OFFSET ${offset}`
        }
        if (searchPattern) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND title ILIKE ${searchPattern} ORDER BY title ASC LIMIT ${limit} OFFSET ${offset}`
        }
        return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} ORDER BY title ASC LIMIT ${limit} OFFSET ${offset}`
      }

      // Sort by title DESC
      if (sort === 'title' && dir === 'desc') {
        if (status && searchPattern) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND status = ${status} AND title ILIKE ${searchPattern} ORDER BY title DESC LIMIT ${limit} OFFSET ${offset}`
        }
        if (status) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY title DESC LIMIT ${limit} OFFSET ${offset}`
        }
        if (searchPattern) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND title ILIKE ${searchPattern} ORDER BY title DESC LIMIT ${limit} OFFSET ${offset}`
        }
        return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} ORDER BY title DESC LIMIT ${limit} OFFSET ${offset}`
      }

      // Sort by updated_at ASC
      if (sort === 'updated_at' && dir === 'asc') {
        if (status && searchPattern) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND status = ${status} AND title ILIKE ${searchPattern} ORDER BY updated_at ASC LIMIT ${limit} OFFSET ${offset}`
        }
        if (status) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY updated_at ASC LIMIT ${limit} OFFSET ${offset}`
        }
        if (searchPattern) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND title ILIKE ${searchPattern} ORDER BY updated_at ASC LIMIT ${limit} OFFSET ${offset}`
        }
        return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} ORDER BY updated_at ASC LIMIT ${limit} OFFSET ${offset}`
      }

      // Sort by updated_at DESC
      if (sort === 'updated_at' && dir === 'desc') {
        if (status && searchPattern) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND status = ${status} AND title ILIKE ${searchPattern} ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`
        }
        if (status) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`
        }
        if (searchPattern) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND title ILIKE ${searchPattern} ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`
        }
        return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`
      }

      // Sort by created_at ASC
      if (dir === 'asc') {
        if (status && searchPattern) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND status = ${status} AND title ILIKE ${searchPattern} ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}`
        }
        if (status) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}`
        }
        if (searchPattern) {
          return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND title ILIKE ${searchPattern} ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}`
        }
        return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}`
      }

      // Default: created_at DESC
      if (status && searchPattern) {
        return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND status = ${status} AND title ILIKE ${searchPattern} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      }
      if (status) {
        return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      }
      if (searchPattern) {
        return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} AND title ILIKE ${searchPattern} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      }
      return sql`SELECT * FROM video_editor_projects WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    }

    const searchPattern = options.search ? '%' + options.search + '%' : undefined
    const [countResult, dataResult] = await Promise.all([
      getCount(options.status, searchPattern),
      getData(options.status, searchPattern),
    ])

    return {
      rows: dataResult.rows.map((r) => mapProjectRow(r as Record<string, unknown>)),
      totalCount: Number(countResult.rows[0]?.count ?? 0),
    }
  })
}

export async function updateProject(
  tenantId: string,
  projectId: string,
  input: UpdateProjectInput
): Promise<VideoEditorProject | null> {
  return withTenant(tenantId, async () => {
    const existing = await sql`
      SELECT * FROM video_editor_projects
      WHERE id = ${projectId} AND tenant_id = ${tenantId}
    `
    if (existing.rows.length === 0) return null
    const row = existing.rows[0] as Record<string, unknown>

    const title = input.title ?? (row['title'] as string)
    const status = input.status ?? (row['status'] as string)
    const storyboard =
      input.storyboard !== undefined
        ? JSON.stringify(input.storyboard)
        : row['storyboard'] != null
          ? JSON.stringify(row['storyboard'])
          : null
    const voiceId = input.voiceId !== undefined ? input.voiceId : (row['voice_id'] as string | null)
    const voiceName =
      input.voiceName !== undefined ? input.voiceName : (row['voice_name'] as string | null)
    const voiceoverScript =
      input.voiceoverScript !== undefined
        ? input.voiceoverScript
        : (row['voiceover_script'] as string | null)
    const voiceoverUrl =
      input.voiceoverUrl !== undefined
        ? input.voiceoverUrl
        : (row['voiceover_url'] as string | null)
    const captionStyle =
      input.captionStyle !== undefined
        ? input.captionStyle
        : (row['caption_style'] as string | null)
    const captionConfig =
      input.captionConfig !== undefined
        ? JSON.stringify(input.captionConfig)
        : row['caption_config'] != null
          ? JSON.stringify(row['caption_config'])
          : null
    const musicUrl =
      input.musicUrl !== undefined ? input.musicUrl : (row['music_url'] as string | null)
    const musicAttribution =
      input.musicAttribution !== undefined
        ? input.musicAttribution
        : (row['music_attribution'] as string | null)
    const musicVolume = input.musicVolume ?? Number(row['music_volume'] ?? 0.15)
    const renderUrl =
      input.renderUrl !== undefined ? input.renderUrl : (row['render_url'] as string | null)
    const qcResults =
      input.qcResults !== undefined
        ? JSON.stringify(input.qcResults)
        : row['qc_results'] != null
          ? JSON.stringify(row['qc_results'])
          : null

    const updated = await sql`
      UPDATE video_editor_projects SET
        title = ${title},
        status = ${status},
        storyboard = ${storyboard}::jsonb,
        voice_id = ${voiceId},
        voice_name = ${voiceName},
        voiceover_script = ${voiceoverScript},
        voiceover_url = ${voiceoverUrl},
        caption_style = ${captionStyle},
        caption_config = ${captionConfig}::jsonb,
        music_url = ${musicUrl},
        music_attribution = ${musicAttribution},
        music_volume = ${musicVolume},
        render_url = ${renderUrl},
        qc_results = ${qcResults}::jsonb
      WHERE id = ${projectId} AND tenant_id = ${tenantId}
      RETURNING *
    `
    const updatedRow = updated.rows[0]
    if (!updatedRow) return null
    return mapProjectRow(updatedRow as Record<string, unknown>)
  })
}

export async function deleteProject(tenantId: string, projectId: string): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM video_editor_projects
      WHERE id = ${projectId} AND tenant_id = ${tenantId}
    `
    return (result.rowCount ?? 0) > 0
  })
}
