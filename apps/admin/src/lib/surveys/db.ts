/**
 * Survey database operations with tenant isolation
 * PHASE-2SV: Surveys & Post-Purchase Attribution
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  Survey,
  SurveyWithQuestions,
  SurveyQuestion,
  SurveyResponse,
  SurveyAnswer,
  AttributionOption,
  SurveySlackConfig,
  SurveyFilters,
  ResponseFilters,
  CreateSurveyInput,
  UpdateSurveyInput,
  CreateQuestionInput,
  UpdateQuestionInput,
  SubmitResponseInput,
  CreateAttributionOptionInput,
  UpdateSlackConfigInput,
  SurveyStats,
  AttributionBreakdown,
  NpsTrendData,
  QuestionOption,
  ValidationConfig,
  ConditionalLogic,
  TriggerConfig,
  BrandingConfig,
  TargetConfig,
} from './types'

// =============================================================================
// SURVEYS
// =============================================================================

export async function getSurveys(
  tenantSlug: string,
  filters: SurveyFilters,
): Promise<{ rows: Survey[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status && filters.status !== 'all') {
      paramIndex++
      conditions.push(`s.status = $${paramIndex}`)
      values.push(filters.status)
    }

    if (filters.type) {
      paramIndex++
      conditions.push(`s.survey_type = $${paramIndex}`)
      values.push(filters.type)
    }

    if (filters.search) {
      paramIndex++
      conditions.push(`(s.name ILIKE $${paramIndex} OR s.title ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM survey_responses r WHERE r.survey_id = s.id) as response_count,
              (SELECT ROUND(
                COUNT(*) FILTER (WHERE is_complete = true)::numeric /
                NULLIF(COUNT(*)::numeric, 0) * 100, 1
              ) FROM survey_responses r WHERE r.survey_id = s.id) as completion_rate
       FROM surveys s
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM surveys s ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows.map(parseSurveyRow) as Survey[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getSurvey(
  tenantSlug: string,
  surveyId: string,
): Promise<Survey | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT s.*,
             (SELECT COUNT(*) FROM survey_responses r WHERE r.survey_id = s.id) as response_count,
             (SELECT ROUND(
               COUNT(*) FILTER (WHERE is_complete = true)::numeric /
               NULLIF(COUNT(*)::numeric, 0) * 100, 1
             ) FROM survey_responses r WHERE r.survey_id = s.id) as completion_rate
      FROM surveys s
      WHERE s.id = ${surveyId}
      LIMIT 1
    `

    if (result.rows.length === 0) return null
    return parseSurveyRow(result.rows[0] as Record<string, unknown>) as Survey
  })
}

export async function getSurveyBySlug(
  tenantSlug: string,
  slug: string,
): Promise<Survey | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT s.*,
             (SELECT COUNT(*) FROM survey_responses r WHERE r.survey_id = s.id) as response_count
      FROM surveys s
      WHERE s.slug = ${slug}
      LIMIT 1
    `

    if (result.rows.length === 0) return null
    return parseSurveyRow(result.rows[0] as Record<string, unknown>) as Survey
  })
}

export async function getSurveyWithQuestions(
  tenantSlug: string,
  surveyId: string,
): Promise<SurveyWithQuestions | null> {
  const survey = await getSurvey(tenantSlug, surveyId)
  if (!survey) return null

  const questions = await getQuestions(tenantSlug, surveyId)
  return { ...survey, questions }
}

export async function createSurvey(
  tenantSlug: string,
  input: CreateSurveyInput,
  createdBy?: string,
): Promise<Survey> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO surveys (
        name, description, slug, survey_type, trigger_config,
        title, subtitle, thank_you_message, redirect_url,
        branding_config, target_config, response_limit, expires_at, locale, created_by
      ) VALUES (
        ${input.name},
        ${input.description || null},
        ${input.slug},
        ${input.survey_type || 'post_purchase'},
        ${JSON.stringify(input.trigger_config || { timing: 'immediate' })}::jsonb,
        ${input.title},
        ${input.subtitle || null},
        ${input.thank_you_message || 'Thank you for your feedback!'},
        ${input.redirect_url || null},
        ${JSON.stringify(input.branding_config || {})}::jsonb,
        ${JSON.stringify(input.target_config || {})}::jsonb,
        ${input.response_limit || null},
        ${input.expires_at || null},
        ${input.locale || 'en'},
        ${createdBy || null}
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create survey')
    }
    return parseSurveyRow(row as Record<string, unknown>) as Survey
  })
}

export async function updateSurvey(
  tenantSlug: string,
  surveyId: string,
  input: UpdateSurveyInput,
): Promise<Survey | null> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    const stringFields: Array<keyof UpdateSurveyInput> = [
      'name', 'description', 'slug', 'survey_type', 'title', 'subtitle',
      'thank_you_message', 'redirect_url', 'status', 'locale',
    ]

    for (const field of stringFields) {
      if (input[field] !== undefined) {
        paramIndex++
        setClauses.push(`${field} = $${paramIndex}`)
        values.push(input[field])
      }
    }

    const jsonFields: Array<keyof UpdateSurveyInput> = [
      'trigger_config', 'branding_config', 'target_config', 'translations',
    ]

    for (const field of jsonFields) {
      if (input[field] !== undefined) {
        paramIndex++
        setClauses.push(`${field} = $${paramIndex}::jsonb`)
        values.push(JSON.stringify(input[field]))
      }
    }

    if (input.response_limit !== undefined) {
      paramIndex++
      setClauses.push(`response_limit = $${paramIndex}`)
      values.push(input.response_limit)
    }

    if (input.expires_at !== undefined) {
      paramIndex++
      setClauses.push(`expires_at = $${paramIndex}`)
      values.push(input.expires_at)
    }

    paramIndex++
    values.push(surveyId)

    const result = await sql.query(
      `UPDATE surveys SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    )

    if (result.rows.length === 0) return null
    return parseSurveyRow(result.rows[0]) as Survey
  })
}

export async function deleteSurvey(
  tenantSlug: string,
  surveyId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`DELETE FROM surveys WHERE id = ${surveyId} RETURNING id`
    return result.rows.length > 0
  })
}

export async function duplicateSurvey(
  tenantSlug: string,
  surveyId: string,
  newSlug: string,
  createdBy?: string,
): Promise<Survey | null> {
  return withTenant(tenantSlug, async () => {
    const original = await getSurvey(tenantSlug, surveyId)
    if (!original) return null

    const result = await sql`
      INSERT INTO surveys (
        name, description, slug, survey_type, trigger_config,
        title, subtitle, thank_you_message, redirect_url,
        branding_config, target_config, response_limit, locale, created_by, status
      )
      SELECT
        name || ' (Copy)', description, ${newSlug}, survey_type, trigger_config,
        title, subtitle, thank_you_message, redirect_url,
        branding_config, target_config, response_limit, locale, ${createdBy || null}, 'draft'
      FROM surveys
      WHERE id = ${surveyId}
      RETURNING *
    `

    if (result.rows.length === 0) return null

    const newSurvey = parseSurveyRow(result.rows[0] as Record<string, unknown>) as Survey

    // Copy questions
    await sql`
      INSERT INTO survey_questions (
        survey_id, question_text, help_text, question_type, options,
        required, validation_config, show_when, is_attribution_question, display_order
      )
      SELECT
        ${newSurvey.id}, question_text, help_text, question_type, options,
        required, validation_config, show_when, is_attribution_question, display_order
      FROM survey_questions
      WHERE survey_id = ${surveyId}
      ORDER BY display_order
    `

    return newSurvey
  })
}

// =============================================================================
// QUESTIONS
// =============================================================================

export async function getQuestions(
  tenantSlug: string,
  surveyId: string,
): Promise<SurveyQuestion[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM survey_questions
      WHERE survey_id = ${surveyId}
      ORDER BY display_order ASC
    `
    return result.rows.map(parseQuestionRow) as SurveyQuestion[]
  })
}

export async function getQuestion(
  tenantSlug: string,
  questionId: string,
): Promise<SurveyQuestion | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM survey_questions
      WHERE id = ${questionId}
      LIMIT 1
    `
    if (result.rows.length === 0) return null
    return parseQuestionRow(result.rows[0] as Record<string, unknown>) as SurveyQuestion
  })
}

export async function createQuestion(
  tenantSlug: string,
  surveyId: string,
  input: CreateQuestionInput,
): Promise<SurveyQuestion> {
  return withTenant(tenantSlug, async () => {
    // Get max display_order
    const maxOrderResult = await sql`
      SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
      FROM survey_questions
      WHERE survey_id = ${surveyId}
    `
    const displayOrder = input.display_order ?? Number(maxOrderResult.rows[0]?.next_order || 0)

    const result = await sql`
      INSERT INTO survey_questions (
        survey_id, question_text, help_text, question_type, options,
        required, validation_config, show_when, is_attribution_question, display_order
      ) VALUES (
        ${surveyId},
        ${input.question_text},
        ${input.help_text || null},
        ${input.question_type},
        ${JSON.stringify(input.options || [])}::jsonb,
        ${input.required ?? false},
        ${JSON.stringify(input.validation_config || {})}::jsonb,
        ${input.show_when ? JSON.stringify(input.show_when) : null}::jsonb,
        ${input.is_attribution_question ?? false},
        ${displayOrder}
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create question')
    }
    return parseQuestionRow(row as Record<string, unknown>) as SurveyQuestion
  })
}

export async function updateQuestion(
  tenantSlug: string,
  questionId: string,
  input: UpdateQuestionInput,
): Promise<SurveyQuestion | null> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (input.question_text !== undefined) {
      paramIndex++
      setClauses.push(`question_text = $${paramIndex}`)
      values.push(input.question_text)
    }

    if (input.help_text !== undefined) {
      paramIndex++
      setClauses.push(`help_text = $${paramIndex}`)
      values.push(input.help_text)
    }

    if (input.question_type !== undefined) {
      paramIndex++
      setClauses.push(`question_type = $${paramIndex}`)
      values.push(input.question_type)
    }

    if (input.options !== undefined) {
      paramIndex++
      setClauses.push(`options = $${paramIndex}::jsonb`)
      values.push(JSON.stringify(input.options))
    }

    if (input.required !== undefined) {
      paramIndex++
      setClauses.push(`required = $${paramIndex}`)
      values.push(input.required)
    }

    if (input.validation_config !== undefined) {
      paramIndex++
      setClauses.push(`validation_config = $${paramIndex}::jsonb`)
      values.push(JSON.stringify(input.validation_config))
    }

    if (input.show_when !== undefined) {
      paramIndex++
      setClauses.push(`show_when = $${paramIndex}::jsonb`)
      values.push(input.show_when ? JSON.stringify(input.show_when) : null)
    }

    if (input.is_attribution_question !== undefined) {
      paramIndex++
      setClauses.push(`is_attribution_question = $${paramIndex}`)
      values.push(input.is_attribution_question)
    }

    if (input.display_order !== undefined) {
      paramIndex++
      setClauses.push(`display_order = $${paramIndex}`)
      values.push(input.display_order)
    }

    if (setClauses.length === 0) {
      return getQuestion(tenantSlug, questionId)
    }

    paramIndex++
    values.push(questionId)

    const result = await sql.query(
      `UPDATE survey_questions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    )

    if (result.rows.length === 0) return null
    return parseQuestionRow(result.rows[0] as Record<string, unknown>) as SurveyQuestion
  })
}

export async function deleteQuestion(
  tenantSlug: string,
  questionId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`DELETE FROM survey_questions WHERE id = ${questionId} RETURNING id`
    return result.rows.length > 0
  })
}

export async function reorderQuestions(
  tenantSlug: string,
  surveyId: string,
  orderMap: Record<string, number>,
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    for (const [questionId, order] of Object.entries(orderMap)) {
      await sql`
        UPDATE survey_questions
        SET display_order = ${order}
        WHERE id = ${questionId} AND survey_id = ${surveyId}
      `
    }
  })
}

// =============================================================================
// RESPONSES
// =============================================================================

export async function getResponses(
  tenantSlug: string,
  filters: ResponseFilters,
): Promise<{ rows: SurveyResponse[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.surveyId) {
      paramIndex++
      conditions.push(`r.survey_id = $${paramIndex}`)
      values.push(filters.surveyId)
    }

    if (filters.isComplete !== undefined) {
      paramIndex++
      conditions.push(`r.is_complete = $${paramIndex}`)
      values.push(filters.isComplete)
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

    if (filters.attributionSource) {
      paramIndex++
      conditions.push(`r.attribution_source = $${paramIndex}`)
      values.push(filters.attributionSource)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT r.*, s.name as survey_name
       FROM survey_responses r
       LEFT JOIN surveys s ON s.id = r.survey_id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM survey_responses r ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as SurveyResponse[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getResponse(
  tenantSlug: string,
  responseId: string,
): Promise<SurveyResponse | null> {
  return withTenant(tenantSlug, async () => {
    const responseResult = await sql`
      SELECT r.*, s.name as survey_name
      FROM survey_responses r
      LEFT JOIN surveys s ON s.id = r.survey_id
      WHERE r.id = ${responseId}
      LIMIT 1
    `

    if (responseResult.rows.length === 0) return null

    const response = responseResult.rows[0] as SurveyResponse

    // Load answers with question info
    const answersResult = await sql`
      SELECT a.*, q.question_text, q.question_type
      FROM survey_answers a
      LEFT JOIN survey_questions q ON q.id = a.question_id
      WHERE a.response_id = ${responseId}
      ORDER BY q.display_order ASC
    `

    response.answers = answersResult.rows as SurveyAnswer[]
    return response
  })
}

export async function submitResponse(
  tenantSlug: string,
  input: SubmitResponseInput,
): Promise<SurveyResponse> {
  return withTenant(tenantSlug, async () => {
    // Create response record
    const responseResult = await sql`
      INSERT INTO survey_responses (
        survey_id, order_id, customer_id, customer_email,
        user_agent, ip_address, locale, is_complete, completed_at
      ) VALUES (
        ${input.surveyId},
        ${input.orderId || null},
        ${input.customerId || null},
        ${input.customerEmail || null},
        ${input.userAgent || null},
        ${input.ipAddress || null},
        ${input.locale || null},
        true,
        NOW()
      )
      ON CONFLICT (survey_id, order_id) DO UPDATE SET
        is_complete = true,
        completed_at = NOW()
      RETURNING *
    `

    const response = responseResult.rows[0] as SurveyResponse

    // Insert answers
    let npsScore: number | null = null
    let attributionSource: string | null = null

    for (const answer of input.answers) {
      const answerValuesLiteral = answer.values ? `{${answer.values.map(s => `"${s}"`).join(',')}}` : null
      await sql`
        INSERT INTO survey_answers (
          response_id, question_id, answer_value, answer_values, answer_numeric
        ) VALUES (
          ${response.id},
          ${answer.questionId},
          ${answer.value || null},
          ${answerValuesLiteral}::text[],
          ${answer.numeric || null}
        )
        ON CONFLICT (response_id, question_id) DO UPDATE SET
          answer_value = ${answer.value || null},
          answer_values = ${answerValuesLiteral}::text[],
          answer_numeric = ${answer.numeric || null}
      `

      // Check if this is NPS or attribution question
      const questionResult = await sql`
        SELECT question_type, is_attribution_question
        FROM survey_questions
        WHERE id = ${answer.questionId}
      `

      if (questionResult.rows.length > 0) {
        const question = questionResult.rows[0]
        if (!question) continue
        if (question.question_type === 'nps' && answer.numeric !== undefined) {
          npsScore = answer.numeric
        }
        if (question.is_attribution_question && answer.value) {
          attributionSource = answer.value
        }
      }
    }

    // Update response with calculated fields
    if (npsScore !== null || attributionSource !== null) {
      await sql`
        UPDATE survey_responses
        SET nps_score = ${npsScore}, attribution_source = ${attributionSource}
        WHERE id = ${response.id}
      `
    }

    return response
  })
}

export async function checkResponseExists(
  tenantSlug: string,
  surveyId: string,
  orderId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id FROM survey_responses
      WHERE survey_id = ${surveyId} AND order_id = ${orderId} AND is_complete = true
      LIMIT 1
    `
    return result.rows.length > 0
  })
}

// =============================================================================
// ATTRIBUTION OPTIONS
// =============================================================================

export async function getAttributionOptions(
  tenantSlug: string,
  includeInactive = false,
): Promise<AttributionOption[]> {
  return withTenant(tenantSlug, async () => {
    if (includeInactive) {
      const result = await sql`
        SELECT * FROM attribution_options
        ORDER BY display_order ASC, label ASC
      `
      return result.rows as AttributionOption[]
    } else {
      const result = await sql`
        SELECT * FROM attribution_options
        WHERE is_active = true
        ORDER BY display_order ASC, label ASC
      `
      return result.rows as AttributionOption[]
    }
  })
}

export async function createAttributionOption(
  tenantSlug: string,
  input: CreateAttributionOptionInput,
): Promise<AttributionOption> {
  return withTenant(tenantSlug, async () => {
    const maxOrderResult = await sql`
      SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
      FROM attribution_options
    `
    const displayOrder = input.display_order ?? Number(maxOrderResult.rows[0]?.next_order || 0)

    const result = await sql`
      INSERT INTO attribution_options (label, value, icon, category, display_order)
      VALUES (${input.label}, ${input.value}, ${input.icon || null}, ${input.category || null}, ${displayOrder})
      RETURNING *
    `
    return result.rows[0] as AttributionOption
  })
}

export async function updateAttributionOption(
  tenantSlug: string,
  optionId: string,
  input: Partial<CreateAttributionOptionInput> & { is_active?: boolean },
): Promise<AttributionOption | null> {
  return withTenant(tenantSlug, async () => {
    // System options can only have is_active changed
    const optionResult = await sql`SELECT is_system FROM attribution_options WHERE id = ${optionId}`
    if (optionResult.rows.length === 0) return null

    const optionRow = optionResult.rows[0]
    if (!optionRow) return null
    const isSystem = optionRow.is_system

    const setClauses: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (!isSystem) {
      if (input.label !== undefined) {
        paramIndex++
        setClauses.push(`label = $${paramIndex}`)
        values.push(input.label)
      }

      if (input.value !== undefined) {
        paramIndex++
        setClauses.push(`value = $${paramIndex}`)
        values.push(input.value)
      }

      if (input.icon !== undefined) {
        paramIndex++
        setClauses.push(`icon = $${paramIndex}`)
        values.push(input.icon)
      }

      if (input.category !== undefined) {
        paramIndex++
        setClauses.push(`category = $${paramIndex}`)
        values.push(input.category)
      }

      if (input.display_order !== undefined) {
        paramIndex++
        setClauses.push(`display_order = $${paramIndex}`)
        values.push(input.display_order)
      }
    }

    if (input.is_active !== undefined) {
      paramIndex++
      setClauses.push(`is_active = $${paramIndex}`)
      values.push(input.is_active)
    }

    if (setClauses.length === 0) return null

    paramIndex++
    values.push(optionId)

    const result = await sql.query(
      `UPDATE attribution_options SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    )

    if (result.rows.length === 0) return null
    return result.rows[0] as AttributionOption
  })
}

export async function deleteAttributionOption(
  tenantSlug: string,
  optionId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    // Cannot delete system options
    const result = await sql`
      DELETE FROM attribution_options
      WHERE id = ${optionId} AND is_system = false
      RETURNING id
    `
    return result.rows.length > 0
  })
}

// =============================================================================
// SLACK CONFIGURATION
// =============================================================================

export async function getSlackConfig(
  tenantSlug: string,
  surveyId?: string,
): Promise<SurveySlackConfig | null> {
  return withTenant(tenantSlug, async () => {
    if (surveyId) {
      const result = await sql`
        SELECT * FROM survey_slack_config
        WHERE survey_id = ${surveyId}
        LIMIT 1
      `
      return (result.rows[0] as SurveySlackConfig) || null
    } else {
      const result = await sql`
        SELECT * FROM survey_slack_config
        WHERE survey_id IS NULL
        LIMIT 1
      `
      return (result.rows[0] as SurveySlackConfig) || null
    }
  })
}

export async function upsertSlackConfig(
  tenantSlug: string,
  input: UpdateSlackConfigInput,
  surveyId?: string,
): Promise<SurveySlackConfig> {
  return withTenant(tenantSlug, async () => {
    const existing = await getSlackConfig(tenantSlug, surveyId)

    if (existing) {
      const setClauses: string[] = ['updated_at = NOW()']
      const values: unknown[] = []
      let paramIndex = 0

      if (input.webhook_url !== undefined) {
        paramIndex++
        setClauses.push(`webhook_url = $${paramIndex}`)
        values.push(input.webhook_url)
      }

      if (input.channel_name !== undefined) {
        paramIndex++
        setClauses.push(`channel_name = $${paramIndex}`)
        values.push(input.channel_name)
      }

      if (input.notify_on_complete !== undefined) {
        paramIndex++
        setClauses.push(`notify_on_complete = $${paramIndex}`)
        values.push(input.notify_on_complete)
      }

      if (input.notify_on_nps_low !== undefined) {
        paramIndex++
        setClauses.push(`notify_on_nps_low = $${paramIndex}`)
        values.push(input.notify_on_nps_low)
      }

      if (input.nps_low_threshold !== undefined) {
        paramIndex++
        setClauses.push(`nps_low_threshold = $${paramIndex}`)
        values.push(input.nps_low_threshold)
      }

      if (input.daily_digest !== undefined) {
        paramIndex++
        setClauses.push(`daily_digest = $${paramIndex}`)
        values.push(input.daily_digest)
      }

      if (input.weekly_digest !== undefined) {
        paramIndex++
        setClauses.push(`weekly_digest = $${paramIndex}`)
        values.push(input.weekly_digest)
      }

      if (input.digest_day !== undefined) {
        paramIndex++
        setClauses.push(`digest_day = $${paramIndex}`)
        values.push(input.digest_day)
      }

      if (input.digest_hour !== undefined) {
        paramIndex++
        setClauses.push(`digest_hour = $${paramIndex}`)
        values.push(input.digest_hour)
      }

      if (input.is_active !== undefined) {
        paramIndex++
        setClauses.push(`is_active = $${paramIndex}`)
        values.push(input.is_active)
      }

      paramIndex++
      values.push(existing.id)

      const result = await sql.query(
        `UPDATE survey_slack_config SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values,
      )
      return result.rows[0] as SurveySlackConfig
    } else {
      const result = await sql`
        INSERT INTO survey_slack_config (
          survey_id, webhook_url, channel_name, notify_on_complete, notify_on_nps_low,
          nps_low_threshold, daily_digest, weekly_digest, digest_day, digest_hour, is_active
        ) VALUES (
          ${surveyId || null},
          ${input.webhook_url || ''},
          ${input.channel_name || null},
          ${input.notify_on_complete ?? true},
          ${input.notify_on_nps_low ?? true},
          ${input.nps_low_threshold ?? 6},
          ${input.daily_digest ?? false},
          ${input.weekly_digest ?? false},
          ${input.digest_day ?? 1},
          ${input.digest_hour ?? 9},
          ${input.is_active ?? true}
        )
        RETURNING *
      `
      return result.rows[0] as SurveySlackConfig
    }
  })
}

export async function deleteSlackConfig(
  tenantSlug: string,
  surveyId?: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    if (surveyId) {
      const result = await sql`
        DELETE FROM survey_slack_config
        WHERE survey_id = ${surveyId}
        RETURNING id
      `
      return result.rows.length > 0
    } else {
      const result = await sql`
        DELETE FROM survey_slack_config
        WHERE survey_id IS NULL
        RETURNING id
      `
      return result.rows.length > 0
    }
  })
}

// =============================================================================
// ANALYTICS
// =============================================================================

export async function getSurveyStats(
  tenantSlug: string,
  surveyId: string,
  options?: { startDate?: Date; endDate?: Date },
): Promise<SurveyStats> {
  return withTenant(tenantSlug, async () => {
    const dateConditions: string[] = []
    const values: unknown[] = [surveyId]
    let paramIndex = 1

    if (options?.startDate) {
      paramIndex++
      dateConditions.push(`r.created_at >= $${paramIndex}::timestamptz`)
      values.push(options.startDate.toISOString())
    }

    if (options?.endDate) {
      paramIndex++
      dateConditions.push(`r.created_at <= $${paramIndex}::timestamptz`)
      values.push(options.endDate.toISOString())
    }

    const dateFilter = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : ''

    const statsResult = await sql.query(
      `SELECT
         COUNT(*) as total_responses,
         COUNT(*) FILTER (WHERE is_complete = true) as completed_responses,
         AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE is_complete = true) as avg_completion_time
       FROM survey_responses r
       WHERE r.survey_id = $1 ${dateFilter}`,
      values,
    )

    const stats = statsResult.rows[0]
    const totalResponses = Number(stats?.total_responses || 0)
    const completedResponses = Number(stats?.completed_responses || 0)

    // Responses by day
    const dayValues = [...values]
    const byDayResult = await sql.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM survey_responses r
       WHERE r.survey_id = $1 ${dateFilter}
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 30`,
      dayValues,
    )

    // Question stats
    const questionValues = [...values]
    const questionStatsResult = await sql.query(
      `SELECT q.id as question_id, q.question_text,
              a.answer_value, COUNT(*) as count
       FROM survey_questions q
       LEFT JOIN survey_answers a ON a.question_id = q.id
       LEFT JOIN survey_responses r ON r.id = a.response_id
       WHERE q.survey_id = $1 ${dateFilter.replace(/r\./g, 'r.')}
       GROUP BY q.id, q.question_text, a.answer_value
       ORDER BY q.display_order`,
      questionValues,
    )

    const questionStatsMap = new Map<string, { questionId: string; questionText: string; answerCounts: Record<string, number> }>()
    for (const row of questionStatsResult.rows) {
      const key = row.question_id as string
      let stats = questionStatsMap.get(key)
      if (!stats) {
        stats = {
          questionId: key,
          questionText: row.question_text as string,
          answerCounts: {},
        }
        questionStatsMap.set(key, stats)
      }
      if (row.answer_value) {
        stats.answerCounts[row.answer_value as string] = Number(row.count)
      }
    }

    return {
      surveyId,
      totalResponses,
      completedResponses,
      completionRate: totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0,
      avgCompletionTime: Number(stats?.avg_completion_time || 0),
      responsesByDay: byDayResult.rows.map(r => ({
        date: r.date as string,
        count: Number(r.count),
      })),
      questionStats: Array.from(questionStatsMap.values()),
    }
  })
}

export async function getAttributionBreakdown(
  tenantSlug: string,
  options?: { startDate?: Date; endDate?: Date },
): Promise<AttributionBreakdown[]> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = ['r.attribution_source IS NOT NULL', 'r.is_complete = true']
    const values: unknown[] = []
    let paramIndex = 0

    if (options?.startDate) {
      paramIndex++
      conditions.push(`r.created_at >= $${paramIndex}::timestamptz`)
      values.push(options.startDate.toISOString())
    }

    if (options?.endDate) {
      paramIndex++
      conditions.push(`r.created_at <= $${paramIndex}::timestamptz`)
      values.push(options.endDate.toISOString())
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    const result = await sql.query(
      `SELECT
         r.attribution_source as source,
         ao.category,
         COUNT(*) as count,
         0 as revenue,
         0 as avg_order_value
       FROM survey_responses r
       LEFT JOIN attribution_options ao ON ao.value = r.attribution_source
       ${whereClause}
       GROUP BY r.attribution_source, ao.category
       ORDER BY count DESC`,
      values,
    )

    const total = result.rows.reduce((sum, r) => sum + Number(r.count), 0)

    return result.rows.map(r => ({
      source: r.source as string,
      category: r.category as AttributionBreakdown['category'],
      count: Number(r.count),
      percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
      revenue: Number(r.revenue || 0),
      avgOrderValue: Number(r.avg_order_value || 0),
    }))
  })
}

export async function getNpsOverTime(
  tenantSlug: string,
  options?: { surveyId?: string; startDate?: Date; endDate?: Date; groupBy?: 'day' | 'week' | 'month' },
): Promise<NpsTrendData[]> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = ['r.nps_score IS NOT NULL']
    const values: unknown[] = []
    let paramIndex = 0

    if (options?.surveyId) {
      paramIndex++
      conditions.push(`r.survey_id = $${paramIndex}`)
      values.push(options.surveyId)
    }

    if (options?.startDate) {
      paramIndex++
      conditions.push(`r.created_at >= $${paramIndex}::timestamptz`)
      values.push(options.startDate.toISOString())
    }

    if (options?.endDate) {
      paramIndex++
      conditions.push(`r.created_at <= $${paramIndex}::timestamptz`)
      values.push(options.endDate.toISOString())
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`
    const groupBy = options?.groupBy || 'day'

    let dateExpr: string
    switch (groupBy) {
      case 'week':
        dateExpr = "TO_CHAR(DATE_TRUNC('week', r.created_at), 'YYYY-MM-DD')"
        break
      case 'month':
        dateExpr = "TO_CHAR(DATE_TRUNC('month', r.created_at), 'YYYY-MM')"
        break
      default:
        dateExpr = 'DATE(r.created_at)'
    }

    const result = await sql.query(
      `SELECT
         ${dateExpr} as period,
         COUNT(*) FILTER (WHERE nps_score >= 9) as promoters,
         COUNT(*) FILTER (WHERE nps_score >= 7 AND nps_score <= 8) as passives,
         COUNT(*) FILTER (WHERE nps_score <= 6) as detractors,
         COUNT(*) as response_count
       FROM survey_responses r
       ${whereClause}
       GROUP BY ${dateExpr}
       ORDER BY period DESC
       LIMIT 90`,
      values,
    )

    return result.rows.map(r => {
      const promoters = Number(r.promoters)
      const detractors = Number(r.detractors)
      const total = Number(r.response_count)
      const npsScore = total > 0 ? ((promoters - detractors) / total) * 100 : 0

      return {
        period: r.period as string,
        promoters,
        passives: Number(r.passives),
        detractors,
        npsScore: Math.round(npsScore),
        responseCount: total,
      }
    })
  })
}

// =============================================================================
// HELPERS
// =============================================================================

function parseSurveyRow(row: Record<string, unknown>): Survey {
  return {
    ...row,
    trigger_config: parseJsonField<TriggerConfig>(row.trigger_config),
    branding_config: parseJsonField<BrandingConfig>(row.branding_config),
    target_config: parseJsonField<TargetConfig>(row.target_config),
    translations: parseJsonField<Record<string, unknown>>(row.translations),
    response_count: row.response_count ? Number(row.response_count) : undefined,
    completion_rate: row.completion_rate ? Number(row.completion_rate) : undefined,
  } as Survey
}

function parseQuestionRow(row: Record<string, unknown>): SurveyQuestion {
  return {
    ...row,
    options: parseJsonField<QuestionOption[]>(row.options) || [],
    validation_config: parseJsonField<ValidationConfig>(row.validation_config) || {},
    show_when: parseJsonField<ConditionalLogic | null>(row.show_when),
    translations: parseJsonField<Record<string, unknown>>(row.translations) || {},
  } as SurveyQuestion
}

function parseJsonField<T>(value: unknown): T {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return parsed as T
    } catch {
      // If parsing fails, return value as-is (will be coerced to T)
      return value as unknown as T
    }
  }
  return value as T
}
