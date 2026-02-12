/**
 * Contractor Portal Type Definitions
 *
 * Contractors are single-tenant workers (unlike multi-brand creators).
 * They work on assigned projects with a 6-stage Kanban pipeline
 * and submit invoices for completed work.
 */

// Contractor status
export type ContractorStatus = 'active' | 'pending' | 'suspended' | 'inactive'

// Project status - 6-stage Kanban pipeline
export type ProjectStatus =
  | 'pending_contractor' // Upcoming - not started
  | 'draft' // Upcoming - contractor drafting
  | 'in_progress' // In Progress
  | 'submitted' // Submitted for review
  | 'revision_requested' // Revisions needed
  | 'approved' // Approved
  | 'payout_ready' // Ready for payout
  | 'withdrawal_requested' // Contractor requested payout
  | 'payout_approved' // Payout processed

/**
 * Kanban column mapping
 */
export const KANBAN_COLUMNS = {
  upcoming: ['pending_contractor', 'draft'],
  inProgress: ['in_progress'],
  submitted: ['submitted'],
  revisions: ['revision_requested'],
  approved: ['approved'],
  payouts: ['payout_ready', 'withdrawal_requested', 'payout_approved'],
} as const

export type KanbanColumnId = keyof typeof KANBAN_COLUMNS

/**
 * Valid status transitions
 */
export const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  pending_contractor: ['draft', 'in_progress'],
  draft: ['in_progress'],
  in_progress: ['submitted'],
  submitted: ['approved', 'revision_requested'], // Admin action
  revision_requested: ['in_progress', 'submitted'],
  approved: ['payout_ready'], // Admin action
  payout_ready: ['withdrawal_requested'], // Contractor action
  withdrawal_requested: ['payout_approved'], // Admin action
  payout_approved: [], // Terminal state
}

/**
 * Contractor profile data
 */
export interface Contractor {
  id: string
  tenantId: string
  name: string
  email: string
  phone: string | null
  status: ContractorStatus
  tags: string[]
  notes: string | null
  contractUrl: string | null
  contractType: 'uploaded' | 'link' | null
  contractSignedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Contractor with additional data
 */
export interface ContractorWithStats extends Contractor {
  activeProjectCount: number
  completedProjectCount: number
  pendingPayoutCents: number
  lifetimeEarningsCents: number
}

/**
 * Project deliverable item
 */
export interface ProjectDeliverable {
  id: string
  title: string
  description: string | null
  completed: boolean
  completedAt: Date | null
}

/**
 * Submitted work data
 */
export interface SubmittedWork {
  files: {
    url: string
    name: string
    type: string
    size: number
  }[]
  links: string[]
  notes: string | null
  submittedAt: Date
}

/**
 * Contractor project
 */
export interface ContractorProject {
  id: string
  contractorId: string
  tenantId: string
  title: string
  description: string | null
  status: ProjectStatus
  dueDate: Date | null
  rateCents: number | null
  rateType: 'hourly' | 'project' | null
  deliverables: ProjectDeliverable[]
  submittedWork: SubmittedWork | null
  revisionNotes: string | null
  submittedAt: Date | null
  approvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Contractor JWT payload
 */
export interface ContractorJWTPayload {
  sub: string // contractor_id
  sid: string // session_id
  email: string
  name: string
  tenantId: string
  tenantSlug: string
  iat: number
  exp: number
}

/**
 * Contractor session record
 */
export interface ContractorSession {
  id: string
  contractorId: string
  tenantId: string
  tokenHash: string
  deviceInfo: string | null
  deviceType: string | null
  ipAddress: string | null
  userAgent: string | null
  expiresAt: Date
  lastActiveAt: Date
  revokedAt: Date | null
  createdAt: Date
  isCurrent?: boolean
}

/**
 * Dashboard statistics
 */
export interface ContractorDashboardStats {
  activeProjectsCount: number
  upcomingProjectsCount: number
  pendingReviewCount: number
  revisionRequestedCount: number
  pendingPayoutCents: number
  totalEarnedCents: number
}

/**
 * Kanban column definition
 */
export interface KanbanColumn {
  id: KanbanColumnId
  title: string
  statuses: readonly ProjectStatus[]
  color: string
}

/**
 * API error response
 */
export interface APIError {
  error: string
  code?: string
  details?: Record<string, string>
}

/**
 * API success response
 */
export interface APISuccess<T = void> {
  success: true
  data?: T
  message?: string
}

/**
 * Password reset token record
 */
export interface ContractorPasswordResetToken {
  id: string
  contractorId: string
  email: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  ipAddress: string | null
  createdAt: Date
}

/**
 * Get display label for project status
 */
export function getStatusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    pending_contractor: 'Not Started',
    draft: 'Draft',
    in_progress: 'In Progress',
    submitted: 'Submitted',
    revision_requested: 'Revisions Needed',
    approved: 'Approved',
    payout_ready: 'Payout Ready',
    withdrawal_requested: 'Payout Requested',
    payout_approved: 'Paid',
  }
  return labels[status]
}

/**
 * Get status color class for badges
 */
export function getStatusColor(status: ProjectStatus): string {
  const colors: Record<ProjectStatus, string> = {
    pending_contractor: 'bg-gray-100 text-gray-700 border-gray-300',
    draft: 'bg-gray-100 text-gray-700 border-gray-300',
    in_progress: 'bg-blueprint/10 text-blueprint-dark border-blueprint/30',
    submitted: 'bg-safety/10 text-safety-dark border-safety/30',
    revision_requested: 'bg-amber-50 text-amber-700 border-amber-300',
    approved: 'bg-verdigris/10 text-verdigris-dark border-verdigris/30',
    payout_ready: 'bg-verdigris/10 text-verdigris-dark border-verdigris/30',
    withdrawal_requested: 'bg-purple-50 text-purple-700 border-purple-300',
    payout_approved: 'bg-graphite/10 text-graphite border-graphite/30',
  }
  return colors[status]
}

/**
 * Check if a status transition is valid
 */
export function canTransitionTo(from: ProjectStatus, to: ProjectStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to)
}

/**
 * Get the Kanban column for a status
 */
export function getColumnForStatus(status: ProjectStatus): KanbanColumnId {
  for (const [columnId, statuses] of Object.entries(KANBAN_COLUMNS)) {
    if ((statuses as readonly string[]).includes(status)) {
      return columnId as KanbanColumnId
    }
  }
  return 'upcoming'
}
