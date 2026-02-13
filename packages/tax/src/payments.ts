/**
 * Payment Aggregation for Tax Reporting
 *
 * Calculates annual payments for 1099 threshold tracking.
 *
 * @ai-pattern tax-compliance
 * @ai-required Payments must be aggregated per payee type
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  PayeePaymentSummary,
  PayeeType,
  PaymentSourceConfig,
  TaxYearStats,
} from './types.js'
import { THRESHOLD_CENTS } from './types.js'

/**
 * Payment source configuration per payee type
 */
export const PAYMENT_SOURCES: Record<PayeeType, PaymentSourceConfig> = {
  creator: {
    table: 'creator_balance_transactions',
    payeeIdColumn: 'creator_id',
    amountColumn: 'amount_cents',
    dateColumn: 'created_at',
    taxableTypes: ['commission_available', 'project_payment', 'bonus', 'adjustment'],
  },
  contractor: {
    table: 'contractor_payments',
    payeeIdColumn: 'contractor_id',
    amountColumn: 'amount_cents',
    dateColumn: 'paid_at',
    taxableTypes: ['payment'],
  },
  merchant: {
    table: 'merchant_transactions',
    payeeIdColumn: 'merchant_id',
    amountColumn: 'amount_cents',
    dateColumn: 'transaction_date',
    taxableTypes: ['sale'],
  },
  vendor: {
    table: 'vendor_payments',
    payeeIdColumn: 'vendor_id',
    amountColumn: 'amount_cents',
    dateColumn: 'paid_at',
    taxableTypes: ['payment'],
  },
}

/**
 * Get annual payments for a specific payee
 */
export async function getAnnualPayments(
  tenantSlug: string,
  payeeId: string,
  payeeType: PayeeType,
  taxYear: number
): Promise<number> {
  const config = PAYMENT_SOURCES[payeeType]

  return withTenant(tenantSlug, async () => {
    // Dynamic query based on payee type config
    const query = `
      SELECT COALESCE(SUM(${config.amountColumn}), 0) as total
      FROM ${config.table}
      WHERE ${config.payeeIdColumn} = $1
        AND type = ANY($2)
        AND EXTRACT(YEAR FROM ${config.dateColumn}) = $3
    `

    const result = await sql.query(query, [payeeId, config.taxableTypes, taxYear])
    return parseInt(result.rows[0]?.total || '0', 10)
  })
}

/**
 * Get monthly payment breakdown for a payee
 */
export async function getMonthlyPayments(
  tenantSlug: string,
  payeeId: string,
  payeeType: PayeeType,
  taxYear: number
): Promise<Record<number, number>> {
  const config = PAYMENT_SOURCES[payeeType]

  return withTenant(tenantSlug, async () => {
    const query = `
      SELECT
        EXTRACT(MONTH FROM ${config.dateColumn})::integer as month,
        COALESCE(SUM(${config.amountColumn}), 0) as total
      FROM ${config.table}
      WHERE ${config.payeeIdColumn} = $1
        AND type = ANY($2)
        AND EXTRACT(YEAR FROM ${config.dateColumn}) = $3
      GROUP BY EXTRACT(MONTH FROM ${config.dateColumn})
      ORDER BY month
    `

    const result = await sql.query(query, [payeeId, config.taxableTypes, taxYear])

    const monthlyTotals: Record<number, number> = {}
    for (const row of result.rows) {
      monthlyTotals[row.month] = parseInt(row.total, 10)
    }

    return monthlyTotals
  })
}

/**
 * Get all payees requiring 1099 (above threshold)
 */
export async function getPayeesRequiring1099(
  tenantSlug: string,
  payeeType: PayeeType,
  taxYear: number
): Promise<Array<{ payeeId: string; totalCents: number }>> {
  const config = PAYMENT_SOURCES[payeeType]

  return withTenant(tenantSlug, async () => {
    const query = `
      SELECT
        ${config.payeeIdColumn} as payee_id,
        SUM(${config.amountColumn}) as total
      FROM ${config.table}
      WHERE type = ANY($1)
        AND EXTRACT(YEAR FROM ${config.dateColumn}) = $2
      GROUP BY ${config.payeeIdColumn}
      HAVING SUM(${config.amountColumn}) >= $3
      ORDER BY total DESC
    `

    const result = await sql.query(query, [config.taxableTypes, taxYear, THRESHOLD_CENTS])

    return result.rows.map((r: Record<string, unknown>) => ({
      payeeId: String(r.payee_id),
      totalCents: parseInt(String(r.total), 10),
    }))
  })
}

/**
 * Get payees approaching threshold (50-99% of $600)
 */
export async function getPayeesApproachingThreshold(
  tenantSlug: string,
  payeeType: PayeeType,
  taxYear: number,
  minPercent: number = 50
): Promise<Array<PayeePaymentSummary>> {
  const minCents = Math.floor(THRESHOLD_CENTS * (minPercent / 100))
  const config = PAYMENT_SOURCES[payeeType]

  return withTenant(tenantSlug, async () => {
    const query = `
      SELECT
        p.${config.payeeIdColumn} as payee_id,
        SUM(p.${config.amountColumn}) as total,
        CASE WHEN tp.id IS NOT NULL THEN true ELSE false END as has_w9
      FROM ${config.table} p
      LEFT JOIN tax_payees tp ON tp.payee_id = p.${config.payeeIdColumn}
        AND tp.payee_type = $4
      WHERE p.type = ANY($1)
        AND EXTRACT(YEAR FROM p.${config.dateColumn}) = $2
      GROUP BY p.${config.payeeIdColumn}, tp.id
      HAVING SUM(p.${config.amountColumn}) BETWEEN $3 AND $5
      ORDER BY total DESC
    `

    const result = await sql.query(query, [
      config.taxableTypes,
      taxYear,
      minCents,
      payeeType,
      THRESHOLD_CENTS - 1,
    ])

    return result.rows.map((r: Record<string, unknown>) => {
      const total = parseInt(String(r.total), 10)
      return {
        payeeId: String(r.payee_id),
        payeeType,
        totalCents: total,
        percentOfThreshold: Math.round((total / THRESHOLD_CENTS) * 100),
        hasW9: Boolean(r.has_w9),
      }
    })
  })
}

/**
 * Get payees missing W-9 who have payments
 */
export async function getPayeesMissingW9(
  tenantSlug: string,
  payeeType: PayeeType,
  taxYear: number
): Promise<Array<{ payeeId: string; totalCents: number }>> {
  const config = PAYMENT_SOURCES[payeeType]

  return withTenant(tenantSlug, async () => {
    const query = `
      SELECT
        p.${config.payeeIdColumn} as payee_id,
        SUM(p.${config.amountColumn}) as total
      FROM ${config.table} p
      LEFT JOIN tax_payees tp ON tp.payee_id = p.${config.payeeIdColumn}
        AND tp.payee_type = $3
      WHERE p.type = ANY($1)
        AND EXTRACT(YEAR FROM p.${config.dateColumn}) = $2
        AND tp.id IS NULL
      GROUP BY p.${config.payeeIdColumn}
      ORDER BY total DESC
    `

    const result = await sql.query(query, [config.taxableTypes, taxYear, payeeType])

    return result.rows.map((r: Record<string, unknown>) => ({
      payeeId: String(r.payee_id),
      totalCents: parseInt(String(r.total), 10),
    }))
  })
}

/**
 * Get tax year statistics for dashboard
 */
export async function getTaxYearStats(
  tenantSlug: string,
  taxYear: number,
  payeeType?: PayeeType
): Promise<TaxYearStats> {
  const payeeTypes: PayeeType[] = payeeType ? [payeeType] : ['creator', 'contractor', 'vendor']

  let totalPayees = 0
  let w9ApprovedCount = 0
  let w9PendingCount = 0
  let w9MissingCount = 0
  let requires1099Count = 0
  let approachingThresholdCount = 0
  let totalReportableCents = 0

  for (const type of payeeTypes) {
    // Get payees requiring 1099
    const requiring = await getPayeesRequiring1099(tenantSlug, type, taxYear)
    requires1099Count += requiring.length
    totalReportableCents += requiring.reduce((sum, p) => sum + p.totalCents, 0)

    // Get payees approaching threshold
    const approaching = await getPayeesApproachingThreshold(tenantSlug, type, taxYear)
    approachingThresholdCount += approaching.length

    // Get payees missing W-9
    const missingW9 = await getPayeesMissingW9(tenantSlug, type, taxYear)
    w9MissingCount += missingW9.length

    // Total payees with payments
    totalPayees += requiring.length + approaching.length

    // Count W-9 status from payees with payments
    const payeesWithW9 = requiring.filter(
      (p) => !missingW9.find((m) => m.payeeId === p.payeeId)
    )
    w9ApprovedCount += payeesWithW9.length
  }

  // Get form counts
  const formStats = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status != 'voided') as total,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'filed') as filed,
        COUNT(*) FILTER (WHERE delivered_at IS NOT NULL) as delivered
      FROM tax_forms
      WHERE tax_year = ${taxYear}
    `
    return result.rows[0] || {}
  })

  return {
    taxYear,
    totalPayees,
    w9ApprovedCount,
    w9PendingCount,
    w9MissingCount,
    requires1099Count,
    approachingThresholdCount,
    formsGeneratedCount: Number(formStats.total || 0),
    formsApprovedCount: Number(formStats.approved || 0),
    formsFiledCount: Number(formStats.filed || 0),
    formsDeliveredCount: Number(formStats.delivered || 0),
    totalReportableCents,
  }
}

/**
 * Get all payees with their payment summaries
 */
export async function getAllPayeeSummaries(
  tenantSlug: string,
  payeeType: PayeeType,
  taxYear: number,
  options: {
    limit?: number
    offset?: number
    sortBy?: 'total' | 'payeeId'
    sortOrder?: 'asc' | 'desc'
  } = {}
): Promise<{ summaries: PayeePaymentSummary[]; total: number }> {
  const { limit = 50, offset = 0, sortBy = 'total', sortOrder = 'desc' } = options
  const config = PAYMENT_SOURCES[payeeType]

  return withTenant(tenantSlug, async () => {
    const sortColumn = sortBy === 'total' ? 'total' : `p.${config.payeeIdColumn}`
    const query = `
      WITH payee_totals AS (
        SELECT
          p.${config.payeeIdColumn} as payee_id,
          SUM(p.${config.amountColumn}) as total
        FROM ${config.table} p
        WHERE p.type = ANY($1)
          AND EXTRACT(YEAR FROM p.${config.dateColumn}) = $2
        GROUP BY p.${config.payeeIdColumn}
      )
      SELECT
        pt.payee_id,
        pt.total,
        CASE WHEN tp.id IS NOT NULL THEN true ELSE false END as has_w9,
        tp.w9_certified_at IS NOT NULL as w9_approved,
        tf.status as form_status,
        COUNT(*) OVER() as total_count
      FROM payee_totals pt
      LEFT JOIN tax_payees tp ON tp.payee_id = pt.payee_id
        AND tp.payee_type = $3
      LEFT JOIN tax_forms tf ON tf.payee_id = pt.payee_id
        AND tf.payee_type = $3
        AND tf.tax_year = $2
        AND tf.status != 'voided'
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $4 OFFSET $5
    `

    const result = await sql.query(query, [
      config.taxableTypes,
      taxYear,
      payeeType,
      limit,
      offset,
    ])

    const totalCount = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0

    const summaries: PayeePaymentSummary[] = result.rows.map((r: Record<string, unknown>) => {
      const total = parseInt(String(r.total), 10)
      return {
        payeeId: String(r.payee_id),
        payeeType,
        totalCents: total,
        percentOfThreshold: Math.round((total / THRESHOLD_CENTS) * 100),
        hasW9: Boolean(r.has_w9),
        w9Status: r.w9_approved ? 'approved' : r.has_w9 ? 'pending_review' : 'not_submitted',
        formStatus: r.form_status as PayeePaymentSummary['formStatus'],
      }
    })

    return { summaries, total: totalCount }
  })
}

/**
 * Export annual payments to CSV format
 */
export async function exportAnnualPaymentsCSV(
  tenantSlug: string,
  payeeType: PayeeType,
  taxYear: number
): Promise<string> {
  const { summaries } = await getAllPayeeSummaries(tenantSlug, payeeType, taxYear, {
    limit: 10000, // High limit for export
    sortBy: 'total',
    sortOrder: 'desc',
  })

  const headers = ['Payee ID', 'Total Amount', 'Requires 1099', 'Has W-9', 'W-9 Status', 'Form Status']
  const rows = summaries.map((s) => [
    s.payeeId,
    (s.totalCents / 100).toFixed(2),
    s.totalCents >= THRESHOLD_CENTS ? 'Yes' : 'No',
    s.hasW9 ? 'Yes' : 'No',
    s.w9Status || 'N/A',
    s.formStatus || 'N/A',
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}
