/**
 * Type definitions for AI Agent system (BRII)
 */

// Agent status
export type AIAgentStatus = 'active' | 'paused' | 'training' | 'retired'

// Autonomy levels
export type AutonomyLevel = 'autonomous' | 'suggest_and_confirm' | 'human_required'

// Approval status
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timeout' | 'cancelled'

// Action categories
export type ActionCategory =
  | 'messaging'
  | 'content'
  | 'finance'
  | 'data'
  | 'scheduling'
  | 'integration'
  | 'system'

/**
 * AI Agent configuration
 */
export interface AIAgent {
  id: string
  name: string
  displayName: string
  email: string | null
  role: string
  avatarUrl: string | null
  status: AIAgentStatus
  isPrimary: boolean
  aiModel: string
  aiTemperature: number
  aiMaxTokens: number
  capabilities: string[]
  toolAccess: string[]
  managerAgentId: string | null
  humanManagerId: string | null
  connectedAccounts: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

/**
 * Agent with personality and stats (list view)
 */
export interface AIAgentWithDetails extends AIAgent {
  personality: AgentPersonality | null
  autonomySettings: AgentAutonomySettings | null
  actionsToday: number
  memoryCount: number
  avgConfidence: number | null
}

/**
 * Create agent input
 */
export interface CreateAgentInput {
  name: string
  displayName: string
  email?: string
  role: string
  avatarUrl?: string
  aiModel?: string
  aiTemperature?: number
  aiMaxTokens?: number
  capabilities?: string[]
  toolAccess?: string[]
  isPrimary?: boolean
  humanManagerId?: string
}

/**
 * Update agent input
 */
export interface UpdateAgentInput {
  displayName?: string
  email?: string
  role?: string
  avatarUrl?: string
  status?: AIAgentStatus
  aiModel?: string
  aiTemperature?: number
  aiMaxTokens?: number
  capabilities?: string[]
  toolAccess?: string[]
  isPrimary?: boolean
  humanManagerId?: string
  managerAgentId?: string
  connectedAccounts?: Record<string, unknown>
}

/**
 * Agent personality traits
 */
export interface AgentPersonality {
  id: string
  agentId: string
  traitFormality: number
  traitVerbosity: number
  traitProactivity: number
  traitHumor: number
  traitEmojiUsage: number
  traitAssertiveness: number
  preferredGreeting: string | null
  signature: string | null
  goToEmojis: string[]
  alwaysConfirmActions: boolean
  offerAlternatives: boolean
  explainReasoning: boolean
  customGreetingTemplates: string[]
  customErrorTemplates: string[]
  forbiddenTopics: string[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Update personality input
 */
export interface UpdatePersonalityInput {
  traitFormality?: number
  traitVerbosity?: number
  traitProactivity?: number
  traitHumor?: number
  traitEmojiUsage?: number
  traitAssertiveness?: number
  preferredGreeting?: string | null
  signature?: string | null
  goToEmojis?: string[]
  alwaysConfirmActions?: boolean
  offerAlternatives?: boolean
  explainReasoning?: boolean
  customGreetingTemplates?: string[]
  customErrorTemplates?: string[]
  forbiddenTopics?: string[]
}

/**
 * Agent autonomy settings (global)
 */
export interface AgentAutonomySettings {
  id: string
  agentId: string
  maxActionsPerHour: number
  maxCostPerDay: number
  requireHumanForHighValue: number
  adaptToFeedback: boolean
  trackSuccessPatterns: boolean
  adjustToUserPreferences: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Update autonomy settings input
 */
export interface UpdateAutonomySettingsInput {
  maxActionsPerHour?: number
  maxCostPerDay?: number
  requireHumanForHighValue?: number
  adaptToFeedback?: boolean
  trackSuccessPatterns?: boolean
  adjustToUserPreferences?: boolean
}

/**
 * Per-action autonomy configuration
 */
export interface AgentActionAutonomy {
  id: string
  agentId: string
  actionType: string
  autonomyLevel: AutonomyLevel
  enabled: boolean
  requiresApproval: boolean
  maxPerDay: number | null
  cooldownHours: number | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Update action autonomy input
 */
export interface UpdateActionAutonomyInput {
  autonomyLevel?: AutonomyLevel
  enabled?: boolean
  requiresApproval?: boolean
  maxPerDay?: number | null
  cooldownHours?: number | null
}

/**
 * Agent action log entry
 */
export interface AgentActionLog {
  id: string
  agentId: string
  actionType: string
  actionCategory: ActionCategory | null
  actionDescription: string
  inputData: Record<string, unknown> | null
  outputData: Record<string, unknown> | null
  toolsUsed: string[]
  creatorId: string | null
  projectId: string | null
  conversationId: string | null
  requiredApproval: boolean
  approvalStatus: ApprovalStatus | null
  approvedBy: string | null
  approvedAt: Date | null
  success: boolean
  errorMessage: string | null
  visibleToCreator: boolean
  visibleInDashboard: boolean
  createdAt: Date
}

/**
 * Action log with agent details
 */
export interface AgentActionLogWithAgent extends AgentActionLog {
  agent: Pick<AIAgent, 'id' | 'name' | 'displayName' | 'avatarUrl'>
}

/**
 * Log action input
 */
export interface LogActionInput {
  agentId: string
  actionType: string
  actionCategory?: ActionCategory
  actionDescription: string
  inputData?: Record<string, unknown>
  outputData?: Record<string, unknown>
  toolsUsed?: string[]
  creatorId?: string
  projectId?: string
  conversationId?: string
  requiresApproval?: boolean
  success?: boolean
  errorMessage?: string
  visibleToCreator?: boolean
  visibleInDashboard?: boolean
}

/**
 * Agent approval request
 */
export interface AgentApprovalRequest {
  id: string
  agentId: string
  actionLogId: string | null
  actionType: string
  actionPayload: Record<string, unknown>
  reason: string | null
  requestedAt: Date
  approverType: 'human' | 'ai' | null
  approverId: string | null
  status: ApprovalStatus
  respondedAt: Date | null
  responseNote: string | null
  slackMessageTs: string | null
  slackChannelId: string | null
  expiresAt: Date
  createdAt: Date
}

/**
 * Approval request with agent details
 */
export interface ApprovalRequestWithAgent extends AgentApprovalRequest {
  agent: Pick<AIAgent, 'id' | 'name' | 'displayName' | 'avatarUrl'>
}

/**
 * Create approval request input
 */
export interface CreateApprovalRequestInput {
  agentId: string
  actionLogId?: string
  actionType: string
  actionPayload: Record<string, unknown>
  reason?: string
  approverType?: 'human' | 'ai'
  approverId?: string
  expiresInHours?: number
}

/**
 * Autonomy check result
 */
export interface AutonomyCheckResult {
  allowed: boolean
  level: AutonomyLevel
  reason?: string
  requiresApproval: boolean
  approvalId?: string
}

/**
 * Action filters for querying
 */
export interface ActionLogFilters {
  agentId?: string
  actionType?: string
  actionCategory?: ActionCategory
  creatorId?: string
  projectId?: string
  approvalStatus?: ApprovalStatus
  success?: boolean
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

/**
 * Default action types with suggested autonomy levels
 */
export const DEFAULT_ACTION_AUTONOMY: Record<string, AutonomyLevel> = {
  // Autonomous (no approval needed)
  lookup_data: 'autonomous',
  send_check_in: 'autonomous',
  generate_report: 'autonomous',
  answer_question: 'autonomous',
  log_action: 'autonomous',
  schedule_task: 'autonomous',
  // Suggest and confirm
  send_first_message: 'suggest_and_confirm',
  change_status: 'suggest_and_confirm',
  extend_deadline: 'suggest_and_confirm',
  escalate_issue: 'suggest_and_confirm',
  // Human required
  process_payment: 'human_required',
  approve_content: 'human_required',
  decline_application: 'human_required',
  change_rate: 'human_required',
  send_bulk_message: 'human_required',
} as const
