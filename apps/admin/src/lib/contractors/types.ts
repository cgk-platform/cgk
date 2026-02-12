/**
 * Contractor types for admin management
 *
 * Contractors are single-tenant service providers who work on assigned projects
 * with invoice-based compensation (vs creators who earn commissions).
 */

// ============================================================================
// Core Contractor Types
// ============================================================================

export type ContractorStatus = 'active' | 'pending' | 'suspended' | 'inactive'

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

export interface ContractorWithPayee extends Contractor {
  payeeId: string | null
  payeeStatus: string | null
  hasPaymentMethod: boolean
  hasW9: boolean
  balanceAvailableCents: number
  balancePendingCents: number
  totalPaidCents: number
  activeProjectCount: number
}

// ============================================================================
// Project Types
// ============================================================================

export type ProjectStatus =
  | 'pending_contractor'   // Upcoming - not started
  | 'draft'                // Upcoming - contractor drafting
  | 'in_progress'          // In Progress
  | 'submitted'            // Submitted for review
  | 'revision_requested'   // Revisions needed
  | 'approved'             // Approved
  | 'payout_ready'         // Ready for payout
  | 'withdrawal_requested' // Contractor requested payout
  | 'payout_approved'      // Payout processed

export interface ProjectDeliverable {
  id: string
  title: string
  completed: boolean
}

export interface SubmittedWork {
  files: { name: string; url: string; type: string }[]
  links: { title: string; url: string }[]
  notes: string | null
  submittedAt: Date
}

export interface ContractorProject {
  id: string
  contractorId: string
  tenantId: string
  title: string
  description: string | null
  status: ProjectStatus
  dueDate: Date | null
  rateCents: number | null
  deliverables: ProjectDeliverable[]
  submittedWork: SubmittedWork | null
  revisionNotes: string | null
  submittedAt: Date | null
  approvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Payment Request Types
// ============================================================================

export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected' | 'paid'

export type WorkType = 'project' | 'hourly' | 'expense' | 'bonus' | 'other'

export interface PaymentRequestAttachment {
  name: string
  url: string
  type: string
}

export interface PaymentRequest {
  id: string
  contractorId: string
  tenantId: string
  payeeId: string
  amountCents: number
  approvedAmountCents: number | null
  description: string
  workType: WorkType
  projectId: string | null
  projectTitle: string | null
  attachments: PaymentRequestAttachment[]
  status: PaymentRequestStatus
  adminNotes: string | null
  submittedAt: Date
  reviewedAt: Date | null
  reviewedBy: string | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Directory and Filter Types
// ============================================================================

export interface ContractorDirectoryFilters {
  search?: string
  status?: ContractorStatus[]
  tags?: string[]
  hasPaymentMethod?: boolean
  hasW9?: boolean
  sortBy?: 'name' | 'createdAt' | 'balance' | 'projectCount'
  sortDir?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface ContractorDirectoryItem {
  id: string
  name: string
  email: string
  status: ContractorStatus
  tags: string[]
  balanceAvailableCents: number
  balancePendingCents: number
  activeProjectCount: number
  hasPaymentMethod: boolean
  hasW9: boolean
  createdAt: Date
}

export interface ContractorDirectoryResult {
  contractors: ContractorDirectoryItem[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
}

// ============================================================================
// Detail Page Types
// ============================================================================

export interface PayeeSummary {
  id: string
  status: string
  w9Status: string | null
  w9SubmittedAt: Date | null
}

export interface PaymentMethod {
  id: string
  type: 'bank_account' | 'stripe' | 'wise'
  label: string
  isDefault: boolean
  status: 'active' | 'pending' | 'failed'
  lastFour: string | null
}

export interface ContractorBalance {
  pendingCents: number
  availableCents: number
  paidCents: number
}

export interface PayoutSummary {
  pendingCount: number
  processingCount: number
  failedCount: number
  completedCount: number
}

export interface ContractorDetailPage {
  contractor: Contractor
  payee: PayeeSummary | null
  paymentMethods: PaymentMethod[]
  balance: ContractorBalance
  payoutSummary: PayoutSummary
  projects: ContractorProject[]
  paymentRequests: PaymentRequest[]
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateContractorRequest {
  name: string
  email: string
  phone?: string
  status?: ContractorStatus
  tags?: string[]
  notes?: string
}

export interface UpdateContractorRequest {
  name?: string
  email?: string
  phone?: string | null
  status?: ContractorStatus
  tags?: string[]
  notes?: string | null
  contractUrl?: string | null
  contractType?: 'uploaded' | 'link' | null
}

export interface CreateProjectRequest {
  contractorId: string
  title: string
  description?: string
  dueDate?: Date
  rateCents?: number
  deliverables?: string[]
}

export interface UpdateProjectRequest {
  title?: string
  description?: string | null
  dueDate?: Date | null
  rateCents?: number | null
  status?: ProjectStatus
  revisionNotes?: string | null
}

export interface ApprovePaymentRequest {
  requestId: string
  action: 'approve' | 'reject'
  approvedAmountCents?: number
  adminNotes?: string
}

export interface ContractorInvitation {
  email: string
  name?: string
  message?: string
  projectAssignment?: {
    title: string
    description?: string
    dueDate?: Date
    rateCents?: number
  }
}

// ============================================================================
// Status Display Helpers
// ============================================================================

export const CONTRACTOR_STATUS_LABELS: Record<ContractorStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
  inactive: 'Inactive',
}

export const CONTRACTOR_STATUS_VARIANTS: Record<ContractorStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  pending: 'warning',
  suspended: 'destructive',
  inactive: 'secondary',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  pending_contractor: 'Pending',
  draft: 'Draft',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  revision_requested: 'Needs Revision',
  approved: 'Approved',
  payout_ready: 'Ready for Payout',
  withdrawal_requested: 'Payout Requested',
  payout_approved: 'Paid',
}

export const PROJECT_STATUS_VARIANTS: Record<ProjectStatus, 'success' | 'warning' | 'destructive' | 'secondary' | 'info' | 'default'> = {
  pending_contractor: 'secondary',
  draft: 'secondary',
  in_progress: 'info',
  submitted: 'warning',
  revision_requested: 'destructive',
  approved: 'success',
  payout_ready: 'success',
  withdrawal_requested: 'warning',
  payout_approved: 'success',
}

export const PAYMENT_REQUEST_STATUS_LABELS: Record<PaymentRequestStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
}

export const PAYMENT_REQUEST_STATUS_VARIANTS: Record<PaymentRequestStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  paid: 'success',
}

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  project: 'Project Work',
  hourly: 'Hourly Work',
  expense: 'Expense',
  bonus: 'Bonus',
  other: 'Other',
}

// ============================================================================
// Status Transitions
// ============================================================================

export const ADMIN_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  pending_contractor: [],
  draft: [],
  in_progress: [],
  submitted: ['approved', 'revision_requested'],
  revision_requested: [],
  approved: ['payout_ready'],
  payout_ready: [],
  withdrawal_requested: ['payout_approved'],
  payout_approved: [],
}

export const CONTRACTOR_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  pending_contractor: ['draft', 'in_progress'],
  draft: ['in_progress'],
  in_progress: ['submitted'],
  submitted: [],
  revision_requested: ['in_progress', 'submitted'],
  approved: [],
  payout_ready: ['withdrawal_requested'],
  withdrawal_requested: [],
  payout_approved: [],
}

export function canAdminTransitionTo(from: ProjectStatus, to: ProjectStatus): boolean {
  return ADMIN_STATUS_TRANSITIONS[from].includes(to)
}

export function canContractorTransitionTo(from: ProjectStatus, to: ProjectStatus): boolean {
  return CONTRACTOR_STATUS_TRANSITIONS[from].includes(to)
}
