/**
 * Email integration for AI Agents
 */

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
} from './sender.js'
