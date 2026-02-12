/**
 * Project Types for Creator Portal
 */

export type ProjectStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'revision_requested'
  | 'approved'
  | 'completed'
  | 'cancelled'

export interface Project {
  id: string
  creatorId: string
  brandId: string
  brandName?: string
  brandSlug?: string
  title: string
  description: string | null
  brief: string | null
  status: ProjectStatus
  dueDate: Date | null
  paymentCents: number
  revisionCount: number
  maxRevisions: number
  feedback: string | null
  feedbackAt: Date | null
  submittedAt: Date | null
  approvedAt: Date | null
  completedAt: Date | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  fileCount?: number
  files?: ProjectFile[]
  revisions?: ProjectRevision[]
}

export interface ProjectFile {
  id: string
  projectId: string
  creatorId: string
  name: string
  originalName: string
  url: string
  sizeBytes: number
  contentType: string
  isDeliverable: boolean
  version: number
  notes: string | null
  uploadedAt: Date
}

export type RevisionStatus = 'requested' | 'submitted' | 'approved' | 'rejected'

export interface ProjectRevision {
  id: string
  projectId: string
  revisionNumber: number
  status: RevisionStatus
  requestNotes: string | null
  responseNotes: string | null
  requestedBy: string
  requestedAt: Date
  submittedAt: Date | null
  resolvedAt: Date | null
  resolvedBy: string | null
}

export interface ProjectFilters {
  status?: ProjectStatus | ProjectStatus[]
  brandId?: string
  search?: string
  dueBefore?: Date
  dueAfter?: Date
}

export interface ProjectListOptions extends ProjectFilters {
  limit?: number
  offset?: number
  sortBy?: 'created_at' | 'updated_at' | 'due_date' | 'title'
  sortDir?: 'asc' | 'desc'
}

export interface CreateProjectInput {
  brandId: string
  title: string
  description?: string
  brief?: string
  dueDate?: Date
  paymentCents?: number
  maxRevisions?: number
}

export interface UpdateProjectInput {
  title?: string
  description?: string
  brief?: string
  dueDate?: Date | null
  paymentCents?: number
  maxRevisions?: number
}

export interface SubmitProjectInput {
  notes?: string
}

export interface RequestRevisionInput {
  notes: string
}

export interface ApproveProjectInput {
  feedback?: string
}
