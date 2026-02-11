/**
 * Pipeline types for creator project management
 */

// Pipeline stages
export const PIPELINE_STAGES = [
  { id: 'draft', label: 'Draft', color: '#9CA3AF' },
  { id: 'pending_creator', label: 'Upcoming', color: '#3B82F6' },
  { id: 'in_progress', label: 'In Progress', color: '#8B5CF6' },
  { id: 'submitted', label: 'Submitted', color: '#F59E0B' },
  { id: 'revision_requested', label: 'Revisions', color: '#EF4444' },
  { id: 'approved', label: 'Approved', color: '#10B981' },
  { id: 'payout_ready', label: 'Payout Ready', color: '#059669' },
  { id: 'withdrawal_requested', label: 'Withdrawal Requested', color: '#6366F1' },
  { id: 'payout_approved', label: 'Paid', color: '#047857' },
] as const

export type ProjectStatus = (typeof PIPELINE_STAGES)[number]['id']

// Valid stage transitions
export const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['pending_creator', 'in_progress'],
  pending_creator: ['draft', 'in_progress', 'revision_requested'],
  in_progress: ['submitted', 'revision_requested', 'approved', 'payout_ready'],
  submitted: ['approved', 'revision_requested', 'in_progress', 'payout_ready'],
  revision_requested: ['in_progress', 'submitted', 'approved', 'payout_ready'],
  approved: ['payout_ready', 'revision_requested'],
  payout_ready: ['withdrawal_requested', 'approved'],
  withdrawal_requested: ['payout_approved', 'revision_requested'],
  payout_approved: [],
}

// Locked stages - cannot be dragged by regular users
export const LOCKED_STATUSES: ProjectStatus[] = ['withdrawal_requested', 'payout_approved']

// Risk levels
export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'

// Pipeline project (card data)
export interface PipelineProject {
  id: string
  title: string
  creatorId: string
  creatorName: string
  creatorAvatar?: string | null
  status: ProjectStatus
  dueDate?: string | null
  daysUntilDeadline: number | null
  valueCents: number
  isAtRisk: boolean
  riskLevel: RiskLevel
  tags: string[]
  hasUnreadMessages: boolean
  filesCount: number
  lastActivityAt: string
  createdAt: string
}

// Pipeline statistics
export interface PipelineStats {
  totalProjects: number
  activeProjects: number
  totalValueCents: number
  atRiskValueCents: number
  overdueCount: number
  dueSoonCount: number
  avgCycleTimeDays: number
  throughputPerWeek: number
}

// Pipeline analytics data
export interface PipelineAnalytics {
  throughput: {
    week: string
    count: number
  }[]
  cycleTime: {
    days: number
    count: number
  }[]
  stageMetrics: {
    stage: ProjectStatus
    avgDurationDays: number
    currentCount: number
  }[]
  bottlenecks: {
    stage: ProjectStatus
    avgDuration: number
    wipViolation: boolean
  }[]
  riskDistribution: {
    level: RiskLevel
    count: number
    valueCents: number
  }[]
}

// Stage configuration
export interface StageConfig {
  id: ProjectStatus
  label: string
  color: string
  wipLimit?: number
  autoNotifyCreator?: boolean
  autoAssignUserId?: string | null
  defaultDueOffsetDays?: number | null
}

// Pipeline configuration
export interface PipelineConfig {
  stages: StageConfig[]
  defaultFilters?: PipelineFilters
  wipLimits: Record<string, number>
}

// Filter options
export interface PipelineFilters {
  creatorIds?: string[]
  statuses?: ProjectStatus[]
  dateFrom?: string
  dateTo?: string
  riskLevels?: RiskLevel[]
  minValueCents?: number
  maxValueCents?: number
  hasFiles?: boolean
  hasUnreadMessages?: boolean
  tags?: string[]
  search?: string
}

// Saved filter
export interface SavedFilter {
  id: string
  userId?: string
  name: string
  filters: PipelineFilters
  isDefault: boolean
  createdAt: string
}

// Automation trigger types
export type TriggerType =
  | 'stage_enter'
  | 'stage_exit'
  | 'overdue'
  | 'due_soon'
  | 'value_threshold'

// Pipeline action types
export type PipelineAction =
  | { type: 'send_email'; template: string }
  | { type: 'slack_notify'; channel: string; message: string }
  | { type: 'assign_to'; userId: string }
  | { type: 'add_tag'; tag: string }
  | { type: 'change_status'; newStatus: ProjectStatus }

// Pipeline trigger
export interface PipelineTrigger {
  id: string
  name: string
  enabled: boolean
  triggerType: TriggerType
  triggerStage?: ProjectStatus
  triggerDays?: number
  triggerValueCents?: number
  actions: PipelineAction[]
  createdAt: string
  updatedAt: string
}

// Calendar event for calendar view
export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    projectId: string
    creatorName: string
    status: ProjectStatus
    valueCents: number
  }
}

// Stage transition payload
export interface StageTransitionPayload {
  newStatus: ProjectStatus
  notes?: string
}

// Bulk status update payload
export interface BulkStatusPayload {
  projectIds: string[]
  newStatus: ProjectStatus
}

// View types
export type PipelineView = 'kanban' | 'table' | 'calendar'

// Sort options for table view
export type PipelineSortField =
  | 'title'
  | 'creatorName'
  | 'status'
  | 'dueDate'
  | 'valueCents'
  | 'riskLevel'
  | 'lastActivityAt'

export interface PipelineSort {
  field: PipelineSortField
  direction: 'asc' | 'desc'
}

// Helper function to check if transition is valid
export function isValidTransition(
  from: ProjectStatus,
  to: ProjectStatus,
  isAdmin: boolean = false
): boolean {
  if (from === to) return false
  if (LOCKED_STATUSES.includes(from) && !isAdmin) return false
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

// Helper function to calculate risk level
export function calculateRiskLevel(
  dueDate: string | null | undefined,
  status: ProjectStatus
): RiskLevel {
  if (!dueDate) return 'none'
  if (['approved', 'payout_ready', 'withdrawal_requested', 'payout_approved'].includes(status)) {
    return 'none'
  }

  const due = new Date(dueDate)
  const now = new Date()
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'critical'
  if (diffDays <= 1) return 'high'
  if (diffDays <= 3) return 'medium'
  if (diffDays <= 7) return 'low'
  return 'none'
}

// Get stage label by id
export function getStageLabel(stageId: ProjectStatus): string {
  return PIPELINE_STAGES.find((s) => s.id === stageId)?.label ?? stageId
}

// Get stage color by id
export function getStageColor(stageId: ProjectStatus): string {
  return PIPELINE_STAGES.find((s) => s.id === stageId)?.color ?? '#9CA3AF'
}
