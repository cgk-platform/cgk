# Brand Onboarding Specification

**Created**: 2025-02-10
**Status**: Design Complete
**Purpose**: Multi-step wizard for creating and configuring new brands

---

## Overview

The brand onboarding wizard guides the platform owner through creating a new tenant (brand) with all necessary configurations. It handles:
- Basic brand information
- Shopify store connection
- Payment provider setup
- Feature configuration
- Initial user invitations
- Data import (optional)
- Launch verification

---

## Wizard Steps

### 9-Step Overview

| Step | Name | Required | Can Skip | Description |
|------|------|----------|----------|-------------|
| 1 | Basic Information | Yes | No | Brand name, slug, colors, logo |
| 2 | Connect Shopify | Yes | No | OAuth flow + headless checkout configuration |
| 2b | Shopify Setup | Yes | No | Checkout redirects, post-purchase redirect, cart attributes, webhooks |
| 3 | Configure Domains | No | Yes | Custom domain setup with Vercel provisioning + DNS instructions |
| 4 | Configure Payments | Recommended | Yes | Stripe Connect OAuth, Wise API key setup |
| 5 | Connect Integrations | No | Yes | Meta/Google/TikTok Ads, GA4, Klaviyo, Yotpo, Slack |
| 6 | Enable Features | Yes | No | Module toggles for creators, reviews, attribution, A/B, subscriptions, MCP |
| 7 | Import Products | No | Yes | Shopify product sync to local DB (for fast storefront) |
| 8 | Invite Users | No | Yes | Email invitations with role (admin/member) |
| 9 | Review & Launch | Yes | No | Checklist verification and go-live |

> **Key UX Principle**: "Can Skip" means the step shows a "Skip for Now" button. Skipped steps can always be configured later via Settings. **Nothing blocks launch except the 4 required steps.**

> **References**:
> - [DOMAIN-SHOPIFY-CONFIG-SPEC](./DOMAIN-SHOPIFY-CONFIG-SPEC-2025-02-10.md) - Domain provisioning, Shopify headless checkout, product sync
> - [INTEGRATIONS-CONFIG-SPEC](./INTEGRATIONS-CONFIG-SPEC-2025-02-10.md) - All 24+ integrations with OAuth/API key patterns

---

## Database Schema

### Onboarding Sessions

Track progress through the wizard.

```sql
CREATE TABLE public.onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target organization (created in step 1)
  organization_id UUID REFERENCES public.organizations(id),

  -- Progress tracking
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT '{}',
  step_data JSONB DEFAULT '{}',  -- Data entered at each step

  -- Status
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN (
    'in_progress', 'completed', 'abandoned', 'failed'
  )),

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Audit
  started_by UUID NOT NULL REFERENCES public.users(id)
);

CREATE INDEX idx_onboarding_status ON public.onboarding_sessions(status)
  WHERE status = 'in_progress';
```

### Organization Extensions

Additional fields for onboarding state.

```sql
-- Add columns to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS
  onboarding_status VARCHAR(20) DEFAULT 'pending' CHECK (onboarding_status IN (
    'pending', 'in_progress', 'completed', 'suspended'
  ));

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS
  onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS
  setup_checklist JSONB DEFAULT '{
    "shopify_connected": false,
    "stripe_connected": false,
    "wise_connected": false,
    "users_invited": false,
    "first_order_received": false,
    "webhooks_verified": false
  }';
```

---

## Step 2b: Shopify Headless Configuration

After OAuth connection, configure headless checkout flow. **See [DOMAIN-SHOPIFY-CONFIG-SPEC](./DOMAIN-SHOPIFY-CONFIG-SPEC-2025-02-10.md) for complete implementation.**

### Key Configuration Points

1. **Checkout Domain**: Use the myshopify.com domain (NOT custom domain)
2. **Post-Checkout Redirect**: Redirect back to storefront after purchase
3. **Cart Attributes**: Pass tracking data through checkout
4. **Webhook Registration**: Auto-register required webhooks

### Shopify Admin Setup Required

The wizard generates a script for the merchant to add to Shopify Admin:
- **Settings → Checkout → Additional Scripts**
- Redirects from order status page back to storefront `/thank-you`

---

## Step 3: Domain Configuration

Custom domain setup with programmatic Vercel provisioning. **See [DOMAIN-SHOPIFY-CONFIG-SPEC](./DOMAIN-SHOPIFY-CONFIG-SPEC-2025-02-10.md) for complete implementation.**

### Domain Types

| Type | Format | Use Case |
|------|--------|----------|
| Platform Subdomain | `{slug}.platform.com` | Default, always available |
| Custom Storefront | `www.mybrand.com` | Customer-facing store |
| Custom Admin | `admin.mybrand.com` | White-labeled admin |

### DNS Instructions UI

- Show required DNS records (A, CNAME, TXT)
- Registrar-specific help links
- Verification polling with status updates
- Troubleshooting guidance

---

## Step 5: Connect Integrations

Connect third-party services for analytics, marketing, and operations. **See [INTEGRATIONS-CONFIG-SPEC](./INTEGRATIONS-CONFIG-SPEC-2025-02-10.md) for complete implementation.**

### Integration Categories

| Category | Integrations | Connection Type |
|----------|--------------|-----------------|
| Advertising | Meta Ads, Google Ads, TikTok Ads | OAuth |
| Analytics | GA4 | API Key (Measurement ID) |
| Marketing | Klaviyo, Yotpo | API Key |
| Operations | Slack | OAuth |

### Key Features

- **OAuth flows** auto-handled with encrypted token storage
- **API key validation** on entry
- **"Skip for Now"** always available - configure later in Settings
- **Status indicators** show connection health in dashboard

---

## Step 7: Product Import

Initial sync of products from Shopify to local database. **See [DOMAIN-SHOPIFY-CONFIG-SPEC](./DOMAIN-SHOPIFY-CONFIG-SPEC-2025-02-10.md) for complete implementation.**

### Why Local Product Database?

1. **Faster storefront loading** - Query local DB instead of Shopify API
2. **Custom data enrichment** - Add reviews, badges, platform-specific fields
3. **Full-text search** - PostgreSQL search on local data
4. **Offline resilience** - Storefront works even if Shopify API is slow

### Sync Strategy

- **Initial Import**: Paginated fetch of all products via job
- **Real-time Updates**: Webhooks for create/update/delete
- **Commerce Provider**: Reads from local DB, falls back to API

---

## Step 1: Basic Information

### UI Component

```typescript
// apps/orchestrator/src/app/brands/new/step-1/page.tsx
'use client'

import { useOnboarding } from '@/hooks/use-onboarding'
import { slugify } from '@/lib/utils'

export default function BasicInfoStep() {
  const { stepData, updateStep, nextStep } = useOnboarding()
  const [form, setForm] = useState(stepData[1] || {
    name: '',
    slug: '',
    domain: '',
    primaryColor: '#000000',
    logo: null,
  })
  const [slugEdited, setSlugEdited] = useState(false)

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited && form.name) {
      setForm(f => ({ ...f, slug: slugify(form.name) }))
    }
  }, [form.name, slugEdited])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate slug is available
    const available = await checkSlugAvailable(form.slug)
    if (!available) {
      toast.error('This URL slug is already taken')
      return
    }

    await updateStep(1, form)
    nextStep()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Brand Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="My Awesome Brand"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">URL Slug</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">admin.</span>
          <Input
            id="slug"
            value={form.slug}
            onChange={(e) => {
              setSlugEdited(true)
              setForm({ ...form, slug: slugify(e.target.value) })
            }}
            placeholder="my-brand"
            pattern="[a-z0-9-]+"
            required
          />
          <span className="text-muted-foreground">.platform.com</span>
        </div>
        <p className="text-sm text-muted-foreground">
          This will be used in URLs. Use lowercase letters, numbers, and hyphens.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="domain">Custom Domain (optional)</Label>
        <Input
          id="domain"
          value={form.domain}
          onChange={(e) => setForm({ ...form, domain: e.target.value })}
          placeholder="admin.mybrand.com"
        />
        <p className="text-sm text-muted-foreground">
          You can add a custom domain later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Brand Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              id="primaryColor"
              value={form.primaryColor}
              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              className="w-12 h-10 p-1"
            />
            <Input
              value={form.primaryColor}
              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              placeholder="#000000"
              pattern="^#[0-9a-fA-F]{6}$"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <LogoUpload
            value={form.logo}
            onChange={(logo) => setForm({ ...form, logo })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">
          Continue to Shopify Connection
        </Button>
      </div>
    </form>
  )
}
```

### API Handler

```typescript
// apps/orchestrator/src/app/api/platform/brands/onboard/step-1/route.ts
export async function POST(req: Request) {
  const userId = await getAuthUserId()
  const body = await req.json()

  // Validate inputs
  const { name, slug, domain, primaryColor, logoUrl } = body

  if (!name || !slug) {
    return Response.json({ error: 'Name and slug are required' }, { status: 400 })
  }

  // Check slug availability
  const [existing] = await sql`
    SELECT id FROM public.organizations WHERE slug = ${slug}
  `
  if (existing) {
    return Response.json({ error: 'Slug already taken' }, { status: 400 })
  }

  // Create organization
  const [org] = await sql`
    INSERT INTO public.organizations (
      slug, name, domain,
      settings
    ) VALUES (
      ${slug},
      ${name},
      ${domain || null},
      ${JSON.stringify({
        primaryColor,
        logoUrl,
        features: {},
      })}
    )
    RETURNING *
  `

  // Create tenant schema
  await createTenantSchema(slug)

  // Create or update onboarding session
  const sessionId = req.headers.get('x-onboarding-session')

  if (sessionId) {
    await sql`
      UPDATE public.onboarding_sessions
      SET
        organization_id = ${org.id},
        current_step = 2,
        completed_steps = array_append(completed_steps, 1),
        step_data = step_data || ${JSON.stringify({ 1: body })},
        last_activity_at = NOW()
      WHERE id = ${sessionId}
    `
  } else {
    const [session] = await sql`
      INSERT INTO public.onboarding_sessions (
        organization_id,
        current_step,
        completed_steps,
        step_data,
        started_by
      ) VALUES (
        ${org.id},
        2,
        '{1}',
        ${JSON.stringify({ 1: body })},
        ${userId}
      )
      RETURNING id
    `
  }

  return Response.json({ organization: org })
}

async function createTenantSchema(slug: string): Promise<void> {
  const schemaName = `tenant_${slug.replace(/-/g, '_')}`

  // Create schema
  await sql.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`)

  // Run tenant template migrations
  await runTenantMigrations(schemaName)
}
```

---

## Step 2: Connect Shopify

### OAuth Flow

```typescript
// apps/orchestrator/src/app/brands/new/step-2/page.tsx
'use client'

export default function ShopifyConnectStep() {
  const { stepData, organization, updateStep, nextStep } = useOnboarding()
  const [shopDomain, setShopDomain] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'pending' | 'connected' | 'error'>('pending')

  async function initiateOAuth() {
    if (!shopDomain) return

    setIsConnecting(true)

    // Normalize domain
    const normalizedDomain = normalizeShopifyDomain(shopDomain)

    // Generate OAuth URL
    const response = await fetch('/api/platform/shopify/oauth/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: organization.id,
        shopDomain: normalizedDomain,
      }),
    })

    const { authUrl, state } = await response.json()

    // Store state for callback verification
    sessionStorage.setItem('shopify_oauth_state', state)

    // Redirect to Shopify OAuth
    window.location.href = authUrl
  }

  // Check for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (code && state) {
      handleOAuthCallback(code, state)
    }
  }, [])

  async function handleOAuthCallback(code: string, state: string) {
    const storedState = sessionStorage.getItem('shopify_oauth_state')
    if (state !== storedState) {
      setConnectionStatus('error')
      return
    }

    const response = await fetch('/api/platform/shopify/oauth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: organization.id,
        code,
        state,
      }),
    })

    if (response.ok) {
      setConnectionStatus('connected')
      await updateStep(2, { shopifyConnected: true })
    } else {
      setConnectionStatus('error')
    }
  }

  return (
    <div className="space-y-6">
      {connectionStatus === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Shopify Store</CardTitle>
            <CardDescription>
              Enter your Shopify store domain to begin the connection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                placeholder="mystore.myshopify.com"
                disabled={isConnecting}
              />
              <Button onClick={initiateOAuth} disabled={isConnecting || !shopDomain}>
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Requested Permissions</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Read and write orders, customers, products</li>
                <li>• Manage webhooks and events</li>
                <li>• Access analytics and reports</li>
                <li>• Manage checkout customizations</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {connectionStatus === 'connected' && (
        <Card className="border-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">Shopify Connected</h3>
                <p className="text-muted-foreground">{shopDomain}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={nextStep}>
                Continue to Payment Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {connectionStatus === 'error' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to connect Shopify store. Please try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
```

### OAuth API Routes

```typescript
// apps/orchestrator/src/app/api/platform/shopify/oauth/start/route.ts
import crypto from 'crypto'

const SHOPIFY_SCOPES = [
  'read_products', 'write_products',
  'read_orders', 'write_orders',
  'read_customers', 'write_customers',
  'read_inventory', 'write_inventory',
  'read_fulfillments', 'write_fulfillments',
  'read_shipping', 'write_shipping',
  'read_analytics',
  'read_price_rules', 'write_price_rules',
  'read_discounts', 'write_discounts',
  'read_checkouts', 'write_checkouts',
  'read_themes', 'write_themes',
  'read_content', 'write_content',
  'read_locales', 'write_locales',
].join(',')

export async function POST(req: Request) {
  const { organizationId, shopDomain } = await req.json()

  // Generate state with HMAC
  const state = crypto.randomBytes(16).toString('hex')
  const hmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(`${organizationId}:${state}`)
    .digest('hex')

  const fullState = `${organizationId}:${state}:${hmac}`

  // Store state temporarily
  const redis = getRedis()
  await redis.setex(`shopify_oauth:${state}`, 600, JSON.stringify({
    organizationId,
    shopDomain,
    hmac,
  }))

  // Build OAuth URL
  const redirectUri = `${process.env.NEXT_PUBLIC_URL}/api/platform/shopify/oauth/callback`
  const authUrl = `https://${shopDomain}/admin/oauth/authorize?` +
    `client_id=${process.env.SHOPIFY_CLIENT_ID}` +
    `&scope=${SHOPIFY_SCOPES}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${fullState}`

  return Response.json({ authUrl, state: fullState })
}
```

---

## Step 4: Configure Payments

### Payment Provider Selection

```typescript
// apps/orchestrator/src/app/brands/new/step-4/page.tsx
'use client'

export default function PaymentSetupStep() {
  const { organization, updateStep, nextStep, skipStep } = useOnboarding()
  const [stripeStatus, setStripeStatus] = useState<'pending' | 'connected' | 'skipped'>('pending')
  const [wiseStatus, setWiseStatus] = useState<'pending' | 'connected' | 'skipped'>('pending')

  async function connectStripe() {
    // Stripe Connect OAuth flow
    const response = await fetch('/api/platform/stripe/oauth/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: organization.id }),
    })

    const { url } = await response.json()
    window.location.href = url
  }

  async function connectWise() {
    // Open Wise setup modal
    // This uses API key + profile selection, not OAuth
  }

  async function handleContinue() {
    await updateStep(3, {
      stripeConnected: stripeStatus === 'connected',
      wiseConnected: wiseStatus === 'connected',
    })
    nextStep()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Providers</CardTitle>
          <CardDescription>
            Connect payment providers for processing transactions and payouts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stripe Connect */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <StripeIcon className="w-10 h-10" />
              <div>
                <h4 className="font-medium">Stripe</h4>
                <p className="text-sm text-muted-foreground">
                  Process payments and payouts for US creators
                </p>
              </div>
            </div>
            {stripeStatus === 'connected' ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Button onClick={connectStripe} variant="outline">
                Connect Stripe
              </Button>
            )}
          </div>

          {/* Wise */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <WiseIcon className="w-10 h-10" />
              <div>
                <h4 className="font-medium">Wise Business</h4>
                <p className="text-sm text-muted-foreground">
                  International payouts with better exchange rates
                </p>
              </div>
            </div>
            {wiseStatus === 'connected' ? (
              <Badge variant="success">Connected</Badge>
            ) : wiseStatus === 'skipped' ? (
              <Badge variant="outline">Skipped</Badge>
            ) : (
              <div className="flex gap-2">
                <Button onClick={connectWise} variant="outline">
                  Connect
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setWiseStatus('skipped')}
                >
                  Skip
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={skipStep}>
          Skip for Now
        </Button>
        <Button
          onClick={handleContinue}
          disabled={stripeStatus === 'pending'}
        >
          Continue to Features
        </Button>
      </div>
    </div>
  )
}
```

---

## Step 6: Enable Features

### Feature Toggles

```typescript
// apps/orchestrator/src/app/brands/new/step-6/page.tsx
'use client'

interface FeatureModule {
  key: string
  name: string
  description: string
  icon: React.ComponentType
  defaultEnabled: boolean
  requiresSetup?: string[]
}

const FEATURE_MODULES: FeatureModule[] = [
  {
    key: 'creators',
    name: 'Creator Portal',
    description: 'Enable UGC creator management, applications, and payouts',
    icon: Users,
    defaultEnabled: true,
    requiresSetup: ['stripe'],
  },
  {
    key: 'reviews',
    name: 'Reviews System',
    description: 'Collect and manage product reviews with email automation',
    icon: Star,
    defaultEnabled: true,
  },
  {
    key: 'attribution',
    name: 'Marketing Attribution',
    description: 'Track marketing touchpoints and conversion attribution',
    icon: BarChart,
    defaultEnabled: true,
  },
  {
    key: 'abTesting',
    name: 'A/B Testing',
    description: 'Run experiments on pricing, shipping, and checkout',
    icon: FlaskConical,
    defaultEnabled: false,
  },
  {
    key: 'subscriptions',
    name: 'Subscriptions',
    description: 'Enable subscription products and recurring billing',
    icon: Repeat,
    defaultEnabled: false,
    requiresSetup: ['shopify'],
  },
  {
    key: 'mcp',
    name: 'MCP Integration',
    description: 'Enable AI assistant access via Model Context Protocol',
    icon: Bot,
    defaultEnabled: true,
  },
]

export default function FeaturesStep() {
  const { stepData, updateStep, nextStep } = useOnboarding()
  const [features, setFeatures] = useState<Record<string, boolean>>(
    stepData[6]?.features || Object.fromEntries(
      FEATURE_MODULES.map(m => [m.key, m.defaultEnabled])
    )
  )

  async function handleContinue() {
    await updateStep(4, { features })
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FEATURE_MODULES.map(module => (
          <Card
            key={module.key}
            className={cn(
              'cursor-pointer transition-colors',
              features[module.key] && 'border-primary bg-primary/5'
            )}
            onClick={() => setFeatures(f => ({
              ...f,
              [module.key]: !f[module.key]
            }))}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  features[module.key] ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  <module.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{module.name}</h4>
                    <Switch
                      checked={features[module.key]}
                      onCheckedChange={(checked) => setFeatures(f => ({
                        ...f,
                        [module.key]: checked
                      }))}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {module.description}
                  </p>
                  {module.requiresSetup && (
                    <p className="text-xs text-yellow-600 mt-2">
                      Requires: {module.requiresSetup.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleContinue}>
          Continue to User Invitations
        </Button>
      </div>
    </div>
  )
}
```

---

## Step 8: Invite Users

### User Invitations

```typescript
// apps/orchestrator/src/app/brands/new/step-8/page.tsx
'use client'

interface PendingInvite {
  email: string
  role: 'admin' | 'member'
}

export default function InviteUsersStep() {
  const { organization, updateStep, nextStep, skipStep } = useOnboarding()
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('admin')

  function addInvite() {
    if (!email || invites.some(i => i.email === email)) return

    setInvites([...invites, { email, role }])
    setEmail('')
  }

  function removeInvite(emailToRemove: string) {
    setInvites(invites.filter(i => i.email !== emailToRemove))
  }

  async function sendInvites() {
    if (invites.length === 0) {
      skipStep()
      return
    }

    // Send all invitations
    await Promise.all(
      invites.map(invite =>
        fetch('/api/platform/users/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: organization.id,
            email: invite.email,
            role: invite.role,
          }),
        })
      )
    )

    await updateStep(5, { invitesSent: invites })
    nextStep()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite Team Members</CardTitle>
          <CardDescription>
            Add users who will manage this brand. They'll receive email invitations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="team@example.com"
              onKeyDown={(e) => e.key === 'Enter' && addInvite()}
            />
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addInvite} variant="outline">
              Add
            </Button>
          </div>

          {invites.length > 0 && (
            <div className="space-y-2">
              {invites.map(invite => (
                <div
                  key={invite.email}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{invite.email}</span>
                    <Badge variant="outline">{invite.role}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInvite(invite.email)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={skipStep}>
          Skip for Now
        </Button>
        <Button onClick={sendInvites}>
          {invites.length > 0 ? 'Send Invites & Continue' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
```

---

## Step 7: Import Products (Optional)

### Data Import Options

```typescript
// apps/orchestrator/src/app/brands/new/step-7/page.tsx
'use client'

export default function ImportProductsStep() {
  const { organization, nextStep, skipStep } = useOnboarding()
  const [importType, setImportType] = useState<'none' | 'shopify' | 'csv'>('none')
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)

  async function startShopifyImport() {
    setIsImporting(true)

    const response = await fetch('/api/platform/import/shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: organization.id,
        importTypes: ['products', 'customers', 'orders'],
      }),
    })

    const { jobId } = await response.json()

    // Poll for progress
    const interval = setInterval(async () => {
      const statusResponse = await fetch(`/api/platform/import/${jobId}/status`)
      const { progress: p, status } = await statusResponse.json()

      setProgress(p)

      if (status === 'completed' || status === 'failed') {
        clearInterval(interval)
        setIsImporting(false)
        if (status === 'completed') {
          nextStep()
        }
      }
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Historical Data</CardTitle>
          <CardDescription>
            Optionally import existing data from Shopify or CSV files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isImporting ? (
            <RadioGroup value={importType} onValueChange={setImportType as any}>
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="flex-1 cursor-pointer">
                  <span className="font-medium">Start Fresh</span>
                  <p className="text-sm text-muted-foreground">
                    Begin with no historical data
                  </p>
                </Label>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <RadioGroupItem value="shopify" id="shopify" />
                <Label htmlFor="shopify" className="flex-1 cursor-pointer">
                  <span className="font-medium">Import from Shopify</span>
                  <p className="text-sm text-muted-foreground">
                    Import products, customers, and order history
                  </p>
                </Label>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex-1 cursor-pointer">
                  <span className="font-medium">Upload CSV Files</span>
                  <p className="text-sm text-muted-foreground">
                    Import data from CSV files
                  </p>
                </Label>
              </div>
            </RadioGroup>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Importing data from Shopify...</span>
              </div>
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">
                {progress}% complete
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={skipStep} disabled={isImporting}>
          Skip
        </Button>
        <Button
          onClick={importType === 'shopify' ? startShopifyImport : nextStep}
          disabled={isImporting}
        >
          {importType === 'none' ? 'Continue' : 'Start Import'}
        </Button>
      </div>
    </div>
  )
}
```

---

## Step 9: Review & Launch

### Launch Checklist

```typescript
// apps/orchestrator/src/app/brands/new/step-9/page.tsx
'use client'

interface ChecklistItem {
  key: string
  label: string
  status: 'complete' | 'pending' | 'error'
  required: boolean
}

export default function ReviewLaunchStep() {
  const { organization, stepData } = useOnboarding()
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [isLaunching, setIsLaunching] = useState(false)
  const [isLaunched, setIsLaunched] = useState(false)

  useEffect(() => {
    runVerification()
  }, [])

  async function runVerification() {
    const items: ChecklistItem[] = [
      {
        key: 'basic_info',
        label: 'Basic information configured',
        status: stepData[1] ? 'complete' : 'pending',
        required: true,
      },
      {
        key: 'shopify',
        label: 'Shopify store connected',
        status: stepData[2]?.shopifyConnected ? 'complete' : 'pending',
        required: true,
      },
      {
        key: 'webhooks',
        label: 'Webhooks verified',
        status: 'pending',
        required: true,
      },
      {
        key: 'stripe',
        label: 'Stripe connected',
        status: stepData[4]?.stripeConnected ? 'complete' : 'pending',
        required: false,
      },
      {
        key: 'integrations',
        label: 'Integrations connected',
        status: stepData[5]?.integrations ? 'complete' : 'pending',
        required: false,  // All integrations are optional
      },
      {
        key: 'features',
        label: 'Features configured',
        status: stepData[6]?.features ? 'complete' : 'pending',
        required: true,
      },
      {
        key: 'test_order',
        label: 'Test order placed',
        status: 'pending',
        required: false,
      },
    ]

    // Verify webhooks
    const webhookResult = await verifyWebhooks(organization.id)
    const webhookItem = items.find(i => i.key === 'webhooks')!
    webhookItem.status = webhookResult.success ? 'complete' : 'error'

    setChecklist(items)
  }

  async function handleLaunch() {
    setIsLaunching(true)

    try {
      await fetch('/api/platform/brands/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id }),
      })

      setIsLaunched(true)
    } catch (error) {
      toast.error('Failed to launch brand')
    } finally {
      setIsLaunching(false)
    }
  }

  const requiredComplete = checklist
    .filter(i => i.required)
    .every(i => i.status === 'complete')

  if (isLaunched) {
    return (
      <Card className="border-green-500">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">Brand Launched!</h2>
          <p className="text-muted-foreground">
            {organization.name} is now live and ready for business.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button asChild>
              <Link href={`https://admin.${organization.slug}.platform.com`}>
                Open Admin Portal
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/brands">
                View All Brands
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Launch Checklist</CardTitle>
          <CardDescription>
            Review the setup before launching {organization.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checklist.map(item => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {item.status === 'complete' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : item.status === 'error' ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span>{item.label}</span>
                </div>
                {item.required && (
                  <Badge variant="outline">Required</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Brand Name</dt>
              <dd className="font-medium">{organization.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Admin URL</dt>
              <dd className="font-medium">admin.{organization.slug}.platform.com</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Shopify Store</dt>
              <dd className="font-medium">{stepData[2]?.shopDomain || 'Not connected'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Features Enabled</dt>
              <dd className="font-medium">
                {Object.entries(stepData[6]?.features || {})
                  .filter(([_, v]) => v)
                  .map(([k]) => k)
                  .join(', ')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={runVerification}>
          Re-verify
        </Button>
        <Button
          onClick={handleLaunch}
          disabled={!requiredComplete || isLaunching}
          size="lg"
        >
          {isLaunching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Launching...
            </>
          ) : (
            'Launch Brand'
          )}
        </Button>
      </div>
    </div>
  )
}
```

---

## Onboarding Hook

### React Hook for Wizard State

```typescript
// apps/orchestrator/src/hooks/use-onboarding.ts
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface OnboardingContext {
  sessionId: string | null
  organization: Organization | null
  currentStep: number
  completedSteps: number[]
  stepData: Record<number, any>
  isLoading: boolean

  updateStep: (step: number, data: any) => Promise<void>
  nextStep: () => void
  prevStep: () => void
  skipStep: () => void
  goToStep: (step: number) => void
}

const OnboardingContext = createContext<OnboardingContext | null>(null)

const STEP_PATHS = [
  '/brands/new',
  '/brands/new/step-1',      // Basic Information
  '/brands/new/step-2',      // Connect Shopify + Checkout Config (includes 2b)
  '/brands/new/step-3',      // Configure Domains
  '/brands/new/step-4',      // Configure Payments
  '/brands/new/step-5',      // Connect Integrations
  '/brands/new/step-6',      // Enable Features
  '/brands/new/step-7',      // Import Products
  '/brands/new/step-8',      // Invite Users
  '/brands/new/step-9',      // Review & Launch
]

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [stepData, setStepData] = useState<Record<number, any>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load or create session
  useEffect(() => {
    const storedSessionId = sessionStorage.getItem('onboarding_session')
    if (storedSessionId) {
      loadSession(storedSessionId)
    } else {
      createSession()
    }
  }, [])

  async function loadSession(id: string) {
    const response = await fetch(`/api/platform/onboarding/${id}`)
    if (response.ok) {
      const data = await response.json()
      setSessionId(id)
      setOrganization(data.organization)
      setCurrentStep(data.currentStep)
      setCompletedSteps(data.completedSteps)
      setStepData(data.stepData)
    } else {
      createSession()
    }
    setIsLoading(false)
  }

  async function createSession() {
    const response = await fetch('/api/platform/onboarding', { method: 'POST' })
    const { id } = await response.json()
    sessionStorage.setItem('onboarding_session', id)
    setSessionId(id)
    setIsLoading(false)
  }

  async function updateStep(step: number, data: any) {
    setStepData(prev => ({ ...prev, [step]: data }))
    setCompletedSteps(prev => [...new Set([...prev, step])])

    await fetch(`/api/platform/onboarding/${sessionId}/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, data }),
    })
  }

  function nextStep() {
    const next = currentStep + 1
    setCurrentStep(next)
    router.push(STEP_PATHS[next] || STEP_PATHS[STEP_PATHS.length - 1])
  }

  function prevStep() {
    const prev = Math.max(1, currentStep - 1)
    setCurrentStep(prev)
    router.push(STEP_PATHS[prev])
  }

  function skipStep() {
    nextStep()
  }

  function goToStep(step: number) {
    setCurrentStep(step)
    router.push(STEP_PATHS[step])
  }

  return (
    <OnboardingContext.Provider value={{
      sessionId,
      organization,
      currentStep,
      completedSteps,
      stepData,
      isLoading,
      updateStep,
      nextStep,
      prevStep,
      skipStep,
      goToStep,
    }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}
```

---

## Post-Onboarding

### Welcome Email

```typescript
// packages/email/src/templates/brand-welcome.tsx
import { Html, Body, Container, Heading, Text, Button } from '@react-email/components'

export function BrandWelcomeEmail({
  brandName,
  adminUrl,
  features,
}: {
  brandName: string
  adminUrl: string
  features: string[]
}) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Welcome to {brandName}!</Heading>

          <Text>
            Your brand is now live on the platform. Here's what you can do:
          </Text>

          <ul>
            {features.map(f => (
              <li key={f}>{f}</li>
            ))}
          </ul>

          <Button href={adminUrl}>
            Open Admin Portal
          </Button>

          <Text>
            Need help? Check out our documentation or contact support.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

### Guided Tour

```typescript
// apps/admin/src/components/onboarding-tour.tsx
'use client'

import { useState, useEffect } from 'react'
import { createHighlight } from '@/lib/tour'

const TOUR_STEPS = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Dashboard',
    content: 'This is your command center. View key metrics and recent activity.',
  },
  {
    target: '[data-tour="orders"]',
    title: 'Orders',
    content: 'View and manage orders synced from Shopify.',
  },
  {
    target: '[data-tour="creators"]',
    title: 'Creators',
    content: 'Manage your creator program, applications, and payouts.',
  },
  // ... more steps
]

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('has_seen_tour')
    if (!hasSeenTour) {
      setIsActive(true)
    }
  }, [])

  if (!isActive) return null

  const step = TOUR_STEPS[currentStep]

  return (
    <TourOverlay
      target={step.target}
      title={step.title}
      content={step.content}
      currentStep={currentStep + 1}
      totalSteps={TOUR_STEPS.length}
      onNext={() => {
        if (currentStep < TOUR_STEPS.length - 1) {
          setCurrentStep(currentStep + 1)
        } else {
          localStorage.setItem('has_seen_tour', 'true')
          setIsActive(false)
        }
      }}
      onSkip={() => {
        localStorage.setItem('has_seen_tour', 'true')
        setIsActive(false)
      }}
    />
  )
}
```

---

## Success Criteria

- [ ] 9-step wizard UI complete
- [ ] Shopify OAuth flow working
- [ ] Stripe Connect integration working
- [ ] Wise API key setup working
- [ ] Feature toggles saving correctly
- [ ] User invitations sending
- [ ] Data import from Shopify working
- [ ] Launch verification checks passing
- [ ] Post-onboarding email sending
- [ ] Guided tour displaying for new users
- [ ] Session persistence across page reloads
- [ ] Progress can be resumed later

---

## Dependencies

- Phase 1 database schema (organizations, users)
- Shopify OAuth app credentials
- Stripe Connect platform credentials
- Wise Business API credentials
- Email service (Resend) configured
