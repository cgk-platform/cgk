# @cgk-platform/integrations - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2026-02-10

---

## Purpose

OAuth and API integrations for ad platforms and marketing tools. Provides secure OAuth flows with CSRF protection, AES-256-GCM token encryption, automatic token refresh, and multi-tenant isolation.

---

## Quick Reference

```typescript
import {
  startMetaOAuth,
  completeMetaOAuth,
  getMetaConnection,
  refreshMetaToken,
  encryptToken,
  decryptToken,
} from '@cgk-platform/integrations'
```

---

## Key Patterns

### Pattern 1: Starting OAuth Flow

```typescript
import { startMetaOAuth } from '@cgk-platform/integrations'

const { authUrl, state } = await startMetaOAuth({
  tenantId: 'rawdog',
  returnUrl: '/admin/settings/integrations',
})

// Redirect user to authUrl
```

### Pattern 2: Completing OAuth Flow

```typescript
import { completeMetaOAuth } from '@cgk-platform/integrations'

// In OAuth callback handler
const result = await completeMetaOAuth({
  code: params.code,
  state: params.state,
})

// result.connected, result.adAccounts, result.returnUrl
```

### Pattern 3: Token Encryption

```typescript
import { encryptToken, decryptToken } from '@cgk-platform/integrations'

// Encrypt before storage
const encrypted = await encryptToken(token, process.env.ENCRYPTION_KEY!)

// Decrypt when needed
const plaintext = await decryptToken(encrypted, process.env.ENCRYPTION_KEY!)
```

### Pattern 4: Getting Access Tokens

```typescript
import { getMetaAccessToken } from '@cgk-platform/integrations'

// Automatically refreshes if needed
const accessToken = await getMetaAccessToken(tenantId)
```

### Pattern 5: Checking Integration Status

```typescript
import { getAllIntegrationStatuses, getIntegrationStatus } from '@cgk-platform/integrations'

// Get all statuses
const statuses = await getAllIntegrationStatuses(tenantId)

// Get single status
const metaStatus = await getIntegrationStatus(tenantId, 'meta')
```

---

## Security Requirements (NON-NEGOTIABLE)

### Token Encryption
- ALL tokens MUST be encrypted with AES-256-GCM before database storage
- Use `encryptToken()` for encryption, `decryptToken()` for decryption
- Encryption keys must be 32+ characters

### OAuth State Protection
- ALL OAuth flows MUST use signed state parameters
- Meta uses HMAC-signed state with nonce
- Google/TikTok use simple state stored in Redis
- State expires after 10 minutes
- State is single-use (deleted after validation)

### Tenant Isolation
- ALL connections are scoped to tenant via `withTenant()`
- NEVER expose tokens across tenants
- Database tables use tenant_id with UNIQUE constraint

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `types.ts` | Type definitions | All types |
| `encryption.ts` | Token encryption | `encryptToken`, `decryptToken` |
| `oauth-state.ts` | State management | `createOAuthState`, `validateOAuthState` |
| `meta/` | Meta Ads OAuth | `startMetaOAuth`, `completeMetaOAuth` |
| `google-ads/` | Google Ads OAuth | `startGoogleAdsOAuth`, `completeGoogleAdsOAuth` |
| `tiktok/` | TikTok Ads OAuth | `startTikTokOAuth`, `completeTikTokOAuth` |
| `klaviyo/` | Klaviyo API key | `connectKlaviyo`, `disconnectKlaviyo` |
| `status.ts` | Status utilities | `getAllIntegrationStatuses` |
| `jobs/` | Background jobs | `refreshExpiringTokensJob` |

---

## Environment Variables

```bash
# Meta Ads
META_APP_ID=                    # Facebook App ID
META_APP_SECRET=                # Facebook App Secret
META_ENCRYPTION_KEY=            # 32+ char encryption key

# Google Ads
GOOGLE_ADS_CLIENT_ID=           # OAuth Client ID
GOOGLE_ADS_CLIENT_SECRET=       # OAuth Client Secret
GOOGLE_ADS_DEVELOPER_TOKEN=     # API Developer Token
GOOGLE_ADS_ENCRYPTION_KEY=      # 32+ char encryption key

# TikTok
TIKTOK_APP_ID=                  # TikTok App ID
TIKTOK_APP_SECRET=              # TikTok App Secret
TIKTOK_ENCRYPTION_KEY=          # 32+ char encryption key

# General
INTEGRATION_ENCRYPTION_KEY=     # Fallback for API keys
NEXT_PUBLIC_URL=                # Base URL for callbacks
```

---

## Database Tables

Created by migration `018_integrations.sql`:

- `meta_ad_connections` - Meta Ads OAuth tokens
- `google_ads_connections` - Google Ads OAuth tokens
- `tiktok_ad_connections` - TikTok Ads OAuth tokens
- `klaviyo_connections` - Klaviyo API keys

---

## Common Gotchas

### 1. Encryption keys must be 32+ characters

```typescript
// WRONG - Key too short
await encryptToken(token, 'short')

// CORRECT - Use proper key length
await encryptToken(token, 'abcdefghijklmnopqrstuvwxyz123456')
```

### 2. State validation is single-use

```typescript
// After validateOAuthState succeeds, the nonce is deleted
// Calling again will fail
await validateOAuthState(state, secret) // OK
await validateOAuthState(state, secret) // Fails!
```

### 3. Google Ads requires prompt=consent for refresh tokens

```typescript
// The OAuth flow sets prompt=consent automatically
// Without this, Google may not return a refresh_token
```

### 4. TikTok uses code=0 for success

```typescript
// TikTok API returns code: 0 for success, not HTTP 200
if (result.code !== 0) {
  throw new Error(result.message)
}
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk-platform/core` | Shared types |
| `@cgk-platform/db` | Database access, tenant isolation, cache |
| `@cgk-platform/jobs` | Background job definitions |
| `crypto` | Node.js crypto for encryption |

---

## Testing

```bash
# Run tests
pnpm --filter @cgk-platform/integrations test

# Watch mode
pnpm --filter @cgk-platform/integrations test:watch

# Type check
pnpm --filter @cgk-platform/integrations typecheck
```
