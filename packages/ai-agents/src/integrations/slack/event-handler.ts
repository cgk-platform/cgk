/**
 * Slack event handler for AI Agent integrations
 */

import {
  getSlackConfig,
  getOrCreateSlackConversation,
  getSlackUserAssociation,
  upsertSlackUser,
  queueIntegrationEvent,
  checkAndIncrementRateLimit,
} from '../db/queries.js'
import { SlackClient, formatAgentResponse } from './client.js'
import { logAction } from '../../actions/logger.js'
import { getAgent } from '../../agents/registry.js'
import type {
  SlackEvent,
  SlackMessageEvent,
  SlackMentionEvent,
  SlackChannelConfig,
  SlackUserAssociation,
  TenantSlackConfig,
} from '../types.js'

export interface SlackEventContext {
  tenantId: string
  config: TenantSlackConfig
  client: SlackClient
}

export interface ProcessMessageParams {
  tenantId: string
  agentId: string
  message: string
  context: {
    channel: string
    channelType: string
    threadTs?: string
    userId?: string
    conversationId?: string
    platformUser?: SlackUserAssociation | null
  }
  conversationId: string
}

// Message processor callback type - this will be injected from the AI layer
export type MessageProcessor = (params: ProcessMessageParams) => Promise<{
  text: string
  toolsUsed?: string[]
  actions?: Array<{ id: string; label: string; value: string; style?: 'primary' | 'danger' }>
}>

// Default no-op processor (will be replaced by actual AI integration)
let messageProcessor: MessageProcessor = async () => ({
  text: 'Agent processing is not configured.',
})

/**
 * Set the message processor for handling agent responses
 */
export function setMessageProcessor(processor: MessageProcessor): void {
  messageProcessor = processor
}

/**
 * Handle incoming Slack events
 */
export async function handleSlackEvent(
  tenantId: string,
  event: SlackEvent
): Promise<void> {
  // Get tenant's Slack config
  const config = await getSlackConfig()
  if (!config?.enabled) {
    console.log('[slack] Integration disabled or not configured')
    return
  }

  // Create client
  const client = SlackClient.fromTenantConfig(config)
  if (!client) {
    console.error('[slack] Failed to create Slack client - missing bot token')
    return
  }

  const ctx: SlackEventContext = { tenantId, config, client }

  switch (event.type) {
    case 'message':
      if (!event.subtype) {
        // Regular message (not edited, deleted, etc.)
        await handleMessage(ctx, event as SlackMessageEvent)
      }
      break

    case 'app_mention':
      await handleMention(ctx, event as SlackMentionEvent)
      break

    case 'app_home_opened':
      await handleAppHomeOpened(ctx, event)
      break

    default:
      // Queue unknown events for later processing
      await queueIntegrationEvent('slack', event.type, event as Record<string, unknown>)
  }
}

/**
 * Handle regular messages
 */
async function handleMessage(
  ctx: SlackEventContext,
  event: SlackMessageEvent
): Promise<void> {
  // Skip bot messages
  if (event.bot_id) return

  // Check if this is a DM to an agent
  const isDM = event.channel_type === 'im'

  if (!isDM) {
    // Check channel configuration for whether to respond
    const channelConfig = ctx.config.channelConfig?.[event.channel] as
      | SlackChannelConfig[string]
      | undefined
    if (!channelConfig?.respondToAll) {
      // Only respond in channels configured for all messages
      return
    }
  }

  // Determine which agent should respond
  const agentId = await determineAgent(ctx, event.channel, event.user)
  if (!agentId) {
    console.log('[slack] No agent configured for this channel')
    return
  }

  // Check rate limits
  const rateLimit = await checkAndIncrementRateLimit(agentId, 'slack')
  if (!rateLimit.allowed) {
    console.log(`[slack] Rate limited for agent ${agentId} (${rateLimit.limitType})`)
    await ctx.client.addReaction(event.channel, event.ts, 'hourglass_flowing_sand')
    return
  }

  // Resolve Slack user to platform user
  const platformUser = await resolveSlackUser(ctx, event.user)

  // Get or create conversation
  const conversation = await getOrCreateSlackConversation(
    agentId,
    event.channel,
    event.thread_ts || null,
    event.channel_type,
    event.user
  )

  // Add thinking reaction
  await ctx.client.addReaction(event.channel, event.ts, 'thinking_face').catch(() => {
    // Ignore reaction errors
  })

  try {
    // Process message with agent
    const response = await messageProcessor({
      tenantId: ctx.tenantId,
      agentId,
      message: event.text,
      context: {
        channel: event.channel,
        channelType: event.channel_type,
        threadTs: event.thread_ts,
        userId: platformUser?.platformUserId || undefined,
        conversationId: conversation.id,
        platformUser,
      },
      conversationId: event.thread_ts || event.ts,
    })

    // Format and send response
    const formatted = formatAgentResponse({
      text: response.text,
      actions: response.actions,
      showFeedback: true,
    })

    await ctx.client.postMessage({
      channel: event.channel,
      text: formatted.text,
      thread_ts: event.thread_ts || event.ts,
      blocks: formatted.blocks,
    })

    // Log action
    await logAction({
      agentId,
      actionType: 'slack_message',
      actionCategory: 'messaging',
      actionDescription: `Responded to message in ${isDM ? 'DM' : 'channel'}`,
      inputData: { message: event.text, channel: event.channel },
      outputData: { response: response.text },
      toolsUsed: response.toolsUsed,
      conversationId: conversation.id,
    })
  } catch (error) {
    console.error('[slack] Error processing message:', error)
    await ctx.client.addReaction(event.channel, event.ts, 'x').catch(() => {})
    throw error
  }
}

/**
 * Handle @mentions
 */
async function handleMention(
  ctx: SlackEventContext,
  event: SlackMentionEvent
): Promise<void> {
  // Determine which agent was mentioned
  const agentId = await determineAgent(ctx, event.channel, event.user)
  if (!agentId) {
    console.log('[slack] No agent configured for mention handling')
    return
  }

  // Check rate limits
  const rateLimit = await checkAndIncrementRateLimit(agentId, 'slack')
  if (!rateLimit.allowed) {
    console.log(`[slack] Rate limited for agent ${agentId}`)
    return
  }

  // Check channel config for mention handling
  const channelConfig = ctx.config.channelConfig?.[event.channel] as
    | SlackChannelConfig[string]
    | undefined
  if (channelConfig && channelConfig.respondToMentions === false) {
    return
  }

  // Resolve Slack user
  const platformUser = await resolveSlackUser(ctx, event.user)

  // Get or create conversation
  const conversation = await getOrCreateSlackConversation(
    agentId,
    event.channel,
    event.thread_ts || null,
    'channel',
    event.user
  )

  // Strip the mention from the text
  const mentionPattern = /<@[A-Z0-9]+>/g
  const cleanText = event.text.replace(mentionPattern, '').trim()

  try {
    // Process message with agent
    const response = await messageProcessor({
      tenantId: ctx.tenantId,
      agentId,
      message: cleanText,
      context: {
        channel: event.channel,
        channelType: 'channel',
        threadTs: event.thread_ts,
        userId: platformUser?.platformUserId || undefined,
        conversationId: conversation.id,
        platformUser,
      },
      conversationId: event.thread_ts || event.ts,
    })

    // Send response
    const formatted = formatAgentResponse({
      text: response.text,
      actions: response.actions,
    })

    await ctx.client.postMessage({
      channel: event.channel,
      text: formatted.text,
      thread_ts: event.thread_ts || event.ts,
      blocks: formatted.blocks,
    })

    // Log action
    await logAction({
      agentId,
      actionType: 'slack_mention_response',
      actionCategory: 'messaging',
      actionDescription: `Responded to mention in channel`,
      inputData: { message: cleanText, channel: event.channel },
      outputData: { response: response.text },
      toolsUsed: response.toolsUsed,
      conversationId: conversation.id,
    })
  } catch (error) {
    console.error('[slack] Error handling mention:', error)
    throw error
  }
}

/**
 * Handle app home opened events
 */
async function handleAppHomeOpened(
  ctx: SlackEventContext,
  event: SlackEvent
): Promise<void> {
  const userId = event.user as string
  if (!userId) return

  // Get default agent for app home
  const agentId = ctx.config.defaultAgentId
  if (!agentId) return

  const agent = await getAgent(agentId)
  if (!agent) return

  // Build app home view
  const view = {
    type: 'home',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Hello! I'm ${agent.displayName}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: agent.role,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*How can I help you?*\n\nYou can message me directly or mention me in a channel.',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Start a conversation', emoji: true },
            action_id: 'start_conversation',
            style: 'primary',
          },
        ],
      },
    ],
  }

  await ctx.client.publishAppHome(userId, view)
}

/**
 * Determine which agent should handle a message
 */
async function determineAgent(
  ctx: SlackEventContext,
  channelId: string,
  _userId?: string
): Promise<string | null> {
  // Check channel-specific agent mapping
  const channelConfig = ctx.config.channelConfig?.[channelId] as
    | SlackChannelConfig[string]
    | undefined
  if (channelConfig?.agentId) {
    return channelConfig.agentId
  }

  // Fall back to default agent
  return ctx.config.defaultAgentId
}

/**
 * Resolve Slack user to platform user
 */
async function resolveSlackUser(
  ctx: SlackEventContext,
  slackUserId: string
): Promise<SlackUserAssociation | null> {
  // Check if we already have this user
  let association = await getSlackUserAssociation(slackUserId)

  // If not cached recently, fetch from Slack and update
  const cacheAge = association?.slackCachedAt
    ? Date.now() - new Date(association.slackCachedAt).getTime()
    : Infinity

  // Refresh cache after 24 hours
  if (cacheAge > 24 * 60 * 60 * 1000) {
    try {
      const userInfo = await ctx.client.getUserInfo(slackUserId)

      association = await upsertSlackUser(slackUserId, {
        slackUsername: userInfo.name,
        slackDisplayName: userInfo.real_name,
        slackEmail: userInfo.profile.email,
        slackProfileCached: userInfo.profile as Record<string, unknown>,
        slackCachedAt: new Date(),
        // Try to auto-associate by email
        associationMethod:
          association?.associationMethod || (userInfo.profile.email ? 'auto' : undefined),
      })
    } catch (error) {
      console.warn('[slack] Failed to fetch user info:', error)
    }
  }

  return association
}

/**
 * Build conversation context from Slack history
 */
export async function buildConversationContext(
  ctx: SlackEventContext,
  channelId: string,
  threadTs?: string,
  maxMessages: number = 10
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

  try {
    // Get thread replies if in a thread, otherwise get channel history
    const history = threadTs
      ? await ctx.client.getThreadReplies(channelId, threadTs, { limit: maxMessages })
      : await ctx.client.getConversationHistory(channelId, { limit: maxMessages })

    // Convert to conversation format (oldest first)
    const orderedMessages = [...history.messages].reverse()

    for (const msg of orderedMessages) {
      if (msg.bot_id) {
        messages.push({ role: 'assistant', content: msg.text })
      } else if (msg.user) {
        messages.push({ role: 'user', content: msg.text })
      }
    }
  } catch (error) {
    console.warn('[slack] Failed to build conversation context:', error)
  }

  return messages
}
