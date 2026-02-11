/**
 * @cgk/support - Support System Package
 *
 * Provides ticket management, live chat, CSAT surveys, and privacy compliance.
 * Phase 2SP-TICKETS: Ticket system
 * Phase 2SP-CHANNELS: Chat, CSAT, Privacy
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always use withTenant() for all database operations
 */

// ============================================
// TYPES - Ticket System (Phase 2SP-TICKETS)
// ============================================
export type {
  AgentFilters,
  AgentMetrics,
  AgentRole,
  CommentAuthorType,
  CommentInput,
  CreateAgentInput,
  CreateTicketInput,
  PaginatedAgents,
  PaginatedComments,
  PaginatedResult,
  PaginatedTickets,
  SentimentAlert,
  SentimentAnalysisResult,
  SLAConfig,
  SupportAgent,
  SupportTicket,
  TicketAuditAction,
  TicketAuditEntry,
  TicketChannel,
  TicketComment,
  TicketFilters,
  TicketMetrics,
  TicketPriority,
  TicketStatus,
  UpdateAgentInput,
  UpdateTicketInput,
} from './types'

// ============================================
// TYPES - Channels (Phase 2SP-CHANNELS)
// ============================================
export type {
  // Chat types
  BusinessHours,
  ChatMessage,
  ChatSession,
  ChatSessionFilters,
  ChatSessionStatus,
  ChatSenderType,
  ChatWidgetConfig,
  ChatWidgetPosition,
  CreateChatSessionInput,
  SendMessageInput,
  UpdateWidgetConfigInput,
  // CSAT types
  AgentCSATScore,
  CSATChannel,
  CSATConfig,
  CSATMetrics,
  CSATMetricsDaily,
  CSATMetricsOptions,
  CSATRating,
  CSATSurvey,
  CSATSurveyFilters,
  CreateSurveyInput,
  SubmitSurveyResponseInput,
  // Privacy types
  ConsentFilters,
  ConsentRecord,
  ConsentType,
  CreatePrivacyRequestInput,
  PrivacyRequest,
  PrivacyRequestFilters,
  PrivacyRequestStatus,
  PrivacyRequestType,
  RecordConsentInput,
  UpdatePrivacyRequestInput,
  VerificationMethod,
  VerifyRequestInput,
} from './channel-types'

// ============================================
// TICKET SYSTEM (Phase 2SP-TICKETS)
// ============================================

// Agent functions
export {
  createAgent,
  decrementAgentTicketCount,
  deleteAgent,
  getAgent,
  getAgentByUserId,
  getAgents,
  getAvailableAgents,
  incrementAgentTicketCount,
  updateAgent,
  updateAgentStatus,
} from './agents'

// Ticket functions
export {
  addComment,
  assignTicket,
  autoAssignTicket,
  createTicket,
  getComments,
  getTicket,
  getTicketAuditLog,
  getTicketByNumber,
  getTicketMetrics,
  getTickets,
  unassignTicket,
  updateTicket,
} from './tickets'

// SLA functions
export {
  calculateFirstResponseDeadline,
  calculateSLADeadline,
  checkSLABreaches,
  formatRemainingTime,
  getAllSLAConfigs,
  getRemainingMinutes,
  getSLAConfig,
  getSLAStatus,
  isSLABreached,
  recalculateSLADeadline,
  updateSLAConfig,
} from './sla'

// Sentiment functions
export {
  acknowledgeSentimentAlert,
  analyzeSentiment,
  createSentimentAlert,
  getUnacknowledgedAlerts,
  processSentiment,
} from './sentiment'

// ============================================
// CHAT (Phase 2SP-CHANNELS)
// ============================================
export {
  // Session management
  createChatSession,
  getChatSession,
  getActiveSessions,
  getQueuedSessions,
  getChatSessions,
  assignChatSession,
  endChatSession,
  transferChatSession,
  // Messages
  sendMessage,
  getMessages,
  markMessagesRead,
  getUnreadCount,
  // Widget config
  getWidgetConfig,
  updateWidgetConfig,
  isWithinBusinessHours,
  getChatQueueStats,
} from './chat'

// ============================================
// CSAT (Phase 2SP-CHANNELS)
// ============================================
export {
  // Survey management
  createSurvey,
  getSurvey,
  getSurveys,
  submitSurveyResponse,
  // Metrics
  getCSATMetrics,
  getAgentCSATScores,
  getDailyMetrics,
  // Auto-trigger
  triggerCSATSurvey,
  // Configuration
  getCSATConfig,
  updateCSATConfig,
} from './csat'

// ============================================
// PRIVACY (Phase 2SP-CHANNELS)
// ============================================
export {
  // Request management
  createPrivacyRequest,
  getPrivacyRequests,
  getPrivacyRequest,
  updateRequestStatus,
  updatePrivacyRequest,
  // Verification
  verifyRequest,
  // Processing
  processDataExport,
  processDataDeletion,
  // Consent
  recordConsent,
  getConsentRecords,
  getActiveConsent,
  getConsentRecordsFiltered,
  revokeConsent,
  // Compliance
  getOverdueRequests,
  getApproachingDeadlineRequests,
  getPrivacyStats,
  // Utility functions
  COMPLIANCE_DEADLINES,
  calculateDeadline,
  getDaysUntilDeadline,
  isRequestOverdue,
} from './privacy'
