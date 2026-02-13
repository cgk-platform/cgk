/**
 * Tax Database Operations
 *
 * CRUD operations for tax compliance tables.
 * All operations use withTenant for tenant isolation.
 *
 * @ai-pattern tenant-isolation
 * @ai-required Use withTenant for all queries
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  Address,
  FormStatus,
  FormType,
  PayeeType,
  TaxAction,
  TaxForm,
  TaxFormAuditLog,
  TaxPayee,
  TaxReminder,
  W9ComplianceTracking,
} from './types.js'

// ============================================================================
// Tax Payee Operations (W-9 Data)
// ============================================================================

export async function getTaxPayee(
  tenantSlug: string,
  payeeId: string,
  payeeType: PayeeType
): Promise<TaxPayee | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        payee_id,
        payee_type,
        legal_name,
        business_name,
        tax_classification,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        tin_encrypted,
        tin_last_four,
        tin_type,
        w9_certified_at,
        w9_certified_name,
        w9_certified_ip,
        e_delivery_consent,
        e_delivery_consent_at,
        created_at,
        updated_at
      FROM tax_payees
      WHERE payee_id = ${payeeId}
        AND payee_type = ${payeeType}
    `

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0] as Record<string, unknown>
    return mapRowToTaxPayee(row)
  })
}

export async function getTaxPayeeById(
  tenantSlug: string,
  id: string
): Promise<TaxPayee | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT *
      FROM tax_payees
      WHERE id = ${id}
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapRowToTaxPayee(result.rows[0] as Record<string, unknown>)
  })
}

export async function upsertTaxPayee(
  tenantSlug: string,
  payee: Omit<TaxPayee, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TaxPayee> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO tax_payees (
        payee_id,
        payee_type,
        legal_name,
        business_name,
        tax_classification,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        tin_encrypted,
        tin_last_four,
        tin_type,
        w9_certified_at,
        w9_certified_name,
        w9_certified_ip,
        e_delivery_consent,
        e_delivery_consent_at
      ) VALUES (
        ${payee.payeeId},
        ${payee.payeeType},
        ${payee.legalName},
        ${payee.businessName || null},
        ${payee.taxClassification},
        ${payee.address.line1},
        ${payee.address.line2 || null},
        ${payee.address.city},
        ${payee.address.state},
        ${payee.address.postalCode},
        ${payee.address.country},
        ${payee.tinEncrypted},
        ${payee.tinLastFour},
        ${payee.tinType},
        ${payee.w9CertifiedAt.toISOString()},
        ${payee.w9CertifiedName},
        ${payee.w9CertifiedIp || null},
        ${payee.eDeliveryConsent},
        ${payee.eDeliveryConsentAt?.toISOString() || null}
      )
      ON CONFLICT (payee_id, payee_type)
      DO UPDATE SET
        legal_name = EXCLUDED.legal_name,
        business_name = EXCLUDED.business_name,
        tax_classification = EXCLUDED.tax_classification,
        address_line1 = EXCLUDED.address_line1,
        address_line2 = EXCLUDED.address_line2,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country,
        tin_encrypted = EXCLUDED.tin_encrypted,
        tin_last_four = EXCLUDED.tin_last_four,
        tin_type = EXCLUDED.tin_type,
        w9_certified_at = EXCLUDED.w9_certified_at,
        w9_certified_name = EXCLUDED.w9_certified_name,
        w9_certified_ip = EXCLUDED.w9_certified_ip,
        e_delivery_consent = EXCLUDED.e_delivery_consent,
        e_delivery_consent_at = EXCLUDED.e_delivery_consent_at,
        updated_at = NOW()
      RETURNING *
    `

    return mapRowToTaxPayee(result.rows[0] as Record<string, unknown>)
  })
}

export async function listTaxPayees(
  tenantSlug: string,
  options: {
    payeeType?: PayeeType
    hasW9?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<{ payees: TaxPayee[]; total: number }> {
  const { payeeType, hasW9, limit = 50, offset = 0 } = options

  return withTenant(tenantSlug, async () => {
    let query = `
      SELECT *, COUNT(*) OVER() as total_count
      FROM tax_payees
      WHERE 1=1
    `
    const params: unknown[] = []
    let paramIndex = 1

    if (payeeType) {
      query += ` AND payee_type = $${paramIndex++}`
      params.push(payeeType)
    }

    if (hasW9 !== undefined) {
      if (hasW9) {
        query += ` AND w9_certified_at IS NOT NULL`
      } else {
        query += ` AND w9_certified_at IS NULL`
      }
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    // Use raw query for dynamic params
    const result = await sql.query(query, params)

    const total = result.rows.length > 0 ? Number((result.rows[0] as Record<string, unknown>).total_count) : 0
    const payees = result.rows.map((row) => mapRowToTaxPayee(row as Record<string, unknown>))

    return { payees, total }
  })
}

// ============================================================================
// Tax Form Operations
// ============================================================================

export async function getTaxFormById(
  tenantSlug: string,
  formId: string
): Promise<TaxForm | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT *
      FROM tax_forms
      WHERE id = ${formId}
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapRowToTaxForm(result.rows[0] as Record<string, unknown>)
  })
}

export async function getTaxForm(
  tenantSlug: string,
  payeeId: string,
  payeeType: PayeeType,
  taxYear: number,
  formType?: FormType
): Promise<TaxForm | null> {
  return withTenant(tenantSlug, async () => {
    let query = `
      SELECT *
      FROM tax_forms
      WHERE payee_id = $1
        AND payee_type = $2
        AND tax_year = $3
        AND status != 'voided'
    `
    const params: unknown[] = [payeeId, payeeType, taxYear]

    if (formType) {
      query += ` AND form_type = $4`
      params.push(formType)
    }

    query += ` ORDER BY created_at DESC LIMIT 1`

    const result = await sql.query(query, params)

    if (result.rows.length === 0) {
      return null
    }

    return mapRowToTaxForm(result.rows[0] as Record<string, unknown>)
  })
}

export async function insertTaxForm(
  tenantSlug: string,
  form: TaxForm
): Promise<TaxForm> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO tax_forms (
        id,
        payee_id,
        payee_type,
        tax_year,
        form_type,
        payer_tin,
        payer_name,
        payer_address,
        recipient_tin_last_four,
        recipient_name,
        recipient_address,
        total_amount_cents,
        box_amounts,
        status,
        created_by,
        original_form_id,
        correction_type
      ) VALUES (
        ${form.id},
        ${form.payeeId},
        ${form.payeeType},
        ${form.taxYear},
        ${form.formType},
        ${form.payerTin},
        ${form.payerName},
        ${JSON.stringify(form.payerAddress)},
        ${form.recipientTinLastFour},
        ${form.recipientName},
        ${JSON.stringify(form.recipientAddress)},
        ${form.totalAmountCents},
        ${JSON.stringify(form.boxAmounts)},
        ${form.status},
        ${form.createdBy},
        ${form.originalFormId || null},
        ${form.correctionType || null}
      )
      RETURNING *
    `

    return mapRowToTaxForm(result.rows[0] as Record<string, unknown>)
  })
}

export async function updateTaxFormStatus(
  tenantSlug: string,
  formId: string,
  status: FormStatus,
  updates: Partial<{
    approvedAt: Date
    approvedBy: string
    irsFiledAt: Date
    irsConfirmationNumber: string
    stateFiledAt: Date
    stateConfirmationNumber: string
    deliveryMethod: string
    deliveredAt: Date
    deliveryConfirmedAt: Date
    mailLetterId: string
    mailStatus: string
  }> = {}
): Promise<TaxForm | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE tax_forms
      SET
        status = ${status},
        approved_at = COALESCE(${updates.approvedAt?.toISOString() || null}, approved_at),
        approved_by = COALESCE(${updates.approvedBy || null}, approved_by),
        irs_filed_at = COALESCE(${updates.irsFiledAt?.toISOString() || null}, irs_filed_at),
        irs_confirmation_number = COALESCE(${updates.irsConfirmationNumber || null}, irs_confirmation_number),
        state_filed_at = COALESCE(${updates.stateFiledAt?.toISOString() || null}, state_filed_at),
        state_confirmation_number = COALESCE(${updates.stateConfirmationNumber || null}, state_confirmation_number),
        delivery_method = COALESCE(${updates.deliveryMethod || null}, delivery_method),
        delivered_at = COALESCE(${updates.deliveredAt?.toISOString() || null}, delivered_at),
        delivery_confirmed_at = COALESCE(${updates.deliveryConfirmedAt?.toISOString() || null}, delivery_confirmed_at),
        mail_letter_id = COALESCE(${updates.mailLetterId || null}, mail_letter_id),
        mail_status = COALESCE(${updates.mailStatus || null}, mail_status)
      WHERE id = ${formId}
      RETURNING *
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapRowToTaxForm(result.rows[0] as Record<string, unknown>)
  })
}

export async function listTaxForms(
  tenantSlug: string,
  options: {
    taxYear?: number
    payeeType?: PayeeType
    status?: FormStatus
    formType?: FormType
    limit?: number
    offset?: number
  } = {}
): Promise<{ forms: TaxForm[]; total: number }> {
  const { taxYear, payeeType, status, formType, limit = 50, offset = 0 } = options

  return withTenant(tenantSlug, async () => {
    let query = `
      SELECT *, COUNT(*) OVER() as total_count
      FROM tax_forms
      WHERE 1=1
    `
    const params: unknown[] = []
    let paramIndex = 1

    if (taxYear) {
      query += ` AND tax_year = $${paramIndex++}`
      params.push(taxYear)
    }

    if (payeeType) {
      query += ` AND payee_type = $${paramIndex++}`
      params.push(payeeType)
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`
      params.push(status)
    }

    if (formType) {
      query += ` AND form_type = $${paramIndex++}`
      params.push(formType)
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const result = await sql.query(query, params)

    const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0
    const forms = result.rows.map(mapRowToTaxForm)

    return { forms, total }
  })
}

export async function getApprovedForms(
  tenantSlug: string,
  taxYear: number,
  payeeType?: PayeeType
): Promise<TaxForm[]> {
  return withTenant(tenantSlug, async () => {
    let query = `
      SELECT *
      FROM tax_forms
      WHERE tax_year = $1 AND status = 'approved'
    `
    const params: unknown[] = [taxYear]

    if (payeeType) {
      query += ` AND payee_type = $2`
      params.push(payeeType)
    }

    query += ` ORDER BY recipient_name ASC`

    const result = await sql.query(query, params)
    return result.rows.map(mapRowToTaxForm)
  })
}

// ============================================================================
// Audit Log Operations
// ============================================================================

export async function logTaxAction(
  tenantSlug: string,
  action: TaxAction,
  taxFormId: string | null,
  payeeId: string,
  payeeType: PayeeType,
  performedBy: string,
  options: {
    changes?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
    notes?: string
  } = {}
): Promise<TaxFormAuditLog> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO tax_form_audit_log (
        tax_form_id,
        payee_id,
        payee_type,
        action,
        performed_by,
        changes,
        ip_address,
        user_agent,
        notes
      ) VALUES (
        ${taxFormId},
        ${payeeId},
        ${payeeType},
        ${action},
        ${performedBy},
        ${options.changes ? JSON.stringify(options.changes) : null},
        ${options.ipAddress || null},
        ${options.userAgent || null},
        ${options.notes || null}
      )
      RETURNING *
    `

    return mapRowToAuditLog(result.rows[0] as Record<string, unknown>)
  })
}

export async function getAuditLog(
  tenantSlug: string,
  options: {
    taxFormId?: string
    payeeId?: string
    payeeType?: PayeeType
    action?: TaxAction
    limit?: number
    offset?: number
  } = {}
): Promise<TaxFormAuditLog[]> {
  const { taxFormId, payeeId, payeeType, action, limit = 100, offset = 0 } = options

  return withTenant(tenantSlug, async () => {
    let query = `
      SELECT *
      FROM tax_form_audit_log
      WHERE 1=1
    `
    const params: unknown[] = []
    let paramIndex = 1

    if (taxFormId) {
      query += ` AND tax_form_id = $${paramIndex++}`
      params.push(taxFormId)
    }

    if (payeeId) {
      query += ` AND payee_id = $${paramIndex++}`
      params.push(payeeId)
    }

    if (payeeType) {
      query += ` AND payee_type = $${paramIndex++}`
      params.push(payeeType)
    }

    if (action) {
      query += ` AND action = $${paramIndex++}`
      params.push(action)
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const result = await sql.query(query, params)
    return result.rows.map(mapRowToAuditLog)
  })
}

// ============================================================================
// W-9 Compliance Tracking
// ============================================================================

export async function getW9Tracking(
  tenantSlug: string,
  payeeId: string,
  payeeType: PayeeType
): Promise<W9ComplianceTracking | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT *
      FROM w9_compliance_tracking
      WHERE payee_id = ${payeeId}
        AND payee_type = ${payeeType}
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapRowToW9Tracking(result.rows[0] as Record<string, unknown>)
  })
}

export async function upsertW9Tracking(
  tenantSlug: string,
  payeeId: string,
  payeeType: PayeeType,
  updates: Partial<{
    initialSentAt: Date
    reminder1SentAt: Date
    reminder2SentAt: Date
    finalNoticeSentAt: Date
    completedAt: Date
    flaggedAt: Date
  }>
): Promise<W9ComplianceTracking> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO w9_compliance_tracking (
        payee_id,
        payee_type,
        initial_sent_at,
        reminder_1_sent_at,
        reminder_2_sent_at,
        final_notice_sent_at,
        completed_at,
        flagged_at
      ) VALUES (
        ${payeeId},
        ${payeeType},
        ${updates.initialSentAt?.toISOString() || null},
        ${updates.reminder1SentAt?.toISOString() || null},
        ${updates.reminder2SentAt?.toISOString() || null},
        ${updates.finalNoticeSentAt?.toISOString() || null},
        ${updates.completedAt?.toISOString() || null},
        ${updates.flaggedAt?.toISOString() || null}
      )
      ON CONFLICT (payee_id, payee_type)
      DO UPDATE SET
        initial_sent_at = COALESCE(EXCLUDED.initial_sent_at, w9_compliance_tracking.initial_sent_at),
        reminder_1_sent_at = COALESCE(EXCLUDED.reminder_1_sent_at, w9_compliance_tracking.reminder_1_sent_at),
        reminder_2_sent_at = COALESCE(EXCLUDED.reminder_2_sent_at, w9_compliance_tracking.reminder_2_sent_at),
        final_notice_sent_at = COALESCE(EXCLUDED.final_notice_sent_at, w9_compliance_tracking.final_notice_sent_at),
        completed_at = COALESCE(EXCLUDED.completed_at, w9_compliance_tracking.completed_at),
        flagged_at = COALESCE(EXCLUDED.flagged_at, w9_compliance_tracking.flagged_at),
        updated_at = NOW()
      RETURNING *
    `

    return mapRowToW9Tracking(result.rows[0] as Record<string, unknown>)
  })
}

export async function getPendingW9Reminders(
  tenantSlug: string,
  payeeType: PayeeType
): Promise<W9ComplianceTracking[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT *
      FROM w9_compliance_tracking
      WHERE payee_type = ${payeeType}
        AND completed_at IS NULL
        AND flagged_at IS NULL
      ORDER BY created_at ASC
    `

    return result.rows.map(mapRowToW9Tracking)
  })
}

// ============================================================================
// Tax Reminders
// ============================================================================

export async function getTaxReminders(
  tenantSlug: string,
  options: {
    status?: 'pending' | 'completed' | 'dismissed'
    category?: string
    upcomingDays?: number
  } = {}
): Promise<TaxReminder[]> {
  const { status, category, upcomingDays } = options

  return withTenant(tenantSlug, async () => {
    let query = `
      SELECT *
      FROM tax_reminders
      WHERE 1=1
    `
    const params: unknown[] = []
    let paramIndex = 1

    if (status) {
      query += ` AND status = $${paramIndex++}`
      params.push(status)
    }

    if (category) {
      query += ` AND category = $${paramIndex++}`
      params.push(category)
    }

    if (upcomingDays) {
      query += ` AND due_date <= (CURRENT_DATE + INTERVAL '${upcomingDays} days')`
    }

    query += ` ORDER BY due_date ASC`

    const result = await sql.query(query, params)
    return result.rows.map(mapRowToTaxReminder)
  })
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapRowToTaxPayee(row: Record<string, unknown>): TaxPayee {
  return {
    id: String(row.id),
    payeeId: String(row.payee_id),
    payeeType: row.payee_type as PayeeType,
    legalName: String(row.legal_name),
    businessName: row.business_name ? String(row.business_name) : undefined,
    taxClassification: row.tax_classification as TaxPayee['taxClassification'],
    address: {
      line1: String(row.address_line1),
      line2: row.address_line2 ? String(row.address_line2) : undefined,
      city: String(row.city),
      state: String(row.state),
      postalCode: String(row.postal_code),
      country: String(row.country),
    },
    tinEncrypted: String(row.tin_encrypted),
    tinLastFour: String(row.tin_last_four),
    tinType: row.tin_type as 'ssn' | 'ein',
    w9CertifiedAt: new Date(row.w9_certified_at as string),
    w9CertifiedName: String(row.w9_certified_name),
    w9CertifiedIp: row.w9_certified_ip ? String(row.w9_certified_ip) : undefined,
    eDeliveryConsent: Boolean(row.e_delivery_consent),
    eDeliveryConsentAt: row.e_delivery_consent_at
      ? new Date(row.e_delivery_consent_at as string)
      : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

function mapRowToTaxForm(row: Record<string, unknown>): TaxForm {
  return {
    id: String(row.id),
    payeeId: String(row.payee_id),
    payeeType: row.payee_type as PayeeType,
    taxYear: Number(row.tax_year),
    formType: row.form_type as FormType,
    payerTin: String(row.payer_tin),
    payerName: String(row.payer_name),
    payerAddress: row.payer_address as Address,
    recipientTinLastFour: String(row.recipient_tin_last_four),
    recipientName: String(row.recipient_name),
    recipientAddress: row.recipient_address as Address,
    totalAmountCents: Number(row.total_amount_cents),
    boxAmounts: (row.box_amounts || {}) as Record<string, number>,
    status: row.status as FormStatus,
    createdAt: new Date(row.created_at as string),
    createdBy: String(row.created_by),
    approvedAt: row.approved_at ? new Date(row.approved_at as string) : undefined,
    approvedBy: row.approved_by ? String(row.approved_by) : undefined,
    irsFiledAt: row.irs_filed_at ? new Date(row.irs_filed_at as string) : undefined,
    irsConfirmationNumber: row.irs_confirmation_number
      ? String(row.irs_confirmation_number)
      : undefined,
    stateFiledAt: row.state_filed_at ? new Date(row.state_filed_at as string) : undefined,
    stateConfirmationNumber: row.state_confirmation_number
      ? String(row.state_confirmation_number)
      : undefined,
    deliveryMethod: row.delivery_method as TaxForm['deliveryMethod'],
    deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : undefined,
    deliveryConfirmedAt: row.delivery_confirmed_at
      ? new Date(row.delivery_confirmed_at as string)
      : undefined,
    mailLetterId: row.mail_letter_id ? String(row.mail_letter_id) : undefined,
    mailStatus: row.mail_status ? String(row.mail_status) : undefined,
    originalFormId: row.original_form_id ? String(row.original_form_id) : undefined,
    correctionType: row.correction_type as TaxForm['correctionType'],
  }
}

function mapRowToAuditLog(row: Record<string, unknown>): TaxFormAuditLog {
  return {
    id: String(row.id),
    taxFormId: row.tax_form_id ? String(row.tax_form_id) : undefined,
    payeeId: String(row.payee_id),
    payeeType: row.payee_type as PayeeType,
    action: row.action as TaxAction,
    performedBy: String(row.performed_by),
    changes: row.changes as Record<string, unknown> | undefined,
    ipAddress: row.ip_address ? String(row.ip_address) : undefined,
    userAgent: row.user_agent ? String(row.user_agent) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: new Date(row.created_at as string),
  }
}

function mapRowToW9Tracking(row: Record<string, unknown>): W9ComplianceTracking {
  return {
    id: String(row.id),
    payeeId: String(row.payee_id),
    payeeType: row.payee_type as PayeeType,
    initialSentAt: row.initial_sent_at ? new Date(row.initial_sent_at as string) : undefined,
    reminder1SentAt: row.reminder_1_sent_at
      ? new Date(row.reminder_1_sent_at as string)
      : undefined,
    reminder2SentAt: row.reminder_2_sent_at
      ? new Date(row.reminder_2_sent_at as string)
      : undefined,
    finalNoticeSentAt: row.final_notice_sent_at
      ? new Date(row.final_notice_sent_at as string)
      : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
    flaggedAt: row.flagged_at ? new Date(row.flagged_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

function mapRowToTaxReminder(row: Record<string, unknown>): TaxReminder {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : undefined,
    dueDate: new Date(row.due_date as string),
    priority: row.priority as 'low' | 'medium' | 'high',
    category: row.category ? String(row.category) : undefined,
    recurring: Boolean(row.recurring),
    recurrenceRule: row.recurrence_rule ? String(row.recurrence_rule) : undefined,
    status: row.status as 'pending' | 'completed' | 'dismissed',
    dismissedAt: row.dismissed_at ? new Date(row.dismissed_at as string) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
  }
}
