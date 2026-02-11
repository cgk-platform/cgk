/**
 * @cgk/ai-agents - AI Agent system (BRII) for CGK platform
 *
 * Provides:
 * - Agent configuration and management
 * - Personality system with 6 configurable traits
 * - Autonomy settings with 3 levels
 * - Action logging with complete audit trail
 * - Approval workflow for high-stakes actions
 *
 * @ai-pattern tenant-isolation
 * @ai-required All operations must be wrapped in withTenant()
 */

// Agent Registry
export {
  createAgent,
  getAgent,
  getAgentName,
  getPrimaryAgent,
  listAgents,
  retireAgent,
  setAsPrimaryAgent,
  updateAgent,
} from './agents/registry.js'

// Personality
export {
  buildPersonalityPromptSection,
  generatePersonalityPreview,
  getTraitDescription,
  getTraitEndpoints,
} from './personality/prompt-builder.js'

// Autonomy
export {
  checkAutonomy,
  checkAutonomyWithApproval,
  getActionsRequiringApproval,
  wouldRequireApproval,
} from './autonomy/check.js'
export type { AutonomyContext } from './autonomy/check.js'

// Action Logger
export {
  approveAction,
  getAction,
  getAgentActionStats,
  getAgentActions,
  getCreatorActions,
  getPendingActions,
  listActions,
  logAction,
  logFailure,
  logSuccess,
  rejectAction,
  setActionApprovalStatus,
} from './actions/logger.js'

// Approval Workflow
export {
  approve,
  cancel,
  createApprovalRequest,
  expirePendingApprovals,
  formatTimeRemaining,
  getApprovalStats,
  getRequest,
  getUrgencyLevel,
  isRequestValid,
  listAgentPending,
  listPending,
  listUserPending,
  reject,
} from './actions/approval.js'

// Database Queries (for advanced use cases)
export {
  createDefaultAutonomySettings,
  createDefaultPersonality,
  getActionAutonomy,
  getActionAutonomyList,
  getAgentPersonality,
  getAutonomySettings,
  setActionAutonomy,
  updateAgentPersonality,
  updateAutonomySettings,
} from './db/queries.js'

// Types
export type {
  ActionCategory,
  ActionLogFilters,
  AgentActionAutonomy,
  AgentActionLog,
  AgentActionLogWithAgent,
  AgentApprovalRequest,
  AgentAutonomySettings,
  AgentPersonality,
  AIAgent,
  AIAgentStatus,
  AIAgentWithDetails,
  ApprovalRequestWithAgent,
  ApprovalStatus,
  AutonomyCheckResult,
  AutonomyLevel,
  CreateAgentInput,
  CreateApprovalRequestInput,
  LogActionInput,
  UpdateActionAutonomyInput,
  UpdateAgentInput,
  UpdateAutonomySettingsInput,
  UpdatePersonalityInput,
} from './types.js'

// Default action autonomy levels
export { DEFAULT_ACTION_AUTONOMY } from './types.js'
