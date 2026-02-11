/**
 * Support Ticket System Types
 * Phase 2SP-TICKETS
 */

// Ticket status type
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed'

// Ticket priority type
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'

// Ticket channel type
export type TicketChannel = 'email' | 'chat' | 'phone' | 'form' | 'sms'

// Agent role type
export type AgentRole = 'agent' | 'lead' | 'admin'

// Comment author type
export type CommentAuthorType = 'agent' | 'customer' | 'system'

// Audit action types
export type TicketAuditAction =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'assigned'
  | 'unassigned'
  | 'commented'
  | 'resolved'
  | 'closed'
  | 'reopened'
  | 'sla_breached'
  | 'escalated'
  | 'tags_changed'

/**
 * Support Agent
 */
export interface SupportAgent {
  id: string
  userId: string
  name: string
  email: string
  role: AgentRole
  isActive: boolean
  isOnline: boolean
  maxTickets: number
  currentTicketCount: number
  skills: string[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Support Ticket
 */
export interface SupportTicket {
  id: string
  ticketNumber: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  channel: TicketChannel
  customerId: string | null
  customerEmail: string
  customerName: string | null
  assignedTo: string | null
  assignedAgent?: SupportAgent | null
  tags: string[]
  slaDeadline: Date | null
  slaBreached: boolean
  firstResponseAt: Date | null
  resolvedAt: Date | null
  resolutionNotes: string | null
  sentimentScore: number | null
  conversationId: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Ticket Comment
 */
export interface TicketComment {
  id: string
  ticketId: string
  authorId: string | null
  authorName: string
  authorType: CommentAuthorType
  content: string
  isInternal: boolean
  attachments: string[]
  createdAt: Date
}

/**
 * Sentiment Alert
 */
export interface SentimentAlert {
  id: string
  ticketId: string
  sentimentScore: number
  triggerReason: string | null
  acknowledged: boolean
  acknowledgedBy: string | null
  acknowledgedAt: Date | null
  createdAt: Date
}

/**
 * Ticket Audit Log Entry
 */
export interface TicketAuditEntry {
  id: string
  ticketId: string
  actorId: string | null
  actorName: string | null
  action: TicketAuditAction
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  createdAt: Date
}

/**
 * SLA Configuration
 */
export interface SLAConfig {
  id: string
  priority: TicketPriority
  firstResponseMinutes: number
  resolutionMinutes: number
  createdAt: Date
  updatedAt: Date
}

// Input types for creating/updating

export interface CreateTicketInput {
  subject: string
  description: string
  priority?: TicketPriority
  channel?: TicketChannel
  customerEmail: string
  customerName?: string
  customerId?: string
  tags?: string[]
  conversationId?: string
}

export interface UpdateTicketInput {
  subject?: string
  description?: string
  status?: TicketStatus
  priority?: TicketPriority
  tags?: string[]
  resolutionNotes?: string
}

export interface CreateAgentInput {
  userId: string
  name: string
  email: string
  role?: AgentRole
  maxTickets?: number
  skills?: string[]
}

export interface UpdateAgentInput {
  name?: string
  role?: AgentRole
  maxTickets?: number
  skills?: string[]
  isActive?: boolean
}

export interface CommentInput {
  content: string
  authorId?: string
  authorName: string
  authorType: CommentAuthorType
  isInternal?: boolean
  attachments?: string[]
}

// Filter types

export interface TicketFilters {
  status?: TicketStatus
  priority?: TicketPriority
  channel?: TicketChannel
  assignedTo?: string
  unassigned?: boolean
  slaBreached?: boolean
  search?: string
  customerEmail?: string
  tags?: string[]
  dateFrom?: Date
  dateTo?: Date
  page?: number
  limit?: number
  sort?: string
  dir?: 'asc' | 'desc'
}

export interface AgentFilters {
  role?: AgentRole
  isActive?: boolean
  isOnline?: boolean
  search?: string
  page?: number
  limit?: number
}

// Response types

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type PaginatedTickets = PaginatedResult<SupportTicket>
export type PaginatedAgents = PaginatedResult<SupportAgent>
export type PaginatedComments = PaginatedResult<TicketComment>

// Metrics types

export interface TicketMetrics {
  totalOpen: number
  totalPending: number
  totalResolved: number
  totalClosed: number
  slaBreachedCount: number
  avgResolutionTimeMinutes: number | null
  avgFirstResponseTimeMinutes: number | null
  ticketsByChannel: Record<TicketChannel, number>
  ticketsByPriority: Record<TicketPriority, number>
}

export interface AgentMetrics {
  agentId: string
  agentName: string
  openTickets: number
  resolvedToday: number
  avgResolutionTimeMinutes: number | null
  slaBreachRate: number
}

// Sentiment analysis result
export interface SentimentAnalysisResult {
  score: number // -1.0 to 1.0
  confidence: number // 0 to 1
  keywords: string[]
  shouldEscalate: boolean
  reason?: string
}
