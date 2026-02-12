/**
 * Creator Project Helper Functions
 *
 * Client-safe helper functions that don't require database access.
 * These can be imported in both server and client components.
 */

import type { Project, ProjectStatus } from './types'

export type { ProjectStatus } from './types'

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
