/**
 * @cgk/video - Video Reactions Types
 *
 * Type definitions for emoji reactions at video timestamps.
 */

/**
 * Video reaction entity
 */
export interface VideoReaction {
  id: string
  tenantId: string
  videoId: string
  userId: string
  emoji: string
  timestampSeconds: number | null
  createdAt: Date
}

/**
 * Input for adding a reaction
 */
export interface AddReactionInput {
  emoji: string
  timestampSeconds?: number | null
}

/**
 * Aggregated reaction summary
 */
export interface ReactionSummary {
  emoji: string
  count: number
  users: Array<{ userId: string; userName?: string }>
  hasReacted: boolean
}

/**
 * Reactions at a specific timestamp
 */
export interface TimestampReactions {
  timestampSeconds: number
  reactions: ReactionSummary[]
  totalCount: number
}

/**
 * Standard emoji set for video reactions
 */
export const REACTION_EMOJIS = [
  { emoji: '\u{1F44D}', label: 'Thumbs Up', shortcut: '1' },     // 👍
  { emoji: '\u{2764}\u{FE0F}', label: 'Heart', shortcut: '2' },         // ❤️
  { emoji: '\u{1F60D}', label: 'Heart Eyes', shortcut: '3' },    // 😍
  { emoji: '\u{1F923}', label: 'Laughing', shortcut: '4' },      // 🤣
  { emoji: '\u{1F44F}', label: 'Clapping', shortcut: '5' },      // 👏
  { emoji: '\u{1F525}', label: 'Fire', shortcut: '6' },          // 🔥
  { emoji: '\u{1F389}', label: 'Party', shortcut: '7' },         // 🎉
  { emoji: '\u{1F914}', label: 'Thinking', shortcut: '8' },      // 🤔
] as const

/**
 * Allowed emoji type (union of all reaction emojis)
 */
export type AllowedEmoji = (typeof REACTION_EMOJIS)[number]['emoji']

/**
 * Emoji set as array of strings
 */
export const ALLOWED_EMOJIS: readonly AllowedEmoji[] = REACTION_EMOJIS.map((r) => r.emoji)

/**
 * Validate reaction input
 */
export function validateReactionInput(
  input: AddReactionInput,
  videoDuration?: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Emoji validation
  if (!input.emoji || input.emoji.trim().length === 0) {
    errors.push('Emoji is required')
  } else if (!ALLOWED_EMOJIS.includes(input.emoji as AllowedEmoji)) {
    errors.push('Invalid emoji. Please use one of the allowed emojis.')
  }

  // Timestamp validation
  if (
    input.timestampSeconds !== null &&
    input.timestampSeconds !== undefined
  ) {
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
 * Get emoji label by emoji character
 */
export function getEmojiLabel(emoji: string): string {
  const found = REACTION_EMOJIS.find((r) => r.emoji === emoji)
  return found?.label || 'Reaction'
}

/**
 * Group reactions by timestamp for timeline visualization
 */
export function groupReactionsByTimestamp(
  reactions: VideoReaction[],
  bucketSizeSeconds: number = 5
): Map<number, VideoReaction[]> {
  const groups = new Map<number, VideoReaction[]>()

  for (const reaction of reactions) {
    if (reaction.timestampSeconds === null) continue

    const bucket =
      Math.floor(reaction.timestampSeconds / bucketSizeSeconds) * bucketSizeSeconds
    const existing = groups.get(bucket) || []
    existing.push(reaction)
    groups.set(bucket, existing)
  }

  return groups
}

/**
 * Calculate reaction density along timeline
 */
export function calculateReactionDensity(
  reactions: VideoReaction[],
  videoDuration: number,
  bucketCount: number = 100
): number[] {
  const density = new Array(bucketCount).fill(0)
  const bucketSize = videoDuration / bucketCount

  for (const reaction of reactions) {
    if (reaction.timestampSeconds === null) continue
    const bucketIndex = Math.min(
      Math.floor(reaction.timestampSeconds / bucketSize),
      bucketCount - 1
    )
    density[bucketIndex]++
  }

  // Normalize to 0-1 range
  const maxDensity = Math.max(...density, 1)
  return density.map((d) => d / maxDensity)
}
