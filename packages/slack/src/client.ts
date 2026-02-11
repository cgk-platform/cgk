/**
 * @cgk/slack - Slack API client wrapper
 *
 * @ai-pattern slack-client
 * @ai-note Wrapper around @slack/web-api with additional utilities
 */

import { WebClient, type ChatPostMessageResponse, type ConversationsListResponse, type KnownBlock } from '@slack/web-api'
import type { SlackBlock, SlackChannel } from './types'
import { decryptToken } from './encryption'

// Helper to cast our SlackBlock type to Slack API's expected type
function toApiBlocks(blocks: SlackBlock[]): KnownBlock[] {
  return blocks as unknown as KnownBlock[]
}

export interface SlackClientConfig {
  botToken: string
  userToken?: string
}

export interface MessageResponse {
  ok: boolean
  ts?: string
  channel?: string
  error?: string
}

export interface ScheduledMessageResponse {
  ok: boolean
  scheduledMessageId?: string
  error?: string
}

export interface SlackUser {
  id: string
  name: string
  realName?: string
  email?: string
  isBot: boolean
  isAdmin: boolean
  deleted: boolean
}

export interface SlackMessage {
  type: string
  user?: string
  text?: string
  ts: string
  threadTs?: string
  blocks?: SlackBlock[]
}

/**
 * Slack API client with full functionality
 */
export class SlackClient {
  private botClient: WebClient
  private userClient: WebClient | null

  constructor(config: SlackClientConfig) {
    this.botClient = new WebClient(config.botToken)
    this.userClient = config.userToken ? new WebClient(config.userToken) : null
  }

  /**
   * Create a SlackClient from encrypted tokens
   */
  static fromEncryptedTokens(
    botTokenEncrypted: string,
    userTokenEncrypted?: string | null,
  ): SlackClient {
    const botToken = decryptToken(botTokenEncrypted)
    const userToken = userTokenEncrypted ? decryptToken(userTokenEncrypted) : undefined

    return new SlackClient({ botToken, userToken })
  }

  // ==========================================================================
  // Message Operations
  // ==========================================================================

  /**
   * Post a message to a channel
   */
  async postMessage(
    channel: string,
    blocks: SlackBlock[],
    fallbackText: string,
    options?: {
      threadTs?: string
      unfurlLinks?: boolean
      unfurlMedia?: boolean
    },
  ): Promise<MessageResponse> {
    try {
      const response: ChatPostMessageResponse = await this.botClient.chat.postMessage({
        channel,
        blocks: toApiBlocks(blocks),
        text: fallbackText,
        thread_ts: options?.threadTs,
        unfurl_links: options?.unfurlLinks ?? false,
        unfurl_media: options?.unfurlMedia ?? false,
      })

      return {
        ok: response.ok ?? false,
        ts: response.ts,
        channel: response.channel,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update an existing message
   */
  async updateMessage(
    channel: string,
    ts: string,
    blocks: SlackBlock[],
    fallbackText?: string,
  ): Promise<MessageResponse> {
    try {
      const response = await this.botClient.chat.update({
        channel,
        ts,
        blocks: toApiBlocks(blocks),
        text: fallbackText,
      })

      return {
        ok: response.ok ?? false,
        ts: response.ts,
        channel: response.channel,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(channel: string, ts: string): Promise<MessageResponse> {
    try {
      const response = await this.botClient.chat.delete({
        channel,
        ts,
      })

      return {
        ok: response.ok ?? false,
        ts: response.ts,
        channel: response.channel,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Send a direct message to a user
   */
  async sendDM(
    userId: string,
    blocks: SlackBlock[],
    fallbackText: string,
  ): Promise<MessageResponse> {
    try {
      // Open a DM channel with the user
      const openResponse = await this.botClient.conversations.open({
        users: userId,
      })

      if (!openResponse.ok || !openResponse.channel?.id) {
        return { ok: false, error: 'Failed to open DM channel' }
      }

      // Post the message
      return this.postMessage(openResponse.channel.id, blocks, fallbackText)
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Schedule a message for later
   */
  async scheduleMessage(
    channel: string,
    postAt: number,
    blocks: SlackBlock[],
    fallbackText: string,
  ): Promise<ScheduledMessageResponse> {
    try {
      const response = await this.botClient.chat.scheduleMessage({
        channel,
        post_at: postAt,
        blocks: toApiBlocks(blocks),
        text: fallbackText,
      })

      return {
        ok: response.ok ?? false,
        scheduledMessageId: response.scheduled_message_id,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete a scheduled message
   */
  async deleteScheduledMessage(
    channel: string,
    scheduledMessageId: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await this.botClient.chat.deleteScheduledMessage({
        channel,
        scheduled_message_id: scheduledMessageId,
      })

      return { ok: response.ok ?? false }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ==========================================================================
  // Channel Operations
  // ==========================================================================

  /**
   * List all accessible channels (public and private where bot is member)
   */
  async listChannels(): Promise<SlackChannel[]> {
    const channels: SlackChannel[] = []
    let cursor: string | undefined

    try {
      do {
        const response: ConversationsListResponse = await this.botClient.conversations.list({
          types: 'public_channel,private_channel',
          exclude_archived: true,
          limit: 200,
          cursor,
        })

        if (response.channels) {
          for (const ch of response.channels) {
            channels.push({
              id: ch.id ?? '',
              name: ch.name ?? '',
              isPrivate: ch.is_private ?? false,
              isMember: ch.is_member ?? false,
              numMembers: ch.num_members,
            })
          }
        }

        cursor = response.response_metadata?.next_cursor
      } while (cursor)

      return channels
    } catch (error) {
      console.error('Failed to list channels:', error)
      return []
    }
  }

  /**
   * Get all channels (pagination handled)
   */
  async getAllChannels(): Promise<SlackChannel[]> {
    return this.listChannels()
  }

  /**
   * Get a specific channel by ID
   */
  async getChannel(channelId: string): Promise<SlackChannel | null> {
    try {
      const response = await this.botClient.conversations.info({
        channel: channelId,
      })

      if (!response.ok || !response.channel) {
        return null
      }

      const ch = response.channel
      return {
        id: ch.id ?? '',
        name: ch.name ?? '',
        isPrivate: ch.is_private ?? false,
        isMember: ch.is_member ?? false,
        numMembers: ch.num_members,
      }
    } catch {
      return null
    }
  }

  /**
   * Join a public channel
   */
  async joinChannel(channelId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await this.botClient.conversations.join({
        channel: channelId,
      })

      return { ok: response.ok ?? false }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ==========================================================================
  // User Operations
  // ==========================================================================

  /**
   * List all users in the workspace
   */
  async listUsers(): Promise<SlackUser[]> {
    const users: SlackUser[] = []
    let cursor: string | undefined

    try {
      do {
        const response = await this.botClient.users.list({
          limit: 200,
          cursor,
        })

        if (response.members) {
          for (const member of response.members) {
            users.push({
              id: member.id ?? '',
              name: member.name ?? '',
              realName: member.real_name,
              email: member.profile?.email,
              isBot: member.is_bot ?? false,
              isAdmin: member.is_admin ?? false,
              deleted: member.deleted ?? false,
            })
          }
        }

        cursor = response.response_metadata?.next_cursor
      } while (cursor)

      return users
    } catch (error) {
      console.error('Failed to list users:', error)
      return []
    }
  }

  /**
   * Get all users (pagination handled)
   */
  async getAllUsers(): Promise<SlackUser[]> {
    return this.listUsers()
  }

  /**
   * Find a Slack user by email address
   */
  async findUserByEmail(email: string): Promise<SlackUser | null> {
    try {
      const response = await this.botClient.users.lookupByEmail({
        email,
      })

      if (!response.ok || !response.user) {
        return null
      }

      const user = response.user
      return {
        id: user.id ?? '',
        name: user.name ?? '',
        realName: user.real_name,
        email: user.profile?.email,
        isBot: user.is_bot ?? false,
        isAdmin: user.is_admin ?? false,
        deleted: user.deleted ?? false,
      }
    } catch {
      return null
    }
  }

  /**
   * Get user info by ID
   */
  async getUser(userId: string): Promise<SlackUser | null> {
    try {
      const response = await this.botClient.users.info({
        user: userId,
      })

      if (!response.ok || !response.user) {
        return null
      }

      const user = response.user
      return {
        id: user.id ?? '',
        name: user.name ?? '',
        realName: user.real_name,
        email: user.profile?.email,
        isBot: user.is_bot ?? false,
        isAdmin: user.is_admin ?? false,
        deleted: user.deleted ?? false,
      }
    } catch {
      return null
    }
  }

  // ==========================================================================
  // Reactions & Pins
  // ==========================================================================

  /**
   * Add a reaction to a message
   */
  async addReaction(
    channel: string,
    ts: string,
    emoji: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await this.botClient.reactions.add({
        channel,
        timestamp: ts,
        name: emoji,
      })

      return { ok: response.ok ?? false }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    channel: string,
    ts: string,
    emoji: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await this.botClient.reactions.remove({
        channel,
        timestamp: ts,
        name: emoji,
      })

      return { ok: response.ok ?? false }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Pin a message
   */
  async pinMessage(
    channel: string,
    ts: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await this.botClient.pins.add({
        channel,
        timestamp: ts,
      })

      return { ok: response.ok ?? false }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Unpin a message
   */
  async unpinMessage(
    channel: string,
    ts: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await this.botClient.pins.remove({
        channel,
        timestamp: ts,
      })

      return { ok: response.ok ?? false }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ==========================================================================
  // History
  // ==========================================================================

  /**
   * Get channel history
   */
  async getChannelHistory(
    channel: string,
    limit: number = 100,
  ): Promise<SlackMessage[]> {
    try {
      const response = await this.botClient.conversations.history({
        channel,
        limit,
      })

      if (!response.ok || !response.messages) {
        return []
      }

      return response.messages.map((msg) => ({
        type: msg.type ?? 'message',
        user: msg.user,
        text: msg.text,
        ts: msg.ts ?? '',
        threadTs: msg.thread_ts,
        blocks: msg.blocks as SlackBlock[] | undefined,
      }))
    } catch {
      return []
    }
  }

  /**
   * Get thread replies
   */
  async getThreadReplies(
    channel: string,
    threadTs: string,
  ): Promise<SlackMessage[]> {
    try {
      const response = await this.botClient.conversations.replies({
        channel,
        ts: threadTs,
      })

      if (!response.ok || !response.messages) {
        return []
      }

      return response.messages.map((msg) => ({
        type: msg.type ?? 'message',
        user: msg.user,
        text: msg.text,
        ts: msg.ts ?? '',
        threadTs: msg.thread_ts,
        blocks: msg.blocks as SlackBlock[] | undefined,
      }))
    } catch {
      return []
    }
  }

  // ==========================================================================
  // Team Info
  // ==========================================================================

  /**
   * Get workspace/team info
   */
  async getTeamInfo(): Promise<{
    id: string
    name: string
    domain: string
  } | null> {
    try {
      const response = await this.botClient.team.info()

      if (!response.ok || !response.team) {
        return null
      }

      return {
        id: response.team.id ?? '',
        name: response.team.name ?? '',
        domain: response.team.domain ?? '',
      }
    } catch {
      return null
    }
  }

  // ==========================================================================
  // Auth Test
  // ==========================================================================

  /**
   * Test bot token validity
   */
  async testBotAuth(): Promise<{ ok: boolean; userId?: string; error?: string }> {
    try {
      const response = await this.botClient.auth.test()
      return {
        ok: response.ok ?? false,
        userId: response.user_id,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Test user token validity
   */
  async testUserAuth(): Promise<{ ok: boolean; userId?: string; error?: string }> {
    if (!this.userClient) {
      return { ok: false, error: 'No user token configured' }
    }

    try {
      const response = await this.userClient.auth.test()
      return {
        ok: response.ok ?? false,
        userId: response.user_id,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Test full connection (both tokens + post capability)
   */
  async testConnection(testChannelId?: string): Promise<{
    botValid: boolean
    userValid: boolean
    canPost: boolean
    canListChannels: boolean
  }> {
    const [botAuth, userAuth, channels] = await Promise.all([
      this.testBotAuth(),
      this.testUserAuth(),
      this.listChannels(),
    ])

    let canPost = false
    if (testChannelId) {
      const postResult = await this.postMessage(
        testChannelId,
        [{ type: 'section', text: { type: 'mrkdwn', text: 'Connection test successful!' } }],
        'Connection test successful!',
      )
      canPost = postResult.ok
      // Delete the test message
      if (postResult.ok && postResult.ts) {
        await this.deleteMessage(testChannelId, postResult.ts)
      }
    }

    return {
      botValid: botAuth.ok,
      userValid: userAuth.ok,
      canPost,
      canListChannels: channels.length > 0,
    }
  }
}
