/**
 * SMS Compliance - TCPA
 *
 * Handles TCPA compliance including quiet hours enforcement,
 * opt-out keyword detection, and compliance checks.
 *
 * @ai-pattern compliance
 * @ai-critical TCPA violations can result in significant fines
 */

import type { TenantSmsSettings } from './types.js'

// ============================================================================
// Opt-Out Keywords (TCPA mandated)
// ============================================================================

/**
 * Keywords that indicate opt-out request (case-insensitive)
 */
export const OPT_OUT_KEYWORDS = [
  'STOP',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
  'STOPALL',
  'STOP ALL',
] as const

/**
 * Keywords that indicate opt-in request (case-insensitive)
 */
export const OPT_IN_KEYWORDS = [
  'START',
  'YES',
  'UNSTOP',
  'SUBSCRIBE',
  'RESUME',
] as const

// ============================================================================
// Opt-Out Detection
// ============================================================================

/**
 * Check if a message body contains an opt-out keyword
 */
export function isOptOutMessage(messageBody: string): boolean {
  const normalized = messageBody.trim().toUpperCase()
  return OPT_OUT_KEYWORDS.some((keyword) => normalized === keyword)
}

/**
 * Check if a message body contains an opt-in keyword
 */
export function isOptInMessage(messageBody: string): boolean {
  const normalized = messageBody.trim().toUpperCase()
  return OPT_IN_KEYWORDS.some((keyword) => normalized === keyword)
}

// ============================================================================
// Quiet Hours (TCPA Compliance)
// ============================================================================

/**
 * Check if current time is within quiet hours for a tenant's settings
 *
 * TCPA requires no SMS between 9pm and 9am in recipient's local time.
 * We use the tenant's configured quiet hours (defaulting to 9pm-9am ET).
 */
export function isQuietHours(settings: TenantSmsSettings): boolean {
  if (!settings.quietHoursEnabled) {
    return false
  }

  try {
    // Get current time in the tenant's quiet hours timezone
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: settings.quietHoursTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const timeString = formatter.format(now)
    const timeParts = timeString.split(':')
    const currentHours = Number(timeParts[0]) || 0
    const currentMinutes = Number(timeParts[1]) || 0
    const currentTimeMinutes = currentHours * 60 + currentMinutes

    // Parse quiet hours
    const startParts = settings.quietHoursStart.split(':')
    const endParts = settings.quietHoursEnd.split(':')
    const startHours = Number(startParts[0]) || 0
    const startMinutes = Number(startParts[1]) || 0
    const endHours = Number(endParts[0]) || 0
    const endMinutes = Number(endParts[1]) || 0

    const quietStartMinutes = startHours * 60 + startMinutes
    const quietEndMinutes = endHours * 60 + endMinutes

    // Handle overnight quiet hours (e.g., 21:00 - 09:00)
    if (quietStartMinutes > quietEndMinutes) {
      // Quiet hours span midnight
      return currentTimeMinutes >= quietStartMinutes || currentTimeMinutes < quietEndMinutes
    } else {
      // Quiet hours within same day
      return currentTimeMinutes >= quietStartMinutes && currentTimeMinutes < quietEndMinutes
    }
  } catch {
    // If timezone is invalid, default to allowing sends
    // Log this in production
    return false
  }
}

/**
 * Get the next allowed send time after quiet hours
 */
export function getNextAllowedSendTime(settings: TenantSmsSettings): Date {
  if (!settings.quietHoursEnabled) {
    return new Date()
  }

  try {
    const now = new Date()

    // Parse quiet hours end time
    const endParts = settings.quietHoursEnd.split(':')
    const endHours = Number(endParts[0]) || 9
    const endMinutes = Number(endParts[1]) || 0

    // Get today's quiet hours end in the configured timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: settings.quietHoursTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    const dateString = formatter.format(now)
    const dateParts = dateString.split('/')
    const month = Number(dateParts[0]) || 1
    const day = Number(dateParts[1]) || 1
    const year = Number(dateParts[2]) || now.getFullYear()

    // Create date at quiet hours end
    // Note: This is an approximation - proper timezone handling would use a library
    const nextAllowed = new Date(year, month - 1, day, endHours, endMinutes)

    // If that time is in the past, add a day
    if (nextAllowed <= now) {
      nextAllowed.setDate(nextAllowed.getDate() + 1)
    }

    return nextAllowed
  } catch {
    // Default to 9am tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow
  }
}

/**
 * Get remaining quiet hours duration in minutes
 */
export function getQuietHoursRemainingMinutes(settings: TenantSmsSettings): number {
  if (!isQuietHours(settings)) {
    return 0
  }

  const nextAllowed = getNextAllowedSendTime(settings)
  const now = new Date()
  return Math.ceil((nextAllowed.getTime() - now.getTime()) / 60000)
}

// ============================================================================
// Phone Number Validation
// ============================================================================

/**
 * Validate E.164 phone number format
 * E.164: +[country code][number], max 15 digits
 */
export function isValidE164PhoneNumber(phoneNumber: string): boolean {
  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phoneNumber)
}

/**
 * Normalize a phone number to E.164 format
 * Assumes US numbers if no country code provided
 */
export function normalizeToE164(phoneNumber: string): string | null {
  // Remove all non-digit characters except leading +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '')

  // If starts with +, validate it's E.164
  if (cleaned.startsWith('+')) {
    return isValidE164PhoneNumber(cleaned) ? cleaned : null
  }

  // For US numbers without country code
  // Strip leading 1 if present, then add +1
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    cleaned = `+${cleaned}`
  } else if (cleaned.length === 10) {
    cleaned = `+1${cleaned}`
  } else {
    return null
  }

  return isValidE164PhoneNumber(cleaned) ? cleaned : null
}

/**
 * Mask a phone number for display (show last 4 digits)
 */
export function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length < 4) {
    return '****'
  }
  const lastFour = phoneNumber.slice(-4)
  const prefix = phoneNumber.slice(0, -4).replace(/\d/g, '*')
  return `${prefix}${lastFour}`
}

// ============================================================================
// Compliance Checks
// ============================================================================

/**
 * Skip reason for compliance violations
 */
export type ComplianceSkipReason =
  | 'quiet_hours'
  | 'recipient_opted_out'
  | 'invalid_phone_number'
  | 'sms_disabled'
  | 'daily_limit_exceeded'

/**
 * Compliance check result
 */
export interface ComplianceCheckResult {
  canSend: boolean
  skipReason?: ComplianceSkipReason
  retryAfter?: Date
}

/**
 * Perform all compliance checks before sending
 */
export function performComplianceChecks(
  settings: TenantSmsSettings,
  phoneNumber: string,
  isOptedOut: boolean
): ComplianceCheckResult {
  // Check if SMS is enabled
  if (!settings.smsEnabled) {
    return { canSend: false, skipReason: 'sms_disabled' }
  }

  // Check phone number validity
  if (!isValidE164PhoneNumber(phoneNumber)) {
    return { canSend: false, skipReason: 'invalid_phone_number' }
  }

  // Check opt-out status
  if (isOptedOut) {
    return { canSend: false, skipReason: 'recipient_opted_out' }
  }

  // Check quiet hours
  if (isQuietHours(settings)) {
    return {
      canSend: false,
      skipReason: 'quiet_hours',
      retryAfter: getNextAllowedSendTime(settings),
    }
  }

  return { canSend: true }
}

// ============================================================================
// SMS Character Counting
// ============================================================================

/**
 * Calculate segment count for SMS content
 * - Single segment: up to 160 GSM-7 chars or 70 UCS-2 chars
 * - Multi-segment: 153 GSM-7 chars or 67 UCS-2 chars per segment
 */
export function calculateSegmentCount(content: string): {
  characterCount: number
  segmentCount: number
  encoding: 'GSM-7' | 'UCS-2'
} {
  const characterCount = content.length

  // Check if content contains non-GSM-7 characters
  // GSM-7 basic character set (simplified check)
  const gsmRegex = /^[@\u00A3$\u00A5\u00E8\u00E9\u00F9\u00EC\u00F2\u00C7\n\u00D8\u00F8\r\u00C5\u00E5\u0394_\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039E\u00C6\u00E6\u00DF\u00C9 !"#\u00A4%&'()*+,\-./0123456789:;<=>?\u00A1A-Z\u00C4\u00D6\u00D1\u00DC\u00A7\u00BFa-z\u00E4\u00F6\u00F1\u00FC\u00E0^{}\\[\]~|\u20AC]*$/

  const isGsm7 = gsmRegex.test(content)
  const encoding: 'GSM-7' | 'UCS-2' = isGsm7 ? 'GSM-7' : 'UCS-2'

  let segmentCount: number

  if (isGsm7) {
    // GSM-7 encoding
    if (characterCount <= 160) {
      segmentCount = 1
    } else {
      segmentCount = Math.ceil(characterCount / 153)
    }
  } else {
    // UCS-2 encoding (for non-GSM characters like emojis)
    if (characterCount <= 70) {
      segmentCount = 1
    } else {
      segmentCount = Math.ceil(characterCount / 67)
    }
  }

  return { characterCount, segmentCount, encoding }
}

/**
 * Get max recommended character count for single segment
 */
export function getRecommendedMaxLength(content: string): number {
  const { encoding } = calculateSegmentCount(content)
  return encoding === 'GSM-7' ? 160 : 70
}

/**
 * Check if content exceeds recommended single-segment length
 */
export function exceedsSingleSegment(content: string): boolean {
  const { segmentCount } = calculateSegmentCount(content)
  return segmentCount > 1
}
