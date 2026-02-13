/**
 * @cgk-platform/ai-agents - AI Agent system (BRII) for CGK platform
 *
 * Provides:
 * - Agent configuration and management
 * - Personality system with 6 configurable traits
 * - Autonomy settings with 3 levels
 * - Action logging with complete audit trail
 * - Approval workflow for high-stakes actions
 * - Memory system with vector embeddings (PHASE-2AI-MEMORY)
 * - RAG (Retrieval Augmented Generation) for context injection
 * - Training and correction detection
 * - Feedback processing and pattern extraction
 * - Voice capabilities: TTS, STT, and voice calls (PHASE-2AI-VOICE)
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

// ============================================================================
// PHASE-2AI-MEMORY: Memory & RAG System
// ============================================================================

// Memory Module
export {
  // Types
  type AgentFeedback,
  type AgentMemory,
  type AgentPattern,
  type ConfidenceFactors,
  type ConsolidationResult,
  type CreateFeedbackInput,
  type CreateFailureLearningInput,
  type CreateMemoryInput,
  type CreatePatternInput,
  type CreateTrainingSessionInput,
  type FailureLearning,
  type FailureType,
  type FeedbackType,
  type MemoryListFilters,
  type MemorySearchFilters,
  type MemorySearchResult,
  type MemorySource,
  type MemoryType,
  type RAGContextOptions,
  type RAGContextResult,
  type TrainingExample,
  type TrainingSession,
  type TrainingType,
  type UpdateMemoryInput,
  // Constants
  SOURCE_WEIGHTS,
  TRAINING_TO_MEMORY_TYPE,
  // Embeddings
  cosineSimilarity,
  EMBEDDING_CONFIG,
  estimateTokens,
  generateEmbedding,
  generateEmbeddings,
  generateMemoryEmbedding,
  // Storage
  countMemories,
  createMemory,
  deactivateMemory,
  deleteMemory,
  getAverageConfidence,
  getMemoriesBySubject,
  getMemoriesByType,
  getMemoriesWithoutEmbeddings,
  getMemory,
  listMemories,
  recordMemoryAccess,
  updateMemory,
  updateMemoryEmbedding,
  // Confidence
  applyAgeDecay,
  calculateConfidence,
  contradictMemory,
  deactivateLowConfidenceMemories,
  getLowConfidenceMemories,
  recalculateAllConfidence,
  reinforceMemory,
  supersedeMemory,
  // Consolidation
  cleanupExpiredMemories,
  consolidateMemories,
  findDuplicateMemories,
  findSimilarMemories,
  getConsolidationCandidates,
  mergeMemories,
} from './memory/index.js'

// RAG Module
export {
  // Search
  getConversationMemories,
  getMostUsedMemories,
  getRecentMemories,
  getSubjectMemories,
  searchMemories,
  searchMemoriesByText,
  // Ranking
  calculateRelevanceScore,
  diversifyMemories,
  filterByThresholds,
  groupByType,
  MEMORY_TYPE_PRIORITY,
  MEMORY_TYPE_WEIGHTS,
  rankMemories,
  sortGroupsByPriority,
  // Context Builder
  buildMemoryContext,
  buildQuickContext,
  buildSubjectContext,
} from './rag/index.js'

// Learning Module
export {
  // Training
  acknowledgeTraining,
  addTrainingMemory,
  countTrainingByType,
  deleteTrainingSession,
  getTrainingSession,
  getUnacknowledgedTraining,
  listTrainingSessions,
  startTrainingSession,
  // Correction Detection
  acknowledgeFailureLearning,
  applyFailureLearning,
  countFailuresByType,
  createFailureLearning,
  deleteFailureLearning,
  detectCorrection,
  getFailureLearning,
  getUnacknowledgedFailures,
  isCorrection,
  isNegativeReaction,
  listFailureLearnings,
  // Feedback
  deleteFeedback,
  getFeedback,
  getFeedbackByConversation,
  getFeedbackStats,
  getUnprocessedFeedback,
  listFeedback,
  processAllFeedback,
  processFeedback,
  submitFeedback,
  // Patterns
  cleanupLowPerformingPatterns,
  createPattern,
  deletePattern,
  findSimilarPatterns,
  getPattern,
  getPatternCategories,
  getPatternsByCategory,
  getPatternStats,
  getTopPatterns,
  listPatterns,
  recordPatternUsage,
  updatePatternCategory,
  updatePatternFeedback,
} from './learning/index.js'

// Types (original)
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

// ============================================================================
// PHASE-2AI-VOICE: Voice Capabilities
// ============================================================================

// Voice Module - All voice-related exports
export * from './voice/index.js'

// ============================================================================
// PHASE-2AI-TEAMS: Multi-Agent Teams & Org Chart
// ============================================================================

// Team Registry
export {
  createTeam,
  deleteTeam,
  getTeam,
  getTeamName,
  getTeamForChannel,
  getTeamsByDomain,
  getTeamsBySupervisor,
  listTeams,
  updateTeam,
} from './teams/registry.js'

// Team Members
export {
  addTeamMember,
  addSpecialization,
  findMembersBySpecialization,
  getAgentTeams,
  getDomainAgents,
  getTeamLead,
  hasTeamRole,
  listTeamMembers,
  removeMember,
  removeSpecialization,
  setTeamLead,
  updateMember,
} from './teams/members.js'

// Task Routing
export {
  canAgentHandle,
  extractAgentMention,
  getAgentForChannel,
  getRoutingSuggestions,
  listAgentsWithSpecializations,
  matchAgentByTopic,
  routeToAgent,
} from './teams/routing.js'

// Org Chart
export {
  buildOrgChart,
  findReportingPath,
  getEmployeeDirectReports,
  getOrgChartStats,
  getOrgSubtree,
  renderOrgChartAsText,
} from './org-chart/builder.js'

export {
  addAgentToOrgChart,
  addHumanToOrgChart,
  calculateOrgLevels,
  removeFromOrgChart,
  syncAgentOrgChart,
  syncOrgChart,
  updateReportingRelationship,
  validateOrgChart,
} from './org-chart/sync.js'

// Relationships
export {
  adjustTrustLevel,
  endConversation,
  ensureRelationship,
  getAgentRelationship,
  getRelationshipContext,
  getRelationshipStats,
  listRelationships,
  listRelationshipsWithDetails,
  recordInteraction,
  setRelationshipSummary,
  startConversation,
  updateRelationship,
} from './relationships/tracker.js'

export {
  applyFamiliarityDecay,
  calculateExpectedFamiliarity,
  getFamiliarityDescription,
  getFamiliarityInsights,
  getFamiliarityLevel,
  getGreetingStyle,
  getHighFamiliarityRelationships,
  recalculateFamiliarity,
  shouldReintroduce,
} from './relationships/familiarity.js'

export {
  addTopicDiscussed,
  buildCommunicationContext,
  getEffectiveCommunicationStyle,
  getPreferences,
  getTopicsDiscussed,
  learnFromFeedback,
  setPreferredChannel,
  setResponseStyle,
  updatePreferences,
} from './relationships/preferences.js'

// Handoffs
export {
  canHandoffTo,
  cancelHandoff,
  getPendingHandoffs,
  initiateAndNotifyHandoff,
  initiateHandoff,
  suggestHandoffAgents,
} from './handoffs/initiate.js'

export {
  acceptHandoff,
  autoAcceptIfEligible,
  completeHandoff,
  declineHandoff,
  getHandoffDetails,
  getPendingHandoffCount,
  handleSlackHandoffAccept,
  hasPendingHandoffs,
} from './handoffs/accept.js'

export {
  buildHandoffContext,
  buildHandoffPromptSection,
  extractKeyPoints,
  getHandoffContext,
  suggestHandoffReason,
  summarizeForHandoff,
} from './handoffs/context.js'

// Teams Database Queries (for advanced use cases)
export {
  getAgentTeamMemberships,
  getTeamById,
  getTeamByName,
  listTeamMembers as listTeamMembersDb,
} from './db/teams-queries.js'

// Org chart database queries
export {
  getOrgChartEntry,
  getOrgChartWithDetails,
  listOrgChartEntries,
  upsertOrgChartEntry,
} from './db/org-chart-queries.js'

// Relationship database queries
export {
  decayAllFamiliarity,
  getCommunicationPreferences,
  getOrCreateRelationship,
  getRelationship,
  listAgentRelationships,
} from './db/relationships-queries.js'

// Handoff database queries
export {
  archiveOldHandoffs,
  getHandoffById,
  getHandoffStats,
  getHandoffWithAgents,
  listHandoffs,
  listPendingHandoffs,
  listAgentMessages,
} from './db/handoffs-queries.js'

// Teams Types
export type {
  AddTeamMemberInput,
  AgentHandoff,
  AgentHandoffWithAgents,
  AgentMessageType,
  AgentRelationship,
  AgentRelationshipWithPerson,
  AgentSlackMessage,
  AgentWithSpecializations,
  AITeam,
  AITeamWithMembers,
  CommunicationPreferences,
  CreateTeamInput,
  EmployeeType,
  HandoffContext,
  HandoffStatus,
  InitiateHandoffInput,
  OrgChartEntry,
  OrgChartNode,
  PersonType,
  RecordInteractionInput,
  RouteTaskInput,
  RoutingResult,
  SendAgentMessageInput,
  SupervisorType,
  TeamMember,
  TeamMemberSummary,
  TeamMemberWithAgent,
  TeamRole,
  UpdateOrgChartInput,
  UpdateRelationshipInput,
  UpdateTeamInput,
  UpdateTeamMemberInput,
} from './types/teams.js'

// Background Jobs
export {
  cleanupHandoffsJob,
  decayFamiliarityJob,
  syncOrgChartJob,
  teamsJobDefinitions,
} from './jobs/teams-jobs.js'

// ============================================================================
// PHASE-2AI-INTEGRATIONS: Multi-Channel Integrations
// ============================================================================

// All integration exports (Slack, Google Calendar, Email, SMS)
export * from './integrations/index.js'
