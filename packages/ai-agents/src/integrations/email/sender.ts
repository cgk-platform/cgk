/**
 * Email integration for AI Agents
 * Uses tenant's Resend configuration for sending
 */

import {
  getAgentEmailConfig,
  getAgentByInboundEmail,
  upsertAgentEmailConfig,
  incrementEmailCount,
  getOrCreateEmailConversation,
  updateEmailConversation,
  checkAndIncrementRateLimit,
} from '../db/queries.js'
import { logAction } from '../../actions/logger.js'
import { getAgent } from '../../agents/registry.js'
import type {
  AgentEmailConfig,
  SendAgentEmailParams,
  InboundEmail,
  EmailSendResult,
} from '../types.js'

/**
 * Resend email client interface
 * This will be injected from the tenant's email configuration
 */
export interface EmailClient {
  send(params: {
    from: string
    to: string | string[]
    subject: string
    html: string
    text?: string
    replyTo?: string
    cc?: string[]
    bcc?: string[]
    headers?: Record<string, string>
  }): Promise<{ id: string }>
}

// Email client instance (injected at runtime)
let emailClient: EmailClient | null = null

/**
 * Set the email client for sending
 */
export function setEmailClient(client: EmailClient): void {
  emailClient = client
}

/**
 * Send an email from an agent
 */
export async function sendAgentEmail(
  tenantId: string,
  params: SendAgentEmailParams
): Promise<EmailSendResult> {
  // Get agent's email config
  const config = await getAgentEmailConfig(params.agentId)
  if (!config) {
    return { success: false, error: 'Agent email not configured' }
  }

  // Get agent details
  const agent = await getAgent(params.agentId)
  if (!agent) {
    return { success: false, error: 'Agent not found' }
  }

  // Check rate limits
  const rateLimit = await checkAndIncrementRateLimit(params.agentId, 'email')
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Rate limit exceeded (${rateLimit.limitType}). Try again later.`,
    }
  }

  // Check email-specific limits
  if (config.emailsSentThisHour >= config.maxEmailsPerHour) {
    return { success: false, error: 'Hourly email limit reached' }
  }
  if (config.emailsSentToday >= config.maxEmailsPerDay) {
    return { success: false, error: 'Daily email limit reached' }
  }

  if (!emailClient) {
    return { success: false, error: 'Email client not configured' }
  }

  try {
    // Build from address
    const fromAddress = `${config.senderName} <${config.senderEmail}>`

    // Build headers
    const headers: Record<string, string> = {
      'X-Agent-ID': params.agentId,
      'X-Tenant-ID': tenantId,
      ...params.headers,
    }

    if (params.inReplyTo) {
      headers['In-Reply-To'] = params.inReplyTo
      headers['References'] = params.inReplyTo
    }

    // Send email
    const result = await emailClient.send({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.bodyHtml,
      text: params.bodyText,
      replyTo: params.replyTo || config.replyToEmail || config.senderEmail,
      cc: params.cc,
      bcc: params.bcc,
      headers,
    })

    // Increment email count
    await incrementEmailCount(params.agentId)

    // Log action
    await logAction({
      agentId: params.agentId,
      actionType: 'send_email',
      actionCategory: 'messaging',
      actionDescription: `Sent email: ${params.subject}`,
      inputData: {
        to: params.to,
        subject: params.subject,
        hasAttachments: false,
      },
      outputData: { messageId: result.id },
    })

    return { success: true, messageId: result.id }
  } catch (error) {
    console.error('[email] Failed to send email:', error)

    await logAction({
      agentId: params.agentId,
      actionType: 'send_email',
      actionCategory: 'messaging',
      actionDescription: `Failed to send email: ${params.subject}`,
      inputData: { to: params.to, subject: params.subject },
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Handle inbound email to agent
 */
export async function handleAgentInboundEmail(
  _tenantId: string,
  email: InboundEmail
): Promise<{ processed: boolean; agentId?: string; error?: string }> {
  // Determine which agent this email is for
  const toAddresses = Array.isArray(email.to) ? email.to : [email.to]

  let agentId: string | null = null
  for (const to of toAddresses) {
    const result = await getAgentByInboundEmail(to.toLowerCase())
    if (result) {
      agentId = result.agentId
      break
    }
  }

  if (!agentId) {
    console.log('[email] No agent found for email:', email.to)
    return { processed: false, error: 'No agent configured for this email address' }
  }

  // Get agent config
  const config = await getAgentEmailConfig(agentId)
  if (!config?.inboundEnabled) {
    return { processed: false, error: 'Inbound email not enabled for this agent' }
  }

  // Find or create conversation thread
  const conversation = await getOrCreateEmailConversation(
    agentId,
    email.from,
    email.subject,
    email.inReplyTo
  )

  // Update conversation
  await updateEmailConversation(conversation.id, 'inbound')

  // Log the inbound email
  await logAction({
    agentId,
    actionType: 'receive_email',
    actionCategory: 'messaging',
    actionDescription: `Received email: ${email.subject}`,
    inputData: {
      from: email.from,
      subject: email.subject,
      messageId: email.messageId,
      hasAttachments: (email.attachments?.length || 0) > 0,
    },
    conversationId: conversation.id,
  })

  return { processed: true, agentId }
}

/**
 * Process inbound email with agent and send reply
 * This is called after handleAgentInboundEmail to generate and send a response
 */
export async function processAndReplyToEmail(
  tenantId: string,
  agentId: string,
  email: InboundEmail,
  conversationId: string,
  processor: (params: {
    agentId: string
    message: string
    context: Record<string, unknown>
  }) => Promise<{ text: string; toolsUsed?: string[] }>
): Promise<EmailSendResult> {
  // Get agent config
  const config = await getAgentEmailConfig(agentId)
  if (!config) {
    return { success: false, error: 'Agent email not configured' }
  }

  // Process message with agent
  const response = await processor({
    agentId,
    message: email.textBody || email.htmlBody || '',
    context: {
      channel: 'email',
      subject: email.subject,
      from: email.from,
      conversationId,
    },
  })

  // Format response as HTML
  const htmlBody = formatEmailResponse(response.text)

  // Send reply
  const result = await sendAgentEmail(tenantId, {
    agentId,
    to: email.from,
    subject: `Re: ${email.subject.replace(/^Re:\s*/i, '')}`,
    bodyHtml: htmlBody,
    bodyText: response.text,
    inReplyTo: email.messageId,
  })

  if (result.success) {
    await updateEmailConversation(conversationId, 'outbound')
  }

  return result
}

/**
 * Configure email for an agent
 */
export async function configureAgentEmail(
  agentId: string,
  config: {
    senderEmail: string
    senderName: string
    replyToEmail?: string
    inboundEnabled?: boolean
    inboundAddress?: string
    maxEmailsPerHour?: number
    maxEmailsPerDay?: number
  }
): Promise<AgentEmailConfig> {
  return upsertAgentEmailConfig(agentId, config)
}

/**
 * Get email configuration for an agent
 */
export async function getEmailConfig(agentId: string): Promise<AgentEmailConfig | null> {
  return getAgentEmailConfig(agentId)
}

/**
 * Check if email is configured for an agent
 */
export async function isEmailConfigured(agentId: string): Promise<boolean> {
  const config = await getAgentEmailConfig(agentId)
  return Boolean(config?.senderEmail)
}

/**
 * Get email status for an agent
 */
export async function getEmailStatus(agentId: string): Promise<{
  configured: boolean
  senderEmail?: string
  inboundEnabled?: boolean
  emailsSentToday?: number
  emailsSentThisHour?: number
  dailyLimit?: number
  hourlyLimit?: number
}> {
  const config = await getAgentEmailConfig(agentId)

  if (!config) {
    return { configured: false }
  }

  return {
    configured: true,
    senderEmail: config.senderEmail,
    inboundEnabled: config.inboundEnabled,
    emailsSentToday: config.emailsSentToday,
    emailsSentThisHour: config.emailsSentThisHour,
    dailyLimit: config.maxEmailsPerDay,
    hourlyLimit: config.maxEmailsPerHour,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format agent response as HTML email
 */
function formatEmailResponse(text: string): string {
  // Convert markdown-style formatting to HTML
  let html = text
    // Convert newlines to <br>
    .replace(/\n/g, '<br>')
    // Convert **bold** to <strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Convert `code` to <code>
    .replace(/`(.*?)`/g, '<code>$1</code>')

  // Wrap in a simple HTML template
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
          }
          code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `.trim()
}

/**
 * Extract plain text from HTML email body
 */
export function extractTextFromHtml(html: string): string {
  return html
    // Remove style and script tags
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Convert br and p tags to newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    // Remove all other tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Trim whitespace
    .trim()
}
