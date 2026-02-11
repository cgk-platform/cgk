/**
 * Slack integration for AI Agents
 */

// Client
export { SlackClient, buildSlackBlocks, buildActionButton, formatAgentResponse } from './client.js'

// Event Handler
export {
  handleSlackEvent,
  setMessageProcessor,
  buildConversationContext,
  type ProcessMessageParams,
  type MessageProcessor,
} from './event-handler.js'

// Interactions
export { handleSlackInteraction, sendApprovalRequestToSlack } from './interactions.js'

// OAuth
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
} from './oauth.js'
