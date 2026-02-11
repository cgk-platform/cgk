/**
 * Admin Utilities Database Access
 * Database operations for gallery, stripe top-ups, sync operations
 */

import { sql, withTenant } from '@cgk/db'

import type {
  ChangelogEntry,
  ChangelogStats,
  ChangeSource,
  LogChangeParams,
  StripeTopup,
  StripeTopupSettings,
  SyncOperation,
  SyncOperationStatus,
  SyncOperationType,
  TopupStatus,
  UGCGalleryStats,
  UGCSubmission,
  UGCSubmissionStatus,
} from './types'

// ============================================================================
// UGC Gallery Database Functions
// ============================================================================

export async function getUGCSubmissions(
  tenantSlug: string,
  options: {
    status?: UGCSubmissionStatus | 'all'
    limit?: number
    offset?: number
  } = {}
): Promise<UGCSubmission[]> {
  const { status = 'all', limit = 50, offset = 0 } = options

  return withTenant(tenantSlug, async () => {
    if (status === 'all') {
      const result = await sql`
        SELECT
          id,
          customer_name as "customerName",
          customer_email as "customerEmail",
          customer_phone as "customerPhone",
          before_image_url as "beforeImageUrl",
          after_image_url as "afterImageUrl",
          testimonial,
          products_used as "productsUsed",
          duration_days as "durationDays",
          consent_marketing as "consentMarketing",
          consent_terms as "consentTerms",
          status,
          review_notes as "reviewNotes",
          reviewed_by as "reviewedBy",
          reviewed_at as "reviewedAt",
          source,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ugc_submissions
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
      return result.rows as UGCSubmission[]
    }

    const result = await sql`
      SELECT
        id,
        customer_name as "customerName",
        customer_email as "customerEmail",
        customer_phone as "customerPhone",
        before_image_url as "beforeImageUrl",
        after_image_url as "afterImageUrl",
        testimonial,
        products_used as "productsUsed",
        duration_days as "durationDays",
        consent_marketing as "consentMarketing",
        consent_terms as "consentTerms",
        status,
        review_notes as "reviewNotes",
        reviewed_by as "reviewedBy",
        reviewed_at as "reviewedAt",
        source,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM ugc_submissions
      WHERE status = ${status}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return result.rows as UGCSubmission[]
  })
}

export async function getUGCSubmissionById(
  tenantSlug: string,
  id: string
): Promise<UGCSubmission | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        customer_name as "customerName",
        customer_email as "customerEmail",
        customer_phone as "customerPhone",
        before_image_url as "beforeImageUrl",
        after_image_url as "afterImageUrl",
        testimonial,
        products_used as "productsUsed",
        duration_days as "durationDays",
        consent_marketing as "consentMarketing",
        consent_terms as "consentTerms",
        status,
        review_notes as "reviewNotes",
        reviewed_by as "reviewedBy",
        reviewed_at as "reviewedAt",
        source,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM ugc_submissions
      WHERE id = ${id}
    `

    return (result.rows[0] as UGCSubmission) || null
  })
}

export async function getUGCGalleryStats(tenantSlug: string): Promise<UGCGalleryStats> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM ugc_submissions
    `

    const row = result.rows[0] || {}
    return {
      total: Number(row.total || 0),
      pending: Number(row.pending || 0),
      approved: Number(row.approved || 0),
      rejected: Number(row.rejected || 0),
    }
  })
}

export async function updateUGCSubmissionStatus(
  tenantSlug: string,
  id: string,
  status: UGCSubmissionStatus,
  reviewedBy: string,
  reviewNotes?: string
): Promise<UGCSubmission | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE ugc_submissions
      SET
        status = ${status},
        reviewed_by = ${reviewedBy},
        reviewed_at = NOW(),
        review_notes = ${reviewNotes || null}
      WHERE id = ${id}
      RETURNING
        id,
        customer_name as "customerName",
        customer_email as "customerEmail",
        customer_phone as "customerPhone",
        before_image_url as "beforeImageUrl",
        after_image_url as "afterImageUrl",
        testimonial,
        products_used as "productsUsed",
        duration_days as "durationDays",
        consent_marketing as "consentMarketing",
        consent_terms as "consentTerms",
        status,
        review_notes as "reviewNotes",
        reviewed_by as "reviewedBy",
        reviewed_at as "reviewedAt",
        source,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    return (result.rows[0] as UGCSubmission) || null
  })
}

export async function deleteUGCSubmission(tenantSlug: string, id: string): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM ugc_submissions WHERE id = ${id}
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function createUGCSubmission(
  tenantSlug: string,
  data: {
    customerName?: string
    customerEmail?: string
    customerPhone?: string
    beforeImageUrl: string
    afterImageUrl: string
    testimonial?: string
    productsUsed?: string[]
    durationDays?: number
    consentMarketing?: boolean
    consentTerms?: boolean
    source?: string
    ipAddress?: string
    userAgent?: string
  }
): Promise<UGCSubmission> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO ugc_submissions (
        customer_name,
        customer_email,
        customer_phone,
        before_image_url,
        after_image_url,
        testimonial,
        products_used,
        duration_days,
        consent_marketing,
        consent_terms,
        source,
        ip_address,
        user_agent
      ) VALUES (
        ${data.customerName || null},
        ${data.customerEmail || null},
        ${data.customerPhone || null},
        ${data.beforeImageUrl},
        ${data.afterImageUrl},
        ${data.testimonial || null},
        ${JSON.stringify(data.productsUsed || [])},
        ${data.durationDays || null},
        ${data.consentMarketing || false},
        ${data.consentTerms || false},
        ${data.source || 'web_form'},
        ${data.ipAddress || null},
        ${data.userAgent || null}
      )
      RETURNING
        id,
        customer_name as "customerName",
        customer_email as "customerEmail",
        customer_phone as "customerPhone",
        before_image_url as "beforeImageUrl",
        after_image_url as "afterImageUrl",
        testimonial,
        products_used as "productsUsed",
        duration_days as "durationDays",
        consent_marketing as "consentMarketing",
        consent_terms as "consentTerms",
        status,
        review_notes as "reviewNotes",
        reviewed_by as "reviewedBy",
        reviewed_at as "reviewedAt",
        source,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    return result.rows[0] as UGCSubmission
  })
}

// ============================================================================
// Stripe Top-ups Database Functions
// ============================================================================

export async function getStripeTopups(
  tenantSlug: string,
  options: {
    status?: TopupStatus | 'all'
    limit?: number
    offset?: number
  } = {}
): Promise<StripeTopup[]> {
  const { status = 'all', limit = 50, offset = 0 } = options

  return withTenant(tenantSlug, async () => {
    if (status === 'all') {
      const result = await sql`
        SELECT
          id,
          stripe_topup_id as "stripeTopupId",
          stripe_source_id as "stripeSourceId",
          amount_cents as "amountCents",
          currency,
          status,
          failure_code as "failureCode",
          failure_message as "failureMessage",
          expected_available_at as "expectedAvailableAt",
          completed_at as "completedAt",
          linked_withdrawal_ids as "linkedWithdrawalIds",
          statement_descriptor as "statementDescriptor",
          description,
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM stripe_topups
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
      return result.rows as StripeTopup[]
    }

    const result = await sql`
      SELECT
        id,
        stripe_topup_id as "stripeTopupId",
        stripe_source_id as "stripeSourceId",
        amount_cents as "amountCents",
        currency,
        status,
        failure_code as "failureCode",
        failure_message as "failureMessage",
        expected_available_at as "expectedAvailableAt",
        completed_at as "completedAt",
        linked_withdrawal_ids as "linkedWithdrawalIds",
        statement_descriptor as "statementDescriptor",
        description,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM stripe_topups
      WHERE status = ${status}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return result.rows as StripeTopup[]
  })
}

export async function getTopupStats(
  tenantSlug: string
): Promise<{ pending: number; succeeded: number; failed: number; canceled: number }> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'succeeded') as succeeded,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'canceled') as canceled
      FROM stripe_topups
    `

    const row = result.rows[0] || {}
    return {
      pending: Number(row.pending || 0),
      succeeded: Number(row.succeeded || 0),
      failed: Number(row.failed || 0),
      canceled: Number(row.canceled || 0),
    }
  })
}

export async function createStripeTopup(
  tenantSlug: string,
  data: {
    stripeTopupId: string
    stripeSourceId?: string
    amountCents: number
    currency?: string
    status: TopupStatus
    expectedAvailableAt?: string
    statementDescriptor?: string
    description?: string
    createdBy?: string
    linkedWithdrawalIds?: string[]
  }
): Promise<StripeTopup> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO stripe_topups (
        stripe_topup_id,
        stripe_source_id,
        amount_cents,
        currency,
        status,
        expected_available_at,
        statement_descriptor,
        description,
        created_by,
        linked_withdrawal_ids
      ) VALUES (
        ${data.stripeTopupId},
        ${data.stripeSourceId || null},
        ${data.amountCents},
        ${data.currency || 'usd'},
        ${data.status},
        ${data.expectedAvailableAt || null},
        ${data.statementDescriptor || null},
        ${data.description || null},
        ${data.createdBy || null},
        ${JSON.stringify(data.linkedWithdrawalIds || [])}
      )
      RETURNING
        id,
        stripe_topup_id as "stripeTopupId",
        stripe_source_id as "stripeSourceId",
        amount_cents as "amountCents",
        currency,
        status,
        failure_code as "failureCode",
        failure_message as "failureMessage",
        expected_available_at as "expectedAvailableAt",
        completed_at as "completedAt",
        linked_withdrawal_ids as "linkedWithdrawalIds",
        statement_descriptor as "statementDescriptor",
        description,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    return result.rows[0] as StripeTopup
  })
}

export async function getStripeTopupSettings(
  tenantSlug: string
): Promise<StripeTopupSettings | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        default_source_id as "defaultSourceId",
        default_source_last4 as "defaultSourceLast4",
        default_source_bank_name as "defaultSourceBankName",
        auto_topup_enabled as "autoTopupEnabled",
        auto_topup_threshold_cents as "autoTopupThresholdCents",
        auto_topup_amount_cents as "autoTopupAmountCents",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM stripe_topup_settings
      LIMIT 1
    `

    return (result.rows[0] as StripeTopupSettings) || null
  })
}

export async function upsertStripeTopupSettings(
  tenantSlug: string,
  data: Partial<Omit<StripeTopupSettings, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<StripeTopupSettings> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO stripe_topup_settings (
        default_source_id,
        default_source_last4,
        default_source_bank_name,
        auto_topup_enabled,
        auto_topup_threshold_cents,
        auto_topup_amount_cents
      ) VALUES (
        ${data.defaultSourceId || null},
        ${data.defaultSourceLast4 || null},
        ${data.defaultSourceBankName || null},
        ${data.autoTopupEnabled || false},
        ${data.autoTopupThresholdCents || null},
        ${data.autoTopupAmountCents || null}
      )
      ON CONFLICT (id) DO UPDATE SET
        default_source_id = EXCLUDED.default_source_id,
        default_source_last4 = EXCLUDED.default_source_last4,
        default_source_bank_name = EXCLUDED.default_source_bank_name,
        auto_topup_enabled = EXCLUDED.auto_topup_enabled,
        auto_topup_threshold_cents = EXCLUDED.auto_topup_threshold_cents,
        auto_topup_amount_cents = EXCLUDED.auto_topup_amount_cents
      RETURNING
        id,
        default_source_id as "defaultSourceId",
        default_source_last4 as "defaultSourceLast4",
        default_source_bank_name as "defaultSourceBankName",
        auto_topup_enabled as "autoTopupEnabled",
        auto_topup_threshold_cents as "autoTopupThresholdCents",
        auto_topup_amount_cents as "autoTopupAmountCents",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    return result.rows[0] as StripeTopupSettings
  })
}

// ============================================================================
// Sync Operations Database Functions
// ============================================================================

export async function getSyncOperations(
  tenantSlug: string,
  options: {
    operationType?: SyncOperationType
    limit?: number
  } = {}
): Promise<SyncOperation[]> {
  const { operationType, limit = 20 } = options

  return withTenant(tenantSlug, async () => {
    if (operationType) {
      const result = await sql`
        SELECT
          id,
          operation_type as "operationType",
          status,
          preview_data as "previewData",
          result_data as "resultData",
          error_message as "errorMessage",
          started_at as "startedAt",
          completed_at as "completedAt",
          run_by as "runBy",
          created_at as "createdAt"
        FROM sync_operations
        WHERE operation_type = ${operationType}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
      return result.rows as SyncOperation[]
    }

    const result = await sql`
      SELECT
        id,
        operation_type as "operationType",
        status,
        preview_data as "previewData",
        result_data as "resultData",
        error_message as "errorMessage",
        started_at as "startedAt",
        completed_at as "completedAt",
        run_by as "runBy",
        created_at as "createdAt"
      FROM sync_operations
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return result.rows as SyncOperation[]
  })
}

export async function createSyncOperation(
  tenantSlug: string,
  data: {
    operationType: SyncOperationType
    status: SyncOperationStatus
    previewData?: Record<string, unknown>
    runBy?: string
  }
): Promise<SyncOperation> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO sync_operations (
        operation_type,
        status,
        preview_data,
        started_at,
        run_by
      ) VALUES (
        ${data.operationType},
        ${data.status},
        ${JSON.stringify(data.previewData || {})},
        NOW(),
        ${data.runBy || null}
      )
      RETURNING
        id,
        operation_type as "operationType",
        status,
        preview_data as "previewData",
        result_data as "resultData",
        error_message as "errorMessage",
        started_at as "startedAt",
        completed_at as "completedAt",
        run_by as "runBy",
        created_at as "createdAt"
    `

    return result.rows[0] as SyncOperation
  })
}

export async function updateSyncOperation(
  tenantSlug: string,
  id: string,
  data: {
    status: SyncOperationStatus
    resultData?: Record<string, unknown>
    errorMessage?: string
  }
): Promise<SyncOperation | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE sync_operations
      SET
        status = ${data.status},
        result_data = ${data.resultData ? JSON.stringify(data.resultData) : null},
        error_message = ${data.errorMessage || null},
        completed_at = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        operation_type as "operationType",
        status,
        preview_data as "previewData",
        result_data as "resultData",
        error_message as "errorMessage",
        started_at as "startedAt",
        completed_at as "completedAt",
        run_by as "runBy",
        created_at as "createdAt"
    `

    return (result.rows[0] as SyncOperation) || null
  })
}

// ============================================================================
// Changelog Functions (Redis-based, simulated with in-memory for now)
// ============================================================================

// In-memory store for changelog (would be Redis in production)
const changelogStore = new Map<string, ChangelogEntry[]>()

export async function logChange(
  tenantSlug: string,
  params: LogChangeParams
): Promise<ChangelogEntry> {
  const entry: ChangelogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...params,
  }

  const tenantLog = changelogStore.get(tenantSlug) || []
  tenantLog.unshift(entry)
  // Keep last 1000 entries
  if (tenantLog.length > 1000) {
    tenantLog.pop()
  }
  changelogStore.set(tenantSlug, tenantLog)

  return entry
}

export async function getChangelog(
  tenantSlug: string,
  options: {
    source?: ChangeSource
    limit?: number
    offset?: number
  } = {}
): Promise<ChangelogEntry[]> {
  const { source, limit = 50, offset = 0 } = options

  let entries = changelogStore.get(tenantSlug) || []

  if (source) {
    entries = entries.filter((e) => e.source === source)
  }

  return entries.slice(offset, offset + limit)
}

export async function getChangelogStats(tenantSlug: string): Promise<ChangelogStats> {
  const entries = changelogStore.get(tenantSlug) || []

  const bySource: Record<ChangeSource, number> = {
    admin: 0,
    api: 0,
    webhook: 0,
    job: 0,
    system: 0,
    user: 0,
  }

  const dayMap = new Map<string, number>()

  for (const entry of entries) {
    bySource[entry.source]++
    const day = entry.timestamp.split('T')[0] ?? 'unknown'
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
  }

  const byDay = Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)

  return { bySource, byDay }
}
