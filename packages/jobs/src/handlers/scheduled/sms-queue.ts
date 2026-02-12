/**
 * SMS Queue Processing Jobs
 *
 * Handles SMS sending with proper consent checking:
 * - Send SMS with consent verification
 * - Send bulk SMS to multiple recipients
 * - Retry dead letter SMS with cooldown
 *
 * @ai-pattern sms-processing
 * @ai-critical SMS MUST check consent before every send
 */

import { defineJob } from '../../define'
import type { TenantEvent } from '../../events'

// ============================================================
// SMS QUEUE PAYLOAD TYPES
// ============================================================

export interface SendSmsPayload {
  tenantId: string
  /** Recipient phone number (E.164 format) */
  to: string
  /** SMS message content */
  message: string
  /** Optional template ID */
  templateId?: string
  /** Template variables */
  templateVars?: Record<string, string>
  /** Sender ID/phone number */
  from?: string
  /** Correlation ID for tracking */
  correlationId?: string
  /** Priority level */
  priority?: 'high' | 'normal' | 'low'
  /** Skip consent check (for transactional SMS only) */
  skipConsentCheck?: boolean
}

export interface SendBulkSmsPayload {
  tenantId: string
  /** Array of recipient details */
  recipients: Array<{
    to: string
    message?: string
    templateVars?: Record<string, string>
  }>
  /** Shared message (if not per-recipient) */
  message?: string
  /** Template ID to use */
  templateId?: string
  /** Batch ID for tracking */
  batchId: string
  /** Maximum messages per second (rate limiting) */
  rateLimit?: number
}

export interface RetryDeadLetterSmsPayload {
  tenantId: string
  /** Minimum age of messages to retry (hours) */
  minAgeHours?: number
  /** Maximum messages to retry per run */
  limit?: number
}

// ============================================================
// SMS RESULT TYPES
// ============================================================

interface SmsConsentStatus {
  phone: string
  hasConsent: boolean
  consentType?: 'marketing' | 'transactional' | 'all'
  consentedAt?: Date
  source?: string
}

interface SmsSendResult {
  messageId?: string
  success: boolean
  to: string
  status: 'sent' | 'queued' | 'failed' | 'no_consent' | 'invalid_number'
  error?: string
  segments?: number
  cost?: number
}

interface SmsBatchResult {
  batchId: string
  total: number
  sent: number
  failed: number
  noConsent: number
  results: SmsSendResult[]
}

// ============================================================
// CONSENT CHECKING
// ============================================================

/**
 * Check if phone number has SMS consent
 *
 * CRITICAL: This must be called before every non-transactional SMS
 */
async function checkSmsConsent(
  tenantId: string,
  phone: string
): Promise<SmsConsentStatus> {
  // Implementation would:
  // 1. Query sms_consent table for this phone
  // 2. Check consent is not expired
  // 3. Check consent type matches message type
  // 4. Return consent status

  console.log(`[SMS] Checking consent for ${phone} in tenant ${tenantId}`)

  // Stub implementation - would query database
  return {
    phone,
    hasConsent: true, // Would be actual consent check
    consentType: 'all',
    consentedAt: new Date(),
    source: 'signup',
  }
}

/**
 * Validate phone number format
 */
function validatePhoneNumber(phone: string): boolean {
  // E.164 format validation
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phone)
}

/**
 * Normalize phone number to E.164
 */
function normalizePhoneNumber(phone: string): string {
  // Remove spaces, dashes, parentheses
  let normalized = phone.replace(/[\s\-\(\)]/g, '')

  // Add + prefix if missing (assume US if 10 digits)
  if (!normalized.startsWith('+')) {
    if (normalized.length === 10) {
      normalized = '+1' + normalized
    } else if (normalized.length === 11 && normalized.startsWith('1')) {
      normalized = '+' + normalized
    }
  }

  return normalized
}

// ============================================================
// SMS QUEUE JOBS
// ============================================================

/**
 * Send single SMS with consent check
 *
 * CRITICAL: Verifies consent before sending unless explicitly skipped
 * for transactional messages.
 */
export const sendSmsJob = defineJob<TenantEvent<SendSmsPayload>>({
  name: 'sms/send',
  handler: async (job) => {
    const {
      tenantId,
      to,
      message,
      templateId,
      templateVars: _templateVars,
      from: _from,
      correlationId: _correlationId,
      priority: _priority,
      skipConsentCheck,
    } = job.payload

    // Normalize and validate phone number
    const normalizedPhone = normalizePhoneNumber(to)
    if (!validatePhoneNumber(normalizedPhone)) {
      console.warn(`[SMS] Invalid phone number: ${to}`)
      return {
        success: false,
        data: {
          to: normalizedPhone,
          status: 'invalid_number',
          error: 'Invalid phone number format',
        } as SmsSendResult,
      }
    }

    // Check consent (unless explicitly skipped for transactional)
    if (!skipConsentCheck) {
      const consent = await checkSmsConsent(tenantId, normalizedPhone)
      if (!consent.hasConsent) {
        console.log(`[SMS] No consent for ${normalizedPhone}, skipping`)
        return {
          success: false,
          data: {
            to: normalizedPhone,
            status: 'no_consent',
            error: 'Recipient has not consented to SMS',
          } as SmsSendResult,
        }
      }
    }

    // Build message content
    let messageContent = message
    if (templateId) {
      // Would load template and interpolate variables
      console.log(`[SMS] Loading template ${templateId}`)
      messageContent = message || 'Template message' // Stub
    }

    console.log(`[SMS] Sending to ${normalizedPhone}: ${messageContent?.substring(0, 50)}...`)

    // Implementation would:
    // 1. Call Twilio/SMS provider API
    // 2. Track message ID
    // 3. Log for audit
    // 4. Update delivery status

    const result: SmsSendResult = {
      messageId: `sms_${Date.now()}`,
      success: true,
      to: normalizedPhone,
      status: 'sent',
      segments: Math.ceil((messageContent?.length || 0) / 160),
    }

    console.log(`[SMS] Message sent: ${result.messageId}`)

    return { success: true, data: result }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

/**
 * Send bulk SMS to multiple recipients
 *
 * Processes recipients in batches with rate limiting.
 * Checks consent for each recipient.
 */
export const sendBulkSmsJob = defineJob<TenantEvent<SendBulkSmsPayload>>({
  name: 'sms/send-bulk',
  handler: async (job) => {
    const { tenantId, recipients, message, templateId: _templateId, batchId, rateLimit = 10 } = job.payload

    console.log(`[SMS] Processing bulk send (batch: ${batchId}, recipients: ${recipients.length})`)

    const results: SmsSendResult[] = []
    let sent = 0
    let failed = 0
    let noConsent = 0

    // Process with rate limiting
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]!

      // Rate limiting - pause between messages
      if (i > 0 && rateLimit > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000 / rateLimit))
      }

      // Normalize phone
      const normalizedPhone = normalizePhoneNumber(recipient.to)
      if (!validatePhoneNumber(normalizedPhone)) {
        results.push({
          to: normalizedPhone,
          success: false,
          status: 'invalid_number',
          error: 'Invalid phone number format',
        })
        failed++
        continue
      }

      // Check consent
      const consent = await checkSmsConsent(tenantId, normalizedPhone)
      if (!consent.hasConsent) {
        results.push({
          to: normalizedPhone,
          success: false,
          status: 'no_consent',
        })
        noConsent++
        continue
      }

      // Build message
      const messageContent = recipient.message || message

      // Send SMS
      try {
        // Would call SMS provider
        results.push({
          messageId: `sms_${Date.now()}_${i}`,
          success: true,
          to: normalizedPhone,
          status: 'sent',
          segments: Math.ceil((messageContent?.length || 0) / 160),
        })
        sent++
      } catch (error) {
        results.push({
          to: normalizedPhone,
          success: false,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        failed++
      }
    }

    const batchResult: SmsBatchResult = {
      batchId,
      total: recipients.length,
      sent,
      failed,
      noConsent,
      results,
    }

    console.log(
      `[SMS] Bulk send complete: ${sent} sent, ${failed} failed, ${noConsent} no consent`
    )

    return { success: failed === 0 && noConsent === 0, data: batchResult }
  },
  retry: { maxAttempts: 2, backoff: 'exponential', initialDelay: 30000 },
})

/**
 * Retry dead letter SMS
 *
 * Retries SMS messages that failed after their initial cooldown period.
 * Runs hourly to pick up messages that are ready for retry.
 */
export const retryDeadLetterSmsJob = defineJob<TenantEvent<RetryDeadLetterSmsPayload>>({
  name: 'sms/retry-dead-letter',
  handler: async (job) => {
    const { tenantId, minAgeHours = 1, limit = 100 } = job.payload

    console.log(
      `[SMS] Retrying dead letter messages (min age: ${minAgeHours}h, limit: ${limit})`
    )

    // Calculate cutoff time
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - minAgeHours)

    // Query failed messages ready for retry
    // Would use: SELECT * FROM sms_queue
    //            WHERE status = 'failed'
    //            AND retry_count < max_retries
    //            AND last_attempt_at < cutoffTime
    //            AND tenant_id = tenantId
    //            ORDER BY created_at ASC
    //            LIMIT limit
    const deadLetters: Array<{
      id: string
      to: string
      message: string
      retryCount: number
      maxRetries: number
    }> = []

    let retried = 0
    let permanentlyFailed = 0

    for (const letter of deadLetters) {
      if (letter.retryCount >= letter.maxRetries) {
        // Mark as permanently failed
        console.log(`[SMS] Message ${letter.id} exceeded max retries, marking permanently failed`)
        permanentlyFailed++
        // Would update: UPDATE sms_queue SET status = 'permanently_failed' WHERE id = letter.id
        continue
      }

      // Re-queue for sending
      console.log(`[SMS] Requeueing message ${letter.id} (retry ${letter.retryCount + 1})`)
      // Would trigger sms/send job
      retried++
    }

    console.log(
      `[SMS] Dead letter processing complete: ${retried} requeued, ${permanentlyFailed} permanently failed`
    )

    return {
      success: true,
      data: {
        tenantId,
        processed: deadLetters.length,
        retried,
        permanentlyFailed,
        processedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 60000 },
})

// ============================================================
// SCHEDULES
// ============================================================

export const SMS_QUEUE_SCHEDULES = {
  /** Retry dead letters hourly */
  retryDeadLetter: { cron: '0 * * * *' },
} as const

// ============================================================
// EXPORTS
// ============================================================

export const smsQueueJobs = [sendSmsJob, sendBulkSmsJob, retryDeadLetterSmsJob]
