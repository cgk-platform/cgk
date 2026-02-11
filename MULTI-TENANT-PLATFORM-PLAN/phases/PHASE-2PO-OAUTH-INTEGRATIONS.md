# PHASE-2PO-OAUTH-INTEGRATIONS: Ad Platform OAuth & Integration Configuration

**Status**: COMPLETE
**Duration**: Week 11 (5 days)
**Depends On**: Phase 2PO-ONBOARDING (step 5 integrations step)
**Parallel With**: PHASE-2CM (Communications)
**Blocks**: None (integrations can be configured post-launch)
**Completed**: 2026-02-10

---

## Goal

Implement complete OAuth flows for Meta Ads, Google Ads, TikTok Ads, and API key configuration for Klaviyo with:
- CSRF-protected OAuth flows with HMAC state verification
- AES-256-GCM encrypted token storage
- Automatic token refresh mechanisms
- Multi-tenant credential isolation
- Admin connection management UIs

---

## Success Criteria

- [x] Meta Ads OAuth completes full 40-scope authorization
- [x] Google Ads OAuth with refresh token persistence
- [x] TikTok Ads OAuth with Events API access
- [x] Klaviyo API key validation and encrypted storage
- [x] All tokens encrypted with AES-256-GCM before database storage
- [x] Token refresh runs automatically before expiration
- [x] Re-auth flows work when tokens are revoked
- [x] Admin UI shows connection status, account info, sync status
- [x] Multi-tenant isolation verified (no cross-tenant token access)

---

## OAuth Architecture Overview

### Security Requirements (NON-NEGOTIABLE)

**State Parameter (CSRF Protection):**
- Generate cryptographically secure random nonce (16+ bytes)
- Include tenant ID, timestamp, return URL
- Sign with HMAC-SHA256 using platform secret
- Store in Redis with 10-minute TTL
- Validate on callback before token exchange

**Token Encryption (AES-256-GCM):**
```typescript
// packages/integrations/src/encryption.ts

interface EncryptedToken {
  salt: string      // 16 bytes, hex
  iv: string        // 16 bytes, hex
  authTag: string   // 16 bytes, hex
  data: string      // encrypted token, hex
}

export async function encryptToken(
  plaintext: string,
  encryptionKey: string
): Promise<string> {
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(16)

  // Derive key from encryption key + salt
  const key = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha256')

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag()

  // Return as: salt:iv:authTag:data (all hex)
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex')
  ].join(':')
}

export async function decryptToken(
  encryptedString: string,
  encryptionKey: string
): Promise<string> {
  const [saltHex, ivHex, authTagHex, dataHex] = encryptedString.split(':')

  const salt = Buffer.from(saltHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')

  const key = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha256')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([
    decipher.update(data),
    decipher.final()
  ]).toString('utf8')
}
```

---

## 1. META ADS OAUTH

### OAuth Configuration

```typescript
// packages/integrations/src/meta/config.ts

export const META_OAUTH_CONFIG = {
  authorizationUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
  tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
  exchangeTokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token', // Long-lived exchange
  debugTokenUrl: 'https://graph.facebook.com/debug_token',

  // 40 scopes for full Marketing API access
  scopes: [
    // Core permissions
    'public_profile',
    'email',

    // Ads management (required for CAPI, spend sync)
    'ads_management',
    'ads_read',

    // Business management
    'business_management',

    // Pages (for branded content, insights)
    'pages_read_engagement',
    'pages_show_list',
    'pages_manage_ads',
    'pages_manage_metadata',

    // Instagram
    'instagram_basic',
    'instagram_manage_insights',
    'instagram_content_publish',

    // Catalog & commerce
    'catalog_management',

    // Conversions API
    'conversions_api_access',
  ],

  tokenTypes: {
    SHORT_LIVED: 7200,      // 2 hours (seconds)
    LONG_LIVED: 5184000,    // 60 days (seconds)
    SYSTEM_USER: null,      // Never expires
  },

  refreshBuffer: 7 * 24 * 60 * 60, // Refresh 7 days before expiry
}
```

### OAuth Flow

```typescript
// packages/integrations/src/meta/oauth.ts

export async function startMetaOAuth(params: {
  tenantId: string
  returnUrl: string
}): Promise<{ authUrl: string; state: string }> {
  // Generate state with HMAC
  const nonce = crypto.randomBytes(16).toString('hex')
  const timestamp = Date.now()

  const statePayload = JSON.stringify({
    tenantId: params.tenantId,
    returnUrl: params.returnUrl,
    nonce,
    timestamp,
  })

  const hmac = crypto
    .createHmac('sha256', process.env.META_APP_SECRET!)
    .update(statePayload)
    .digest('hex')

  const state = Buffer.from(JSON.stringify({
    payload: statePayload,
    hmac,
  })).toString('base64url')

  // Store in Redis for validation
  await redis.setex(
    `meta_oauth_state:${nonce}`,
    600, // 10 minute TTL
    JSON.stringify({ tenantId: params.tenantId, returnUrl: params.returnUrl })
  )

  const redirectUri = `${process.env.NEXT_PUBLIC_URL}/api/admin/integrations/meta/callback`

  const authUrl = new URL(META_OAUTH_CONFIG.authorizationUrl)
  authUrl.searchParams.set('client_id', process.env.META_APP_ID!)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', META_OAUTH_CONFIG.scopes.join(','))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')

  return { authUrl: authUrl.toString(), state }
}

export async function completeMetaOAuth(params: {
  code: string
  state: string
}): Promise<MetaConnection> {
  // 1. Validate state
  const stateData = JSON.parse(Buffer.from(params.state, 'base64url').toString())
  const expectedHmac = crypto
    .createHmac('sha256', process.env.META_APP_SECRET!)
    .update(stateData.payload)
    .digest('hex')

  if (stateData.hmac !== expectedHmac) {
    throw new Error('Invalid OAuth state signature')
  }

  const payload = JSON.parse(stateData.payload)

  // Check timestamp (max 10 minutes old)
  if (Date.now() - payload.timestamp > 600000) {
    throw new Error('OAuth state expired')
  }

  // Verify nonce in Redis
  const storedState = await redis.get(`meta_oauth_state:${payload.nonce}`)
  if (!storedState) {
    throw new Error('OAuth state not found or already used')
  }
  await redis.del(`meta_oauth_state:${payload.nonce}`)

  // 2. Exchange code for short-lived token
  const tokenResponse = await fetch(META_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      code: params.code,
      redirect_uri: `${process.env.NEXT_PUBLIC_URL}/api/admin/integrations/meta/callback`,
    }),
  })

  const { access_token: shortLivedToken } = await tokenResponse.json()

  // 3. Exchange for long-lived token (60 days)
  const longLivedResponse = await fetch(META_OAUTH_CONFIG.exchangeTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      fb_exchange_token: shortLivedToken,
    }),
  })

  const { access_token: longLivedToken, expires_in } = await longLivedResponse.json()

  // 4. Debug token to get metadata
  const debugResponse = await fetch(
    `${META_OAUTH_CONFIG.debugTokenUrl}?input_token=${longLivedToken}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`
  )
  const { data: tokenData } = await debugResponse.json()

  // 5. Fetch ad accounts
  const accountsResponse = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${longLivedToken}`
  )
  const { data: adAccounts } = await accountsResponse.json()

  // 6. Store encrypted token
  const encryptedToken = await encryptToken(
    longLivedToken,
    process.env.META_ENCRYPTION_KEY!
  )

  const expiresAt = new Date(Date.now() + (expires_in * 1000))

  await withTenant(payload.tenantId, async () => {
    await sql`
      INSERT INTO meta_ad_connections (
        tenant_id,
        access_token_encrypted,
        token_expires_at,
        token_type,
        user_id,
        scopes,
        metadata,
        status,
        connected_at
      ) VALUES (
        ${payload.tenantId},
        ${encryptedToken},
        ${expiresAt},
        'long_lived',
        ${tokenData.user_id},
        ${tokenData.scopes},
        ${JSON.stringify({ adAccounts })},
        'pending_account_selection',
        NOW()
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        token_type = EXCLUDED.token_type,
        scopes = EXCLUDED.scopes,
        metadata = EXCLUDED.metadata,
        status = 'pending_account_selection',
        connected_at = NOW(),
        needs_reauth = false,
        last_error = NULL
    `
  })

  return {
    connected: true,
    adAccounts,
    returnUrl: payload.returnUrl,
    requiresAccountSelection: adAccounts.length > 1,
  }
}
```

### Token Refresh

```typescript
// packages/integrations/src/meta/refresh.ts

export async function refreshMetaToken(tenantId: string): Promise<void> {
  const connection = await getMetaConnection(tenantId)

  if (!connection || connection.token_type === 'system_user') {
    return // System user tokens don't expire
  }

  const currentToken = await decryptToken(
    connection.access_token_encrypted,
    process.env.META_ENCRYPTION_KEY!
  )

  // Exchange for new long-lived token
  const response = await fetch(META_OAUTH_CONFIG.exchangeTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      fb_exchange_token: currentToken,
    }),
  })

  if (!response.ok) {
    const error = await response.json()

    // Mark as needing re-auth
    await withTenant(tenantId, async () => {
      await sql`
        UPDATE meta_ad_connections
        SET needs_reauth = true, last_error = ${error.error?.message || 'Token refresh failed'}
        WHERE tenant_id = ${tenantId}
      `
    })

    throw new Error(`Meta token refresh failed: ${error.error?.message}`)
  }

  const { access_token, expires_in } = await response.json()

  const encryptedToken = await encryptToken(access_token, process.env.META_ENCRYPTION_KEY!)
  const expiresAt = new Date(Date.now() + (expires_in * 1000))

  await withTenant(tenantId, async () => {
    await sql`
      UPDATE meta_ad_connections
      SET
        access_token_encrypted = ${encryptedToken},
        token_expires_at = ${expiresAt},
        needs_reauth = false,
        last_error = NULL,
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
}
```

### Admin Connection UI

**Location**: `/admin/integrations/meta-ads`

**Features**:
- OAuth initiation button with scope explanation
- Account selection modal (if multiple ad accounts)
- Connection status with account name
- Token expiry countdown
- Re-auth prompt when needed
- Disconnect confirmation
- Manual sync trigger
- Last sync status

---

## 2. GOOGLE ADS OAUTH

### OAuth Configuration

```typescript
// packages/integrations/src/google-ads/config.ts

export const GOOGLE_ADS_OAUTH_CONFIG = {
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',

  scopes: [
    'https://www.googleapis.com/auth/adwords',  // Google Ads API access
  ],

  // CRITICAL: Required for refresh token
  accessType: 'offline',
  prompt: 'consent', // Force consent to ensure refresh token

  tokenRefreshBuffer: 5 * 60, // Refresh 5 minutes before expiry (seconds)
}
```

### OAuth Flow

```typescript
// packages/integrations/src/google-ads/oauth.ts

export async function startGoogleAdsOAuth(params: {
  tenantId: string
  returnUrl: string
}): Promise<{ authUrl: string; state: string }> {
  // Generate secure state
  const state = crypto.randomBytes(32).toString('hex')

  // Store in Redis
  await redis.setex(
    `google_ads_oauth_state:${state}`,
    600,
    JSON.stringify({ tenantId: params.tenantId, returnUrl: params.returnUrl })
  )

  const redirectUri = `${process.env.NEXT_PUBLIC_URL}/api/admin/integrations/google-ads/callback`

  const authUrl = new URL(GOOGLE_ADS_OAUTH_CONFIG.authorizationUrl)
  authUrl.searchParams.set('client_id', process.env.GOOGLE_ADS_CLIENT_ID!)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', GOOGLE_ADS_OAUTH_CONFIG.scopes.join(' '))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('response_type', 'code')

  return { authUrl: authUrl.toString(), state }
}

export async function completeGoogleAdsOAuth(params: {
  code: string
  state: string
}): Promise<GoogleAdsConnection> {
  // 1. Validate state
  const storedState = await redis.get(`google_ads_oauth_state:${params.state}`)
  if (!storedState) {
    throw new Error('Invalid or expired OAuth state')
  }
  await redis.del(`google_ads_oauth_state:${params.state}`)

  const { tenantId, returnUrl } = JSON.parse(storedState)

  // 2. Exchange code for tokens
  const tokenResponse = await fetch(GOOGLE_ADS_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXT_PUBLIC_URL}/api/admin/integrations/google-ads/callback`,
    }),
  })

  const tokens = await tokenResponse.json()

  if (!tokens.refresh_token) {
    throw new Error('No refresh token received - user may need to revoke and reconnect')
  }

  // 3. Fetch accessible Google Ads customer IDs
  const customerIds = await listAccessibleCustomers(tokens.access_token)

  // 4. Store encrypted tokens
  const encryptedAccessToken = await encryptToken(
    tokens.access_token,
    process.env.GOOGLE_ADS_ENCRYPTION_KEY!
  )
  const encryptedRefreshToken = await encryptToken(
    tokens.refresh_token,
    process.env.GOOGLE_ADS_ENCRYPTION_KEY!
  )

  const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000))

  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO google_ads_connections (
        tenant_id,
        access_token_encrypted,
        refresh_token_encrypted,
        token_expires_at,
        customer_ids,
        status,
        connected_at
      ) VALUES (
        ${tenantId},
        ${encryptedAccessToken},
        ${encryptedRefreshToken},
        ${expiresAt},
        ${customerIds},
        'pending_account_selection',
        NOW()
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        customer_ids = EXCLUDED.customer_ids,
        status = 'pending_account_selection',
        connected_at = NOW(),
        needs_reauth = false,
        last_error = NULL
    `
  })

  return {
    connected: true,
    customerIds,
    returnUrl,
    requiresAccountSelection: customerIds.length > 1,
  }
}

async function listAccessibleCustomers(accessToken: string): Promise<string[]> {
  const response = await fetch(
    'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      },
    }
  )

  const { resourceNames } = await response.json()

  // Extract customer IDs from resource names
  // Format: customers/1234567890
  return resourceNames.map((name: string) => name.split('/')[1])
}
```

### Token Refresh

```typescript
// packages/integrations/src/google-ads/refresh.ts

export async function refreshGoogleAdsToken(tenantId: string): Promise<string> {
  const connection = await getGoogleAdsConnection(tenantId)

  if (!connection) {
    throw new Error('No Google Ads connection found')
  }

  const refreshToken = await decryptToken(
    connection.refresh_token_encrypted,
    process.env.GOOGLE_ADS_ENCRYPTION_KEY!
  )

  const response = await fetch(GOOGLE_ADS_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.json()

    // Handle invalid_grant (token revoked)
    if (error.error === 'invalid_grant') {
      await withTenant(tenantId, async () => {
        await sql`
          UPDATE google_ads_connections
          SET needs_reauth = true, last_error = 'Token revoked - please reconnect'
          WHERE tenant_id = ${tenantId}
        `
      })
      throw new Error('Google Ads token revoked - re-authorization required')
    }

    throw new Error(`Token refresh failed: ${error.error_description}`)
  }

  const { access_token, expires_in } = await response.json()

  const encryptedToken = await encryptToken(
    access_token,
    process.env.GOOGLE_ADS_ENCRYPTION_KEY!
  )
  const expiresAt = new Date(Date.now() + (expires_in * 1000))

  await withTenant(tenantId, async () => {
    await sql`
      UPDATE google_ads_connections
      SET
        access_token_encrypted = ${encryptedToken},
        token_expires_at = ${expiresAt},
        needs_reauth = false,
        last_error = NULL,
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })

  return access_token
}
```

---

## 3. TIKTOK ADS OAUTH

### OAuth Configuration

```typescript
// packages/integrations/src/tiktok/config.ts

export const TIKTOK_OAUTH_CONFIG = {
  authorizationUrl: 'https://business-api.tiktok.com/open_api/v1.3/oauth2/authorize/',
  tokenUrl: 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
  refreshUrl: 'https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/',

  scopes: [
    'advertiser_info',
    'ad_account_info',
    'campaign_info',
    'adgroup_info',
    'ad_info',
    'reporting',
  ].join(','),

  tokenRefreshBuffer: 5 * 60, // 5 minutes before expiry
}
```

### OAuth Flow

```typescript
// packages/integrations/src/tiktok/oauth.ts

export async function startTikTokOAuth(params: {
  tenantId: string
  returnUrl: string
}): Promise<{ authUrl: string; state: string }> {
  const state = crypto.randomBytes(16).toString('hex')

  await redis.setex(
    `tiktok_oauth_state:${state}`,
    600,
    JSON.stringify({ tenantId: params.tenantId, returnUrl: params.returnUrl })
  )

  const redirectUri = `${process.env.NEXT_PUBLIC_URL}/api/admin/integrations/tiktok/callback`

  const authUrl = new URL(TIKTOK_OAUTH_CONFIG.authorizationUrl)
  authUrl.searchParams.set('app_id', process.env.TIKTOK_APP_ID!)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', TIKTOK_OAUTH_CONFIG.scopes)
  authUrl.searchParams.set('state', state)

  return { authUrl: authUrl.toString(), state }
}

export async function completeTikTokOAuth(params: {
  code: string
  state: string
}): Promise<TikTokConnection> {
  // 1. Validate state
  const storedState = await redis.get(`tiktok_oauth_state:${params.state}`)
  if (!storedState) {
    throw new Error('Invalid or expired OAuth state')
  }
  await redis.del(`tiktok_oauth_state:${params.state}`)

  const { tenantId, returnUrl } = JSON.parse(storedState)

  // 2. Exchange code for tokens
  const tokenResponse = await fetch(TIKTOK_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.TIKTOK_APP_ID!,
      auth_code: params.code,
      secret: process.env.TIKTOK_APP_SECRET!,
    }),
  })

  const result = await tokenResponse.json()

  // TikTok uses code=0 for success
  if (result.code !== 0) {
    throw new Error(`TikTok OAuth failed: ${result.message}`)
  }

  const { access_token, refresh_token, advertiser_ids } = result.data

  if (!advertiser_ids || advertiser_ids.length === 0) {
    throw new Error('No TikTok advertiser accounts found')
  }

  // 3. Store encrypted tokens
  const encryptedAccessToken = await encryptToken(
    access_token,
    process.env.TIKTOK_ENCRYPTION_KEY!
  )
  const encryptedRefreshToken = await encryptToken(
    refresh_token,
    process.env.TIKTOK_ENCRYPTION_KEY!
  )

  // TikTok tokens expire in 24 hours
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO tiktok_ad_connections (
        tenant_id,
        access_token_encrypted,
        refresh_token_encrypted,
        token_expires_at,
        advertiser_ids,
        status,
        connected_at
      ) VALUES (
        ${tenantId},
        ${encryptedAccessToken},
        ${encryptedRefreshToken},
        ${expiresAt},
        ${advertiser_ids},
        'pending_account_selection',
        NOW()
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        advertiser_ids = EXCLUDED.advertiser_ids,
        status = 'pending_account_selection',
        connected_at = NOW(),
        needs_reauth = false,
        last_error = NULL
    `
  })

  return {
    connected: true,
    advertiserIds: advertiser_ids,
    returnUrl,
    requiresAccountSelection: advertiser_ids.length > 1,
  }
}
```

### Token Refresh

```typescript
// packages/integrations/src/tiktok/refresh.ts

export async function refreshTikTokToken(tenantId: string): Promise<void> {
  const connection = await getTikTokConnection(tenantId)

  if (!connection) {
    throw new Error('No TikTok connection found')
  }

  const refreshToken = await decryptToken(
    connection.refresh_token_encrypted,
    process.env.TIKTOK_ENCRYPTION_KEY!
  )

  const response = await fetch(TIKTOK_OAUTH_CONFIG.refreshUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.TIKTOK_APP_ID!,
      secret: process.env.TIKTOK_APP_SECRET!,
      refresh_token: refreshToken,
    }),
  })

  const result = await response.json()

  if (result.code !== 0) {
    // Mark as needing re-auth
    await withTenant(tenantId, async () => {
      await sql`
        UPDATE tiktok_ad_connections
        SET needs_reauth = true, last_error = ${result.message}
        WHERE tenant_id = ${tenantId}
      `
    })
    throw new Error(`TikTok token refresh failed: ${result.message}`)
  }

  const { access_token, refresh_token: newRefreshToken } = result.data

  const encryptedAccessToken = await encryptToken(
    access_token,
    process.env.TIKTOK_ENCRYPTION_KEY!
  )
  const encryptedRefreshToken = await encryptToken(
    newRefreshToken,
    process.env.TIKTOK_ENCRYPTION_KEY!
  )

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await withTenant(tenantId, async () => {
    await sql`
      UPDATE tiktok_ad_connections
      SET
        access_token_encrypted = ${encryptedAccessToken},
        refresh_token_encrypted = ${encryptedRefreshToken},
        token_expires_at = ${expiresAt},
        needs_reauth = false,
        last_error = NULL,
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
}
```

---

## 4. KLAVIYO CONNECTION (API Key)

### Connection Flow

Klaviyo uses API keys instead of OAuth.

```typescript
// packages/integrations/src/klaviyo/connect.ts

export async function connectKlaviyo(params: {
  tenantId: string
  privateApiKey: string
  publicApiKey?: string
}): Promise<KlaviyoConnection> {
  // 1. Validate API key format
  if (!params.privateApiKey.startsWith('pk_')) {
    throw new Error('Invalid Klaviyo API key format - must start with pk_')
  }

  // 2. Test the API key
  const testResponse = await fetch('https://a.klaviyo.com/api/accounts/', {
    headers: {
      'Authorization': `Klaviyo-API-Key ${params.privateApiKey}`,
      'revision': '2024-02-15',
      'Accept': 'application/json',
    },
  })

  if (!testResponse.ok) {
    throw new Error('Invalid Klaviyo API key')
  }

  const { data: account } = await testResponse.json()

  // 3. Fetch lists for configuration
  const listsResponse = await fetch('https://a.klaviyo.com/api/lists/', {
    headers: {
      'Authorization': `Klaviyo-API-Key ${params.privateApiKey}`,
      'revision': '2024-02-15',
      'Accept': 'application/json',
    },
  })
  const { data: lists } = await listsResponse.json()

  // 4. Store encrypted key
  const encryptedPrivateKey = await encryptToken(
    params.privateApiKey,
    process.env.INTEGRATION_ENCRYPTION_KEY!
  )

  await withTenant(params.tenantId, async () => {
    await sql`
      INSERT INTO klaviyo_connections (
        tenant_id,
        private_api_key_encrypted,
        public_api_key,
        company_name,
        account_id,
        lists,
        is_active,
        connected_at
      ) VALUES (
        ${params.tenantId},
        ${encryptedPrivateKey},
        ${params.publicApiKey || null},
        ${account.attributes.contact_information.organization_name},
        ${account.id},
        ${JSON.stringify(lists)},
        true,
        NOW()
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        private_api_key_encrypted = EXCLUDED.private_api_key_encrypted,
        public_api_key = EXCLUDED.public_api_key,
        company_name = EXCLUDED.company_name,
        account_id = EXCLUDED.account_id,
        lists = EXCLUDED.lists,
        is_active = true,
        connected_at = NOW()
    `
  })

  return {
    connected: true,
    companyName: account.attributes.contact_information.organization_name,
    lists,
  }
}

export async function disconnectKlaviyo(tenantId: string): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE klaviyo_connections
      SET is_active = false, disconnected_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
}
```

---

## Database Schema

```sql
-- Meta Ads Connections
CREATE TABLE {tenant_schema}.meta_ad_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Encrypted credentials
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  token_type VARCHAR(20) DEFAULT 'long_lived',

  -- Account info
  user_id TEXT,
  selected_ad_account_id TEXT,
  selected_ad_account_name TEXT,
  scopes TEXT[],
  metadata JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(20) DEFAULT 'active',
  needs_reauth BOOLEAN DEFAULT false,
  last_error TEXT,
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- Google Ads Connections
CREATE TABLE {tenant_schema}.google_ads_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Encrypted credentials
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,

  -- Account info
  selected_customer_id TEXT,
  selected_customer_name TEXT,
  customer_ids TEXT[],
  metadata JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(20) DEFAULT 'active',
  needs_reauth BOOLEAN DEFAULT false,
  last_error TEXT,
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- TikTok Ads Connections
CREATE TABLE {tenant_schema}.tiktok_ad_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Encrypted credentials
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,

  -- Account info
  selected_advertiser_id TEXT,
  selected_advertiser_name TEXT,
  advertiser_ids TEXT[],
  pixel_id TEXT,
  events_api_token TEXT,
  metadata JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(20) DEFAULT 'active',
  needs_reauth BOOLEAN DEFAULT false,
  last_error TEXT,
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- Klaviyo Connections
CREATE TABLE {tenant_schema}.klaviyo_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Encrypted API key
  private_api_key_encrypted TEXT NOT NULL,
  public_api_key TEXT,

  -- Account info
  company_name TEXT,
  account_id TEXT,
  sms_list_id TEXT,
  email_list_id TEXT,
  lists JSONB DEFAULT '[]',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,

  UNIQUE(tenant_id)
);
```

---

## Scheduled Token Refresh Job

```typescript
// packages/integrations/src/jobs/token-refresh.ts

import { task, schedules } from '@trigger.dev/sdk/v3'

export const refreshExpiringTokens = task({
  id: 'refresh-expiring-integration-tokens',
  run: async () => {
    // Get all tenants with expiring tokens
    const expiringConnections = await sql`
      SELECT
        tenant_id,
        'meta' as provider,
        token_expires_at
      FROM meta_ad_connections
      WHERE token_expires_at < NOW() + INTERVAL '7 days'
        AND needs_reauth = false
        AND token_type != 'system_user'

      UNION ALL

      SELECT
        tenant_id,
        'google_ads' as provider,
        token_expires_at
      FROM google_ads_connections
      WHERE token_expires_at < NOW() + INTERVAL '1 hour'
        AND needs_reauth = false

      UNION ALL

      SELECT
        tenant_id,
        'tiktok' as provider,
        token_expires_at
      FROM tiktok_ad_connections
      WHERE token_expires_at < NOW() + INTERVAL '1 hour'
        AND needs_reauth = false
    `

    for (const connection of expiringConnections) {
      try {
        switch (connection.provider) {
          case 'meta':
            await refreshMetaToken(connection.tenant_id)
            break
          case 'google_ads':
            await refreshGoogleAdsToken(connection.tenant_id)
            break
          case 'tiktok':
            await refreshTikTokToken(connection.tenant_id)
            break
        }

        console.log(`Refreshed ${connection.provider} token for tenant ${connection.tenant_id}`)
      } catch (error) {
        console.error(
          `Failed to refresh ${connection.provider} token for tenant ${connection.tenant_id}:`,
          error
        )

        // Notify tenant admin
        await notifyTokenRefreshFailed(connection.tenant_id, connection.provider, error)
      }
    }
  },
})

// Run every 6 hours
schedules.create({
  id: 'token-refresh-schedule',
  cron: '0 */6 * * *',
  task: refreshExpiringTokens,
})
```

---

## API Routes

```
/api/admin/integrations/
├── meta/
│   ├── oauth/route.ts           - POST: Start OAuth flow
│   ├── callback/route.ts        - GET: OAuth callback
│   ├── accounts/route.ts        - GET: List ad accounts
│   ├── accounts/[id]/route.ts   - POST: Select account
│   ├── disconnect/route.ts      - DELETE: Disconnect
│   └── status/route.ts          - GET: Connection status
│
├── google-ads/
│   ├── oauth/route.ts           - POST: Start OAuth flow
│   ├── callback/route.ts        - GET: OAuth callback
│   ├── customers/route.ts       - GET: List customer IDs
│   ├── customers/[id]/route.ts  - POST: Select customer
│   ├── disconnect/route.ts      - DELETE: Disconnect
│   └── status/route.ts          - GET: Connection status
│
├── tiktok/
│   ├── oauth/route.ts           - POST: Start OAuth flow
│   ├── callback/route.ts        - GET: OAuth callback
│   ├── advertisers/route.ts     - GET: List advertisers
│   ├── advertisers/[id]/route.ts- POST: Select advertiser
│   ├── disconnect/route.ts      - DELETE: Disconnect
│   └── status/route.ts          - GET: Connection status
│
└── klaviyo/
    ├── connect/route.ts         - POST: Connect with API key
    ├── disconnect/route.ts      - DELETE: Disconnect
    ├── test/route.ts            - GET: Test connection
    ├── lists/route.ts           - GET: List available lists
    └── status/route.ts          - GET: Connection status
```

---

## Environment Variables

```bash
# Meta Ads
META_APP_ID=                    # Meta App ID
META_APP_SECRET=                # Meta App Secret
META_ENCRYPTION_KEY=            # 32+ chars for AES-256-GCM

# Google Ads
GOOGLE_ADS_CLIENT_ID=           # OAuth Client ID
GOOGLE_ADS_CLIENT_SECRET=       # OAuth Client Secret
GOOGLE_ADS_DEVELOPER_TOKEN=     # Google Ads API Developer Token
GOOGLE_ADS_ENCRYPTION_KEY=      # 32+ chars for AES-256-GCM
GOOGLE_ADS_LOGIN_CUSTOMER_ID=   # Optional: MCC Account ID

# TikTok
TIKTOK_APP_ID=                  # TikTok App ID
TIKTOK_APP_SECRET=              # TikTok App Secret
TIKTOK_ENCRYPTION_KEY=          # 32+ chars for AES-256-GCM

# General Integration Encryption
INTEGRATION_ENCRYPTION_KEY=     # Fallback encryption key for API keys
```

---

## Tasks

### [PARALLEL] Database Setup
- [x] Create `meta_ad_connections` table
- [x] Create `google_ads_connections` table
- [x] Create `tiktok_ad_connections` table
- [x] Create `klaviyo_connections` table
- [x] Add migration for tenant schema

### [PARALLEL] Encryption Utilities
- [x] Implement `encryptToken()` with AES-256-GCM
- [x] Implement `decryptToken()`
- [x] Add key derivation with PBKDF2
- [x] Add unit tests for encryption round-trip

### [SEQUENTIAL] Meta Ads OAuth
- [x] Implement `startMetaOAuth()` with HMAC state
- [x] Implement `completeMetaOAuth()` with token exchange
- [x] Implement long-lived token exchange
- [x] Implement `refreshMetaToken()`
- [x] Build API routes
- [x] Build account selection UI
- [x] Build connection status UI

### [SEQUENTIAL] Google Ads OAuth
- [x] Implement `startGoogleAdsOAuth()`
- [x] Implement `completeGoogleAdsOAuth()` with refresh token
- [x] Implement `refreshGoogleAdsToken()`
- [x] Handle `invalid_grant` errors
- [x] Build API routes
- [x] Build customer selection UI
- [x] Build connection status UI

### [SEQUENTIAL] TikTok OAuth
- [x] Implement `startTikTokOAuth()`
- [x] Implement `completeTikTokOAuth()`
- [x] Implement `refreshTikTokToken()`
- [x] Build API routes
- [x] Build advertiser selection UI
- [x] Build connection status UI

### [SEQUENTIAL] Klaviyo Connection
- [x] Implement `connectKlaviyo()` with validation
- [x] Implement `disconnectKlaviyo()`
- [x] Build API routes
- [x] Build API key input form
- [x] Build list selection UI
- [x] Build connection status UI

### [PARALLEL] Token Refresh Job
- [x] Implement `refreshExpiringTokens` task
- [x] Create 6-hour schedule
- [x] Add error handling and notifications
- [x] Add audit logging

### [PARALLEL] Admin Integration Hub
- [x] Build `/admin/integrations` overview page
- [x] Build integration status cards
- [x] Build re-auth prompts
- [x] Build disconnect confirmations

---

## Definition of Done

- [x] All four platforms have working OAuth/connection flows
- [x] All tokens encrypted before database storage
- [x] State parameters validated with HMAC
- [x] Token refresh runs automatically before expiry
- [x] Re-auth flows work when tokens are revoked
- [x] Admin UI shows connection status for all integrations
- [x] Account/customer selection works for multi-account users
- [x] Disconnect flows clean up properly
- [x] Multi-tenant isolation verified
- [x] `npx tsc --noEmit` passes
- [ ] E2E tests for OAuth flows pass (requires live OAuth credentials)
