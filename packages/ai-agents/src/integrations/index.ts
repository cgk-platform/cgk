/**
 * AI Agent Integrations
 * Multi-channel integration system for Slack, Google Calendar, Email, and SMS
 */

// Types
export * from './types.js'

// Database queries
export {
  // Slack
  getSlackConfig,
  upsertSlackConfig,
  updateSlackChannelConfig,
  getAgentSlackApp,
  upsertAgentSlackApp,
  getSlackUserAssociation,
  getSlackUserByEmail,
  upsertSlackUser,
  getOrCreateSlackConversation,
  getSlackConversation,
  updateSlackConversationContext,
  // Google Calendar
  getAgentGoogleOAuth,
  getGoogleOAuthByChannelId,
  upsertAgentGoogleOAuth,
  updateAgentGoogleOAuthTokens,
  updateAgentGoogleOAuthWatch,
  getExpiringCalendarWatches,
  upsertCalendarEvent,
  getAgentUpcomingEvents,
  deleteCalendarEvent,
  // Email
  getAgentEmailConfig,
  getAgentByInboundEmail,
  upsertAgentEmailConfig,
  incrementEmailCount,
  getOrCreateEmailConversation,
  updateEmailConversation,
  // SMS
  getSMSConfig,
  upsertSMSConfig,
  getAgentPhoneNumber,
  getOrCreateSMSConversation,
  getSMSConversation,
  updateSMSConversationOptOut,
  createSMSMessage,
  updateSMSMessageStatus,
  // Event Queue
  queueIntegrationEvent,
  getPendingIntegrationEvents,
  updateIntegrationEventStatus,
  // Rate Limiting
  checkAndIncrementRateLimit,
  getRateLimitStatus,
  updateRateLimits,
} from './db/queries.js'

// Encryption utilities
export { encrypt, decrypt, safeDecrypt, generateEncryptionKey, hashForLookup } from './utils/encryption.js'

// Slack
export {
  SlackClient,
  buildSlackBlocks,
  buildActionButton,
  formatAgentResponse,
} from './slack/client.js'
export {
  handleSlackEvent,
  setMessageProcessor,
  buildConversationContext,
  type ProcessMessageParams,
  type MessageProcessor,
} from './slack/event-handler.js'
export { handleSlackInteraction, sendApprovalRequestToSlack } from './slack/interactions.js'
export {
  generateSlackAuthUrl,
  exchangeSlackOAuthCode,
  completeSlackOAuth,
  revokeSlackTokens,
  testSlackConnection,
  isSlackConfigured,
  getSlackInstallationStatus,
  DEFAULT_SLACK_SCOPES,
  type SlackOAuthConfig,
  type SlackOAuthResult,
} from './slack/oauth.js'

// Google Calendar
export {
  GoogleCalendarClient,
  GOOGLE_CALENDAR_SCOPES,
  generateGoogleAuthUrl,
  exchangeGoogleOAuthCode,
  completeGoogleOAuth,
  refreshGoogleTokens,
  handleCalendarWebhook,
  isGoogleCalendarConnected,
  getGoogleCalendarStatus,
  type GoogleOAuthConfig,
  type GoogleTokens,
} from './google/calendar.js'

// Email
export {
  sendAgentEmail,
  handleAgentInboundEmail,
  processAndReplyToEmail,
  configureAgentEmail,
  getEmailConfig,
  isEmailConfigured,
  getEmailStatus,
  setEmailClient,
  extractTextFromHtml,
  type EmailClient,
} from './email/sender.js'

// SMS
export {
  SMSIntegration,
  configureSMS,
  getSMSStatus,
  isSMSConfigured,
  addPhoneNumber,
  createSMSIntegration,
  generateEmptyTwiML,
  generateMessageTwiML,
} from './sms/handler.js'

// Event Router
export {
  routeEvent,
  processEventQueue,
  getIntegrationStatus,
  determineAgentForEvent,
  createEventRouter,
  type EventRouterConfig,
  type RouteResult,
} from './router.js'
