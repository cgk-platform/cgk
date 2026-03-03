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
        voiceover_url = EXCLUDED.voiceover_url,
        caption_style = EXCLUDED.caption_style,
        caption_config = EXCLUDED.caption_config,
        music_url = EXCLUDED.music_url,
        music_attribution = EXCLUDED.music_attribution,
        music_volume = EXCLUDED.music_volume,
        render_url = EXCLUDED.render_url,
        qc_results = EXCLUDED.qc_results,
        brand_defaults = EXCLUDED.brand_defaults
      RETURNING *, (xmax = 0) AS is_new
    `

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to sync video editor project')
    }

    const rowData = row as Record<string, unknown>
    const isNew = rowData['is_new'] === true || rowData['is_new'] === 't'
    const project = mapProjectRow(rowData)

    // Sync scenes: upsert by (project_id, scene_number), then remove excess
    if (input.scenes !== undefined) {
      for (let i = 0; i < input.scenes.length; i++) {
        const scene = input.scenes[i]
        if (!scene) continue
        const textOverlays = scene.textOverlays != null ? JSON.stringify(scene.textOverlays) : '[]'
        await sql`
          INSERT INTO video_editor_scenes (
            tenant_id,
            project_id,
            scene_number,
            role,
            duration,
            clip_asset_id,
            clip_segment_id,
            clip_start,
            clip_end,
            transition,
            text_overlays,
            footage_hint,
            source_type,
            source_reference,
            sort_order
          ) VALUES (
            ${tenantId},
            ${project.id},
            ${scene.sceneNumber},
            ${scene.role ?? null},
            ${scene.duration ?? null},
            ${scene.clipAssetId ?? null},
            ${scene.clipSegmentId ?? null},
            ${scene.clipStart ?? null},
            ${scene.clipEnd ?? null},
            ${scene.transition ?? 'crossfade'},
            ${textOverlays}::jsonb,
            ${scene.footageHint ?? null},
            ${scene.sourceType ?? null},
            ${scene.sourceReference ?? null},
            ${i}
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
        input.scenes.length > 0
          ? Math.max(...input.scenes.filter(Boolean).map((s) => s!.sceneNumber))
          : 0
      await sql`
        DELETE FROM video_editor_scenes
        WHERE project_id = ${project.id}
          AND tenant_id = ${tenantId}
          AND scene_number > ${maxSceneNumber}
      `
    }

    // Sync captions: delete non-edited, recreate from input
    if (input.captions !== undefined) {
      // Only delete captions that weren't manually edited by the user
      await sql`
        DELETE FROM video_editor_captions
        WHERE project_id = ${project.id}
          AND tenant_id = ${tenantId}
          AND (is_edited IS NULL OR is_edited = FALSE)
      `

      for (let i = 0; i < input.captions.length; i++) {
        const caption = input.captions[i]
        if (!caption) continue
        // Skip insert if an edited caption already occupies this sort_order
        const existing = await sql`
          SELECT id FROM video_editor_captions
          WHERE project_id = ${project.id}
            AND tenant_id = ${tenantId}
            AND sort_order = ${i}
            AND is_edited = TRUE
        `
        if (existing.rows.length > 0) continue

        await sql`
          INSERT INTO video_editor_captions (
            tenant_id,
            project_id,
            word,
            start_time,
            end_time,
            sort_order
          ) VALUES (
            ${tenantId},
            ${project.id},
            ${caption.word},
            ${caption.startTime},
            ${caption.endTime},
            ${i}
          )
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
