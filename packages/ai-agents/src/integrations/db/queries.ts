/**
 * Database queries for AI Agent integrations
 * All queries expect to be run within a tenant context via withTenant()
 */

import { sql } from '@cgk/db'
import type {
  AgentCalendarEvent,
  AgentEmailConfig,
  AgentEmailConversation,
  AgentGoogleOAuth,
  AgentSlackApp,
  AgentSMSConversation,
  AgentSMSMessage,
  ChannelRateLimit,
  IntegrationChannel,
  IntegrationEvent,
  SlackConversation,
  SlackUserAssociation,
  TenantSlackConfig,
  TenantSMSConfig,
} from '../types.js'

// Helper to convert snake_case DB rows to camelCase
function toCamelCase<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
    result[camelKey] = value
  }
  return result
}

// ============================================================================
// SLACK CONFIG
// ============================================================================

export async function getSlackConfig(): Promise<TenantSlackConfig | null> {
  const result = await sql`SELECT * FROM tenant_slack_config LIMIT 1`
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as TenantSlackConfig) : null
}

export async function upsertSlackConfig(
  config: Partial<TenantSlackConfig> & { slackClientId: string }
): Promise<TenantSlackConfig> {
  const result = await sql`
    INSERT INTO tenant_slack_config (
      slack_client_id, slack_client_secret_encrypted, slack_signing_secret_encrypted,
      slack_app_id, slack_bot_token_encrypted, slack_user_token_encrypted,
      slack_bot_user_id, slack_team_id, slack_team_name, enabled,
      default_agent_id, channel_config, installed_at
    )
    VALUES (
      ${config.slackClientId},
      ${config.slackClientSecretEncrypted || ''},
      ${config.slackSigningSecretEncrypted || ''},
      ${config.slackAppId || null},
      ${config.slackBotTokenEncrypted || null},
      ${config.slackUserTokenEncrypted || null},
      ${config.slackBotUserId || null},
      ${config.slackTeamId || null},
      ${config.slackTeamName || null},
      ${config.enabled ?? true},
      ${config.defaultAgentId || null},
      ${JSON.stringify(config.channelConfig || {})},
      ${config.installedAt?.toISOString() || null}
    )
    ON CONFLICT ((1))
    DO UPDATE SET
      slack_client_id = EXCLUDED.slack_client_id,
      slack_client_secret_encrypted = EXCLUDED.slack_client_secret_encrypted,
      slack_signing_secret_encrypted = EXCLUDED.slack_signing_secret_encrypted,
      slack_app_id = COALESCE(EXCLUDED.slack_app_id, tenant_slack_config.slack_app_id),
      slack_bot_token_encrypted = COALESCE(EXCLUDED.slack_bot_token_encrypted, tenant_slack_config.slack_bot_token_encrypted),
      slack_user_token_encrypted = COALESCE(EXCLUDED.slack_user_token_encrypted, tenant_slack_config.slack_user_token_encrypted),
      slack_bot_user_id = COALESCE(EXCLUDED.slack_bot_user_id, tenant_slack_config.slack_bot_user_id),
      slack_team_id = COALESCE(EXCLUDED.slack_team_id, tenant_slack_config.slack_team_id),
      slack_team_name = COALESCE(EXCLUDED.slack_team_name, tenant_slack_config.slack_team_name),
      enabled = EXCLUDED.enabled,
      default_agent_id = COALESCE(EXCLUDED.default_agent_id, tenant_slack_config.default_agent_id),
      channel_config = EXCLUDED.channel_config,
      installed_at = COALESCE(EXCLUDED.installed_at, tenant_slack_config.installed_at),
      updated_at = NOW()
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to upsert slack config')
  return toCamelCase(row as Record<string, unknown>) as unknown as TenantSlackConfig
}

export async function updateSlackChannelConfig(
  channelId: string,
  config: { agentId?: string; respondToMentions?: boolean; respondToAll?: boolean; respondToDMs?: boolean }
): Promise<TenantSlackConfig | null> {
  const result = await sql`
    UPDATE tenant_slack_config
    SET channel_config = channel_config || ${JSON.stringify({ [channelId]: config })}::jsonb,
        updated_at = NOW()
    RETURNING *
  `
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as TenantSlackConfig) : null
}

// ============================================================================
// AGENT SLACK APPS
// ============================================================================

export async function getAgentSlackApp(agentId: string): Promise<AgentSlackApp | null> {
  const result = await sql`
    SELECT * FROM agent_slack_apps WHERE agent_id = ${agentId}
  `
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as AgentSlackApp) : null
}

export async function upsertAgentSlackApp(
  agentId: string,
  app: Partial<AgentSlackApp>
): Promise<AgentSlackApp> {
  const result = await sql`
    INSERT INTO agent_slack_apps (
      agent_id, slack_client_id, slack_client_secret_encrypted, slack_app_id,
      slack_app_name, slack_bot_user_id, bot_token_encrypted, app_token_encrypted,
      signing_secret_encrypted, manifest_json, manifest_version, status, error_message
    )
    VALUES (
      ${agentId},
      ${app.slackClientId || null},
      ${app.slackClientSecretEncrypted || null},
      ${app.slackAppId || null},
      ${app.slackAppName || null},
      ${app.slackBotUserId || null},
      ${app.botTokenEncrypted || null},
      ${app.appTokenEncrypted || null},
      ${app.signingSecretEncrypted || null},
      ${app.manifestJson ? JSON.stringify(app.manifestJson) : null},
      ${app.manifestVersion || 1},
      ${app.status || 'pending'},
      ${app.errorMessage || null}
    )
    ON CONFLICT (agent_id)
    DO UPDATE SET
      slack_client_id = COALESCE(EXCLUDED.slack_client_id, agent_slack_apps.slack_client_id),
      slack_client_secret_encrypted = COALESCE(EXCLUDED.slack_client_secret_encrypted, agent_slack_apps.slack_client_secret_encrypted),
      slack_app_id = COALESCE(EXCLUDED.slack_app_id, agent_slack_apps.slack_app_id),
      slack_app_name = COALESCE(EXCLUDED.slack_app_name, agent_slack_apps.slack_app_name),
      slack_bot_user_id = COALESCE(EXCLUDED.slack_bot_user_id, agent_slack_apps.slack_bot_user_id),
      bot_token_encrypted = COALESCE(EXCLUDED.bot_token_encrypted, agent_slack_apps.bot_token_encrypted),
      app_token_encrypted = COALESCE(EXCLUDED.app_token_encrypted, agent_slack_apps.app_token_encrypted),
      signing_secret_encrypted = COALESCE(EXCLUDED.signing_secret_encrypted, agent_slack_apps.signing_secret_encrypted),
      manifest_json = COALESCE(EXCLUDED.manifest_json, agent_slack_apps.manifest_json),
      manifest_version = COALESCE(EXCLUDED.manifest_version, agent_slack_apps.manifest_version),
      status = COALESCE(EXCLUDED.status, agent_slack_apps.status),
      error_message = EXCLUDED.error_message,
      updated_at = NOW()
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to upsert agent slack app')
  return toCamelCase(row as Record<string, unknown>) as unknown as AgentSlackApp
}

// ============================================================================
// SLACK USER ASSOCIATIONS
// ============================================================================

export async function getSlackUserAssociation(
  slackUserId: string
): Promise<SlackUserAssociation | null> {
  const result = await sql`
    SELECT * FROM slack_user_associations WHERE slack_user_id = ${slackUserId}
  `
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as SlackUserAssociation) : null
}

export async function getSlackUserByEmail(email: string): Promise<SlackUserAssociation | null> {
  const result = await sql`
    SELECT * FROM slack_user_associations WHERE slack_email = ${email}
  `
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as SlackUserAssociation) : null
}

export async function upsertSlackUser(
  slackUserId: string,
  data: Partial<SlackUserAssociation>
): Promise<SlackUserAssociation> {
  const result = await sql`
    INSERT INTO slack_user_associations (
      slack_user_id, slack_username, slack_display_name, slack_email,
      platform_user_id, creator_id, association_method, associated_at,
      slack_profile_cached, slack_cached_at
    )
    VALUES (
      ${slackUserId},
      ${data.slackUsername || null},
      ${data.slackDisplayName || null},
      ${data.slackEmail || null},
      ${data.platformUserId || null},
      ${data.creatorId || null},
      ${data.associationMethod || null},
      ${data.associatedAt?.toISOString() || null},
      ${data.slackProfileCached ? JSON.stringify(data.slackProfileCached) : null},
      ${(data.slackCachedAt || new Date()).toISOString()}
    )
    ON CONFLICT (slack_user_id)
    DO UPDATE SET
      slack_username = COALESCE(EXCLUDED.slack_username, slack_user_associations.slack_username),
      slack_display_name = COALESCE(EXCLUDED.slack_display_name, slack_user_associations.slack_display_name),
      slack_email = COALESCE(EXCLUDED.slack_email, slack_user_associations.slack_email),
      platform_user_id = COALESCE(EXCLUDED.platform_user_id, slack_user_associations.platform_user_id),
      creator_id = COALESCE(EXCLUDED.creator_id, slack_user_associations.creator_id),
      association_method = COALESCE(EXCLUDED.association_method, slack_user_associations.association_method),
      associated_at = COALESCE(EXCLUDED.associated_at, slack_user_associations.associated_at),
      slack_profile_cached = COALESCE(EXCLUDED.slack_profile_cached, slack_user_associations.slack_profile_cached),
      slack_cached_at = EXCLUDED.slack_cached_at
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to upsert slack user')
  return toCamelCase(row as Record<string, unknown>) as unknown as SlackUserAssociation
}

// ============================================================================
// SLACK CONVERSATIONS
// ============================================================================

export async function getOrCreateSlackConversation(
  agentId: string,
  channelId: string,
  threadTs: string | null,
  channelType?: string,
  startedByUserId?: string
): Promise<SlackConversation> {
  const result = await sql`
    INSERT INTO slack_conversations (
      agent_id, slack_channel_id, slack_thread_ts, slack_channel_type, started_by_slack_user_id
    )
    VALUES (
      ${agentId}, ${channelId}, ${threadTs}, ${channelType || null}, ${startedByUserId || null}
    )
    ON CONFLICT (slack_channel_id, COALESCE(slack_thread_ts, ''))
    DO UPDATE SET
      last_message_at = NOW(),
      message_count = slack_conversations.message_count + 1,
      is_active = true
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to get or create slack conversation')
  return toCamelCase(row as Record<string, unknown>) as unknown as SlackConversation
}

export async function getSlackConversation(
  channelId: string,
  threadTs: string | null
): Promise<SlackConversation | null> {
  const result = await sql`
    SELECT * FROM slack_conversations
    WHERE slack_channel_id = ${channelId}
      AND COALESCE(slack_thread_ts, '') = COALESCE(${threadTs}, '')
  `
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as SlackConversation) : null
}

export async function updateSlackConversationContext(
  conversationId: string,
  contextSummary: string
): Promise<void> {
  await sql`
    UPDATE slack_conversations
    SET context_summary = ${contextSummary}
    WHERE id = ${conversationId}
  `
}

// ============================================================================
// GOOGLE CALENDAR OAUTH
// ============================================================================

export async function getAgentGoogleOAuth(agentId: string): Promise<AgentGoogleOAuth | null> {
  const result = await sql`
    SELECT * FROM agent_google_oauth WHERE agent_id = ${agentId}
  `
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as AgentGoogleOAuth) : null
}

export async function getGoogleOAuthByChannelId(
  channelId: string
): Promise<AgentGoogleOAuth | null> {
  const result = await sql`
    SELECT * FROM agent_google_oauth WHERE watch_channel_id = ${channelId}
  `
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as AgentGoogleOAuth) : null
}

export async function upsertAgentGoogleOAuth(
  agentId: string,
  oauth: Partial<AgentGoogleOAuth> & {
    accessTokenEncrypted: string
    refreshTokenEncrypted: string
    tokenExpiry: Date
    googleEmail: string
  }
): Promise<AgentGoogleOAuth> {
  const result = await sql`
    INSERT INTO agent_google_oauth (
      agent_id, access_token_encrypted, refresh_token_encrypted, token_expiry,
      google_email, google_account_id, scopes,
      watch_channel_id, watch_resource_id, watch_expiration
    )
    VALUES (
      ${agentId},
      ${oauth.accessTokenEncrypted},
      ${oauth.refreshTokenEncrypted},
      ${oauth.tokenExpiry.toISOString()},
      ${oauth.googleEmail},
      ${oauth.googleAccountId || null},
      ${oauth.scopes ? `{${oauth.scopes.join(',')}}` : '{}'}::text[],
      ${oauth.watchChannelId || null},
      ${oauth.watchResourceId || null},
      ${oauth.watchExpiration?.toISOString() || null}
    )
    ON CONFLICT (agent_id)
    DO UPDATE SET
      access_token_encrypted = EXCLUDED.access_token_encrypted,
      refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
      token_expiry = EXCLUDED.token_expiry,
      google_email = EXCLUDED.google_email,
      google_account_id = COALESCE(EXCLUDED.google_account_id, agent_google_oauth.google_account_id),
      scopes = EXCLUDED.scopes,
      watch_channel_id = COALESCE(EXCLUDED.watch_channel_id, agent_google_oauth.watch_channel_id),
      watch_resource_id = COALESCE(EXCLUDED.watch_resource_id, agent_google_oauth.watch_resource_id),
      watch_expiration = COALESCE(EXCLUDED.watch_expiration, agent_google_oauth.watch_expiration),
      updated_at = NOW()
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to upsert agent google oauth')
  return toCamelCase(row as Record<string, unknown>) as unknown as AgentGoogleOAuth
}

export async function updateAgentGoogleOAuthTokens(
  agentId: string,
  accessToken: string,
  refreshToken: string,
  expiry: Date
): Promise<void> {
  await sql`
    UPDATE agent_google_oauth
    SET access_token_encrypted = ${accessToken},
        refresh_token_encrypted = ${refreshToken},
        token_expiry = ${expiry.toISOString()},
        updated_at = NOW()
    WHERE agent_id = ${agentId}
  `
}

export async function updateAgentGoogleOAuthWatch(
  agentId: string,
  watchChannelId: string,
  watchResourceId: string,
  watchExpiration: Date
): Promise<void> {
  await sql`
    UPDATE agent_google_oauth
    SET watch_channel_id = ${watchChannelId},
        watch_resource_id = ${watchResourceId},
        watch_expiration = ${watchExpiration.toISOString()},
        updated_at = NOW()
    WHERE agent_id = ${agentId}
  `
}

export async function getExpiringCalendarWatches(
  withinHours: number = 24
): Promise<AgentGoogleOAuth[]> {
  const result = await sql`
    SELECT * FROM agent_google_oauth
    WHERE watch_expiration IS NOT NULL
      AND watch_expiration < NOW() + INTERVAL '${withinHours} hours'
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentGoogleOAuth)
}

// ============================================================================
// CALENDAR EVENTS
// ============================================================================

export async function upsertCalendarEvent(
  agentId: string,
  event: Partial<AgentCalendarEvent> & {
    googleEventId: string
    googleCalendarId: string
    startTime: Date
    endTime: Date
  }
): Promise<AgentCalendarEvent> {
  const result = await sql`
    INSERT INTO agent_calendar_events (
      agent_id, google_event_id, google_calendar_id, summary, description,
      start_time, end_time, location, timezone, meet_link, conference_type,
      organizer_email, attendees, status, is_agent_invited, etag, synced_at
    )
    VALUES (
      ${agentId},
      ${event.googleEventId},
      ${event.googleCalendarId},
      ${event.summary || null},
      ${event.description || null},
      ${event.startTime.toISOString()},
      ${event.endTime.toISOString()},
      ${event.location || null},
      ${event.timezone || null},
      ${event.meetLink || null},
      ${event.conferenceType || null},
      ${event.organizerEmail || null},
      ${JSON.stringify(event.attendees || [])},
      ${event.status || 'confirmed'},
      ${event.isAgentInvited || false},
      ${event.etag || null},
      NOW()
    )
    ON CONFLICT (agent_id, google_event_id)
    DO UPDATE SET
      summary = EXCLUDED.summary,
      description = EXCLUDED.description,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      location = EXCLUDED.location,
      timezone = EXCLUDED.timezone,
      meet_link = EXCLUDED.meet_link,
      conference_type = EXCLUDED.conference_type,
      organizer_email = EXCLUDED.organizer_email,
      attendees = EXCLUDED.attendees,
      status = EXCLUDED.status,
      is_agent_invited = EXCLUDED.is_agent_invited,
      etag = EXCLUDED.etag,
      synced_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to upsert calendar event')
  return toCamelCase(row as Record<string, unknown>) as unknown as AgentCalendarEvent
}

export async function getAgentUpcomingEvents(
  agentId: string,
  limit: number = 10,
  afterDate?: Date
): Promise<AgentCalendarEvent[]> {
  const from = (afterDate || new Date()).toISOString()
  const result = await sql`
    SELECT * FROM agent_calendar_events
    WHERE agent_id = ${agentId}
      AND status = 'confirmed'
      AND start_time > ${from}
    ORDER BY start_time ASC
    LIMIT ${limit}
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentCalendarEvent)
}

export async function deleteCalendarEvent(agentId: string, googleEventId: string): Promise<void> {
  await sql`
    DELETE FROM agent_calendar_events
    WHERE agent_id = ${agentId} AND google_event_id = ${googleEventId}
  `
}

// ============================================================================
// EMAIL CONFIG
// ============================================================================

export async function getAgentEmailConfig(agentId: string): Promise<AgentEmailConfig | null> {
  const result = await sql`
    SELECT * FROM agent_email_config WHERE agent_id = ${agentId}
  `
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as AgentEmailConfig) : null
}

export async function getAgentByInboundEmail(
  inboundAddress: string
): Promise<{ agentId: string } | null> {
  const result = await sql`
    SELECT agent_id FROM agent_email_config WHERE inbound_address = ${inboundAddress}
  `
  return result.rows[0] ? { agentId: result.rows[0].agent_id as string } : null
}

export async function upsertAgentEmailConfig(
  agentId: string,
  config: Partial<AgentEmailConfig> & { senderEmail: string; senderName: string }
): Promise<AgentEmailConfig> {
  const result = await sql`
    INSERT INTO agent_email_config (
      agent_id, sender_email, sender_name, reply_to_email,
      inbound_enabled, inbound_address, max_emails_per_hour, max_emails_per_day
    )
    VALUES (
      ${agentId},
      ${config.senderEmail},
      ${config.senderName},
      ${config.replyToEmail || null},
      ${config.inboundEnabled || false},
      ${config.inboundAddress || null},
      ${config.maxEmailsPerHour || 50},
      ${config.maxEmailsPerDay || 500}
    )
    ON CONFLICT (agent_id)
    DO UPDATE SET
      sender_email = EXCLUDED.sender_email,
      sender_name = EXCLUDED.sender_name,
      reply_to_email = EXCLUDED.reply_to_email,
      inbound_enabled = EXCLUDED.inbound_enabled,
      inbound_address = EXCLUDED.inbound_address,
      max_emails_per_hour = EXCLUDED.max_emails_per_hour,
      max_emails_per_day = EXCLUDED.max_emails_per_day,
      updated_at = NOW()
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to upsert agent email config')
  return toCamelCase(row as Record<string, unknown>) as unknown as AgentEmailConfig
}

export async function incrementEmailCount(agentId: string): Promise<void> {
  await sql`
    UPDATE agent_email_config
    SET emails_sent_today = CASE
          WHEN last_reset_at::date < CURRENT_DATE THEN 1
          ELSE emails_sent_today + 1
        END,
        emails_sent_this_hour = CASE
          WHEN last_reset_at < NOW() - INTERVAL '1 hour' THEN 1
          ELSE emails_sent_this_hour + 1
        END,
        last_email_at = NOW(),
        last_reset_at = CASE
          WHEN last_reset_at::date < CURRENT_DATE THEN NOW()
          ELSE last_reset_at
        END
    WHERE agent_id = ${agentId}
  `
}

// ============================================================================
// EMAIL CONVERSATIONS
// ============================================================================

export async function getOrCreateEmailConversation(
  agentId: string,
  contactEmail: string,
  subject: string,
  threadId?: string
): Promise<AgentEmailConversation> {
  if (threadId) {
    const existing = await sql`
      SELECT * FROM agent_email_conversations
      WHERE agent_id = ${agentId} AND thread_id = ${threadId}
    `
    const existingRow = existing.rows[0]
    if (existingRow) {
      await sql`
        UPDATE agent_email_conversations
        SET message_count = message_count + 1,
            last_message_at = NOW(),
            is_active = true
        WHERE id = ${existingRow.id}
      `
      return toCamelCase(existingRow as Record<string, unknown>) as unknown as AgentEmailConversation
    }
  }

  const result = await sql`
    INSERT INTO agent_email_conversations (
      agent_id, thread_id, subject, contact_email
    )
    VALUES (${agentId}, ${threadId || null}, ${subject}, ${contactEmail})
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to get or create email conversation')
  return toCamelCase(row as Record<string, unknown>) as unknown as AgentEmailConversation
}

export async function updateEmailConversation(
  conversationId: string,
  direction: 'inbound' | 'outbound'
): Promise<void> {
  await sql`
    UPDATE agent_email_conversations
    SET last_message_at = NOW(),
        last_direction = ${direction},
        message_count = message_count + 1
    WHERE id = ${conversationId}
  `
}

// ============================================================================
// SMS CONFIG
// ============================================================================

export async function getSMSConfig(): Promise<TenantSMSConfig | null> {
  const result = await sql`SELECT * FROM tenant_sms_config LIMIT 1`
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as TenantSMSConfig) : null
}

export async function upsertSMSConfig(
  config: Partial<TenantSMSConfig> & { provider: 'twilio' | 'telnyx' }
): Promise<TenantSMSConfig> {
  const result = await sql`
    INSERT INTO tenant_sms_config (
      provider, twilio_account_sid_encrypted, twilio_auth_token_encrypted,
      phone_numbers, default_phone_number, default_agent_id, enabled
    )
    VALUES (
      ${config.provider},
      ${config.twilioAccountSidEncrypted || null},
      ${config.twilioAuthTokenEncrypted || null},
      ${JSON.stringify(config.phoneNumbers || [])},
      ${config.defaultPhoneNumber || null},
      ${config.defaultAgentId || null},
      ${config.enabled ?? true}
    )
    ON CONFLICT ((1))
    DO UPDATE SET
      provider = EXCLUDED.provider,
      twilio_account_sid_encrypted = COALESCE(EXCLUDED.twilio_account_sid_encrypted, tenant_sms_config.twilio_account_sid_encrypted),
      twilio_auth_token_encrypted = COALESCE(EXCLUDED.twilio_auth_token_encrypted, tenant_sms_config.twilio_auth_token_encrypted),
      phone_numbers = EXCLUDED.phone_numbers,
      default_phone_number = COALESCE(EXCLUDED.default_phone_number, tenant_sms_config.default_phone_number),
      default_agent_id = COALESCE(EXCLUDED.default_agent_id, tenant_sms_config.default_agent_id),
      enabled = EXCLUDED.enabled,
      updated_at = NOW()
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to upsert SMS config')
  return toCamelCase(row as Record<string, unknown>) as unknown as TenantSMSConfig
}

export async function getAgentPhoneNumber(agentId: string): Promise<string | null> {
  const config = await getSMSConfig()
  if (!config) return null

  const assigned = config.phoneNumbers.find((p) => p.agentId === agentId)
  return assigned?.number || config.defaultPhoneNumber
}

// ============================================================================
// SMS CONVERSATIONS
// ============================================================================

export async function getOrCreateSMSConversation(
  agentId: string,
  agentPhoneNumber: string,
  contactPhoneNumber: string
): Promise<AgentSMSConversation> {
  const result = await sql`
    INSERT INTO agent_sms_conversations (
      agent_id, agent_phone_number, contact_phone_number
    )
    VALUES (${agentId}, ${agentPhoneNumber}, ${contactPhoneNumber})
    ON CONFLICT (agent_phone_number, contact_phone_number)
    DO UPDATE SET
      last_message_at = NOW(),
      message_count = agent_sms_conversations.message_count + 1
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to get or create SMS conversation')
  return toCamelCase(row as Record<string, unknown>) as unknown as AgentSMSConversation
}

export async function getSMSConversation(
  agentPhoneNumber: string,
  contactPhoneNumber: string
): Promise<AgentSMSConversation | null> {
  const result = await sql`
    SELECT * FROM agent_sms_conversations
    WHERE agent_phone_number = ${agentPhoneNumber}
      AND contact_phone_number = ${contactPhoneNumber}
  `
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as AgentSMSConversation) : null
}

export async function updateSMSConversationOptOut(
  conversationId: string,
  optedOut: boolean
): Promise<void> {
  await sql`
    UPDATE agent_sms_conversations
    SET opted_out = ${optedOut},
        opted_out_at = ${optedOut ? new Date().toISOString() : null}
    WHERE id = ${conversationId}
  `
}

// ============================================================================
// SMS MESSAGES
// ============================================================================

export async function createSMSMessage(
  message: {
    conversationId: string
    direction: 'inbound' | 'outbound'
    fromNumber: string
    toNumber: string
    body: string
    mediaUrls?: string[]
    providerMessageId?: string
    status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered'
    agentResponseTo?: string
  }
): Promise<AgentSMSMessage> {
  const result = await sql`
    INSERT INTO agent_sms_messages (
      conversation_id, direction, from_number, to_number, body,
      media_urls, provider_message_id, status, agent_response_to, sent_at
    )
    VALUES (
      ${message.conversationId},
      ${message.direction},
      ${message.fromNumber},
      ${message.toNumber},
      ${message.body},
      ${message.mediaUrls ? `{${message.mediaUrls.join(',')}}` : '{}'}::text[],
      ${message.providerMessageId || null},
      ${message.status || 'sent'},
      ${message.agentResponseTo || null},
      ${message.direction === 'outbound' ? new Date().toISOString() : null}
    )
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to create SMS message')
  return toCamelCase(row as Record<string, unknown>) as unknown as AgentSMSMessage
}

export async function updateSMSMessageStatus(
  providerMessageId: string,
  status: 'delivered' | 'failed' | 'undelivered',
  errorCode?: string,
  errorMessage?: string
): Promise<void> {
  await sql`
    UPDATE agent_sms_messages
    SET status = ${status},
        delivered_at = ${status === 'delivered' ? new Date().toISOString() : null},
        error_code = ${errorCode || null},
        error_message = ${errorMessage || null}
    WHERE provider_message_id = ${providerMessageId}
  `
}

// ============================================================================
// INTEGRATION EVENT QUEUE
// ============================================================================

export async function queueIntegrationEvent(
  channel: IntegrationChannel,
  eventType: string,
  rawPayload: Record<string, unknown>,
  agentId?: string
): Promise<IntegrationEvent> {
  const result = await sql`
    INSERT INTO integration_event_queue (
      channel, event_type, agent_id, raw_payload, status
    )
    VALUES (
      ${channel}, ${eventType}, ${agentId || null}, ${JSON.stringify(rawPayload)}, 'pending'
    )
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to queue integration event')
  return toCamelCase(row as Record<string, unknown>) as unknown as IntegrationEvent
}

export async function getPendingIntegrationEvents(
  limit: number = 50
): Promise<IntegrationEvent[]> {
  const result = await sql`
    SELECT * FROM integration_event_queue
    WHERE status IN ('pending', 'failed')
      AND attempts < max_attempts
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    ORDER BY received_at ASC
    LIMIT ${limit}
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as IntegrationEvent)
}

export async function updateIntegrationEventStatus(
  eventId: string,
  status: 'processing' | 'completed' | 'failed',
  processedPayload?: Record<string, unknown>,
  error?: string
): Promise<void> {
  const nextRetry = status === 'failed' ? new Date(Date.now() + 60000).toISOString() : null
  await sql`
    UPDATE integration_event_queue
    SET status = ${status},
        processed_payload = ${processedPayload ? JSON.stringify(processedPayload) : null},
        processed_at = ${status === 'completed' ? new Date().toISOString() : null},
        attempts = attempts + 1,
        last_error = ${error || null},
        next_retry_at = ${nextRetry}
    WHERE id = ${eventId}
  `
}

// ============================================================================
// RATE LIMITING
// ============================================================================

export async function checkAndIncrementRateLimit(
  agentId: string,
  channel: IntegrationChannel
): Promise<{ allowed: boolean; remaining: number; limitType?: string }> {
  // First, ensure rate limit record exists and reset expired counters
  await sql`
    INSERT INTO channel_rate_limits (agent_id, channel)
    VALUES (${agentId}, ${channel})
    ON CONFLICT (agent_id, channel) DO UPDATE SET
      count_this_minute = CASE
        WHEN channel_rate_limits.minute_reset_at < NOW() - INTERVAL '1 minute' THEN 0
        ELSE channel_rate_limits.count_this_minute
      END,
      count_this_hour = CASE
        WHEN channel_rate_limits.hour_reset_at < NOW() - INTERVAL '1 hour' THEN 0
        ELSE channel_rate_limits.count_this_hour
      END,
      count_this_day = CASE
        WHEN channel_rate_limits.day_reset_at::date < CURRENT_DATE THEN 0
        ELSE channel_rate_limits.count_this_day
      END,
      minute_reset_at = CASE
        WHEN channel_rate_limits.minute_reset_at < NOW() - INTERVAL '1 minute' THEN NOW()
        ELSE channel_rate_limits.minute_reset_at
      END,
      hour_reset_at = CASE
        WHEN channel_rate_limits.hour_reset_at < NOW() - INTERVAL '1 hour' THEN NOW()
        ELSE channel_rate_limits.hour_reset_at
      END,
      day_reset_at = CASE
        WHEN channel_rate_limits.day_reset_at::date < CURRENT_DATE THEN NOW()
        ELSE channel_rate_limits.day_reset_at
      END
  `

  const check = await sql`
    SELECT * FROM channel_rate_limits
    WHERE agent_id = ${agentId} AND channel = ${channel}
  `
  const checkRow = check.rows[0]
  if (!checkRow) throw new Error('Rate limit record not found')
  const limit = toCamelCase(checkRow as Record<string, unknown>) as unknown as ChannelRateLimit

  if (limit.countThisMinute >= limit.maxPerMinute) {
    return { allowed: false, remaining: 0, limitType: 'minute' }
  }
  if (limit.countThisHour >= limit.maxPerHour) {
    return { allowed: false, remaining: 0, limitType: 'hour' }
  }
  if (limit.countThisDay >= limit.maxPerDay) {
    return { allowed: false, remaining: 0, limitType: 'day' }
  }

  // Increment counters
  await sql`
    UPDATE channel_rate_limits
    SET count_this_minute = count_this_minute + 1,
        count_this_hour = count_this_hour + 1,
        count_this_day = count_this_day + 1,
        updated_at = NOW()
    WHERE agent_id = ${agentId} AND channel = ${channel}
  `

  const remaining = Math.min(
    limit.maxPerMinute - limit.countThisMinute - 1,
    limit.maxPerHour - limit.countThisHour - 1,
    limit.maxPerDay - limit.countThisDay - 1
  )

  return { allowed: true, remaining }
}

export async function getRateLimitStatus(
  agentId: string,
  channel: IntegrationChannel
): Promise<ChannelRateLimit | null> {
  const result = await sql`
    SELECT * FROM channel_rate_limits
    WHERE agent_id = ${agentId} AND channel = ${channel}
  `
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as ChannelRateLimit) : null
}

export async function updateRateLimits(
  agentId: string,
  channel: IntegrationChannel,
  limits: { maxPerMinute?: number; maxPerHour?: number; maxPerDay?: number }
): Promise<ChannelRateLimit> {
  const result = await sql`
    UPDATE channel_rate_limits
    SET max_per_minute = COALESCE(${limits.maxPerMinute ?? null}, max_per_minute),
        max_per_hour = COALESCE(${limits.maxPerHour ?? null}, max_per_hour),
        max_per_day = COALESCE(${limits.maxPerDay ?? null}, max_per_day),
        updated_at = NOW()
    WHERE agent_id = ${agentId} AND channel = ${channel}
    RETURNING *
  `
  const row = result.rows[0]
  if (!row) throw new Error('Failed to update rate limits')
  return toCamelCase(row as Record<string, unknown>) as unknown as ChannelRateLimit
}
