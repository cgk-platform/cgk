# PHASE-2SH: Shopify App - Core Architecture

> **Execution**: Week 10-11 (Parallel with 2PO-ONBOARDING, 2CM-RESEND-ONBOARDING)
> **Dependencies**: PHASE-1C-AUTH, PHASE-1D-PACKAGES, PHASE-2A-ADMIN-SHELL
> **Blocking**: PHASE-2AT-ABTESTING-SHIPPING, PHASE-2SV-SURVEYS, PHASE-3A-STOREFRONT

---

## Overview

This phase establishes the core Shopify App infrastructure that all tenants install on their Shopify stores. The app provides checkout customizations, webhooks, pixel tracking, and Shopify Functions for the multi-tenant platform.

**Key Principle**: Single app, multi-tenant architecture. Each tenant installs the same app, but their data is fully isolated.

---

## Success Criteria

- [ ] Shopify App OAuth flow works for tenant store connections
- [ ] OAuth tokens encrypted and stored per-tenant in database
- [ ] Shop domain → tenant mapping established on installation
- [ ] App scopes grant access to all required Shopify APIs
- [ ] Webhook verification uses per-tenant secrets
- [ ] Admin UI shows connection status and health
- [ ] Disconnect/reconnect flow works correctly

---

## Comprehensive Scope List

The platform app requests **50+ scopes** to support all current and future functionality:

### Core Commerce Scopes
| Scope | Purpose |
|-------|---------|
| `read_orders`, `write_orders` | Order management, fulfillment, refunds |
| `read_draft_orders`, `write_draft_orders` | Draft order creation for B2B, wholesale |
| `read_checkouts`, `write_checkouts` | Checkout access, abandoned cart recovery |
| `read_customers`, `write_customers` | Customer profiles, segments, tags |
| `read_customer_payment_methods` | Saved payment methods for subscriptions |

### Products & Inventory Scopes
| Scope | Purpose |
|-------|---------|
| `read_products`, `write_products` | Product catalog, variants, metafields |
| `read_inventory`, `write_inventory` | Stock levels, inventory management |
| `read_product_listings` | Product listings across channels |
| `read_publications` | Channel publication status |
| `read_product_feeds`, `write_product_feeds` | Product feeds for advertising |

### Fulfillment Scopes
| Scope | Purpose |
|-------|---------|
| `read_fulfillments`, `write_fulfillments` | Fulfillment status, tracking |
| `read_shipping`, `write_shipping` | Shipping rates, zones |
| `read_locations` | Store/warehouse locations |
| `read_merchant_managed_fulfillment_orders` | Merchant fulfillment orders |
| `write_merchant_managed_fulfillment_orders` | Update merchant fulfillments |
| `read_third_party_fulfillment_orders` | 3PL fulfillment orders |
| `write_third_party_fulfillment_orders` | Update 3PL fulfillments |
| `read_assigned_fulfillment_orders` | Assigned fulfillment orders |
| `write_assigned_fulfillment_orders` | Update assigned fulfillments |

### Marketing & Discounts Scopes
| Scope | Purpose |
|-------|---------|
| `read_discounts`, `write_discounts` | Discount codes, automatic discounts |
| `read_price_rules`, `write_price_rules` | Legacy price rules |
| `read_marketing_events`, `write_marketing_events` | Marketing campaign tracking |

### Gift Cards & Store Credit Scopes
| Scope | Purpose |
|-------|---------|
| `read_gift_cards`, `write_gift_cards` | Gift card issuance, balance |

### Content & Metafields Scopes
| Scope | Purpose |
|-------|---------|
| `read_content`, `write_content` | Metafields, metaobjects |
| `read_themes`, `write_themes` | Theme access (optional) |
| `read_locales` | Store localization settings |

### Pixel & Analytics Scopes
| Scope | Purpose |
|-------|---------|
| `write_pixels` | Web pixel extension deployment |
| `read_customer_events` | Customer event tracking |
| `read_analytics` | Store analytics (basic) |
| `read_reports` | Custom report access |

### Markets & International Scopes
| Scope | Purpose |
|-------|---------|
| `read_markets`, `write_markets` | Multi-market configuration |

### Subscription Scopes
| Scope | Purpose |
|-------|---------|
| `read_own_subscription_contracts` | Subscription management |
| `write_own_subscription_contracts` | Create/update subscriptions |
| `read_customer_merge` | Customer merge operations |

### File & Storage Scopes
| Scope | Purpose |
|-------|---------|
| `read_files`, `write_files` | File management API |

### Store Settings Scopes
| Scope | Purpose |
|-------|---------|
| `read_shop` | Shop settings, domain info |
| `read_legal_policies` | Legal policy content |

---

## Database Schema

### shopify_connections Table (Multi-Tenant)

```sql
CREATE TABLE shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shop TEXT NOT NULL,                                    -- mystore.myshopify.com
  access_token_encrypted TEXT NOT NULL,                  -- AES-256-GCM encrypted
  webhook_secret_encrypted TEXT,                         -- HMAC signing secret
  storefront_api_token_encrypted TEXT,                   -- Storefront API token
  scopes TEXT[] NOT NULL DEFAULT '{}',                   -- Granted scopes
  api_version TEXT NOT NULL DEFAULT '2026-01',

  -- Pixel extension status
  pixel_id TEXT,
  pixel_active BOOLEAN DEFAULT FALSE,

  -- Storefront configuration
  storefront_api_version TEXT DEFAULT '2026-01',
  site_url TEXT,                                         -- Headless storefront URL
  default_country TEXT DEFAULT 'US',
  default_language TEXT DEFAULT 'EN',

  -- Connection status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'disconnected')),
  last_webhook_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,

  -- Audit
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, shop)
);

CREATE INDEX idx_shopify_connections_tenant ON shopify_connections(tenant_id);
CREATE INDEX idx_shopify_connections_shop ON shopify_connections(shop);
```

### shopify_oauth_states Table (Temporary)

```sql
CREATE TABLE shopify_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  shop TEXT NOT NULL,
  state TEXT NOT NULL UNIQUE,                            -- CSRF token
  nonce TEXT NOT NULL,                                   -- Additional security
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oauth_states_state ON shopify_oauth_states(state);
CREATE INDEX idx_oauth_states_expires ON shopify_oauth_states(expires_at);
```

---

## OAuth Flow Implementation

### 1. Installation Initiation

```typescript
// packages/shopify/src/oauth/initiate.ts
export async function initiateOAuth(
  tenantId: string,
  shop: string,
  redirectUri: string
): Promise<string> {
  // Validate shop domain format
  if (!isValidShopDomain(shop)) {
    throw new ShopifyError('INVALID_SHOP', 'Invalid Shopify shop domain')
  }

  // Generate OAuth state
  const state = generateSecureToken(32)
  const nonce = generateSecureToken(16)

  // Store state for verification
  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO shopify_oauth_states (tenant_id, shop, state, nonce, redirect_uri, expires_at)
      VALUES (${tenantId}, ${shop}, ${state}, ${nonce}, ${redirectUri}, NOW() + INTERVAL '10 minutes')
    `
  })

  // Build authorization URL
  const scopes = PLATFORM_SCOPES.join(',')
  const authUrl = buildShopifyAuthUrl({
    shop,
    clientId: getShopifyClientId(),
    scopes,
    redirectUri,
    state,
    nonce,
  })

  return authUrl
}
```

### 2. OAuth Callback Handling

```typescript
// packages/shopify/src/oauth/callback.ts
export async function handleOAuthCallback(params: {
  shop: string
  code: string
  state: string
  hmac: string
  timestamp: string
}): Promise<{ tenantId: string; shop: string }> {
  // Verify HMAC signature
  if (!verifyHmacSignature(params, getShopifyClientSecret())) {
    throw new ShopifyError('INVALID_HMAC', 'OAuth signature verification failed')
  }

  // Lookup and validate state
  const oauthState = await sql`
    SELECT * FROM shopify_oauth_states
    WHERE state = ${params.state}
    AND expires_at > NOW()
  `

  if (oauthState.rows.length === 0) {
    throw new ShopifyError('INVALID_STATE', 'OAuth state expired or invalid')
  }

  const { tenant_id: tenantId, shop: expectedShop, nonce } = oauthState.rows[0]

  if (params.shop !== expectedShop) {
    throw new ShopifyError('SHOP_MISMATCH', 'Shop domain mismatch')
  }

  // Exchange code for access token
  const tokenResponse = await exchangeCodeForToken({
    shop: params.shop,
    code: params.code,
    clientId: getShopifyClientId(),
    clientSecret: getShopifyClientSecret(),
  })

  // Encrypt and store credentials
  const accessTokenEncrypted = encryptToken(tokenResponse.access_token)

  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO shopify_connections (tenant_id, shop, access_token_encrypted, scopes)
      VALUES (${tenantId}, ${params.shop}, ${accessTokenEncrypted}, ${tokenResponse.scope.split(',')})
      ON CONFLICT (tenant_id, shop) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        scopes = EXCLUDED.scopes,
        status = 'active',
        updated_at = NOW()
    `
  })

  // Clean up OAuth state
  await sql`DELETE FROM shopify_oauth_states WHERE state = ${params.state}`

  // Register webhooks for this shop
  await registerWebhooks(tenantId, params.shop)

  return { tenantId, shop: params.shop }
}
```

### 3. Credential Retrieval

```typescript
// packages/shopify/src/credentials.ts
export async function getShopifyCredentials(tenantId: string): Promise<ShopifyCredentials> {
  const cacheKey = `shopify:creds:${tenantId}`

  // Check cache first
  const cached = await getTenantCache(tenantId).get<ShopifyCredentials>(cacheKey)
  if (cached) return cached

  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT shop, access_token_encrypted, webhook_secret_encrypted, scopes, api_version
      FROM shopify_connections
      WHERE tenant_id = ${tenantId}
      AND status = 'active'
      LIMIT 1
    `
  })

  if (result.rows.length === 0) {
    throw new ShopifyError('NOT_CONNECTED', 'Shopify not connected for this tenant')
  }

  const row = result.rows[0]
  const credentials: ShopifyCredentials = {
    shop: row.shop,
    accessToken: decryptToken(row.access_token_encrypted),
    webhookSecret: row.webhook_secret_encrypted ? decryptToken(row.webhook_secret_encrypted) : null,
    scopes: row.scopes,
    apiVersion: row.api_version,
  }

  // Cache for 60 seconds
  await getTenantCache(tenantId).set(cacheKey, credentials, 60)

  return credentials
}
```

---

## Admin UI Pages

### /admin/integrations/shopify-app

**Connection Status Card:**
- Shop domain with verification badge
- Connection status (active/suspended/disconnected)
- Installed scopes list
- API version
- Last webhook received timestamp
- Last sync timestamp

**Actions:**
- Connect/Reconnect Store
- Disconnect Store
- Refresh Connection
- View Webhook Health

### Connection Status Component

```typescript
// apps/admin/src/components/integrations/shopify/ConnectionStatus.tsx
export function ShopifyConnectionStatus() {
  const { data: connection, isLoading } = useShopifyConnection()

  if (isLoading) return <Skeleton />

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shopify Store</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No Shopify store connected</p>
          <Button onClick={handleConnect} className="mt-4">
            Connect Shopify Store
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShopifyIcon className="h-5 w-5" />
            {connection.shop}
          </CardTitle>
          <StatusBadge status={connection.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="API Version" value={connection.apiVersion} />
          <Stat label="Scopes" value={`${connection.scopes.length} granted`} />
          <Stat label="Last Webhook" value={formatRelative(connection.lastWebhookAt)} />
          <Stat label="Connected" value={formatRelative(connection.installedAt)} />
        </div>

        <ScopesList scopes={connection.scopes} />

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshIcon className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="destructive" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## API Routes

### OAuth Routes

```
POST /api/admin/integrations/shopify/oauth/initiate
  - Generates OAuth URL for store connection
  - Returns { authUrl: string }

GET /api/admin/integrations/shopify/oauth/callback
  - Handles OAuth callback from Shopify
  - Exchanges code for token, stores encrypted
  - Registers webhooks
  - Redirects to admin

DELETE /api/admin/integrations/shopify/connection
  - Disconnects store
  - Unregisters webhooks
  - Clears cached credentials
```

### Status Routes

```
GET /api/admin/integrations/shopify/connection
  - Returns connection status, scopes, health

POST /api/admin/integrations/shopify/connection/refresh
  - Refreshes connection health check
  - Verifies token validity

GET /api/admin/integrations/shopify/webhooks/health
  - Returns webhook delivery stats
  - Shows recent failures
```

---

## Encryption Pattern

```typescript
// packages/shopify/src/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

export function encryptToken(token: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey()
  const [ivHex, authTagHex, cipherText] = encrypted.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(cipherText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

function getEncryptionKey(): Buffer {
  const keyHex = process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('SHOPIFY_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars)')
  }
  return Buffer.from(keyHex, 'hex')
}
```

---

## Environment Variables

```env
# Shopify App Configuration
SHOPIFY_CLIENT_ID=your-client-id
SHOPIFY_CLIENT_SECRET=your-client-secret
SHOPIFY_TOKEN_ENCRYPTION_KEY=64-hex-character-key-for-aes-256

# Webhook Configuration
SHOPIFY_WEBHOOK_SIGNING_SECRET=your-webhook-secret

# API Configuration
SHOPIFY_API_VERSION=2026-01
```

---

## Multi-Tenant Webhook Routing

Webhooks must route to the correct tenant based on shop domain:

```typescript
// packages/shopify/src/webhooks/router.ts
export async function getTenantIdForShop(shop: string): Promise<string | null> {
  const result = await sql`
    SELECT tenant_id FROM shopify_connections
    WHERE shop = ${shop}
    AND status = 'active'
    LIMIT 1
  `

  return result.rows[0]?.tenant_id || null
}

export async function handleWebhook(request: Request): Promise<Response> {
  const shop = request.headers.get('x-shopify-shop-domain')
  const topic = request.headers.get('x-shopify-topic')
  const hmac = request.headers.get('x-shopify-hmac-sha256')

  if (!shop || !topic || !hmac) {
    return new Response('Missing headers', { status: 400 })
  }

  // Get tenant for this shop
  const tenantId = await getTenantIdForShop(shop)
  if (!tenantId) {
    console.warn(`Webhook from unknown shop: ${shop}`)
    return new Response('Shop not found', { status: 404 })
  }

  // Verify HMAC with tenant's webhook secret
  const credentials = await getShopifyCredentials(tenantId)
  const body = await request.text()

  if (!verifyWebhookHmac(body, hmac, credentials.webhookSecret)) {
    console.error(`Invalid webhook signature for shop: ${shop}`)
    return new Response('Invalid signature', { status: 401 })
  }

  // Route to appropriate handler with tenant context
  await routeWebhook(tenantId, topic, JSON.parse(body))

  return new Response('OK', { status: 200 })
}
```

---

## Non-Negotiable Requirements

1. **Encryption**: All tokens encrypted with AES-256-GCM, never stored in plaintext
2. **Tenant Isolation**: Each shop connection scoped to exactly one tenant
3. **HMAC Verification**: All webhooks verified before processing
4. **Scope Management**: Request all scopes upfront for future-proofing
5. **Credential Caching**: Cache credentials with short TTL to reduce DB load
6. **OAuth State Expiry**: State tokens expire in 10 minutes

---

## Reference Implementation

```
RAWDOG Reference Files:
- /shopify-app/shopify.app.toml                  # Current app config
- /src/lib/shopify/credentials.ts                # Credential management
- /src/lib/shopify/encryption.ts                 # Token encryption
- /src/lib/shopify/db/schema.ts                  # Database schema
- /src/app/api/shopify-app/                      # OAuth routes
```

---

## Definition of Done

- [ ] OAuth flow completes successfully for new tenant connections
- [ ] Tokens encrypted with AES-256-GCM in database
- [ ] Shop → tenant mapping works for webhook routing
- [ ] Admin UI shows connection status with all details
- [ ] Disconnect removes all stored credentials
- [ ] Credential caching reduces DB queries
- [ ] All 50+ scopes requested and granted
- [ ] Integration tests pass for OAuth flow
