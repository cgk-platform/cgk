# PHASE-2P-INTEGRATIONS-ADMIN: Integration Hub & Admin Pages

**Duration**: Week 11-12 (parallel with PHASE-2PO-OAUTH-INTEGRATIONS)
**Depends On**: PHASE-2PO-OAUTH-INTEGRATIONS (OAuth flows), PHASE-2A-ADMIN-SHELL (admin layout)
**Parallel With**: PHASE-2CM (Communications), PHASE-2PO-LOGGING
**Blocks**: None (integrations can be configured post-launch)

---

## Goal

Implement the complete Integrations admin UI section with:
- Central integration hub with status dashboard
- Individual integration configuration pages
- Connection status monitoring
- Multi-tenant credential isolation
- Health monitoring and error tracking

---

## Success Criteria

- [ ] Integration hub shows all integration statuses at a glance
- [ ] Each integration has dedicated configuration page
- [ ] OAuth connections can be initiated and revoked from UI
- [ ] API key integrations have secure input with test functionality
- [ ] Connection health indicators update in real-time
- [ ] Multi-tenant isolation verified (each tenant sees only their integrations)
- [ ] Error states display with actionable troubleshooting steps

---

## RAWDOG Source Reference

| Page | Path | Purpose |
|------|------|---------|
| Integration Hub | `/src/app/admin/integrations/page.tsx` | Central status dashboard |
| SMS/Voice | `/src/app/admin/integrations/sms/page.tsx` | Retell.ai SMS & voice |
| SMS Audit Log | `/src/app/admin/integrations/sms/audit-log/page.tsx` | TCPA compliance log |
| SMS Notifications | `/src/app/admin/integrations/sms/notifications/page.tsx` | Channel configuration |
| Slack | `/src/app/admin/integrations/slack/page.tsx` | Slack workspace |
| Shopify App | `/src/app/admin/integrations/shopify-app/page.tsx` | Shopify OAuth & pixel |
| Klaviyo | `/src/app/admin/integrations/klaviyo/page.tsx` | Email/SMS marketing |
| Yotpo | `/src/app/admin/integrations/yotpo/page.tsx` | Reviews |
| TikTok Ads | `/src/app/admin/integrations/tiktok-ads/page.tsx` | TikTok OAuth & pixel |
| Meta Ads | `/src/app/admin/meta-ads/page.tsx` | Facebook/Instagram ads |
| Google Ads | `/src/app/admin/google-ads/page.tsx` | Google Ads OAuth/Script |
| MCP Dashboard | `/src/app/admin/mcp/page.tsx` | MCP server management |
| MCP Analytics | `/src/app/admin/mcp/analytics/page.tsx` | MCP usage metrics |
| MCP OAuth Callback | `/src/app/admin/mcp/oauth-callback/page.tsx` | OAuth callback handler |

---

## 1. INTEGRATION HUB (Central Dashboard)

### Route Structure
```
/admin/integrations
├── (overview)                   # Integration hub dashboard
├── /sms                         # SMS/Voice (Retell)
│   ├── /audit-log               # TCPA compliance audit log
│   └── /notifications           # Channel configuration
├── /slack                       # Slack workspace
├── /shopify-app                 # Shopify App OAuth
├── /klaviyo                     # Klaviyo email/SMS
├── /yotpo                       # Yotpo reviews
└── /tiktok-ads                  # TikTok Ads
```

### Hub Display

```typescript
// apps/admin/src/app/admin/integrations/page.tsx

interface IntegrationCard {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  statusDetails?: string
  configPath: string
  category: 'commerce' | 'advertising' | 'communications' | 'marketing' | 'platform'
  connectionType: 'oauth' | 'api_key' | 'env' | 'hybrid'
  lastSyncedAt?: string
}

const INTEGRATION_CATEGORIES = [
  {
    id: 'commerce',
    label: 'E-Commerce',
    integrations: ['shopify-app'],
  },
  {
    id: 'advertising',
    label: 'Advertising',
    integrations: ['meta-ads', 'google-ads', 'tiktok-ads'],
  },
  {
    id: 'communications',
    label: 'Communications',
    integrations: ['sms', 'slack'],
  },
  {
    id: 'marketing',
    label: 'Marketing & Reviews',
    integrations: ['klaviyo', 'yotpo'],
  },
  {
    id: 'platform',
    label: 'Platform',
    integrations: ['mcp'],
  },
]
```

### Status Fetching Pattern

```typescript
// Parallel status fetching for all integrations
async function fetchAllIntegrationStatuses(tenantId: string) {
  const [
    shopifyStatus,
    googleStatus,
    tiktokStatus,
    klaviyoStatus,
    yotpoStatus,
    slackStatus,
    smsStatus,
    metaStatus,
    mcpStatus,
  ] = await Promise.all([
    fetch('/api/admin/shopify-app/status'),
    fetch('/api/admin/bri/integrations'),
    fetch('/api/admin/tiktok/status'),
    fetch('/api/admin/klaviyo/status'),
    fetch('/api/admin/yotpo/status'),
    fetch('/api/admin/slack'),
    fetch('/api/admin/sms/status'),
    fetch('/api/admin/meta-ads/status'),
    fetch('/api/admin/mcp-status'),
  ])

  // Aggregate and return
}
```

---

## 2. ADVERTISING INTEGRATIONS

### 2.1 Meta Ads (`/admin/meta-ads`)

**Features:**
- OAuth connection to Meta Marketing API
- Account selection (multiple ad accounts)
- CAPI pixel configuration
- Spend data sync status
- Backfill historical data

**Components:**
```typescript
// From RAWDOG: ConnectionManager, SyncStatus
// packages/ui/src/components/admin/meta-ads/

interface MetaAdsStatus {
  connected: boolean
  accounts: MetaAdAccount[]
  selectedAccountId?: string
  pixelId?: string
  capiConfigured: boolean
  lastSyncedAt?: string
  tokenExpiresAt?: string
  syncStatus: 'idle' | 'syncing' | 'error'
}
```

### 2.2 Google Ads (`/admin/google-ads`)

**Two Modes:**
1. **API Mode (OAuth)** - Full automation
2. **Script Mode (Workaround)** - Manual Google Ads script for API approval wait

**Features:**
- Dual-mode tabs (API vs Script)
- Customer ID registration
- Script generation for workaround
- Spend data sync
- GAQL query interface (advanced)

**Schema Initialization:**
```typescript
// Check and initialize database schema on first load
async function checkAndInitSchema() {
  const response = await fetch('/api/google-ads/init')
  if (!response.ok) {
    // Show schema initialization prompt
  }
}
```

### 2.3 TikTok Ads (`/admin/integrations/tiktok-ads`)

**Features:**
- OAuth connection with Marketing API
- Advertiser ID configuration
- Pixel ID configuration
- Events API access token (server-side)
- Token expiration warnings
- Spend sync status

**Pixel Configuration Card:**
```typescript
interface TikTokPixelConfig {
  pixelId: string           // Required
  eventsApiAccessToken: string  // Optional for server-side
}

// Separate from OAuth - allows pixel config even with env-based auth
```

---

## 3. E-COMMERCE INTEGRATIONS

### 3.1 Shopify App (`/admin/integrations/shopify-app`)

**Features:**
- OAuth connection with expanded scopes (40 scopes)
- Shop domain display
- Web pixel status (GA4 + Meta CAPI)
- Storefront API configuration (separate token)
- Re-authorization flow for scope expansion
- Disconnect functionality

**OAuth Scopes Display:**
```typescript
const SHOPIFY_SCOPES_DISPLAY = [
  { category: 'Pixels', scopes: ['write_pixels', 'read_customer_events'] },
  { category: 'Orders', scopes: ['read_orders', 'write_orders'] },
  { category: 'Customers', scopes: ['read_customers', 'write_customers'] },
  { category: 'Products', scopes: ['read_products'] },
  { category: 'Discounts', scopes: ['read_discounts', 'write_discounts'] },
  // ... more scope categories
]
```

**Storefront Configuration:**
- Separate from OAuth token
- API version selection
- Site URL configuration
- Country/language defaults

---

## 4. COMMUNICATIONS INTEGRATIONS

### 4.1 SMS/Voice (`/admin/integrations/sms`)

**Main Page Features:**
- Retell.ai provider status
- TCPA compliance dashboard
- Message statistics (today, week, month)
- Feature flags (SMS enabled, creator/customer enabled)
- Message category explanations (transactional vs marketing)
- Test message sender
- System health & safeguards display

**Sub-Pages:**

#### Audit Log (`/admin/integrations/sms/audit-log`)
```typescript
interface AuditLogEntry {
  id: string
  phone: string
  email: string | null
  channel: 'sms' | 'email'
  action: 'opt_in' | 'opt_out' | 'consent_granted' | 'consent_revoked' | 'consent_violation_attempt'
  source: 'checkout' | 'admin' | 'stop_keyword' | 'api' | 'import'
  ipAddress: string | null
  createdAt: string
}
```

**Features:**
- Date range filtering
- Action type filtering
- Source filtering
- Phone/email search
- CSV export for compliance
- Pagination (50 per page)

#### Notifications (`/admin/integrations/sms/notifications`)
- Channel configuration per notification type
- Enable/disable toggles
- Channel selection (SMS, email, portal)

### 4.2 Slack (`/admin/integrations/slack`)

**Features:**
- OAuth workspace connection
- Channel configuration by notification type
- Category-based organization (creators, orders, marketing, system, productivity)
- Per-notification enable/disable toggles
- Channel selector dropdowns
- MCP tools documentation (45 tools displayed)
- Setup instructions for new installations

**Notification Categories:**
```typescript
const SLACK_NOTIFICATION_CATEGORIES = [
  { id: 'creators', label: 'Creator Notifications', icon: '👤' },
  { id: 'orders', label: 'Order Notifications', icon: '📦' },
  { id: 'marketing', label: 'Marketing', icon: '📣' },
  { id: 'system', label: 'System Alerts', icon: '⚙️' },
  { id: 'productivity', label: 'Productivity', icon: '📋' },
]
```

---

## 5. MARKETING INTEGRATIONS

### 5.1 Klaviyo (`/admin/integrations/klaviyo`)

**Features:**
- API key input (private + public)
- Connection test functionality
- Company name display after connection
- SMS/Email list ID configuration
- Auth source indicator (database vs env)
- Disconnect functionality

**Connection Flow:**
1. Enter private API key
2. Click "Test Connection" to validate
3. On success, shows company name
4. Configure optional list IDs
5. Click "Save & Connect"

### 5.2 Yotpo (`/admin/integrations/yotpo`)

**Features:**
- App Key + API Secret input
- Connection test functionality
- Product ID mapping display (Shopify product IDs)
- Auth source indicator
- Disconnect functionality

**Product Mapping:**
```typescript
// Display Shopify product IDs used for review fetching
interface YotpoProductMappings {
  cleanser?: string
  moisturizer?: string
  eyeCream?: string
  bundle?: string
}
```

---

## 6. PLATFORM INTEGRATIONS

### 6.1 MCP Server (`/admin/mcp`)

**Features:**
- Quick setup wizard (5-min setup)
- Platform toggle (macOS/Windows)
- API key management (create/revoke)
- Claude Connect setup for web/mobile
- OAuth credentials management (manual workaround)
- Capability reference grid (12 capability categories)
- Troubleshooting section

**Capability Categories:**
```typescript
const MCP_CAPABILITIES = [
  { id: 'blog', icon: '📝', title: 'Blog', desc: 'Create & manage posts' },
  { id: 'promo-codes', icon: '🎟️', title: 'Promo Codes', desc: 'Shopify discount codes' },
  { id: 'promotions', icon: '🏷️', title: 'Promotions', desc: 'Schedule site-wide sales' },
  { id: 'landing', icon: '🎨', title: 'Landing Pages', desc: 'Build campaign pages' },
  { id: 'ugc', icon: '📦', title: 'UGC Orders', desc: 'Send free samples' },
  { id: 'config', icon: '⚙️', title: 'Site Config', desc: 'Edit hero, nav, footer' },
  { id: 'reviews', icon: '⭐', title: 'Yotpo Reviews', desc: 'Feature reviews' },
  { id: 'scheduling', icon: '📅', title: 'Scheduling', desc: 'Calendly-style bookings' },
  { id: 'calendar', icon: '🗓️', title: 'Calendar Assistant', desc: 'Personal calendar' },
  { id: 'analytics', icon: '📊', title: 'Analytics', desc: 'Revenue insights' },
  { id: 'subscription-emails', icon: '📧', title: 'Subscription Emails', desc: 'Email templates' },
  { id: 'slack', icon: '💬', title: 'Slack (45 tools)', desc: 'Full workspace control' },
]
```

### 6.2 MCP Analytics (`/admin/mcp/analytics`)

**Features:**
- Tool usage metrics (calls, unique tools, sessions)
- Token consumption tracking
- Error rate monitoring
- Tool usage by name (bar chart)
- Tool usage by category (bar chart)
- Token usage by event type
- Recent activity feed
- Top errors list
- Unused tools list
- Time period selector (1, 7, 14, 30 days)

**Summary Metrics:**
```typescript
interface MCPAnalyticsSummary {
  totalToolCalls: number
  uniqueTools: number
  totalTokens: number
  avgTokensPerSession: number
  errorRate: number
  uniqueSessions: number
}
```

---

## 7. MULTI-TENANT ISOLATION

### Credential Storage

All integration credentials MUST be tenant-isolated:

```sql
-- Integration credentials table (per-tenant)
CREATE TABLE {tenant_schema}.integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type VARCHAR(50) NOT NULL,  -- 'meta_ads', 'google_ads', etc.
  credentials JSONB NOT NULL,              -- Encrypted credentials
  status VARCHAR(20) DEFAULT 'active',
  connected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(integration_type)
);

-- API routes MUST verify tenant context
export async function GET(request: NextRequest) {
  const { tenantId, userId } = await getTenantContext(request)
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Query only tenant's credentials
  const credentials = await db.query(
    `SELECT * FROM ${tenantId}.integration_credentials WHERE integration_type = $1`,
    [integrationType]
  )
  // ...
}
```

### Token Encryption

Per PHASE-2PO-OAUTH-INTEGRATIONS, all tokens encrypted with AES-256-GCM:

```typescript
// Encrypt before storage
const encryptedToken = await encryptToken(accessToken, process.env.TOKEN_ENCRYPTION_KEY)

// Decrypt when needed
const accessToken = await decryptToken(encryptedToken, process.env.TOKEN_ENCRYPTION_KEY)
```

---

## 8. API ROUTES STRUCTURE

```
/api/admin/
├── integrations/               # Meta route group
├── shopify-app/
│   ├── status                  # GET: Connection status
│   ├── auth                    # GET: Start OAuth
│   └── callback                # GET: OAuth callback
├── tiktok/
│   ├── status                  # GET: Connection status
│   ├── oauth                   # GET: Start OAuth
│   ├── disconnect              # DELETE: Remove connection
│   └── pixel-config            # POST: Save pixel config
├── klaviyo/
│   ├── status                  # GET: Connection status
│   ├── test                    # POST: Test API key
│   ├── connect                 # POST: Save credentials
│   └── disconnect              # DELETE: Remove connection
├── yotpo/
│   ├── status                  # GET: Connection status
│   ├── test                    # POST: Test credentials
│   ├── connect                 # POST: Save credentials
│   └── disconnect              # DELETE: Remove connection
├── slack/
│   ├── (root)                  # GET: Status, POST: Config, DELETE: Disconnect
│   ├── oauth/connect           # GET: Start OAuth
│   └── oauth/callback          # GET: OAuth callback
├── sms/
│   ├── status                  # GET: Provider status
│   ├── consent-stats           # GET: Consent statistics
│   ├── test                    # POST: Send test message
│   └── audit-log/
│       ├── (root)              # GET: Paginated log
│       └── export              # GET: CSV export
├── meta-ads/
│   ├── status                  # GET: Connection status
│   ├── auth                    # GET: Start OAuth
│   ├── callback                # GET: OAuth callback
│   └── sync                    # POST: Trigger sync
├── google-ads/
│   ├── init                    # GET/POST: Schema init
│   ├── status                  # GET: Connection status
│   ├── auth                    # GET: Start OAuth
│   ├── callback                # GET: OAuth callback
│   └── script/                 # Script mode endpoints
├── mcp-keys/                   # API key management
├── mcp-oauth-clients/          # OAuth client management
└── mcp-analytics/              # Usage analytics
```

---

## 9. COMPONENT LIBRARY

### Shared Components

```typescript
// packages/ui/src/components/admin/integrations/

// Connection status badge
export function ConnectionStatusBadge({ status }: { status: IntegrationStatus }) {
  const styles = {
    connected: 'bg-green-50 text-green-600',
    disconnected: 'bg-gray-50 text-gray-500',
    error: 'bg-red-50 text-red-600',
    pending: 'bg-amber-50 text-amber-600',
  }
  // ...
}

// Integration card for hub
export function IntegrationCard({ integration }: { integration: IntegrationCard }) { }

// OAuth connect button
export function OAuthConnectButton({ provider, onConnect }: {
  provider: 'meta' | 'google' | 'tiktok' | 'shopify' | 'slack'
  onConnect: () => void
}) { }

// API key input with visibility toggle
export function SecureApiKeyInput({
  value,
  onChange,
  placeholder,
  label,
}: SecureInputProps) { }

// Connection test result display
export function TestConnectionResult({
  success: boolean
  message?: string
  details?: Record<string, unknown>
}) { }
```

---

## 10. IMPLEMENTATION CHECKLIST

### Phase 1: Hub & Core Structure
- [ ] Create `/admin/integrations` route with category layout
- [ ] Implement parallel status fetching for all integrations
- [ ] Create shared integration card component
- [ ] Add connection status badges
- [ ] Create sidebar navigation for integrations section

### Phase 2: OAuth Integrations
- [ ] Meta Ads connection UI with account selection
- [ ] Google Ads dual-mode (API/Script) interface
- [ ] TikTok Ads connection with pixel configuration
- [ ] Shopify App with re-auth flow

### Phase 3: API Key Integrations
- [ ] Klaviyo configuration with test functionality
- [ ] Yotpo configuration with test functionality
- [ ] Secure input components with visibility toggle

### Phase 4: Communications
- [ ] SMS/Voice main page with Retell.ai status
- [ ] SMS Audit Log with filtering and export
- [ ] SMS Notification channel configuration
- [ ] Slack workspace connection with channel mapping

### Phase 5: Platform
- [ ] MCP dashboard with capability reference
- [ ] MCP API key management
- [ ] MCP OAuth client management (workaround)
- [ ] MCP analytics dashboard

### Phase 6: Multi-Tenant
- [ ] Verify tenant isolation on all endpoints
- [ ] Test credential encryption/decryption
- [ ] Verify no cross-tenant data leakage

---

## 11. TESTING REQUIREMENTS

### Integration Tests
- OAuth flow completion (mock OAuth providers)
- API key validation flows
- Connection/disconnection workflows
- Status refresh functionality

### Multi-Tenant Tests
- Tenant A cannot see Tenant B's integrations
- Credentials are properly encrypted
- OAuth state includes tenant context
- Callback routes verify tenant ownership

### UI Tests
- Integration hub loads all statuses
- Individual pages display correct states
- Form validation works correctly
- Error states display appropriate messages
