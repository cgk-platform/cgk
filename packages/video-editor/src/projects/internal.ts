/**
 * Internal helpers shared between projects/crud.ts and projects/sync.ts.
 * Not exported from server.ts — internal use only.
 */

import type { QCResult, RenderVariant, VideoEditorProject } from '../types.js'

export function mapProjectRow(row: Record<string, unknown>): VideoEditorProject {
  return {
    id: row['id'] as string,
    tenantId: row['tenant_id'] as string,
    openclawSessionId: row['openclaw_session_id'] as string | null,
    openclawProfile: row['openclaw_profile'] as string | null,
    title: row['title'] as string,
    status: row['status'] as VideoEditorProject['status'],
    mode: row['mode'] as VideoEditorProject['mode'],
    aspectRatio: (row['aspect_ratio'] as string) || '9:16',
    templateId: row['template_id'] as string | null,
    storyboard: row['storyboard'] as Record<string, unknown> | null,
    voiceId: row['voice_id'] as string | null,
    voiceName: row['voice_name'] as string | null,
    voiceoverScript: row['voiceover_script'] as string | null,
    voiceoverUrl: row['voiceover_url'] as string | null,
    captionStyle: row['caption_style'] as string | null,
    captionConfig: row['caption_config'] as Record<string, unknown> | null,
    musicUrl: row['music_url'] as string | null,
    musicAttribution: row['music_attribution'] as string | null,
    musicVolume: Number(row['music_volume'] ?? 0.15),
    renderUrl: row['render_url'] as string | null,
    renderVariants: (row['render_variants'] as RenderVariant[]) ?? [],
    qcResults: row['qc_results'] as QCResult[] | null,
    brandDefaults: row['brand_defaults'] as Record<string, unknown> | null,
    createdBy: row['created_by'] as string | null,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  }
}
