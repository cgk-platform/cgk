/**
 * Support Channels Types
 * Phase 2SP-CHANNELS: Chat, CSAT, and Privacy
 */

import type { SupportAgent } from './types'

// ============================================
// CHAT TYPES
// ============================================

export type ChatSessionStatus = 'waiting' | 'active' | 'ended' | 'transferred'
export type ChatSenderType = 'visitor' | 'agent' | 'bot'
export type ChatWidgetPosition = 'bottom-right' | 'bottom-left'

/**
 * Chat Session
 */
export interface ChatSession {
  id: string
  conversationId: string | null
  visitorId: string
  visitorName: string | null
  visitorEmail: string | null
  pageUrl: string | null
  referrerUrl: string | null
  status: ChatSessionStatus
  assignedAgentId: string | null
  assignedAgent?: SupportAgent | null
  queuePosition: number | null
  startedAt: Date
  endedAt: Date | null
  waitTimeSeconds: number | null
  durationSeconds: number | null
  createdAt: Date
}

/**
 * Chat Message
 */
export interface ChatMessage {
  id: string
  sessionId: string
  senderId: string
  senderType: ChatSenderType
  content: string
  attachments: string[]
  isRead: boolean
  createdAt: Date
}

/**
 * Business Hours Configuration
 */
export interface BusinessHours {
  mon?: { start: string; end: string }
  tue?: { start: string; end: string }
  wed?: { start: string; end: string }
  thu?: { start: string; end: string }
  fri?: { start: string; end: string }
  sat?: { start: string; end: string }
  sun?: { start: string; end: string }
}

/**
 * Chat Widget Configuration
 */
export interface ChatWidgetConfig {
  primaryColor: string
  secondaryColor: string
  headerText: string
  greetingMessage: string
  position: ChatWidgetPosition
  offsetX: number
  offsetY: number
  autoOpenDelaySeconds: number | null
  showAgentTyping: boolean
  showReadReceipts: boolean
  businessHoursEnabled: boolean
  businessHours: BusinessHours | null
  offlineMessage: string
  fileUploadEnabled: boolean
  maxFileSizeMb: number
  allowedFileTypes: string[]
  updatedAt: Date
}

// Chat Input Types

export interface CreateChatSessionInput {
  visitorId: string
  visitorName?: string
  visitorEmail?: string
  pageUrl?: string
  referrerUrl?: string
}

export interface SendMessageInput {
  senderId: string
  senderType: ChatSenderType
  content: string
  attachments?: string[]
}

export interface UpdateWidgetConfigInput {
  primaryColor?: string
  secondaryColor?: string
  headerText?: string
  greetingMessage?: string
  position?: ChatWidgetPosition
  offsetX?: number
  offsetY?: number
  autoOpenDelaySeconds?: number | null
  showAgentTyping?: boolean
  showReadReceipts?: boolean
  businessHoursEnabled?: boolean
  businessHours?: BusinessHours | null
  offlineMessage?: string
  fileUploadEnabled?: boolean
  maxFileSizeMb?: number
  allowedFileTypes?: string[]
}

// Chat Filter Types

export interface ChatSessionFilters {
  status?: ChatSessionStatus
  assignedAgentId?: string
  unassigned?: boolean
  visitorEmail?: string
  dateFrom?: Date
  dateTo?: Date
  page?: number
  limit?: number
}

// ============================================
// CSAT TYPES
// ============================================

export type CSATChannel = 'email' | 'sms' | 'in_app'
export type CSATRating = 1 | 2 | 3 | 4 | 5

/**
 * CSAT Survey
 */
export interface CSATSurvey {
  id: string
  ticketId: string | null
  conversationId: string | null
  customerId: string | null
  customerEmail: string
  rating: CSATRating | null
  feedback: string | null
  agentId: string | null
  agent?: SupportAgent | null
  channel: CSATChannel
  sentAt: Date
  respondedAt: Date | null
  expiresAt: Date
  createdAt: Date
}

/**
 * Daily CSAT Metrics
 */
export interface CSATMetricsDaily {
  id: string
  metricDate: Date
  surveysSent: number
  surveysResponded: number
  totalRating: number
  avgRating: number | null
  rating1Count: number
  rating2Count: number
  rating3Count: number
  rating4Count: number
  rating5Count: number
  createdAt: Date
}

/**
 * CSAT Configuration
 */
export interface CSATConfig {
  enabled: boolean
  autoSendOnResolution: boolean
  delayHours: number
  expiryDays: number
  defaultChannel: CSATChannel
  ratingQuestion: string
  feedbackPrompt: string
  lowRatingThreshold: number
  alertOnLowRating: boolean
  updatedAt: Date
}

/**
 * Aggregated CSAT Metrics
 */
export interface CSATMetrics {
  totalSent: number
  totalResponded: number
  responseRate: number
  avgRating: number | null
  ratingDistribution: {
    rating1: number
    rating2: number
    rating3: number
    rating4: number
    rating5: number
  }
  trend: Array<{
    date: string
    avgRating: number | null
    responseCount: number
  }>
}

/**
 * Agent CSAT Score
 */
export interface AgentCSATScore {
  agentId: string
  agentName: string
  surveyCount: number
  responseCount: number
  avgRating: number | null
  ratingDistribution: {
    rating1: number
    rating2: number
    rating3: number
    rating4: number
    rating5: number
  }
}

// CSAT Input Types

export interface CreateSurveyInput {
  ticketId?: string
  conversationId?: string
  customerEmail: string
  customerId?: string
  agentId?: string
  channel?: CSATChannel
}

export interface SubmitSurveyResponseInput {
  rating: CSATRating
  feedback?: string
}

export interface CSATMetricsOptions {
  days?: number
  startDate?: Date
  endDate?: Date
}

// CSAT Filter Types

export interface CSATSurveyFilters {
  ticketId?: string
  agentId?: string
  customerEmail?: string
  channel?: CSATChannel
  hasResponse?: boolean
  rating?: CSATRating
  dateFrom?: Date
  dateTo?: Date
  page?: number
  limit?: number
}

// ============================================
// PRIVACY TYPES
// ============================================

export type PrivacyRequestType = 'export' | 'delete' | 'do_not_sell' | 'disclosure'
export type PrivacyRequestStatus = 'pending' | 'processing' | 'completed' | 'rejected'
export type VerificationMethod = 'email' | 'phone' | 'identity'
export type ConsentType = 'marketing' | 'analytics' | 'third_party' | 'data_processing'

/**
 * Privacy Request
 */
export interface PrivacyRequest {
  id: string
  customerId: string | null
  customerEmail: string
  requestType: PrivacyRequestType
  status: PrivacyRequestStatus
  verifiedAt: Date | null
  verificationMethod: VerificationMethod | null
  processedBy: string | null
  processedAt: Date | null
  resultUrl: string | null
  rejectionReason: string | null
  notes: string | null
  deadlineAt: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Consent Record
 */
export interface ConsentRecord {
  id: string
  customerId: string | null
  customerEmail: string
  consentType: ConsentType
  granted: boolean
  source: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  revokedAt: Date | null
}

// Privacy Input Types

export interface CreatePrivacyRequestInput {
  customerEmail: string
  customerId?: string
  requestType: PrivacyRequestType
  notes?: string
}

export interface UpdatePrivacyRequestInput {
  status?: PrivacyRequestStatus
  notes?: string
  rejectionReason?: string
  resultUrl?: string
}

export interface VerifyRequestInput {
  method: VerificationMethod
}

export interface RecordConsentInput {
  customerEmail: string
  customerId?: string
  consentType: ConsentType
  granted: boolean
  source?: string
  ipAddress?: string
  userAgent?: string
}

// Privacy Filter Types

export interface PrivacyRequestFilters {
  status?: PrivacyRequestStatus
  requestType?: PrivacyRequestType
  customerEmail?: string
  overdue?: boolean
  dateFrom?: Date
  dateTo?: Date
  page?: number
  limit?: number
}

export interface ConsentFilters {
  customerEmail?: string
  consentType?: ConsentType
  granted?: boolean
  active?: boolean
  page?: number
  limit?: number
}

// ============================================
// COMPLIANCE CONSTANTS
// ============================================

/**
 * GDPR deadline: 30 days
 * CCPA deadline: 45 days
 */
export const COMPLIANCE_DEADLINES = {
  GDPR_DAYS: 30,
  CCPA_DAYS: 45,
} as const

/**
 * Get deadline based on request type and regulation
 * @param requestType The type of privacy request
 * @param regulation Optional regulation (defaults to GDPR as stricter)
 */
export function calculateDeadline(
  _requestType: PrivacyRequestType,
  regulation: 'gdpr' | 'ccpa' = 'gdpr'
): Date {
  const days = regulation === 'ccpa'
    ? COMPLIANCE_DEADLINES.CCPA_DAYS
    : COMPLIANCE_DEADLINES.GDPR_DAYS

  const deadline = new Date()
  deadline.setDate(deadline.getDate() + days)
  return deadline
}

/**
 * Check if a request is overdue
 */
export function isRequestOverdue(request: PrivacyRequest): boolean {
  if (request.status === 'completed' || request.status === 'rejected') {
    return false
  }
  return new Date() > request.deadlineAt
}

/**
 * Get days until deadline
 */
export function getDaysUntilDeadline(request: PrivacyRequest): number {
  const now = new Date()
  const deadline = new Date(request.deadlineAt)
  const diffTime = deadline.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
