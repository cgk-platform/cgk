# @cgk-platform/integrations

OAuth integrations for ad platforms and marketing tools - Meta Ads, Google Ads, TikTok, and Klaviyo.

## Installation

```bash
pnpm add @cgk-platform/integrations
```

## Features

- **OAuth 2.0 Flow** - Secure authorization with state validation
- **Token Encryption** - All tokens encrypted at rest
- **Auto-Refresh** - Automatic token refresh before expiry
- **Multiple Providers** - Meta, Google, TikTok, Klaviyo
- **Connection Management** - Track and manage active integrations
- **Tenant Isolation** - Multi-tenant connection scoping

## Quick Start

### Start OAuth Flow (Meta Ads)

```typescript
import { startMetaOAuth } from '@cgk-platform/integrations'

const result = await startMetaOAuth({
  tenantId: 'tenant_123',
  redirectUri: 'https://my-brand.com/integrations/meta/callback',
  scopes: ['ads_read', 'ads_management'],
})

// Redirect user to result.authUrl
return Response.redirect(result.authUrl)
```

### Complete OAuth (Callback Handler)

```typescript
import { completeMetaOAuth } from '@cgk-platform/integrations'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  
  const result = await completeMetaOAuth({
    code,
    state,
    redirectUri: 'https://my-brand.com/integrations/meta/callback',
  })
  
  // Connection saved with encrypted tokens
  console.log(result.connection.id)
  console.log(result.adAccounts) // Available ad accounts
  
  return Response.redirect('/integrations?success=true')
}
```

### Refresh Tokens

```typescript
import { refreshMetaTokens, getConnection } from '@cgk-platform/integrations'

const connection = await getConnection('connection_123')

if (connection.expiresAt < Date.now() + 600000) { // 10 min buffer
  await refreshMetaTokens(connection.id)
}
```

### Google Ads Integration

```typescript
import { startGoogleAdsOAuth, completeGoogleAdsOAuth } from '@cgk-platform/integrations'

// Start flow
const { authUrl, state } = await startGoogleAdsOAuth({
  tenantId: 'tenant_123',
  redirectUri: 'https://my-brand.com/integrations/google/callback',
})

// Complete flow
const result = await completeGoogleAdsOAuth({
  code,
  state,
  redirectUri: 'https://my-brand.com/integrations/google/callback',
})

console.log(result.connection.customerId) // Google Ads customer ID
```

### TikTok Ads

```typescript
import { startTikTokOAuth, completeTikTokOAuth } from '@cgk-platform/integrations'

// Start
const { authUrl } = await startTikTokOAuth({
  tenantId: 'tenant_123',
  redirectUri: 'https://my-brand.com/integrations/tiktok/callback',
})

// Complete
const result = await completeTikTokOAuth({
  authCode: code,
  tenantId: 'tenant_123',
})

console.log(result.advertiserId)
```

### Klaviyo (API Key)

```typescript
import { connectKlaviyo, listKlaviyoLists } from '@cgk-platform/integrations'

// Connect with API key
const result = await connectKlaviyo({
  tenantId: 'tenant_123',
  apiKey: 'pk_xxx',
})

// Fetch Klaviyo lists
const lists = await listKlaviyoLists(result.connection.id)

console.log(lists) // Email lists
```

### Check Connection Status

```typescript
import { getConnection, listConnections } from '@cgk-platform/integrations'

// Get specific connection
const connection = await getConnection('connection_123')

console.log(connection.status) // 'active', 'expired', 'revoked'
console.log(connection.provider) // 'meta', 'google', 'tiktok', 'klaviyo'

// List all connections for tenant
const connections = await listConnections({
  tenantId: 'tenant_123',
  provider: 'meta',
  status: 'active',
})
```

## Key Exports

### Meta Ads
- `startMetaOAuth()`, `completeMetaOAuth()`
- `refreshMetaTokens()`, `revokeMetaConnection()`
- `getMetaAdAccounts()` - List ad accounts

### Google Ads
- `startGoogleAdsOAuth()`, `completeGoogleAdsOAuth()`
- `refreshGoogleTokens()`, `revokeGoogleConnection()`

### TikTok Ads
- `startTikTokOAuth()`, `completeTikTokOAuth()`
- `refreshTikTokTokens()`, `revokeTikTokConnection()`

### Klaviyo
- `connectKlaviyo()`, `disconnectKlaviyo()`
- `listKlaviyoLists()`, `validateKlaviyoApiKey()`

### Connection Management
- `getConnection()`, `listConnections()`
- `updateConnectionStatus()`, `deleteConnection()`
- `isConnectionValid()` - Check if active and not expired

### OAuth Utilities
- `generateOAuthState()` - Create signed state parameter
- `verifyOAuthState()` - Verify state parameter
- `encryptToken()`, `decryptToken()` - Token encryption

### Types
- `IntegrationProvider` - 'meta', 'google', 'tiktok', 'klaviyo'
- `ConnectionStatus` - 'active', 'expired', 'revoked'
- `MetaAdConnection`, `GoogleAdsConnection`, `TikTokAdConnection`, `KlaviyoConnection`
- `OAuthStartResult`, `TokenRefreshResult`

## OAuth Providers

### Meta (Facebook/Instagram)
- Scopes: `ads_read`, `ads_management`, `business_management`
- Auto-refresh: Yes (60 days)
- Ad accounts: Fetched during connection

### Google Ads
- Scopes: `https://www.googleapis.com/auth/adwords`
- Auto-refresh: Yes (no expiry with refresh token)
- Customer ID: Required for API calls

### TikTok
- Scopes: `ad_account_read`, `campaign_read`
- Auto-refresh: No (manual re-auth after 24h for sandbox)
- Advertiser ID: Fetched during connection

### Klaviyo
- Auth type: API key (not OAuth)
- No expiry
- Lists: Fetched on-demand

## Security

All tokens are:
1. Encrypted with AES-256-GCM before storage
2. Decrypted only when needed for API calls
3. Never exposed in API responses
4. Auto-rotated via refresh token flow

## License

MIT
