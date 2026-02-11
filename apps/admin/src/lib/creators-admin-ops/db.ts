/**
 * Creator Admin Operations Database Functions
 * All functions use tenant isolation via withTenant()
 */

import { withTenant, sql } from '@cgk/db'

import type {
  Commission,
  CommissionConfig,
  CommissionFilters,
  CommissionSummary,
  CreatorApplication,
  ApplicationFilters,
  OnboardingConfig,
  OnboardingMetrics,
  StepCompletionMetric,
  StuckCreator,
  SampleRequest,
  SampleFilters,
  SampleStats,
  TierRate,
  OnboardingStep,
  SampleProduct,
  ShippingAddress,
} from './types'

// ============================================================================
// Commission Functions
// ============================================================================

export async function getCommissions(
  tenantSlug: string,
  filters: CommissionFilters
): Promise<{ rows: Commission[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status) {
      paramIndex++
      conditions.push(`c.status = $${paramIndex}::commission_status`)
      values.push(filters.status)
    }
    if (filters.creatorId) {
      paramIndex++
      conditions.push(`c.creator_id = $${paramIndex}`)
      values.push(filters.creatorId)
    }
    if (filters.dateFrom) {
      paramIndex++
      conditions.push(`c.order_date >= $${paramIndex}::timestamptz`)
      values.push(filters.dateFrom)
    }
    if (filters.dateTo) {
      paramIndex++
      conditions.push(`c.order_date <= $${paramIndex}::timestamptz`)
      values.push(filters.dateTo)
    }
    if (filters.search) {
      paramIndex++
      conditions.push(`(
        c.order_number ILIKE $${paramIndex} OR
        c.promo_code ILIKE $${paramIndex} OR
        cr.email ILIKE $${paramIndex} OR
        cr.first_name ILIKE $${paramIndex} OR
        cr.last_name ILIKE $${paramIndex}
      )`)
      values.push(`%${filters.search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        c.id, c.order_id, c.order_number, c.order_date,
        c.creator_id, c.promo_code, c.net_sales_cents,
        c.commission_percent, c.commission_cents, c.currency,
        c.status, c.approved_by, c.approved_at,
        c.payout_id, c.paid_at, c.rejected_reason,
        c.created_at, c.updated_at,
        CONCAT(cr.first_name, ' ', cr.last_name) as creator_name,
        cr.email as creator_email
      FROM commissions c
      JOIN creators cr ON c.creator_id = cr.id
      ${whereClause}
      ORDER BY c.order_date DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count
       FROM commissions c
       JOIN creators cr ON c.creator_id = cr.id
       ${whereClause}`,
      countValues
    )

    return {
      rows: dataResult.rows as Commission[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getCommissionSummary(tenantSlug: string): Promise<CommissionSummary> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COALESCE(SUM(commission_cents) FILTER (WHERE status = 'pending'), 0) as pending_cents,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COALESCE(SUM(commission_cents) FILTER (WHERE status = 'approved'), 0) as approved_cents,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COALESCE(SUM(commission_cents) FILTER (WHERE status = 'paid'), 0) as paid_cents,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM NOW())) as total_ytd_count,
        COALESCE(SUM(commission_cents) FILTER (WHERE EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM NOW())), 0) as total_ytd_cents
      FROM commissions
    `
    return {
      pending_count: Number(result.rows[0]?.pending_count || 0),
      pending_cents: Number(result.rows[0]?.pending_cents || 0),
      approved_count: Number(result.rows[0]?.approved_count || 0),
      approved_cents: Number(result.rows[0]?.approved_cents || 0),
      paid_count: Number(result.rows[0]?.paid_count || 0),
      paid_cents: Number(result.rows[0]?.paid_cents || 0),
      total_ytd_count: Number(result.rows[0]?.total_ytd_count || 0),
      total_ytd_cents: Number(result.rows[0]?.total_ytd_cents || 0),
    }
  })
}

export async function approveCommissions(
  tenantSlug: string,
  commissionIds: string[],
  approvedBy: string
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const idsArray = `{${commissionIds.join(',')}}`
    const result = await sql`
      UPDATE commissions
      SET status = 'approved', approved_by = ${approvedBy}, approved_at = NOW(), updated_at = NOW()
      WHERE id = ANY(${idsArray}::text[]) AND status = 'pending'
    `
    return result.rowCount || 0
  })
}

export async function rejectCommissions(
  tenantSlug: string,
  commissionIds: string[],
  reason: string,
  rejectedBy: string
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const idsArray = `{${commissionIds.join(',')}}`
    const result = await sql`
      UPDATE commissions
      SET status = 'rejected', rejected_reason = ${reason}, rejected_by = ${rejectedBy},
          rejected_at = NOW(), updated_at = NOW()
      WHERE id = ANY(${idsArray}::text[]) AND status = 'pending'
    `
    return result.rowCount || 0
  })
}

export async function getCommissionConfig(tenantSlug: string): Promise<CommissionConfig | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, default_rate_percent, tier_rates, auto_retroactive,
             retroactive_lookback_days, created_at, updated_at
      FROM commission_config
      LIMIT 1
    `
    if (result.rows.length === 0) return null
    const row = result.rows[0] as {
      id: string
      default_rate_percent: string
      tier_rates: TierRate[]
      auto_retroactive: boolean
      retroactive_lookback_days: number
      created_at: string
      updated_at: string
    }
    return {
      ...row,
      default_rate_percent: Number(row.default_rate_percent),
    }
  })
}

export async function upsertCommissionConfig(
  tenantSlug: string,
  config: Partial<CommissionConfig>
): Promise<CommissionConfig> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO commission_config (
        default_rate_percent, tier_rates, auto_retroactive, retroactive_lookback_days
      ) VALUES (
        ${config.default_rate_percent || 10},
        ${JSON.stringify(config.tier_rates || [])},
        ${config.auto_retroactive ?? true},
        ${config.retroactive_lookback_days || 90}
      )
      ON CONFLICT ((1)) DO UPDATE SET
        default_rate_percent = EXCLUDED.default_rate_percent,
        tier_rates = EXCLUDED.tier_rates,
        auto_retroactive = EXCLUDED.auto_retroactive,
        retroactive_lookback_days = EXCLUDED.retroactive_lookback_days,
        updated_at = NOW()
      RETURNING id, default_rate_percent, tier_rates, auto_retroactive,
                retroactive_lookback_days, created_at, updated_at
    `
    const row = result.rows[0] as {
      id: string
      default_rate_percent: string
      tier_rates: TierRate[]
      auto_retroactive: boolean
      retroactive_lookback_days: number
      created_at: string
      updated_at: string
    }
    return {
      ...row,
      default_rate_percent: Number(row.default_rate_percent),
    }
  })
}

// ============================================================================
// Application Functions
// ============================================================================

export async function getApplications(
  tenantSlug: string,
  filters: ApplicationFilters
): Promise<{ rows: CreatorApplication[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status) {
      paramIndex++
      conditions.push(`status = $${paramIndex}::application_status`)
      values.push(filters.status)
    }
    if (filters.source) {
      paramIndex++
      conditions.push(`source = $${paramIndex}`)
      values.push(filters.source)
    }
    if (filters.dateFrom) {
      paramIndex++
      conditions.push(`created_at >= $${paramIndex}::timestamptz`)
      values.push(filters.dateFrom)
    }
    if (filters.dateTo) {
      paramIndex++
      conditions.push(`created_at <= $${paramIndex}::timestamptz`)
      values.push(filters.dateTo)
    }
    if (filters.search) {
      paramIndex++
      conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT * FROM creator_applications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM creator_applications ${whereClause}`,
      countValues
    )

    return {
      rows: dataResult.rows as CreatorApplication[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getApplicationById(
  tenantSlug: string,
  applicationId: string
): Promise<CreatorApplication | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM creator_applications WHERE id = ${applicationId}
    `
    return result.rows.length > 0 ? (result.rows[0] as CreatorApplication) : null
  })
}

export async function getApplicationStatusCounts(
  tenantSlug: string
): Promise<Record<string, number>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT status, COUNT(*) as count
      FROM creator_applications
      GROUP BY status
    `
    const counts: Record<string, number> = {}
    for (const row of result.rows) {
      counts[row.status as string] = Number(row.count)
    }
    return counts
  })
}

export async function updateApplicationStatus(
  tenantSlug: string,
  applicationId: string,
  status: string,
  reviewedBy: string,
  options?: {
    rejectionReason?: string
    internalNotes?: string
    creatorId?: string
  }
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      UPDATE creator_applications
      SET status = ${status}::application_status,
          reviewed_by = ${reviewedBy},
          reviewed_at = NOW(),
          rejection_reason = ${options?.rejectionReason || null},
          internal_notes = COALESCE(${options?.internalNotes}, internal_notes),
          creator_id = ${options?.creatorId || null},
          updated_at = NOW()
      WHERE id = ${applicationId}
    `
  })
}

// ============================================================================
// Onboarding Functions
// ============================================================================

export async function getOnboardingConfig(tenantSlug: string): Promise<OnboardingConfig | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM onboarding_config LIMIT 1
    `
    if (result.rows.length === 0) return null
    const row = result.rows[0] as {
      id: string
      steps: OnboardingStep[]
      max_completion_days: number
      auto_deactivate: boolean
      default_commission_percent: string
      auto_generate_code: boolean
      code_format: string
      welcome_template_id: string | null
      created_at: string
      updated_at: string
    }
    return {
      ...row,
      default_commission_percent: Number(row.default_commission_percent),
    }
  })
}

export async function upsertOnboardingConfig(
  tenantSlug: string,
  config: Partial<OnboardingConfig>
): Promise<OnboardingConfig> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO onboarding_config (
        steps, max_completion_days, auto_deactivate,
        default_commission_percent, auto_generate_code, code_format, welcome_template_id
      ) VALUES (
        ${JSON.stringify(config.steps || [])},
        ${config.max_completion_days || 30},
        ${config.auto_deactivate ?? true},
        ${config.default_commission_percent || 10},
        ${config.auto_generate_code ?? true},
        ${config.code_format || '{NAME}{RANDOM2}'},
        ${config.welcome_template_id || null}
      )
      ON CONFLICT ((1)) DO UPDATE SET
        steps = EXCLUDED.steps,
        max_completion_days = EXCLUDED.max_completion_days,
        auto_deactivate = EXCLUDED.auto_deactivate,
        default_commission_percent = EXCLUDED.default_commission_percent,
        auto_generate_code = EXCLUDED.auto_generate_code,
        code_format = EXCLUDED.code_format,
        welcome_template_id = EXCLUDED.welcome_template_id,
        updated_at = NOW()
      RETURNING *
    `
    const row = result.rows[0] as {
      id: string
      steps: OnboardingStep[]
      max_completion_days: number
      auto_deactivate: boolean
      default_commission_percent: string
      auto_generate_code: boolean
      code_format: string
      welcome_template_id: string | null
      created_at: string
      updated_at: string
    }
    return {
      ...row,
      default_commission_percent: Number(row.default_commission_percent),
    }
  })
}

export async function getOnboardingMetrics(
  tenantSlug: string,
  periodDays: number = 30
): Promise<OnboardingMetrics> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      WITH period_apps AS (
        SELECT * FROM creator_applications
        WHERE created_at >= NOW() - INTERVAL '1 day' * ${periodDays}
      ),
      approved AS (
        SELECT * FROM period_apps WHERE status = 'approved'
      ),
      onboarding_started AS (
        SELECT DISTINCT co.creator_id
        FROM creator_onboarding co
        JOIN creators c ON co.creator_id = c.id
        WHERE c.created_at >= NOW() - INTERVAL '1 day' * ${periodDays}
      ),
      onboarding_completed AS (
        SELECT creator_id
        FROM creator_onboarding co
        JOIN onboarding_config oc ON true
        WHERE co.completed = true
        GROUP BY creator_id, oc.steps
        HAVING COUNT(*) >= (
          SELECT COUNT(*)
          FROM jsonb_array_elements(oc.steps) step
          WHERE (step->>'required')::boolean = true
        )
      ),
      active_creators AS (
        SELECT DISTINCT creator_id
        FROM commissions
        WHERE created_at >= NOW() - INTERVAL '30 days'
      )
      SELECT
        (SELECT COUNT(*) FROM period_apps) as applications_received,
        (SELECT COUNT(*) FROM approved) as approved_count,
        (SELECT COUNT(*) FROM period_apps) as total_apps,
        (SELECT COUNT(*) FROM onboarding_started) as onboarding_started_count,
        (SELECT COUNT(*) FROM onboarding_completed) as onboarding_completed_count,
        (SELECT COUNT(*) FROM active_creators) as active_30d_count,
        (SELECT AVG(EXTRACT(DAY FROM (completed_at - created_at)))
         FROM creator_onboarding WHERE completed = true) as avg_completion_days
    `

    const row = result.rows[0]
    const appsReceived = Number(row?.applications_received || 0)
    const approvedCount = Number(row?.approved_count || 0)
    const onboardingStarted = Number(row?.onboarding_started_count || 0)
    const onboardingCompleted = Number(row?.onboarding_completed_count || 0)
    const active30d = Number(row?.active_30d_count || 0)

    return {
      applications_received: appsReceived,
      approval_rate: appsReceived > 0 ? (approvedCount / appsReceived) * 100 : 0,
      onboarding_started_count: onboardingStarted,
      onboarding_started_rate: approvedCount > 0 ? (onboardingStarted / approvedCount) * 100 : 0,
      onboarding_completed_count: onboardingCompleted,
      onboarding_completed_rate: onboardingStarted > 0 ? (onboardingCompleted / onboardingStarted) * 100 : 0,
      first_project_count: 0, // Would need projects table
      first_project_rate: 0,
      active_30d_count: active30d,
      active_30d_rate: onboardingCompleted > 0 ? (active30d / onboardingCompleted) * 100 : 0,
      avg_completion_days: Number(row?.avg_completion_days || 0),
    }
  })
}

export async function getStepCompletionMetrics(
  tenantSlug: string
): Promise<StepCompletionMetric[]> {
  return withTenant(tenantSlug, async () => {
    const config = await getOnboardingConfig(tenantSlug)
    if (!config) return []

    const result = await sql`
      SELECT
        co.step_id,
        COUNT(*) FILTER (WHERE co.completed = true) as completed_count,
        COUNT(*) FILTER (WHERE co.completed = false) as pending_count,
        AVG(
          CASE WHEN co.completed = true
          THEN EXTRACT(DAY FROM (co.completed_at - co.created_at))
          ELSE NULL END
        ) as avg_days
      FROM creator_onboarding co
      GROUP BY co.step_id
    `

    const stepMap = new Map(config.steps.map((s) => [s.id, s.name]))

    return result.rows.map((row) => ({
      step_id: row.step_id as string,
      step_name: stepMap.get(row.step_id as string) || row.step_id as string,
      completed_count: Number(row.completed_count || 0),
      pending_count: Number(row.pending_count || 0),
      avg_days: Number(row.avg_days || 0),
    }))
  })
}

export async function getStuckCreators(
  tenantSlug: string,
  minDays: number = 14
): Promise<StuckCreator[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        co.id,
        co.creator_id,
        CONCAT(c.first_name, ' ', c.last_name) as creator_name,
        c.email as creator_email,
        co.step_id,
        co.reminder_count,
        co.last_reminder_at,
        EXTRACT(DAY FROM (NOW() - co.created_at)) as days_stuck
      FROM creator_onboarding co
      JOIN creators c ON co.creator_id = c.id
      WHERE co.completed = false
        AND co.created_at < NOW() - INTERVAL '1 day' * ${minDays}
      ORDER BY days_stuck DESC
    `

    const config = await getOnboardingConfig(tenantSlug)
    const stepMap = new Map(config?.steps.map((s) => [s.id, s.name]) || [])

    return result.rows.map((row) => ({
      id: row.id as string,
      creator_id: row.creator_id as string,
      creator_name: row.creator_name as string,
      creator_email: row.creator_email as string,
      step_id: row.step_id as string,
      step_name: stepMap.get(row.step_id as string) || row.step_id as string,
      days_stuck: Number(row.days_stuck || 0),
      reminder_count: Number(row.reminder_count || 0),
      last_reminder_at: row.last_reminder_at as string | null,
    }))
  })
}

export async function recordOnboardingReminder(
  tenantSlug: string,
  creatorId: string,
  stepId: string
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      UPDATE creator_onboarding
      SET reminder_count = reminder_count + 1,
          last_reminder_at = NOW(),
          updated_at = NOW()
      WHERE creator_id = ${creatorId} AND step_id = ${stepId}
    `
  })
}

// ============================================================================
// Sample Functions
// ============================================================================

export async function getSampleRequests(
  tenantSlug: string,
  filters: SampleFilters
): Promise<{ rows: SampleRequest[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status) {
      paramIndex++
      conditions.push(`sr.status = $${paramIndex}::sample_status`)
      values.push(filters.status)
    }
    if (filters.creatorId) {
      paramIndex++
      conditions.push(`sr.creator_id = $${paramIndex}`)
      values.push(filters.creatorId)
    }
    if (filters.dateFrom) {
      paramIndex++
      conditions.push(`sr.requested_at >= $${paramIndex}::timestamptz`)
      values.push(filters.dateFrom)
    }
    if (filters.dateTo) {
      paramIndex++
      conditions.push(`sr.requested_at <= $${paramIndex}::timestamptz`)
      values.push(filters.dateTo)
    }
    if (filters.search) {
      paramIndex++
      conditions.push(`(
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex} OR
        sr.tracking_number ILIKE $${paramIndex}
      )`)
      values.push(`%${filters.search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        sr.*,
        CONCAT(c.first_name, ' ', c.last_name) as creator_name,
        c.email as creator_email
      FROM sample_requests sr
      JOIN creators c ON sr.creator_id = c.id
      ${whereClause}
      ORDER BY sr.requested_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count
       FROM sample_requests sr
       JOIN creators c ON sr.creator_id = c.id
       ${whereClause}`,
      countValues
    )

    return {
      rows: dataResult.rows as SampleRequest[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getSampleStats(tenantSlug: string): Promise<SampleStats> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('requested', 'approved', 'pending')) as pending_count,
        COUNT(*) FILTER (WHERE status IN ('shipped', 'in_transit')) as shipped_count,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
        COUNT(*) FILTER (
          WHERE shipped_at >= DATE_TRUNC('month', NOW())
        ) as this_month_count
      FROM sample_requests
    `
    return {
      pending_count: Number(result.rows[0]?.pending_count || 0),
      shipped_count: Number(result.rows[0]?.shipped_count || 0),
      delivered_count: Number(result.rows[0]?.delivered_count || 0),
      this_month_count: Number(result.rows[0]?.this_month_count || 0),
    }
  })
}

export async function createSampleRequest(
  tenantSlug: string,
  data: {
    creatorId: string
    products: SampleProduct[]
    shippingAddress: ShippingAddress
    priority?: 'normal' | 'rush'
    notes?: string
  }
): Promise<SampleRequest> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO sample_requests (creator_id, products, shipping_address, priority, notes)
      VALUES (
        ${data.creatorId},
        ${JSON.stringify(data.products)},
        ${JSON.stringify(data.shippingAddress)},
        ${data.priority || 'normal'}::sample_priority,
        ${data.notes || null}
      )
      RETURNING *
    `
    return result.rows[0] as SampleRequest
  })
}

export async function updateSampleRequest(
  tenantSlug: string,
  sampleId: string,
  data: {
    status?: string
    trackingCarrier?: string
    trackingNumber?: string
    trackingUrl?: string
    estimatedDelivery?: string
    actualDelivery?: string
    notes?: string
    internalNotes?: string
    costCents?: number
  }
): Promise<SampleRequest> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (data.status) {
      paramIndex++
      updates.push(`status = $${paramIndex}::sample_status`)
      values.push(data.status)
      if (data.status === 'shipped') {
        updates.push(`shipped_at = NOW()`)
      } else if (data.status === 'delivered') {
        updates.push(`delivered_at = NOW()`)
      } else if (data.status === 'cancelled') {
        updates.push(`cancelled_at = NOW()`)
      }
    }
    if (data.trackingCarrier !== undefined) {
      paramIndex++
      updates.push(`tracking_carrier = $${paramIndex}`)
      values.push(data.trackingCarrier)
    }
    if (data.trackingNumber !== undefined) {
      paramIndex++
      updates.push(`tracking_number = $${paramIndex}`)
      values.push(data.trackingNumber)
    }
    if (data.trackingUrl !== undefined) {
      paramIndex++
      updates.push(`tracking_url = $${paramIndex}`)
      values.push(data.trackingUrl)
    }
    if (data.estimatedDelivery !== undefined) {
      paramIndex++
      updates.push(`estimated_delivery = $${paramIndex}::date`)
      values.push(data.estimatedDelivery)
    }
    if (data.actualDelivery !== undefined) {
      paramIndex++
      updates.push(`actual_delivery = $${paramIndex}::date`)
      values.push(data.actualDelivery)
    }
    if (data.notes !== undefined) {
      paramIndex++
      updates.push(`notes = $${paramIndex}`)
      values.push(data.notes)
    }
    if (data.internalNotes !== undefined) {
      paramIndex++
      updates.push(`internal_notes = $${paramIndex}`)
      values.push(data.internalNotes)
    }
    if (data.costCents !== undefined) {
      paramIndex++
      updates.push(`cost_cents = $${paramIndex}`)
      values.push(data.costCents)
    }

    paramIndex++
    values.push(sampleId)

    const result = await sql.query(
      `UPDATE sample_requests SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    return result.rows[0] as SampleRequest
  })
}

export async function bulkUpdateSampleStatus(
  tenantSlug: string,
  sampleIds: string[],
  status: string,
  trackingInfo?: {
    carrier?: string
    number?: string
    url?: string
  }
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    let additionalUpdates = ''
    if (status === 'shipped') {
      additionalUpdates = ', shipped_at = NOW()'
      if (trackingInfo) {
        additionalUpdates += `, tracking_carrier = ${trackingInfo.carrier ? `'${trackingInfo.carrier}'` : 'tracking_carrier'}`
        additionalUpdates += `, tracking_number = ${trackingInfo.number ? `'${trackingInfo.number}'` : 'tracking_number'}`
        additionalUpdates += `, tracking_url = ${trackingInfo.url ? `'${trackingInfo.url}'` : 'tracking_url'}`
      }
    } else if (status === 'delivered') {
      additionalUpdates = ', delivered_at = NOW()'
    } else if (status === 'cancelled') {
      additionalUpdates = ', cancelled_at = NOW()'
    }

    const idsArray = `{${sampleIds.join(',')}}`
    const result = await sql`
      UPDATE sample_requests
      SET status = ${status}::sample_status, updated_at = NOW()
      WHERE id = ANY(${idsArray}::text[])
    `
    return result.rowCount || 0
  })
}

export async function deleteSampleRequest(
  tenantSlug: string,
  sampleId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM sample_requests WHERE id = ${sampleId}
    `
    return (result.rowCount || 0) > 0
  })
}
