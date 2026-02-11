/**
 * Email approval parser for treasury draw requests
 *
 * Parses inbound email responses to determine approval/rejection status
 */

import type { EmailParseResult, ParsedStatus, ParsedConfidence } from './types'

// Approval keywords with weights
const APPROVAL_KEYWORDS = [
  { word: 'approved', weight: 10 },
  { word: 'approve', weight: 9 },
  { word: 'yes', weight: 7 },
  { word: 'ok', weight: 5 },
  { word: 'okay', weight: 5 },
  { word: 'confirmed', weight: 8 },
  { word: 'confirm', weight: 7 },
  { word: 'accept', weight: 8 },
  { word: 'accepted', weight: 9 },
  { word: 'authorized', weight: 9 },
  { word: 'authorize', weight: 8 },
  { word: 'proceed', weight: 6 },
  { word: 'go ahead', weight: 7 },
  { word: 'looks good', weight: 6 },
  { word: 'lgtm', weight: 8 },
  { word: 'good to go', weight: 7 },
  { word: 'signed', weight: 7 },
  { word: 'sign off', weight: 8 },
]

// Rejection keywords with weights
const REJECTION_KEYWORDS = [
  { word: 'rejected', weight: 10 },
  { word: 'reject', weight: 9 },
  { word: 'denied', weight: 10 },
  { word: 'deny', weight: 9 },
  { word: 'no', weight: 6 },
  { word: 'not approved', weight: 10 },
  { word: 'decline', weight: 9 },
  { word: 'declined', weight: 10 },
  { word: 'refuse', weight: 8 },
  { word: 'refused', weight: 9 },
  { word: 'cannot approve', weight: 10 },
  { word: "can't approve", weight: 10 },
  { word: 'unable to approve', weight: 10 },
  { word: 'hold off', weight: 7 },
  { word: 'wait', weight: 4 },
  { word: 'not yet', weight: 6 },
  { word: 'needs revision', weight: 8 },
  { word: 'need more info', weight: 7 },
]

// Neutral/unclear patterns
const UNCLEAR_PATTERNS = [
  /question/i,
  /clarif/i,
  /explain/i,
  /what.*mean/i,
  /don't understand/i,
  /confused/i,
  /maybe/i,
  /perhaps/i,
  /not sure/i,
  /let me think/i,
  /i'll get back/i,
]

/**
 * Parse an email body to determine approval status
 */
export function parseApprovalEmail(emailBody: string): EmailParseResult {
  const normalizedBody = emailBody.toLowerCase().trim()

  // Find matched keywords
  const matchedApprovalKeywords: string[] = []
  const matchedRejectionKeywords: string[] = []

  let approvalScore = 0
  let rejectionScore = 0

  // Check for approval keywords
  for (const { word, weight } of APPROVAL_KEYWORDS) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi')
    if (regex.test(normalizedBody)) {
      matchedApprovalKeywords.push(word)
      approvalScore += weight
    }
  }

  // Check for rejection keywords
  for (const { word, weight } of REJECTION_KEYWORDS) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi')
    if (regex.test(normalizedBody)) {
      matchedRejectionKeywords.push(word)
      rejectionScore += weight
    }
  }

  // Check for unclear patterns
  let hasUnclearSignals = false
  for (const pattern of UNCLEAR_PATTERNS) {
    if (pattern.test(normalizedBody)) {
      hasUnclearSignals = true
      break
    }
  }

  // Determine status and confidence
  const allMatchedKeywords = [...matchedApprovalKeywords, ...matchedRejectionKeywords]
  const scoreDifference = Math.abs(approvalScore - rejectionScore)
  const maxScore = Math.max(approvalScore, rejectionScore)

  let status: ParsedStatus
  let confidence: ParsedConfidence

  // No keywords found
  if (maxScore === 0) {
    return {
      status: 'unclear',
      confidence: 'low',
      matched_keywords: [],
      extracted_message: extractMessage(emailBody),
    }
  }

  // Determine status based on scores
  if (approvalScore > rejectionScore) {
    status = 'approved'
  } else if (rejectionScore > approvalScore) {
    status = 'rejected'
  } else {
    // Equal scores - unclear
    status = 'unclear'
  }

  // Determine confidence
  if (hasUnclearSignals && status !== 'unclear') {
    // Has unclear signals, reduce confidence
    confidence = scoreDifference >= 10 ? 'medium' : 'low'
  } else if (scoreDifference >= 15 && maxScore >= 10) {
    confidence = 'high'
  } else if (scoreDifference >= 8 || maxScore >= 7) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  // If confidence is low and status is determined, mark as unclear
  if (confidence === 'low' && status !== 'unclear' && maxScore < 6) {
    status = 'unclear'
  }

  return {
    status,
    confidence,
    matched_keywords: allMatchedKeywords,
    extracted_message: extractMessage(emailBody),
  }
}

/**
 * Extract the main message from an email body (remove quotes, signatures, etc.)
 */
function extractMessage(emailBody: string): string | null {
  const lines = emailBody.split('\n')
  const cleanLines: string[] = []
  let inQuotedSection = false

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Skip empty lines at the start
    if (cleanLines.length === 0 && trimmedLine === '') {
      continue
    }

    // Detect quoted section start
    if (
      trimmedLine.startsWith('>') ||
      trimmedLine.startsWith('On ') && trimmedLine.includes(' wrote:') ||
      trimmedLine.startsWith('From:') ||
      trimmedLine.startsWith('Sent:') ||
      trimmedLine.startsWith('-----Original Message-----') ||
      trimmedLine.startsWith('________________________________')
    ) {
      inQuotedSection = true
      continue
    }

    // Detect signature section
    if (
      trimmedLine.startsWith('--') ||
      trimmedLine.startsWith('Best,') ||
      trimmedLine.startsWith('Thanks,') ||
      trimmedLine.startsWith('Regards,') ||
      trimmedLine.startsWith('Best regards,') ||
      trimmedLine.startsWith('Sincerely,') ||
      trimmedLine.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/) // Name-like pattern
    ) {
      // End of main content
      break
    }

    if (!inQuotedSection) {
      cleanLines.push(trimmedLine)
    }
  }

  const message = cleanLines.join(' ').trim()
  return message.length > 0 ? message : null
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Validate that an email is from the expected treasurer
 */
export function validateSenderEmail(
  fromEmail: string,
  expectedEmail: string
): boolean {
  const normalizedFrom = fromEmail.toLowerCase().trim()
  const normalizedExpected = expectedEmail.toLowerCase().trim()

  // Direct match
  if (normalizedFrom === normalizedExpected) {
    return true
  }

  // Extract email from "Name <email>" format
  const emailMatch = normalizedFrom.match(/<([^>]+)>/)
  if (emailMatch && emailMatch[1] === normalizedExpected) {
    return true
  }

  return false
}

/**
 * Extract request ID from email subject
 */
export function extractRequestIdFromSubject(subject: string): string | null {
  // Match patterns like "RE: Draw Request DR-2024-0001" or "Draw Request #DR-2024-0001"
  const patterns = [
    /DR-\d{4}-\d{4}/i,
    /request[:\s#]*([a-z0-9-]+)/i,
    /\[([a-z0-9-]+)\]/i,
  ]

  for (const pattern of patterns) {
    const match = subject.match(pattern)
    if (match) {
      return match[0] || match[1] || null
    }
  }

  return null
}

/**
 * Check if email appears to be an auto-reply/out-of-office
 */
export function isAutoReply(
  subject: string,
  body: string,
  headers?: Record<string, string>
): boolean {
  const subjectLower = subject.toLowerCase()
  const bodyLower = body.toLowerCase()

  // Check headers
  if (headers) {
    if (headers['Auto-Submitted'] && headers['Auto-Submitted'] !== 'no') {
      return true
    }
    if (headers['X-Auto-Response-Suppress']) {
      return true
    }
  }

  // Check subject patterns
  const autoReplySubjects = [
    'out of office',
    'automatic reply',
    'auto-reply',
    'autoreply',
    'away from office',
    'on vacation',
    'delivery status notification',
    'undeliverable',
    'delivery failure',
  ]

  for (const pattern of autoReplySubjects) {
    if (subjectLower.includes(pattern)) {
      return true
    }
  }

  // Check body patterns
  const autoReplyBodies = [
    'i am currently out of the office',
    'i am away from the office',
    'this is an automated response',
    'this is an automatic reply',
    'i will be out of office',
    'i will respond to your email when i return',
  ]

  for (const pattern of autoReplyBodies) {
    if (bodyLower.includes(pattern)) {
      return true
    }
  }

  return false
}
