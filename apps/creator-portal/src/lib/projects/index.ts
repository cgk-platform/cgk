/**
 * Creator Project Management Library
 *
 * Handles project CRUD operations, status workflow, and file management
 * for creator deliverables. All operations use tenant isolation.
 */

import { sql, withTenant } from '@cgk/db'
import { sendJob } from '@cgk/jobs'
import { nanoid } from 'nanoid'

import type {
  Project,
  ProjectFile,
  ProjectListOptions,
  ProjectRevision,
  ProjectStatus,
  CreateProjectInput,
  UpdateProjectInput,
  SubmitProjectInput,
} from './types'

export type * from './types'

/**
 * Map database row to Project object
 */
function mapRowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    creatorId: row.creator_id as string,
    brandId: row.brand_id as string,
    brandName: row.brand_name as string | undefined,
    brandSlug: row.brand_slug as string | undefined,
    title: row.title as string,
    description: (row.description as string) || null,
    brief: (row.brief as string) || null,
    status: row.status as ProjectStatus,
    dueDate: row.due_date ? new Date(row.due_date as string) : null,
    paymentCents: parseInt(row.payment_cents as string, 10) || 0,
    revisionCount: parseInt(row.revision_count as string, 10) || 0,
    maxRevisions: parseInt(row.max_revisions as string, 10) || 3,
    feedback: (row.feedback as string) || null,
    feedbackAt: row.feedback_at ? new Date(row.feedback_at as string) : null,
    submittedAt: row.submitted_at ? new Date(row.submitted_at as string) : null,
    approvedAt: row.approved_at ? new Date(row.approved_at as string) : null,
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    createdBy: row.created_by as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    fileCount: row.file_count !== undefined ? parseInt(row.file_count as string, 10) : undefined,
  }
}

/**
 * Map database row to ProjectFile object
 */
function mapRowToFile(row: Record<string, unknown>): ProjectFile {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    creatorId: row.creator_id as string,
    name: row.name as string,
    originalName: row.original_name as string,
    url: row.url as string,
    sizeBytes: parseInt(row.size_bytes as string, 10),
    contentType: row.content_type as string,
    isDeliverable: row.is_deliverable as boolean,
    version: parseInt(row.version as string, 10) || 1,
    notes: (row.notes as string) || null,
    uploadedAt: new Date(row.uploaded_at as string),
  }
}

/**
 * Map database row to ProjectRevision object
 */
function mapRowToRevision(row: Record<string, unknown>): ProjectRevision {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    revisionNumber: parseInt(row.revision_number as string, 10),
    status: row.status as ProjectRevision['status'],
    requestNotes: (row.request_notes as string) || null,
    responseNotes: (row.response_notes as string) || null,
    requestedBy: row.requested_by as string,
    requestedAt: new Date(row.requested_at as string),
    submittedAt: row.submitted_at ? new Date(row.submitted_at as string) : null,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : null,
    resolvedBy: (row.resolved_by as string) || null,
  }
}

/**
 * Get projects for a creator with optional filters
 */
export async function getProjects(
  tenantSlug: string,
  creatorId: string,
  options: ProjectListOptions = {}
): Promise<{ projects: Project[]; total: number }> {
  const {
    status,
    brandId,
    search,
    limit = 50,
    offset = 0,
  } = options

  return withTenant(tenantSlug, async () => {
    // Simple queries without dynamic SQL - filter in JS when needed
    let result

    if (status && !Array.isArray(status)) {
      // Single status filter
      if (brandId) {
        result = await sql`
          SELECT
            cp.*,
            o.name as brand_name,
            o.slug as brand_slug,
            (SELECT COUNT(*) FROM project_files pf WHERE pf.project_id = cp.id) as file_count
          FROM creator_projects cp
          LEFT JOIN organizations o ON o.id = cp.brand_id
          WHERE cp.creator_id = ${creatorId}
            AND cp.status = ${status}
            AND cp.brand_id = ${brandId}
          ORDER BY cp.created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      } else {
        result = await sql`
          SELECT
            cp.*,
            o.name as brand_name,
            o.slug as brand_slug,
            (SELECT COUNT(*) FROM project_files pf WHERE pf.project_id = cp.id) as file_count
          FROM creator_projects cp
          LEFT JOIN organizations o ON o.id = cp.brand_id
          WHERE cp.creator_id = ${creatorId}
            AND cp.status = ${status}
          ORDER BY cp.created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      }
    } else if (brandId) {
      // Brand filter only
      result = await sql`
        SELECT
          cp.*,
          o.name as brand_name,
          o.slug as brand_slug,
          (SELECT COUNT(*) FROM project_files pf WHERE pf.project_id = cp.id) as file_count
        FROM creator_projects cp
        LEFT JOIN organizations o ON o.id = cp.brand_id
        WHERE cp.creator_id = ${creatorId}
          AND cp.brand_id = ${brandId}
        ORDER BY cp.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    } else {
      // No filters
      result = await sql`
        SELECT
          cp.*,
          o.name as brand_name,
          o.slug as brand_slug,
          (SELECT COUNT(*) FROM project_files pf WHERE pf.project_id = cp.id) as file_count
        FROM creator_projects cp
        LEFT JOIN organizations o ON o.id = cp.brand_id
        WHERE cp.creator_id = ${creatorId}
        ORDER BY cp.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    }

    let projects = result.rows.map((row) => mapRowToProject(row as Record<string, unknown>))

    // Apply search filter in JS if needed
    if (search) {
      const searchLower = search.toLowerCase()
      projects = projects.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          (p.description?.toLowerCase().includes(searchLower) ?? false)
      )
    }

    // Apply array status filter in JS if needed
    if (Array.isArray(status)) {
      projects = projects.filter((p) => status.includes(p.status))
    }

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM creator_projects
      WHERE creator_id = ${creatorId}
    `
    const total = parseInt(countResult.rows[0]?.total as string, 10) || 0

    return { projects, total }
  })
}

/**
 * Get a single project by ID with files and revisions
 */
export async function getProject(
  tenantSlug: string,
  projectId: string,
  creatorId: string
): Promise<Project | null> {
  return withTenant(tenantSlug, async () => {
    // Get project
    const projectResult = await sql`
      SELECT
        cp.*,
        o.name as brand_name,
        o.slug as brand_slug
      FROM creator_projects cp
      LEFT JOIN organizations o ON o.id = cp.brand_id
      WHERE cp.id = ${projectId} AND cp.creator_id = ${creatorId}
    `

    const projectRow = projectResult.rows[0]
    if (!projectRow) {
      return null
    }

    const project = mapRowToProject(projectRow as Record<string, unknown>)

    // Get files
    const filesResult = await sql`
      SELECT * FROM project_files
      WHERE project_id = ${projectId}
      ORDER BY uploaded_at DESC
    `
    project.files = filesResult.rows.map((row) => mapRowToFile(row as Record<string, unknown>))
    project.fileCount = project.files.length

    // Get revisions
    const revisionsResult = await sql`
      SELECT * FROM project_revisions
      WHERE project_id = ${projectId}
      ORDER BY revision_number ASC
    `
    project.revisions = revisionsResult.rows.map((row) =>
      mapRowToRevision(row as Record<string, unknown>)
    )

    return project
  })
}

/**
 * Create a new project (typically called by admin/brand)
 */
export async function createProject(
  tenantSlug: string,
  creatorId: string,
  input: CreateProjectInput,
  createdBy: string
): Promise<Project> {
  const id = `proj_${nanoid(16)}`

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO creator_projects (
        id, creator_id, brand_id, title, description, brief,
        due_date, payment_cents, max_revisions, status, created_by
      ) VALUES (
        ${id},
        ${creatorId},
        ${input.brandId},
        ${input.title},
        ${input.description || null},
        ${input.brief || null},
        ${input.dueDate?.toISOString().split('T')[0] || null},
        ${input.paymentCents || 0},
        ${input.maxRevisions || 3},
        'draft',
        ${createdBy}
      )
      RETURNING *
    `

    const project = mapRowToProject(result.rows[0] as Record<string, unknown>)

    // Send job event
    await sendJob('project.created', {
      tenantId: tenantSlug,
      projectId: id,
      creatorId,
      type: 'content',
    })

    return project
  })
}

/**
 * Update project details (draft status only for creators)
 */
export async function updateProject(
  tenantSlug: string,
  projectId: string,
  creatorId: string,
  input: UpdateProjectInput
): Promise<Project> {
  return withTenant(tenantSlug, async () => {
    // Verify ownership and draft status for creator edits
    const existing = await sql`
      SELECT status FROM creator_projects
      WHERE id = ${projectId} AND creator_id = ${creatorId}
    `

    if (!existing.rows[0]) {
      throw new Error('Project not found')
    }

    const currentStatus = existing.rows[0].status as string
    if (currentStatus !== 'draft' && currentStatus !== 'revision_requested') {
      throw new Error('Cannot edit project in current status')
    }

    const result = await sql`
      UPDATE creator_projects
      SET
        title = COALESCE(${input.title || null}, title),
        description = COALESCE(${input.description || null}, description),
        brief = COALESCE(${input.brief || null}, brief),
        due_date = COALESCE(${input.dueDate?.toISOString().split('T')[0] || null}, due_date),
        payment_cents = COALESCE(${input.paymentCents ?? null}, payment_cents),
        max_revisions = COALESCE(${input.maxRevisions ?? null}, max_revisions)
      WHERE id = ${projectId} AND creator_id = ${creatorId}
      RETURNING *
    `

    return mapRowToProject(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Submit a project for review
 * Requires at least one file to be uploaded
 */
export async function submitProject(
  tenantSlug: string,
  projectId: string,
  creatorId: string,
  input: SubmitProjectInput = {}
): Promise<Project> {
  return withTenant(tenantSlug, async () => {
    // Verify ownership
    const existing = await sql`
      SELECT cp.*, (SELECT COUNT(*) FROM project_files WHERE project_id = cp.id) as file_count
      FROM creator_projects cp
      WHERE cp.id = ${projectId} AND cp.creator_id = ${creatorId}
    `

    const projectRow = existing.rows[0]
    if (!projectRow) {
      throw new Error('Project not found')
    }

    const currentStatus = projectRow.status as string
    const fileCount = parseInt(projectRow.file_count as string, 10) || 0

    // Check valid status for submission
    if (!['draft', 'revision_requested'].includes(currentStatus)) {
      throw new Error('Project cannot be submitted in current status')
    }

    // Require at least one file
    if (fileCount === 0) {
      throw new Error('At least one file must be uploaded before submission')
    }

    // Update status
    const result = await sql`
      UPDATE creator_projects
      SET
        status = 'submitted',
        submitted_at = NOW()
      WHERE id = ${projectId}
      RETURNING *
    `

    const project = mapRowToProject(result.rows[0] as Record<string, unknown>)

    // If this was a revision response, update the revision record
    if (currentStatus === 'revision_requested') {
      await sql`
        UPDATE project_revisions
        SET
          status = 'submitted',
          submitted_at = NOW(),
          response_notes = ${input.notes || null}
        WHERE project_id = ${projectId}
          AND status = 'requested'
        ORDER BY revision_number DESC
        LIMIT 1
      `
    }

    // Send job event
    await sendJob('project.statusChanged', {
      tenantId: tenantSlug,
      projectId,
      oldStatus: currentStatus,
      newStatus: 'submitted',
    })

    return project
  })
}

/**
 * Get files for a project
 */
export async function getProjectFiles(
  tenantSlug: string,
  projectId: string,
  creatorId: string
): Promise<ProjectFile[]> {
  return withTenant(tenantSlug, async () => {
    // Verify ownership
    const ownership = await sql`
      SELECT id FROM creator_projects
      WHERE id = ${projectId} AND creator_id = ${creatorId}
    `

    if (!ownership.rows[0]) {
      throw new Error('Project not found')
    }

    const result = await sql`
      SELECT * FROM project_files
      WHERE project_id = ${projectId}
      ORDER BY uploaded_at DESC
    `

    return result.rows.map((row) => mapRowToFile(row as Record<string, unknown>))
  })
}

/**
 * Add a file record to a project (called after upload to blob storage)
 */
export async function addProjectFile(
  tenantSlug: string,
  projectId: string,
  creatorId: string,
  file: {
    name: string
    originalName: string
    url: string
    sizeBytes: number
    contentType: string
    isDeliverable?: boolean
    notes?: string
  }
): Promise<ProjectFile> {
  const id = `file_${nanoid(16)}`

  return withTenant(tenantSlug, async () => {
    // Verify ownership and editable status
    const ownership = await sql`
      SELECT status FROM creator_projects
      WHERE id = ${projectId} AND creator_id = ${creatorId}
    `

    if (!ownership.rows[0]) {
      throw new Error('Project not found')
    }

    const status = ownership.rows[0].status as string
    if (!['draft', 'revision_requested'].includes(status)) {
      throw new Error('Cannot add files to project in current status')
    }

    // Get current version number for this file name
    const versionResult = await sql`
      SELECT MAX(version) as max_version
      FROM project_files
      WHERE project_id = ${projectId} AND original_name = ${file.originalName}
    `
    const currentVersion = parseInt(versionResult.rows[0]?.max_version as string, 10) || 0
    const newVersion = currentVersion + 1

    const result = await sql`
      INSERT INTO project_files (
        id, project_id, creator_id, name, original_name, url,
        size_bytes, content_type, is_deliverable, version, notes
      ) VALUES (
        ${id},
        ${projectId},
        ${creatorId},
        ${file.name},
        ${file.originalName},
        ${file.url},
        ${file.sizeBytes},
        ${file.contentType},
        ${file.isDeliverable ?? true},
        ${newVersion},
        ${file.notes || null}
      )
      RETURNING *
    `

    const projectFile = mapRowToFile(result.rows[0] as Record<string, unknown>)

    // Send job event
    await sendJob('creator.file.uploaded', {
      tenantId: tenantSlug,
      fileId: id,
      creatorId,
      projectId,
      fileType: file.contentType.startsWith('video/')
        ? 'video'
        : file.contentType.startsWith('image/')
          ? 'image'
          : 'document',
      fileSize: file.sizeBytes,
    })

    return projectFile
  })
}

/**
 * Delete a file from a project
 */
export async function deleteProjectFile(
  tenantSlug: string,
  fileId: string,
  creatorId: string
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    // Verify ownership via project
    const fileResult = await sql`
      SELECT pf.*, cp.status as project_status
      FROM project_files pf
      INNER JOIN creator_projects cp ON cp.id = pf.project_id
      WHERE pf.id = ${fileId} AND pf.creator_id = ${creatorId}
    `

    const file = fileResult.rows[0]
    if (!file) {
      throw new Error('File not found')
    }

    const projectStatus = file.project_status as string
    if (!['draft', 'revision_requested'].includes(projectStatus)) {
      throw new Error('Cannot delete files from project in current status')
    }

    await sql`DELETE FROM project_files WHERE id = ${fileId}`
  })
}

/**
 * Get project revisions
 */
export async function getProjectRevisions(
  tenantSlug: string,
  projectId: string,
  creatorId: string
): Promise<ProjectRevision[]> {
  return withTenant(tenantSlug, async () => {
    // Verify ownership
    const ownership = await sql`
      SELECT id FROM creator_projects
      WHERE id = ${projectId} AND creator_id = ${creatorId}
    `

    if (!ownership.rows[0]) {
      throw new Error('Project not found')
    }

    const result = await sql`
      SELECT * FROM project_revisions
      WHERE project_id = ${projectId}
      ORDER BY revision_number ASC
    `

    return result.rows.map((row) => mapRowToRevision(row as Record<string, unknown>))
  })
}

/**
 * Get project statistics for a creator
 */
export async function getProjectStats(
  tenantSlug: string,
  creatorId: string
): Promise<{
  total: number
  draft: number
  submitted: number
  inReview: number
  revisionRequested: number
  approved: number
  completed: number
  totalEarningsCents: number
}> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
        COUNT(*) FILTER (WHERE status = 'in_review') as in_review,
        COUNT(*) FILTER (WHERE status = 'revision_requested') as revision_requested,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COALESCE(SUM(payment_cents) FILTER (WHERE status = 'completed'), 0) as total_earnings_cents
      FROM creator_projects
      WHERE creator_id = ${creatorId}
    `

    const row = result.rows[0]
    return {
      total: parseInt(row?.total as string, 10) || 0,
      draft: parseInt(row?.draft as string, 10) || 0,
      submitted: parseInt(row?.submitted as string, 10) || 0,
      inReview: parseInt(row?.in_review as string, 10) || 0,
      revisionRequested: parseInt(row?.revision_requested as string, 10) || 0,
      approved: parseInt(row?.approved as string, 10) || 0,
      completed: parseInt(row?.completed as string, 10) || 0,
      totalEarningsCents: parseInt(row?.total_earnings_cents as string, 10) || 0,
    }
  })
}

/**
 * Check if creator can submit a project
 */
export function canSubmitProject(project: Project): { allowed: boolean; reason?: string } {
  if (!['draft', 'revision_requested'].includes(project.status)) {
    return { allowed: false, reason: 'Project is not in a submittable status' }
  }

  if ((project.fileCount ?? 0) === 0) {
    return { allowed: false, reason: 'At least one file must be uploaded' }
  }

  return { allowed: true }
}

/**
 * Check if creator can edit a project
 */
export function canEditProject(project: Project): boolean {
  return ['draft', 'revision_requested'].includes(project.status)
}

/**
 * Get status display info
 */
export function getStatusDisplayInfo(status: ProjectStatus): {
  label: string
  color: 'gray' | 'yellow' | 'blue' | 'orange' | 'green' | 'red'
  description: string
} {
  const statusInfo: Record<ProjectStatus, { label: string; color: 'gray' | 'yellow' | 'blue' | 'orange' | 'green' | 'red'; description: string }> = {
    draft: { label: 'Draft', color: 'gray', description: 'Project is being prepared' },
    submitted: { label: 'Submitted', color: 'yellow', description: 'Waiting for review' },
    in_review: { label: 'In Review', color: 'blue', description: 'Being reviewed by the brand' },
    revision_requested: { label: 'Revisions Needed', color: 'orange', description: 'Changes requested' },
    approved: { label: 'Approved', color: 'green', description: 'Project approved' },
    completed: { label: 'Completed', color: 'green', description: 'Project completed and paid' },
    cancelled: { label: 'Cancelled', color: 'red', description: 'Project was cancelled' },
  }

  return statusInfo[status]
}
