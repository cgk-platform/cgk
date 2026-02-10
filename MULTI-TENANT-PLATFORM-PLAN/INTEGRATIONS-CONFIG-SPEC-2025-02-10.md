# Integrations Configuration Specification

**Created**: 2025-02-10
**Status**: Design Complete
**Purpose**: Comprehensive integration setup for multi-tenant brands - during onboarding AND post-launch via admin settings

---

## Overview

The platform integrates with 24+ third-party services. This spec covers:
1. **Onboarding Integration Steps** - Initial setup during brand creation
2. **Admin Settings Pages** - Post-launch configuration and management
3. **Skip & Configure Later** - Clear UX for deferring optional integrations

### Core Principle: Nothing is Blocked

All integrations except Shopify can be skipped during onboarding and configured later via Admin Settings. The UI should make this clear and not pressure users to configure everything upfront.

---

## Integration Categories

### Required (Cannot Skip)
| Integration | Purpose | Configured In |
|-------------|---------|---------------|
| **Shopify** | Products, orders, checkout | Onboarding Step 2 |

### Recommended (Should Configure)
| Integration | Purpose | Configured In |
|-------------|---------|---------------|
| **Stripe Connect** | Creator/vendor payouts | Onboarding Step 4 OR Admin Settings |
| **Resend** | Transactional emails | Platform-level (shared) OR Admin Settings |

### Optional (Configure When Needed)
| Integration | Purpose | Configured In |
|-------------|---------|---------------|
| **Meta Ads** | Attribution, CAPI, spend sync | Admin Settings |
| **Google Ads** | Attribution, spend sync | Admin Settings |
| **TikTok Ads** | Pixel, Events API, spend sync | Admin Settings |
| **GA4** | Web analytics | Admin Settings |
| **Klaviyo** | Email/SMS marketing | Admin Settings |
| **Yotpo** | Product reviews | Admin Settings |
| **Slack** | Internal notifications | Admin Settings |
| **Wise** | International payouts | Admin Settings |
| **Retell** | Voice AI, SMS | Admin Settings |
| **ElevenLabs** | Text-to-speech for AI | Admin Settings |
| **Mux** | Video hosting | Admin Settings |
| **AssemblyAI** | Transcription | Admin Settings |
| **Google Drive** | File storage, DAM | Admin Settings |
| **Google Calendar** | Scheduling | Admin Settings |
| **Fairing** | Post-purchase surveys | Admin Settings |
| **Plaid** | Bank account verification | Admin Settings |
| **PayPal** | Alternative payouts | Admin Settings |
| **Lob** | Physical mail (tax forms) | Admin Settings |
| **Microsoft Clarity** | Session recording/heatmaps | Admin Settings |
| **Better Stack** | Uptime monitoring | Platform-level |
| **Sentry** | Error tracking | Platform-level |

---

## Part 1: Onboarding Integration Steps

### Updated Wizard Flow

The onboarding wizard now has an **optional** "Connect Integrations" step after core setup:

| Step | Name | Required | Can Skip |
|------|------|----------|----------|
| 1 | Basic Information | Yes | No |
| 2 | Connect Shopify | Yes | No |
| 2b | Shopify Setup | Yes | No |
| 3 | Configure Domains | No | Yes |
| 4 | Configure Payments | Recommended | Yes |
| **5** | **Connect Integrations** | **No** | **Yes** |
| 6 | Enable Features | Yes | No |
| 7 | Import Products | No | Yes |
| 8 | Invite Users | No | Yes |
| 9 | Review & Launch | Yes | No |

### Step 5: Connect Integrations (Optional)

```typescript
// apps/orchestrator/src/app/brands/new/step-5/page.tsx
'use client'

interface IntegrationCard {
  id: string
  name: string
  description: string
  icon: React.ComponentType
  category: 'marketing' | 'analytics' | 'communication' | 'reviews'
  authType: 'oauth' | 'api_key'
  recommended?: boolean
  connectedTo?: string  // e.g., "Meta Business Suite"
}

const AVAILABLE_INTEGRATIONS: IntegrationCard[] = [
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    description: 'Track conversions and sync ad spend from Facebook & Instagram',
    icon: MetaIcon,
    category: 'marketing',
    authType: 'oauth',
    recommended: true,
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Track conversions and sync ad spend from Google',
    icon: GoogleAdsIcon,
    category: 'marketing',
    authType: 'oauth',
    recommended: true,
  },
  {
    id: 'tiktok_ads',
    name: 'TikTok Ads',
    description: 'Pixel tracking and Events API for TikTok campaigns',
    icon: TikTokIcon,
    category: 'marketing',
    authType: 'oauth',
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    description: 'Web analytics and conversion tracking',
    icon: GA4Icon,
    category: 'analytics',
    authType: 'api_key',
    recommended: true,
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    description: 'Email and SMS marketing automation',
    icon: KlaviyoIcon,
    category: 'communication',
    authType: 'api_key',
  },
  {
    id: 'yotpo',
    name: 'Yotpo',
    description: 'Product reviews and UGC',
    icon: YotpoIcon,
    category: 'reviews',
    authType: 'api_key',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications about orders, creators, and alerts',
    icon: SlackIcon,
    category: 'communication',
    authType: 'oauth',
  },
]

export default function IntegrationsStep() {
  const { organization, stepData, updateStep, nextStep, skipStep } = useOnboarding()
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([])
  const [connectingId, setConnectingId] = useState<string | null>(null)

  async function connectIntegration(integration: IntegrationCard) {
    setConnectingId(integration.id)

    if (integration.authType === 'oauth') {
      // Redirect to OAuth flow
      const response = await fetch(`/api/platform/integrations/${integration.id}/oauth/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id }),
      })
      const { authUrl } = await response.json()
      window.location.href = authUrl
    } else {
      // Open API key modal
      openApiKeyModal(integration)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Connect Integrations</h2>
        <p className="text-muted-foreground mt-1">
          Connect your marketing and analytics platforms.
          <strong className="text-foreground"> You can skip this and set up integrations later</strong> in Admin Settings.
        </p>
      </div>

      {/* Skip Banner */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-600" />
          <p className="text-sm text-blue-900">
            All integrations are optional. Connect what you need now, or configure later in Settings → Integrations.
          </p>
        </div>
        <Button variant="outline" onClick={skipStep}>
          Skip for Now
        </Button>
      </div>

      {/* Integration Categories */}
      {['marketing', 'analytics', 'communication', 'reviews'].map((category) => (
        <div key={category} className="space-y-3">
          <h3 className="font-medium capitalize">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_INTEGRATIONS.filter(i => i.category === category).map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                isConnected={connectedIntegrations.includes(integration.id)}
                isConnecting={connectingId === integration.id}
                onConnect={() => connectIntegration(integration)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Continue */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="ghost" onClick={skipStep}>
          Skip All Integrations
        </Button>
        <Button onClick={nextStep}>
          Continue to Features
        </Button>
      </div>
    </div>
  )
}

function IntegrationCard({
  integration,
  isConnected,
  isConnecting,
  onConnect,
}: {
  integration: IntegrationCard
  isConnected: boolean
  isConnecting: boolean
  onConnect: () => void
}) {
  return (
    <Card className={cn(
      'relative',
      isConnected && 'border-green-500 bg-green-50'
    )}>
      {integration.recommended && !isConnected && (
        <Badge className="absolute -top-2 -right-2" variant="secondary">
          Recommended
        </Badge>
      )}
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <integration.icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium">{integration.name}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {integration.description}
            </p>
          </div>
        </div>
        <div className="mt-4">
          {isConnected ? (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Part 2: OAuth Flow Patterns

### Standard OAuth Flow (Meta, Google, TikTok)

```typescript
// packages/integrations/src/oauth/meta.ts
export const META_OAUTH_CONFIG = {
  authorizationUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
  tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
  scopes: [
    'ads_management',
    'ads_read',
    'business_management',
    'pages_read_engagement',
    'pages_show_list',
    'public_profile',
    // ... 40+ scopes
  ],
  tokenRefresh: true,
  tokenExpiresIn: 60 * 60 * 24 * 60, // 60 days
}

export async function startMetaOAuth(params: {
  organizationId: string
  redirectUri: string
}): Promise<{ authUrl: string; state: string }> {
  const state = await generateOAuthState(params.organizationId, 'meta')

  const authUrl = new URL(META_OAUTH_CONFIG.authorizationUrl)
  authUrl.searchParams.set('client_id', process.env.META_APP_ID!)
  authUrl.searchParams.set('redirect_uri', params.redirectUri)
  authUrl.searchParams.set('scope', META_OAUTH_CONFIG.scopes.join(','))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')

  return { authUrl: authUrl.toString(), state }
}

export async function handleMetaCallback(params: {
  code: string
  state: string
  organizationId: string
}): Promise<MetaConnection> {
  // Verify state
  const isValid = await verifyOAuthState(params.state, params.organizationId, 'meta')
  if (!isValid) throw new Error('Invalid OAuth state')

  // Exchange code for token
  const tokenResponse = await fetch(META_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
  })

  const { access_token, expires_in } = await tokenResponse.json()

  // Get ad accounts
  const accountsResponse = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?access_token=${access_token}`
  )
  const { data: adAccounts } = await accountsResponse.json()

  // Store encrypted token
  const encryptedToken = await encryptToken(access_token)

  await sql`
    INSERT INTO public.integration_connections (
      organization_id,
      provider,
      access_token_encrypted,
      token_expires_at,
      metadata,
      connected_at
    ) VALUES (
      ${params.organizationId},
      'meta',
      ${encryptedToken},
      NOW() + INTERVAL '${expires_in} seconds',
      ${JSON.stringify({ adAccounts })},
      NOW()
    )
    ON CONFLICT (organization_id, provider) DO UPDATE SET
      access_token_encrypted = EXCLUDED.access_token_encrypted,
      token_expires_at = EXCLUDED.token_expires_at,
      metadata = EXCLUDED.metadata,
      connected_at = NOW()
  `

  return { connected: true, adAccounts }
}
```

### API Key Pattern (GA4, Klaviyo, Yotpo)

```typescript
// packages/integrations/src/api-keys/klaviyo.ts
export async function connectKlaviyo(params: {
  organizationId: string
  privateApiKey: string
  publicApiKey: string
}): Promise<KlaviyoConnection> {
  // Validate API keys by making a test request
  const testResponse = await fetch('https://a.klaviyo.com/api/accounts/', {
    headers: {
      'Authorization': `Klaviyo-API-Key ${params.privateApiKey}`,
      'revision': '2024-02-15',
    },
  })

  if (!testResponse.ok) {
    throw new Error('Invalid Klaviyo API key')
  }

  const { data: account } = await testResponse.json()

  // Store encrypted keys
  const encryptedPrivate = await encryptToken(params.privateApiKey)
  const encryptedPublic = await encryptToken(params.publicApiKey)

  await sql`
    INSERT INTO public.integration_connections (
      organization_id,
      provider,
      access_token_encrypted,
      refresh_token_encrypted,
      metadata,
      connected_at
    ) VALUES (
      ${params.organizationId},
      'klaviyo',
      ${encryptedPrivate},
      ${encryptedPublic},
      ${JSON.stringify({ accountId: account.id, accountName: account.attributes.contact_information.organization_name })},
      NOW()
    )
    ON CONFLICT (organization_id, provider) DO UPDATE SET
      access_token_encrypted = EXCLUDED.access_token_encrypted,
      refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
      metadata = EXCLUDED.metadata,
      connected_at = NOW()
  `

  return { connected: true, account }
}
```

---

## Part 3: Admin Settings - Integrations Hub

### Database Schema

```sql
-- Integration connections (in public schema for cross-tenant queries)
CREATE TABLE public.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  provider VARCHAR(50) NOT NULL,

  -- Credentials (encrypted)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Connection metadata (account IDs, names, scopes)
  metadata JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'active', 'expired', 'error', 'disconnected'
  )),
  last_error TEXT,
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,

  UNIQUE(organization_id, provider)
);

CREATE INDEX idx_integration_connections_org
  ON public.integration_connections(organization_id);

CREATE INDEX idx_integration_connections_status
  ON public.integration_connections(status)
  WHERE status != 'active';
```

### Integrations Overview Page

```typescript
// apps/admin/src/app/admin/settings/integrations/page.tsx
export default async function IntegrationsPage() {
  const tenant = await getTenantContext()
  const connections = await getIntegrationConnections(tenant.organizationId)

  const integrationGroups = [
    {
      title: 'Advertising Platforms',
      description: 'Track conversions and sync ad spend',
      integrations: [
        { id: 'meta_ads', name: 'Meta Ads', ...getConnectionStatus(connections, 'meta') },
        { id: 'google_ads', name: 'Google Ads', ...getConnectionStatus(connections, 'google_ads') },
        { id: 'tiktok_ads', name: 'TikTok Ads', ...getConnectionStatus(connections, 'tiktok') },
      ],
    },
    {
      title: 'Analytics',
      description: 'Web analytics and tracking',
      integrations: [
        { id: 'ga4', name: 'Google Analytics 4', ...getConnectionStatus(connections, 'ga4') },
      ],
    },
    {
      title: 'Marketing',
      description: 'Email and SMS marketing',
      integrations: [
        { id: 'klaviyo', name: 'Klaviyo', ...getConnectionStatus(connections, 'klaviyo') },
      ],
    },
    {
      title: 'Reviews',
      description: 'Product reviews and UGC',
      integrations: [
        { id: 'yotpo', name: 'Yotpo', ...getConnectionStatus(connections, 'yotpo') },
      ],
    },
    {
      title: 'Communication',
      description: 'Notifications and messaging',
      integrations: [
        { id: 'slack', name: 'Slack', ...getConnectionStatus(connections, 'slack') },
        { id: 'retell', name: 'Retell (Voice/SMS)', ...getConnectionStatus(connections, 'retell') },
        { id: 'elevenlabs', name: 'ElevenLabs (TTS)', ...getConnectionStatus(connections, 'elevenlabs') },
        { id: 'lob', name: 'Lob (Physical Mail)', ...getConnectionStatus(connections, 'lob') },
      ],
    },
    {
      title: 'Video & Media',
      description: 'Video hosting and transcription',
      integrations: [
        { id: 'mux', name: 'Mux Video', ...getConnectionStatus(connections, 'mux') },
        { id: 'assemblyai', name: 'AssemblyAI', ...getConnectionStatus(connections, 'assemblyai') },
      ],
    },
    {
      title: 'Productivity',
      description: 'File storage and scheduling',
      integrations: [
        { id: 'google_drive', name: 'Google Drive', ...getConnectionStatus(connections, 'google_drive') },
        { id: 'google_calendar', name: 'Google Calendar', ...getConnectionStatus(connections, 'google_calendar') },
      ],
    },
    {
      title: 'Payments',
      description: 'Alternative payout methods and bank verification',
      integrations: [
        { id: 'plaid', name: 'Plaid (Bank Verification)', ...getConnectionStatus(connections, 'plaid') },
        { id: 'paypal', name: 'PayPal Payouts', ...getConnectionStatus(connections, 'paypal') },
      ],
    },
    {
      title: 'Surveys & Feedback',
      description: 'Post-purchase surveys and customer feedback',
      integrations: [
        { id: 'fairing', name: 'Fairing (Surveys)', ...getConnectionStatus(connections, 'fairing') },
      ],
    },
    {
      title: 'Monitoring & Analytics',
      description: 'Session recording and behavioral analytics',
      integrations: [
        { id: 'clarity', name: 'Microsoft Clarity', ...getConnectionStatus(connections, 'clarity') },
      ],
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect third-party services to enhance your store's capabilities
        </p>
      </div>

      {integrationGroups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
            <CardDescription>{group.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {group.integrations.map((integration) => (
                <IntegrationRow
                  key={integration.id}
                  integration={integration}
                  organizationId={tenant.organizationId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function IntegrationRow({
  integration,
  organizationId,
}: {
  integration: IntegrationWithStatus
  organizationId: string
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-4">
        <IntegrationIcon provider={integration.id} />
        <div>
          <p className="font-medium">{integration.name}</p>
          {integration.isConnected && integration.accountName && (
            <p className="text-sm text-muted-foreground">
              Connected to {integration.accountName}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {integration.isConnected ? (
          <>
            <StatusBadge status={integration.status} />
            {integration.lastSync && (
              <span className="text-xs text-muted-foreground">
                Last sync: {formatRelative(integration.lastSync)}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/settings/integrations/${integration.id}`}>
                    Configure
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => syncNow(integration.id)}>
                  Sync Now
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => disconnect(integration.id)}
                  className="text-red-600"
                >
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/settings/integrations/${integration.id}/connect`}>
              Connect
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
```

### Individual Integration Settings Pages

Each integration has its own settings page for configuration after connection:

```
/admin/settings/integrations/
├── page.tsx                    # Overview hub
├── [provider]/
│   ├── page.tsx                # Integration-specific settings
│   └── connect/page.tsx        # Connection flow
├── meta-ads/page.tsx           # Meta: account selection, CAPI, pixel
├── google-ads/page.tsx         # Google: account selection, conversion tracking
├── tiktok-ads/page.tsx         # TikTok: pixel, events API
├── ga4/page.tsx                # GA4: measurement ID, enhanced ecommerce
├── klaviyo/page.tsx            # Klaviyo: lists, segments, product sync
├── yotpo/page.tsx              # Yotpo: product mapping, display settings
├── slack/page.tsx              # Slack: channel routing, notification types
└── ...
```

---

## Part 4: Feature Flags for Integrations

Each integration can be enabled/disabled via feature flags:

```typescript
// Integration feature flags
const INTEGRATION_FLAGS = {
  'integrations.meta_ads': { default: false, requiresConnection: true },
  'integrations.google_ads': { default: false, requiresConnection: true },
  'integrations.tiktok_ads': { default: false, requiresConnection: true },
  'integrations.ga4': { default: true, requiresConnection: false },  // Can work without API key
  'integrations.klaviyo': { default: false, requiresConnection: true },
  'integrations.yotpo': { default: false, requiresConnection: true },
  'integrations.slack': { default: false, requiresConnection: true },
  'integrations.reviews_email': { default: true, requiresConnection: false },  // Built-in
}
```

---

## Part 5: Token Refresh & Health Monitoring

### Automatic Token Refresh

```typescript
// packages/integrations/src/token-refresh.ts
import { task, schedules } from '@trigger.dev/sdk/v3'

export const refreshExpiringSTokens = task({
  id: 'refresh-expiring-tokens',
  run: async () => {
    // Find tokens expiring in next 24 hours
    const expiringConnections = await sql`
      SELECT * FROM public.integration_connections
      WHERE token_expires_at IS NOT NULL
        AND token_expires_at < NOW() + INTERVAL '24 hours'
        AND status = 'active'
    `

    for (const connection of expiringConnections) {
      try {
        await refreshToken(connection)
      } catch (error) {
        // Mark as expired
        await sql`
          UPDATE public.integration_connections
          SET status = 'expired', last_error = ${error.message}
          WHERE id = ${connection.id}
        `

        // Notify via Slack/email
        await notifyTokenExpired(connection)
      }
    }
  },
})

// Run every 6 hours
schedules.task({
  id: 'refresh-tokens-schedule',
  cron: '0 */6 * * *',
  task: refreshExpiringSTokens,
})
```

### Integration Health Checks

```typescript
// packages/integrations/src/health.ts
export async function checkIntegrationHealth(
  organizationId: string,
  provider: string
): Promise<IntegrationHealth> {
  const connection = await getConnection(organizationId, provider)

  if (!connection) {
    return { status: 'not_connected' }
  }

  if (connection.status === 'expired') {
    return { status: 'expired', error: 'Token expired - please reconnect' }
  }

  // Make a health check request
  try {
    await healthCheckRequest(provider, connection)
    return { status: 'healthy', lastSync: connection.last_sync_at }
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}
```

---

## Success Criteria

- [ ] Integrations step in onboarding is clearly optional
- [ ] All OAuth flows follow same pattern with HMAC state verification
- [ ] All tokens stored encrypted (AES-256-GCM)
- [ ] Token refresh runs automatically for OAuth integrations
- [ ] Admin Settings → Integrations hub shows all connections
- [ ] Each integration has individual settings page
- [ ] Connection/disconnection flows work correctly
- [ ] Health monitoring detects expired/broken connections
- [ ] Notifications sent when connections need attention

---

## Dependencies

- Phase 1 database schema (organizations, users)
- Encryption utilities for token storage
- Background jobs for token refresh
- Email/Slack for connection notifications

---

## Environment Variables

```bash
# Meta Ads
META_APP_ID=
META_APP_SECRET=

# Google Ads
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=

# TikTok
TIKTOK_APP_ID=
TIKTOK_APP_SECRET=

# Klaviyo
# (Per-tenant API keys, stored in DB)

# Yotpo
# (Per-tenant API keys, stored in DB)

# Slack
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=

# Retell
RETELL_API_KEY=
RETELL_VOICE_AGENT_ID=
RETELL_CHAT_AGENT_ID=
RETELL_PHONE_NUMBER_ID=

# ElevenLabs
ELEVENLABS_API_KEY=

# Mux
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=

# AssemblyAI
ASSEMBLYAI_API_KEY=

# Plaid
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox  # sandbox, development, production

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox  # sandbox, live

# Lob
LOB_API_KEY=
LOB_WEBHOOK_SECRET=

# Fairing
FAIRING_API_KEY=

# Microsoft Clarity
NEXT_PUBLIC_CLARITY_PROJECT_ID=

# Better Stack (Uptime Monitoring) - Platform-level
BETTER_STACK_API_KEY=
BETTER_STACK_WEBHOOK_SECRET=

# Sentry - Platform-level
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## Key UX Principles

1. **Nothing blocks launch** - Only Shopify is required
2. **Skip is prominent** - "Skip for now" always visible
3. **Configure later is clear** - Direct users to Admin Settings
4. **Status is visible** - Connection health shown clearly
5. **Errors are actionable** - Clear guidance when reconnection needed
6. **No pressure** - Don't use "recommended" to pressure users
