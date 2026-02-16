/**
 * Google Calendar integration for AI Agents
 */

import {
  getAgentGoogleOAuth,
  upsertAgentGoogleOAuth,
  updateAgentGoogleOAuthTokens,
  updateAgentGoogleOAuthWatch,
  upsertCalendarEvent,
  deleteCalendarEvent,
  getGoogleOAuthByChannelId,
} from '../db/queries.js'
import { encrypt, safeDecrypt } from '../utils/encryption.js'
import { logAction } from '../../actions/logger.js'
import type {
  AgentGoogleOAuth,
  AgentCalendarEvent,
  CalendarAttendee,
  CreateCalendarEventParams,
  CalendarEventResult,
} from '../types.js'

const GOOGLE_OAUTH_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

/**
 * Google Calendar OAuth scopes
 */
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
]

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope?: string
}

/**
 * Google Calendar API client
 */
export class GoogleCalendarClient {
  private accessToken: string
  private agentId: string

  constructor(agentId: string, accessToken: string) {
    this.agentId = agentId
    this.accessToken = accessToken
  }

  /**
   * Create a client for an agent (handles token refresh)
   */
  static async forAgent(agentId: string): Promise<GoogleCalendarClient | null> {
    const oauth = await getAgentGoogleOAuth(agentId)
    if (!oauth) return null

    // Check if token needs refresh
    const now = new Date()
    if (oauth.tokenExpiry <= now) {
      const refreshed = await refreshGoogleTokens(agentId, oauth)
      if (!refreshed) return null
      return new GoogleCalendarClient(agentId, refreshed.accessToken)
    }

    const accessToken = safeDecrypt(oauth.accessTokenEncrypted)
    if (!accessToken) return null

    return new GoogleCalendarClient(agentId, accessToken)
  }

  /**
   * Make an API request
   */
  private async api<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${GOOGLE_CALENDAR_API}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google Calendar API error: ${response.status} ${error}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * List upcoming events
   */
  async listUpcomingEvents(options: {
    calendarId?: string
    maxResults?: number
    timeMin?: Date
    timeMax?: Date
  } = {}): Promise<AgentCalendarEvent[]> {
    const calendarId = options.calendarId || 'primary'
    const timeMin = (options.timeMin || new Date()).toISOString()

    const params = new URLSearchParams({
      timeMin,
      maxResults: String(options.maxResults || 10),
      singleEvents: 'true',
      orderBy: 'startTime',
    })

    if (options.timeMax) {
      params.set('timeMax', options.timeMax.toISOString())
    }

    const response = await this.api<{
      items?: GoogleCalendarEvent[]
    }>('GET', `/calendars/${encodeURIComponent(calendarId)}/events?${params}`)

    const events: AgentCalendarEvent[] = []
    for (const item of response.items || []) {
      const event = mapGoogleEventToAgentEvent(this.agentId, calendarId, item)
      events.push(event)

      // Cache the event
      await upsertCalendarEvent(this.agentId, event)
    }

    return events
  }

  /**
   * Get a single event
   */
  async getEvent(
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<AgentCalendarEvent | null> {
    try {
      const item = await this.api<GoogleCalendarEvent>(
        'GET',
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
      )

      return mapGoogleEventToAgentEvent(this.agentId, calendarId, item)
    } catch {
      return null
    }
  }

  /**
   * Create a new event
   */
  async createEvent(params: CreateCalendarEventParams): Promise<CalendarEventResult> {
    const calendarId = params.calendarId || 'primary'

    const body: Record<string, unknown> = {
      summary: params.summary,
      description: params.description,
      start: {
        dateTime: params.startTime.toISOString(),
        timeZone: params.timezone || 'UTC',
      },
      end: {
        dateTime: params.endTime.toISOString(),
        timeZone: params.timezone || 'UTC',
      },
      location: params.location,
      attendees: params.attendees?.map((email) => ({ email })),
    }

    // Add Google Meet if requested
    if (params.addMeet) {
      body.conferenceData = {
        createRequest: {
          requestId: `meet_${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      }
    }

    const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events`
    const queryParams = params.addMeet ? '?conferenceDataVersion=1' : ''

    const response = await this.api<GoogleCalendarEvent>(
      'POST',
      `${endpoint}${queryParams}`,
      body
    )

    // Log action
    await logAction({
      agentId: this.agentId,
      actionType: 'create_calendar_event',
      actionCategory: 'scheduling',
      actionDescription: `Created event: ${params.summary}`,
      inputData: params as unknown as Record<string, unknown>,
      outputData: { eventId: response.id },
    })

    return {
      id: response.id!,
      summary: response.summary || null,
      startTime: new Date(response.start?.dateTime || response.start?.date!),
      endTime: new Date(response.end?.dateTime || response.end?.date!),
      meetLink: response.hangoutLink || null,
      htmlLink: response.htmlLink,
    }
  }

  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    updates: Partial<CreateCalendarEventParams>,
    calendarId: string = 'primary'
  ): Promise<CalendarEventResult> {
    const body: Record<string, unknown> = {}

    if (updates.summary) body.summary = updates.summary
    if (updates.description) body.description = updates.description
    if (updates.location) body.location = updates.location
    if (updates.startTime) {
      body.start = {
        dateTime: updates.startTime.toISOString(),
        timeZone: updates.timezone || 'UTC',
      }
    }
    if (updates.endTime) {
      body.end = {
        dateTime: updates.endTime.toISOString(),
        timeZone: updates.timezone || 'UTC',
      }
    }
    if (updates.attendees) {
      body.attendees = updates.attendees.map((email) => ({ email }))
    }

    const response = await this.api<GoogleCalendarEvent>(
      'PATCH',
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      body
    )

    return {
      id: response.id!,
      summary: response.summary || null,
      startTime: new Date(response.start?.dateTime || response.start?.date!),
      endTime: new Date(response.end?.dateTime || response.end?.date!),
      meetLink: response.hangoutLink || null,
      htmlLink: response.htmlLink,
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    await this.api(
      'DELETE',
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    )

    await deleteCalendarEvent(this.agentId, eventId)

    // Log action
    await logAction({
      agentId: this.agentId,
      actionType: 'delete_calendar_event',
      actionCategory: 'scheduling',
      actionDescription: `Deleted event: ${eventId}`,
      inputData: { eventId, calendarId },
    })
  }

  /**
   * Set up a calendar watch for push notifications
   */
  async setupWatch(webhookUrl: string, calendarId: string = 'primary'): Promise<{
    channelId: string
    resourceId: string
    expiration: Date
  }> {
    const channelId = `cal_${this.agentId}_${Date.now()}`
    const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

    const response = await this.api<{
      id: string
      resourceId: string
      expiration: string
    }>('POST', `/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      expiration: String(expiration),
    })

    const expirationTs = parseInt(response.expiration, 10)
    const expirationDate = new Date(Number.isNaN(expirationTs) ? Date.now() + 86400000 : expirationTs)

    // Store watch info
    await updateAgentGoogleOAuthWatch(
      this.agentId,
      channelId,
      response.resourceId,
      expirationDate
    )

    return {
      channelId,
      resourceId: response.resourceId,
      expiration: expirationDate,
    }
  }

  /**
   * Stop a calendar watch
   */
  async stopWatch(channelId: string, resourceId: string): Promise<void> {
    try {
      await this.api('POST', '/channels/stop', {
        id: channelId,
        resourceId,
      })
    } catch (error) {
      // Ignore errors - channel may have already expired
      console.warn('[google] Failed to stop watch:', error)
    }
  }

  /**
   * Sync calendar events from Google
   */
  async syncEvents(calendarId: string = 'primary'): Promise<number> {
    const events = await this.listUpcomingEvents({
      calendarId,
      maxResults: 100,
      timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    })

    return events.length
  }
}

// ============================================================================
// OAuth Functions
// ============================================================================

/**
 * Generate Google OAuth authorization URL
 */
export function generateGoogleAuthUrl(
  config: GoogleOAuthConfig,
  state: string,
  agentId: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: JSON.stringify({ state, agentId }),
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange OAuth code for tokens
 */
export async function exchangeGoogleOAuthCode(
  config: GoogleOAuthConfig,
  code: string
): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google OAuth error: ${response.status} ${error}`)
  }

  return response.json() as Promise<GoogleTokens>
}

/**
 * Complete Google OAuth and store tokens
 */
export async function completeGoogleOAuth(
  config: GoogleOAuthConfig,
  code: string,
  agentId: string
): Promise<AgentGoogleOAuth> {
  // Exchange code for tokens
  const tokens = await exchangeGoogleOAuthCode(config, code)

  if (!tokens.access_token) {
    throw new Error('No access token received from Google')
  }

  // Get user email
  const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const user = await userInfo.json() as { email: string; id: string }

  // Calculate token expiry
  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000)

  // Encrypt tokens
  const encryptedAccess = encrypt(tokens.access_token)
  const encryptedRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : ''

  // Store in database
  const oauth = await upsertAgentGoogleOAuth(agentId, {
    accessTokenEncrypted: encryptedAccess,
    refreshTokenEncrypted: encryptedRefresh,
    tokenExpiry,
    googleEmail: user.email,
    googleAccountId: user.id,
    scopes: GOOGLE_CALENDAR_SCOPES,
  })

  return oauth
}

/**
 * Refresh Google OAuth tokens
 */
export async function refreshGoogleTokens(
  agentId: string,
  oauth: AgentGoogleOAuth
): Promise<{ accessToken: string } | null> {
  const refreshToken = safeDecrypt(oauth.refreshTokenEncrypted)
  if (!refreshToken) return null

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('[google] Missing Google OAuth credentials in environment')
    return null
  }

  try {
    const response = await fetch(GOOGLE_OAUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      console.error('[google] Token refresh failed:', await response.text())
      return null
    }

    const tokens = await response.json() as GoogleTokens
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000)

    // Update stored tokens
    await updateAgentGoogleOAuthTokens(
      agentId,
      encrypt(tokens.access_token),
      tokens.refresh_token ? encrypt(tokens.refresh_token) : oauth.refreshTokenEncrypted,
      tokenExpiry
    )

    return { accessToken: tokens.access_token }
  } catch (error) {
    console.error('[google] Token refresh error:', error)
    return null
  }
}

/**
 * Handle Google Calendar webhook notification
 */
export async function handleCalendarWebhook(
  channelId: string,
  _resourceId: string
): Promise<void> {
  // Find agent by channel ID
  const oauth = await getGoogleOAuthByChannelId(channelId)
  if (!oauth) {
    console.log(`[google] Unknown calendar watch channel: ${channelId}`)
    return
  }

  // Sync events
  const client = await GoogleCalendarClient.forAgent(oauth.agentId)
  if (!client) {
    console.error(`[google] Failed to create client for agent: ${oauth.agentId}`)
    return
  }

  await client.syncEvents()
  console.log(`[google] Synced calendar for agent: ${oauth.agentId}`)
}

/**
 * Check if Google Calendar is connected for an agent
 */
export async function isGoogleCalendarConnected(agentId: string): Promise<boolean> {
  const oauth = await getAgentGoogleOAuth(agentId)
  return Boolean(oauth?.accessTokenEncrypted)
}

/**
 * Get Google Calendar connection status
 */
export async function getGoogleCalendarStatus(agentId: string): Promise<{
  connected: boolean
  email?: string
  watchActive?: boolean
  watchExpires?: Date
}> {
  const oauth = await getAgentGoogleOAuth(agentId)

  if (!oauth) {
    return { connected: false }
  }

  return {
    connected: true,
    email: oauth.googleEmail,
    watchActive: Boolean(oauth.watchChannelId && oauth.watchExpiration && oauth.watchExpiration > new Date()),
    watchExpires: oauth.watchExpiration || undefined,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface GoogleCalendarEvent {
  id?: string
  summary?: string
  description?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
  location?: string
  hangoutLink?: string
  conferenceData?: {
    conferenceId?: string
    conferenceSolution?: { name?: string }
    entryPoints?: Array<{ uri?: string; entryPointType?: string }>
  }
  organizer?: { email?: string; displayName?: string }
  attendees?: Array<{
    email?: string
    displayName?: string
    responseStatus?: string
    organizer?: boolean
    self?: boolean
  }>
  status?: string
  etag?: string
  htmlLink?: string
}

function mapGoogleEventToAgentEvent(
  agentId: string,
  calendarId: string,
  event: GoogleCalendarEvent
): AgentCalendarEvent {
  const attendees: CalendarAttendee[] = (event.attendees || []).map((a) => ({
    email: a.email || '',
    displayName: a.displayName,
    responseStatus: a.responseStatus as CalendarAttendee['responseStatus'],
    organizer: a.organizer,
    self: a.self,
  }))

  // Check if agent is invited
  const isAgentInvited = attendees.some((a) => a.self)

  // Extract meet link
  let meetLink: string | null = event.hangoutLink || null
  if (!meetLink && event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(
      (e) => e.entryPointType === 'video'
    )
    meetLink = videoEntry?.uri || null
  }

  return {
    id: '',
    agentId,
    googleEventId: event.id || '',
    googleCalendarId: calendarId,
    summary: event.summary || null,
    description: event.description || null,
    startTime: new Date(event.start?.dateTime || event.start?.date || ''),
    endTime: new Date(event.end?.dateTime || event.end?.date || ''),
    location: event.location || null,
    timezone: event.start?.timeZone || null,
    meetLink,
    conferenceType: event.conferenceData?.conferenceSolution?.name || null,
    organizerEmail: event.organizer?.email || null,
    attendees,
    status: (event.status || 'confirmed') as 'confirmed' | 'tentative' | 'cancelled',
    isAgentInvited,
    etag: event.etag || null,
    syncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
