/**
 * Database operations for contractors
 *
 * All operations are tenant-scoped using withTenant wrapper.
 * Contractors are stored in tenant schema (unlike creators in public schema).
 */

import { sql, withTenant } from '@cgk/db'

import type {
  Contractor,
  ContractorDirectoryFilters,
  ContractorDirectoryItem,
  ContractorDirectoryResult,
  ContractorProject,
  ContractorStatus,
  ContractorWithPayee,
  CreateContractorRequest,
  CreateProjectRequest,
  PaymentMethod,
  PaymentRequest,
  PayoutSummary,
  ProjectStatus,
  UpdateContractorRequest,
  UpdateProjectRequest,
} from './types'

// ============================================================================
// Contractor Directory Queries
// ============================================================================

interface ContractorDirectoryRow {
  id: string
  name: string
  email: string
  status: ContractorStatus
  tags: string[]
  balance_available_cents: number
  balance_pending_cents: number
  active_project_count: number
  has_payment_method: boolean
  has_w9: boolean
  created_at: string
}

export async function getContractorDirectory(
  tenantSlug: string,
  filters: ContractorDirectoryFilters = {},
): Promise<ContractorDirectoryResult> {
  return withTenant(tenantSlug, async () => {
    const {
      search,
      status,
      tags,
      hasPaymentMethod,
      hasW9,
      sortBy = 'createdAt',
      sortDir = 'desc',
      page = 1,
      limit = 20,
    } = filters

    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    // Search filter
    if (search) {
      paramIndex++
      conditions.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`)
      values.push(`%${search}%`)
    }

    // Status filter (multi-select)
    if (status && status.length > 0) {
      paramIndex++
      conditions.push(`c.status = ANY($${paramIndex}::text[])`)
      values.push(status)
    }

    // Tags filter
    if (tags && tags.length > 0) {
      paramIndex++
      conditions.push(`c.tags && $${paramIndex}::text[]`)
      values.push(tags)
    }

    // Has payment method filter
    if (hasPaymentMethod !== undefined) {
      if (hasPaymentMethod) {
        conditions.push(`EXISTS (
          SELECT 1 FROM payee_payment_methods pm
          JOIN payees p ON p.id = pm.payee_id
          WHERE p.reference_id = c.id AND p.payee_type = 'contractor' AND pm.status = 'active'
        )`)
      } else {
        conditions.push(`NOT EXISTS (
          SELECT 1 FROM payee_payment_methods pm
          JOIN payees p ON p.id = pm.payee_id
          WHERE p.reference_id = c.id AND p.payee_type = 'contractor' AND pm.status = 'active'
        )`)
      }
    }

    // Has W-9 filter
    if (hasW9 !== undefined) {
      if (hasW9) {
        conditions.push(`EXISTS (
          SELECT 1 FROM payees p
          WHERE p.reference_id = c.id AND p.payee_type = 'contractor' AND p.w9_status = 'submitted'
        )`)
      } else {
        conditions.push(`NOT EXISTS (
          SELECT 1 FROM payees p
          WHERE p.reference_id = c.id AND p.payee_type = 'contractor' AND p.w9_status = 'submitted'
        )`)
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Sort mapping
    const sortColumns: Record<string, string> = {
      name: 'c.name',
      createdAt: 'c.created_at',
      balance: 'balance_available_cents',
      projectCount: 'active_project_count',
    }
    const sortCol = sortColumns[sortBy] || 'c.created_at'
    const sortDirection = sortDir === 'asc' ? 'ASC' : 'DESC'

    // Pagination
    const offset = (page - 1) * limit
    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(limit, offset)

    // Main query with aggregations
    const dataQuery = `
      SELECT
        c.id,
        c.name,
        c.email,
        c.status,
        c.tags,
        COALESCE(bal.available_cents, 0)::int AS balance_available_cents,
        COALESCE(bal.pending_cents, 0)::int AS balance_pending_cents,
        COALESCE(proj.active_count, 0)::int AS active_project_count,
        COALESCE(pm.has_method, false) AS has_payment_method,
        COALESCE(p.w9_status = 'submitted', false) AS has_w9,
        c.created_at
      FROM contractors c
      LEFT JOIN payees p ON p.reference_id = c.id AND p.payee_type = 'contractor'
      LEFT JOIN LATERAL (
        SELECT
          SUM(CASE WHEN status = 'completed' THEN amount_cents ELSE 0 END) AS available_cents,
          SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END) AS pending_cents
        FROM payee_balance_transactions
        WHERE payee_id = p.id
      ) bal ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS active_count
        FROM contractor_projects
        WHERE contractor_id = c.id AND status NOT IN ('payout_approved', 'pending_contractor')
      ) proj ON true
      LEFT JOIN LATERAL (
        SELECT EXISTS (
          SELECT 1 FROM payee_payment_methods
          WHERE payee_id = p.id AND status = 'active'
        ) AS has_method
      ) pm ON true
      ${whereClause}
      ORDER BY ${sortCol} ${sortDirection} NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `

    const dataResult = await sql.query(dataQuery, values)

    // Count query (without limit/offset)
    const countValues = values.slice(0, -2)
    const countQuery = `
      SELECT COUNT(*) AS count
      FROM contractors c
      LEFT JOIN payees p ON p.reference_id = c.id AND p.payee_type = 'contractor'
      ${whereClause}
    `
    const countResult = await sql.query(countQuery, countValues)
    const totalCount = Number(countResult.rows[0]?.count || 0)

    const contractors: ContractorDirectoryItem[] = (dataResult.rows as ContractorDirectoryRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      status: row.status,
      tags: row.tags || [],
      balanceAvailableCents: row.balance_available_cents,
      balancePendingCents: row.balance_pending_cents,
      activeProjectCount: row.active_project_count,
      hasPaymentMethod: row.has_payment_method,
      hasW9: row.has_w9,
      createdAt: new Date(row.created_at),
    }))

    return {
      contractors,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    }
  })
}

// ============================================================================
// Contractor CRUD Operations
// ============================================================================

interface ContractorRow {
  id: string
  tenant_id: string
  name: string
  email: string
  phone: string | null
  status: ContractorStatus
  tags: string[]
  notes: string | null
  contract_url: string | null
  contract_type: 'uploaded' | 'link' | null
  contract_signed_at: string | null
  created_at: string
  updated_at: string
}

function mapContractorRow(row: ContractorRow): Contractor {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    tags: row.tags || [],
    notes: row.notes,
    contractUrl: row.contract_url,
    contractType: row.contract_type,
    contractSignedAt: row.contract_signed_at ? new Date(row.contract_signed_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function getContractorById(
  tenantSlug: string,
  contractorId: string,
): Promise<Contractor | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM contractors WHERE id = ${contractorId}
    `
    if (result.rows.length === 0) return null
    return mapContractorRow(result.rows[0] as ContractorRow)
  })
}

export async function getContractorWithPayee(
  tenantSlug: string,
  contractorId: string,
): Promise<ContractorWithPayee | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        c.*,
        p.id AS payee_id,
        p.status AS payee_status,
        COALESCE(p.w9_status = 'submitted', false) AS has_w9,
        COALESCE(bal.available_cents, 0)::int AS balance_available_cents,
        COALESCE(bal.pending_cents, 0)::int AS balance_pending_cents,
        COALESCE(bal.paid_cents, 0)::int AS total_paid_cents,
        COALESCE(pm.has_method, false) AS has_payment_method,
        COALESCE(proj.active_count, 0)::int AS active_project_count
      FROM contractors c
      LEFT JOIN payees p ON p.reference_id = c.id AND p.payee_type = 'contractor'
      LEFT JOIN LATERAL (
        SELECT
          SUM(CASE WHEN status = 'completed' THEN amount_cents ELSE 0 END) AS available_cents,
          SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END) AS pending_cents,
          SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END) AS paid_cents
        FROM payee_balance_transactions
        WHERE payee_id = p.id
      ) bal ON true
      LEFT JOIN LATERAL (
        SELECT EXISTS (
          SELECT 1 FROM payee_payment_methods
          WHERE payee_id = p.id AND status = 'active'
        ) AS has_method
      ) pm ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS active_count
        FROM contractor_projects
        WHERE contractor_id = c.id AND status NOT IN ('payout_approved', 'pending_contractor')
      ) proj ON true
      WHERE c.id = ${contractorId}
    `

    if (result.rows.length === 0) return null

    const row = result.rows[0] as ContractorRow & {
      payee_id: string | null
      payee_status: string | null
      has_payment_method: boolean
      has_w9: boolean
      balance_available_cents: number
      balance_pending_cents: number
      total_paid_cents: number
      active_project_count: number
    }

    return {
      ...mapContractorRow(row),
      payeeId: row.payee_id,
      payeeStatus: row.payee_status,
      hasPaymentMethod: row.has_payment_method,
      hasW9: row.has_w9,
      balanceAvailableCents: row.balance_available_cents,
      balancePendingCents: row.balance_pending_cents,
      totalPaidCents: row.total_paid_cents,
      activeProjectCount: row.active_project_count,
    }
  })
}

export async function createContractor(
  tenantSlug: string,
  tenantId: string,
  data: CreateContractorRequest,
): Promise<Contractor> {
  return withTenant(tenantSlug, async () => {
    const result = await sql.query(
      `INSERT INTO contractors (
        tenant_id, name, email, phone, status, tags, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6::text[], $7
      )
      RETURNING *`,
      [tenantId, data.name, data.email, data.phone || null, data.status || 'pending', data.tags || [], data.notes || null],
    )
    return mapContractorRow(result.rows[0] as ContractorRow)
  })
}

export async function updateContractor(
  tenantSlug: string,
  contractorId: string,
  data: UpdateContractorRequest,
): Promise<Contractor | null> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (data.name !== undefined) {
      paramIndex++
      updates.push(`name = $${paramIndex}`)
      values.push(data.name)
    }
    if (data.email !== undefined) {
      paramIndex++
      updates.push(`email = $${paramIndex}`)
      values.push(data.email)
    }
    if (data.phone !== undefined) {
      paramIndex++
      updates.push(`phone = $${paramIndex}`)
      values.push(data.phone)
    }
    if (data.status !== undefined) {
      paramIndex++
      updates.push(`status = $${paramIndex}`)
      values.push(data.status)
    }
    if (data.tags !== undefined) {
      paramIndex++
      updates.push(`tags = $${paramIndex}`)
      values.push(data.tags)
    }
    if (data.notes !== undefined) {
      paramIndex++
      updates.push(`notes = $${paramIndex}`)
      values.push(data.notes)
    }
    if (data.contractUrl !== undefined) {
      paramIndex++
      updates.push(`contract_url = $${paramIndex}`)
      values.push(data.contractUrl)
    }
    if (data.contractType !== undefined) {
      paramIndex++
      updates.push(`contract_type = $${paramIndex}`)
      values.push(data.contractType)
    }

    if (updates.length === 0) {
      return getContractorById(tenantSlug, contractorId)
    }

    updates.push('updated_at = NOW()')
    paramIndex++
    values.push(contractorId)

    const query = `
      UPDATE contractors
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await sql.query(query, values)
    if (result.rows.length === 0) return null
    return mapContractorRow(result.rows[0] as ContractorRow)
  })
}

export async function deleteContractor(
  tenantSlug: string,
  contractorId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    // Soft delete by setting status to inactive
    const result = await sql`
      UPDATE contractors
      SET status = 'inactive', updated_at = NOW()
      WHERE id = ${contractorId}
      RETURNING id
    `
    return result.rows.length > 0
  })
}

// ============================================================================
// Contractor Projects
// ============================================================================

interface ProjectRow {
  id: string
  contractor_id: string
  tenant_id: string
  title: string
  description: string | null
  status: ProjectStatus
  due_date: string | null
  rate_cents: number | null
  deliverables: unknown
  submitted_work: unknown
  revision_notes: string | null
  submitted_at: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

function mapProjectRow(row: ProjectRow): ContractorProject {
  return {
    id: row.id,
    contractorId: row.contractor_id,
    tenantId: row.tenant_id,
    title: row.title,
    description: row.description,
    status: row.status,
    dueDate: row.due_date ? new Date(row.due_date) : null,
    rateCents: row.rate_cents,
    deliverables: (row.deliverables as ContractorProject['deliverables']) || [],
    submittedWork: row.submitted_work as ContractorProject['submittedWork'],
    revisionNotes: row.revision_notes,
    submittedAt: row.submitted_at ? new Date(row.submitted_at) : null,
    approvedAt: row.approved_at ? new Date(row.approved_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function getContractorProjects(
  tenantSlug: string,
  contractorId: string,
): Promise<ContractorProject[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM contractor_projects
      WHERE contractor_id = ${contractorId}
      ORDER BY
        CASE WHEN status IN ('submitted', 'revision_requested') THEN 0 ELSE 1 END,
        due_date ASC NULLS LAST,
        created_at DESC
    `
    return (result.rows as ProjectRow[]).map(mapProjectRow)
  })
}

export async function getProjectById(
  tenantSlug: string,
  projectId: string,
): Promise<ContractorProject | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM contractor_projects WHERE id = ${projectId}
    `
    if (result.rows.length === 0) return null
    return mapProjectRow(result.rows[0] as ProjectRow)
  })
}

export async function createProject(
  tenantSlug: string,
  tenantId: string,
  data: CreateProjectRequest,
): Promise<ContractorProject> {
  return withTenant(tenantSlug, async () => {
    const deliverables = (data.deliverables || []).map((title, idx) => ({
      id: `del_${Date.now()}_${idx}`,
      title,
      completed: false,
    }))

    const dueDateStr = data.dueDate ? data.dueDate.toISOString() : null
    const result = await sql.query(
      `INSERT INTO contractor_projects (
        contractor_id, tenant_id, title, description, due_date, rate_cents, deliverables
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::jsonb
      )
      RETURNING *`,
      [data.contractorId, tenantId, data.title, data.description || null, dueDateStr, data.rateCents || null, JSON.stringify(deliverables)],
    )
    return mapProjectRow(result.rows[0] as ProjectRow)
  })
}

export async function updateProject(
  tenantSlug: string,
  projectId: string,
  data: UpdateProjectRequest,
): Promise<ContractorProject | null> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (data.title !== undefined) {
      paramIndex++
      updates.push(`title = $${paramIndex}`)
      values.push(data.title)
    }
    if (data.description !== undefined) {
      paramIndex++
      updates.push(`description = $${paramIndex}`)
      values.push(data.description)
    }
    if (data.dueDate !== undefined) {
      paramIndex++
      updates.push(`due_date = $${paramIndex}`)
      values.push(data.dueDate)
    }
    if (data.rateCents !== undefined) {
      paramIndex++
      updates.push(`rate_cents = $${paramIndex}`)
      values.push(data.rateCents)
    }
    if (data.status !== undefined) {
      paramIndex++
      updates.push(`status = $${paramIndex}`)
      values.push(data.status)

      // Set approved_at when transitioning to approved
      if (data.status === 'approved') {
        updates.push('approved_at = NOW()')
      }
    }
    if (data.revisionNotes !== undefined) {
      paramIndex++
      updates.push(`revision_notes = $${paramIndex}`)
      values.push(data.revisionNotes)
    }

    if (updates.length === 0) {
      return getProjectById(tenantSlug, projectId)
    }

    updates.push('updated_at = NOW()')
    paramIndex++
    values.push(projectId)

    const query = `
      UPDATE contractor_projects
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await sql.query(query, values)
    if (result.rows.length === 0) return null
    return mapProjectRow(result.rows[0] as ProjectRow)
  })
}

export async function deleteProject(
  tenantSlug: string,
  projectId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM contractor_projects WHERE id = ${projectId} RETURNING id
    `
    return result.rows.length > 0
  })
}

// ============================================================================
// Payment Requests
// ============================================================================

interface PaymentRequestRow {
  id: string
  contractor_id: string
  tenant_id: string
  payee_id: string
  amount_cents: number
  approved_amount_cents: number | null
  description: string
  work_type: PaymentRequest['workType']
  project_id: string | null
  project_title: string | null
  attachments: unknown
  status: PaymentRequest['status']
  admin_notes: string | null
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

function mapPaymentRequestRow(row: PaymentRequestRow): PaymentRequest {
  return {
    id: row.id,
    contractorId: row.contractor_id,
    tenantId: row.tenant_id,
    payeeId: row.payee_id,
    amountCents: row.amount_cents,
    approvedAmountCents: row.approved_amount_cents,
    description: row.description,
    workType: row.work_type,
    projectId: row.project_id,
    projectTitle: row.project_title,
    attachments: (row.attachments as PaymentRequest['attachments']) || [],
    status: row.status,
    adminNotes: row.admin_notes,
    submittedAt: new Date(row.submitted_at),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
    reviewedBy: row.reviewed_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function getContractorPaymentRequests(
  tenantSlug: string,
  contractorId: string,
): Promise<PaymentRequest[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        pr.*,
        cp.title AS project_title
      FROM payee_payment_requests pr
      LEFT JOIN contractor_projects cp ON cp.id = pr.project_id
      WHERE pr.contractor_id = ${contractorId}
      ORDER BY
        CASE WHEN pr.status = 'pending' THEN 0 ELSE 1 END,
        pr.submitted_at DESC
    `
    return (result.rows as PaymentRequestRow[]).map(mapPaymentRequestRow)
  })
}

export async function approvePaymentRequest(
  tenantSlug: string,
  requestId: string,
  approvedAmountCents: number,
  adminNotes: string | null,
  reviewedBy: string,
): Promise<PaymentRequest | null> {
  return withTenant(tenantSlug, async () => {
    // Update request
    const result = await sql`
      UPDATE payee_payment_requests
      SET
        status = 'approved',
        approved_amount_cents = ${approvedAmountCents},
        admin_notes = ${adminNotes},
        reviewed_at = NOW(),
        reviewed_by = ${reviewedBy},
        updated_at = NOW()
      WHERE id = ${requestId}
      RETURNING *
    `

    if (result.rows.length === 0) return null
    const request = mapPaymentRequestRow(result.rows[0] as PaymentRequestRow)

    // Create balance transaction
    await sql`
      INSERT INTO payee_balance_transactions (
        payee_id, tenant_id, amount_cents, transaction_type, status, reference_id, reference_type
      ) VALUES (
        ${request.payeeId},
        ${request.tenantId},
        ${approvedAmountCents},
        'earnings',
        'completed',
        ${requestId},
        'payment_request'
      )
    `

    return request
  })
}

export async function rejectPaymentRequest(
  tenantSlug: string,
  requestId: string,
  adminNotes: string | null,
  reviewedBy: string,
): Promise<PaymentRequest | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE payee_payment_requests
      SET
        status = 'rejected',
        admin_notes = ${adminNotes},
        reviewed_at = NOW(),
        reviewed_by = ${reviewedBy},
        updated_at = NOW()
      WHERE id = ${requestId}
      RETURNING *
    `

    if (result.rows.length === 0) return null
    return mapPaymentRequestRow(result.rows[0] as PaymentRequestRow)
  })
}

// ============================================================================
// Payment Methods
// ============================================================================

interface PaymentMethodRow {
  id: string
  type: PaymentMethod['type']
  label: string
  is_default: boolean
  status: PaymentMethod['status']
  last_four: string | null
}

export async function getContractorPaymentMethods(
  tenantSlug: string,
  contractorId: string,
): Promise<PaymentMethod[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT pm.*
      FROM payee_payment_methods pm
      JOIN payees p ON p.id = pm.payee_id
      WHERE p.reference_id = ${contractorId} AND p.payee_type = 'contractor'
      ORDER BY pm.is_default DESC, pm.created_at DESC
    `
    return (result.rows as PaymentMethodRow[]).map((row) => ({
      id: row.id,
      type: row.type,
      label: row.label,
      isDefault: row.is_default,
      status: row.status,
      lastFour: row.last_four,
    }))
  })
}

// ============================================================================
// Payout Summary
// ============================================================================

export async function getContractorPayoutSummary(
  tenantSlug: string,
  contractorId: string,
): Promise<PayoutSummary> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
        COUNT(*) FILTER (WHERE status = 'processing') AS processing_count,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_count
      FROM payee_payouts po
      JOIN payees p ON p.id = po.payee_id
      WHERE p.reference_id = ${contractorId} AND p.payee_type = 'contractor'
    `

    const row = result.rows[0] as {
      pending_count: string
      processing_count: string
      failed_count: string
      completed_count: string
    }

    return {
      pendingCount: Number(row.pending_count) || 0,
      processingCount: Number(row.processing_count) || 0,
      failedCount: Number(row.failed_count) || 0,
      completedCount: Number(row.completed_count) || 0,
    }
  })
}

// ============================================================================
// Contractor Invitation
// ============================================================================

export async function createContractorInvitation(
  tenantSlug: string,
  tenantId: string,
  email: string,
  name: string | undefined,
): Promise<{ contractorId: string; inviteToken: string }> {
  return withTenant(tenantSlug, async () => {
    // Create contractor
    const contractorResult = await sql`
      INSERT INTO contractors (tenant_id, name, email, status)
      VALUES (${tenantId}, ${name || 'New Contractor'}, ${email}, 'pending')
      RETURNING id
    `
    const contractorId = (contractorResult.rows[0] as { id: string }).id

    // Create payee record
    await sql`
      INSERT INTO payees (tenant_id, payee_type, reference_id, email, name, status)
      VALUES (${tenantId}, 'contractor', ${contractorId}, ${email}, ${name || null}, 'pending')
    `

    // Generate invite token
    const inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours

    await sql.query(
      `INSERT INTO contractor_invitations (contractor_id, token, expires_at)
      VALUES ($1, $2, $3)`,
      [contractorId, inviteToken, expiresAt.toISOString()],
    )

    return { contractorId, inviteToken }
  })
}

// ============================================================================
// CSV Export
// ============================================================================

export async function getContractorsForExport(
  tenantSlug: string,
  filters: ContractorDirectoryFilters = {},
): Promise<ContractorDirectoryItem[]> {
  // Use directory query but with higher limit
  const result = await getContractorDirectory(tenantSlug, {
    ...filters,
    limit: 10000,
    page: 1,
  })
  return result.contractors
}

// ============================================================================
// Tags
// ============================================================================

export async function getAllContractorTags(tenantSlug: string): Promise<string[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT DISTINCT unnest(tags) AS tag FROM contractors ORDER BY tag
    `
    return (result.rows as { tag: string }[]).map((r) => r.tag)
  })
}
