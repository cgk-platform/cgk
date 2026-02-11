/**
 * Treasury Approval Email Parser
 *
 * Parses inbound emails for treasury approval/rejection keywords.
 * Uses pattern matching with confidence scoring.
 *
 * @ai-pattern inbound-email
 * @ai-note Auto-replies are detected and ignored
 */

import type { ApprovalConfidence, ApprovalParseResult, ApprovalStatus } from './types.js'

// ============================================================================
// Keyword Definitions
// ============================================================================

/**
 * Keywords for approval detection with confidence levels
 */
export const APPROVAL_KEYWORDS = {
  high_confidence_approve: [
    'approved',
    'i approve',
    'yes, approved',
    'confirmed',
    'authorized',
    'go ahead',
    'proceed',
    'looks good',
    'lgtm',
    'all good',
    'approved as requested',
    'please proceed',
    'you may proceed',
    'permission granted',
    'authorized for payment',
  ],
  medium_confidence_approve: [
    'ok',
    'okay',
    'fine',
    'sure',
    'yes',
    'good to go',
    'makes sense',
    'sounds good',
    'that works',
    'agree',
    'acceptable',
    'no objections',
    'go for it',
  ],
  high_confidence_reject: [
    'rejected',
    'denied',
    'not approved',
    'declined',
    'refused',
    'no',
    'cancel',
    'stop',
    'do not proceed',
    'cannot approve',
    'will not approve',
    'disapproved',
    'request denied',
    'permission denied',
  ],
  medium_confidence_reject: [
    'wait',
    'hold',
    'pause',
    'need more info',
    'not yet',
    'hold off',
    'let me check',
    'need clarification',
    'questions about',
    'concerns about',
    'please explain',
  ],
} as const

/**
 * Patterns that indicate auto-reply emails
 */
export const AUTO_REPLY_PATTERNS = [
  /out of (the )?office/i,
  /automatic reply/i,
  /auto-?reply/i,
  /autoreply/i,
  /away from (my )?email/i,
  /on (annual |vacation )?leave/i,
  /will respond when/i,
  /i am currently unavailable/i,
  /i('m| am) out of the office/i,
  /this is an automated/i,
  /do not reply to this email/i,
  /this email was sent automatically/i,
  /vacation auto-?response/i,
  /currently traveling/i,
  /limited access to email/i,
]

/**
 * Subject patterns that indicate auto-reply
 */
export const AUTO_REPLY_SUBJECT_PATTERNS = [
  /^re:.*out of office/i,
  /^auto(matic)?(-| )?reply/i,
  /^ooo:/i,
  /^away:/i,
  /^vacation:/i,
]

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Check if an email is an auto-reply
 */
export function isAutoReply(subject: string, body: string): boolean {
  // Check subject patterns
  for (const pattern of AUTO_REPLY_SUBJECT_PATTERNS) {
    if (pattern.test(subject)) {
      return true
    }
  }

  // Check body patterns
  const fullText = `${subject} ${body}`.toLowerCase()
  for (const pattern of AUTO_REPLY_PATTERNS) {
    if (pattern.test(fullText)) {
      return true
    }
  }

  return false
}

/**
 * Extract keywords from text
 */
function findMatchingKeywords(
  text: string,
  keywords: readonly string[]
): string[] {
  const normalizedText = text.toLowerCase()
  const matched: string[] = []

  for (const keyword of keywords) {
    // Match whole words/phrases
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i')
    if (regex.test(normalizedText)) {
      matched.push(keyword)
    }
  }

  return matched
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Parse treasury approval email
 *
 * Analyzes subject and body for approval/rejection keywords.
 * Returns status with confidence level.
 *
 * @param subject - Email subject
 * @param body - Email body text
 * @returns Parse result with status, confidence, and matched keywords
 */
export function parseTreasuryApproval(
  subject: string,
  body: string
): ApprovalParseResult {
  // Check for auto-reply first
  if (isAutoReply(subject, body)) {
    return {
      status: 'unclear',
      confidence: 'low',
      matchedKeywords: ['auto_reply_detected'],
      isAutoReply: true,
    }
  }

  const fullText = `${subject} ${body}`

  // Find all matching keywords
  const highApprove = findMatchingKeywords(fullText, APPROVAL_KEYWORDS.high_confidence_approve)
  const mediumApprove = findMatchingKeywords(fullText, APPROVAL_KEYWORDS.medium_confidence_approve)
  const highReject = findMatchingKeywords(fullText, APPROVAL_KEYWORDS.high_confidence_reject)
  const mediumReject = findMatchingKeywords(fullText, APPROVAL_KEYWORDS.medium_confidence_reject)

  // Calculate scores
  const approveScore = highApprove.length * 2 + mediumApprove.length
  const rejectScore = highReject.length * 2 + mediumReject.length

  // Determine result based on scores
  let status: ApprovalStatus = 'unclear'
  let confidence: ApprovalConfidence = 'low'
  let matchedKeywords: string[] = []

  if (approveScore > 0 && rejectScore === 0) {
    // Clear approval
    status = 'approved'
    confidence = highApprove.length > 0 ? 'high' : 'medium'
    matchedKeywords = [...highApprove, ...mediumApprove]
  } else if (rejectScore > 0 && approveScore === 0) {
    // Clear rejection
    status = 'rejected'
    confidence = highReject.length > 0 ? 'high' : 'medium'
    matchedKeywords = [...highReject, ...mediumReject]
  } else if (approveScore > 0 && rejectScore > 0) {
    // Mixed signals - use the stronger one with lower confidence
    if (approveScore > rejectScore) {
      status = 'approved'
      confidence = 'low'
      matchedKeywords = [...highApprove, ...mediumApprove]
    } else if (rejectScore > approveScore) {
      status = 'rejected'
      confidence = 'low'
      matchedKeywords = [...highReject, ...mediumReject]
    } else {
      // Equal scores - unclear
      status = 'unclear'
      confidence = 'low'
      matchedKeywords = [
        ...highApprove,
        ...mediumApprove,
        ...highReject,
        ...mediumReject,
      ]
    }
  }

  return {
    status,
    confidence,
    matchedKeywords,
    isAutoReply: false,
  }
}

/**
 * Extract treasury request ID from email subject
 *
 * Expects format: "...[#SBA-202412-001]..." or "Re: ... #SBA-202412-001"
 * Pattern: SBA-YYYYMM-NNN
 *
 * @param subject - Email subject line
 * @returns Treasury request ID or null
 */
export function extractTreasuryRequestId(subject: string): string | null {
  // Try bracket format first: [#SBA-202412-001]
  const bracketMatch = subject.match(/\[#?(SBA-\d{6}-\d{3})\]/i)
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1].toUpperCase()
  }

  // Try hash format: #SBA-202412-001
  const hashMatch = subject.match(/#(SBA-\d{6}-\d{3})/i)
  if (hashMatch && hashMatch[1]) {
    return hashMatch[1].toUpperCase()
  }

  // Try plain format: SBA-202412-001
  const plainMatch = subject.match(/\b(SBA-\d{6}-\d{3})\b/i)
  if (plainMatch && plainMatch[1]) {
    return plainMatch[1].toUpperCase()
  }

  return null
}

/**
 * Validate treasury request ID format
 */
export function isValidTreasuryRequestId(id: string): boolean {
  return /^SBA-\d{6}-\d{3}$/.test(id)
}

/**
 * Get a human-readable summary of the parse result
 */
export function getParseResultSummary(result: ApprovalParseResult): string {
  if (result.isAutoReply) {
    return 'Auto-reply detected - no action taken'
  }

  const statusText = {
    approved: 'Approved',
    rejected: 'Rejected',
    unclear: 'Unclear',
  }[result.status]

  const confidenceText = {
    high: 'high confidence',
    medium: 'medium confidence',
    low: 'low confidence',
  }[result.confidence]

  if (result.status === 'unclear') {
    return `Unable to determine approval status (${confidenceText})`
  }

  const keywordsText =
    result.matchedKeywords.length > 0
      ? ` - matched: ${result.matchedKeywords.slice(0, 3).join(', ')}${
          result.matchedKeywords.length > 3 ? '...' : ''
        }`
      : ''

  return `${statusText} (${confidenceText})${keywordsText}`
}
