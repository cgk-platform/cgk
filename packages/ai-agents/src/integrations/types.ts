/**
 * Types for AI Agent integrations (Slack, Google Calendar, Email, SMS)
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export type IntegrationChannel = 'slack' | 'google_calendar' | 'email' | 'sms'

export type IntegrationEventStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface IntegrationEvent {
  id: string
  channel: IntegrationChannel
  eventType: string
  agentId: string | null
  rawPayload: Record<string, unknown>
  processedPayload: Record<string, unknown> | null
  status: IntegrationEventStatus
  attempts: number
  maxAttempts: number
  lastError: string | null
  receivedAt: Date
  processedAt: Date | null
  nextRetryAt: Date | null
  createdAt: Date
}

export interface ChannelRateLimit {
  id: string
  agentId: string
  channel: IntegrationChannel
  maxPerMinute: number
  maxPerHour: number
  maxPerDay: number
  countThisMinute: number
  countThisHour: number
  countThisDay: number
  minuteResetAt: Date
  hourResetAt: Date
  dayResetAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  limitType?: 'minute' | 'hour' | 'day'
}

// ============================================================================
// SLACK TYPES
// ============================================================================

export interface TenantSlackConfig {
  id: string
  slackClientId: string
  slackClientSecretEncrypted: string
  slackSigningSecretEncrypted: string
  slackAppId: string | null
  slackBotTokenEncrypted: string | null
  slackUserTokenEncrypted: string | null
  slackBotUserId: string | null
  slackTeamId: string | null
  slackTeamName: string | null
  enabled: boolean
  defaultAgentId: string | null
  channelConfig: SlackChannelConfig
  installedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface SlackChannelConfig {
  [channelId: string]: {
    agentId?: string
    respondToMentions?: boolean
    respondToAll?: boolean
    respondToDMs?: boolean
  }
}

export interface AgentSlackApp {
  id: string
  agentId: string
  slackClientId: string | null
  slackClientSecretEncrypted: string | null
  slackAppId: string | null
  slackAppName: string | null
  slackBotUserId: string | null
  botTokenEncrypted: string | null
  appTokenEncrypted: string | null
  signingSecretEncrypted: string | null
  manifestJson: Record<string, unknown> | null
  manifestVersion: number
  status: 'pending' | 'active' | 'error' | 'disabled'
  lastVerifiedAt: Date | null
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SlackUserAssociation {
  id: string
  slackUserId: string
  slackUsername: string | null
  slackDisplayName: string | null
  slackEmail: string | null
  platformUserId: string | null
  creatorId: string | null
  associationMethod: 'auto' | 'manual' | 'verified' | null
  associatedAt: Date | null
  verifiedAt: Date | null
  slackProfileCached: Record<string, unknown> | null
  slackCachedAt: Date | null
  createdAt: Date
}

export interface SlackConversation {
  id: string
  agentId: string
  slackChannelId: string
  slackThreadTs: string | null
  slackChannelType: 'im' | 'mpim' | 'channel' | 'private_channel' | null
  startedBySlackUserId: string | null
  startedAt: Date
  lastMessageAt: Date | null
  messageCount: number
  isActive: boolean
  contextSummary: string | null
  metadata: Record<string, unknown>
  createdAt: Date
}

// Slack API types
export interface SlackEvent {
  type: string
  subtype?: string
  channel?: string
  channel_type?: string
  user?: string
  text?: string
  ts?: string
  thread_ts?: string
  bot_id?: string
  team?: string
  event_ts?: string
  [key: string]: unknown
}

export interface SlackMessageEvent extends SlackEvent {
  type: 'message'
  channel: string
  user: string
  text: string
  ts: string
  thread_ts?: string
  channel_type: string
}

export interface SlackMentionEvent extends SlackEvent {
  type: 'app_mention'
  channel: string
  user: string
  text: string
  ts: string
  thread_ts?: string
}

export interface SlackInteractionPayload {
  type: 'block_actions' | 'view_submission' | 'shortcut' | 'message_action'
  user: {
    id: string
    username: string
    team_id: string
  }
  trigger_id: string
  team: { id: string; domain: string }
  channel?: { id: string; name: string }
  message?: { ts: string; text: string }
  actions?: SlackBlockAction[]
  view?: SlackView
  response_url?: string
  [key: string]: unknown
}

export interface SlackBlockAction {
  action_id: string
  block_id: string
  type: string
  value?: string
  selected_option?: { value: string; text: { text: string } }
  [key: string]: unknown
}

export interface SlackView {
  id: string
  type: string
  callback_id?: string
  state?: {
    values: Record<string, Record<string, { value?: string; selected_option?: { value: string } }>>
  }
  private_metadata?: string
  [key: string]: unknown
}

export interface SlackInteractionResponse {
  ok?: boolean
  response_action?: 'push' | 'update' | 'clear' | 'errors'
  view?: SlackView
  errors?: Record<string, string>
}

export interface SlackMessage {
  channel: string
  text: string
  thread_ts?: string
  blocks?: SlackBlock[]
  mrkdwn?: boolean
  unfurl_links?: boolean
  unfurl_media?: boolean
}

export interface SlackBlock {
  type: string
  block_id?: string
  text?: { type: string; text: string; emoji?: boolean }
  elements?: SlackBlockElement[]
  accessory?: SlackBlockElement
  [key: string]: unknown
}

export interface SlackBlockElement {
  type: string
  action_id?: string
  text?: { type: string; text: string; emoji?: boolean }
  value?: string
  url?: string
  style?: 'primary' | 'danger'
  [key: string]: unknown
}

// ============================================================================
// GOOGLE CALENDAR TYPES
// ============================================================================

export interface AgentGoogleOAuth {
  id: string
  agentId: string
  accessTokenEncrypted: string
  refreshTokenEncrypted: string
  tokenExpiry: Date
  googleEmail: string
  googleAccountId: string | null
  scopes: string[]
  watchChannelId: string | null
  watchResourceId: string | null
  watchExpiration: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AgentCalendarEvent {
  id: string
  agentId: string
  googleEventId: string
  googleCalendarId: string
  summary: string | null
  description: string | null
  startTime: Date
  endTime: Date
  location: string | null
  timezone: string | null
  meetLink: string | null
  conferenceType: string | null
  organizerEmail: string | null
  attendees: CalendarAttendee[]
  status: 'confirmed' | 'tentative' | 'cancelled'
  isAgentInvited: boolean
  etag: string | null
  syncedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface CalendarAttendee {
  email: string
  displayName?: string
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  organizer?: boolean
  self?: boolean
}

export interface CreateCalendarEventParams {
  calendarId?: string
  summary: string
  description?: string
  startTime: Date
  endTime: Date
  location?: string
  timezone?: string
  attendees?: string[]
  addMeet?: boolean
  sendNotifications?: boolean
}

export interface CalendarEventResult {
  id: string
  summary: string | null
  startTime: Date
  endTime: Date
  meetLink?: string | null
  htmlLink?: string
}

// ============================================================================
// EMAIL TYPES
// ============================================================================

export interface AgentEmailConfig {
  id: string
  agentId: string
  senderEmail: string
  senderName: string
  replyToEmail: string | null
  inboundEnabled: boolean
  inboundAddress: string | null
  maxEmailsPerHour: number
  maxEmailsPerDay: number
  emailsSentToday: number
  emailsSentThisHour: number
  lastEmailAt: Date | null
  lastResetAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface AgentEmailConversation {
  id: string
  agentId: string
  threadId: string | null
  subject: string
  contactEmail: string
  contactName: string | null
  creatorId: string | null
  platformUserId: string | null
  lastMessageAt: Date | null
  lastDirection: 'inbound' | 'outbound' | null
  messageCount: number
  isActive: boolean
  createdAt: Date
}

export interface SendAgentEmailParams {
  agentId: string
  to: string | string[]
  subject: string
  bodyHtml: string
  bodyText?: string
  replyTo?: string
  inReplyTo?: string
  cc?: string[]
  bcc?: string[]
  headers?: Record<string, string>
}

export interface InboundEmail {
  messageId: string
  from: string
  fromName?: string
  to: string | string[]
  cc?: string[]
  subject: string
  textBody?: string
  htmlBody?: string
  inReplyTo?: string
  references?: string[]
  date: Date
  attachments?: EmailAttachment[]
}

export interface EmailAttachment {
  filename: string
  contentType: string
  size: number
  content?: Buffer
  url?: string
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

// ============================================================================
// SMS TYPES
// ============================================================================

export interface TenantSMSConfig {
  id: string
  provider: 'twilio' | 'telnyx'
  twilioAccountSidEncrypted: string | null
  twilioAuthTokenEncrypted: string | null
  phoneNumbers: SMSPhoneNumber[]
  defaultPhoneNumber: string | null
  defaultAgentId: string | null
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SMSPhoneNumber {
  number: string
  agentId?: string
  purpose?: string
  messagingServiceSid?: string
}

export interface AgentSMSConversation {
  id: string
  agentId: string
  agentPhoneNumber: string
  contactPhoneNumber: string
  contactId: string | null
  contactName: string | null
  lastMessageAt: Date | null
  lastMessageDirection: 'inbound' | 'outbound' | null
  messageCount: number
  optedOut: boolean
  optedOutAt: Date | null
  createdAt: Date
}

export interface AgentSMSMessage {
  id: string
  conversationId: string
  direction: 'inbound' | 'outbound'
  fromNumber: string
  toNumber: string
  body: string
  mediaUrls: string[]
  providerMessageId: string | null
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered'
  errorCode: string | null
  errorMessage: string | null
  agentResponseTo: string | null
  sentAt: Date | null
  deliveredAt: Date | null
  createdAt: Date
}

export interface SendSMSParams {
  agentId: string
  to: string
  body: string
  mediaUrls?: string[]
}

export interface SMSResult {
  success: boolean
  messageSid?: string
  status?: string
  error?: string
}

export interface TwilioWebhookPayload {
  MessageSid: string
  AccountSid: string
  From: string
  To: string
  Body: string
  NumMedia?: string
  MediaUrl0?: string
  MediaContentType0?: string
  SmsStatus?: string
  ErrorCode?: string
  ErrorMessage?: string
  [key: string]: string | undefined
}
