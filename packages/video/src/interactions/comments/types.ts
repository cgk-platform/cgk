/**
 * @cgk/video - Video Comments Types
 *
 * Type definitions for timestamped video comments with threading.
 */

/**
 * Video comment entity
 */
export interface VideoComment {
  id: string
  tenantId: string
  videoId: string
  userId: string
  userName: string
  userAvatarUrl: string | null
  content: string
  timestampSeconds: number | null
  parentId: string | null
  replies?: VideoComment[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating a comment
 */
export interface CreateCommentInput {
  content: string
  timestampSeconds?: number | null
  parentId?: string | null
  userName?: string
  userAvatarUrl?: string | null
}

/**
 * Input for updating a comment
 */
export interface UpdateCommentInput {
  content: string
}

/**
 * Comment list options
 */
export interface CommentListOptions {
  /** Include nested replies (default: true) */
  includeReplies?: boolean
  /** Only get comments for specific timestamp range */
  timestampStart?: number
  timestampEnd?: number
  /** Pagination limit */
  limit?: number
  /** Pagination offset */
  offset?: number
  /** Sort order */
  sort?: 'newest' | 'oldest' | 'timestamp'
}

/**
 * Comment validation rules
 */
export const COMMENT_VALIDATION = {
  maxContentLength: 2000,
  minContentLength: 1,
} as const

/**
 * Validate comment input
 */
export function validateCommentInput(
  input: CreateCommentInput | UpdateCommentInput,
  videoDuration?: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Content validation
  if (!input.content || input.content.trim().length === 0) {
    errors.push('Comment content is required')
  } else if (input.content.length > COMMENT_VALIDATION.maxContentLength) {
    errors.push(`Comment must be ${COMMENT_VALIDATION.maxContentLength} characters or less`)
  }

  // Timestamp validation (only for create)
  if ('timestampSeconds' in input && input.timestampSeconds !== null && input.timestampSeconds !== undefined) {
    if (input.timestampSeconds < 0) {
      errors.push('Timestamp cannot be negative')
    }
    if (videoDuration !== undefined && input.timestampSeconds > videoDuration) {
      errors.push(`Timestamp cannot exceed video duration (${videoDuration}s)`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Format timestamp for display in comment
 */
export function formatCommentTimestamp(seconds: number | null): string {
  if (seconds === null) return ''

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Group comments by timestamp ranges (for timeline view)
 */
export function groupCommentsByTimestamp(
  comments: VideoComment[],
  bucketSizeSeconds: number = 10
): Map<number, VideoComment[]> {
  const groups = new Map<number, VideoComment[]>()

  for (const comment of comments) {
    if (comment.timestampSeconds === null) continue

    const bucket = Math.floor(comment.timestampSeconds / bucketSizeSeconds) * bucketSizeSeconds
    const existing = groups.get(bucket) || []
    existing.push(comment)
    groups.set(bucket, existing)
  }

  return groups
}

/**
 * Build threaded comment tree from flat list
 */
export function buildCommentTree(comments: VideoComment[]): VideoComment[] {
  const commentMap = new Map<string, VideoComment>()
  const rootComments: VideoComment[] = []

  // First pass: create map and initialize replies array
  for (const comment of comments) {
    commentMap.set(comment.id, { ...comment, replies: [] })
  }

  // Second pass: build tree
  for (const comment of comments) {
    const mappedComment = commentMap.get(comment.id)!

    if (comment.parentId && commentMap.has(comment.parentId)) {
      const parent = commentMap.get(comment.parentId)!
      parent.replies = parent.replies || []
      parent.replies.push(mappedComment)
    } else {
      rootComments.push(mappedComment)
    }
  }

  return rootComments
}
