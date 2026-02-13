/**
 * Survey Slack notification background jobs
 *
 * Handles automated survey-related Slack notifications:
 * - Real-time notifications on survey completion
 * - Daily/weekly digest summaries
 * - Low NPS alerts
 */

import { defineJob } from '../define'
import type { JobResult } from '../types'
import { withTenant, sql } from '@cgk-platform/db'

// Job Payload Types
export interface SurveySlackNotificationPayload {
  tenantId: string
  responseId: string
}

export interface SurveySlackDigestPayload {
  tenantId: string
  frequency: 'daily' | 'weekly'
}

export interface SurveyLowNpsAlertPayload {
  tenantId: string
  responseId: string
  npsScore: number
}

interface SlackConfig {
  webhook_url: string
  channel_name: string | null
  notify_on_response: boolean
  notify_on_low_nps: boolean
  low_nps_threshold: number
  daily_digest_enabled: boolean
  weekly_digest_enabled: boolean
}

interface SurveyResponse {
  id: string
  survey_id: string
  survey_name: string
  customer_email: string | null
  customer_name: string | null
  nps_score: number | null
  completion_time_seconds: number | null
  attribution_source: string | null
  attribution_category: string | null
  created_at: Date
}

interface DigestStats {
  survey_name: string
  total_responses: number
  avg_nps: number | null
  completion_rate: number
  top_attribution: string | null
}

/**
 * Send Slack webhook message
 */
async function sendSlackMessage(
  webhookUrl: string,
  message: {
    text?: string
    blocks?: unknown[]
    attachments?: unknown[]
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      return { success: false, error: `Slack API error: ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send Slack message',
    }
  }
}

/**
 * Get Slack config for tenant
 */
async function getSlackConfig(tenantId: string): Promise<SlackConfig | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        webhook_url,
        channel_name,
        notify_on_response,
        notify_on_low_nps,
        low_nps_threshold,
        daily_digest_enabled,
        weekly_digest_enabled
      FROM survey_slack_config
      WHERE is_active = true
      LIMIT 1
    `
    return (result.rows[0] as SlackConfig) || null
  })
}

/**
 * Get survey response details
 */
async function getResponseDetails(
  tenantId: string,
  responseId: string
): Promise<SurveyResponse | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        r.id,
        r.survey_id,
        s.name as survey_name,
        r.customer_email,
        r.customer_name,
        r.nps_score,
        r.completion_time_seconds,
        ao.label as attribution_source,
        ao.category as attribution_category,
        r.created_at
      FROM survey_responses r
      JOIN surveys s ON s.id = r.survey_id
      LEFT JOIN attribution_options ao ON ao.id = r.attribution_option_id
      WHERE r.id = ${responseId}
    `
    return (result.rows[0] as SurveyResponse) || null
  })
}

/**
 * Send real-time Slack notification for new survey response
 */
export const surveySlackNotificationJob = defineJob<SurveySlackNotificationPayload>({
  name: 'survey/slack-notification',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, responseId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    try {
      const config = await getSlackConfig(tenantId)
      if (!config || !config.notify_on_response) {
        return { success: true, data: { skipped: true, reason: 'Notifications disabled' } }
      }

      const response = await getResponseDetails(tenantId, responseId)
      if (!response) {
        return { success: false, error: { message: 'Response not found', retryable: false } }
      }

      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.cgk.dev'
      const responseUrl = `${adminUrl}/admin/surveys/${response.survey_id}/responses/${response.id}`

      // Build Slack message blocks
      const blocks: unknown[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'New Survey Response',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Survey:*\n${response.survey_name}`,
            },
            {
              type: 'mrkdwn',
              text: `*Customer:*\n${response.customer_name || response.customer_email || 'Anonymous'}`,
            },
          ],
        },
      ]

      // Add attribution if available
      if (response.attribution_source) {
        blocks.push({
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Attribution:*\n${response.attribution_source}`,
            },
            {
              type: 'mrkdwn',
              text: `*Category:*\n${response.attribution_category || 'Unknown'}`,
            },
          ],
        })
      }

      // Add NPS if available
      if (response.nps_score !== null) {
        const npsEmoji =
          response.nps_score >= 9 ? ':star:' : response.nps_score >= 7 ? ':neutral_face:' : ':warning:'

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*NPS Score:* ${response.nps_score}/10 ${npsEmoji}`,
          },
        })
      }

      // Add action button
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Response',
            },
            url: responseUrl,
            style: 'primary',
          },
        ],
      })

      const result = await sendSlackMessage(config.webhook_url, {
        text: `New survey response from ${response.customer_name || response.customer_email || 'a customer'}`,
        blocks,
      })

      if (!result.success) {
        return {
          success: false,
          error: { message: result.error || 'Failed to send Slack message', retryable: true },
        }
      }

      return { success: true, data: { sent: true, responseId } }
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

/**
 * Send low NPS alert to Slack
 */
export const surveyLowNpsAlertJob = defineJob<SurveyLowNpsAlertPayload>({
  name: 'survey/low-nps-alert',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, responseId, npsScore } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    try {
      const config = await getSlackConfig(tenantId)
      if (!config || !config.notify_on_low_nps) {
        return { success: true, data: { skipped: true, reason: 'Low NPS alerts disabled' } }
      }

      if (npsScore >= config.low_nps_threshold) {
        return { success: true, data: { skipped: true, reason: 'NPS above threshold' } }
      }

      const response = await getResponseDetails(tenantId, responseId)
      if (!response) {
        return { success: false, error: { message: 'Response not found', retryable: false } }
      }

      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.cgk.dev'
      const responseUrl = `${adminUrl}/admin/surveys/${response.survey_id}/responses/${response.id}`

      const blocks: unknown[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: ':warning: Low NPS Alert',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `A customer gave a low NPS score of *${npsScore}/10* on the *${response.survey_name}* survey.`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Customer:*\n${response.customer_name || response.customer_email || 'Anonymous'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Attribution:*\n${response.attribution_source || 'Unknown'}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Threshold: ${config.low_nps_threshold} | Score: ${npsScore}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Response',
              },
              url: responseUrl,
              style: 'danger',
            },
          ],
        },
      ]

      const result = await sendSlackMessage(config.webhook_url, {
        text: `:warning: Low NPS Alert: ${npsScore}/10 from ${response.customer_name || response.customer_email || 'customer'}`,
        blocks,
      })

      if (!result.success) {
        return {
          success: false,
          error: { message: result.error || 'Failed to send Slack message', retryable: true },
        }
      }

      return { success: true, data: { sent: true, npsScore } }
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

/**
 * Send daily/weekly digest of survey responses
 */
export const surveySlackDigestJob = defineJob<SurveySlackDigestPayload>({
  name: 'survey/slack-digest',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, frequency } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    try {
      const config = await getSlackConfig(tenantId)
      if (!config) {
        return { success: true, data: { skipped: true, reason: 'Slack not configured' } }
      }

      const isDaily = frequency === 'daily'
      if (isDaily && !config.daily_digest_enabled) {
        return { success: true, data: { skipped: true, reason: 'Daily digest disabled' } }
      }
      if (!isDaily && !config.weekly_digest_enabled) {
        return { success: true, data: { skipped: true, reason: 'Weekly digest disabled' } }
      }

      // Get digest stats
      const interval = isDaily ? '1 day' : '7 days'

      const statsResult = await withTenant(tenantId, async () => {
        return sql`
          SELECT
            s.name as survey_name,
            COUNT(r.id)::int as total_responses,
            AVG(r.nps_score)::numeric(4,2) as avg_nps,
            COUNT(CASE WHEN r.completed_at IS NOT NULL THEN 1 END)::float /
              NULLIF(COUNT(r.id), 0) * 100 as completion_rate,
            (
              SELECT ao.label
              FROM attribution_options ao
              JOIN survey_responses sr ON sr.attribution_option_id = ao.id
              WHERE sr.survey_id = s.id
                AND sr.created_at >= NOW() - ${interval}::interval
              GROUP BY ao.label
              ORDER BY COUNT(*) DESC
              LIMIT 1
            ) as top_attribution
          FROM surveys s
          LEFT JOIN survey_responses r ON r.survey_id = s.id
            AND r.created_at >= NOW() - ${interval}::interval
          WHERE s.status = 'active'
          GROUP BY s.id, s.name
          HAVING COUNT(r.id) > 0
          ORDER BY COUNT(r.id) DESC
          LIMIT 10
        `
      })

      const stats = statsResult.rows as DigestStats[]

      if (stats.length === 0) {
        return { success: true, data: { skipped: true, reason: 'No responses in period' } }
      }

      const totalResponses = stats.reduce((sum: number, s: DigestStats) => sum + s.total_responses, 0)
      const avgNps =
        stats.filter((s: DigestStats) => s.avg_nps !== null).length > 0
          ? stats.reduce((sum: number, s: DigestStats) => sum + (s.avg_nps || 0), 0) /
            stats.filter((s: DigestStats) => s.avg_nps !== null).length
          : null

      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.cgk.dev'

      const blocks: unknown[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${isDaily ? 'Daily' : 'Weekly'} Survey Digest`,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Here's your ${isDaily ? 'daily' : 'weekly'} summary of survey responses.`,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Total Responses:*\n${totalResponses}`,
            },
            {
              type: 'mrkdwn',
              text: `*Avg NPS:*\n${avgNps !== null ? avgNps.toFixed(1) : 'N/A'}`,
            },
          ],
        },
      ]

      // Add per-survey stats
      for (const survey of stats.slice(0, 5)) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${survey.survey_name}*\n${survey.total_responses} responses | ${survey.avg_nps !== null ? `NPS: ${Number(survey.avg_nps).toFixed(1)}` : 'No NPS'} | ${survey.completion_rate.toFixed(0)}% completion${survey.top_attribution ? ` | Top: ${survey.top_attribution}` : ''}`,
          },
        })
      }

      blocks.push(
        { type: 'divider' },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View All Surveys',
              },
              url: `${adminUrl}/admin/surveys`,
              style: 'primary',
            },
          ],
        }
      )

      const result = await sendSlackMessage(config.webhook_url, {
        text: `${isDaily ? 'Daily' : 'Weekly'} Survey Digest: ${totalResponses} responses`,
        blocks,
      })

      if (!result.success) {
        return {
          success: false,
          error: { message: result.error || 'Failed to send digest', retryable: true },
        }
      }

      return {
        success: true,
        data: { sent: true, frequency, totalResponses, surveyCount: stats.length },
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
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 30000 },
})

// Schedule definitions for cron jobs
export const SURVEY_SCHEDULES = {
  dailyDigest: '0 9 * * *', // 9 AM daily
  weeklyDigest: '0 9 * * 1', // 9 AM Monday
} as const
