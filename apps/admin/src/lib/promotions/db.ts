/**
 * Scheduled promotions database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  CreatePromotionInput,
  ScheduledPromotion,
  UpdatePromotionInput,
  PromotionCalendarEvent,
} from './types'

export interface PromotionListResult {
  rows: ScheduledPromotion[]
  totalCount: number
}

export interface PromotionListParams {
  limit?: number
  offset?: number
  status?: string
  includeEnded?: boolean
  startDate?: string
  endDate?: string
}

/**
 * Get list of scheduled promotions
 */
export async function getPromotionList(
  tenantSlug: string,
  params: PromotionListParams = {},
): Promise<PromotionListResult> {
  const { limit = 50, offset = 0, status, includeEnded = true, startDate, endDate } = params

  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (status) {
      paramIndex++
      conditions.push(`status = $${paramIndex}::promotion_status`)
      values.push(status)
    }

    if (!includeEnded) {
      conditions.push(`status != 'ended'`)
    }

    if (startDate) {
      paramIndex++
      conditions.push(`ends_at >= $${paramIndex}::timestamptz`)
      values.push(startDate)
    }

    if (endDate) {
      paramIndex++
      conditions.push(`starts_at <= $${paramIndex}::timestamptz`)
      values.push(endDate)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(limit, offset)

    const dataResult = await sql.query(
      `SELECT
        id, name, description, status, starts_at, ends_at,
        timezone_start, timezone_end,
        sitewide_discount_percent, subscription_discount_percent,
        bundle_discount_percent, onetime_discount_percent,
        banner_text, banner_background_color, banner_text_color, badge_text,
        promo_code, product_overrides, selling_plan_overrides, collection_overrides,
        created_at, updated_at
       FROM scheduled_promotions
       ${whereClause}
       ORDER BY starts_at ASC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM scheduled_promotions ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as ScheduledPromotion[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

/**
 * Get promotions for calendar view within a date range
 */
export async function getPromotionsForCalendar(
  tenantSlug: string,
  startDate: string,
  endDate: string,
): Promise<PromotionCalendarEvent[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, name, starts_at, ends_at, status,
        sitewide_discount_percent, badge_text
      FROM scheduled_promotions
      WHERE
        (starts_at <= ${endDate}::timestamptz AND ends_at >= ${startDate}::timestamptz)
        OR (starts_at >= ${startDate}::timestamptz AND starts_at <= ${endDate}::timestamptz)
      ORDER BY starts_at ASC
    `

    return result.rows.map((row) => {
      const r = row as {
        id: string
        name: string
        starts_at: string
        ends_at: string
        status: string
        sitewide_discount_percent: number | null
        badge_text: string | null
      }
      return {
        id: r.id,
        title: r.name,
        start: new Date(r.starts_at),
        end: new Date(r.ends_at),
        status: r.status as ScheduledPromotion['status'],
        sitewide_discount_percent: r.sitewide_discount_percent,
        badge_text: r.badge_text,
      }
    })
  })
}

/**
 * Get single promotion by ID
 */
export async function getPromotionById(
  tenantSlug: string,
  id: string,
): Promise<ScheduledPromotion | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, name, description, status, starts_at, ends_at,
        timezone_start, timezone_end,
        sitewide_discount_percent, subscription_discount_percent,
        bundle_discount_percent, onetime_discount_percent,
        banner_text, banner_background_color, banner_text_color, badge_text,
        promo_code, product_overrides, selling_plan_overrides, collection_overrides,
        created_at, updated_at
      FROM scheduled_promotions
      WHERE id = ${id}
      LIMIT 1
    `
    return (result.rows[0] as ScheduledPromotion) || null
  })
}

/**
 * Get currently active promotion
 */
export async function getActivePromotion(
  tenantSlug: string,
): Promise<ScheduledPromotion | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, name, description, status, starts_at, ends_at,
        timezone_start, timezone_end,
        sitewide_discount_percent, subscription_discount_percent,
        bundle_discount_percent, onetime_discount_percent,
        banner_text, banner_background_color, banner_text_color, badge_text,
        promo_code, product_overrides, selling_plan_overrides, collection_overrides,
        created_at, updated_at
      FROM scheduled_promotions
      WHERE status = 'active'
        AND starts_at <= NOW()
        AND ends_at >= NOW()
      ORDER BY starts_at ASC
      LIMIT 1
    `
    return (result.rows[0] as ScheduledPromotion) || null
  })
}

/**
 * Create a scheduled promotion
 */
export async function createPromotion(
  tenantSlug: string,
  input: CreatePromotionInput,
): Promise<ScheduledPromotion> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO scheduled_promotions (
        name, description, starts_at, ends_at,
        timezone_start, timezone_end,
        sitewide_discount_percent, subscription_discount_percent,
        bundle_discount_percent, onetime_discount_percent,
        banner_text, banner_background_color, banner_text_color, badge_text,
        promo_code, product_overrides, selling_plan_overrides, collection_overrides
      )
      VALUES (
        ${input.name},
        ${input.description || null},
        ${input.starts_at}::timestamptz,
        ${input.ends_at}::timestamptz,
        ${input.timezone_start || 'America/New_York'},
        ${input.timezone_end || 'America/Los_Angeles'},
        ${input.sitewide_discount_percent ?? null},
        ${input.subscription_discount_percent ?? null},
        ${input.bundle_discount_percent ?? null},
        ${input.onetime_discount_percent ?? null},
        ${input.banner_text || null},
        ${input.banner_background_color || '#ef4444'},
        ${input.banner_text_color || '#ffffff'},
        ${input.badge_text || null},
        ${input.promo_code || null},
        ${input.product_overrides ? JSON.stringify(input.product_overrides) : null}::jsonb,
        ${input.selling_plan_overrides ? JSON.stringify(input.selling_plan_overrides) : null}::jsonb,
        ${input.collection_overrides ? JSON.stringify(input.collection_overrides) : null}::jsonb
      )
      RETURNING
        id, name, description, status, starts_at, ends_at,
        timezone_start, timezone_end,
        sitewide_discount_percent, subscription_discount_percent,
        bundle_discount_percent, onetime_discount_percent,
        banner_text, banner_background_color, banner_text_color, badge_text,
        promo_code, product_overrides, selling_plan_overrides, collection_overrides,
        created_at, updated_at
    `
    return result.rows[0] as ScheduledPromotion
  })
}

/**
 * Update a scheduled promotion
 */
export async function updatePromotion(
  tenantSlug: string,
  id: string,
  input: UpdatePromotionInput,
): Promise<ScheduledPromotion | null> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (input.name !== undefined) {
      paramIndex++
      updates.push(`name = $${paramIndex}`)
      values.push(input.name)
    }
    if (input.description !== undefined) {
      paramIndex++
      updates.push(`description = $${paramIndex}`)
      values.push(input.description)
    }
    if (input.status !== undefined) {
      paramIndex++
      updates.push(`status = $${paramIndex}::promotion_status`)
      values.push(input.status)
    }
    if (input.starts_at !== undefined) {
      paramIndex++
      updates.push(`starts_at = $${paramIndex}::timestamptz`)
      values.push(input.starts_at)
    }
    if (input.ends_at !== undefined) {
      paramIndex++
      updates.push(`ends_at = $${paramIndex}::timestamptz`)
      values.push(input.ends_at)
    }
    if (input.timezone_start !== undefined) {
      paramIndex++
      updates.push(`timezone_start = $${paramIndex}`)
      values.push(input.timezone_start)
    }
    if (input.timezone_end !== undefined) {
      paramIndex++
      updates.push(`timezone_end = $${paramIndex}`)
      values.push(input.timezone_end)
    }
    if (input.sitewide_discount_percent !== undefined) {
      paramIndex++
      updates.push(`sitewide_discount_percent = $${paramIndex}`)
      values.push(input.sitewide_discount_percent)
    }
    if (input.subscription_discount_percent !== undefined) {
      paramIndex++
      updates.push(`subscription_discount_percent = $${paramIndex}`)
      values.push(input.subscription_discount_percent)
    }
    if (input.bundle_discount_percent !== undefined) {
      paramIndex++
      updates.push(`bundle_discount_percent = $${paramIndex}`)
      values.push(input.bundle_discount_percent)
    }
    if (input.onetime_discount_percent !== undefined) {
      paramIndex++
      updates.push(`onetime_discount_percent = $${paramIndex}`)
      values.push(input.onetime_discount_percent)
    }
    if (input.banner_text !== undefined) {
      paramIndex++
      updates.push(`banner_text = $${paramIndex}`)
      values.push(input.banner_text)
    }
    if (input.banner_background_color !== undefined) {
      paramIndex++
      updates.push(`banner_background_color = $${paramIndex}`)
      values.push(input.banner_background_color)
    }
    if (input.banner_text_color !== undefined) {
      paramIndex++
      updates.push(`banner_text_color = $${paramIndex}`)
      values.push(input.banner_text_color)
    }
    if (input.badge_text !== undefined) {
      paramIndex++
      updates.push(`badge_text = $${paramIndex}`)
      values.push(input.badge_text)
    }
    if (input.promo_code !== undefined) {
      paramIndex++
      updates.push(`promo_code = $${paramIndex}`)
      values.push(input.promo_code)
    }
    if (input.product_overrides !== undefined) {
      paramIndex++
      updates.push(`product_overrides = $${paramIndex}::jsonb`)
      values.push(input.product_overrides ? JSON.stringify(input.product_overrides) : null)
    }
    if (input.selling_plan_overrides !== undefined) {
      paramIndex++
      updates.push(`selling_plan_overrides = $${paramIndex}::jsonb`)
      values.push(
        input.selling_plan_overrides ? JSON.stringify(input.selling_plan_overrides) : null,
      )
    }
    if (input.collection_overrides !== undefined) {
      paramIndex++
      updates.push(`collection_overrides = $${paramIndex}::jsonb`)
      values.push(input.collection_overrides ? JSON.stringify(input.collection_overrides) : null)
    }

    if (updates.length === 0) {
      return getPromotionById(tenantSlug, id)
    }

    paramIndex++
    values.push(id)

    const result = await sql.query(
      `UPDATE scheduled_promotions
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING
         id, name, description, status, starts_at, ends_at,
         timezone_start, timezone_end,
         sitewide_discount_percent, subscription_discount_percent,
         bundle_discount_percent, onetime_discount_percent,
         banner_text, banner_background_color, banner_text_color, badge_text,
         promo_code, product_overrides, selling_plan_overrides, collection_overrides,
         created_at, updated_at`,
      values,
    )

    return (result.rows[0] as ScheduledPromotion) || null
  })
}

/**
 * Delete a scheduled promotion
 */
export async function deletePromotion(tenantSlug: string, id: string): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM scheduled_promotions WHERE id = ${id}
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Check for overlapping promotions
 */
export async function checkPromotionOverlaps(
  tenantSlug: string,
  startsAt: string,
  endsAt: string,
  excludeId?: string,
): Promise<ScheduledPromotion[]> {
  return withTenant(tenantSlug, async () => {
    if (excludeId) {
      const result = await sql`
        SELECT
          id, name, description, status, starts_at, ends_at,
          timezone_start, timezone_end,
          sitewide_discount_percent, subscription_discount_percent,
          bundle_discount_percent, onetime_discount_percent,
          banner_text, banner_background_color, banner_text_color, badge_text,
          promo_code, product_overrides, selling_plan_overrides, collection_overrides,
          created_at, updated_at
        FROM scheduled_promotions
        WHERE id != ${excludeId}
          AND status != 'ended'
          AND status != 'disabled'
          AND starts_at < ${endsAt}::timestamptz
          AND ends_at > ${startsAt}::timestamptz
      `
      return result.rows as ScheduledPromotion[]
    }

    const result = await sql`
      SELECT
        id, name, description, status, starts_at, ends_at,
        timezone_start, timezone_end,
        sitewide_discount_percent, subscription_discount_percent,
        bundle_discount_percent, onetime_discount_percent,
        banner_text, banner_background_color, banner_text_color, badge_text,
        promo_code, product_overrides, selling_plan_overrides, collection_overrides,
        created_at, updated_at
      FROM scheduled_promotions
      WHERE status != 'ended'
        AND status != 'disabled'
        AND starts_at < ${endsAt}::timestamptz
        AND ends_at > ${startsAt}::timestamptz
    `
    return result.rows as ScheduledPromotion[]
  })
}

/**
 * Update promotion statuses based on current time
 * Should be called periodically by a background job
 */
export async function updatePromotionStatuses(tenantSlug: string): Promise<number> {
  return withTenant(tenantSlug, async () => {
    // Activate scheduled promotions that have started
    const activatedResult = await sql`
      UPDATE scheduled_promotions
      SET status = 'active', updated_at = NOW()
      WHERE status = 'scheduled'
        AND starts_at <= NOW()
        AND ends_at > NOW()
    `

    // End active promotions that have finished
    const endedResult = await sql`
      UPDATE scheduled_promotions
      SET status = 'ended', updated_at = NOW()
      WHERE status = 'active'
        AND ends_at <= NOW()
    `

    return (activatedResult.rowCount ?? 0) + (endedResult.rowCount ?? 0)
  })
}
