/**
 * @cgk-platform/video - Video Reactions Database Operations
 *
 * CRUD operations for video reactions with tenant isolation.
 */

import { sql, withTenant } from '@cgk-platform/db'

import {
  type AddReactionInput,
  type ReactionSummary,
  type VideoReaction,
} from './types.js'

/**
 * SQL to create the video_reactions table
 */
export const VIDEO_REACTIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS video_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  timestamp_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, video_id, user_id, emoji, timestamp_seconds)
);

CREATE INDEX IF NOT EXISTS idx_video_reactions_video ON video_reactions(video_id);
CREATE INDEX IF NOT EXISTS idx_video_reactions_timestamp ON video_reactions(video_id, timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_video_reactions_user ON video_reactions(user_id);
`

/**
 * Map database row to VideoReaction type
 */
function mapRowToReaction(row: Record<string, unknown>): VideoReaction {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    videoId: row.video_id as string,
    userId: row.user_id as string,
    emoji: row.emoji as string,
    timestampSeconds: row.timestamp_seconds as number | null,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Add a reaction to a video
 */
export async function addReaction(
  tenantId: string,
  videoId: string,
  userId: string,
  input: AddReactionInput
): Promise<VideoReaction> {
  const { emoji, timestampSeconds = null } = input

  return withTenant(tenantId, async () => {
    // Use upsert to handle duplicate reactions gracefully
    const result = await sql`
      INSERT INTO video_reactions (tenant_id, video_id, user_id, emoji, timestamp_seconds)
      VALUES (${tenantId}, ${videoId}, ${userId}, ${emoji}, ${timestampSeconds})
      ON CONFLICT (tenant_id, video_id, user_id, emoji, timestamp_seconds)
      DO UPDATE SET created_at = video_reactions.created_at
      RETURNING *
    `

    const insertedRow = result.rows[0]
    if (!insertedRow) {
      throw new Error('Failed to add reaction')
    }
    return mapRowToReaction(insertedRow as Record<string, unknown>)
  })
}

/**
 * Remove a reaction from a video
 */
export async function removeReaction(
  tenantId: string,
  videoId: string,
  userId: string,
  emoji: string,
  timestampSeconds: number | null = null
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM video_reactions
      WHERE tenant_id = ${tenantId}
        AND video_id = ${videoId}
        AND user_id = ${userId}
        AND emoji = ${emoji}
        AND (
          (${timestampSeconds}::integer IS NULL AND timestamp_seconds IS NULL) OR
          (timestamp_seconds = ${timestampSeconds})
        )
      RETURNING id
    `

    return result.rows.length > 0
  })
}

/**
 * Toggle a reaction (add if not exists, remove if exists)
 */
export async function toggleReaction(
  tenantId: string,
  videoId: string,
  userId: string,
  input: AddReactionInput
): Promise<{ added: boolean; reaction: VideoReaction | null }> {
  const { emoji, timestampSeconds = null } = input

  return withTenant(tenantId, async () => {
    // Check if reaction exists
    const existingResult = await sql`
      SELECT * FROM video_reactions
      WHERE tenant_id = ${tenantId}
        AND video_id = ${videoId}
        AND user_id = ${userId}
        AND emoji = ${emoji}
        AND (
          (${timestampSeconds}::integer IS NULL AND timestamp_seconds IS NULL) OR
          (timestamp_seconds = ${timestampSeconds})
        )
    `

    if (existingResult.rows.length > 0) {
      // Remove existing reaction
      await removeReaction(tenantId, videoId, userId, emoji, timestampSeconds)
      return { added: false, reaction: null }
    } else {
      // Add new reaction
      const reaction = await addReaction(tenantId, videoId, userId, input)
      return { added: true, reaction }
    }
  })
}

/**
 * Get reaction summaries for a video (aggregated by emoji)
 */
export async function getReactionSummaries(
  tenantId: string,
  videoId: string,
  currentUserId?: string
): Promise<ReactionSummary[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        emoji,
        COUNT(*) as count,
        array_agg(user_id) as user_ids
      FROM video_reactions
      WHERE video_id = ${videoId} AND tenant_id = ${tenantId}
      GROUP BY emoji
      ORDER BY count DESC
    `

    return result.rows.map((row) => {
      const r = row as Record<string, unknown>
      const userIds = (r.user_ids as string[]) || []
      return {
        emoji: r.emoji as string,
        count: parseInt(r.count as string, 10),
        users: userIds.map((userId) => ({ userId })),
        hasReacted: currentUserId ? userIds.includes(currentUserId) : false,
      }
    })
  })
}

/**
 * Get reactions at a specific timestamp
 */
export async function getReactionsAtTimestamp(
  tenantId: string,
  videoId: string,
  timestamp: number,
  toleranceSeconds: number = 2
): Promise<ReactionSummary[]> {
  const minTs = Math.max(0, timestamp - toleranceSeconds)
  const maxTs = timestamp + toleranceSeconds

  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        emoji,
        COUNT(*) as count,
        array_agg(user_id) as user_ids
      FROM video_reactions
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
        AND timestamp_seconds IS NOT NULL
        AND timestamp_seconds >= ${minTs}
        AND timestamp_seconds <= ${maxTs}
      GROUP BY emoji
      ORDER BY count DESC
    `

    return result.rows.map((row) => {
      const r = row as Record<string, unknown>
      return {
        emoji: r.emoji as string,
        count: parseInt(r.count as string, 10),
        users: ((r.user_ids as string[]) || []).map((userId) => ({ userId })),
        hasReacted: false,
      }
    })
  })
}

/**
 * Get all reactions for a video (for timeline visualization)
 */
export async function getAllReactions(
  tenantId: string,
  videoId: string
): Promise<VideoReaction[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM video_reactions
      WHERE video_id = ${videoId} AND tenant_id = ${tenantId}
      ORDER BY timestamp_seconds ASC NULLS LAST, created_at ASC
    `

    return result.rows.map((r) => mapRowToReaction(r as Record<string, unknown>))
  })
}

/**
 * Get reaction count for a video
 */
export async function getReactionCount(
  tenantId: string,
  videoId: string
): Promise<number> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT COUNT(*) as count FROM video_reactions
      WHERE video_id = ${videoId} AND tenant_id = ${tenantId}
    `

    const countRow = result.rows[0]
    return countRow ? parseInt(countRow.count as string, 10) : 0
  })
}

/**
 * Get user's reactions for a video
 */
export async function getUserReactions(
  tenantId: string,
  videoId: string,
  userId: string
): Promise<VideoReaction[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM video_reactions
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
        AND user_id = ${userId}
      ORDER BY created_at ASC
    `

    return result.rows.map((r) => mapRowToReaction(r as Record<string, unknown>))
  })
}

/**
 * Delete all reactions by a user on a video
 */
export async function deleteUserReactions(
  tenantId: string,
  videoId: string,
  userId: string
): Promise<number> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM video_reactions
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
        AND user_id = ${userId}
      RETURNING id
    `

    return result.rows.length
  })
}
