/**
 * Google Search Console Integration
 * OAuth and data fetching for keyword metrics
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk-platform/db'

import type { GSCConnection, GSCSyncResult } from './types'
import { updateKeywordMetrics, recordHistorySnapshot, getKeywordByText } from './keyword-tracker'

// GSC OAuth configuration - lazily validated when needed
function getGSCConfig(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.GSC_CLIENT_ID
  const clientSecret = process.env.GSC_CLIENT_SECRET
  const redirectUri = process.env.GSC_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Google Search Console not configured. Set GSC_CLIENT_ID, GSC_CLIENT_SECRET, and GSC_REDIRECT_URI environment variables.'
    )
  }

  return { clientId, clientSecret, redirectUri }
}

// Check if GSC is configured (for feature gating)
export function isGSCConfigured(): boolean {
  return !!(
    process.env.GSC_CLIENT_ID &&
    process.env.GSC_CLIENT_SECRET &&
    process.env.GSC_REDIRECT_URI &&
    process.env.GSC_ENCRYPTION_KEY
  )
}

// Encryption key must be exactly 32 bytes for AES-256
function getEncryptionKey(): Buffer {
  const key = process.env.GSC_ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      'GSC_ENCRYPTION_KEY environment variable is required for secure token storage.'
    )
  }
  // Hash the key to ensure exactly 32 bytes for AES-256
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(key).digest()
}

/**
 * AES-256-GCM encryption for secure token storage
 */
function encrypt(text: string): string {
  const crypto = require('crypto')
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext (all hex encoded)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function decrypt(encoded: string): string {
  const crypto = require('crypto')
  const key = getEncryptionKey()

  const parts = encoded.split(':')
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('Invalid encrypted token format')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const ciphertext = parts[2]

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Generate OAuth authorization URL
 */
export function getOAuthAuthorizationUrl(state: string): string {
  const config = getGSCConfig()
  const scopes = ['https://www.googleapis.com/auth/webmasters.readonly']

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresAt: Date
}> {
  const config = getGSCConfig()
  const response = await fetch('https://oauth2.googleapis.com/token', {
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
    throw new Error(`Token exchange failed: ${error}`)
  }

  const data = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiresAt: Date
}> {
  const config = getGSCConfig()
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  const data = (await response.json()) as {
    access_token: string
    expires_in: number
  }

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}

/**
 * Get GSC connection status
 */
export async function getGSCConnection(): Promise<GSCConnection | null> {
  const result = await sql<GSCConnection>`
    SELECT id, site_url, is_connected, last_error, connected_at, updated_at
    FROM gsc_credentials
    LIMIT 1
  `
  return result.rows[0] || null
}

/**
 * Store GSC credentials
 */
export async function storeGSCCredentials(data: {
  siteUrl: string
  accessToken: string
  refreshToken: string
  expiresAt: Date
}): Promise<GSCConnection> {
  const encryptedAccess = encrypt(data.accessToken)
  const encryptedRefresh = encrypt(data.refreshToken)

  // Delete any existing credentials first
  await sql`DELETE FROM gsc_credentials`

  const result = await sql<GSCConnection>`
    INSERT INTO gsc_credentials (
      site_url, access_token_encrypted, refresh_token_encrypted,
      expires_at, is_connected
    ) VALUES (
      ${data.siteUrl},
      ${encryptedAccess},
      ${encryptedRefresh},
      ${data.expiresAt.toISOString()}::timestamptz,
      true
    )
    RETURNING id, site_url, is_connected, last_error, connected_at, updated_at
  `
  return result.rows[0]!
}

/**
 * Update GSC connection error
 */
export async function updateGSCError(error: string): Promise<void> {
  await sql`
    UPDATE gsc_credentials SET
      is_connected = false,
      last_error = ${error},
      updated_at = NOW()
  `
}

/**
 * Disconnect GSC
 */
export async function disconnectGSC(): Promise<void> {
  await sql`DELETE FROM gsc_credentials`
}

interface GSCCredentialsRow {
  access_token_encrypted: string
  refresh_token_encrypted: string
  expires_at: string
  site_url: string
}

/**
 * Get valid access token (refreshing if necessary)
 */
async function getValidAccessToken(): Promise<{ token: string; siteUrl: string }> {
  const result = await sql<GSCCredentialsRow>`
    SELECT access_token_encrypted, refresh_token_encrypted, expires_at, site_url
    FROM gsc_credentials
    WHERE is_connected = true
    LIMIT 1
  `

  const creds = result.rows[0]
  if (!creds) {
    throw new Error('No GSC connection configured')
  }

  const expiresAt = new Date(creds.expires_at)
  const now = new Date()

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshToken = decrypt(creds.refresh_token_encrypted)
    const { accessToken, expiresAt: newExpiresAt } = await refreshAccessToken(refreshToken)

    // Update stored tokens
    await sql`
      UPDATE gsc_credentials SET
        access_token_encrypted = ${encrypt(accessToken)},
        expires_at = ${newExpiresAt.toISOString()}::timestamptz,
        updated_at = NOW()
    `

    return { token: accessToken, siteUrl: creds.site_url }
  }

  return { token: decrypt(creds.access_token_encrypted), siteUrl: creds.site_url }
}

/**
 * Query GSC Search Analytics API
 */
export async function querySearchAnalytics(options: {
  startDate: string
  endDate: string
  dimensions?: string[]
  rowLimit?: number
}): Promise<GSCSyncResult[]> {
  const { token, siteUrl } = await getValidAccessToken()

  const encodedSiteUrl = encodeURIComponent(siteUrl)
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: options.startDate,
      endDate: options.endDate,
      dimensions: options.dimensions || ['query'],
      rowLimit: options.rowLimit || 1000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    await updateGSCError(error)
    throw new Error(`GSC API error: ${error}`)
  }

  const data = (await response.json()) as {
    rows?: Array<{
      keys: string[]
      clicks: number
      impressions: number
      ctr: number
      position: number
    }>
  }

  if (!data.rows) {
    return []
  }

  return data.rows.map((row) => ({
    keyword: row.keys[0] || '',
    position: row.position,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    dateRange: {
      start: options.startDate,
      end: options.endDate,
    },
  }))
}

/**
 * Sync tracked keywords with GSC data
 */
export async function syncKeywordsWithGSC(): Promise<{
  synced: number
  failed: number
  errors: string[]
}> {
  // Get date range for last 28 days
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 28)

  const startDateStr = startDate.toISOString().split('T')[0] ?? ''
  const endDateStr = endDate.toISOString().split('T')[0] ?? ''

  let synced = 0
  let failed = 0
  const errors: string[] = []

  try {
    // Fetch performance data from GSC
    const gscData = await querySearchAnalytics({
      startDate: startDateStr,
      endDate: endDateStr,
      dimensions: ['query'],
      rowLimit: 5000,
    })

    // Create a map for quick lookup
    const gscDataMap = new Map<string, GSCSyncResult>()
    for (const item of gscData) {
      gscDataMap.set(item.keyword.toLowerCase(), item)
    }

    // Get all tracked keywords
    const keywordsResult = await sql<{ id: string; keyword: string }>`
      SELECT id, keyword FROM seo_keywords
    `

    // Update each keyword with GSC data
    for (const kw of keywordsResult.rows) {
      try {
        const gscItem = gscDataMap.get(kw.keyword.toLowerCase())

        if (gscItem) {
          await updateKeywordMetrics(kw.id, {
            position: gscItem.position,
            clicks: gscItem.clicks,
            impressions: gscItem.impressions,
            ctr: gscItem.ctr,
          })

          await recordHistorySnapshot(kw.id, {
            position: gscItem.position,
            clicks: gscItem.clicks,
            impressions: gscItem.impressions,
            ctr: gscItem.ctr,
          })

          synced++
        }
      } catch (err) {
        failed++
        errors.push(`Failed to sync "${kw.keyword}": ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
  } catch (err) {
    errors.push(`GSC sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  return { synced, failed, errors }
}

/**
 * Get GSC sites for the authenticated user
 */
export async function getGSCSites(): Promise<string[]> {
  const { token } = await getValidAccessToken()

  const response = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch GSC sites')
  }

  const data = (await response.json()) as {
    siteEntry?: Array<{ siteUrl: string }>
  }

  return (data.siteEntry || []).map((entry) => entry.siteUrl)
}

/**
 * Discover new keywords from GSC (not currently tracked)
 */
export async function discoverKeywordsFromGSC(): Promise<GSCSyncResult[]> {
  // Get date range for last 28 days
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 28)

  const startDateStr = startDate.toISOString().split('T')[0] ?? ''
  const endDateStr = endDate.toISOString().split('T')[0] ?? ''

  const gscData = await querySearchAnalytics({
    startDate: startDateStr,
    endDate: endDateStr,
    dimensions: ['query'],
    rowLimit: 100,
  })

  // Filter out already tracked keywords
  const newKeywords: GSCSyncResult[] = []

  for (const item of gscData) {
    const existing = await getKeywordByText(item.keyword)
    if (!existing) {
      newKeywords.push(item)
    }
  }

  return newKeywords
}
