/**
 * @cgk-platform/video-editor - Project sync from openCLAW session
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries MUST use withTenant() wrapper
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { SyncProjectInput, VideoEditorProject } from '../types.js'
import { logActivity } from '../activity/log.js'
import { mapProjectRow } from './internal.js'

export interface SyncProjectResult {
  project: VideoEditorProject
  isNew: boolean
}

export async function syncProject(
  tenantId: string,
  userId: string | null,
  input: SyncProjectInput
): Promise<SyncProjectResult> {
  return withTenant(tenantId, async () => {
    const storyboard = input.storyboard != null ? JSON.stringify(input.storyboard) : null
    const captionConfig = input.captionConfig != null ? JSON.stringify(input.captionConfig) : null
    const qcResults = input.qcResults != null ? JSON.stringify(input.qcResults) : null
    const brandDefaults = input.brandDefaults != null ? JSON.stringify(input.brandDefaults) : null

    // B6: added updated_at = NOW() to upsert SET clause
    const result = await sql`
      INSERT INTO video_editor_projects (
        tenant_id,
        openclaw_session_id,
        openclaw_profile,
        title,
        status,
        mode,
        aspect_ratio,
        template_id,
        storyboard,
        voice_id,
        voice_name,
        voiceover_script,
        voiceover_url,
        caption_style,
        caption_config,
        music_url,
        music_attribution,
        music_volume,
        render_url,
        qc_results,
        brand_defaults,
        created_by
      ) VALUES (
        ${tenantId},
        ${input.openclawSessionId},
        ${input.openclawProfile},
        ${input.title},
        ${input.status},
        ${input.mode ?? null},
        ${input.aspectRatio ?? '9:16'},
        ${input.templateId ?? null},
        ${storyboard}::jsonb,
        ${input.voiceId ?? null},
        ${input.voiceName ?? null},
        ${input.voiceoverScript ?? null},
        ${input.voiceoverUrl ?? null},
        ${input.captionStyle ?? null},
        ${captionConfig}::jsonb,
        ${input.musicUrl ?? null},
        ${input.musicAttribution ?? null},
        ${input.musicVolume ?? 0.15},
        ${input.renderUrl ?? null},
        ${qcResults}::jsonb,
        ${brandDefaults}::jsonb,
        ${userId ?? null}
      )
      ON CONFLICT (tenant_id, openclaw_session_id) DO UPDATE SET
        openclaw_profile = EXCLUDED.openclaw_profile,
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        mode = EXCLUDED.mode,
        aspect_ratio = EXCLUDED.aspect_ratio,
        template_id = EXCLUDED.template_id,
        storyboard = EXCLUDED.storyboard,
        voice_id = EXCLUDED.voice_id,
        voice_name = EXCLUDED.voice_name,
        voiceover_script = EXCLUDED.voiceover_script,
        voiceover_url = COALESCE(EXCLUDED.voiceover_url, video_editor_projects.voiceover_url),
        caption_style = EXCLUDED.caption_style,
        caption_config = EXCLUDED.caption_config,
        music_url = COALESCE(EXCLUDED.music_url, video_editor_projects.music_url),
        music_attribution = EXCLUDED.music_attribution,
        music_volume = EXCLUDED.music_volume,
        render_url = COALESCE(EXCLUDED.render_url, video_editor_projects.render_url),
        qc_results = EXCLUDED.qc_results,
        brand_defaults = EXCLUDED.brand_defaults,
        updated_at = NOW()
      RETURNING *, (xmax = 0) AS is_new
    `

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to sync video editor project')
    }

    const rowData = row as Record<string, unknown>
    const isNew = rowData['is_new'] === true || rowData['is_new'] === 't'
    const project = mapProjectRow(rowData)

    // B2: Batch scene sync using unnest() — single query instead of N individual inserts
    if (input.scenes !== undefined) {
      const validScenes = input.scenes.filter(Boolean)

      if (validScenes.length > 0) {
        const sceneNumbers = `{${validScenes.map((s) => s!.sceneNumber).join(',')}}`
        const roles = `{${validScenes.map((s) => s!.role ?? '').join(',')}}`
        const durations = `{${validScenes.map((s) => s!.duration ?? 0).join(',')}}`
        const clipAssetIds = `{${validScenes.map((s) => s!.clipAssetId ?? '').join(',')}}`
        const clipSegmentIds = `{${validScenes.map((s) => s!.clipSegmentId ?? '').join(',')}}`
        const clipStarts = `{${validScenes.map((s) => s!.clipStart ?? 0).join(',')}}`
        const clipEnds = `{${validScenes.map((s) => s!.clipEnd ?? 0).join(',')}}`
        const transitions = `{${validScenes.map((s) => s!.transition ?? 'crossfade').join(',')}}`
        const textOverlaysArr = `{${validScenes.map((s) => `"${(s!.textOverlays != null ? JSON.stringify(s!.textOverlays) : '[]').replace(/"/g, '\\"')}"`).join(',')}}`
        const footageHints = `{${validScenes.map((s) => s!.footageHint ?? '').join(',')}}`
        const sourceTypes = `{${validScenes.map((s) => s!.sourceType ?? '').join(',')}}`
        const sourceRefs = `{${validScenes.map((s) => s!.sourceReference ?? '').join(',')}}`
        const sortOrders = `{${validScenes.map((_s, i) => i).join(',')}}`

        await sql`
          INSERT INTO video_editor_scenes (
            tenant_id, project_id, scene_number, role, duration,
            clip_asset_id, clip_segment_id, clip_start, clip_end,
            transition, text_overlays, footage_hint,
            source_type, source_reference, sort_order
          )
          SELECT
            ${tenantId},
            ${project.id},
            u.scene_number,
            NULLIF(u.role, ''),
            NULLIF(u.duration, 0),
            NULLIF(u.clip_asset_id, ''),
            NULLIF(u.clip_segment_id, ''),
            NULLIF(u.clip_start, 0),
            NULLIF(u.clip_end, 0),
            u.transition,
            u.text_overlays::jsonb,
            NULLIF(u.footage_hint, ''),
            NULLIF(u.source_type, ''),
            NULLIF(u.source_reference, ''),
            u.sort_order
          FROM unnest(
            ${sceneNumbers}::int[],
            ${roles}::text[],
            ${durations}::numeric[],
            ${clipAssetIds}::text[],
            ${clipSegmentIds}::text[],
            ${clipStarts}::numeric[],
            ${clipEnds}::numeric[],
            ${transitions}::text[],
            ${textOverlaysArr}::text[],
            ${footageHints}::text[],
            ${sourceTypes}::text[],
            ${sourceRefs}::text[],
            ${sortOrders}::int[]
          ) AS u(
            scene_number, role, duration, clip_asset_id, clip_segment_id,
            clip_start, clip_end, transition, text_overlays,
            footage_hint, source_type, source_reference, sort_order
          )
          ON CONFLICT (project_id, scene_number) DO UPDATE SET
            role = EXCLUDED.role,
            duration = EXCLUDED.duration,
            clip_asset_id = EXCLUDED.clip_asset_id,
            clip_segment_id = EXCLUDED.clip_segment_id,
            clip_start = EXCLUDED.clip_start,
            clip_end = EXCLUDED.clip_end,
            transition = EXCLUDED.transition,
            text_overlays = EXCLUDED.text_overlays,
            footage_hint = EXCLUDED.footage_hint,
            source_type = EXCLUDED.source_type,
            source_reference = EXCLUDED.source_reference,
            sort_order = EXCLUDED.sort_order
        `
      }

      // Remove scenes beyond the new count
      const maxSceneNumber =
        validScenes.length > 0 ? Math.max(...validScenes.map((s) => s!.sceneNumber)) : 0
      await sql`
        DELETE FROM video_editor_scenes
        WHERE project_id = ${project.id}
          AND tenant_id = ${tenantId}
          AND scene_number > ${maxSceneNumber}
      `
    }

    // B2: Batch caption sync — single INSERT with unnest() instead of N individual inserts
    if (input.captions !== undefined) {
      // Delete non-edited captions to make room for fresh data
      await sql`
        DELETE FROM video_editor_captions
        WHERE project_id = ${project.id}
          AND tenant_id = ${tenantId}
          AND (is_edited IS NULL OR is_edited = FALSE)
      `

      // Get sort_orders of edited captions so we can skip those positions
      const editedResult = await sql`
        SELECT sort_order FROM video_editor_captions
        WHERE project_id = ${project.id}
          AND tenant_id = ${tenantId}
          AND is_edited = TRUE
      `
      const editedSortOrders = new Set(
        editedResult.rows.map((r) => Number((r as Record<string, unknown>)['sort_order']))
      )

      // Filter out captions that would collide with edited positions
      const captionsToInsert = input.captions
        .map((c, i) => ({ ...c, sortOrder: i }))
        .filter((c) => !editedSortOrders.has(c.sortOrder))

      if (captionsToInsert.length > 0) {
        const words = `{${captionsToInsert.map((c) => `"${c.word.replace(/"/g, '\\"')}"`).join(',')}}`
        const startTimes = `{${captionsToInsert.map((c) => c.startTime).join(',')}}`
        const endTimes = `{${captionsToInsert.map((c) => c.endTime).join(',')}}`
        const captionSortOrders = `{${captionsToInsert.map((c) => c.sortOrder).join(',')}}`

        await sql`
          INSERT INTO video_editor_captions (
            tenant_id, project_id, word, start_time, end_time, sort_order
          )
          SELECT
            ${tenantId},
            ${project.id},
            u.word,
            u.start_time,
            u.end_time,
            u.sort_order
          FROM unnest(
            ${words}::text[],
            ${startTimes}::numeric[],
            ${endTimes}::numeric[],
            ${captionSortOrders}::int[]
          ) AS u(word, start_time, end_time, sort_order)
        `
      }
    }

    // Log the sync activity
    await logActivity(tenantId, project.id, {
      source: 'agent',
      action: 'project_synced',
      data: {
        openclawSessionId: input.openclawSessionId,
        status: input.status,
        sceneCount: input.scenes?.length ?? null,
        captionCount: input.captions?.length ?? null,
      },
    })

    return { project, isNew }
  })
}
