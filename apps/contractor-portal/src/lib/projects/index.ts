/**
 * Contractor projects data access layer
 *
 * All operations are tenant-scoped using withTenant().
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  ContractorDashboardStats,
  ContractorProject,
  KanbanColumnId,
  ProjectDeliverable,
  ProjectStatus,
  SubmittedWork,
} from '../types'
import { canTransitionTo, KANBAN_COLUMNS } from '../types'

/**
 * Map database row to ContractorProject object
 */
function mapRowToProject(row: Record<string, unknown>): ContractorProject {
  return {
    id: row.id as string,
    contractorId: row.contractor_id as string,
    tenantId: row.tenant_id as string,
    title: row.title as string,
    description: (row.description as string) || null,
    status: row.status as ProjectStatus,
    dueDate: row.due_date ? new Date(row.due_date as string) : null,
    rateCents: row.rate_cents ? parseInt(row.rate_cents as string, 10) : null,
    rateType: (row.rate_type as 'hourly' | 'project') || null,
    deliverables: parseDeliverables(row.deliverables),
    submittedWork: parseSubmittedWork(row.submitted_work),
    revisionNotes: (row.revision_notes as string) || null,
    submittedAt: row.submitted_at ? new Date(row.submitted_at as string) : null,
    approvedAt: row.approved_at ? new Date(row.approved_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Parse deliverables from JSONB
 */
function parseDeliverables(value: unknown): ProjectDeliverable[] {
  if (!value) return []
  try {
    const arr = typeof value === 'string' ? JSON.parse(value) : value
    if (!Array.isArray(arr)) return []
    return arr.map((item: unknown) => {
      const d = item as Record<string, unknown>
      return {
        id: (d.id as string) || '',
        title: (d.title as string) || '',
        description: (d.description as string) || null,
        completed: Boolean(d.completed),
        completedAt: d.completedAt ? new Date(d.completedAt as string) : null,
      }
    })
  } catch {
    return []
  }
}

/**
 * Parse submitted work from JSONB
 */
function parseSubmittedWork(value: unknown): SubmittedWork | null {
  if (!value) return null
  try {
    const obj = typeof value === 'string' ? JSON.parse(value) : value
    if (typeof obj !== 'object' || !obj) return null
    const w = obj as Record<string, unknown>
    return {
      files: Array.isArray(w.files)
        ? (w.files as Array<Record<string, unknown>>).map((f) => ({
            url: (f.url as string) || '',
            name: (f.name as string) || '',
            type: (f.type as string) || '',
            size: (f.size as number) || 0,
          }))
        : [],
      links: Array.isArray(w.links) ? (w.links as string[]) : [],
      notes: (w.notes as string) || null,
      submittedAt: w.submittedAt ? new Date(w.submittedAt as string) : new Date(),
    }
  } catch {
    return null
  }
}

/**
 * Get all projects for a contractor
 *
 * @param contractorId - Contractor ID
 * @param tenantSlug - Tenant slug for schema access
 * @returns Array of projects
 */
export async function getContractorProjects(
  contractorId: string,
  tenantSlug: string
): Promise<ContractorProject[]> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT * FROM contractor_projects
      WHERE contractor_id = ${contractorId}
      ORDER BY
        CASE status
          WHEN 'in_progress' THEN 1
          WHEN 'revision_requested' THEN 2
          WHEN 'pending_contractor' THEN 3
          WHEN 'draft' THEN 4
          WHEN 'submitted' THEN 5
          WHEN 'approved' THEN 6
          WHEN 'payout_ready' THEN 7
          WHEN 'withdrawal_requested' THEN 8
          WHEN 'payout_approved' THEN 9
        END,
        due_date ASC NULLS LAST,
        created_at DESC
    `
  })

  return result.rows.map((row) => mapRowToProject(row as Record<string, unknown>))
}

/**
 * Get projects grouped by Kanban column
 *
 * @param contractorId - Contractor ID
 * @param tenantSlug - Tenant slug for schema access
 * @returns Map of column ID to projects
 */
export async function getProjectsByKanbanColumn(
  contractorId: string,
  tenantSlug: string
): Promise<Record<KanbanColumnId, ContractorProject[]>> {
  const projects = await getContractorProjects(contractorId, tenantSlug)

  const grouped: Record<KanbanColumnId, ContractorProject[]> = {
    upcoming: [],
    inProgress: [],
    submitted: [],
    revisions: [],
    approved: [],
    payouts: [],
  }

  for (const project of projects) {
    for (const [columnId, statuses] of Object.entries(KANBAN_COLUMNS)) {
      if ((statuses as readonly string[]).includes(project.status)) {
        grouped[columnId as KanbanColumnId].push(project)
        break
      }
    }
  }

  return grouped
}

/**
 * Get a single project by ID
 *
 * @param projectId - Project ID
 * @param contractorId - Contractor ID (for access control)
 * @param tenantSlug - Tenant slug for schema access
 * @returns Project or null
 */
export async function getProjectById(
  projectId: string,
  contractorId: string,
  tenantSlug: string
): Promise<ContractorProject | null> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT * FROM contractor_projects
      WHERE id = ${projectId}
        AND contractor_id = ${contractorId}
    `
  })

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToProject(row as Record<string, unknown>)
}

/**
 * Update project status (with validation)
 *
 * @param projectId - Project ID
 * @param contractorId - Contractor ID (for access control)
 * @param newStatus - New status to set
 * @param tenantSlug - Tenant slug for schema access
 * @returns Updated project
 * @throws Error if transition is invalid
 */
export async function updateProjectStatus(
  projectId: string,
  contractorId: string,
  newStatus: ProjectStatus,
  tenantSlug: string
): Promise<ContractorProject> {
  // Get current project
  const project = await getProjectById(projectId, contractorId, tenantSlug)
  if (!project) {
    throw new Error('Project not found')
  }

  // Validate transition
  if (!canTransitionTo(project.status, newStatus)) {
    throw new Error(
      `Cannot transition from ${project.status} to ${newStatus}`
    )
  }

  // Check contractor permissions for certain transitions
  const adminOnlyStatuses: ProjectStatus[] = [
    'approved',
    'revision_requested',
    'payout_approved',
  ]
  if (adminOnlyStatuses.includes(newStatus)) {
    throw new Error('This status can only be set by an administrator')
  }

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE contractor_projects
      SET status = ${newStatus}, updated_at = NOW()
      WHERE id = ${projectId}
        AND contractor_id = ${contractorId}
      RETURNING *
    `
  })

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to update project status')
  }

  return mapRowToProject(row as Record<string, unknown>)
}

/**
 * Submit work for a project
 *
 * @param projectId - Project ID
 * @param contractorId - Contractor ID (for access control)
 * @param work - Work submission data
 * @param tenantSlug - Tenant slug for schema access
 * @returns Updated project
 */
export async function submitProjectWork(
  projectId: string,
  contractorId: string,
  work: {
    files?: { url: string; name: string; type: string; size: number }[]
    links?: string[]
    notes?: string
  },
  tenantSlug: string
): Promise<ContractorProject> {
  // Get current project
  const project = await getProjectById(projectId, contractorId, tenantSlug)
  if (!project) {
    throw new Error('Project not found')
  }

  // Validate current status allows submission
  const allowedStatuses: ProjectStatus[] = ['in_progress', 'revision_requested']
  if (!allowedStatuses.includes(project.status)) {
    throw new Error('Project cannot be submitted in its current state')
  }

  const submittedWork: SubmittedWork = {
    files: work.files || [],
    links: work.links || [],
    notes: work.notes || null,
    submittedAt: new Date(),
  }

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE contractor_projects
      SET
        status = 'submitted',
        submitted_work = ${JSON.stringify(submittedWork)},
        submitted_at = NOW(),
        updated_at = NOW()
      WHERE id = ${projectId}
        AND contractor_id = ${contractorId}
      RETURNING *
    `
  })

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to submit work')
  }

  return mapRowToProject(row as Record<string, unknown>)
}

/**
 * Request payout for an approved project
 *
 * @param projectId - Project ID
 * @param contractorId - Contractor ID (for access control)
 * @param tenantSlug - Tenant slug for schema access
 * @returns Updated project
 */
export async function requestProjectPayout(
  projectId: string,
  contractorId: string,
  tenantSlug: string
): Promise<ContractorProject> {
  // Get current project
  const project = await getProjectById(projectId, contractorId, tenantSlug)
  if (!project) {
    throw new Error('Project not found')
  }

  if (project.status !== 'payout_ready') {
    throw new Error('Project is not ready for payout request')
  }

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE contractor_projects
      SET status = 'withdrawal_requested', updated_at = NOW()
      WHERE id = ${projectId}
        AND contractor_id = ${contractorId}
      RETURNING *
    `
  })

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to request payout')
  }

  return mapRowToProject(row as Record<string, unknown>)
}

/**
 * Get dashboard stats for a contractor
 *
 * @param contractorId - Contractor ID
 * @param tenantSlug - Tenant slug for schema access
 * @returns Dashboard statistics
 */
export async function getContractorDashboardStats(
  contractorId: string,
  tenantSlug: string
): Promise<ContractorDashboardStats> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('in_progress')) as active_count,
        COUNT(*) FILTER (WHERE status IN ('pending_contractor', 'draft')) as upcoming_count,
        COUNT(*) FILTER (WHERE status = 'submitted') as pending_review_count,
        COUNT(*) FILTER (WHERE status = 'revision_requested') as revision_count,
        COALESCE(SUM(rate_cents) FILTER (WHERE status IN ('payout_ready', 'withdrawal_requested')), 0) as pending_payout,
        COALESCE(SUM(rate_cents) FILTER (WHERE status = 'payout_approved'), 0) as total_earned
      FROM contractor_projects
      WHERE contractor_id = ${contractorId}
    `
  })

  const row = result.rows[0]
  if (!row) {
    return {
      activeProjectsCount: 0,
      upcomingProjectsCount: 0,
      pendingReviewCount: 0,
      revisionRequestedCount: 0,
      pendingPayoutCents: 0,
      totalEarnedCents: 0,
    }
  }

  const activeCount = parseInt(String(row.active_count ?? '0'), 10)
  const upcomingCount = parseInt(String(row.upcoming_count ?? '0'), 10)
  const pendingReviewCount = parseInt(String(row.pending_review_count ?? '0'), 10)
  const revisionCount = parseInt(String(row.revision_count ?? '0'), 10)
  const pendingPayout = parseInt(String(row.pending_payout ?? '0'), 10)
  const totalEarned = parseInt(String(row.total_earned ?? '0'), 10)

  return {
    activeProjectsCount: Number.isNaN(activeCount) ? 0 : activeCount,
    upcomingProjectsCount: Number.isNaN(upcomingCount) ? 0 : upcomingCount,
    pendingReviewCount: Number.isNaN(pendingReviewCount) ? 0 : pendingReviewCount,
    revisionRequestedCount: Number.isNaN(revisionCount) ? 0 : revisionCount,
    pendingPayoutCents: Number.isNaN(pendingPayout) ? 0 : pendingPayout,
    totalEarnedCents: Number.isNaN(totalEarned) ? 0 : totalEarned,
  }
}
