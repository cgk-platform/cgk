/**
 * Tax database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type { CreatorTaxInfo, TaxFilters, TaxYearSummary } from './types'

const THRESHOLD_1099_CENTS = 60000

export async function getCreatorTaxInfo(
  tenantSlug: string,
  filters: TaxFilters,
): Promise<{ rows: CreatorTaxInfo[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    const yearStart = `${filters.tax_year}-01-01`
    const yearEnd = `${filters.tax_year}-12-31`

    if (filters.w9_status) {
      paramIndex++
      conditions.push(`COALESCE(t.w9_status, 'not_submitted') = $${paramIndex}`)
      values.push(filters.w9_status)
    }

    if (filters.requires_1099 === 'true') {
      conditions.push(`COALESCE(e.total_cents, 0) >= ${THRESHOLD_1099_CENTS}`)
    } else if (filters.requires_1099 === 'false') {
      conditions.push(`COALESCE(e.total_cents, 0) < ${THRESHOLD_1099_CENTS}`)
    }

    if (filters.form_1099_status) {
      paramIndex++
      conditions.push(`COALESCE(f.status, 'not_required') = $${paramIndex}`)
      values.push(filters.form_1099_status)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        c.id,
        c.id as creator_id,
        c.first_name || ' ' || c.last_name as creator_name,
        c.email as creator_email,
        COALESCE(t.w9_status, 'not_submitted')::text as w9_status,
        t.submitted_at as w9_submitted_at,
        t.approved_at as w9_approved_at,
        t.tin_last_four,
        t.business_name,
        t.tax_classification,
        COALESCE(e.total_cents, 0)::bigint as total_earnings_ytd_cents,
        ${THRESHOLD_1099_CENTS}::bigint as threshold_cents,
        (COALESCE(e.total_cents, 0) >= ${THRESHOLD_1099_CENTS}) as requires_1099,
        COALESCE(f.status, 'not_required')::text as form_1099_status,
        f.generated_at as form_1099_generated_at,
        f.sent_at as form_1099_sent_at
      FROM creators c
      LEFT JOIN creator_w9 t ON t.creator_id = c.id
      LEFT JOIN LATERAL (
        SELECT SUM(amount_cents)::bigint as total_cents
        FROM balance_transactions
        WHERE creator_id = c.id
          AND type != 'payout'
          AND created_at >= '${yearStart}'::date
          AND created_at <= '${yearEnd}'::date
      ) e ON true
      LEFT JOIN creator_1099 f ON f.creator_id = c.id AND f.tax_year = ${filters.tax_year}
      ${whereClause}
      ORDER BY e.total_cents DESC NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count
       FROM creators c
       LEFT JOIN creator_w9 t ON t.creator_id = c.id
       LEFT JOIN LATERAL (
         SELECT SUM(amount_cents)::bigint as total_cents
         FROM balance_transactions
         WHERE creator_id = c.id
           AND type != 'payout'
           AND created_at >= '${yearStart}'::date
           AND created_at <= '${yearEnd}'::date
       ) e ON true
       LEFT JOIN creator_1099 f ON f.creator_id = c.id AND f.tax_year = ${filters.tax_year}
       ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as CreatorTaxInfo[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getTaxYearSummary(
  tenantSlug: string,
  taxYear: number,
): Promise<TaxYearSummary> {
  return withTenant(tenantSlug, async () => {
    const yearStart = `${taxYear}-01-01`
    const yearEnd = `${taxYear}-12-31`

    const result = await sql.query(
      `SELECT
        ${taxYear}::int as tax_year,
        COUNT(DISTINCT c.id)::int as total_creators,
        COUNT(DISTINCT c.id) FILTER (WHERE t.w9_status = 'approved')::int as w9_approved_count,
        COUNT(DISTINCT c.id) FILTER (WHERE t.w9_status = 'pending_review')::int as w9_pending_count,
        COUNT(DISTINCT c.id) FILTER (WHERE COALESCE(e.total_cents, 0) >= ${THRESHOLD_1099_CENTS})::int as requires_1099_count,
        COUNT(DISTINCT c.id) FILTER (WHERE f.status = 'generated' OR f.status = 'sent')::int as forms_generated_count,
        COUNT(DISTINCT c.id) FILTER (WHERE f.status = 'sent')::int as forms_sent_count,
        COALESCE(SUM(e.total_cents) FILTER (WHERE COALESCE(e.total_cents, 0) >= ${THRESHOLD_1099_CENTS}), 0)::bigint as total_reportable_cents
      FROM creators c
      LEFT JOIN creator_w9 t ON t.creator_id = c.id
      LEFT JOIN LATERAL (
        SELECT SUM(amount_cents)::bigint as total_cents
        FROM balance_transactions
        WHERE creator_id = c.id
          AND type != 'payout'
          AND created_at >= $1::date
          AND created_at <= $2::date
      ) e ON true
      LEFT JOIN creator_1099 f ON f.creator_id = c.id AND f.tax_year = ${taxYear}
      WHERE c.status = 'active'`,
      [yearStart, yearEnd],
    )

    return result.rows[0] as TaxYearSummary
  })
}

export async function updateW9Status(
  tenantSlug: string,
  creatorId: string,
  status: 'approved' | 'rejected',
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    if (status === 'approved') {
      const result = await sql`
        UPDATE creator_w9
        SET w9_status = 'approved'::w9_status, approved_at = NOW(), updated_at = NOW()
        WHERE creator_id = ${creatorId}
        RETURNING id
      `
      return (result.rowCount ?? 0) > 0
    } else {
      const result = await sql`
        UPDATE creator_w9
        SET w9_status = 'rejected'::w9_status, updated_at = NOW()
        WHERE creator_id = ${creatorId}
        RETURNING id
      `
      return (result.rowCount ?? 0) > 0
    }
  })
}

export async function generate1099(
  tenantSlug: string,
  creatorId: string,
  taxYear: number,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO creator_1099 (creator_id, tax_year, status, generated_at)
      VALUES (${creatorId}, ${taxYear}, 'generated'::form_1099_status, NOW())
      ON CONFLICT (creator_id, tax_year)
      DO UPDATE SET status = 'generated'::form_1099_status, generated_at = NOW(), updated_at = NOW()
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function mark1099Sent(
  tenantSlug: string,
  creatorId: string,
  taxYear: number,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE creator_1099
      SET status = 'sent'::form_1099_status, sent_at = NOW(), updated_at = NOW()
      WHERE creator_id = ${creatorId} AND tax_year = ${taxYear} AND status = 'generated'
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}
