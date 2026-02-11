/**
 * Slack API client for AI Agent integrations
 */

import * as crypto from 'node:crypto'
import { safeDecrypt } from '../utils/encryption.js'
import type {
  SlackBlock,
  SlackMessage,
  TenantSlackConfig,
  AgentSlackApp,
} from '../types.js'

const SLACK_API_BASE = 'https://slack.com/api'

export interface SlackClientConfig {
  botToken: string
  signingSecret?: string
}

export interface SlackAPIResponse<_T = unknown> {
  ok: boolean
  error?: string
  warning?: string
  response_metadata?: { next_cursor?: string }
  [key: string]: unknown
}

/**
 * Slack API client
 */
export class SlackClient {
  private botToken: string
  private signingSecret?: string

  constructor(config: SlackClientConfig) {
    this.botToken = config.botToken
    this.signingSecret = config.signingSecret
  }

  /**
   * Create a client from tenant Slack config
   */
  static fromTenantConfig(config: TenantSlackConfig): SlackClient | null {
    const botToken = safeDecrypt(config.slackBotTokenEncrypted)
    if (!botToken) return null

    const signingSecret = safeDecrypt(config.slackSigningSecretEncrypted)

    return new SlackClient({ botToken, signingSecret: signingSecret || undefined })
  }

  /**
   * Create a client from agent Slack app config
   */
  static fromAgentApp(app: AgentSlackApp): SlackClient | null {
    const botToken = safeDecrypt(app.botTokenEncrypted)
    if (!botToken) return null

    const signingSecret = safeDecrypt(app.signingSecretEncrypted)

    return new SlackClient({ botToken, signingSecret: signingSecret || undefined })
  }

  /**
   * Verify Slack request signature
   */
  verifySignature(
    signature: string,
    timestamp: string,
    body: string
  ): boolean {
    if (!this.signingSecret) {
      console.warn('[slack] No signing secret configured, skipping verification')
      return true
    }

    // Check timestamp to prevent replay attacks (5 minutes)
    const currentTime = Math.floor(Date.now() / 1000)
    const requestTime = parseInt(timestamp, 10)
    if (Math.abs(currentTime - requestTime) > 300) {
      return false
    }

    const sigBasestring = `v0:${timestamp}:${body}`
    const expectedSignature = `v0=${crypto
      .createHmac('sha256', this.signingSecret)
      .update(sigBasestring, 'utf8')
      .digest('hex')}`

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Make an API request to Slack
   */
  private async api<T>(
    method: string,
    payload?: Record<string, unknown>
  ): Promise<SlackAPIResponse<T>> {
    const response = await fetch(`${SLACK_API_BASE}/${method}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as SlackAPIResponse<T>

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`)
    }

    return data
  }

  /**
   * Post a message to a channel
   */
  async postMessage(message: SlackMessage): Promise<{ ts: string; channel: string }> {
    const response = await this.api<{ ts: string; channel: string }>('chat.postMessage', {
      channel: message.channel,
      text: message.text,
      thread_ts: message.thread_ts,
      blocks: message.blocks,
      mrkdwn: message.mrkdwn ?? true,
      unfurl_links: message.unfurl_links ?? false,
      unfurl_media: message.unfurl_media ?? true,
    })

    return { ts: response.ts as string, channel: response.channel as string }
  }

  /**
   * Update an existing message
   */
  async updateMessage(
    channel: string,
    ts: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<void> {
    await this.api('chat.update', { channel, ts, text, blocks })
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(channel: string, ts: string, emoji: string): Promise<void> {
    await this.api('reactions.add', { channel, timestamp: ts, name: emoji })
  }

  /**
   * Get user info
   */
  async getUserInfo(userId: string): Promise<{
    id: string
    name: string
    real_name: string
    profile: {
      email?: string
      display_name?: string
      image_48?: string
    }
  }> {
    const response = await this.api<{ user: unknown }>('users.info', { user: userId })
    return response.user as ReturnType<SlackClient['getUserInfo']> extends Promise<infer T> ? T : never
  }

  /**
   * Get conversation (channel/DM) info
   */
  async getConversationInfo(channelId: string): Promise<{
    id: string
    name?: string
    is_channel: boolean
    is_group: boolean
    is_im: boolean
    is_private: boolean
  }> {
    const response = await this.api<{ channel: unknown }>('conversations.info', {
      channel: channelId,
    })
    return response.channel as ReturnType<SlackClient['getConversationInfo']> extends Promise<infer T> ? T : never
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    channelId: string,
    options: {
      limit?: number
      oldest?: string
      latest?: string
      inclusive?: boolean
    } = {}
  ): Promise<{
    messages: Array<{
      type: string
      user?: string
      bot_id?: string
      text: string
      ts: string
      thread_ts?: string
    }>
    has_more: boolean
  }> {
    const response = await this.api<{ messages: unknown[]; has_more: boolean }>(
      'conversations.history',
      {
        channel: channelId,
        limit: options.limit || 20,
        oldest: options.oldest,
        latest: options.latest,
        inclusive: options.inclusive,
      }
    )
    return {
      messages: response.messages as Array<{
        type: string
        user?: string
        bot_id?: string
        text: string
        ts: string
        thread_ts?: string
      }>,
      has_more: response.has_more as boolean,
    }
  }

  /**
   * Get thread replies
   */
  async getThreadReplies(
    channelId: string,
    threadTs: string,
    options: { limit?: number } = {}
  ): Promise<{
    messages: Array<{
      type: string
      user?: string
      bot_id?: string
      text: string
      ts: string
      thread_ts?: string
    }>
    has_more: boolean
  }> {
    const response = await this.api<{ messages: unknown[]; has_more: boolean }>(
      'conversations.replies',
      {
        channel: channelId,
        ts: threadTs,
        limit: options.limit || 100,
      }
    )
    return {
      messages: response.messages as Array<{
        type: string
        user?: string
        bot_id?: string
        text: string
        ts: string
        thread_ts?: string
      }>,
      has_more: response.has_more as boolean,
    }
  }

  /**
   * Open a modal
   */
  async openModal(triggerId: string, view: Record<string, unknown>): Promise<void> {
    await this.api('views.open', { trigger_id: triggerId, view })
  }

  /**
   * Update a modal view
   */
  async updateModal(viewId: string, view: Record<string, unknown>): Promise<void> {
    await this.api('views.update', { view_id: viewId, view })
  }

  /**
   * Publish app home tab
   */
  async publishAppHome(userId: string, view: Record<string, unknown>): Promise<void> {
    await this.api('views.publish', { user_id: userId, view })
  }

  /**
   * Join a channel
   */
  async joinChannel(channelId: string): Promise<void> {
    await this.api('conversations.join', { channel: channelId })
  }

  /**
   * List channels the bot is in
   */
  async listChannels(options: {
    types?: string
    limit?: number
    cursor?: string
  } = {}): Promise<{
    channels: Array<{ id: string; name: string; is_member: boolean }>
    next_cursor?: string
  }> {
    const response = await this.api<{ channels: unknown[]; response_metadata?: { next_cursor?: string } }>(
      'conversations.list',
      {
        types: options.types || 'public_channel,private_channel',
        limit: options.limit || 100,
        cursor: options.cursor,
        exclude_archived: true,
      }
    )
    return {
      channels: response.channels as Array<{ id: string; name: string; is_member: boolean }>,
      next_cursor: response.response_metadata?.next_cursor,
    }
  }

  /**
   * Post an ephemeral message (visible only to one user)
   */
  async postEphemeral(
    channel: string,
    user: string,
    text: string,
    options: { thread_ts?: string; blocks?: SlackBlock[] } = {}
  ): Promise<void> {
    await this.api('chat.postEphemeral', {
      channel,
      user,
      text,
      thread_ts: options.thread_ts,
      blocks: options.blocks,
    })
  }
}

/**
 * Build Slack blocks for a message
 */
export function buildSlackBlocks(sections: Array<{
  type: 'text' | 'actions' | 'divider' | 'context' | 'header'
  text?: string
  elements?: SlackBlock['elements']
  accessory?: SlackBlock['accessory']
}>): SlackBlock[] {
  return sections.map((section, index) => {
    const blockId = `block_${index}`

    switch (section.type) {
      case 'text':
        return {
          type: 'section',
          block_id: blockId,
          text: { type: 'mrkdwn', text: section.text || '' },
          accessory: section.accessory,
        }

      case 'actions':
        return {
          type: 'actions',
          block_id: blockId,
          elements: section.elements || [],
        }

      case 'divider':
        return { type: 'divider' }

      case 'context':
        return {
          type: 'context',
          block_id: blockId,
          elements: section.elements || [],
        }

      case 'header':
        return {
          type: 'header',
          block_id: blockId,
          text: { type: 'plain_text', text: section.text || '', emoji: true },
        }

      default:
        return { type: 'section', text: { type: 'mrkdwn', text: section.text || '' } }
    }
  })
}

/**
 * Build action buttons
 */
export function buildActionButton(
  actionId: string,
  text: string,
  value: string,
  style?: 'primary' | 'danger'
): NonNullable<SlackBlock['elements']>[0] {
  return {
    type: 'button',
    action_id: actionId,
    text: { type: 'plain_text', text, emoji: true },
    value,
    style,
  }
}

/**
 * Format agent response for Slack
 */
export function formatAgentResponse(response: {
  text: string
  actions?: Array<{ id: string; label: string; value: string; style?: 'primary' | 'danger' }>
  showFeedback?: boolean
}): { text: string; blocks?: SlackBlock[] } {
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: response.text },
    },
  ]

  // Add action buttons if provided
  if (response.actions && response.actions.length > 0) {
    blocks.push({
      type: 'actions',
      elements: response.actions.map((action) =>
        buildActionButton(action.id, action.label, action.value, action.style)
      ),
    })
  }

  // Add feedback buttons if requested
  if (response.showFeedback) {
    blocks.push({ type: 'divider' })
    blocks.push({
      type: 'actions',
      block_id: 'feedback_block',
      elements: [
        buildActionButton('feedback_positive', 'Helpful', 'positive'),
        buildActionButton('feedback_negative', 'Not helpful', 'negative'),
      ],
    })
  }

  return { text: response.text, blocks }
}
