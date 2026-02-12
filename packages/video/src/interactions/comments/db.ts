/**
 * @cgk/video - Video Comments Database Operations
 *
 * CRUD operations for timestamped video comments with tenant isolation.
 */

import { sql, withTenant } from '@cgk/db'

import {
  buildCommentTree,
  type CommentListOptions,
  type CreateCommentInput,
  type UpdateCommentInput,
  type VideoComment,
} from './types.js'

/**
 * SQL to create the video_comments table
 */
export const VIDEO_COMMENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_avatar_url TEXT,
  content TEXT NOT NULL,
  timestamp_seconds INTEGER,
  parent_id UUID REFERENCES video_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_comments_video ON video_comments(video_id, created_at);
CREATE INDEX IF NOT EXISTS idx_video_comments_parent ON video_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_timestamp ON video_comments(video_id, timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_video_comments_user ON video_comments(user_id);
`

/**
 * Map database row to VideoComment type
 */
function mapRowToComment(row: Record<string, unknown>): VideoComment {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    videoId: row.video_id as string,
    userId: row.user_id as string,
    userName: (row.user_name as string) || 'Anonymous',
    userAvatarUrl: row.user_avatar_url as string | null,
    content: row.content as string,
    timestampSeconds: row.timestamp_seconds as number | null,
    parentId: row.parent_id as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Create a comment
 */
export async function createComment(
  tenantId: string,
  videoId: string,
  userId: string,
  input: CreateCommentInput
): Promise<VideoComment> {
  return withTenant(tenantId, async () => {
    const {
      content,
      timestampSeconds = null,
      parentId = null,
      userName,
      userAvatarUrl = null,
    } = input

    // If parentId provided, verify it exists and belongs to same video
    if (parentId) {
      const parentResult = await sql`
        SELECT id FROM video_comments
        WHERE id = ${parentId}
          AND video_id = ${videoId}
          AND tenant_id = ${tenantId}
      `
      if (parentResult.rows.length === 0) {
        throw new Error('Parent comment not found')
      }
    }

    // Get user name if not provided
    let resolvedUserName = userName
    if (!resolvedUserName) {
      const userResult = await sql`
        SELECT name FROM users WHERE id = ${userId}
      `
      resolvedUserName = (userResult.rows[0]?.name as string) || 'Anonymous'
    }

    const result = await sql`
      INSERT INTO video_comments (
        tenant_id, video_id, user_id, user_name, user_avatar_url,
        content, timestamp_seconds, parent_id
      )
      VALUES (
        ${tenantId}, ${videoId}, ${userId}, ${resolvedUserName}, ${userAvatarUrl},
        ${content}, ${timestampSeconds}, ${parentId}
      )
      RETURNING *
    `

    const insertedRow = result.rows[0]
    if (!insertedRow) {
      throw new Error('Failed to create comment')
    }
    return mapRowToComment(insertedRow as Record<string, unknown>)
  })
}

/**
 * Get comments for a video
 */
export async function getComments(
  tenantId: string,
  videoId: string,
  options: CommentListOptions = {}
): Promise<{ comments: VideoComment[]; totalCount: number }> {
  const {
    includeReplies = true,
    timestampStart,
    timestampEnd,
    limit = 50,
    offset = 0,
    sort = 'newest',
  } = options

  return withTenant(tenantId, async () => {
    let result
    let countResult

    const hasTimestampFilter =
      timestampStart !== undefined || timestampEnd !== undefined

    if (hasTimestampFilter) {
      const tsStart = timestampStart ?? 0
      const tsEnd = timestampEnd ?? 2147483647 // Max int for no upper bound

      // Query with timestamp filter - separate queries for each sort order
      if (sort === 'oldest') {
        result = await sql`
          SELECT * FROM video_comments
          WHERE video_id = ${videoId}
            AND tenant_id = ${tenantId}
            AND (timestamp_seconds IS NULL OR (timestamp_seconds >= ${tsStart} AND timestamp_seconds <= ${tsEnd}))
          ORDER BY created_at ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      } else if (sort === 'timestamp') {
        result = await sql`
          SELECT * FROM video_comments
          WHERE video_id = ${videoId}
            AND tenant_id = ${tenantId}
            AND (timestamp_seconds IS NULL OR (timestamp_seconds >= ${tsStart} AND timestamp_seconds <= ${tsEnd}))
          ORDER BY timestamp_seconds ASC NULLS LAST, created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      } else {
        // newest (default)
        result = await sql`
          SELECT * FROM video_comments
          WHERE video_id = ${videoId}
            AND tenant_id = ${tenantId}
            AND (timestamp_seconds IS NULL OR (timestamp_seconds >= ${tsStart} AND timestamp_seconds <= ${tsEnd}))
          ORDER BY created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      }

      countResult = await sql`
        SELECT COUNT(*) as count FROM video_comments
        WHERE video_id = ${videoId}
          AND tenant_id = ${tenantId}
          AND (timestamp_seconds IS NULL OR (timestamp_seconds >= ${tsStart} AND timestamp_seconds <= ${tsEnd}))
      `
    } else {
      // Query without timestamp filter - separate queries for each sort order
      if (sort === 'oldest') {
        result = await sql`
          SELECT * FROM video_comments
          WHERE video_id = ${videoId} AND tenant_id = ${tenantId}
          ORDER BY created_at ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      } else if (sort === 'timestamp') {
        result = await sql`
          SELECT * FROM video_comments
          WHERE video_id = ${videoId} AND tenant_id = ${tenantId}
          ORDER BY timestamp_seconds ASC NULLS LAST, created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      } else {
        // newest (default)
        result = await sql`
          SELECT * FROM video_comments
          WHERE video_id = ${videoId} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      }

      countResult = await sql`
        SELECT COUNT(*) as count FROM video_comments
        WHERE video_id = ${videoId} AND tenant_id = ${tenantId}
      `
    }

    const comments = result.rows.map((r) => mapRowToComment(r as Record<string, unknown>))
    const countRow = countResult.rows[0]
    const totalCount = countRow ? parseInt(countRow.count as string, 10) : 0

    // Build threaded tree if requested
    const processedComments = includeReplies ? buildCommentTree(comments) : comments

    return { comments: processedComments, totalCount }
  })
}

/**
 * Get a single comment by ID
 */
export async function getComment(
  tenantId: string,
  commentId: string
): Promise<VideoComment | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM video_comments
      WHERE id = ${commentId} AND tenant_id = ${tenantId}
    `

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return mapRowToComment(row as Record<string, unknown>)
  })
}

/**
 * Update a comment (only content can be updated)
 */
export async function updateComment(
  tenantId: string,
  userId: string,
  commentId: string,
  input: UpdateCommentInput
): Promise<VideoComment | null> {
  return withTenant(tenantId, async () => {
    // Only the author can update their comment
    const result = await sql`
      UPDATE video_comments
      SET content = ${input.content},
          updated_at = now()
      WHERE id = ${commentId}
        AND tenant_id = ${tenantId}
        AND user_id = ${userId}
      RETURNING *
    `

    const updatedRow = result.rows[0]
    if (!updatedRow) {
      return null
    }

    return mapRowToComment(updatedRow as Record<string, unknown>)
  })
}

/**
 * Delete a comment (cascades to replies)
 */
export async function deleteComment(
  tenantId: string,
  userId: string,
  commentId: string,
  isAdmin: boolean = false
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    let result

    if (isAdmin) {
      // Admins can delete any comment
      result = await sql`
        DELETE FROM video_comments
        WHERE id = ${commentId} AND tenant_id = ${tenantId}
        RETURNING id
      `
    } else {
      // Regular users can only delete their own comments
      result = await sql`
        DELETE FROM video_comments
        WHERE id = ${commentId}
          AND tenant_id = ${tenantId}
          AND user_id = ${userId}
        RETURNING id
      `
    }

    return result.rows.length > 0
  })
}

/**
 * Get comment count for a video
 */
export async function getCommentCount(
  tenantId: string,
  videoId: string
): Promise<number> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT COUNT(*) as count FROM video_comments
      WHERE video_id = ${videoId} AND tenant_id = ${tenantId}
    `

    const countRow = result.rows[0]
    return countRow ? parseInt(countRow.count as string, 10) : 0
  })
}

/**
 * Get comments at a specific timestamp (+/- tolerance)
 */
export async function getCommentsAtTimestamp(
  tenantId: string,
  videoId: string,
  timestamp: number,
  toleranceSeconds: number = 2
): Promise<VideoComment[]> {
  return withTenant(tenantId, async () => {
    const minTs = Math.max(0, timestamp - toleranceSeconds)
    const maxTs = timestamp + toleranceSeconds

    const result = await sql`
      SELECT * FROM video_comments
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
        AND timestamp_seconds IS NOT NULL
        AND timestamp_seconds >= ${minTs}
        AND timestamp_seconds <= ${maxTs}
        AND parent_id IS NULL
      ORDER BY timestamp_seconds ASC, created_at ASC
    `

    return result.rows.map((r) => mapRowToComment(r as Record<string, unknown>))
  })
}
