/**
 * Smart Inbox Type Definitions
 * PHASE-2H-WORKFLOWS
 */

// ============================================================
// Contact Types
// ============================================================

export type ContactType =
  | 'creator'
  | 'customer'
  | 'vendor'
  | 'partner'
  | 'team_member'
  | 'other'

export type MessageChannel = 'sms' | 'email' | 'slack' | 'internal'

export interface Contact {
  id: string
  contactType: ContactType
  externalId: string | null // creator_id, customer_id, etc.

  name: string
  email: string | null
  phone: string | null
  companyName: string | null
  companyRole: string | null
  avatarUrl: string | null

  preferredChannel: MessageChannel
  timezone: string | null

  tags: string[]

  smsConsent: boolean
  smsConsentedAt: Date | null

  createdAt: Date
  updatedAt: Date
}

export interface CreateContactInput {
  contactType: ContactType
  externalId?: string
  name: string
  email?: string
  phone?: string
  companyName?: string
  companyRole?: string
  avatarUrl?: string
  preferredChannel?: MessageChannel
  timezone?: string
  tags?: string[]
  smsConsent?: boolean
}

export interface UpdateContactInput {
  contactType?: ContactType
  externalId?: string
  name?: string
  email?: string
  phone?: string
  companyName?: string
  companyRole?: string
  avatarUrl?: string
  preferredChannel?: MessageChannel
  timezone?: string
  tags?: string[]
  smsConsent?: boolean
}

export interface ContactFilters {
  contactType?: ContactType
  search?: string
  tags?: string[]
  limit?: number
  offset?: number
}

// ============================================================
// Thread Types
// ============================================================

export type ThreadType = 'general' | 'project' | 'support' | 'onboarding'
export type ThreadStatus = 'open' | 'snoozed' | 'closed'
export type ThreadPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Thread {
  id: string
  contact: {
    id: string
    name: string
    email: string | null
    phone: string | null
    avatarUrl: string | null
    contactType: ContactType
  }

  threadType: ThreadType
  relatedEntity: {
    type: string
    id: string
    title?: string
  } | null

  subject: string | null
  status: ThreadStatus
  snoozedUntil: Date | null
  priority: ThreadPriority

  assignedTo: {
    id: string
    name: string
    avatarUrl: string | null
  } | null
  assignedAt: Date | null

  lastMessageAt: Date | null
  lastMessageSender: SenderType | null
  lastMessagePreview: string | null
  unreadCount: number

  tags: string[]

  resolvedAt: Date | null
  resolvedBy: { id: string; name: string } | null
  resolutionNotes: string | null

  externalThreadId: string | null
  externalThreadType: string | null

  createdAt: Date
  updatedAt: Date
}

export interface CreateThreadInput {
  contactId: string
  threadType?: ThreadType
  relatedEntityType?: string
  relatedEntityId?: string
  subject?: string
  status?: ThreadStatus
  priority?: ThreadPriority
  tags?: string[]
}

export interface UpdateThreadInput {
  threadType?: ThreadType
  subject?: string
  priority?: ThreadPriority
  tags?: string[]
}

export interface ThreadFilters {
  status?: ThreadStatus
  priority?: ThreadPriority
  assignedTo?: string
  contactId?: string
  threadType?: ThreadType
  relatedEntityType?: string
  relatedEntityId?: string
  search?: string
  limit?: number
  offset?: number
}

// ============================================================
// Message Types
// ============================================================

export type MessageDirection = 'inbound' | 'outbound'
export type SenderType = 'contact' | 'team_member' | 'system' | 'ai'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface Message {
  id: string
  threadId: string

  direction: MessageDirection
  channel: MessageChannel

  subject: string | null
  body: string
  bodyHtml: string | null

  senderType: SenderType
  senderId: string | null

  aiDrafted: boolean
  aiConfidence: number | null
  aiWasEdited: boolean
  originalAiDraft: string | null

  status: MessageStatus
  externalId: string | null
  failedReason: string | null

  sentAt: Date | null
  deliveredAt: Date | null
  readAt: Date | null

  createdAt: Date
}

export interface SendMessageInput {
  channel: MessageChannel
  body: string
  bodyHtml?: string
  subject?: string
}

// ============================================================
// AI Draft Types
// ============================================================

export type AIDraftStatus = 'pending' | 'sent' | 'edited_and_sent' | 'discarded'

export interface AIDraft {
  id: string
  threadId: string

  body: string
  bodyHtml: string | null
  suggestedChannel: MessageChannel

  confidence: number | null
  model: string | null
  promptTokens: number | null
  completionTokens: number | null

  status: AIDraftStatus
  sentMessageId: string | null
  editedContent: string | null

  generatedAt: Date
  actionedAt: Date | null
  actionedBy: { id: string; name: string } | null
}

// ============================================================
// Stats Types
// ============================================================

export interface InboxStats {
  totalThreads: number
  openThreads: number
  snoozedThreads: number
  closedThreads: number
  unreadCount: number
  avgResponseTimeHours: number | null
}

export interface ContactStats {
  totalContacts: number
  byType: Record<ContactType, number>
  recentlyActive: number
}
