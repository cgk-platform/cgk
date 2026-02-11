/**
 * Type definitions for AI Teams and multi-agent collaboration
 */

// ============================================================================
// AI Teams
// ============================================================================

/**
 * Team role within an AI team
 */
export type TeamRole = 'lead' | 'member' | 'specialist'

/**
 * Supervisor type - can be AI or human
 */
export type SupervisorType = 'ai' | 'human'

/**
 * AI Team configuration
 */
export interface AITeam {
  id: string
  tenantId: string
  name: string
  description: string | null
  domain: string | null
  slackChannelId: string | null
  slackChannelName: string | null
  supervisorType: SupervisorType | null
  supervisorId: string | null
  supervisorSlackId: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * AI Team with member count
 */
export interface AITeamWithMembers extends AITeam {
  memberCount: number
  members: TeamMemberSummary[]
}

/**
 * Team member summary for list views
 */
export interface TeamMemberSummary {
  agentId: string
  agentName: string
  agentDisplayName: string
  avatarUrl: string | null
  role: TeamRole
}

/**
 * Create team input
 */
export interface CreateTeamInput {
  name: string
  description?: string
  domain?: string
  slackChannelId?: string
  slackChannelName?: string
  supervisorType?: SupervisorType
  supervisorId?: string
  supervisorSlackId?: string
}

/**
 * Update team input
 */
export interface UpdateTeamInput {
  name?: string
  description?: string | null
  domain?: string | null
  slackChannelId?: string | null
  slackChannelName?: string | null
  supervisorType?: SupervisorType | null
  supervisorId?: string | null
  supervisorSlackId?: string | null
  isActive?: boolean
}

// ============================================================================
// Team Membership
// ============================================================================

/**
 * Team member record
 */
export interface TeamMember {
  id: string
  tenantId: string
  teamId: string
  agentId: string
  role: TeamRole
  slackUserId: string | null
  specializations: string[]
  joinedAt: Date
}

/**
 * Team member with agent details
 */
export interface TeamMemberWithAgent extends TeamMember {
  agent: {
    id: string
    name: string
    displayName: string
    avatarUrl: string | null
    role: string
    status: string
  }
}

/**
 * Add team member input
 */
export interface AddTeamMemberInput {
  teamId: string
  agentId: string
  role?: TeamRole
  slackUserId?: string
  specializations?: string[]
}

/**
 * Update team member input
 */
export interface UpdateTeamMemberInput {
  role?: TeamRole
  slackUserId?: string | null
  specializations?: string[]
}

// ============================================================================
// Org Chart
// ============================================================================

/**
 * Employee type in org chart
 */
export type EmployeeType = 'ai' | 'human'

/**
 * Org chart entry
 */
export interface OrgChartEntry {
  id: string
  tenantId: string
  employeeType: EmployeeType
  employeeId: string
  reportsToType: EmployeeType | null
  reportsToId: string | null
  level: number
  department: string | null
  team: string | null
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Org chart node for tree rendering
 */
export interface OrgChartNode {
  id: string
  type: EmployeeType
  name: string
  title: string
  avatarUrl?: string
  department?: string
  team?: string
  level: number
  children: OrgChartNode[]
}

/**
 * Update org chart entry input
 */
export interface UpdateOrgChartInput {
  reportsToType?: EmployeeType | null
  reportsToId?: string | null
  department?: string | null
  team?: string | null
  displayOrder?: number
}

// ============================================================================
// Agent Relationships
// ============================================================================

/**
 * Person type for relationships
 */
export type PersonType = 'team_member' | 'creator' | 'contact'

/**
 * Agent relationship record
 */
export interface AgentRelationship {
  id: string
  tenantId: string
  agentId: string
  personType: PersonType
  personId: string
  familiarityScore: number
  trustLevel: number
  interactionCount: number
  totalConversationMinutes: number
  lastInteractionAt: Date | null
  communicationPreferences: CommunicationPreferences
  relationshipSummary: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Communication preferences stored in relationship
 */
export interface CommunicationPreferences {
  preferredChannel?: 'slack' | 'email' | 'sms'
  responseStyle?: 'concise' | 'detailed' | 'friendly'
  topicsDiscussed?: string[]
}

/**
 * Relationship with person details
 */
export interface AgentRelationshipWithPerson extends AgentRelationship {
  person: {
    id: string
    name: string
    email?: string
    avatarUrl?: string
  }
}

/**
 * Record interaction input
 */
export interface RecordInteractionInput {
  agentId: string
  personType: PersonType
  personId: string
  durationMinutes?: number
  channel?: string
  topics?: string[]
}

/**
 * Update relationship input
 */
export interface UpdateRelationshipInput {
  trustLevel?: number
  communicationPreferences?: Partial<CommunicationPreferences>
  relationshipSummary?: string | null
}

// ============================================================================
// Agent-to-Agent Messaging
// ============================================================================

/**
 * Agent message type
 */
export type AgentMessageType = 'status' | 'question' | 'handoff' | 'task' | 'response'

/**
 * Agent Slack message record
 */
export interface AgentSlackMessage {
  id: string
  tenantId: string
  slackMessageTs: string
  slackChannelId: string
  fromAgentId: string
  toAgentId: string | null
  messageType: AgentMessageType
  content: string
  context: Record<string, unknown>
  handoffConversationId: string | null
  handoffAccepted: boolean | null
  createdAt: Date
}

/**
 * Send agent message input
 */
export interface SendAgentMessageInput {
  fromAgentId: string
  toAgentId?: string
  slackChannelId: string
  messageType: AgentMessageType
  content: string
  context?: Record<string, unknown>
  handoffConversationId?: string
}

// ============================================================================
// Handoffs
// ============================================================================

/**
 * Handoff status
 */
export type HandoffStatus = 'pending' | 'accepted' | 'declined' | 'completed'

/**
 * Agent handoff record
 */
export interface AgentHandoff {
  id: string
  tenantId: string
  fromAgentId: string
  toAgentId: string
  conversationId: string
  channel: string
  channelId: string | null
  reason: string
  contextSummary: string | null
  keyPoints: string[]
  status: HandoffStatus
  acceptedAt: Date | null
  completedAt: Date | null
  createdAt: Date
}

/**
 * Handoff with agent details
 */
export interface AgentHandoffWithAgents extends AgentHandoff {
  fromAgent: {
    id: string
    name: string
    displayName: string
    avatarUrl: string | null
  }
  toAgent: {
    id: string
    name: string
    displayName: string
    avatarUrl: string | null
  }
}

/**
 * Initiate handoff input
 */
export interface InitiateHandoffInput {
  fromAgentId: string
  toAgentId: string
  conversationId: string
  channel: string
  channelId?: string
  reason: string
  contextSummary?: string
}

/**
 * Handoff context built for receiving agent
 */
export interface HandoffContext {
  handoffId: string
  fromAgentName: string
  reason: string
  keyPoints: string[]
  contextSummary: string | null
  conversationHistory?: Array<{
    role: 'user' | 'agent'
    content: string
    timestamp: Date
  }>
}

// ============================================================================
// Task Routing
// ============================================================================

/**
 * Routing result
 */
export interface RoutingResult {
  agentId: string
  reason: string
  confidence: number
}

/**
 * Route task input
 */
export interface RouteTaskInput {
  tenantId: string
  message: string
  channel: string
  channelId?: string
  context?: Record<string, unknown>
}

/**
 * Agent with specializations for routing
 */
export interface AgentWithSpecializations {
  id: string
  name: string
  displayName: string
  isPrimary: boolean
  status: string
  teamMemberships: Array<{
    teamId: string
    teamName: string
    role: TeamRole
    specializations: string[]
  }>
}
