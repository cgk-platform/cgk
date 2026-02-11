/**
 * Workflow Engine Type Definitions
 * PHASE-2H-WORKFLOWS
 */

// ============================================================
// Trigger Types
// ============================================================

export type TriggerType =
  | 'status_change'
  | 'time_elapsed'
  | 'scheduled'
  | 'event'
  | 'manual'

export interface StatusChangeTriggerConfig {
  type: 'status_change'
  from?: string[] // Optional: only trigger if changing from these statuses
  to?: string[] // Optional: only trigger if changing to these statuses
}

export interface TimeElapsedTriggerConfig {
  type: 'time_elapsed'
  status: string // Trigger when entity has been in this status for duration
  hours?: number
  days?: number
}

export interface ScheduledTriggerConfig {
  type: 'scheduled'
  cron: string // Cron expression (e.g., "0 9 * * *")
  timezone?: string // e.g., "America/Los_Angeles"
}

export interface EventTriggerConfig {
  type: 'event'
  eventType: string // e.g., "submission.created", "payment.received"
}

export interface ManualTriggerConfig {
  type: 'manual'
}

export type TriggerConfig =
  | StatusChangeTriggerConfig
  | TimeElapsedTriggerConfig
  | ScheduledTriggerConfig
  | EventTriggerConfig
  | ManualTriggerConfig

// ============================================================
// Condition Types
// ============================================================

export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'exists'
  | 'notExists'
  | 'matches' // Regex

export interface Condition {
  field: string // Dot notation supported (e.g., "metadata.tier")
  operator: ConditionOperator
  value: unknown
}

export interface ConditionResult {
  condition: Condition
  passed: boolean
  actualValue: unknown
}

// ============================================================
// Action Types
// ============================================================

export type ActionType =
  | 'send_message'
  | 'send_notification'
  | 'slack_notify'
  | 'suggest_action'
  | 'schedule_followup'
  | 'update_status'
  | 'update_field'
  | 'create_task'
  | 'assign_to'
  | 'webhook'
  | 'generate_report'

export interface SendMessageActionConfig {
  channel: 'email' | 'sms'
  template: string // Message template with variables
  subject?: string // For email
  to?: 'contact' | 'assignee' | string // Email address or role
}

export interface SendNotificationActionConfig {
  to: 'assignee' | 'owner' | 'all_admins' | string // userId
  title: string
  message: string
  priority?: 'low' | 'normal' | 'high'
}

export interface SlackNotifyActionConfig {
  channel: string // Channel name (e.g., "#ops")
  message: string
  mention?: string // e.g., "@primary", "@channel"
}

export interface SuggestActionConfig {
  channel: string
  message: string
  options: string[] // Button labels
}

export interface ScheduleFollowupConfig {
  delayHours?: number
  delayDays?: number
  action: Action // Action to execute after delay
  cancelIf?: Condition[] // Conditions that cancel the followup
}

export interface UpdateStatusConfig {
  newStatus: string
}

export interface UpdateFieldConfig {
  field: string
  value: unknown
}

export interface CreateTaskConfig {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assignTo?: 'owner' | 'coordinator' | string // userId
  dueInDays?: number
}

export interface AssignToConfig {
  userId?: string
  role?: 'owner' | 'coordinator' | 'round_robin'
}

export interface WebhookActionConfig {
  url: string
  method?: 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>
  includeEntity?: boolean
}

export interface GenerateReportConfig {
  reportType: string
  recipients: string[] // Email addresses or roles
  format?: 'pdf' | 'csv' | 'html'
}

export type ActionConfig =
  | { type: 'send_message'; config: SendMessageActionConfig }
  | { type: 'send_notification'; config: SendNotificationActionConfig }
  | { type: 'slack_notify'; config: SlackNotifyActionConfig }
  | { type: 'suggest_action'; config: SuggestActionConfig }
  | { type: 'schedule_followup'; config: ScheduleFollowupConfig }
  | { type: 'update_status'; config: UpdateStatusConfig }
  | { type: 'update_field'; config: UpdateFieldConfig }
  | { type: 'create_task'; config: CreateTaskConfig }
  | { type: 'assign_to'; config: AssignToConfig }
  | { type: 'webhook'; config: WebhookActionConfig }
  | { type: 'generate_report'; config: GenerateReportConfig }

export interface Action {
  type: ActionType
  config: Record<string, unknown>
}

export interface ActionResult {
  action: Action
  success: boolean
  result?: unknown
  error?: string
}

// ============================================================
// Workflow Rule
// ============================================================

export interface WorkflowRule {
  id: string
  name: string
  description: string | null
  isActive: boolean
  priority: number

  triggerType: TriggerType
  triggerConfig: TriggerConfig

  conditions: Condition[]
  actions: Action[]

  cooldownHours: number | null
  maxExecutions: number | null

  requiresApproval: boolean
  approverRole: string | null

  entityTypes: string[]

  createdBy: { id: string; name: string } | null
  updatedBy: { id: string; name: string } | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateWorkflowRuleInput {
  name: string
  description?: string
  isActive?: boolean
  priority?: number
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
  conditions?: Condition[]
  actions: Action[]
  cooldownHours?: number
  maxExecutions?: number
  requiresApproval?: boolean
  approverRole?: string
  entityTypes?: string[]
}

export interface UpdateWorkflowRuleInput {
  name?: string
  description?: string
  isActive?: boolean
  priority?: number
  triggerType?: TriggerType
  triggerConfig?: Record<string, unknown>
  conditions?: Condition[]
  actions?: Action[]
  cooldownHours?: number
  maxExecutions?: number
  requiresApproval?: boolean
  approverRole?: string
  entityTypes?: string[]
}

// ============================================================
// Workflow Execution
// ============================================================

export type ExecutionResult =
  | 'success'
  | 'partial'
  | 'failed'
  | 'skipped'
  | 'pending_approval'

export interface WorkflowExecution {
  id: string
  ruleId: string
  ruleName: string

  entityType: string
  entityId: string
  entityTitle?: string

  triggerData: Record<string, unknown>

  conditionsEvaluated: ConditionResult[]
  conditionsPassed: boolean

  actionsTaken: ActionResult[]

  result: ExecutionResult
  errorMessage: string | null

  requiresApproval: boolean
  approvedBy: { id: string; name: string } | null
  approvedAt: Date | null
  rejectedBy: { id: string; name: string } | null
  rejectedAt: Date | null
  rejectionReason: string | null

  startedAt: Date
  completedAt: Date | null
}

// ============================================================
// Scheduled Action
// ============================================================

export type ScheduledActionStatus = 'pending' | 'executed' | 'cancelled' | 'failed'

export interface ScheduledAction {
  id: string
  ruleId: string | null
  executionId: string | null

  entityType: string
  entityId: string

  actionType: string
  actionConfig: Record<string, unknown>

  scheduledFor: Date
  executedAt: Date | null

  cancelIf: Condition[] | null
  cancelledAt: Date | null
  cancelReason: string | null

  status: ScheduledActionStatus
  errorMessage: string | null

  createdAt: Date
}

// ============================================================
// Entity Workflow State
// ============================================================

export interface EntityWorkflowState {
  entityType: string
  entityId: string
  ruleId: string

  executionCount: number
  lastExecutionAt: Date | null
  lastExecutionId: string | null

  stateData: Record<string, unknown>
}

// ============================================================
// Execution Context
// ============================================================

export interface EvaluationContext {
  entity: Record<string, unknown>
  previousEntity?: Record<string, unknown>
  user?: Record<string, unknown>
  computed: Record<string, unknown> // Computed fields
}

export interface ExecutionContext {
  tenantId: string
  ruleId: string
  entityType: string
  entityId: string
  entity: Record<string, unknown>
  previousEntity?: Record<string, unknown>
  triggerData: Record<string, unknown>
  user?: { id: string; name: string; email: string }
  computed: Record<string, unknown>
}

// ============================================================
// Engine Events
// ============================================================

export interface StatusChangeParams {
  entityType: string
  entityId: string
  oldStatus: string
  newStatus: string
  entity: Record<string, unknown>
  context?: Record<string, unknown>
}

export interface EventTriggerParams {
  eventType: string
  entityType: string
  entityId: string
  entity: Record<string, unknown>
  data: Record<string, unknown>
}

export interface TimeElapsedEntity {
  entityType: string
  entityId: string
  status: string
  statusChangedAt: Date
  entity: Record<string, unknown>
}

export interface ManualTriggerParams {
  ruleId: string
  entityType: string
  entityId: string
  entity: Record<string, unknown>
  bypassChecks?: boolean
}
