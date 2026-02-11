/**
 * Type definitions for BRI Admin pages
 */

// Settings
export interface BriSettings {
  id: string
  isEnabled: boolean
  respondToAllDms: boolean
  requireApprovalForActions: boolean
  messagesPerUserPerHour: number
  dailyStandupChannel: string | null
  creatorOpsChannel: string | null
  escalationChannel: string | null
  aiModel: string
  aiTemperature: number
  aiMaxTokens: number
  responseStyle: 'concise' | 'balanced' | 'detailed'
  enableSmsOutreach: boolean
  enableEmailOutreach: boolean
}

// Stats
export interface BriStats {
  totalConversations: number
  activeConversations24h: number
  messages24h: number
  mostUsedTool: string | null
  toolUsage: { tool: string; count: number }[]
}

// Conversations
export interface BriConversation {
  id: string
  channelId: string | null
  threadTs: string | null
  userId: string
  messages: ConversationMessage[]
  toolsUsed: string[]
  isActive: boolean
  summary: string | null
  createdAt: string
  updatedAt: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// Actions
export interface BriAction {
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
  approvedAt: string | null
  success: boolean
  errorMessage: string | null
  createdAt: string
}

export type ActionCategory =
  | 'communication'
  | 'lookup'
  | 'modification'
  | 'escalation'
  | 'creative'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timeout' | 'cancelled'

// Creative Ideas
export interface CreativeIdea {
  id: string
  title: string
  type: CreativeIdeaType
  status: CreativeIdeaStatus
  description: string | null
  content: string | null
  products: string[]
  platforms: string[]
  formats: string[]
  tags: string[]
  timesUsed: number
  performanceScore: number | null
  bestExample: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type CreativeIdeaType =
  | 'ad_concept'
  | 'script'
  | 'hook'
  | 'angle'
  | 'cta'
  | 'testimonial'
  | 'trend'
  | 'inspiration'

export type CreativeIdeaStatus =
  | 'draft'
  | 'ready'
  | 'in_use'
  | 'proven'
  | 'archived'
  | 'rejected'

export interface CreativeIdeaLink {
  id: string
  ideaId: string
  projectId: string
  usageType: string | null
  performanceNotes: string | null
  createdAt: string
}

// Autonomy
export type AutonomyLevel = 'conservative' | 'balanced' | 'proactive'

export interface AutonomySettings {
  level: AutonomyLevel
  adaptToFeedback: boolean
  trackSuccessPatterns: boolean
  adjustToUserPreferences: boolean
  maxActionsPerHour: number
  maxCostPerDay: number
  requireHumanForHighValue: boolean
  highValueThreshold: number
}

export interface ActionAutonomy {
  actionType: string
  enabled: boolean
  requiresApproval: boolean
  maxPerDay: number | null
  cooldownHours: number | null
}

// Integrations
export interface IntegrationStatus {
  slack: {
    connected: boolean
    teamName?: string
    source: 'database' | 'env' | null
  }
  google: {
    connected: boolean
    email?: string
    scopes?: string[]
    source: 'database' | 'env' | null
  }
  sms: {
    configured: boolean
    phoneNumber?: string
    source: 'database' | 'env' | null
  }
  email: {
    configured: boolean
    fromEmail?: string
    source: 'database' | 'env' | null
  }
}

export interface SmsConfig {
  apiKey: string
  phoneNumberId: string
  webhookUrl: string
  voice: 'nat' | 'josh' | 'rachel' | 'maya'
  model: 'base' | 'turbo' | 'enhanced'
}

export interface EmailConfig {
  apiKey: string
  fromEmail: string
}

// Team Memories
export interface TeamMember {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  memories: TeamMemberMemory[]
}

export interface TeamMemberMemory {
  id: string
  userId: string
  memoryType: MemoryType
  source: MemorySource
  content: string
  confidence: number
  createdAt: string
}

export type MemoryType =
  | 'role_pattern'
  | 'response_style'
  | 'availability'
  | 'preference'
  | 'special_consideration'
  | 'interaction_note'
  | 'expertise'

export type MemorySource = 'told' | 'observed' | 'inferred'

export interface UserMemory {
  id: string
  content: string
  contentType: string
  importanceScore: number
  isArchived: boolean
  createdAt: string
}

// Team Defaults
export interface TeamDefaults {
  primaryContactId: string | null
  secondaryContactIds: string[]
  defaultReviewerIds: string[]
  financeContactId: string | null
}

// Slack Users
export interface SlackUserLink {
  userId: string
  slackUserId: string
  slackUsername: string | null
  isAutoLinked: boolean
}

export interface SlackUser {
  id: string
  username: string
  realName: string
  email: string | null
}

// Notifications
export interface NotificationEvent {
  event: string
  slack: boolean
  sms: boolean
  email: boolean
  recipients: NotificationRecipient[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
  templates?: {
    slack?: string
    sms?: string
    emailSubject?: string
    emailHtml?: string
  }
}

export type NotificationRecipient =
  | 'creator'
  | 'primary'
  | 'secondary'
  | 'reviewer'
  | 'finance'
  | 'channel'

export interface NotificationSettings {
  events: NotificationEvent[]
  defaultSlackChannel: string | null
  quietHoursStart: string | null
  quietHoursEnd: string | null
  quietHoursTimezone: string
}

// Follow-ups
export interface FollowupSettings {
  enableDeliveryReminders: boolean
  deliveryReminderDays: number
  trafficScriptsOnProduction: boolean
  trafficScriptDelayHours: number
  daysBeforeDeadline: string
  daysAfterDeadline: string
  escalateAfterDays: number
  escalationChannel: string | null
  quietHoursStart: string | null
  quietHoursEnd: string | null
  quietHoursTimezone: string
  templateOverrides: Record<string, unknown>
}

// Voice
export interface VoiceConfig {
  // TTS
  ttsProvider: string
  ttsVoiceId: string | null
  ttsModel: string
  ttsStability: number
  ttsSimilarityBoost: number
  ttsSpeed: number
  // STT
  sttProvider: string
  sttModel: string | null
  sttLanguage: string
  // Personality
  acknowledgments: string[]
  thinkingPhrases: string[]
  speechSpeed: number
}

export interface VoiceOption {
  id: string
  name: string
  previewUrl?: string
}

export interface TtsModel {
  id: string
  name: string
}

export interface SttProvider {
  id: string
  name: string
  models: { id: string; name: string }[]
}

// AI Models
export interface AIModel {
  id: string
  name: string
  provider: string
  maxTokens: number
}
