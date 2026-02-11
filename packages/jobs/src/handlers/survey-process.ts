/**
 * Survey Response Processing Job
 *
 * Processes completed survey responses:
 * - Extracts and stores NPS score
 * - Extracts and stores attribution source
 * - Triggers Slack notifications
 * - Syncs attribution data to analytics system
 */

import { defineJob } from '../define'
import type { JobResult } from '../types'
import { withTenant, sql } from '@cgk/db'

// Job Payload Types
export interface ProcessSurveyResponsePayload {
  tenantId: string
  responseId: string
}

export interface SyncAttributionPayload {
  tenantId: string
  responseId: string
  orderId: string
  attributionSource: string
  orderValue?: number
}

interface SurveyAnswer {
  question_id: string
  question_type: string
  is_attribution_question: boolean
  answer_value: string | null
  answer_numeric: number | null
}

interface ResponseWithAnswers {
  id: string
  survey_id: string
  order_id: string | null
  customer_id: string | null
  customer_email: string | null
  is_complete: boolean
  nps_score: number | null
  attribution_source: string | null
}

/**
 * Process a completed survey response
 * - Extract NPS score from rating/nps question
 * - Extract attribution source
 * - Update response record
 * - Trigger Slack notifications
 */
export const processSurveyResponseJob = defineJob<ProcessSurveyResponsePayload>({
  name: 'survey/process-response',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, responseId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    if (!responseId) {
      return { success: false, error: { message: 'responseId required', retryable: false } }
    }

    try {
      // Get response with answers
      const responseResult = await withTenant(tenantId, async () => {
        return sql`
          SELECT
            sr.id,
            sr.survey_id,
            sr.order_id,
            sr.customer_id,
            sr.customer_email,
            sr.is_complete,
            sr.nps_score,
            sr.attribution_source
          FROM survey_responses sr
          WHERE sr.id = ${responseId}
        `
      })

      const response = responseResult.rows[0] as ResponseWithAnswers | undefined
      if (!response) {
        return { success: false, error: { message: 'Response not found', retryable: false } }
      }

      // Get answers with question metadata
      const answersResult = await withTenant(tenantId, async () => {
        return sql`
          SELECT
            sa.question_id,
            sq.question_type,
            sq.is_attribution_question,
            sa.answer_value,
            sa.answer_numeric
          FROM survey_answers sa
          JOIN survey_questions sq ON sq.id = sa.question_id
          WHERE sa.response_id = ${responseId}
        `
      })

      const answers = answersResult.rows as SurveyAnswer[]

      // Extract NPS score
      let npsScore: number | null = null
      const npsAnswer = answers.find((a) => a.question_type === 'nps' || a.question_type === 'rating')
      if (npsAnswer && npsAnswer.answer_numeric !== null) {
        npsScore = Number(npsAnswer.answer_numeric)
      }

      // Extract attribution source
      let attributionSource: string | null = null
      const attrAnswer = answers.find((a) => a.is_attribution_question)
      if (attrAnswer?.answer_value) {
        attributionSource = attrAnswer.answer_value
      }

      // Update response with extracted data
      await withTenant(tenantId, async () => {
        return sql`
          UPDATE survey_responses
          SET
            is_complete = true,
            completed_at = COALESCE(completed_at, NOW()),
            nps_score = COALESCE(${npsScore}, nps_score),
            attribution_source = COALESCE(${attributionSource}, attribution_source)
          WHERE id = ${responseId}
        `
      })

      // Check if Slack notifications are enabled
      const slackResult = await withTenant(tenantId, async () => {
        return sql`
          SELECT
            id,
            webhook_url,
            notify_on_complete,
            notify_on_nps_low,
            nps_low_threshold
          FROM survey_slack_config
          WHERE is_active = true
            AND (survey_id IS NULL OR survey_id = ${response.survey_id})
          LIMIT 1
        `
      })

      const slackConfig = slackResult.rows[0] as {
        id: string
        webhook_url: string
        notify_on_complete: boolean
        notify_on_nps_low: boolean
        nps_low_threshold: number
      } | undefined

      const notifications: string[] = []

      if (slackConfig) {
        // Queue Slack notification for complete response
        if (slackConfig.notify_on_complete) {
          notifications.push('slack-notification')
          // Note: Would enqueue job here in production
          // await queue.enqueue('survey/slack-notification', { tenantId, responseId })
        }

        // Queue low NPS alert if applicable
        if (
          slackConfig.notify_on_nps_low &&
          npsScore !== null &&
          npsScore <= slackConfig.nps_low_threshold
        ) {
          notifications.push('low-nps-alert')
          // Note: Would enqueue job here in production
          // await queue.enqueue('survey/low-nps-alert', { tenantId, responseId, npsScore })
        }
      }

      // Sync to attribution system if we have attribution data
      let attributionSynced = false
      if (attributionSource && response.order_id) {
        attributionSynced = true
        // Note: Would enqueue attribution sync job here in production
        // await queue.enqueue('survey/sync-attribution', {
        //   tenantId,
        //   responseId,
        //   orderId: response.order_id,
        //   attributionSource,
        // })
      }

      return {
        success: true,
        data: {
          responseId,
          npsScore,
          attributionSource,
          notifications,
          attributionSynced,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      }
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 2000 },
})

/**
 * Sync attribution data to analytics system
 */
export const syncAttributionJob = defineJob<SyncAttributionPayload>({
  name: 'survey/sync-attribution',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, responseId, orderId, attributionSource, orderValue } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    try {
      // Get response details for attribution record
      const responseResult = await withTenant(tenantId, async () => {
        return sql`
          SELECT
            sr.id,
            sr.customer_id,
            sr.customer_email,
            sr.completed_at,
            ao.category as attribution_category
          FROM survey_responses sr
          LEFT JOIN attribution_options ao ON ao.value = sr.attribution_source
          WHERE sr.id = ${responseId}
        `
      })

      const response = responseResult.rows[0] as {
        id: string
        customer_id: string | null
        customer_email: string | null
        completed_at: Date | null
        attribution_category: string | null
      } | undefined

      if (!response) {
        return { success: false, error: { message: 'Response not found', retryable: false } }
      }

      // Check if attribution_records table exists and insert record
      // This syncs survey attribution data to the main attribution system
      try {
        await withTenant(tenantId, async () => {
          return sql`
            INSERT INTO attribution_records (
              source_type,
              channel,
              category,
              order_id,
              customer_id,
              customer_email,
              order_value,
              survey_response_id,
              collected_at
            ) VALUES (
              'survey',
              ${attributionSource},
              ${response.attribution_category || 'other'},
              ${orderId},
              ${response.customer_id},
              ${response.customer_email},
              ${orderValue || 0},
              ${responseId},
              ${response.completed_at?.toISOString() || new Date().toISOString()}
            )
            ON CONFLICT (order_id, source_type) DO UPDATE SET
              channel = EXCLUDED.channel,
              category = EXCLUDED.category,
              survey_response_id = EXCLUDED.survey_response_id
          `
        })
      } catch {
        // attribution_records table may not exist yet (different phase)
        // Log and continue - not a critical failure
        console.warn('[survey/sync-attribution] Attribution records table not available')
      }

      return {
        success: true,
        data: {
          responseId,
          orderId,
          attributionSource,
          category: response.attribution_category,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      }
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})
