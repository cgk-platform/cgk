/**
 * @cgk-platform/video-editor - Caption timing recalculation
 *
 * Adjusts caption timings proportionally when scenes are reordered
 * or scene durations change.
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries MUST use withTenant() wrapper
 */

import { sql, withTenant } from '@cgk-platform/db'

export async function recalculateCaptionTimings(
  tenantId: string,
  projectId: string
): Promise<void> {
  return withTenant(tenantId, async () => {
    // Fetch all scenes ordered by sort_order to determine total duration per segment
    const scenesResult = await sql`
      SELECT id, sort_order, duration
      FROM video_editor_scenes
      WHERE project_id = ${projectId}
        AND tenant_id = ${tenantId}
      ORDER BY sort_order ASC
    `

    // Compute total duration from scene durations
    let cumulativeOffset = 0
    for (const sceneRow of scenesResult.rows) {
      const r = sceneRow as Record<string, unknown>
      const duration = r['duration'] != null ? Number(r['duration']) : 0
      cumulativeOffset += duration
    }

    const totalDuration = cumulativeOffset
    if (totalDuration <= 0) return

    // Fetch all captions sorted by their current sort_order
    const captionsResult = await sql`
      SELECT id, sort_order, start_time, end_time
      FROM video_editor_captions
      WHERE project_id = ${projectId}
        AND tenant_id = ${tenantId}
        AND is_edited = FALSE
      ORDER BY sort_order ASC
    `

    if (captionsResult.rows.length === 0) return

    // Determine original total caption span
    const firstCaption = captionsResult.rows[0] as Record<string, unknown>
    const lastCaption = captionsResult.rows[captionsResult.rows.length - 1] as Record<
      string,
      unknown
    >
    const originalStart = Number(firstCaption['start_time'])
    const originalEnd = Number(lastCaption['end_time'])
    const originalSpan = originalEnd - originalStart

    if (originalSpan <= 0) return

    // Scale each non-edited caption proportionally to the new total duration
    for (const captionRow of captionsResult.rows) {
      const r = captionRow as Record<string, unknown>
      const oldStart = Number(r['start_time'])
      const oldEnd = Number(r['end_time'])
      const progress = (oldStart - originalStart) / originalSpan
      const endProgress = (oldEnd - originalStart) / originalSpan
      const newStart = Number((progress * totalDuration).toFixed(3))
      const newEnd = Number((endProgress * totalDuration).toFixed(3))

      await sql`
        UPDATE video_editor_captions SET
          start_time = ${newStart},
          end_time = ${newEnd}
        WHERE id = ${r['id'] as string}
          AND project_id = ${projectId}
          AND tenant_id = ${tenantId}
          AND is_edited = FALSE
      `
    }
  })
}
