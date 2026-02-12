/**
 * E-Signature Background Jobs
 *
 * Job definitions for processing bulk sends, webhooks, reminders, and expirations.
 */

import { withTenant, sql } from '@cgk/db'
import {
  getScheduledBulkSends,
  getPendingRecipients,
  updateBulkSendStatus,
  updateRecipientStatus,
  addBulkSendError,
  getActiveWebhooksForEvent,
  logWebhookDelivery,
  createWebhookSignature,
  getPendingRetryDeliveries,
  updateDeliveryRetry,
  expireOldSessions,
} from './index'
import type { EsignWebhookEvent, EsignWebhookPayload } from './types'

// Local type definitions for job system (until @cgk/jobs module resolution is fixed)
interface Job<T = unknown> {
  id: string
  name: string
  payload: T
  status: string
  attempts: number
  maxAttempts: number
  priority: number
  scheduledAt: Date
  startedAt?: Date
  completedAt?: Date
  failedAt?: Date
  error?: { message: string; code?: string; stack?: string; retryable: boolean }
  result?: unknown
  tenantId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

interface JobResult<T = unknown> {
  success: boolean
  data?: T
  error?: { message: string; code?: string; stack?: string; retryable: boolean }
}

type JobHandler<T = unknown, R = unknown> = (job: Job<T>) => Promise<JobResult<R>>

interface JobDefinition<T = unknown, R = unknown> {
  name: string
  handler: JobHandler<T, R>
  options?: { maxAttempts?: number }
  retry?: { maxAttempts?: number; backoff?: 'fixed' | 'exponential' }
}

function defineJob<T = unknown, R = unknown>(
  definition: JobDefinition<T, R>
): JobDefinition<T, R> {
  return {
    ...definition,
    options: {
      maxAttempts: definition.retry?.maxAttempts ?? 3,
      ...definition.options,
    },
  }
}

/**
 * Process bulk send batches
 *
 * Picks up queued bulk sends and processes them in batches.
 */
export const processEsignBulkSend = defineJob({
  name: 'esign-bulk-send-process',
  handler: async (job) => {
    const { tenantSlug, bulkSendId } = job.payload as {
      tenantSlug: string
      bulkSendId: string
    }

    if (!tenantSlug) {
      throw new Error('tenantSlug required in job payload')
    }

    // Mark as sending
    await updateBulkSendStatus(tenantSlug, bulkSendId, 'sending', {
      startedAt: new Date(),
    })

    let sentCount = 0
    let failedCount = 0
    const batchSize = 10
    const rateLimitDelayMs = 6000 // 10 per minute = 1 every 6 seconds

    try {
      while (true) {
        const recipients = await getPendingRecipients(tenantSlug, bulkSendId, batchSize)

        if (recipients.length === 0) {
          break
        }

        for (const recipient of recipients) {
          try {
            // Note: Actual document creation would be implemented in PHASE-4C-ESIGN-CORE
            // This is a placeholder for the job structure

            // Simulate processing
            await new Promise((resolve) => setTimeout(resolve, 100))

            // For now, mark as sent (in real implementation, create document first)
            await updateRecipientStatus(
              tenantSlug,
              recipient.id,
              'sent',
              undefined // Would be the created document ID
            )
            sentCount++
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            await updateRecipientStatus(tenantSlug, recipient.id, 'failed', undefined, errorMessage)
            await addBulkSendError(tenantSlug, bulkSendId, recipient.email, errorMessage)
            failedCount++
          }

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, rateLimitDelayMs))
        }
      }

      // Update final status
      const finalStatus = failedCount === 0 ? 'completed' : sentCount === 0 ? 'failed' : 'partial'
      await updateBulkSendStatus(tenantSlug, bulkSendId, finalStatus, {
        completedAt: new Date(),
        sentCount,
        failedCount,
      })

      return {
        success: true,
        data: { sentCount, failedCount, status: finalStatus },
      }
    } catch (error) {
      await updateBulkSendStatus(tenantSlug, bulkSendId, 'failed', {
        completedAt: new Date(),
        sentCount,
        failedCount,
      })
      throw error
    }
  },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
  },
})

/**
 * Send webhook notifications
 *
 * Triggered when document events occur.
 */
export const sendEsignWebhook = defineJob({
  name: 'esign-webhook-send',
  handler: async (job) => {
    const { tenantSlug, event, documentId, payload } = job.payload as {
      tenantSlug: string
      event: EsignWebhookEvent
      documentId: string
      payload: EsignWebhookPayload
    }

    if (!tenantSlug) {
      throw new Error('tenantSlug required in job payload')
    }

    const webhooks = await getActiveWebhooksForEvent(tenantSlug, event)

    const results: Array<{ webhookId: string; success: boolean }> = []

    for (const webhook of webhooks) {
      const payloadString = JSON.stringify(payload)
      const signature = createWebhookSignature(payloadString, webhook.secretKey)

      const startTime = Date.now()

      try {
        const response = await fetch(webhook.endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Esign-Signature': signature,
            'X-Esign-Event': event,
          },
          body: payloadString,
        })

        const durationMs = Date.now() - startTime
        const responseBody = await response.text()

        await logWebhookDelivery(tenantSlug, {
          webhookId: webhook.id,
          documentId,
          event,
          payload,
          requestHeaders: {
            'Content-Type': 'application/json',
            'X-Esign-Signature': signature,
            'X-Esign-Event': event,
          },
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 1000),
          success: response.ok,
          durationMs,
          nextRetryAt: response.ok ? undefined : new Date(Date.now() + 60000), // Retry in 1 min
        })

        results.push({ webhookId: webhook.id, success: response.ok })
      } catch {
        const durationMs = Date.now() - startTime

        await logWebhookDelivery(tenantSlug, {
          webhookId: webhook.id,
          documentId,
          event,
          payload,
          success: false,
          durationMs,
          nextRetryAt: new Date(Date.now() + 60000), // Retry in 1 min
        })

        results.push({ webhookId: webhook.id, success: false })
      }
    }

    return { success: true, data: { results } }
  },
  retry: {
    maxAttempts: 1, // Don't retry at job level - we handle retries internally
  },
})

/**
 * Retry failed webhook deliveries
 *
 * Runs periodically to retry failed webhook deliveries.
 */
export const retryEsignWebhooks = defineJob({
  name: 'esign-webhook-retry',
  handler: async (job) => {
    const { tenantSlug } = job.payload as { tenantSlug: string }

    if (!tenantSlug) {
      throw new Error('tenantSlug required in job payload')
    }

    const MAX_RETRIES = 5
    const deliveries = await getPendingRetryDeliveries(tenantSlug)

    let successCount = 0
    let failedCount = 0

    for (const delivery of deliveries) {
      if (delivery.retryCount >= MAX_RETRIES) {
        // Max retries reached, give up
        await updateDeliveryRetry(tenantSlug, delivery.id, false)
        failedCount++
        continue
      }

      try {
        const payloadString = JSON.stringify(delivery.payload)
        const webhookPayload = delivery.payload as unknown as EsignWebhookPayload

        const response = await fetch(webhookPayload.data?.documentId ? '' : '', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(delivery.requestHeaders || {}),
          },
          body: payloadString,
        })

        const responseBody = await response.text()

        // Calculate next retry with exponential backoff
        const backoffMs = Math.min(60000 * Math.pow(2, delivery.retryCount), 3600000) // Max 1 hour
        const nextRetryAt = response.ok ? undefined : new Date(Date.now() + backoffMs)

        await updateDeliveryRetry(
          tenantSlug,
          delivery.id,
          response.ok,
          response.status,
          responseBody.substring(0, 1000),
          nextRetryAt
        )

        if (response.ok) {
          successCount++
        } else {
          failedCount++
        }
      } catch {
        const backoffMs = Math.min(60000 * Math.pow(2, delivery.retryCount), 3600000)
        await updateDeliveryRetry(
          tenantSlug,
          delivery.id,
          false,
          undefined,
          undefined,
          new Date(Date.now() + backoffMs)
        )
        failedCount++
      }
    }

    return { success: true, data: { successCount, failedCount } }
  },
  retry: {
    maxAttempts: 1,
  },
})

/**
 * Send signature reminders
 *
 * Runs daily to send reminders for pending signatures.
 */
export const sendEsignReminders = defineJob({
  name: 'esign-reminders-send',
  handler: async (job) => {
    const { tenantSlug } = job.payload as { tenantSlug: string }

    if (!tenantSlug) {
      throw new Error('tenantSlug required in job payload')
    }

    return withTenant(tenantSlug, async () => {
      // Find documents due for reminders
      const result = await sql`
        SELECT
          d.id as document_id,
          d.name as document_name,
          s.id as signer_id,
          s.name as signer_name,
          s.email as signer_email,
          rc.reminder_count,
          rc.max_reminders
        FROM esign_documents d
        JOIN esign_signers s ON s.document_id = d.id
        LEFT JOIN esign_reminder_configs rc ON rc.document_id = d.id
        WHERE d.status IN ('pending', 'in_progress')
          AND s.status = 'pending'
          AND COALESCE(rc.reminder_enabled, d.reminder_enabled, true) = true
          AND (
            rc.next_reminder_at IS NULL
            OR rc.next_reminder_at <= NOW()
          )
          AND COALESCE(rc.reminder_count, 0) < COALESCE(rc.max_reminders, 3)
        LIMIT 100
      `

      let sentCount = 0

      for (const row of result.rows) {
        try {
          // Note: Actual email sending would be implemented via communications package
          console.log(`Would send reminder to ${row.signer_email} for document ${row.document_id}`)

          // Update reminder tracking
          const reminderDays = 3 // Default
          await sql`
            INSERT INTO esign_reminder_configs (document_id, reminder_count, last_reminder_at, next_reminder_at)
            VALUES (
              ${row.document_id as string},
              1,
              NOW(),
              NOW() + INTERVAL '${reminderDays} days'
            )
            ON CONFLICT (document_id) DO UPDATE
            SET reminder_count = esign_reminder_configs.reminder_count + 1,
                last_reminder_at = NOW(),
                next_reminder_at = NOW() + INTERVAL '${reminderDays} days'
          `

          // Add audit log
          await sql`
            INSERT INTO esign_audit_log (document_id, signer_id, action, details, performed_by)
            VALUES (
              ${row.document_id as string},
              ${row.signer_id as string},
              'reminder_sent',
              '{}',
              'system'
            )
          `

          sentCount++
        } catch (error) {
          console.error(`Failed to send reminder for document ${row.document_id}:`, error)
        }
      }

      return { success: true, data: { sentCount } }
    })
  },
  retry: {
    maxAttempts: 1,
  },
})

/**
 * Check for expired documents
 *
 * Runs hourly to mark expired documents and send notifications.
 */
export const checkExpiredDocuments = defineJob({
  name: 'esign-expired-check',
  handler: async (job) => {
    const { tenantSlug } = job.payload as { tenantSlug: string }

    if (!tenantSlug) {
      throw new Error('tenantSlug required in job payload')
    }

    return withTenant(tenantSlug, async () => {
      // Mark expired documents
      const result = await sql`
        UPDATE esign_documents
        SET status = 'expired', updated_at = NOW()
        WHERE status IN ('pending', 'in_progress')
          AND expires_at < NOW()
        RETURNING id
      `

      const expiredCount = result.rows.length

      // Add audit log entries
      for (const row of result.rows) {
        await sql`
          INSERT INTO esign_audit_log (document_id, action, details, performed_by)
          VALUES (${row.id as string}, 'expired', '{}', 'system')
        `

        // Trigger webhook for expiration
        // Note: In real implementation, would enqueue a webhook job
      }

      // Also expire old in-person sessions
      const expiredSessions = await expireOldSessions(tenantSlug)

      return {
        success: true,
        data: { expiredDocuments: expiredCount, expiredSessions },
      }
    })
  },
  retry: {
    maxAttempts: 1,
  },
})

/**
 * Process scheduled bulk sends
 *
 * Runs every minute to check for scheduled bulk sends.
 */
export const processScheduledBulkSends = defineJob({
  name: 'esign-bulk-send-scheduled',
  handler: async (job) => {
    const { tenantSlug } = job.payload as { tenantSlug: string }

    if (!tenantSlug) {
      throw new Error('tenantSlug required in job payload')
    }

    const bulkSends = await getScheduledBulkSends(tenantSlug)

    // For each scheduled bulk send, trigger the processing job
    // In real implementation, would use the job queue to enqueue each
    for (const bulkSend of bulkSends) {
      console.log(`Would enqueue bulk send processing for ${bulkSend.id}`)
    }

    return {
      success: true,
      data: { enqueuedCount: bulkSends.length },
    }
  },
  retry: {
    maxAttempts: 1,
  },
})
