/**
 * Subscription Validation Service
 *
 * Provides data validation tools for subscription data integrity.
 * All operations are tenant-scoped using withTenant().
 */

import { withTenant, sql } from '@cgk-platform/db'

import type { ValidationRun, ValidationIssue, ValidationSeverity } from './types'

/**
 * Run a full validation check
 */
export async function runValidation(
  tenantSlug: string,
  userId?: string
): Promise<ValidationRun> {
  return withTenant(tenantSlug, async () => {
    // Create validation run record
    const runResult = await sql`
      INSERT INTO subscription_validations (run_by, run_type, status)
      VALUES (${userId || null}, 'manual', 'running')
      RETURNING id
    `
    const validationRow = runResult.rows[0]
    if (!validationRow) {
      throw new Error('Failed to create validation run')
    }
    const validationId = validationRow.id as string

    const issues: ValidationIssue[] = []
    let totalChecked = 0

    // Check 1: Orphaned subscriptions (no customer reference)
    const orphanedResult = await sql`
      SELECT s.id, s.customer_id
      FROM subscriptions s
      LEFT JOIN customers c ON c.id = s.customer_id
      WHERE c.id IS NULL
    `
    totalChecked += orphanedResult.rows.length
    for (const row of orphanedResult.rows) {
      issues.push(await createIssue(
        validationId,
        row.id as string,
        'orphaned_subscription',
        'error',
        `Subscription references non-existent customer: ${row.customer_id}`,
        'Link to valid customer or archive subscription'
      ))
    }

    // Check 2: Missing product references
    const missingProductResult = await sql`
      SELECT s.id, s.product_id
      FROM subscriptions s
      LEFT JOIN products p ON p.id = s.product_id
      WHERE p.id IS NULL AND s.status = 'active'
    `
    totalChecked += missingProductResult.rows.length
    for (const row of missingProductResult.rows) {
      issues.push(await createIssue(
        validationId,
        row.id as string,
        'missing_product',
        'error',
        `Active subscription references non-existent product: ${row.product_id}`,
        'Update product reference or cancel subscription'
      ))
    }

    // Check 3: Active subscriptions with no next billing date
    const noBillingDateResult = await sql`
      SELECT id
      FROM subscriptions
      WHERE status = 'active' AND next_billing_date IS NULL
    `
    totalChecked += noBillingDateResult.rows.length
    for (const row of noBillingDateResult.rows) {
      issues.push(await createIssue(
        validationId,
        row.id as string,
        'missing_billing_date',
        'error',
        'Active subscription has no next billing date',
        'Calculate and set next billing date based on frequency'
      ))
    }

    // Check 4: Cancelled subscriptions with pending orders
    const cancelledWithOrdersResult = await sql`
      SELECT s.id, COUNT(so.id) as pending_orders
      FROM subscriptions s
      INNER JOIN subscription_orders so ON so.subscription_id = s.id
      WHERE s.status = 'cancelled' AND so.status = 'scheduled'
      GROUP BY s.id
    `
    totalChecked += cancelledWithOrdersResult.rows.length
    for (const row of cancelledWithOrdersResult.rows) {
      issues.push(await createIssue(
        validationId,
        row.id as string,
        'cancelled_with_pending_orders',
        'warning',
        `Cancelled subscription has ${row.pending_orders} pending orders`,
        'Cancel or skip pending orders'
      ))
    }

    // Check 5: Paused beyond max duration
    const pausedTooLongResult = await sql`
      SELECT s.id, s.paused_at, ss.max_pause_days
      FROM subscriptions s
      CROSS JOIN subscription_settings ss
      WHERE s.status = 'paused'
        AND s.paused_at IS NOT NULL
        AND s.paused_at < NOW() - (ss.max_pause_days || ' days')::interval
    `
    totalChecked += pausedTooLongResult.rows.length
    for (const row of pausedTooLongResult.rows) {
      issues.push(await createIssue(
        validationId,
        row.id as string,
        'paused_too_long',
        'warning',
        `Subscription paused beyond max duration (${row.max_pause_days} days)`,
        'Resume or cancel subscription'
      ))
    }

    // Check 6: Payment method expiring soon
    const expiringPaymentResult = await sql`
      SELECT id, payment_method_exp_month, payment_method_exp_year
      FROM subscriptions
      WHERE status = 'active'
        AND payment_method_exp_year IS NOT NULL
        AND payment_method_exp_month IS NOT NULL
        AND (
          payment_method_exp_year < EXTRACT(YEAR FROM NOW())
          OR (
            payment_method_exp_year = EXTRACT(YEAR FROM NOW())
            AND payment_method_exp_month <= EXTRACT(MONTH FROM NOW()) + 1
          )
        )
    `
    totalChecked += expiringPaymentResult.rows.length
    for (const row of expiringPaymentResult.rows) {
      issues.push(await createIssue(
        validationId,
        row.id as string,
        'payment_expiring',
        'warning',
        `Payment method expires ${row.payment_method_exp_month}/${row.payment_method_exp_year}`,
        'Send payment update reminder to customer'
      ))
    }

    // Check 7: Duplicate subscriptions (same customer + product + active)
    const duplicateResult = await sql`
      SELECT customer_id, product_id, COUNT(*) as count, array_agg(id) as subscription_ids
      FROM subscriptions
      WHERE status = 'active'
      GROUP BY customer_id, product_id
      HAVING COUNT(*) > 1
    `
    for (const row of duplicateResult.rows) {
      const ids = row.subscription_ids as string[]
      for (const id of ids) {
        issues.push(await createIssue(
          validationId,
          id,
          'duplicate_subscription',
          'warning',
          `Customer has ${row.count} active subscriptions for same product`,
          'Merge or cancel duplicate subscriptions'
        ))
      }
    }

    // Check 8: Sync errors
    const syncErrorResult = await sql`
      SELECT id, sync_error
      FROM subscriptions
      WHERE sync_error IS NOT NULL
    `
    totalChecked += syncErrorResult.rows.length
    for (const row of syncErrorResult.rows) {
      issues.push(await createIssue(
        validationId,
        row.id as string,
        'sync_error',
        'error',
        `Sync error: ${row.sync_error}`,
        'Retry sync or investigate provider issue'
      ))
    }

    // Check 9: Invalid frequencies
    const invalidFrequencyResult = await sql`
      SELECT id, frequency, frequency_interval
      FROM subscriptions
      WHERE frequency_interval < 1 OR frequency_interval > 12
    `
    totalChecked += invalidFrequencyResult.rows.length
    for (const row of invalidFrequencyResult.rows) {
      issues.push(await createIssue(
        validationId,
        row.id as string,
        'invalid_frequency',
        'error',
        `Invalid frequency interval: ${row.frequency_interval}`,
        'Set frequency interval to valid range (1-12)'
      ))
    }

    // Check 10: Negative amounts
    const negativeAmountResult = await sql`
      SELECT id, price_cents, discount_cents
      FROM subscriptions
      WHERE price_cents < 0 OR discount_cents < 0 OR discount_cents > price_cents
    `
    totalChecked += negativeAmountResult.rows.length
    for (const row of negativeAmountResult.rows) {
      issues.push(await createIssue(
        validationId,
        row.id as string,
        'invalid_amount',
        'error',
        `Invalid pricing: price=${row.price_cents}, discount=${row.discount_cents}`,
        'Correct pricing values'
      ))
    }

    // Update validation run with results
    await sql`
      UPDATE subscription_validations
      SET
        status = 'completed',
        total_checked = ${totalChecked},
        issues_found = ${issues.length},
        results = ${JSON.stringify(issues)}
      WHERE id = ${validationId}
    `

    return {
      id: validationId,
      runAt: new Date().toISOString(),
      runBy: userId || null,
      runType: 'manual',
      totalChecked,
      issuesFound: issues.length,
      issuesFixed: 0,
      results: issues,
      status: 'completed',
      createdAt: new Date().toISOString(),
    }
  })
}

/**
 * Create a validation issue record
 */
async function createIssue(
  validationId: string,
  subscriptionId: string | null,
  issueType: string,
  severity: ValidationSeverity,
  description: string,
  suggestedFix: string
): Promise<ValidationIssue> {
  const result = await sql`
    INSERT INTO subscription_validation_issues (
      validation_id, subscription_id, issue_type, severity, description, suggested_fix
    )
    VALUES (
      ${validationId}, ${subscriptionId}, ${issueType},
      ${severity}::validation_severity, ${description}, ${suggestedFix}
    )
    RETURNING *
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create validation issue')
  }
  return {
    id: row.id as string,
    validationId: row.validation_id as string,
    subscriptionId: row.subscription_id as string | null,
    issueType: row.issue_type as string,
    severity: row.severity as ValidationSeverity,
    description: row.description as string,
    suggestedFix: row.suggested_fix as string | null,
    isFixed: row.is_fixed as boolean,
    fixedAt: row.fixed_at as string | null,
    fixedBy: row.fixed_by as string | null,
    createdAt: row.created_at as string,
  }
}

/**
 * Get validation run history
 */
export async function getValidationHistory(
  tenantSlug: string,
  limit: number = 20
): Promise<ValidationRun[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM subscription_validations
      ORDER BY run_at DESC
      LIMIT ${limit}
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      runAt: row.run_at as string,
      runBy: row.run_by as string | null,
      runType: row.run_type as 'manual' | 'scheduled',
      totalChecked: row.total_checked as number,
      issuesFound: row.issues_found as number,
      issuesFixed: row.issues_fixed as number,
      results: (row.results as ValidationIssue[]) || [],
      status: row.status as 'running' | 'completed' | 'failed',
      createdAt: row.created_at as string,
    }))
  })
}

/**
 * Get validation issues for a run
 */
export async function getValidationIssues(
  tenantSlug: string,
  validationId: string
): Promise<ValidationIssue[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM subscription_validation_issues
      WHERE validation_id = ${validationId}
      ORDER BY
        CASE severity WHEN 'error' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
        created_at DESC
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      validationId: row.validation_id as string,
      subscriptionId: row.subscription_id as string | null,
      issueType: row.issue_type as string,
      severity: row.severity as ValidationSeverity,
      description: row.description as string,
      suggestedFix: row.suggested_fix as string | null,
      isFixed: row.is_fixed as boolean,
      fixedAt: row.fixed_at as string | null,
      fixedBy: row.fixed_by as string | null,
      createdAt: row.created_at as string,
    }))
  })
}

/**
 * Get open issues (not yet fixed)
 */
export async function getOpenIssues(
  tenantSlug: string
): Promise<ValidationIssue[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM subscription_validation_issues
      WHERE is_fixed = false
      ORDER BY
        CASE severity WHEN 'error' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
        created_at DESC
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      validationId: row.validation_id as string,
      subscriptionId: row.subscription_id as string | null,
      issueType: row.issue_type as string,
      severity: row.severity as ValidationSeverity,
      description: row.description as string,
      suggestedFix: row.suggested_fix as string | null,
      isFixed: row.is_fixed as boolean,
      fixedAt: row.fixed_at as string | null,
      fixedBy: row.fixed_by as string | null,
      createdAt: row.created_at as string,
    }))
  })
}

/**
 * Mark an issue as fixed
 */
export async function markIssueFixed(
  tenantSlug: string,
  issueId: string,
  userId?: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    // Mark issue as fixed
    await sql`
      UPDATE subscription_validation_issues
      SET is_fixed = true, fixed_at = NOW(), fixed_by = ${userId || null}
      WHERE id = ${issueId}
    `

    // Update validation run fixed count
    await sql`
      UPDATE subscription_validations
      SET issues_fixed = issues_fixed + 1
      WHERE id = (
        SELECT validation_id FROM subscription_validation_issues WHERE id = ${issueId}
      )
    `
  })
}

/**
 * Auto-fix issues where possible
 */
export async function autoFixIssues(
  tenantSlug: string,
  issueIds: string[],
  userId?: string
): Promise<{ fixed: number; failed: number; errors: string[] }> {
  const errors: string[] = []
  let fixed = 0
  let failed = 0

  await withTenant(tenantSlug, async () => {
    for (const issueId of issueIds) {
      // Get issue details
      const issueResult = await sql`
        SELECT * FROM subscription_validation_issues WHERE id = ${issueId}
      `
      if (issueResult.rows.length === 0) {
        errors.push(`Issue ${issueId} not found`)
        failed++
        continue
      }

      const issue = issueResult.rows[0]
      if (!issue) {
        errors.push(`Issue ${issueId} not found`)
        failed++
        continue
      }
      const subscriptionId = issue.subscription_id as string | null
      const issueType = issue.issue_type as string

      try {
        switch (issueType) {
          case 'missing_billing_date':
            // Calculate next billing date based on frequency
            if (subscriptionId) {
              await sql`
                UPDATE subscriptions
                SET next_billing_date = NOW() + (
                  CASE frequency
                    WHEN 'weekly' THEN '7 days'::interval * frequency_interval
                    WHEN 'biweekly' THEN '14 days'::interval * frequency_interval
                    WHEN 'monthly' THEN '1 month'::interval * frequency_interval
                    WHEN 'bimonthly' THEN '2 months'::interval * frequency_interval
                    WHEN 'quarterly' THEN '3 months'::interval * frequency_interval
                    WHEN 'semiannually' THEN '6 months'::interval * frequency_interval
                    WHEN 'annually' THEN '1 year'::interval * frequency_interval
                    ELSE '1 month'::interval
                  END
                )
                WHERE id = ${subscriptionId}
              `
              await markIssueFixed(tenantSlug, issueId, userId)
              fixed++
            }
            break

          case 'cancelled_with_pending_orders':
            // Cancel all pending orders for cancelled subscription
            if (subscriptionId) {
              await sql`
                UPDATE subscription_orders
                SET status = 'skipped'
                WHERE subscription_id = ${subscriptionId} AND status = 'scheduled'
              `
              await markIssueFixed(tenantSlug, issueId, userId)
              fixed++
            }
            break

          case 'paused_too_long':
            // Cancel subscription that's been paused too long
            if (subscriptionId) {
              await sql`
                UPDATE subscriptions
                SET status = 'cancelled'::subscription_status,
                    cancel_reason = 'Auto-cancelled: paused beyond maximum duration',
                    cancelled_at = NOW()
                WHERE id = ${subscriptionId}
              `
              await markIssueFixed(tenantSlug, issueId, userId)
              fixed++
            }
            break

          default:
            errors.push(`Issue type ${issueType} cannot be auto-fixed`)
            failed++
        }
      } catch (error) {
        errors.push(`Failed to fix issue ${issueId}: ${error}`)
        failed++
      }
    }
  })

  return { fixed, failed, errors }
}

/**
 * Get validation summary
 */
export async function getValidationSummary(
  tenantSlug: string
): Promise<{
  lastRunAt: string | null
  openIssues: number
  errorCount: number
  warningCount: number
  infoCount: number
}> {
  return withTenant(tenantSlug, async () => {
    const lastRunResult = await sql`
      SELECT run_at FROM subscription_validations
      ORDER BY run_at DESC
      LIMIT 1
    `

    const issueCountsResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE severity = 'error') as error_count,
        COUNT(*) FILTER (WHERE severity = 'warning') as warning_count,
        COUNT(*) FILTER (WHERE severity = 'info') as info_count,
        COUNT(*) as total
      FROM subscription_validation_issues
      WHERE is_fixed = false
    `

    const counts = issueCountsResult.rows[0] || {}

    return {
      lastRunAt: lastRunResult.rows[0]?.run_at as string | null,
      openIssues: Number(counts.total || 0),
      errorCount: Number(counts.error_count || 0),
      warningCount: Number(counts.warning_count || 0),
      infoCount: Number(counts.info_count || 0),
    }
  })
}
