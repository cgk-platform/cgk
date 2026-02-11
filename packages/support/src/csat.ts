/**
 * CSAT (Customer Satisfaction) Service
 * Phase 2SP-CHANNELS: CSAT surveys and metrics
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always use withTenant() for all database operations
 */

import { sql, withTenant } from '@cgk/db'

import type {
  AgentCSATScore,
  CSATChannel,
  CSATConfig,
  CSATMetrics,
  CSATMetricsDaily,
  CSATMetricsOptions,
  CSATRating,
  CSATSurvey,
  CSATSurveyFilters,
  CreateSurveyInput,
  SubmitSurveyResponseInput,
} from './channel-types'

// ============================================
// SURVEY MANAGEMENT
// ============================================

/**
 * Create a new CSAT survey
 */
export async function createSurvey(
  tenantId: string,
  data: CreateSurveyInput
): Promise<CSATSurvey> {
  return withTenant(tenantId, async () => {
    // Get expiry days from config
    const configResult = await sql`
      SELECT expiry_days FROM csat_config WHERE id = 1
    `
    const configRow = configResult.rows[0] as Record<string, unknown> | undefined
    const expiryDays = (configRow?.expiry_days as number) ?? 7

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiryDays)

    const result = await sql`
      INSERT INTO csat_surveys (
        ticket_id,
        conversation_id,
        customer_email,
        customer_id,
        agent_id,
        channel,
        expires_at
      ) VALUES (
        ${data.ticketId ?? null},
        ${data.conversationId ?? null},
        ${data.customerEmail},
        ${data.customerId ?? null},
        ${data.agentId ?? null},
        ${data.channel ?? 'email'},
        ${expiresAt.toISOString()}
      )
      RETURNING *
    `

    // Update daily metrics - increment sent count
    await updateDailyMetrics('sent')

    const row = result.rows[0] as Record<string, unknown> | undefined
    if (!row) {
      throw new Error('Failed to create survey')
    }
    return mapSurveyRow(row)
  })
}

/**
 * Get a CSAT survey by ID
 */
export async function getSurvey(
  tenantId: string,
  surveyId: string
): Promise<CSATSurvey | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT s.*,
        sa.id as agent_id_ref,
        sa.name as agent_name,
        sa.email as agent_email
      FROM csat_surveys s
      LEFT JOIN support_agents sa ON sa.id = s.agent_id
      WHERE s.id = ${surveyId}
    `

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0] as Record<string, unknown>
    return mapSurveyRowWithAgent(row)
  })
}

/**
 * Get surveys with filters
 */
export async function getSurveys(
  tenantId: string,
  filters: CSATSurveyFilters = {}
): Promise<{ surveys: CSATSurvey[]; total: number }> {
  return withTenant(tenantId, async () => {
    const limit = filters.limit ?? 50
    const offset = ((filters.page ?? 1) - 1) * limit

    // Build query based on filters - use parameterized queries
    // For simplicity, we'll do conditional queries rather than dynamic SQL

    // Get total count based on filters
    let countResult
    let surveysResult

    if (filters.ticketId) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM csat_surveys WHERE ticket_id = ${filters.ticketId}
      `
      surveysResult = await sql`
        SELECT s.*, sa.id as agent_id_ref, sa.name as agent_name, sa.email as agent_email
        FROM csat_surveys s
        LEFT JOIN support_agents sa ON sa.id = s.agent_id
        WHERE s.ticket_id = ${filters.ticketId}
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.agentId) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM csat_surveys WHERE agent_id = ${filters.agentId}
      `
      surveysResult = await sql`
        SELECT s.*, sa.id as agent_id_ref, sa.name as agent_name, sa.email as agent_email
        FROM csat_surveys s
        LEFT JOIN support_agents sa ON sa.id = s.agent_id
        WHERE s.agent_id = ${filters.agentId}
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.customerEmail) {
      const emailPattern = `%${filters.customerEmail}%`
      countResult = await sql`
        SELECT COUNT(*) as count FROM csat_surveys WHERE customer_email ILIKE ${emailPattern}
      `
      surveysResult = await sql`
        SELECT s.*, sa.id as agent_id_ref, sa.name as agent_name, sa.email as agent_email
        FROM csat_surveys s
        LEFT JOIN support_agents sa ON sa.id = s.agent_id
        WHERE s.customer_email ILIKE ${emailPattern}
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.channel) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM csat_surveys WHERE channel = ${filters.channel}
      `
      surveysResult = await sql`
        SELECT s.*, sa.id as agent_id_ref, sa.name as agent_name, sa.email as agent_email
        FROM csat_surveys s
        LEFT JOIN support_agents sa ON sa.id = s.agent_id
        WHERE s.channel = ${filters.channel}
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.hasResponse === true) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM csat_surveys WHERE responded_at IS NOT NULL
      `
      surveysResult = await sql`
        SELECT s.*, sa.id as agent_id_ref, sa.name as agent_name, sa.email as agent_email
        FROM csat_surveys s
        LEFT JOIN support_agents sa ON sa.id = s.agent_id
        WHERE s.responded_at IS NOT NULL
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.hasResponse === false) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM csat_surveys WHERE responded_at IS NULL
      `
      surveysResult = await sql`
        SELECT s.*, sa.id as agent_id_ref, sa.name as agent_name, sa.email as agent_email
        FROM csat_surveys s
        LEFT JOIN support_agents sa ON sa.id = s.agent_id
        WHERE s.responded_at IS NULL
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.rating) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM csat_surveys WHERE rating = ${filters.rating}
      `
      surveysResult = await sql`
        SELECT s.*, sa.id as agent_id_ref, sa.name as agent_name, sa.email as agent_email
        FROM csat_surveys s
        LEFT JOIN support_agents sa ON sa.id = s.agent_id
        WHERE s.rating = ${filters.rating}
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      // No filters - get all
      countResult = await sql`SELECT COUNT(*) as count FROM csat_surveys`
      surveysResult = await sql`
        SELECT s.*, sa.id as agent_id_ref, sa.name as agent_name, sa.email as agent_email
        FROM csat_surveys s
        LEFT JOIN support_agents sa ON sa.id = s.agent_id
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const countRow = countResult.rows[0] as Record<string, unknown> | undefined
    const total = parseInt((countRow?.count as string) ?? '0', 10)

    return {
      surveys: surveysResult.rows.map((r) => mapSurveyRowWithAgent(r as Record<string, unknown>)),
      total,
    }
  })
}

/**
 * Submit a survey response
 */
export async function submitSurveyResponse(
  tenantId: string,
  surveyId: string,
  data: SubmitSurveyResponseInput
): Promise<CSATSurvey | null> {
  return withTenant(tenantId, async () => {
    const now = new Date()

    // Check if survey exists and hasn't expired
    const checkResult = await sql`
      SELECT id, expires_at, responded_at
      FROM csat_surveys
      WHERE id = ${surveyId}
    `

    if (checkResult.rows.length === 0) {
      return null
    }

    const survey = checkResult.rows[0] as Record<string, unknown>

    // Check if already responded
    if (survey.responded_at) {
      throw new Error('Survey has already been submitted')
    }

    // Check if expired
    if (new Date(survey.expires_at as string) < now) {
      throw new Error('Survey has expired')
    }

    // Update survey with response
    const result = await sql`
      UPDATE csat_surveys
      SET
        rating = ${data.rating},
        feedback = ${data.feedback ?? null},
        responded_at = ${now.toISOString()}
      WHERE id = ${surveyId}
      RETURNING *
    `

    // Update daily metrics
    await updateDailyMetrics('responded', data.rating)

    // Check for low rating alert
    const configResult = await sql`
      SELECT alert_on_low_rating, low_rating_threshold
      FROM csat_config
      WHERE id = 1
    `
    const config = configResult.rows[0] as Record<string, unknown> | undefined

    if (config?.alert_on_low_rating && data.rating <= (config.low_rating_threshold as number)) {
      // Could trigger an alert here or emit an event
      console.warn(`[CSAT] Low rating alert: Survey ${surveyId} received rating ${data.rating}`)
    }

    const row = result.rows[0] as Record<string, unknown> | undefined
    if (!row) {
      return null
    }
    return mapSurveyRow(row)
  })
}

// ============================================
// METRICS
// ============================================

/**
 * Get CSAT metrics for a time period
 */
export async function getCSATMetrics(
  tenantId: string,
  options: CSATMetricsOptions = {}
): Promise<CSATMetrics> {
  return withTenant(tenantId, async () => {
    const days = options.days ?? 30
    const startDate = options.startDate ?? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const endDate = options.endDate ?? new Date()

    // Get aggregate metrics
    const aggregateResult = await sql`
      SELECT
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE responded_at IS NOT NULL) as total_responded,
        AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_rating,
        COUNT(*) FILTER (WHERE rating = 1) as rating_1,
        COUNT(*) FILTER (WHERE rating = 2) as rating_2,
        COUNT(*) FILTER (WHERE rating = 3) as rating_3,
        COUNT(*) FILTER (WHERE rating = 4) as rating_4,
        COUNT(*) FILTER (WHERE rating = 5) as rating_5
      FROM csat_surveys
      WHERE created_at >= ${startDate.toISOString()}
        AND created_at <= ${endDate.toISOString()}
    `

    const agg = aggregateResult.rows[0] as Record<string, unknown> | undefined

    // Get daily trend
    const trendResult = await sql`
      SELECT
        DATE(created_at) as date,
        AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_rating,
        COUNT(*) FILTER (WHERE responded_at IS NOT NULL) as response_count
      FROM csat_surveys
      WHERE created_at >= ${startDate.toISOString()}
        AND created_at <= ${endDate.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    const totalSent = parseInt((agg?.total_sent as string) ?? '0', 10)
    const totalResponded = parseInt((agg?.total_responded as string) ?? '0', 10)

    return {
      totalSent,
      totalResponded,
      responseRate: totalSent > 0 ? (totalResponded / totalSent) * 100 : 0,
      avgRating: agg?.avg_rating ? parseFloat(agg.avg_rating as string) : null,
      ratingDistribution: {
        rating1: parseInt((agg?.rating_1 as string) ?? '0', 10),
        rating2: parseInt((agg?.rating_2 as string) ?? '0', 10),
        rating3: parseInt((agg?.rating_3 as string) ?? '0', 10),
        rating4: parseInt((agg?.rating_4 as string) ?? '0', 10),
        rating5: parseInt((agg?.rating_5 as string) ?? '0', 10),
      },
      trend: trendResult.rows.map((r) => {
        const row = r as Record<string, unknown>
        const dateValue = row.date as Date | string | null
        const dateStr = dateValue
          ? (typeof dateValue === 'string' ? dateValue : dateValue.toISOString()).split('T')[0]
          : new Date().toISOString().split('T')[0]
        return {
          date: dateStr ?? '',
          avgRating: row.avg_rating ? parseFloat(row.avg_rating as string) : null,
          responseCount: parseInt(row.response_count as string, 10),
        }
      }),
    }
  })
}

/**
 * Get per-agent CSAT scores
 */
export async function getAgentCSATScores(
  tenantId: string,
  days: number = 30
): Promise<AgentCSATScore[]> {
  return withTenant(tenantId, async () => {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const result = await sql`
      SELECT
        sa.id as agent_id,
        sa.name as agent_name,
        COUNT(s.id) as survey_count,
        COUNT(s.id) FILTER (WHERE s.responded_at IS NOT NULL) as response_count,
        AVG(s.rating) FILTER (WHERE s.rating IS NOT NULL) as avg_rating,
        COUNT(s.id) FILTER (WHERE s.rating = 1) as rating_1,
        COUNT(s.id) FILTER (WHERE s.rating = 2) as rating_2,
        COUNT(s.id) FILTER (WHERE s.rating = 3) as rating_3,
        COUNT(s.id) FILTER (WHERE s.rating = 4) as rating_4,
        COUNT(s.id) FILTER (WHERE s.rating = 5) as rating_5
      FROM support_agents sa
      LEFT JOIN csat_surveys s ON s.agent_id = sa.id
        AND s.created_at >= ${startDate.toISOString()}
      WHERE sa.is_active = TRUE
      GROUP BY sa.id, sa.name
      ORDER BY avg_rating DESC NULLS LAST
    `

    return result.rows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        agentId: row.agent_id as string,
        agentName: row.agent_name as string,
        surveyCount: parseInt(row.survey_count as string, 10),
        responseCount: parseInt(row.response_count as string, 10),
        avgRating: row.avg_rating ? parseFloat(row.avg_rating as string) : null,
        ratingDistribution: {
          rating1: parseInt(row.rating_1 as string, 10),
          rating2: parseInt(row.rating_2 as string, 10),
          rating3: parseInt(row.rating_3 as string, 10),
          rating4: parseInt(row.rating_4 as string, 10),
          rating5: parseInt(row.rating_5 as string, 10),
        },
      }
    })
  })
}

/**
 * Get daily metrics
 */
export async function getDailyMetrics(
  tenantId: string,
  date: Date
): Promise<CSATMetricsDaily | null> {
  return withTenant(tenantId, async () => {
    const dateStr = date.toISOString().split('T')[0]

    const result = await sql`
      SELECT * FROM csat_metrics_daily
      WHERE metric_date = ${dateStr}
    `

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0] as Record<string, unknown>
    return mapMetricsDailyRow(row)
  })
}

// ============================================
// AUTO-SEND TRIGGER
// ============================================

/**
 * Trigger a CSAT survey for a resolved ticket
 * Called when a ticket is resolved
 */
export async function triggerCSATSurvey(
  tenantId: string,
  ticketId: string
): Promise<CSATSurvey | null> {
  return withTenant(tenantId, async () => {
    // Check if CSAT is enabled and auto-send is on
    const configResult = await sql`
      SELECT enabled, auto_send_on_resolution, delay_hours, default_channel
      FROM csat_config
      WHERE id = 1
    `

    const config = configResult.rows[0] as Record<string, unknown> | undefined
    if (!config?.enabled || !config?.auto_send_on_resolution) {
      return null
    }

    // Get ticket details
    const ticketResult = await sql`
      SELECT t.id, t.customer_email, t.customer_id, t.assigned_to
      FROM support_tickets t
      WHERE t.id = ${ticketId}
    `

    if (ticketResult.rows.length === 0) {
      return null
    }

    const ticket = ticketResult.rows[0] as Record<string, unknown>

    // Check if survey already exists for this ticket
    const existingResult = await sql`
      SELECT id FROM csat_surveys WHERE ticket_id = ${ticketId}
    `

    if (existingResult.rows.length > 0) {
      return null // Already sent
    }

    // Create survey
    return createSurvey(tenantId, {
      ticketId,
      customerEmail: ticket.customer_email as string,
      customerId: ticket.customer_id as string | undefined,
      agentId: ticket.assigned_to as string | undefined,
      channel: config.default_channel as CSATChannel,
    })
  })
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Get CSAT configuration
 */
export async function getCSATConfig(tenantId: string): Promise<CSATConfig> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM csat_config WHERE id = 1
    `

    if (result.rows.length === 0) {
      // Initialize with defaults
      await sql`
        INSERT INTO csat_config (id) VALUES (1)
        ON CONFLICT (id) DO NOTHING
      `
      const newResult = await sql`SELECT * FROM csat_config WHERE id = 1`
      const row = newResult.rows[0] as Record<string, unknown>
      return mapConfigRow(row)
    }

    const row = result.rows[0] as Record<string, unknown>
    return mapConfigRow(row)
  })
}

/**
 * Update CSAT configuration
 */
export async function updateCSATConfig(
  tenantId: string,
  data: Partial<CSATConfig>
): Promise<CSATConfig> {
  return withTenant(tenantId, async () => {
    // Update individual fields with separate queries
    if (data.enabled !== undefined) {
      await sql`UPDATE csat_config SET enabled = ${data.enabled}, updated_at = NOW() WHERE id = 1`
    }
    if (data.autoSendOnResolution !== undefined) {
      await sql`UPDATE csat_config SET auto_send_on_resolution = ${data.autoSendOnResolution}, updated_at = NOW() WHERE id = 1`
    }
    if (data.delayHours !== undefined) {
      await sql`UPDATE csat_config SET delay_hours = ${data.delayHours}, updated_at = NOW() WHERE id = 1`
    }
    if (data.expiryDays !== undefined) {
      await sql`UPDATE csat_config SET expiry_days = ${data.expiryDays}, updated_at = NOW() WHERE id = 1`
    }
    if (data.defaultChannel !== undefined) {
      await sql`UPDATE csat_config SET default_channel = ${data.defaultChannel}, updated_at = NOW() WHERE id = 1`
    }
    if (data.ratingQuestion !== undefined) {
      await sql`UPDATE csat_config SET rating_question = ${data.ratingQuestion}, updated_at = NOW() WHERE id = 1`
    }
    if (data.feedbackPrompt !== undefined) {
      await sql`UPDATE csat_config SET feedback_prompt = ${data.feedbackPrompt}, updated_at = NOW() WHERE id = 1`
    }
    if (data.lowRatingThreshold !== undefined) {
      await sql`UPDATE csat_config SET low_rating_threshold = ${data.lowRatingThreshold}, updated_at = NOW() WHERE id = 1`
    }
    if (data.alertOnLowRating !== undefined) {
      await sql`UPDATE csat_config SET alert_on_low_rating = ${data.alertOnLowRating}, updated_at = NOW() WHERE id = 1`
    }

    return getCSATConfig(tenantId)
  })
}

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Update daily metrics
 */
async function updateDailyMetrics(
  type: 'sent' | 'responded',
  rating?: CSATRating
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  if (type === 'sent') {
    await sql`
      INSERT INTO csat_metrics_daily (metric_date, surveys_sent)
      VALUES (${today}, 1)
      ON CONFLICT (metric_date)
      DO UPDATE SET surveys_sent = csat_metrics_daily.surveys_sent + 1
    `
  } else if (type === 'responded' && rating) {
    // Handle each rating column individually
    if (rating === 1) {
      await sql`
        INSERT INTO csat_metrics_daily (metric_date, surveys_responded, total_rating, rating_1_count)
        VALUES (${today}, 1, ${rating}, 1)
        ON CONFLICT (metric_date)
        DO UPDATE SET
          surveys_responded = csat_metrics_daily.surveys_responded + 1,
          total_rating = csat_metrics_daily.total_rating + ${rating},
          rating_1_count = csat_metrics_daily.rating_1_count + 1,
          avg_rating = (csat_metrics_daily.total_rating + ${rating})::DECIMAL / (csat_metrics_daily.surveys_responded + 1)
      `
    } else if (rating === 2) {
      await sql`
        INSERT INTO csat_metrics_daily (metric_date, surveys_responded, total_rating, rating_2_count)
        VALUES (${today}, 1, ${rating}, 1)
        ON CONFLICT (metric_date)
        DO UPDATE SET
          surveys_responded = csat_metrics_daily.surveys_responded + 1,
          total_rating = csat_metrics_daily.total_rating + ${rating},
          rating_2_count = csat_metrics_daily.rating_2_count + 1,
          avg_rating = (csat_metrics_daily.total_rating + ${rating})::DECIMAL / (csat_metrics_daily.surveys_responded + 1)
      `
    } else if (rating === 3) {
      await sql`
        INSERT INTO csat_metrics_daily (metric_date, surveys_responded, total_rating, rating_3_count)
        VALUES (${today}, 1, ${rating}, 1)
        ON CONFLICT (metric_date)
        DO UPDATE SET
          surveys_responded = csat_metrics_daily.surveys_responded + 1,
          total_rating = csat_metrics_daily.total_rating + ${rating},
          rating_3_count = csat_metrics_daily.rating_3_count + 1,
          avg_rating = (csat_metrics_daily.total_rating + ${rating})::DECIMAL / (csat_metrics_daily.surveys_responded + 1)
      `
    } else if (rating === 4) {
      await sql`
        INSERT INTO csat_metrics_daily (metric_date, surveys_responded, total_rating, rating_4_count)
        VALUES (${today}, 1, ${rating}, 1)
        ON CONFLICT (metric_date)
        DO UPDATE SET
          surveys_responded = csat_metrics_daily.surveys_responded + 1,
          total_rating = csat_metrics_daily.total_rating + ${rating},
          rating_4_count = csat_metrics_daily.rating_4_count + 1,
          avg_rating = (csat_metrics_daily.total_rating + ${rating})::DECIMAL / (csat_metrics_daily.surveys_responded + 1)
      `
    } else if (rating === 5) {
      await sql`
        INSERT INTO csat_metrics_daily (metric_date, surveys_responded, total_rating, rating_5_count)
        VALUES (${today}, 1, ${rating}, 1)
        ON CONFLICT (metric_date)
        DO UPDATE SET
          surveys_responded = csat_metrics_daily.surveys_responded + 1,
          total_rating = csat_metrics_daily.total_rating + ${rating},
          rating_5_count = csat_metrics_daily.rating_5_count + 1,
          avg_rating = (csat_metrics_daily.total_rating + ${rating})::DECIMAL / (csat_metrics_daily.surveys_responded + 1)
      `
    }
  }
}

// ============================================
// ROW MAPPERS
// ============================================

function mapSurveyRow(row: Record<string, unknown>): CSATSurvey {
  return {
    id: row.id as string,
    ticketId: row.ticket_id as string | null,
    conversationId: row.conversation_id as string | null,
    customerId: row.customer_id as string | null,
    customerEmail: row.customer_email as string,
    rating: row.rating as CSATRating | null,
    feedback: row.feedback as string | null,
    agentId: row.agent_id as string | null,
    channel: row.channel as CSATChannel,
    sentAt: new Date(row.sent_at as string),
    respondedAt: row.responded_at ? new Date(row.responded_at as string) : null,
    expiresAt: new Date(row.expires_at as string),
    createdAt: new Date(row.created_at as string),
  }
}

function mapSurveyRowWithAgent(row: Record<string, unknown>): CSATSurvey {
  const survey = mapSurveyRow(row)

  if (row.agent_id_ref) {
    survey.agent = {
      id: row.agent_id_ref as string,
      userId: '',
      name: row.agent_name as string,
      email: row.agent_email as string,
      role: 'agent',
      isActive: true,
      isOnline: false,
      maxTickets: 0,
      currentTicketCount: 0,
      skills: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  return survey
}

function mapMetricsDailyRow(row: Record<string, unknown>): CSATMetricsDaily {
  return {
    id: row.id as string,
    metricDate: new Date(row.metric_date as string),
    surveysSent: row.surveys_sent as number,
    surveysResponded: row.surveys_responded as number,
    totalRating: row.total_rating as number,
    avgRating: row.avg_rating ? parseFloat(row.avg_rating as string) : null,
    rating1Count: row.rating_1_count as number,
    rating2Count: row.rating_2_count as number,
    rating3Count: row.rating_3_count as number,
    rating4Count: row.rating_4_count as number,
    rating5Count: row.rating_5_count as number,
    createdAt: new Date(row.created_at as string),
  }
}

function mapConfigRow(row: Record<string, unknown>): CSATConfig {
  return {
    enabled: row.enabled as boolean,
    autoSendOnResolution: row.auto_send_on_resolution as boolean,
    delayHours: row.delay_hours as number,
    expiryDays: row.expiry_days as number,
    defaultChannel: row.default_channel as CSATChannel,
    ratingQuestion: row.rating_question as string,
    feedbackPrompt: row.feedback_prompt as string,
    lowRatingThreshold: row.low_rating_threshold as number,
    alertOnLowRating: row.alert_on_low_rating as boolean,
    updatedAt: new Date(row.updated_at as string),
  }
}
