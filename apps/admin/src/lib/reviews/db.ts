/**
 * Review database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  Review,
  ReviewWithMedia,
  ReviewMedia,
  ReviewFilters,
  ReviewEmailTemplate,
  ReviewEmailQueueItem,
  ReviewEmailLog,
  ReviewEmailStats,
  EmailQueueFilters,
  ReviewBulkSendTemplate,
  ReviewBulkCampaign,
  BulkSendPreview,
  BulkCampaignFilters,
  ReviewIncentiveCode,
  IncentiveStats,
  IncentiveCodeFilters,
  ProductQuestion,
  ProductAnswer,
  QAAnswerTemplate,
  QuestionFilters,
  ReviewSettings,
  ReviewMigration,
  ReviewAnalytics,
  ProductReviewStats,
  ReviewTrendDataPoint,
  CreateReviewInput,
  UpdateEmailTemplateInput,
  CreateBulkSendTemplateInput,
  CreateBulkCampaignInput,
  AnswerQuestionInput,
  UpdateSettingsInput,
} from './types'

// =============================================================================
// REVIEWS
// =============================================================================

export async function getReviews(
  tenantSlug: string,
  filters: ReviewFilters,
): Promise<{ rows: Review[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status && filters.status !== 'all') {
      paramIndex++
      conditions.push(`r.status = $${paramIndex}::review_status`)
      values.push(filters.status)
    }

    if (filters.rating) {
      paramIndex++
      conditions.push(`r.rating = $${paramIndex}`)
      values.push(parseInt(filters.rating, 10))
    }

    if (filters.verified === 'true') {
      conditions.push('r.is_verified_purchase = true')
    } else if (filters.verified === 'false') {
      conditions.push('r.is_verified_purchase = false')
    }

    if (filters.product_id) {
      paramIndex++
      conditions.push(`r.product_id = $${paramIndex}`)
      values.push(filters.product_id)
    }

    if (filters.search) {
      paramIndex++
      conditions.push(`(r.author_name ILIKE $${paramIndex} OR r.title ILIKE $${paramIndex} OR r.body ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
    }

    if (filters.dateFrom) {
      paramIndex++
      conditions.push(`r.created_at >= $${paramIndex}::timestamptz`)
      values.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      paramIndex++
      conditions.push(`r.created_at <= $${paramIndex}::timestamptz`)
      values.push(filters.dateTo)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT r.id, r.product_id, p.title as product_title,
              r.order_id, r.author_name, r.author_email, r.is_verified_purchase,
              r.rating, r.title, r.body, r.status,
              r.verification_token, r.verified_at,
              r.helpful_votes, r.unhelpful_votes,
              r.imported_from, r.original_id,
              r.response_body, r.response_author, r.responded_at,
              r.created_at, r.updated_at
       FROM reviews r
       LEFT JOIN products p ON p.id = r.product_id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM reviews r ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as Review[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getPendingReviews(
  tenantSlug: string,
  productId?: string,
): Promise<ReviewWithMedia[]> {
  return withTenant(tenantSlug, async () => {
    let reviewsResult

    if (productId) {
      reviewsResult = await sql`
        SELECT r.id, r.product_id, p.title as product_title,
               r.order_id, r.author_name, r.author_email, r.is_verified_purchase,
               r.rating, r.title, r.body, r.status,
               r.verification_token, r.verified_at,
               r.helpful_votes, r.unhelpful_votes,
               r.imported_from, r.original_id,
               r.response_body, r.response_author, r.responded_at,
               r.created_at, r.updated_at
        FROM reviews r
        LEFT JOIN products p ON p.id = r.product_id
        WHERE r.status = 'pending' AND r.product_id = ${productId}
        ORDER BY r.created_at ASC
      `
    } else {
      reviewsResult = await sql`
        SELECT r.id, r.product_id, p.title as product_title,
               r.order_id, r.author_name, r.author_email, r.is_verified_purchase,
               r.rating, r.title, r.body, r.status,
               r.verification_token, r.verified_at,
               r.helpful_votes, r.unhelpful_votes,
               r.imported_from, r.original_id,
               r.response_body, r.response_author, r.responded_at,
               r.created_at, r.updated_at
        FROM reviews r
        LEFT JOIN products p ON p.id = r.product_id
        WHERE r.status = 'pending'
        ORDER BY r.created_at ASC
      `
    }

    const reviews = reviewsResult.rows as Review[]

    if (reviews.length === 0) {
      return []
    }

    const reviewIds = reviews.map((r) => r.id)
    const mediaResult = await sql.query(
      `SELECT id, review_id, media_type, url, thumbnail_url,
             mux_asset_id, mux_playback_id, duration_seconds,
             width, height, file_size_bytes, sort_order, created_at
      FROM review_media
      WHERE review_id = ANY($1)
      ORDER BY sort_order ASC`,
      [reviewIds]
    )

    const mediaByReview = new Map<string, ReviewMedia[]>()
    for (const media of mediaResult.rows as ReviewMedia[]) {
      const existing = mediaByReview.get(media.review_id)
      if (existing) {
        existing.push(media)
      } else {
        mediaByReview.set(media.review_id, [media])
      }
    }

    return reviews.map((review) => ({
      ...review,
      media: mediaByReview.get(review.id) || [],
    }))
  })
}

export async function getReview(
  tenantSlug: string,
  reviewId: string,
): Promise<ReviewWithMedia | null> {
  return withTenant(tenantSlug, async () => {
    const reviewResult = await sql`
      SELECT r.id, r.product_id, p.title as product_title,
             r.order_id, r.author_name, r.author_email, r.is_verified_purchase,
             r.rating, r.title, r.body, r.status,
             r.verification_token, r.verified_at,
             r.helpful_votes, r.unhelpful_votes,
             r.imported_from, r.original_id,
             r.response_body, r.response_author, r.responded_at,
             r.created_at, r.updated_at
      FROM reviews r
      LEFT JOIN products p ON p.id = r.product_id
      WHERE r.id = ${reviewId}
      LIMIT 1
    `

    if (reviewResult.rows.length === 0) {
      return null
    }

    const review = reviewResult.rows[0] as Review

    const mediaResult = await sql`
      SELECT id, review_id, media_type, url, thumbnail_url,
             mux_asset_id, mux_playback_id, duration_seconds,
             width, height, file_size_bytes, sort_order, created_at
      FROM review_media
      WHERE review_id = ${reviewId}
      ORDER BY sort_order ASC
    `

    return {
      ...review,
      media: mediaResult.rows as ReviewMedia[],
    }
  })
}

export async function createReview(
  tenantSlug: string,
  input: CreateReviewInput,
): Promise<Review> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO reviews (
        product_id, order_id, author_name, author_email,
        is_verified_purchase, rating, title, body
      ) VALUES (
        ${input.product_id}, ${input.order_id || null},
        ${input.author_name}, ${input.author_email},
        ${input.is_verified_purchase ?? false},
        ${input.rating}, ${input.title || null}, ${input.body || null}
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create review')
    }
    return row as Review
  })
}

export async function moderateReview(
  tenantSlug: string,
  reviewId: string,
  action: 'approve' | 'reject' | 'spam',
): Promise<boolean> {
  const statusMap: Record<string, string> = {
    approve: 'approved',
    reject: 'rejected',
    spam: 'spam',
  }
  const newStatus = statusMap[action]

  return withTenant(tenantSlug, async () => {
    const result = await sql.query(
      `UPDATE reviews SET status = $1::review_status, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [newStatus, reviewId],
    )
    return (result.rowCount ?? 0) > 0
  })
}

export async function bulkModerateReviews(
  tenantSlug: string,
  reviewIds: string[],
  action: 'approve' | 'reject' | 'spam' | 'verify' | 'unverify' | 'delete',
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    if (action === 'delete') {
      const result = await sql.query(
        `DELETE FROM reviews WHERE id = ANY($1)`,
        [reviewIds]
      )
      return result.rowCount ?? 0
    }

    if (action === 'verify' || action === 'unverify') {
      const result = await sql.query(
        `UPDATE reviews SET is_verified_purchase = $1, updated_at = NOW() WHERE id = ANY($2)`,
        [action === 'verify', reviewIds]
      )
      return result.rowCount ?? 0
    }

    const statusMap: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      spam: 'spam',
    }
    const newStatus = statusMap[action]

    const result = await sql.query(
      `UPDATE reviews SET status = $1::review_status, updated_at = NOW() WHERE id = ANY($2)`,
      [newStatus, reviewIds],
    )
    return result.rowCount ?? 0
  })
}

export async function respondToReview(
  tenantSlug: string,
  reviewId: string,
  responseBody: string,
  responseAuthor: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE reviews
      SET response_body = ${responseBody},
          response_author = ${responseAuthor},
          responded_at = NOW(),
          updated_at = NOW()
      WHERE id = ${reviewId}
      RETURNING id
    `
    return result.rows.length > 0
  })
}

export async function deleteReviewResponse(
  tenantSlug: string,
  reviewId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE reviews
      SET response_body = NULL,
          response_author = NULL,
          responded_at = NULL,
          updated_at = NOW()
      WHERE id = ${reviewId}
      RETURNING id
    `
    return result.rows.length > 0
  })
}

export async function deleteReview(
  tenantSlug: string,
  reviewId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`DELETE FROM reviews WHERE id = ${reviewId} RETURNING id`
    return result.rows.length > 0
  })
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export async function getEmailTemplates(
  tenantSlug: string,
): Promise<ReviewEmailTemplate[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, type, name, subject, body_html, body_text,
             is_enabled, delay_days, created_at, updated_at
      FROM review_email_templates
      ORDER BY
        CASE type
          WHEN 'request' THEN 1
          WHEN 'reminder_1' THEN 2
          WHEN 'reminder_2' THEN 3
          WHEN 'photo_request' THEN 4
          WHEN 'thank_you' THEN 5
          WHEN 'incentive' THEN 6
          ELSE 7
        END
    `
    return result.rows as ReviewEmailTemplate[]
  })
}

export async function getEmailTemplate(
  tenantSlug: string,
  templateId: string,
): Promise<ReviewEmailTemplate | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, type, name, subject, body_html, body_text,
             is_enabled, delay_days, created_at, updated_at
      FROM review_email_templates
      WHERE id = ${templateId}
      LIMIT 1
    `
    return (result.rows[0] as ReviewEmailTemplate) || null
  })
}

export async function updateEmailTemplate(
  tenantSlug: string,
  templateId: string,
  input: UpdateEmailTemplateInput,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (input.name !== undefined) {
      paramIndex++
      setClauses.push(`name = $${paramIndex}`)
      values.push(input.name)
    }

    if (input.subject !== undefined) {
      paramIndex++
      setClauses.push(`subject = $${paramIndex}`)
      values.push(input.subject)
    }

    if (input.body_html !== undefined) {
      paramIndex++
      setClauses.push(`body_html = $${paramIndex}`)
      values.push(input.body_html)
    }

    if (input.body_text !== undefined) {
      paramIndex++
      setClauses.push(`body_text = $${paramIndex}`)
      values.push(input.body_text)
    }

    if (input.is_enabled !== undefined) {
      paramIndex++
      setClauses.push(`is_enabled = $${paramIndex}`)
      values.push(input.is_enabled)
    }

    if (input.delay_days !== undefined) {
      paramIndex++
      setClauses.push(`delay_days = $${paramIndex}`)
      values.push(input.delay_days)
    }

    paramIndex++
    values.push(templateId)

    const result = await sql.query(
      `UPDATE review_email_templates SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id`,
      values,
    )
    return (result.rowCount ?? 0) > 0
  })
}

// =============================================================================
// EMAIL QUEUE
// =============================================================================

export async function getEmailQueue(
  tenantSlug: string,
  filters: EmailQueueFilters,
): Promise<{ rows: ReviewEmailQueueItem[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status && filters.status !== 'all') {
      paramIndex++
      conditions.push(`eq.status = $${paramIndex}::review_email_status`)
      values.push(filters.status)
    }

    if (filters.dateFrom) {
      paramIndex++
      conditions.push(`eq.scheduled_at >= $${paramIndex}::timestamptz`)
      values.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      paramIndex++
      conditions.push(`eq.scheduled_at <= $${paramIndex}::timestamptz`)
      values.push(filters.dateTo)
    }

    if (filters.product_id) {
      paramIndex++
      conditions.push(`eq.product_id = $${paramIndex}`)
      values.push(filters.product_id)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT eq.id, eq.customer_email, eq.customer_name,
              eq.order_id, eq.product_id, p.title as product_title,
              eq.template_id, eq.status, eq.scheduled_at,
              eq.sent_at, eq.delivered_at, eq.opened_at, eq.clicked_at,
              eq.error_message, eq.provider_message_id, eq.created_at
       FROM review_email_queue eq
       LEFT JOIN products p ON p.id = eq.product_id
       ${whereClause}
       ORDER BY eq.scheduled_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM review_email_queue eq ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as ReviewEmailQueueItem[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function cancelEmailQueueItems(
  tenantSlug: string,
  queueIds: string[],
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const result = await sql.query(
      `DELETE FROM review_email_queue WHERE id = ANY($1) AND status = 'pending'`,
      [queueIds]
    )
    return result.rowCount ?? 0
  })
}

export async function retryEmailQueueItems(
  tenantSlug: string,
  queueIds: string[],
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const result = await sql.query(
      `UPDATE review_email_queue SET status = 'pending', error_message = NULL, scheduled_at = NOW() WHERE id = ANY($1) AND status IN ('failed', 'bounced')`,
      [queueIds]
    )
    return result.rowCount ?? 0
  })
}

export async function getEmailLogs(
  tenantSlug: string,
  queueId?: string,
  limit = 100,
  offset = 0,
): Promise<{ rows: ReviewEmailLog[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    let dataResult
    let countResult

    if (queueId) {
      dataResult = await sql`
        SELECT id, queue_id, event_type, event_data, created_at
        FROM review_email_logs
        WHERE queue_id = ${queueId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      countResult = await sql`
        SELECT COUNT(*) as count FROM review_email_logs WHERE queue_id = ${queueId}
      `
    } else {
      dataResult = await sql`
        SELECT id, queue_id, event_type, event_data, created_at
        FROM review_email_logs
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      countResult = await sql`
        SELECT COUNT(*) as count FROM review_email_logs
      `
    }

    return {
      rows: dataResult.rows as ReviewEmailLog[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getEmailStats(
  tenantSlug: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<ReviewEmailStats> {
  return withTenant(tenantSlug, async () => {
    let result
    let reviewedResult

    if (dateFrom && dateTo) {
      result = await sql`
        SELECT
          COUNT(*) FILTER (WHERE status != 'pending') as total_sent,
          COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')) as total_delivered,
          COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')) as total_opened,
          COUNT(*) FILTER (WHERE status = 'clicked') as total_clicked
        FROM review_email_queue
        WHERE created_at >= ${dateFrom}::timestamptz AND created_at <= ${dateTo}::timestamptz
      `
      reviewedResult = await sql`
        SELECT COUNT(DISTINCT r.author_email) as total_reviewed
        FROM reviews r
        INNER JOIN review_email_queue eq ON eq.customer_email = r.author_email AND eq.product_id = r.product_id
        WHERE eq.created_at >= ${dateFrom}::timestamptz AND eq.created_at <= ${dateTo}::timestamptz
      `
    } else {
      result = await sql`
        SELECT
          COUNT(*) FILTER (WHERE status != 'pending') as total_sent,
          COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')) as total_delivered,
          COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')) as total_opened,
          COUNT(*) FILTER (WHERE status = 'clicked') as total_clicked
        FROM review_email_queue
      `
      reviewedResult = await sql`
        SELECT COUNT(DISTINCT r.author_email) as total_reviewed
        FROM reviews r
        INNER JOIN review_email_queue eq ON eq.customer_email = r.author_email AND eq.product_id = r.product_id
      `
    }

    const stats = result.rows[0]
    const totalSent = Number(stats?.total_sent || 0)
    const totalDelivered = Number(stats?.total_delivered || 0)
    const totalOpened = Number(stats?.total_opened || 0)
    const totalClicked = Number(stats?.total_clicked || 0)
    const totalReviewed = Number(reviewedResult.rows[0]?.total_reviewed || 0)

    return {
      total_sent: totalSent,
      total_delivered: totalDelivered,
      total_opened: totalOpened,
      total_clicked: totalClicked,
      total_reviewed: totalReviewed,
      delivery_rate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      open_rate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      click_rate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      review_rate: totalSent > 0 ? (totalReviewed / totalSent) * 100 : 0,
    }
  })
}

// =============================================================================
// BULK SEND TEMPLATES
// =============================================================================

export async function getBulkSendTemplates(
  tenantSlug: string,
  includeArchived = false,
): Promise<ReviewBulkSendTemplate[]> {
  return withTenant(tenantSlug, async () => {
    let result

    if (includeArchived) {
      result = await sql`
        SELECT id, name, description, subject, body_html, body_text,
               include_incentive, times_used, total_sent, total_reviewed,
               is_archived, created_at, updated_at
        FROM review_bulk_send_templates
        ORDER BY created_at DESC
      `
    } else {
      result = await sql`
        SELECT id, name, description, subject, body_html, body_text,
               include_incentive, times_used, total_sent, total_reviewed,
               is_archived, created_at, updated_at
        FROM review_bulk_send_templates
        WHERE is_archived = false
        ORDER BY created_at DESC
      `
    }
    return result.rows as ReviewBulkSendTemplate[]
  })
}

export async function createBulkSendTemplate(
  tenantSlug: string,
  input: CreateBulkSendTemplateInput,
): Promise<ReviewBulkSendTemplate> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO review_bulk_send_templates (
        name, description, subject, body_html, body_text, include_incentive
      ) VALUES (
        ${input.name}, ${input.description || null}, ${input.subject},
        ${input.body_html}, ${input.body_text || null},
        ${input.include_incentive ?? false}
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create bulk send template')
    }
    return row as ReviewBulkSendTemplate
  })
}

export async function updateBulkSendTemplate(
  tenantSlug: string,
  templateId: string,
  input: Partial<CreateBulkSendTemplateInput> & { is_archived?: boolean },
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (input.name !== undefined) {
      paramIndex++
      setClauses.push(`name = $${paramIndex}`)
      values.push(input.name)
    }

    if (input.description !== undefined) {
      paramIndex++
      setClauses.push(`description = $${paramIndex}`)
      values.push(input.description)
    }

    if (input.subject !== undefined) {
      paramIndex++
      setClauses.push(`subject = $${paramIndex}`)
      values.push(input.subject)
    }

    if (input.body_html !== undefined) {
      paramIndex++
      setClauses.push(`body_html = $${paramIndex}`)
      values.push(input.body_html)
    }

    if (input.body_text !== undefined) {
      paramIndex++
      setClauses.push(`body_text = $${paramIndex}`)
      values.push(input.body_text)
    }

    if (input.include_incentive !== undefined) {
      paramIndex++
      setClauses.push(`include_incentive = $${paramIndex}`)
      values.push(input.include_incentive)
    }

    if (input.is_archived !== undefined) {
      paramIndex++
      setClauses.push(`is_archived = $${paramIndex}`)
      values.push(input.is_archived)
    }

    paramIndex++
    values.push(templateId)

    const result = await sql.query(
      `UPDATE review_bulk_send_templates SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id`,
      values,
    )
    return (result.rowCount ?? 0) > 0
  })
}

export async function deleteBulkSendTemplate(
  tenantSlug: string,
  templateId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM review_bulk_send_templates WHERE id = ${templateId} RETURNING id
    `
    return result.rows.length > 0
  })
}

// =============================================================================
// BULK CAMPAIGNS
// =============================================================================

export async function getBulkCampaigns(
  tenantSlug: string,
  limit = 50,
  offset = 0,
): Promise<{ rows: ReviewBulkCampaign[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const dataResult = await sql`
      SELECT bc.id, bc.name, bc.template_id, t.name as template_name,
             bc.filters, bc.status, bc.total_recipients, bc.sent_count, bc.error_count,
             bc.send_rate, bc.scheduled_at, bc.started_at, bc.completed_at,
             bc.created_at, bc.updated_at
      FROM review_bulk_campaigns bc
      LEFT JOIN review_bulk_send_templates t ON t.id = bc.template_id
      ORDER BY bc.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`SELECT COUNT(*) as count FROM review_bulk_campaigns`

    return {
      rows: dataResult.rows as ReviewBulkCampaign[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getBulkCampaign(
  tenantSlug: string,
  campaignId: string,
): Promise<ReviewBulkCampaign | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT bc.id, bc.name, bc.template_id, t.name as template_name,
             bc.filters, bc.status, bc.total_recipients, bc.sent_count, bc.error_count,
             bc.send_rate, bc.scheduled_at, bc.started_at, bc.completed_at,
             bc.created_at, bc.updated_at
      FROM review_bulk_campaigns bc
      LEFT JOIN review_bulk_send_templates t ON t.id = bc.template_id
      WHERE bc.id = ${campaignId}
      LIMIT 1
    `
    return (result.rows[0] as ReviewBulkCampaign) || null
  })
}

export async function createBulkCampaign(
  tenantSlug: string,
  input: CreateBulkCampaignInput,
): Promise<ReviewBulkCampaign> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO review_bulk_campaigns (
        name, template_id, filters, send_rate, scheduled_at
      ) VALUES (
        ${input.name}, ${input.template_id},
        ${JSON.stringify(input.filters)},
        ${input.send_rate || null},
        ${input.scheduled_at || null}
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create bulk campaign')
    }
    return row as ReviewBulkCampaign
  })
}

export async function getBulkSendPreview(
  tenantSlug: string,
  filters: BulkCampaignFilters,
): Promise<BulkSendPreview> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.dateFrom) {
      paramIndex++
      conditions.push(`o.order_placed_at >= $${paramIndex}::timestamptz`)
      values.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      paramIndex++
      conditions.push(`o.order_placed_at <= $${paramIndex}::timestamptz`)
      values.push(filters.dateTo)
    }

    if (filters.productIds && filters.productIds.length > 0) {
      paramIndex++
      conditions.push(`oi.product_id = ANY($${paramIndex})`)
      values.push(filters.productIds)
    }

    if (filters.minOrderValue) {
      paramIndex++
      conditions.push(`o.total_price_cents >= $${paramIndex}`)
      values.push(filters.minOrderValue)
    }

    if (filters.excludeReviewed) {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM reviews r WHERE r.author_email = c.email AND r.product_id = oi.product_id
      )`)
    }

    if (filters.excludeRequested) {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM review_email_queue eq WHERE eq.customer_email = c.email AND eq.product_id = oi.product_id
      )`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await sql.query(
      `SELECT COUNT(DISTINCT (c.email, oi.product_id)) as count
       FROM orders o
       INNER JOIN order_items oi ON oi.order_id = o.id
       INNER JOIN customers c ON c.id = o.customer_id
       LEFT JOIN products p ON p.id = oi.product_id
       ${whereClause}`,
      values,
    )

    const sampleResult = await sql.query(
      `SELECT DISTINCT ON (c.email, oi.product_id)
              c.email as customer_email,
              c.first_name || ' ' || c.last_name as customer_name,
              o.shopify_order_id as order_id,
              oi.product_id,
              p.title as product_title
       FROM orders o
       INNER JOIN order_items oi ON oi.order_id = o.id
       INNER JOIN customers c ON c.id = o.customer_id
       LEFT JOIN products p ON p.id = oi.product_id
       ${whereClause}
       LIMIT 10`,
      values,
    )

    const totalCount = Number(countResult.rows[0]?.count || 0)

    return {
      total_count: totalCount,
      sample_recipients: sampleResult.rows as BulkSendPreview['sample_recipients'],
      estimated_completion_minutes: Math.ceil(totalCount / 60), // Assuming 60 emails per minute
    }
  })
}

export async function executeBulkCampaign(
  tenantSlug: string,
  campaignId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE review_bulk_campaigns
      SET status = 'in_progress', started_at = NOW()
      WHERE id = ${campaignId} AND status IN ('draft', 'scheduled')
      RETURNING id
    `
    return result.rows.length > 0
  })
}

export async function cancelBulkCampaign(
  tenantSlug: string,
  campaignId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE review_bulk_campaigns
      SET status = 'cancelled'
      WHERE id = ${campaignId} AND status IN ('draft', 'scheduled', 'in_progress')
      RETURNING id
    `
    return result.rows.length > 0
  })
}

export async function deleteBulkCampaign(
  tenantSlug: string,
  campaignId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM review_bulk_campaigns
      WHERE id = ${campaignId} AND status = 'draft'
      RETURNING id
    `
    return result.rows.length > 0
  })
}

// =============================================================================
// INCENTIVE CODES
// =============================================================================

export async function getIncentiveCodes(
  tenantSlug: string,
  filters: IncentiveCodeFilters,
): Promise<{ rows: ReviewIncentiveCode[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status && filters.status !== 'all') {
      paramIndex++
      conditions.push(`status = $${paramIndex}::incentive_code_status`)
      values.push(filters.status)
    }

    if (filters.search) {
      paramIndex++
      conditions.push(`(code ILIKE $${paramIndex} OR customer_email ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT id, code, review_id, customer_email, discount_type, discount_value,
              status, expires_at, redeemed_at, redeemed_order_id, created_at
       FROM review_incentive_codes
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM review_incentive_codes ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as ReviewIncentiveCode[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function generateIncentiveCodes(
  tenantSlug: string,
  count: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  expiryDays: number,
  prefix = 'REVIEW',
): Promise<ReviewIncentiveCode[]> {
  return withTenant(tenantSlug, async () => {
    const codes: ReviewIncentiveCode[] = []
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiryDays)

    for (let i = 0; i < count; i++) {
      const code = `${prefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      const result = await sql`
        INSERT INTO review_incentive_codes (code, discount_type, discount_value, expires_at)
        VALUES (${code}, ${discountType}, ${discountValue}, ${expiresAt.toISOString()})
        ON CONFLICT (code) DO NOTHING
        RETURNING *
      `
      if (result.rows.length > 0) {
        codes.push(result.rows[0] as ReviewIncentiveCode)
      }
    }

    return codes
  })
}

export async function getIncentiveStats(
  tenantSlug: string,
): Promise<IncentiveStats> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as total_active,
        COUNT(*) FILTER (WHERE status = 'redeemed') as total_redeemed,
        COUNT(*) FILTER (WHERE status = 'expired') as total_expired,
        COUNT(*) as total_issued,
        COALESCE(SUM(discount_value) FILTER (WHERE status = 'redeemed'), 0) as total_discount_given
      FROM review_incentive_codes
    `

    const stats = result.rows[0]
    const totalIssued = Number(stats?.total_issued || 0)
    const totalRedeemed = Number(stats?.total_redeemed || 0)

    return {
      total_issued: totalIssued,
      total_redeemed: totalRedeemed,
      total_expired: Number(stats?.total_expired || 0),
      redemption_rate: totalIssued > 0 ? (totalRedeemed / totalIssued) * 100 : 0,
      total_discount_given: Number(stats?.total_discount_given || 0),
      total_revenue_from_redemptions: 0, // Would need order data to calculate
    }
  })
}

// =============================================================================
// Q&A
// =============================================================================

export async function getQuestions(
  tenantSlug: string,
  filters: QuestionFilters,
): Promise<{ rows: ProductQuestion[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status && filters.status !== 'all') {
      paramIndex++
      conditions.push(`q.status = $${paramIndex}::question_status`)
      values.push(filters.status)
    }

    if (filters.product_id) {
      paramIndex++
      conditions.push(`q.product_id = $${paramIndex}`)
      values.push(filters.product_id)
    }

    if (filters.search) {
      paramIndex++
      conditions.push(`(q.question ILIKE $${paramIndex} OR q.customer_name ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT q.id, q.product_id, p.title as product_title,
              q.customer_email, q.customer_name, q.question, q.status, q.created_at
       FROM product_questions q
       LEFT JOIN products p ON p.id = q.product_id
       ${whereClause}
       ORDER BY q.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM product_questions q ${whereClause}`,
      countValues,
    )

    const questions = dataResult.rows as ProductQuestion[]

    // Load answers for answered questions
    const answeredIds = questions.filter((q) => q.status === 'answered').map((q) => q.id)
    if (answeredIds.length > 0) {
      const answersResult = await sql.query(
        `SELECT id, question_id, answer, answered_by, created_at FROM product_answers WHERE question_id = ANY($1)`,
        [answeredIds]
      )

      const answersByQuestion = new Map<string, ProductAnswer>()
      for (const answer of answersResult.rows as ProductAnswer[]) {
        answersByQuestion.set(answer.question_id, answer)
      }

      for (const question of questions) {
        question.answer = answersByQuestion.get(question.id) || null
      }
    }

    return {
      rows: questions,
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getQuestion(
  tenantSlug: string,
  questionId: string,
): Promise<ProductQuestion | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT q.id, q.product_id, p.title as product_title,
             q.customer_email, q.customer_name, q.question, q.status, q.created_at
      FROM product_questions q
      LEFT JOIN products p ON p.id = q.product_id
      WHERE q.id = ${questionId}
      LIMIT 1
    `

    if (result.rows.length === 0) {
      return null
    }

    const question = result.rows[0] as ProductQuestion

    const answerResult = await sql`
      SELECT id, question_id, answer, answered_by, created_at
      FROM product_answers
      WHERE question_id = ${questionId}
      LIMIT 1
    `

    question.answer = (answerResult.rows[0] as ProductAnswer) || null

    return question
  })
}

export async function answerQuestion(
  tenantSlug: string,
  questionId: string,
  input: AnswerQuestionInput,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    // Insert answer
    await sql`
      INSERT INTO product_answers (question_id, answer, answered_by)
      VALUES (${questionId}, ${input.answer}, ${input.answered_by || null})
    `

    // Update question status
    const result = await sql`
      UPDATE product_questions SET status = 'answered' WHERE id = ${questionId} RETURNING id
    `

    return result.rows.length > 0
  })
}

export async function rejectQuestion(
  tenantSlug: string,
  questionId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE product_questions SET status = 'rejected' WHERE id = ${questionId} RETURNING id
    `
    return result.rows.length > 0
  })
}

export async function getAnswerTemplates(
  tenantSlug: string,
): Promise<QAAnswerTemplate[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, name, answer_text, times_used, created_at, updated_at
      FROM qa_answer_templates
      ORDER BY times_used DESC, created_at DESC
    `
    return result.rows as QAAnswerTemplate[]
  })
}

export async function incrementAnswerTemplateUsage(
  tenantSlug: string,
  templateId: string,
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      UPDATE qa_answer_templates SET times_used = times_used + 1 WHERE id = ${templateId}
    `
  })
}

// =============================================================================
// SETTINGS
// =============================================================================

export async function getSettings(
  tenantSlug: string,
): Promise<ReviewSettings> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM review_settings WHERE id = 'default' LIMIT 1
    `

    if (result.rows.length === 0) {
      // Return defaults if no settings exist
      return {
        id: 'default',
        provider: 'internal',
        provider_credentials: null,
        request_delay_days: 7,
        reminder_count: 2,
        reminder_interval_days: 3,
        order_status_trigger: 'delivered',
        auto_approve: false,
        auto_approve_min_rating: null,
        auto_approve_verified_only: false,
        profanity_filter: true,
        spam_detection: true,
        show_verified_badge: true,
        allow_media: true,
        max_media_count: 5,
        allow_rating_only: false,
        min_review_length: 0,
        incentive_enabled: false,
        incentive_discount_type: null,
        incentive_discount_value: null,
        incentive_expiry_days: 30,
        incentive_min_rating: null,
        incentive_min_word_count: null,
        incentive_require_photo: false,
        shopify_sync_enabled: false,
        klaviyo_sync_enabled: false,
        updated_at: new Date().toISOString(),
      }
    }

    return result.rows[0] as ReviewSettings
  })
}

export async function updateSettings(
  tenantSlug: string,
  input: UpdateSettingsInput,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    const fields: Array<[keyof UpdateSettingsInput, string]> = [
      ['provider', 'provider'],
      ['provider_credentials', 'provider_credentials'],
      ['request_delay_days', 'request_delay_days'],
      ['reminder_count', 'reminder_count'],
      ['reminder_interval_days', 'reminder_interval_days'],
      ['order_status_trigger', 'order_status_trigger'],
      ['auto_approve', 'auto_approve'],
      ['auto_approve_min_rating', 'auto_approve_min_rating'],
      ['auto_approve_verified_only', 'auto_approve_verified_only'],
      ['profanity_filter', 'profanity_filter'],
      ['spam_detection', 'spam_detection'],
      ['show_verified_badge', 'show_verified_badge'],
      ['allow_media', 'allow_media'],
      ['max_media_count', 'max_media_count'],
      ['allow_rating_only', 'allow_rating_only'],
      ['min_review_length', 'min_review_length'],
      ['incentive_enabled', 'incentive_enabled'],
      ['incentive_discount_type', 'incentive_discount_type'],
      ['incentive_discount_value', 'incentive_discount_value'],
      ['incentive_expiry_days', 'incentive_expiry_days'],
      ['incentive_min_rating', 'incentive_min_rating'],
      ['incentive_min_word_count', 'incentive_min_word_count'],
      ['incentive_require_photo', 'incentive_require_photo'],
      ['shopify_sync_enabled', 'shopify_sync_enabled'],
      ['klaviyo_sync_enabled', 'klaviyo_sync_enabled'],
    ]

    for (const [key, column] of fields) {
      if (input[key] !== undefined) {
        paramIndex++
        if (key === 'provider_credentials') {
          setClauses.push(`${column} = $${paramIndex}::jsonb`)
          values.push(JSON.stringify(input[key]))
        } else {
          setClauses.push(`${column} = $${paramIndex}`)
          values.push(input[key])
        }
      }
    }

    const result = await sql.query(
      `INSERT INTO review_settings (id) VALUES ('default')
       ON CONFLICT (id) DO UPDATE SET ${setClauses.join(', ')}
       RETURNING id`,
      values,
    )
    return (result.rowCount ?? 0) > 0
  })
}

// =============================================================================
// ANALYTICS
// =============================================================================

export async function getReviewAnalytics(
  tenantSlug: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<ReviewAnalytics> {
  return withTenant(tenantSlug, async () => {
    let statsResult
    let ratingResult
    let responseTimeResult

    if (dateFrom && dateTo) {
      // Total reviews and status breakdown with date filter
      statsResult = await sql`
        SELECT
          COUNT(*) as total_reviews,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
          COUNT(*) FILTER (WHERE status = 'spam') as spam_count,
          COALESCE(AVG(rating), 0) as average_rating,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM review_media rm WHERE rm.review_id = reviews.id
          )) as reviews_with_media,
          COUNT(*) FILTER (WHERE response_body IS NOT NULL) as reviews_with_response
        FROM reviews
        WHERE created_at >= ${dateFrom}::timestamptz AND created_at <= ${dateTo}::timestamptz
      `
      // Rating distribution with date filter
      ratingResult = await sql`
        SELECT rating, COUNT(*) as count
        FROM reviews
        WHERE created_at >= ${dateFrom}::timestamptz AND created_at <= ${dateTo}::timestamptz
        GROUP BY rating
        ORDER BY rating DESC
      `
      // Average response time with date filter
      responseTimeResult = await sql`
        SELECT AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 3600) as avg_hours
        FROM reviews
        WHERE response_body IS NOT NULL
          AND created_at >= ${dateFrom}::timestamptz AND created_at <= ${dateTo}::timestamptz
      `
    } else {
      // Total reviews and status breakdown without date filter
      statsResult = await sql`
        SELECT
          COUNT(*) as total_reviews,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
          COUNT(*) FILTER (WHERE status = 'spam') as spam_count,
          COALESCE(AVG(rating), 0) as average_rating,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM review_media rm WHERE rm.review_id = reviews.id
          )) as reviews_with_media,
          COUNT(*) FILTER (WHERE response_body IS NOT NULL) as reviews_with_response
        FROM reviews
      `
      // Rating distribution without date filter
      ratingResult = await sql`
        SELECT rating, COUNT(*) as count
        FROM reviews
        GROUP BY rating
        ORDER BY rating DESC
      `
      // Average response time without date filter
      responseTimeResult = await sql`
        SELECT AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 3600) as avg_hours
        FROM reviews
        WHERE response_body IS NOT NULL
      `
    }

    // This month's reviews
    const thisMonthResult = await sql`
      SELECT COUNT(*) as count FROM reviews
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `

    // Last month's reviews
    const lastMonthResult = await sql`
      SELECT COUNT(*) as count FROM reviews
      WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        AND created_at < date_trunc('month', CURRENT_DATE)
    `

    const stats = statsResult.rows[0]
    const totalReviews = Number(stats?.total_reviews || 0)
    const reviewsWithResponse = Number(stats?.reviews_with_response || 0)

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const row of ratingResult.rows as Array<{ rating: number; count: string }>) {
      ratingDistribution[row.rating] = Number(row.count)
    }

    return {
      total_reviews: totalReviews,
      reviews_this_month: Number(thisMonthResult.rows[0]?.count || 0),
      reviews_last_month: Number(lastMonthResult.rows[0]?.count || 0),
      average_rating: Number(stats?.average_rating || 0),
      rating_distribution: ratingDistribution,
      reviews_by_status: {
        pending: Number(stats?.pending_count || 0),
        approved: Number(stats?.approved_count || 0),
        rejected: Number(stats?.rejected_count || 0),
        spam: Number(stats?.spam_count || 0),
      },
      reviews_with_media: Number(stats?.reviews_with_media || 0),
      response_rate: totalReviews > 0 ? (reviewsWithResponse / totalReviews) * 100 : 0,
      average_response_time_hours: Number(responseTimeResult.rows[0]?.avg_hours || 0),
    }
  })
}

export async function getProductReviewStats(
  tenantSlug: string,
  limit = 20,
): Promise<ProductReviewStats[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        r.product_id,
        p.title as product_title,
        COUNT(*) as review_count,
        COALESCE(AVG(r.rating), 0) as average_rating
      FROM reviews r
      LEFT JOIN products p ON p.id = r.product_id
      WHERE r.status = 'approved'
      GROUP BY r.product_id, p.title
      ORDER BY review_count DESC
      LIMIT ${limit}
    `

    const products = result.rows as Array<{
      product_id: string
      product_title: string | null
      review_count: string
      average_rating: string
    }>

    // Get rating distribution for each product
    const productIds = products.map((p) => p.product_id)
    const distributionResult = await sql.query(
      `SELECT product_id, rating, COUNT(*) as count FROM reviews WHERE product_id = ANY($1) AND status = 'approved' GROUP BY product_id, rating`,
      [productIds]
    )

    const distributionsByProduct = new Map<string, Record<number, number>>()
    for (const row of distributionResult.rows as Array<{ product_id: string; rating: number; count: string }>) {
      let distribution = distributionsByProduct.get(row.product_id)
      if (!distribution) {
        distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        distributionsByProduct.set(row.product_id, distribution)
      }
      distribution[row.rating] = Number(row.count)
    }

    return products.map((p) => ({
      product_id: p.product_id,
      product_title: p.product_title,
      review_count: Number(p.review_count),
      average_rating: Number(p.average_rating),
      rating_distribution: distributionsByProduct.get(p.product_id) || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }))
  })
}

export async function getReviewTrends(
  tenantSlug: string,
  days = 30,
): Promise<ReviewTrendDataPoint[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(AVG(rating), 0) as average_rating
      FROM reviews
      WHERE created_at >= CURRENT_DATE - ${days}::int * INTERVAL '1 day'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    return result.rows as ReviewTrendDataPoint[]
  })
}

// =============================================================================
// MIGRATIONS
// =============================================================================

export async function getMigrationHistory(
  tenantSlug: string,
): Promise<ReviewMigration[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, migration_type, source, destination, status,
             total_records, processed_records, success_records, error_records,
             error_log, started_at, completed_at, created_at
      FROM review_migrations
      ORDER BY created_at DESC
      LIMIT 50
    `
    return result.rows as ReviewMigration[]
  })
}

export async function createMigration(
  tenantSlug: string,
  migrationType: 'import' | 'export' | 'provider_switch',
  source?: string,
  destination?: string,
): Promise<ReviewMigration> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO review_migrations (migration_type, source, destination)
      VALUES (${migrationType}, ${source || null}, ${destination || null})
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create migration')
    }
    return row as ReviewMigration
  })
}

export async function updateMigrationProgress(
  tenantSlug: string,
  migrationId: string,
  processed: number,
  success: number,
  errors: number,
  status?: 'in_progress' | 'completed' | 'failed',
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    if (status === 'in_progress') {
      await sql`
        UPDATE review_migrations
        SET processed_records = ${processed},
            success_records = ${success},
            error_records = ${errors},
            status = ${status},
            started_at = COALESCE(started_at, NOW()),
            updated_at = NOW()
        WHERE id = ${migrationId}
      `
    } else if (status === 'completed' || status === 'failed') {
      await sql`
        UPDATE review_migrations
        SET processed_records = ${processed},
            success_records = ${success},
            error_records = ${errors},
            status = ${status},
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${migrationId}
      `
    } else {
      await sql`
        UPDATE review_migrations
        SET processed_records = ${processed},
            success_records = ${success},
            error_records = ${errors}
        WHERE id = ${migrationId}
      `
    }
  })
}
