/**
 * @cgk-platform/video - CTA Button Database Operations
 *
 * CRUD operations for video CTA buttons with tenant isolation.
 */

import { sql, withTenant } from '@cgk-platform/db'

import { CTA_VALIDATION, type CTAButton, type CTAButtonInput } from './types.js'

/**
 * SQL to create the video_cta_buttons table
 */
export const VIDEO_CTA_BUTTONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS video_cta_buttons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  style TEXT DEFAULT 'primary' CHECK (style IN ('primary', 'secondary', 'outline')),
  position TEXT DEFAULT 'end' CHECK (position IN ('start', 'end', 'overlay')),
  show_at_seconds INTEGER,
  hide_at_seconds INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_cta_buttons_video ON video_cta_buttons(video_id);
CREATE INDEX IF NOT EXISTS idx_video_cta_buttons_tenant ON video_cta_buttons(tenant_id);
`

/**
 * Map database row to CTAButton type
 */
function mapRowToCTA(row: Record<string, unknown>): CTAButton {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    videoId: row.video_id as string,
    label: row.label as string,
    url: row.url as string,
    style: (row.style as CTAButton['style']) || 'primary',
    position: (row.position as CTAButton['position']) || 'end',
    showAtSeconds: row.show_at_seconds as number | null,
    hideAtSeconds: row.hide_at_seconds as number | null,
    sortOrder: (row.sort_order as number) || 0,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Get all CTA buttons for a video
 */
export async function getCTAButtons(
  tenantId: string,
  videoId: string
): Promise<CTAButton[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM video_cta_buttons
      WHERE video_id = ${videoId} AND tenant_id = ${tenantId}
      ORDER BY sort_order ASC, created_at ASC
    `

    return result.rows.map(mapRowToCTA)
  })
}

/**
 * Create a CTA button
 */
export async function createCTAButton(
  tenantId: string,
  videoId: string,
  input: CTAButtonInput
): Promise<CTAButton> {
  return withTenant(tenantId, async () => {
    // Check button limit
    const countResult = await sql`
      SELECT COUNT(*) as count FROM video_cta_buttons
      WHERE video_id = ${videoId} AND tenant_id = ${tenantId}
    `
    const row = countResult.rows[0]
    const currentCount = row ? parseInt(row.count as string, 10) : 0

    if (currentCount >= CTA_VALIDATION.maxButtons) {
      throw new Error(`Maximum of ${CTA_VALIDATION.maxButtons} CTA buttons per video`)
    }

    const {
      label,
      url,
      style = 'primary',
      position = 'end',
      showAtSeconds = null,
      hideAtSeconds = null,
      sortOrder = currentCount,
    } = input

    const result = await sql`
      INSERT INTO video_cta_buttons (
        tenant_id, video_id, label, url, style, position,
        show_at_seconds, hide_at_seconds, sort_order
      )
      VALUES (
        ${tenantId}, ${videoId}, ${label}, ${url}, ${style}, ${position},
        ${showAtSeconds}, ${hideAtSeconds}, ${sortOrder}
      )
      RETURNING *
    `

    const insertedRow = result.rows[0]
    if (!insertedRow) {
      throw new Error('Failed to create CTA button')
    }
    return mapRowToCTA(insertedRow as Record<string, unknown>)
  })
}

/**
 * Update a CTA button
 */
export async function updateCTAButton(
  tenantId: string,
  buttonId: string,
  input: Partial<CTAButtonInput>
): Promise<CTAButton | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE video_cta_buttons
      SET label = COALESCE(${input.label}, label),
          url = COALESCE(${input.url}, url),
          style = COALESCE(${input.style}, style),
          position = COALESCE(${input.position}, position),
          show_at_seconds = COALESCE(${input.showAtSeconds}, show_at_seconds),
          hide_at_seconds = COALESCE(${input.hideAtSeconds}, hide_at_seconds),
          sort_order = COALESCE(${input.sortOrder}, sort_order)
      WHERE id = ${buttonId} AND tenant_id = ${tenantId}
      RETURNING *
    `

    const updatedRow = result.rows[0]
    if (!updatedRow) {
      return null
    }

    return mapRowToCTA(updatedRow as Record<string, unknown>)
  })
}

/**
 * Delete a CTA button
 */
export async function deleteCTAButton(
  tenantId: string,
  buttonId: string
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM video_cta_buttons
      WHERE id = ${buttonId} AND tenant_id = ${tenantId}
      RETURNING id
    `

    return result.rows.length > 0
  })
}

/**
 * Replace all CTA buttons for a video (atomic operation)
 */
export async function replaceCTAButtons(
  tenantId: string,
  videoId: string,
  buttons: CTAButtonInput[]
): Promise<CTAButton[]> {
  if (buttons.length > CTA_VALIDATION.maxButtons) {
    throw new Error(`Maximum of ${CTA_VALIDATION.maxButtons} CTA buttons per video`)
  }

  return withTenant(tenantId, async () => {
    // Delete existing buttons
    await sql`
      DELETE FROM video_cta_buttons
      WHERE video_id = ${videoId} AND tenant_id = ${tenantId}
    `

    // Insert new buttons
    const results: CTAButton[] = []
    for (let i = 0; i < buttons.length; i++) {
      const buttonInput = buttons[i]
      if (!buttonInput) continue

      const result = await sql`
        INSERT INTO video_cta_buttons (
          tenant_id, video_id, label, url, style, position,
          show_at_seconds, hide_at_seconds, sort_order
        )
        VALUES (
          ${tenantId},
          ${videoId},
          ${buttonInput.label},
          ${buttonInput.url},
          ${buttonInput.style || 'primary'},
          ${buttonInput.position || 'end'},
          ${buttonInput.showAtSeconds ?? null},
          ${buttonInput.hideAtSeconds ?? null},
          ${buttonInput.sortOrder ?? i}
        )
        RETURNING *
      `
      const insertedRow = result.rows[0]
      if (insertedRow) {
        results.push(mapRowToCTA(insertedRow as Record<string, unknown>))
      }
    }

    return results
  })
}

/**
 * Reorder CTA buttons
 */
export async function reorderCTAButtons(
  tenantId: string,
  videoId: string,
  buttonIds: string[]
): Promise<CTAButton[]> {
  return withTenant(tenantId, async () => {
    for (let i = 0; i < buttonIds.length; i++) {
      await sql`
        UPDATE video_cta_buttons
        SET sort_order = ${i}
        WHERE id = ${buttonIds[i]}
          AND video_id = ${videoId}
          AND tenant_id = ${tenantId}
      `
    }

    return getCTAButtons(tenantId, videoId)
  })
}
