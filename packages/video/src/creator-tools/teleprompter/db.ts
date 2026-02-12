/**
 * @cgk/video - Teleprompter Database Operations
 *
 * CRUD operations for teleprompter scripts with tenant isolation.
 */

import { sql, withTenant } from '@cgk/db'

import type {
  CreateScriptInput,
  TeleprompterScript,
  UpdateScriptInput,
} from './types.js'

/**
 * SQL to create the video_scripts table
 */
export const VIDEO_SCRIPTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS video_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  scroll_speed INTEGER DEFAULT 3 CHECK (scroll_speed >= 1 AND scroll_speed <= 10),
  font_size INTEGER DEFAULT 32 CHECK (font_size >= 16 AND font_size <= 72),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_scripts_user ON video_scripts(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_video_scripts_created ON video_scripts(tenant_id, user_id, created_at DESC);
`

/**
 * Map database row to TeleprompterScript type
 */
function mapRowToScript(row: Record<string, unknown>): TeleprompterScript {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    userId: row.user_id as string,
    title: row.title as string,
    content: row.content as string,
    scrollSpeed: (row.scroll_speed as number) || 3,
    fontSize: (row.font_size as number) || 32,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Create a new teleprompter script
 */
export async function createScript(
  tenantId: string,
  userId: string,
  input: CreateScriptInput
): Promise<TeleprompterScript> {
  const { title, content, scrollSpeed = 3, fontSize = 32 } = input

  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO video_scripts (tenant_id, user_id, title, content, scroll_speed, font_size)
      VALUES (${tenantId}, ${userId}, ${title}, ${content}, ${scrollSpeed}, ${fontSize})
      RETURNING *
    `

    const insertedRow = result.rows[0]
    if (!insertedRow) {
      throw new Error('Failed to create script')
    }

    return mapRowToScript(insertedRow as Record<string, unknown>)
  })
}

/**
 * Get a script by ID
 */
export async function getScript(
  tenantId: string,
  scriptId: string
): Promise<TeleprompterScript | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM video_scripts
      WHERE id = ${scriptId} AND tenant_id = ${tenantId}
    `

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return mapRowToScript(row as Record<string, unknown>)
  })
}

/**
 * List scripts for a user
 */
export async function listScripts(
  tenantId: string,
  userId: string,
  options: { limit?: number; offset?: number; search?: string } = {}
): Promise<{ scripts: TeleprompterScript[]; totalCount: number }> {
  const { limit = 20, offset = 0, search } = options

  return withTenant(tenantId, async () => {
    let result
    let countResult

    if (search && search.trim().length > 0) {
      const searchPattern = `%${search.trim().toLowerCase()}%`

      result = await sql`
        SELECT * FROM video_scripts
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND LOWER(title) LIKE ${searchPattern}
        ORDER BY updated_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `

      countResult = await sql`
        SELECT COUNT(*) as count FROM video_scripts
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND LOWER(title) LIKE ${searchPattern}
      `
    } else {
      result = await sql`
        SELECT * FROM video_scripts
        WHERE tenant_id = ${tenantId} AND user_id = ${userId}
        ORDER BY updated_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `

      countResult = await sql`
        SELECT COUNT(*) as count FROM video_scripts
        WHERE tenant_id = ${tenantId} AND user_id = ${userId}
      `
    }

    const countRow = countResult.rows[0]
    return {
      scripts: result.rows.map((r) => mapRowToScript(r as Record<string, unknown>)),
      totalCount: countRow ? parseInt(countRow.count as string, 10) : 0,
    }
  })
}

/**
 * Update a script
 */
export async function updateScript(
  tenantId: string,
  userId: string,
  scriptId: string,
  input: UpdateScriptInput
): Promise<TeleprompterScript | null> {
  return withTenant(tenantId, async () => {
    // Verify ownership
    const existing = await sql`
      SELECT id FROM video_scripts
      WHERE id = ${scriptId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    `

    if (existing.rows.length === 0) {
      return null
    }

    // Build update fields dynamically
    const updates: string[] = []
    const values: unknown[] = []

    if (input.title !== undefined) {
      updates.push('title = $' + (values.length + 1))
      values.push(input.title)
    }
    if (input.content !== undefined) {
      updates.push('content = $' + (values.length + 1))
      values.push(input.content)
    }
    if (input.scrollSpeed !== undefined) {
      updates.push('scroll_speed = $' + (values.length + 1))
      values.push(input.scrollSpeed)
    }
    if (input.fontSize !== undefined) {
      updates.push('font_size = $' + (values.length + 1))
      values.push(input.fontSize)
    }

    if (updates.length === 0) {
      const current = await getScript(tenantId, scriptId)
      return current
    }

    // Add updated_at
    updates.push('updated_at = now()')

    const result = await sql`
      UPDATE video_scripts
      SET title = COALESCE(${input.title}, title),
          content = COALESCE(${input.content}, content),
          scroll_speed = COALESCE(${input.scrollSpeed}, scroll_speed),
          font_size = COALESCE(${input.fontSize}, font_size),
          updated_at = now()
      WHERE id = ${scriptId} AND tenant_id = ${tenantId} AND user_id = ${userId}
      RETURNING *
    `

    const updatedRow = result.rows[0]
    if (!updatedRow) {
      return null
    }

    return mapRowToScript(updatedRow as Record<string, unknown>)
  })
}

/**
 * Delete a script
 */
export async function deleteScript(
  tenantId: string,
  userId: string,
  scriptId: string
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM video_scripts
      WHERE id = ${scriptId} AND tenant_id = ${tenantId} AND user_id = ${userId}
      RETURNING id
    `

    return result.rows.length > 0
  })
}

/**
 * Duplicate a script
 */
export async function duplicateScript(
  tenantId: string,
  userId: string,
  scriptId: string,
  newTitle?: string
): Promise<TeleprompterScript | null> {
  return withTenant(tenantId, async () => {
    const existing = await sql`
      SELECT * FROM video_scripts
      WHERE id = ${scriptId} AND tenant_id = ${tenantId} AND user_id = ${userId}
    `

    const existingRow = existing.rows[0]
    if (!existingRow) {
      return null
    }

    const original = mapRowToScript(existingRow as Record<string, unknown>)
    const title = newTitle || `${original.title} (Copy)`

    return createScript(tenantId, userId, {
      title,
      content: original.content,
      scrollSpeed: original.scrollSpeed,
      fontSize: original.fontSize,
    })
  })
}
