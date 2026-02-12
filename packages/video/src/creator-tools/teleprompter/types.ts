/**
 * @cgk/video - Teleprompter Types
 *
 * Type definitions for teleprompter scripts and settings.
 */

/**
 * Teleprompter script entity
 */
export interface TeleprompterScript {
  id: string
  tenantId: string
  userId: string
  title: string
  content: string
  scrollSpeed: number
  fontSize: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating a script
 */
export interface CreateScriptInput {
  title: string
  content: string
  scrollSpeed?: number
  fontSize?: number
}

/**
 * Input for updating a script
 */
export interface UpdateScriptInput {
  title?: string
  content?: string
  scrollSpeed?: number
  fontSize?: number
}

/**
 * Teleprompter display settings
 */
export interface TeleprompterSettings {
  scrollSpeed: number
  fontSize: number
  backgroundColor: string
  textColor: string
  mirrorMode: boolean
  showProgress: boolean
  lineHeight: number
  fontFamily: string
}

/**
 * Default teleprompter settings
 */
export const DEFAULT_TELEPROMPTER_SETTINGS: TeleprompterSettings = {
  scrollSpeed: 3,
  fontSize: 32,
  backgroundColor: '#0a0a0c',
  textColor: '#f0f0f4',
  mirrorMode: false,
  showProgress: true,
  lineHeight: 1.6,
  fontFamily: 'system-ui, -apple-system, sans-serif',
}

/**
 * Scroll speed range (1-10)
 */
export const SCROLL_SPEED_MIN = 1
export const SCROLL_SPEED_MAX = 10

/**
 * Font size range (16-72 pixels)
 */
export const FONT_SIZE_MIN = 16
export const FONT_SIZE_MAX = 72

/**
 * Calculate actual scroll pixels per second from speed (1-10)
 * Speed 1 = 20px/s (very slow)
 * Speed 5 = 60px/s (normal)
 * Speed 10 = 120px/s (very fast)
 */
export function calculateScrollRate(speed: number): number {
  const clampedSpeed = Math.max(SCROLL_SPEED_MIN, Math.min(SCROLL_SPEED_MAX, speed))
  return 20 + (clampedSpeed - 1) * 11.1 // 20 to 120 range
}

/**
 * Validate script input
 */
export function validateScriptInput(
  input: CreateScriptInput | UpdateScriptInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if ('title' in input && input.title !== undefined) {
    if (input.title.length === 0) {
      errors.push('Title is required')
    } else if (input.title.length > 200) {
      errors.push('Title must be 200 characters or less')
    }
  }

  if ('content' in input && input.content !== undefined) {
    if (input.content.length === 0) {
      errors.push('Script content is required')
    } else if (input.content.length > 50000) {
      errors.push('Script content must be 50,000 characters or less')
    }
  }

  if ('scrollSpeed' in input && input.scrollSpeed !== undefined) {
    if (input.scrollSpeed < SCROLL_SPEED_MIN || input.scrollSpeed > SCROLL_SPEED_MAX) {
      errors.push(`Scroll speed must be between ${SCROLL_SPEED_MIN} and ${SCROLL_SPEED_MAX}`)
    }
  }

  if ('fontSize' in input && input.fontSize !== undefined) {
    if (input.fontSize < FONT_SIZE_MIN || input.fontSize > FONT_SIZE_MAX) {
      errors.push(`Font size must be between ${FONT_SIZE_MIN} and ${FONT_SIZE_MAX}`)
    }
  }

  return { valid: errors.length === 0, errors }
}
