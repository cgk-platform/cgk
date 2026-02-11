/**
 * Auto-Reply and Spam Detection
 *
 * Detects out-of-office replies, automated responses, and spam.
 *
 * @ai-pattern inbound-email
 * @ai-note Used to filter out emails that shouldn't be processed
 */

// ============================================================================
// Auto-Reply Detection
// ============================================================================

/**
 * Patterns in email headers that indicate auto-reply
 */
export const AUTO_REPLY_HEADER_VALUES = [
  'auto-replied',
  'auto-generated',
  'auto-notified',
  'auto-submitted',
  'auto_reply',
] as const

/**
 * Precedence header values that indicate automated email
 */
export const AUTOMATED_PRECEDENCE_VALUES = [
  'bulk',
  'junk',
  'auto_reply',
  'list',
] as const

/**
 * Subject line prefixes that indicate auto-reply
 */
export const AUTO_REPLY_SUBJECT_PREFIXES = [
  'auto:',
  'automatic reply:',
  'autoreply:',
  'auto-reply:',
  'ooo:',
  'out of office:',
  'away:',
  'vacation:',
  'undeliverable:',
  'delivery status notification',
  'failure notice:',
  'returned mail:',
  'mail delivery failed:',
] as const

/**
 * Body content patterns indicating auto-reply
 */
export const AUTO_REPLY_BODY_PATTERNS = [
  // Out of office
  /out of (the )?office/i,
  /currently (out of office|away|traveling|on vacation)/i,
  /away from (my )?email/i,
  /on (annual |vacation |medical )?leave/i,
  /will (be |respond |return )(back |when |on )/i,
  /limited access to email/i,

  // Auto-response indicators
  /this is an auto(matic|mated)?(-| )?(reply|response|notification)/i,
  /auto(matic)?(-| )?(reply|response|notification)/i,
  /do not reply to this (email|message)/i,
  /this (email|message) was sent automatically/i,
  /this is a no(-| )?reply/i,
  /unattended mailbox/i,
  /automated (email|message|response)/i,

  // Delivery failures
  /delivery (status|failure) notification/i,
  /mail delivery failed/i,
  /undeliverable/i,
  /message could not be delivered/i,
  /permanent failure/i,
  /mailbox (full|unavailable|not found)/i,
  /address rejected/i,
] as const

// ============================================================================
// Spam Detection
// ============================================================================

/**
 * Spam indicator patterns
 */
export const SPAM_PATTERNS = [
  // Common spam phrases
  /click here (to|for) (unsubscribe|claim|win)/i,
  /you have (been selected|won)/i,
  /congratulations[,!]? you/i,
  /act now/i,
  /limited time (only|offer)/i,
  /100% free/i,
  /no obligation/i,
  /risk free/i,
  /satisfaction guaranteed/i,
  /special promotion/i,
  /urgent (response )?required/i,

  // Financial spam
  /earn \$[\d,]+/i,
  /make money (fast|online)/i,
  /work from home (opportunity)?/i,
  /million dollars/i,
  /wire transfer/i,
  /inheritance/i,
  /nigerian prince/i,

  // Phishing indicators
  /verify your (account|identity|email)/i,
  /your account (has been|will be) (suspended|closed)/i,
  /confirm your password/i,
  /update your (payment|billing) information/i,
  /unusual activity detected/i,
  /security alert/i,

  // Marketing spam
  /dear (valued )?customer/i,
  /unsubscribe from (this|our) (list|newsletter)/i,
] as const

/**
 * Suspicious sender patterns
 */
export const SUSPICIOUS_SENDER_PATTERNS = [
  /noreply@/i,
  /no-reply@/i,
  /donotreply@/i,
  /mailer-daemon@/i,
  /postmaster@/i,
  /mail-delivery@/i,
  /bounce@/i,
] as const

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Check if subject indicates auto-reply
 */
export function isAutoReplySubject(subject: string): boolean {
  const normalizedSubject = subject.toLowerCase().trim()

  for (const prefix of AUTO_REPLY_SUBJECT_PREFIXES) {
    if (normalizedSubject.startsWith(prefix.toLowerCase())) {
      return true
    }
  }

  return false
}

/**
 * Check if body contains auto-reply patterns
 */
export function hasAutoReplyBody(body: string): boolean {
  for (const pattern of AUTO_REPLY_BODY_PATTERNS) {
    if (pattern.test(body)) {
      return true
    }
  }

  return false
}

/**
 * Check if sender is a no-reply address
 */
export function isNoReplySender(fromAddress: string): boolean {
  for (const pattern of SUSPICIOUS_SENDER_PATTERNS) {
    if (pattern.test(fromAddress)) {
      return true
    }
  }

  return false
}

/**
 * Comprehensive auto-reply detection
 *
 * @param email - Email data
 * @returns True if email is likely an auto-reply
 */
export function detectAutoReply(email: {
  from?: string
  subject?: string
  bodyText?: string
  headers?: Record<string, string>
}): boolean {
  // Check headers if available
  if (email.headers) {
    // Check X-Auto-Response-Suppress header
    const autoResponseSuppress = email.headers['x-auto-response-suppress']
    if (autoResponseSuppress) {
      return true
    }

    // Check Auto-Submitted header
    const autoSubmitted = email.headers['auto-submitted']
    if (autoSubmitted && autoSubmitted !== 'no') {
      return true
    }

    // Check Precedence header
    const precedence = email.headers['precedence']?.toLowerCase()
    if (
      precedence &&
      AUTOMATED_PRECEDENCE_VALUES.includes(precedence as typeof AUTOMATED_PRECEDENCE_VALUES[number])
    ) {
      return true
    }

    // Check X-Autoreply header
    const xAutoreply = email.headers['x-autoreply']
    if (xAutoreply) {
      return true
    }
  }

  // Check sender
  if (email.from && isNoReplySender(email.from)) {
    return true
  }

  // Check subject
  if (email.subject && isAutoReplySubject(email.subject)) {
    return true
  }

  // Check body
  if (email.bodyText && hasAutoReplyBody(email.bodyText)) {
    return true
  }

  return false
}

/**
 * Calculate spam score for an email
 *
 * @param email - Email data
 * @returns Spam score between 0 and 1
 */
export function calculateSpamScore(email: {
  from?: string
  subject?: string
  bodyText?: string
}): number {
  let score = 0
  const maxScore = 10

  const fullText = `${email.subject || ''} ${email.bodyText || ''}`.toLowerCase()

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(fullText)) {
      score += 1
    }
  }

  // Check for excessive punctuation
  const exclamationCount = (fullText.match(/!/g) || []).length
  if (exclamationCount > 3) {
    score += 1
  }

  // Check for ALL CAPS words
  const capsWords = (fullText.match(/\b[A-Z]{4,}\b/g) || []).length
  if (capsWords > 3) {
    score += 1
  }

  // Check for suspicious sender
  if (email.from && isNoReplySender(email.from)) {
    score += 0.5
  }

  // Normalize to 0-1 range
  return Math.min(score / maxScore, 1)
}

/**
 * Determine if email is likely spam
 *
 * @param spamScore - Spam score from calculateSpamScore
 * @param threshold - Score threshold (default 0.5)
 * @returns True if score exceeds threshold
 */
export function isLikelySpam(spamScore: number, threshold = 0.5): boolean {
  return spamScore >= threshold
}

/**
 * Full email analysis result
 */
export interface EmailAnalysisResult {
  isAutoReply: boolean
  isSpam: boolean
  spamScore: number
  shouldProcess: boolean
  reason?: string
}

/**
 * Analyze email for auto-reply and spam
 *
 * @param email - Email data
 * @returns Analysis result
 */
export function analyzeEmail(email: {
  from?: string
  subject?: string
  bodyText?: string
  headers?: Record<string, string>
}): EmailAnalysisResult {
  const isAutoReply = detectAutoReply(email)
  const spamScore = calculateSpamScore(email)
  const isSpam = isLikelySpam(spamScore)

  let shouldProcess = true
  let reason: string | undefined

  if (isAutoReply) {
    shouldProcess = false
    reason = 'Auto-reply detected'
  } else if (isSpam) {
    shouldProcess = false
    reason = `Spam score too high (${(spamScore * 100).toFixed(0)}%)`
  }

  return {
    isAutoReply,
    isSpam,
    spamScore,
    shouldProcess,
    reason,
  }
}
