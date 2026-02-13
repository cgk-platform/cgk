/**
 * Queue statistics and monitoring queries
 *
 * @ai-pattern queue-monitoring
 * @ai-note Use for dashboard displays and alerting
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { QueueFilters, QueueStats, QueueType } from './types.js'

/**
 * Get queue statistics for a tenant
 */
export async function getQueueStats(
  tenantId: string,
  queueType: QueueType
): Promise<QueueStats> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'awaiting_delivery') as awaiting_delivery,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
            COUNT(*) FILTER (WHERE status = 'processing') as processing,
            COUNT(*) FILTER (WHERE status = 'sent') as sent,
            COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= CURRENT_DATE) as sent_today,
            COUNT(*) FILTER (WHERE status = 'failed' AND last_attempt_at >= CURRENT_DATE) as failed_today
          FROM review_email_queue WHERE tenant_id = ${tenantId}
        `
      case 'creator':
        return sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'awaiting_delivery') as awaiting_delivery,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
            COUNT(*) FILTER (WHERE status = 'processing') as processing,
            COUNT(*) FILTER (WHERE status = 'sent') as sent,
            COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= CURRENT_DATE) as sent_today,
            COUNT(*) FILTER (WHERE status = 'failed' AND last_attempt_at >= CURRENT_DATE) as failed_today
          FROM creator_email_queue WHERE tenant_id = ${tenantId}
        `
      case 'subscription':
        return sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'awaiting_delivery') as awaiting_delivery,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
            COUNT(*) FILTER (WHERE status = 'processing') as processing,
            COUNT(*) FILTER (WHERE status = 'sent') as sent,
            COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= CURRENT_DATE) as sent_today,
            COUNT(*) FILTER (WHERE status = 'failed' AND last_attempt_at >= CURRENT_DATE) as failed_today
          FROM subscription_email_queue WHERE tenant_id = ${tenantId}
        `
      case 'esign':
        return sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'awaiting_delivery') as awaiting_delivery,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
            COUNT(*) FILTER (WHERE status = 'processing') as processing,
            COUNT(*) FILTER (WHERE status = 'sent') as sent,
            COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= CURRENT_DATE) as sent_today,
            COUNT(*) FILTER (WHERE status = 'failed' AND last_attempt_at >= CURRENT_DATE) as failed_today
          FROM esign_email_queue WHERE tenant_id = ${tenantId}
        `
      case 'treasury':
        return sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'awaiting_delivery') as awaiting_delivery,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
            COUNT(*) FILTER (WHERE status = 'processing') as processing,
            COUNT(*) FILTER (WHERE status = 'sent') as sent,
            COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= CURRENT_DATE) as sent_today,
            COUNT(*) FILTER (WHERE status = 'failed' AND last_attempt_at >= CURRENT_DATE) as failed_today
          FROM treasury_email_queue WHERE tenant_id = ${tenantId}
        `
      case 'team_invitation':
        return sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'awaiting_delivery') as awaiting_delivery,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
            COUNT(*) FILTER (WHERE status = 'processing') as processing,
            COUNT(*) FILTER (WHERE status = 'sent') as sent,
            COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= CURRENT_DATE) as sent_today,
            COUNT(*) FILTER (WHERE status = 'failed' AND last_attempt_at >= CURRENT_DATE) as failed_today
          FROM team_invitation_queue WHERE tenant_id = ${tenantId}
        `
    }
  })

  const row = result.rows[0]
  return {
    pending: Number(row?.pending) || 0,
    awaitingDelivery: Number(row?.awaiting_delivery) || 0,
    scheduled: Number(row?.scheduled) || 0,
    processing: Number(row?.processing) || 0,
    sent: Number(row?.sent) || 0,
    skipped: Number(row?.skipped) || 0,
    failed: Number(row?.failed) || 0,
    total: Number(row?.total) || 0,
    sentToday: Number(row?.sent_today) || 0,
    failedToday: Number(row?.failed_today) || 0,
  }
}

/**
 * Get queue stats for a date range (review queue only)
 */
export async function getQueueStatsForRange(
  tenantId: string,
  queueType: QueueType,
  startDate: Date,
  endDate: Date
): Promise<QueueStats> {
  const startDateStr = startDate.toISOString()
  const endDateStr = endDate.toISOString()

  if (queueType !== 'review') {
    return getQueueStats(tenantId, queueType)
  }

  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'awaiting_delivery') as awaiting_delivery,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= CURRENT_DATE) as sent_today,
        COUNT(*) FILTER (WHERE status = 'failed' AND last_attempt_at >= CURRENT_DATE) as failed_today
      FROM review_email_queue
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startDateStr}::timestamptz
        AND created_at <= ${endDateStr}::timestamptz
    `
  })

  const row = result.rows[0]
  return {
    pending: Number(row?.pending) || 0,
    awaitingDelivery: Number(row?.awaiting_delivery) || 0,
    scheduled: Number(row?.scheduled) || 0,
    processing: Number(row?.processing) || 0,
    sent: Number(row?.sent) || 0,
    skipped: Number(row?.skipped) || 0,
    failed: Number(row?.failed) || 0,
    total: Number(row?.total) || 0,
    sentToday: Number(row?.sent_today) || 0,
    failedToday: Number(row?.failed_today) || 0,
  }
}

/**
 * Get daily send statistics (review queue only)
 */
export async function getDailySendStats(
  tenantId: string,
  queueType: QueueType,
  days: number = 30
): Promise<Array<{ date: string; sent: number; failed: number; skipped: number }>> {
  if (queueType !== 'review') {
    return []
  }

  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        DATE(COALESCE(sent_at, last_attempt_at, skipped_at, created_at)) as date,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'skipped') as skipped
      FROM review_email_queue
      WHERE tenant_id = ${tenantId}
        AND COALESCE(sent_at, last_attempt_at, skipped_at, created_at) >= CURRENT_DATE - INTERVAL '1 day' * ${days}
      GROUP BY DATE(COALESCE(sent_at, last_attempt_at, skipped_at, created_at))
      ORDER BY date DESC
    `
  })

  return result.rows.map((row) => ({
    date: String(row.date),
    sent: Number(row.sent) || 0,
    failed: Number(row.failed) || 0,
    skipped: Number(row.skipped) || 0,
  }))
}

/**
 * Get template usage statistics (review queue only)
 */
export async function getTemplateStats(
  tenantId: string,
  queueType: QueueType,
  days: number = 30
): Promise<Array<{ templateType: string; sent: number; failed: number }>> {
  if (queueType !== 'review') {
    return []
  }

  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        COALESCE(template_type, 'default') as template_type,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM review_email_queue
      WHERE tenant_id = ${tenantId}
        AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${days}
      GROUP BY template_type
      ORDER BY sent DESC
    `
  })

  return result.rows.map((row) => ({
    templateType: String(row.template_type),
    sent: Number(row.sent) || 0,
    failed: Number(row.failed) || 0,
  }))
}

/**
 * Get average send time statistics (review queue only)
 */
export async function getAverageSendTimes(
  tenantId: string,
  queueType: QueueType,
  days: number = 30
): Promise<{
  avgScheduleToSendMinutes: number
  avgAttemptsPerSend: number
  avgDelayDays: number
}> {
  if (queueType !== 'review') {
    return { avgScheduleToSendMinutes: 0, avgAttemptsPerSend: 0, avgDelayDays: 0 }
  }

  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        AVG(EXTRACT(EPOCH FROM (sent_at - scheduled_at)) / 60) as avg_schedule_to_send,
        AVG(attempts) as avg_attempts,
        AVG(delay_days) as avg_delay_days
      FROM review_email_queue
      WHERE tenant_id = ${tenantId}
        AND status = 'sent'
        AND sent_at >= CURRENT_DATE - INTERVAL '1 day' * ${days}
    `
  })

  const row = result.rows[0]
  return {
    avgScheduleToSendMinutes: Number(row?.avg_schedule_to_send) || 0,
    avgAttemptsPerSend: Number(row?.avg_attempts) || 0,
    avgDelayDays: Number(row?.avg_delay_days) || 0,
  }
}

/**
 * Get entries by status (review queue only, simplified)
 */
export async function getQueueEntries<T>(
  tenantId: string,
  queueType: QueueType,
  filters: QueueFilters = {}
): Promise<{ entries: T[]; total: number }> {
  if (queueType !== 'review') {
    return { entries: [], total: 0 }
  }

  const limit = filters.limit || 50
  const offset = filters.offset || 0

  const result = await withTenant(tenantId, async () => {
    // Simple query without dynamic filters
    return sql`
      SELECT * FROM review_email_queue
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
  })

  const countResult = await withTenant(tenantId, async () => {
    return sql`SELECT COUNT(*) as total FROM review_email_queue WHERE tenant_id = ${tenantId}`
  })

  return {
    entries: result.rows as T[],
    total: Number(countResult.rows[0]?.total) || 0,
  }
}

/**
 * Get scheduled entries count for upcoming hours (review queue only)
 */
export async function getUpcomingScheduledCount(
  tenantId: string,
  queueType: QueueType,
  hours: number = 24
): Promise<Array<{ hour: number; count: number }>> {
  if (queueType !== 'review') {
    return []
  }

  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        EXTRACT(HOUR FROM scheduled_at) as hour,
        COUNT(*) as count
      FROM review_email_queue
      WHERE tenant_id = ${tenantId}
        AND status = 'scheduled'
        AND scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '1 hour' * ${hours}
      GROUP BY EXTRACT(HOUR FROM scheduled_at)
      ORDER BY hour
    `
  })

  return result.rows.map((row) => ({
    hour: Number(row.hour),
    count: Number(row.count) || 0,
  }))
}

/**
 * Get all queue stats across all queue types for a tenant
 */
export async function getAllQueueStats(
  tenantId: string
): Promise<Record<QueueType, QueueStats>> {
  const queueTypes: QueueType[] = [
    'review',
    'creator',
    'subscription',
    'esign',
    'treasury',
    'team_invitation',
  ]

  const results = await Promise.all(
    queueTypes.map(async (queueType) => {
      const stats = await getQueueStats(tenantId, queueType)
      return [queueType, stats] as const
    })
  )

  return Object.fromEntries(results) as Record<QueueType, QueueStats>
}
