/**
 * @cgk-platform/video - Video Trimming Types
 *
 * Type definitions for video clipping and trimming operations.
 */

/**
 * Request to trim/clip a video
 */
export interface TrimRequest {
  /** Start time in seconds */
  startTime: number
  /** End time in seconds */
  endTime: number
  /** Create new video vs replace original (always creates new for safety) */
  saveAsNew: boolean
  /** Optional title for the new clip */
  newTitle?: string
}

/**
 * Result of a trim operation
 */
export interface TrimResult {
  success: boolean
  /** ID of the newly created video record */
  newVideoId: string
  /** Mux asset ID of the new clip */
  newMuxAssetId: string
  /** Duration of the new clip in seconds */
  duration: number
  /** Playback ID for the new clip */
  playbackId: string
  /** Error message if failed */
  error?: string
}

/**
 * Trim operation status
 */
export type TrimStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Trim job record
 */
export interface TrimJob {
  id: string
  tenantId: string
  userId: string
  sourceVideoId: string
  newVideoId: string | null
  startTime: number
  endTime: number
  status: TrimStatus
  errorMessage: string | null
  createdAt: Date
  completedAt: Date | null
}

/**
 * Validate trim request
 */
export function validateTrimRequest(
  request: TrimRequest,
  videoDuration: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (request.startTime < 0) {
    errors.push('Start time cannot be negative')
  }

  if (request.endTime <= request.startTime) {
    errors.push('End time must be greater than start time')
  }

  if (request.endTime > videoDuration) {
    errors.push(`End time cannot exceed video duration (${videoDuration}s)`)
  }

  const clipDuration = request.endTime - request.startTime
  if (clipDuration < 1) {
    errors.push('Clip must be at least 1 second long')
  }

  if (clipDuration > 7200) {
    errors.push('Clip cannot exceed 2 hours')
  }

  if (request.newTitle && request.newTitle.length > 200) {
    errors.push('Title must be 200 characters or less')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Timeline marker for UI
 */
export interface TimelineMarker {
  time: number
  type: 'start' | 'end' | 'chapter' | 'comment'
  label?: string
}

/**
 * Format seconds as MM:SS or HH:MM:SS
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Parse timestamp string to seconds
 */
export function parseTimestamp(timestamp: string): number | null {
  const parts = timestamp.split(':').map((p) => parseInt(p, 10))

  if (parts.some(isNaN)) {
    return null
  }

  if (parts.length === 2) {
    // MM:SS
    const mins = parts[0]
    const secs = parts[1]
    if (mins === undefined || secs === undefined) return null
    return mins * 60 + secs
  } else if (parts.length === 3) {
    // HH:MM:SS
    const hrs = parts[0]
    const mins = parts[1]
    const secs = parts[2]
    if (hrs === undefined || mins === undefined || secs === undefined) return null
    return hrs * 3600 + mins * 60 + secs
  }

  return null
}
