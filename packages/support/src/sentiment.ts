/**
 * Sentiment Analysis for Support Tickets
 * Phase 2SP-TICKETS
 *
 * Uses Claude API for AI-powered sentiment analysis with keyword-based fallback
 */

import { sql, withTenant } from '@cgk/db'

import type { SentimentAlert, SentimentAnalysisResult, TicketPriority } from './types'

// Sentiment thresholds for actions
const THRESHOLDS = {
  ESCALATE_SCORE: -0.7, // Auto-escalate to HIGH priority
  ESCALATE_CONFIDENCE: 0.8,
  ALERT_SCORE: -0.5, // Create sentiment alert
  ALERT_CONFIDENCE: 0.8,
}

// Negative sentiment keywords for fallback analysis
const NEGATIVE_KEYWORDS = [
  // Frustration
  'frustrated',
  'frustrating',
  'annoyed',
  'annoying',
  'angry',
  'furious',
  'upset',
  'disappointed',
  'disappointed',
  'unacceptable',
  // Urgency/Problems
  'urgent',
  'emergency',
  'asap',
  'immediately',
  'critical',
  'broken',
  'not working',
  "doesn't work",
  "won't work",
  'failed',
  'failure',
  'error',
  // Threats/Escalation
  'lawyer',
  'legal',
  'sue',
  'refund',
  'chargeback',
  'cancel',
  'cancellation',
  'bbb',
  'attorney',
  'complaint',
  'report',
  // Strong negatives
  'terrible',
  'horrible',
  'awful',
  'worst',
  'hate',
  'never',
  'scam',
  'fraud',
  'rip off',
  'ripoff',
  'waste',
  // Time complaints
  'waited',
  'waiting',
  'still waiting',
  'no response',
  'ignored',
  'never replied',
]

// Positive keywords for balance
const POSITIVE_KEYWORDS = [
  'thank',
  'thanks',
  'appreciate',
  'helpful',
  'great',
  'excellent',
  'wonderful',
  'amazing',
  'love',
  'perfect',
  'quick',
  'fast',
  'resolved',
  'solved',
  'happy',
  'pleased',
  'satisfied',
]

/**
 * Analyze sentiment of text using Claude API
 * Falls back to keyword analysis if AI unavailable
 */
export async function analyzeSentiment(
  text: string,
  useAI: boolean = true
): Promise<SentimentAnalysisResult> {
  // Try AI-powered analysis first
  if (useAI && process.env.ANTHROPIC_API_KEY) {
    try {
      return await analyzeWithClaude(text)
    } catch (error) {
      console.warn('Claude sentiment analysis failed, falling back to keywords:', error)
    }
  }

  // Fallback to keyword-based analysis
  return analyzeWithKeywords(text)
}

/**
 * Analyze sentiment using Claude API
 */
async function analyzeWithClaude(text: string): Promise<SentimentAnalysisResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Analyze the sentiment of this customer support message and respond with a JSON object containing:
- score: number from -1.0 (very negative) to 1.0 (very positive)
- confidence: number from 0 to 1 indicating certainty
- keywords: array of emotional keywords found
- shouldEscalate: boolean, true if customer seems very upset or mentions legal action
- reason: brief explanation if shouldEscalate is true

Customer message:
"""
${text.slice(0, 2000)}
"""

Respond with only the JSON object, no other text.`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = (await response.json()) as { content?: Array<{ text?: string }> }
  const content = data.content?.[0]?.text

  if (!content) {
    throw new Error('No content in Claude response')
  }

  // Parse JSON from response
  const result = JSON.parse(content) as SentimentAnalysisResult

  // Validate and clamp values
  return {
    score: Math.max(-1, Math.min(1, result.score)),
    confidence: Math.max(0, Math.min(1, result.confidence)),
    keywords: Array.isArray(result.keywords) ? result.keywords : [],
    shouldEscalate: Boolean(result.shouldEscalate),
    reason: result.reason,
  }
}

/**
 * Analyze sentiment using keyword matching (fallback)
 */
function analyzeWithKeywords(text: string): SentimentAnalysisResult {
  const lowerText = text.toLowerCase()

  let negativeCount = 0
  let positiveCount = 0
  const foundKeywords: string[] = []

  // Count negative keywords
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      negativeCount++
      foundKeywords.push(keyword)
    }
  }

  // Count positive keywords
  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      positiveCount++
      foundKeywords.push(keyword)
    }
  }

  // Calculate score
  const totalKeywords = negativeCount + positiveCount
  let score = 0
  let confidence = 0.5 // Base confidence for keyword analysis

  if (totalKeywords > 0) {
    // Score ranges from -1 (all negative) to 1 (all positive)
    score = (positiveCount - negativeCount) / totalKeywords
    // Higher keyword count = higher confidence
    confidence = Math.min(0.9, 0.5 + totalKeywords * 0.05)
  }

  // Check for escalation triggers (legal threats, strong negatives)
  const escalationKeywords = ['lawyer', 'legal', 'sue', 'attorney', 'chargeback', 'bbb', 'fraud', 'scam']
  const shouldEscalate = escalationKeywords.some((k) => lowerText.includes(k))

  return {
    score,
    confidence,
    keywords: foundKeywords,
    shouldEscalate,
    reason: shouldEscalate ? 'Customer mentioned legal action or escalation' : undefined,
  }
}

/**
 * Create a sentiment alert for a ticket
 */
export async function createSentimentAlert(
  tenantId: string,
  ticketId: string,
  sentimentScore: number,
  triggerReason?: string
): Promise<SentimentAlert> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO sentiment_alerts (ticket_id, sentiment_score, trigger_reason)
      VALUES (${ticketId}, ${sentimentScore}, ${triggerReason || null})
      RETURNING
        id,
        ticket_id as "ticketId",
        sentiment_score as "sentimentScore",
        trigger_reason as "triggerReason",
        acknowledged,
        acknowledged_by as "acknowledgedBy",
        acknowledged_at as "acknowledgedAt",
        created_at as "createdAt"
    `

    const row = result.rows[0] as Record<string, unknown>
    if (!row) throw new Error('Failed to create sentiment alert')
    return mapSentimentAlert(row)
  })
}

/**
 * Get unacknowledged sentiment alerts for a tenant
 */
export async function getUnacknowledgedAlerts(tenantId: string): Promise<SentimentAlert[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        sa.id,
        sa.ticket_id as "ticketId",
        sa.sentiment_score as "sentimentScore",
        sa.trigger_reason as "triggerReason",
        sa.acknowledged,
        sa.acknowledged_by as "acknowledgedBy",
        sa.acknowledged_at as "acknowledgedAt",
        sa.created_at as "createdAt"
      FROM sentiment_alerts sa
      JOIN support_tickets st ON st.id = sa.ticket_id
      WHERE sa.acknowledged = FALSE
        AND st.status IN ('open', 'pending')
      ORDER BY sa.created_at DESC
    `

    return result.rows.map(mapSentimentAlert)
  })
}

/**
 * Acknowledge a sentiment alert
 */
export async function acknowledgeSentimentAlert(
  tenantId: string,
  alertId: string,
  userId: string
): Promise<void> {
  return withTenant(tenantId, async () => {
    await sql`
      UPDATE sentiment_alerts
      SET acknowledged = TRUE,
          acknowledged_by = ${userId},
          acknowledged_at = NOW()
      WHERE id = ${alertId}
    `
  })
}

/**
 * Process sentiment for a ticket and take action if needed
 */
export async function processSentiment(
  tenantId: string,
  ticketId: string,
  text: string,
  currentPriority: TicketPriority,
  useAI: boolean = true
): Promise<{
  result: SentimentAnalysisResult
  escalated: boolean
  alertCreated: boolean
}> {
  const result = await analyzeSentiment(text, useAI)

  let escalated = false
  let alertCreated = false

  // Update ticket with sentiment score
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE support_tickets
      SET sentiment_score = ${result.score}
      WHERE id = ${ticketId}
    `
  })

  // Check if should escalate to HIGH priority
  if (
    result.score <= THRESHOLDS.ESCALATE_SCORE &&
    result.confidence >= THRESHOLDS.ESCALATE_CONFIDENCE &&
    currentPriority !== 'urgent' &&
    currentPriority !== 'high'
  ) {
    // Escalate to high priority
    await withTenant(tenantId, async () => {
      await sql`
        UPDATE support_tickets
        SET priority = 'high'
        WHERE id = ${ticketId}
      `
    })
    escalated = true
  }

  // Check if should create alert
  if (
    result.score <= THRESHOLDS.ALERT_SCORE &&
    result.confidence >= THRESHOLDS.ALERT_CONFIDENCE
  ) {
    const reason = result.shouldEscalate
      ? result.reason
      : `Negative sentiment detected (score: ${result.score.toFixed(2)})`
    await createSentimentAlert(tenantId, ticketId, result.score, reason)
    alertCreated = true
  }

  return { result, escalated, alertCreated }
}

/**
 * Map database row to SentimentAlert
 */
function mapSentimentAlert(row: Record<string, unknown>): SentimentAlert {
  return {
    id: row.id as string,
    ticketId: row.ticketId as string,
    sentimentScore: parseFloat(row.sentimentScore as string),
    triggerReason: (row.triggerReason as string) || null,
    acknowledged: row.acknowledged as boolean,
    acknowledgedBy: (row.acknowledgedBy as string) || null,
    acknowledgedAt: row.acknowledgedAt ? new Date(row.acknowledgedAt as string) : null,
    createdAt: new Date(row.createdAt as string),
  }
}
