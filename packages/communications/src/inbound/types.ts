/**
 * Inbound Email Types
 *
 * @ai-pattern inbound-email
 * @ai-note Types for inbound email processing, threading, and auto-responses
 */

// ============================================================================
// Email Types
// ============================================================================

/**
 * Purpose of an inbound email address
 */
export type InboundAddressPurpose =
  | 'treasury'
  | 'receipts'
  | 'support'
  | 'creator'
  | 'general'

/**
 * Processing status for inbound emails
 */
export type InboundProcessingStatus = 'pending' | 'processed' | 'failed' | 'ignored'

/**
 * Email type classification
 */
export type InboundEmailType =
  | 'treasury_approval'
  | 'receipt'
  | 'support'
  | 'creator_reply'
  | 'unknown'

/**
 * Parsed attachment from webhook
 */
export interface InboundAttachment {
  filename: string
  contentType: string
  sizeBytes: number
  content?: Buffer | string // Base64 or raw content
  blobUrl?: string // After storage
}

/**
 * Parsed inbound email from webhook
 */
export interface InboundEmail {
  id?: string
  from: string
  fromName?: string
  to: string
  subject?: string
  bodyText?: string
  bodyHtml?: string
  messageId?: string
  inReplyTo?: string
  references?: string[]
  attachments?: InboundAttachment[]
  rawPayload?: Record<string, unknown>
  resendEmailId?: string
  receivedAt: Date
}

/**
 * Inbound email log entry from database
 */
export interface InboundEmailLog {
  id: string
  fromAddress: string
  fromName: string | null
  toAddress: string
  subject: string | null
  bodyText: string | null
  bodyHtml: string | null
  attachments: InboundAttachment[]
  messageId: string | null
  inReplyTo: string | null
  referencesList: string[] | null
  emailType: InboundEmailType
  inboundAddressId: string | null
  processingStatus: InboundProcessingStatus
  processingError: string | null
  processedAt: Date | null
  linkedRecordType: string | null
  linkedRecordId: string | null
  rawPayload: Record<string, unknown> | null
  resendEmailId: string | null
  isAutoReply: boolean
  isSpam: boolean
  spamScore: number | null
  receivedAt: Date
  createdAt: Date
}

/**
 * Input for logging an inbound email
 */
export interface LogInboundEmailInput {
  fromAddress: string
  fromName?: string
  toAddress: string
  subject?: string
  bodyText?: string
  bodyHtml?: string
  attachments?: InboundAttachment[]
  messageId?: string
  inReplyTo?: string
  referencesList?: string[]
  emailType: InboundEmailType
  inboundAddressId?: string
  rawPayload?: Record<string, unknown>
  resendEmailId?: string
  isAutoReply?: boolean
  isSpam?: boolean
  spamScore?: number
}

// ============================================================================
// Treasury Approval Types
// ============================================================================

/**
 * Approval status from parsing
 */
export type ApprovalStatus = 'approved' | 'rejected' | 'unclear'

/**
 * Confidence level for approval parsing
 */
export type ApprovalConfidence = 'high' | 'medium' | 'low'

/**
 * Result of parsing treasury approval email
 */
export interface ApprovalParseResult {
  status: ApprovalStatus
  confidence: ApprovalConfidence
  matchedKeywords: string[]
  isAutoReply: boolean
}

/**
 * Treasury communication record
 */
export interface TreasuryCommunication {
  id: string
  treasuryRequestId: string | null
  direction: 'inbound' | 'outbound'
  channel: 'email' | 'slack' | 'manual'
  fromAddress: string | null
  toAddress: string | null
  subject: string | null
  body: string | null
  parsedApprovalStatus: ApprovalStatus | null
  parsedConfidence: ApprovalConfidence | null
  matchedKeywords: string[] | null
  messageId: string | null
  inReplyTo: string | null
  inboundEmailId: string | null
  processedAt: Date | null
  processedBy: string | null
  createdAt: Date
}

/**
 * Input for creating treasury communication
 */
export interface CreateTreasuryCommunicationInput {
  treasuryRequestId?: string
  direction: 'inbound' | 'outbound'
  channel: 'email' | 'slack' | 'manual'
  fromAddress?: string
  toAddress?: string
  subject?: string
  body?: string
  parsedApprovalStatus?: ApprovalStatus
  parsedConfidence?: ApprovalConfidence
  matchedKeywords?: string[]
  messageId?: string
  inReplyTo?: string
  inboundEmailId?: string
  processedBy?: string
}

// ============================================================================
// Treasury Receipt Types
// ============================================================================

/**
 * Receipt processing status
 */
export type ReceiptStatus = 'pending' | 'processed' | 'archived' | 'rejected'

/**
 * Stored receipt attachment
 */
export interface StoredAttachment {
  filename: string
  contentType: string
  blobUrl: string
  sizeBytes: number
}

/**
 * Treasury receipt record
 */
export interface TreasuryReceipt {
  id: string
  inboundEmailId: string | null
  fromAddress: string
  subject: string | null
  body: string | null
  attachments: StoredAttachment[]
  status: ReceiptStatus
  linkedExpenseId: string | null
  vendorName: string | null
  description: string | null
  amountCents: number | null
  currency: string
  expenseCategoryId: string | null
  receiptDate: string | null
  notes: string | null
  processedBy: string | null
  processedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating treasury receipt
 */
export interface CreateTreasuryReceiptInput {
  inboundEmailId?: string
  fromAddress: string
  subject?: string
  body?: string
  attachments: StoredAttachment[]
  status?: ReceiptStatus
}

/**
 * Input for updating treasury receipt
 */
export interface UpdateTreasuryReceiptInput {
  status?: ReceiptStatus
  linkedExpenseId?: string
  vendorName?: string
  description?: string
  amountCents?: number
  currency?: string
  expenseCategoryId?: string
  receiptDate?: string
  notes?: string
  processedBy?: string
}

/**
 * Result of processing receipt email
 */
export interface ProcessedReceipt {
  receiptId: string
  attachments: StoredAttachment[]
}

// ============================================================================
// Thread Types
// ============================================================================

/**
 * Contact type for threading
 */
export type ContactType = 'creator' | 'customer' | 'vendor' | 'unknown'

/**
 * Thread status
 */
export type ThreadStatus = 'open' | 'closed' | 'pending'

/**
 * Email thread record
 */
export interface EmailThread {
  id: string
  contactType: ContactType
  contactId: string | null
  contactEmail: string
  contactName: string | null
  subject: string | null
  status: ThreadStatus
  messageCount: number
  lastMessageAt: Date | null
  lastInboundAt: Date | null
  lastOutboundAt: Date | null
  assignedTo: string | null
  tags: string[] | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating thread
 */
export interface CreateThreadInput {
  contactType: ContactType
  contactId?: string
  contactEmail: string
  contactName?: string
  subject?: string
  status?: ThreadStatus
}

/**
 * Thread message record
 */
export interface ThreadMessage {
  id: string
  threadId: string
  direction: 'inbound' | 'outbound'
  fromAddress: string
  toAddress: string | null
  subject: string | null
  bodyText: string | null
  bodyHtml: string | null
  attachments: InboundAttachment[]
  messageId: string | null
  inReplyTo: string | null
  inboundEmailId: string | null
  queueEntryId: string | null
  queueType: string | null
  status: 'received' | 'sent' | 'failed'
  createdAt: Date
}

/**
 * Input for creating thread message
 */
export interface CreateThreadMessageInput {
  threadId: string
  direction: 'inbound' | 'outbound'
  fromAddress: string
  toAddress?: string
  subject?: string
  bodyText?: string
  bodyHtml?: string
  attachments?: InboundAttachment[]
  messageId?: string
  inReplyTo?: string
  inboundEmailId?: string
  queueEntryId?: string
  queueType?: string
}

/**
 * Result of matching email to thread
 */
export interface MatchedThread {
  threadId: string
  contactId: string | null
  contactType: ContactType
  isNewThread: boolean
}

// ============================================================================
// Auto-Response Types
// ============================================================================

/**
 * Condition operator for auto-response rules
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches_regex'

/**
 * Field to match against
 */
export type ConditionField = 'from_address' | 'to_address' | 'subject' | 'body_text'

/**
 * Rule condition
 */
export interface RuleCondition {
  field: ConditionField
  operator: ConditionOperator
  value: string
  caseSensitive?: boolean
}

/**
 * Auto-response rule
 */
export interface AutoResponseRule {
  id: string
  name: string
  description: string | null
  isEnabled: boolean
  matchType: 'all' | 'any'
  conditions: RuleCondition[]
  responseTemplateId: string | null
  responseDelayMinutes: number
  responseSubject: string | null
  responseBody: string | null
  maxResponsesPerSender: number
  cooldownHours: number
  priority: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating auto-response rule
 */
export interface CreateAutoResponseRuleInput {
  name: string
  description?: string
  isEnabled?: boolean
  matchType: 'all' | 'any'
  conditions: RuleCondition[]
  responseTemplateId?: string
  responseDelayMinutes?: number
  responseSubject?: string
  responseBody?: string
  maxResponsesPerSender?: number
  cooldownHours?: number
  priority?: number
}

/**
 * Auto-response log entry
 */
export interface AutoResponseLog {
  id: string
  ruleId: string
  inboundEmailId: string
  responseSentAt: Date | null
  responseMessageId: string | null
  responseStatus: 'pending' | 'sent' | 'failed'
  senderEmail: string
  createdAt: Date
}

// ============================================================================
// Inbound Address Lookup
// ============================================================================

/**
 * Inbound address with tenant info
 */
export interface InboundAddressInfo {
  id: string
  tenantId: string
  tenantSlug: string
  emailAddress: string
  purpose: InboundAddressPurpose
  displayName: string
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filters for inbound email list
 */
export interface InboundEmailFilters {
  page?: number
  limit?: number
  emailType?: InboundEmailType
  processingStatus?: InboundProcessingStatus
  fromAddress?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

/**
 * Filters for treasury receipts
 */
export interface ReceiptFilters {
  page?: number
  limit?: number
  status?: ReceiptStatus
  fromAddress?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

/**
 * Filters for threads
 */
export interface ThreadFilters {
  page?: number
  limit?: number
  contactType?: ContactType
  status?: ThreadStatus
  assignedTo?: string
  search?: string
}
