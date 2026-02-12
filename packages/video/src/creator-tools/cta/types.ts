/**
 * @cgk/video - CTA Button Types
 *
 * Type definitions for video call-to-action buttons.
 */

/**
 * CTA button style variants
 */
export type CTAStyle = 'primary' | 'secondary' | 'outline'

/**
 * CTA button position
 */
export type CTAPosition = 'start' | 'end' | 'overlay'

/**
 * CTA button entity
 */
export interface CTAButton {
  id: string
  tenantId: string
  videoId: string
  label: string
  url: string
  style: CTAStyle
  position: CTAPosition
  showAtSeconds: number | null
  hideAtSeconds: number | null
  sortOrder: number
  createdAt: Date
}

/**
 * Input for creating/updating a CTA button
 */
export interface CTAButtonInput {
  label: string
  url: string
  style?: CTAStyle
  position?: CTAPosition
  showAtSeconds?: number | null
  hideAtSeconds?: number | null
  sortOrder?: number
}

/**
 * CTA validation rules
 */
export const CTA_VALIDATION = {
  maxButtons: 3,
  maxLabelLength: 50,
  urlPattern: /^https?:\/\/.+/,
  allowedStyles: ['primary', 'secondary', 'outline'] as const,
  allowedPositions: ['start', 'end', 'overlay'] as const,
} as const

/**
 * Validate CTA button input
 */
export function validateCTAInput(
  input: CTAButtonInput,
  videoDuration?: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Label validation
  if (!input.label || input.label.trim().length === 0) {
    errors.push('Button label is required')
  } else if (input.label.length > CTA_VALIDATION.maxLabelLength) {
    errors.push(`Button label must be ${CTA_VALIDATION.maxLabelLength} characters or less`)
  }

  // URL validation
  if (!input.url || input.url.trim().length === 0) {
    errors.push('Button URL is required')
  } else if (!CTA_VALIDATION.urlPattern.test(input.url)) {
    errors.push('Button URL must start with http:// or https://')
  }

  // Style validation
  if (input.style && !CTA_VALIDATION.allowedStyles.includes(input.style)) {
    errors.push(`Style must be one of: ${CTA_VALIDATION.allowedStyles.join(', ')}`)
  }

  // Position validation
  if (input.position && !CTA_VALIDATION.allowedPositions.includes(input.position)) {
    errors.push(`Position must be one of: ${CTA_VALIDATION.allowedPositions.join(', ')}`)
  }

  // Overlay timing validation
  if (input.position === 'overlay') {
    if (input.showAtSeconds === null || input.showAtSeconds === undefined) {
      errors.push('Overlay position requires showAtSeconds')
    } else {
      if (input.showAtSeconds < 0) {
        errors.push('showAtSeconds cannot be negative')
      }

      if (
        input.hideAtSeconds !== null &&
        input.hideAtSeconds !== undefined &&
        input.hideAtSeconds <= input.showAtSeconds
      ) {
        errors.push('hideAtSeconds must be greater than showAtSeconds')
      }

      if (videoDuration !== undefined) {
        if (input.showAtSeconds > videoDuration) {
          errors.push(`showAtSeconds cannot exceed video duration (${videoDuration}s)`)
        }
        if (
          input.hideAtSeconds !== null &&
          input.hideAtSeconds !== undefined &&
          input.hideAtSeconds > videoDuration
        ) {
          errors.push(`hideAtSeconds cannot exceed video duration (${videoDuration}s)`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Check if a CTA button should be visible at a given playback time
 */
export function isCTAVisible(button: CTAButton, currentTime: number, videoDuration: number): boolean {
  switch (button.position) {
    case 'start':
      return currentTime < 1
    case 'end':
      return currentTime >= videoDuration - 1
    case 'overlay':
      if (button.showAtSeconds === null) return false
      if (currentTime < button.showAtSeconds) return false
      if (button.hideAtSeconds !== null && currentTime >= button.hideAtSeconds) return false
      return true
    default:
      return false
  }
}

/**
 * Default CTA button values
 */
export const DEFAULT_CTA_VALUES: Partial<CTAButton> = {
  style: 'primary',
  position: 'end',
  showAtSeconds: null,
  hideAtSeconds: null,
  sortOrder: 0,
}

/**
 * CTA button style configurations for UI rendering
 */
export const CTA_STYLE_CONFIG = {
  primary: {
    className: 'bg-amber-500 hover:bg-amber-400 text-black font-semibold',
    label: 'Primary',
    description: 'High-visibility button with amber background',
  },
  secondary: {
    className: 'bg-zinc-700 hover:bg-zinc-600 text-white font-semibold',
    label: 'Secondary',
    description: 'Subtle button with dark background',
  },
  outline: {
    className: 'border-2 border-white/80 hover:bg-white/10 text-white font-semibold',
    label: 'Outline',
    description: 'Transparent button with border',
  },
} as const

/**
 * CTA position configurations for UI rendering
 */
export const CTA_POSITION_CONFIG = {
  start: {
    label: 'Before Video',
    description: 'Display before video starts playing',
  },
  end: {
    label: 'After Video',
    description: 'Display after video finishes',
  },
  overlay: {
    label: 'During Playback',
    description: 'Display at a specific time during playback',
  },
} as const
