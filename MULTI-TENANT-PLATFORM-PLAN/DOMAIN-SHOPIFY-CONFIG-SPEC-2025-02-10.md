# Domain & Shopify Configuration Specification

**Created**: 2025-02-10
**Status**: Design Complete
**Purpose**: Comprehensive domain setup, Vercel provisioning, Shopify headless configuration, and product sync for multi-tenant storefronts

---

## Overview

When onboarding a new brand, there are critical configuration steps beyond basic OAuth:

1. **Domain Provisioning** - Set up domains in Vercel programmatically
2. **DNS Instructions** - Show merchants exactly which records to create
3. **Shopify Headless Setup** - Configure checkout redirects, post-purchase flows
4. **Product Sync** - Pull products for storefront display, keep in sync

This spec covers the full flow from "I want to create a new brand" to "customers can buy products on my custom domain."

---

## Part 1: Domain Configuration

### Domain Types

| Type | Format | Use Case |
|------|--------|----------|
| **Platform Subdomain** | `admin.{slug}.platform.com` | Default admin access |
| **Platform Storefront** | `{slug}.platform.com` | Default storefront |
| **Custom Admin Domain** | `admin.mybrand.com` | White-labeled admin |
| **Custom Storefront Domain** | `www.mybrand.com` | Customer-facing store |

### Database Schema

```sql
-- Add to public.organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS domains JSONB DEFAULT '{
  "admin": {
    "platform": null,
    "custom": null,
    "customVerified": false
  },
  "storefront": {
    "platform": null,
    "custom": null,
    "customVerified": false
  }
}';

-- Domain verification tracking
CREATE TABLE public.domain_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  domain VARCHAR(255) NOT NULL,
  domain_type VARCHAR(20) NOT NULL CHECK (domain_type IN ('admin', 'storefront')),

  -- Vercel domain info
  vercel_domain_id VARCHAR(255),
  vercel_project_id VARCHAR(255),

  -- Verification status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Domain added, waiting for DNS
    'verifying',    -- Checking DNS records
    'verified',     -- DNS correct, domain active
    'failed',       -- DNS incorrect or timeout
    'expired'       -- Verification window closed
  )),

  -- DNS configuration
  dns_records JSONB DEFAULT '[]',  -- Required DNS records
  verification_code VARCHAR(255),   -- TXT verification code

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  last_check_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  UNIQUE(organization_id, domain)
);

CREATE INDEX idx_domain_verifications_status
  ON public.domain_verifications(status)
  WHERE status IN ('pending', 'verifying');
```

### Vercel Domain API Integration

```typescript
// packages/domains/src/vercel.ts
import { Vercel } from '@vercel/sdk'

interface VercelDomainConfig {
  teamId: string
  accessToken: string
}

export function createVercelDomainClient(config: VercelDomainConfig) {
  const vercel = new Vercel({ accessToken: config.accessToken })

  return {
    /**
     * Add a domain to a Vercel project
     * Returns DNS records required for verification
     */
    async addDomain(params: {
      projectId: string
      domain: string
      redirectToWww?: boolean
    }): Promise<{
      domainId: string
      dnsRecords: DNSRecord[]
      verificationCode: string
    }> {
      const response = await vercel.domains.addDomainToProject({
        teamId: config.teamId,
        projectId: params.projectId,
        domain: params.domain,
        redirect: params.redirectToWww ? 'www' : undefined,
      })

      // Build required DNS records
      const dnsRecords: DNSRecord[] = []

      // For apex domains (mybrand.com)
      if (!params.domain.includes('.') || params.domain.split('.').length === 2) {
        dnsRecords.push({
          type: 'A',
          name: '@',
          value: '76.76.21.21',  // Vercel's IP
          ttl: 3600,
        })
      }

      // For subdomains (www.mybrand.com, admin.mybrand.com)
      if (params.domain.startsWith('www.') || params.domain.startsWith('admin.')) {
        dnsRecords.push({
          type: 'CNAME',
          name: params.domain.split('.')[0],  // 'www' or 'admin'
          value: 'cname.vercel-dns.com',
          ttl: 3600,
        })
      }

      // TXT record for verification
      dnsRecords.push({
        type: 'TXT',
        name: '_vercel',
        value: response.verificationCode,
        ttl: 3600,
      })

      return {
        domainId: response.id,
        dnsRecords,
        verificationCode: response.verificationCode,
      }
    },

    /**
     * Check if domain DNS is properly configured
     */
    async verifyDomain(params: {
      projectId: string
      domain: string
    }): Promise<{
      verified: boolean
      errors: string[]
    }> {
      const response = await vercel.domains.verifyDomain({
        teamId: config.teamId,
        projectId: params.projectId,
        domain: params.domain,
      })

      return {
        verified: response.verified,
        errors: response.errors || [],
      }
    },

    /**
     * Remove domain from project
     */
    async removeDomain(params: {
      projectId: string
      domain: string
    }): Promise<void> {
      await vercel.domains.removeDomainFromProject({
        teamId: config.teamId,
        projectId: params.projectId,
        domain: params.domain,
      })
    },

    /**
     * Get domain status
     */
    async getDomainStatus(params: {
      projectId: string
      domain: string
    }): Promise<DomainStatus> {
      const response = await vercel.domains.getDomainConfig({
        teamId: config.teamId,
        projectId: params.projectId,
        domain: params.domain,
      })

      return {
        verified: response.verified,
        sslReady: response.ssl?.status === 'active',
        misconfigured: response.misconfigured,
      }
    },
  }
}

interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT'
  name: string
  value: string
  ttl: number
  priority?: number
}

interface DomainStatus {
  verified: boolean
  sslReady: boolean
  misconfigured: boolean
}
```

### Domain Setup API Routes

```typescript
// apps/orchestrator/src/app/api/platform/domains/add/route.ts
import { createVercelDomainClient } from '@cgk/domains'

export async function POST(req: Request) {
  const userId = await getAuthUserId()
  const { organizationId, domain, domainType } = await req.json()

  // Validate user has access to organization
  const org = await getOrganization(organizationId)
  if (!org) {
    return Response.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Determine which Vercel project based on domain type
  const projectId = domainType === 'admin'
    ? process.env.VERCEL_ADMIN_PROJECT_ID
    : process.env.VERCEL_STOREFRONT_PROJECT_ID

  // Add domain to Vercel
  const vercel = createVercelDomainClient({
    teamId: process.env.VERCEL_TEAM_ID!,
    accessToken: process.env.VERCEL_ACCESS_TOKEN!,
  })

  try {
    const result = await vercel.addDomain({
      projectId,
      domain,
      redirectToWww: domainType === 'storefront' && !domain.startsWith('www.'),
    })

    // Store in database
    await sql`
      INSERT INTO public.domain_verifications (
        organization_id,
        domain,
        domain_type,
        vercel_domain_id,
        vercel_project_id,
        dns_records,
        verification_code,
        expires_at
      ) VALUES (
        ${organizationId},
        ${domain},
        ${domainType},
        ${result.domainId},
        ${projectId},
        ${JSON.stringify(result.dnsRecords)},
        ${result.verificationCode},
        NOW() + INTERVAL '7 days'
      )
    `

    return Response.json({
      success: true,
      dnsRecords: result.dnsRecords,
      verificationCode: result.verificationCode,
    })
  } catch (error: any) {
    return Response.json({
      error: 'Failed to add domain',
      details: error.message,
    }, { status: 400 })
  }
}
```

```typescript
// apps/orchestrator/src/app/api/platform/domains/verify/route.ts
export async function POST(req: Request) {
  const { organizationId, domain } = await req.json()

  // Get domain verification record
  const [record] = await sql`
    SELECT * FROM public.domain_verifications
    WHERE organization_id = ${organizationId} AND domain = ${domain}
  `

  if (!record) {
    return Response.json({ error: 'Domain not found' }, { status: 404 })
  }

  const vercel = createVercelDomainClient({
    teamId: process.env.VERCEL_TEAM_ID!,
    accessToken: process.env.VERCEL_ACCESS_TOKEN!,
  })

  const result = await vercel.verifyDomain({
    projectId: record.vercel_project_id,
    domain,
  })

  if (result.verified) {
    // Update verification status
    await sql`
      UPDATE public.domain_verifications
      SET
        status = 'verified',
        verified_at = NOW(),
        last_check_at = NOW()
      WHERE id = ${record.id}
    `

    // Update organization domains
    const domainPath = record.domain_type === 'admin'
      ? 'admin.custom'
      : 'storefront.custom'

    await sql`
      UPDATE public.organizations
      SET
        domains = jsonb_set(
          jsonb_set(domains, ${`{${record.domain_type}, custom}`}::text[], ${`"${domain}"`}::jsonb),
          ${`{${record.domain_type}, customVerified}`}::text[],
          'true'::jsonb
        )
      WHERE id = ${organizationId}
    `

    return Response.json({ verified: true })
  }

  // Update last check time
  await sql`
    UPDATE public.domain_verifications
    SET last_check_at = NOW()
    WHERE id = ${record.id}
  `

  return Response.json({
    verified: false,
    errors: result.errors,
  })
}
```

### DNS Instructions UI Component

```typescript
// apps/orchestrator/src/components/domains/dns-instructions.tsx
'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'

interface DNSRecord {
  type: string
  name: string
  value: string
  ttl: number
}

interface DNSInstructionsProps {
  domain: string
  dnsRecords: DNSRecord[]
  verificationStatus: 'pending' | 'verifying' | 'verified' | 'failed'
  onVerify: () => Promise<void>
  registrar?: string  // Optional: auto-detect or user-selected
}

const REGISTRAR_GUIDES = {
  godaddy: 'https://www.godaddy.com/help/manage-dns-records-680',
  namecheap: 'https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/',
  cloudflare: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
  route53: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-editing.html',
  google: 'https://support.google.com/domains/answer/3290350',
}

export function DNSInstructions({
  domain,
  dnsRecords,
  verificationStatus,
  onVerify,
  registrar,
}: DNSInstructionsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  async function copyToClipboard(text: string, index: number) {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  async function handleVerify() {
    setIsVerifying(true)
    try {
      await onVerify()
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {verificationStatus === 'verified' ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-900">Domain Verified!</p>
            <p className="text-sm text-green-700">
              {domain} is now connected and SSL is active.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-900">DNS Configuration Required</p>
            <p className="text-sm text-amber-700">
              Add the following records to your domain's DNS settings.
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="space-y-4">
        <h3 className="font-semibold">Step 1: Add DNS Records</h3>
        <p className="text-sm text-muted-foreground">
          Log into your domain registrar and add these DNS records:
        </p>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name/Host</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Value/Target</th>
                <th className="px-4 py-3 text-left text-sm font-medium">TTL</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dnsRecords.map((record, index) => (
                <tr key={index} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-blue-100 text-blue-800">
                      {record.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{record.name}</td>
                  <td className="px-4 py-3 font-mono text-sm break-all max-w-xs">
                    {record.value}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {record.ttl}s
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => copyToClipboard(record.value, index)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Registrar-specific help */}
        {registrar && REGISTRAR_GUIDES[registrar] && (
          <a
            href={REGISTRAR_GUIDES[registrar]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            View {registrar} DNS guide
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Verification */}
      <div className="space-y-4">
        <h3 className="font-semibold">Step 2: Verify Connection</h3>
        <p className="text-sm text-muted-foreground">
          After adding the DNS records, click verify. DNS changes can take up to 48 hours to propagate,
          but usually complete within 5-30 minutes.
        </p>

        <button
          onClick={handleVerify}
          disabled={isVerifying || verificationStatus === 'verified'}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Checking DNS...
            </>
          ) : verificationStatus === 'verified' ? (
            <>
              <Check className="w-4 h-4" />
              Verified
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Verify DNS Configuration
            </>
          )}
        </button>

        {verificationStatus === 'failed' && (
          <p className="text-sm text-red-600">
            DNS records not found. Please check your configuration and try again.
          </p>
        )}
      </div>

      {/* Common Issues */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium">
          Troubleshooting Common Issues
        </summary>
        <div className="mt-3 pl-4 text-sm text-muted-foreground space-y-2">
          <p><strong>Records not propagating?</strong> DNS can take up to 48 hours. Try again later.</p>
          <p><strong>Using Cloudflare?</strong> Set the proxy status to "DNS only" (gray cloud) initially.</p>
          <p><strong>Existing A record?</strong> Remove any conflicting A/AAAA/CNAME records first.</p>
          <p><strong>Subdomain issues?</strong> Make sure to add records for both apex and www.</p>
        </div>
      </details>
    </div>
  )
}
```

---

## Part 2: Shopify Headless Configuration

### The Headless Checkout Problem

When using Shopify as a headless backend, the checkout flow requires special handling:

1. **Domain NOT in Shopify** - The storefront domain (www.mybrand.com) should NOT be added to Shopify's domain settings
2. **Checkout redirects TO Shopify** - Cart -> checkout.mybrand.myshopify.com
3. **Thank you page IS Shopify's** - Customer sees Shopify's order status page after purchase
4. **Optional redirect BACK** - Can add script to redirect from Shopify thank you -> our site (for tracking/upsells)

### Database Schema

```sql
-- Add Shopify configuration to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS shopify_config JSONB DEFAULT '{
  "storeDomain": null,
  "storefrontAccessToken": null,
  "adminAccessTokenEncrypted": null,
  "checkoutDomain": null,
  "webhookSecret": null,
  "postCheckoutRedirectUrl": null,
  "postCheckoutRedirectEnabled": true,
  "cartAttributesPrefixes": ["_ga", "_fbp", "_attribution"],
  "pixelId": null,
  "pixelActive": false
}';
```

### Shopify Store Configuration Wizard Step

This should be a sub-step within the Shopify connection step of onboarding, AFTER OAuth is complete.

```typescript
// apps/orchestrator/src/app/brands/new/step-2/configure/page.tsx
'use client'

export default function ShopifyConfigureStep() {
  const { organization, stepData, updateStep, nextStep } = useOnboarding()
  const [config, setConfig] = useState({
    checkoutDomain: stepData[2]?.shopDomain || '',
    postCheckoutRedirectUrl: '',
    enablePostCheckoutRedirect: true,
    cartAttributePrefixes: ['_ga', '_fbp', '_attribution'],
  })
  const [testResult, setTestResult] = useState<'pending' | 'success' | 'error'>('pending')

  // Auto-generate post-checkout URL from storefront domain
  useEffect(() => {
    const storefrontDomain = organization?.domains?.storefront?.custom
      || `${organization?.slug}.platform.com`
    setConfig(c => ({
      ...c,
      postCheckoutRedirectUrl: `https://${storefrontDomain}/thank-you`,
    }))
  }, [organization])

  async function testCheckoutFlow() {
    // Create a test checkout URL and verify redirect works
    const response = await fetch('/api/platform/shopify/test-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: organization.id,
        checkoutDomain: config.checkoutDomain,
        postCheckoutRedirectUrl: config.postCheckoutRedirectUrl,
      }),
    })

    if (response.ok) {
      setTestResult('success')
    } else {
      setTestResult('error')
    }
  }

  async function handleSave() {
    await updateStep(2, {
      ...stepData[2],
      shopifyConfig: config,
    })

    // Also update organization shopify_config
    await fetch('/api/platform/organizations/shopify-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: organization.id,
        config,
      }),
    })

    nextStep()
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold">Configure Shopify Checkout</h2>
        <p className="text-muted-foreground mt-1">
          Set up how customers flow between your storefront and Shopify checkout.
        </p>
      </div>

      {/* Checkout Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Checkout URL</CardTitle>
          <CardDescription>
            Customers will be redirected to this Shopify checkout URL when they click "Checkout"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Shopify Checkout Domain</Label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 bg-muted rounded-l-lg border border-r-0 text-muted-foreground">
                https://
              </span>
              <Input
                value={config.checkoutDomain}
                onChange={(e) => setConfig({ ...config, checkoutDomain: e.target.value })}
                placeholder="yourstore.myshopify.com"
                className="rounded-l-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This is your Shopify myshopify.com domain, NOT your custom domain.
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Do NOT add your storefront domain to Shopify's domain settings.
              Shopify should only have your myshopify.com domain.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Post-Checkout Redirect (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Post-Checkout Redirect (Optional)</CardTitle>
          <CardDescription>
            By default, customers stay on Shopify's thank you page. Optionally redirect them
            back to your storefront for custom thank you pages, upsells, or tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={config.enablePostCheckoutRedirect}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enablePostCheckoutRedirect: checked })
              }
            />
            <Label>Enable post-checkout redirect</Label>
          </div>

          {config.enablePostCheckoutRedirect && (
            <div className="space-y-2">
              <Label>Thank You Page URL</Label>
              <Input
                value={config.postCheckoutRedirectUrl}
                onChange={(e) =>
                  setConfig({ ...config, postCheckoutRedirectUrl: e.target.value })
                }
                placeholder="https://www.yourdomain.com/thank-you"
              />
              <p className="text-xs text-muted-foreground">
                This URL will receive order data as query parameters for tracking.
              </p>
            </div>
          )}

          {/* Shopify Admin Instructions */}
          <div className="p-4 bg-blue-50 rounded-lg space-y-3">
            <h4 className="font-medium text-blue-900">Shopify Admin Setup Required</h4>
            <p className="text-sm text-blue-800">
              You need to configure the checkout redirect in your Shopify admin:
            </p>
            <ol className="text-sm text-blue-800 list-decimal list-inside space-y-2">
              <li>Go to <strong>Settings → Checkout</strong> in Shopify Admin</li>
              <li>Scroll to <strong>Order status page</strong> section</li>
              <li>Under "Additional scripts", add:</li>
            </ol>
            <div className="relative">
              <pre className="bg-blue-100 p-3 rounded text-xs overflow-x-auto">
{`<script>
  if (Shopify.checkout) {
    const orderData = {
      orderId: '{{ order.id }}',
      orderNumber: '{{ order.order_number }}',
      email: '{{ order.email }}',
      total: '{{ order.total_price | money_without_currency }}',
    };
    const params = new URLSearchParams(orderData);
    window.location.href = '${config.postCheckoutRedirectUrl}?' + params.toString();
  }
</script>`}
              </pre>
              <CopyButton
                text={`<script>
  if (Shopify.checkout) {
    const orderData = {
      orderId: '{{ order.id }}',
      orderNumber: '{{ order.order_number }}',
      email: '{{ order.email }}',
      total: '{{ order.total_price | money_without_currency }}',
    };
    const params = new URLSearchParams(orderData);
    window.location.href = '${config.postCheckoutRedirectUrl}?' + params.toString();
  }
</script>`}
                className="absolute top-2 right-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cart Attributes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cart Attributes for Tracking</CardTitle>
          <CardDescription>
            Pass tracking data through checkout for attribution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The platform automatically passes these cart attributes to Shopify for tracking:
          </p>
          <div className="flex flex-wrap gap-2">
            {config.cartAttributePrefixes.map((prefix) => (
              <Badge key={prefix} variant="secondary">
                {prefix}*
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            This includes GA4 client ID, Meta pixel ID, and attribution data.
            Your web pixel can read these on the order status page.
          </p>
        </CardContent>
      </Card>

      {/* Test & Continue */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={testCheckoutFlow}>
          Test Checkout Flow
        </Button>
        <Button onClick={handleSave}>
          Save & Continue
        </Button>
      </div>

      {testResult === 'success' && (
        <Alert className="border-green-500">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription>
            Checkout flow test passed! The redirect is working correctly.
          </AlertDescription>
        </Alert>
      )}

      {testResult === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Checkout flow test failed. Please verify your Shopify admin settings.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
```

### Webhook Configuration

After Shopify OAuth, automatically register required webhooks:

```typescript
// packages/shopify/src/webhooks.ts
export const REQUIRED_WEBHOOKS = [
  // Orders
  { topic: 'orders/create', path: '/api/webhooks/shopify/orders' },
  { topic: 'orders/updated', path: '/api/webhooks/shopify/orders' },
  { topic: 'orders/cancelled', path: '/api/webhooks/shopify/orders' },
  { topic: 'orders/fulfilled', path: '/api/webhooks/shopify/orders' },

  // Customers
  { topic: 'customers/create', path: '/api/webhooks/shopify/customers' },
  { topic: 'customers/update', path: '/api/webhooks/shopify/customers' },

  // Products (for sync)
  { topic: 'products/create', path: '/api/webhooks/shopify/products' },
  { topic: 'products/update', path: '/api/webhooks/shopify/products' },
  { topic: 'products/delete', path: '/api/webhooks/shopify/products' },

  // Inventory
  { topic: 'inventory_levels/update', path: '/api/webhooks/shopify/inventory' },

  // Checkouts (for abandoned cart)
  { topic: 'checkouts/create', path: '/api/webhooks/shopify/checkouts' },
  { topic: 'checkouts/update', path: '/api/webhooks/shopify/checkouts' },
] as const

export async function registerWebhooks(params: {
  shop: string
  accessToken: string
  baseUrl: string
  tenantId: string
}) {
  const client = createShopifyAdminClient(params.shop, params.accessToken)

  const results: WebhookRegistrationResult[] = []

  for (const webhook of REQUIRED_WEBHOOKS) {
    const address = `${params.baseUrl}${webhook.path}?tenant=${params.tenantId}`

    try {
      await client.post('/webhooks.json', {
        webhook: {
          topic: webhook.topic,
          address,
          format: 'json',
        },
      })
      results.push({ topic: webhook.topic, success: true })
    } catch (error: any) {
      // Webhook might already exist
      if (error.message?.includes('already been taken')) {
        results.push({ topic: webhook.topic, success: true, existing: true })
      } else {
        results.push({ topic: webhook.topic, success: false, error: error.message })
      }
    }
  }

  return results
}
```

---

## Part 3: Product Sync for Storefronts

### Product Sync Strategy

Products are synced from Shopify to the local database for:
1. **Faster storefront loading** - Query local DB instead of Shopify API
2. **Custom data enrichment** - Add reviews, custom fields, badges
3. **Search and filtering** - Full-text search on local DB
4. **Offline resilience** - Storefront works even if Shopify API is slow

### Database Schema

```sql
-- Tenant schema: products table with Shopify sync
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Shopify identifiers
  shopify_id BIGINT UNIQUE NOT NULL,
  shopify_handle VARCHAR(255) NOT NULL,
  shopify_gid VARCHAR(255),  -- GraphQL ID: gid://shopify/Product/123

  -- Core product data
  title VARCHAR(500) NOT NULL,
  description TEXT,
  description_html TEXT,
  vendor VARCHAR(255),
  product_type VARCHAR(255),
  tags TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',

  -- Variants (denormalized for read performance)
  variants JSONB DEFAULT '[]',
  -- Example: [{ id, shopify_id, sku, price_cents, compare_at_price_cents, inventory_qty, options }]

  -- Images
  images JSONB DEFAULT '[]',
  -- Example: [{ id, url, alt, width, height, position }]

  -- Options (Size, Color, etc.)
  options JSONB DEFAULT '[]',
  -- Example: [{ name: "Size", values: ["S", "M", "L"] }]

  -- SEO
  seo JSONB DEFAULT '{}',
  -- Example: { title, description }

  -- Custom platform data (not in Shopify)
  platform_data JSONB DEFAULT '{}',
  -- Example: { avgRating: 4.5, reviewCount: 123, badges: ["bestseller"] }

  -- Sync tracking
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  shopify_updated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_handle ON products(shopify_handle);
CREATE INDEX idx_products_status ON products(status) WHERE status = 'active';
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_vendor ON products(vendor);
CREATE INDEX idx_products_synced ON products(synced_at);

-- Full-text search
CREATE INDEX idx_products_search ON products
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

### Initial Product Import Job

```typescript
// packages/jobs/src/functions/shopify-product-import.ts
import { task, runs } from '@trigger.dev/sdk/v3'

export const importShopifyProducts = task({
  id: 'import-shopify-products',
  run: async (payload: {
    tenantId: string
    organizationId: string
    fullSync?: boolean
  }) => {
    const { tenantId, organizationId, fullSync = false } = payload

    // Get Shopify credentials
    const org = await getOrganization(organizationId)
    const shopifyConfig = org.shopify_config

    const client = createShopifyStorefrontClient({
      storeDomain: shopifyConfig.storeDomain,
      storefrontAccessToken: shopifyConfig.storefrontAccessToken,
    })

    let cursor: string | null = null
    let totalImported = 0
    let page = 0

    // Paginate through all products
    do {
      page++
      await runs.metadata.set('progress', {
        page,
        totalImported,
        status: 'fetching',
      })

      const { products, pageInfo } = await client.query({
        query: PRODUCTS_QUERY,
        variables: {
          first: 50,
          after: cursor,
        },
      })

      // Map Shopify products to our schema
      const mappedProducts = products.edges.map((edge: any) =>
        mapShopifyProductToLocal(edge.node)
      )

      // Upsert products in tenant schema
      await withTenant(tenantId, async () => {
        for (const product of mappedProducts) {
          await sql`
            INSERT INTO products (
              shopify_id,
              shopify_handle,
              shopify_gid,
              title,
              description,
              description_html,
              vendor,
              product_type,
              tags,
              status,
              variants,
              images,
              options,
              seo,
              shopify_updated_at,
              synced_at
            ) VALUES (
              ${product.shopify_id},
              ${product.handle},
              ${product.gid},
              ${product.title},
              ${product.description},
              ${product.descriptionHtml},
              ${product.vendor},
              ${product.productType},
              ${product.tags},
              ${product.status},
              ${JSON.stringify(product.variants)},
              ${JSON.stringify(product.images)},
              ${JSON.stringify(product.options)},
              ${JSON.stringify(product.seo)},
              ${product.updatedAt},
              NOW()
            )
            ON CONFLICT (shopify_id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              description_html = EXCLUDED.description_html,
              vendor = EXCLUDED.vendor,
              product_type = EXCLUDED.product_type,
              tags = EXCLUDED.tags,
              status = EXCLUDED.status,
              variants = EXCLUDED.variants,
              images = EXCLUDED.images,
              options = EXCLUDED.options,
              seo = EXCLUDED.seo,
              shopify_updated_at = EXCLUDED.shopify_updated_at,
              synced_at = NOW(),
              updated_at = NOW()
          `
        }
      })

      totalImported += mappedProducts.length
      cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null

      await runs.metadata.set('progress', {
        page,
        totalImported,
        status: cursor ? 'processing' : 'complete',
      })

    } while (cursor)

    return { totalImported }
  },
})

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          title
          description
          descriptionHtml
          vendor
          productType
          tags
          status
          updatedAt
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                inventoryQuantity
                selectedOptions {
                  name
                  value
                }
                image {
                  url
                }
              }
            }
          }
          options {
            name
            values
          }
          seo {
            title
            description
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

function mapShopifyProductToLocal(node: any) {
  return {
    shopify_id: parseInt(node.id.replace('gid://shopify/Product/', '')),
    gid: node.id,
    handle: node.handle,
    title: node.title,
    description: node.description,
    descriptionHtml: node.descriptionHtml,
    vendor: node.vendor,
    productType: node.productType,
    tags: node.tags,
    status: node.status.toLowerCase(),
    updatedAt: node.updatedAt,
    images: node.images.edges.map((e: any, i: number) => ({
      id: e.node.id,
      url: e.node.url,
      alt: e.node.altText,
      width: e.node.width,
      height: e.node.height,
      position: i,
    })),
    variants: node.variants.edges.map((e: any) => ({
      id: e.node.id,
      shopify_id: parseInt(e.node.id.replace('gid://shopify/ProductVariant/', '')),
      title: e.node.title,
      sku: e.node.sku,
      price_cents: Math.round(parseFloat(e.node.price.amount) * 100),
      compare_at_price_cents: e.node.compareAtPrice
        ? Math.round(parseFloat(e.node.compareAtPrice.amount) * 100)
        : null,
      currency_code: e.node.price.currencyCode,
      inventory_quantity: e.node.inventoryQuantity,
      options: e.node.selectedOptions,
      image_url: e.node.image?.url,
    })),
    options: node.options,
    seo: node.seo,
  }
}
```

### Real-Time Product Sync via Webhooks

```typescript
// apps/admin/src/app/api/webhooks/shopify/products/route.ts
import { verifyShopifyWebhook } from '@cgk/shopify'
import { importShopifyProducts } from '@cgk/jobs'

export async function POST(req: Request) {
  const tenantId = req.nextUrl.searchParams.get('tenant')
  if (!tenantId) {
    return new Response('Missing tenant', { status: 400 })
  }

  // Verify webhook signature
  const isValid = await verifyShopifyWebhook(req, tenantId)
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 })
  }

  const topic = req.headers.get('x-shopify-topic')
  const body = await req.json()

  switch (topic) {
    case 'products/create':
    case 'products/update':
      await syncSingleProduct(tenantId, body)
      break

    case 'products/delete':
      await deleteProduct(tenantId, body.id)
      break
  }

  return new Response('OK')
}

async function syncSingleProduct(tenantId: string, shopifyProduct: any) {
  const mapped = mapShopifyProductToLocal({
    ...shopifyProduct,
    id: `gid://shopify/Product/${shopifyProduct.id}`,
    variants: {
      edges: shopifyProduct.variants.map((v: any) => ({
        node: {
          ...v,
          id: `gid://shopify/ProductVariant/${v.id}`,
          price: { amount: v.price, currencyCode: 'USD' },
          compareAtPrice: v.compare_at_price
            ? { amount: v.compare_at_price, currencyCode: 'USD' }
            : null,
          inventoryQuantity: v.inventory_quantity,
          selectedOptions: v.option1
            ? [{ name: 'Option', value: v.option1 }]
            : [],
        },
      })),
    },
    images: {
      edges: shopifyProduct.images.map((img: any) => ({
        node: {
          id: `gid://shopify/ProductImage/${img.id}`,
          url: img.src,
          altText: img.alt,
          width: img.width,
          height: img.height,
        },
      })),
    },
  })

  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO products (shopify_id, ...)
      VALUES (...)
      ON CONFLICT (shopify_id) DO UPDATE SET ...
    `
  })

  // Invalidate product cache
  await invalidateProductCache(tenantId, mapped.handle)
}

async function deleteProduct(tenantId: string, shopifyId: number) {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE products
      SET status = 'archived', updated_at = NOW()
      WHERE shopify_id = ${shopifyId}
    `
  })
}
```

### Commerce Provider Product Operations

The Commerce Provider abstraction should use the local DB for reads:

```typescript
// packages/commerce/src/providers/shopify/products.ts
export function createProductOperations(
  client: ShopifyStorefrontClient,
  tenantId: string
): ProductOperations {
  return {
    /**
     * Get product by handle - reads from LOCAL DB (fast)
     * Falls back to Shopify API if not in DB
     */
    async getByHandle(handle: string): Promise<Product | null> {
      // Try local DB first
      const [localProduct] = await withTenant(tenantId, async () => {
        return sql`
          SELECT * FROM products
          WHERE shopify_handle = ${handle} AND status = 'active'
        `
      })

      if (localProduct) {
        return mapLocalProductToCommerceType(localProduct)
      }

      // Fallback to Shopify API (slower, but handles race conditions)
      const shopifyProduct = await client.query({
        query: GET_PRODUCT_BY_HANDLE,
        variables: { handle },
      })

      if (!shopifyProduct.productByHandle) {
        return null
      }

      // Trigger async sync to DB
      await triggerProductSync(tenantId, handle)

      return mapShopifyProductToCommerceType(shopifyProduct.productByHandle)
    },

    /**
     * List products with pagination - uses LOCAL DB
     */
    async list(options: ListOptions): Promise<PaginatedProducts> {
      const { cursor, limit = 20, filter } = options

      const products = await withTenant(tenantId, async () => {
        let query = sql`
          SELECT * FROM products
          WHERE status = 'active'
        `

        if (filter?.productType) {
          query = sql`${query} AND product_type = ${filter.productType}`
        }

        if (filter?.vendor) {
          query = sql`${query} AND vendor = ${filter.vendor}`
        }

        if (cursor) {
          query = sql`${query} AND id > ${cursor}`
        }

        query = sql`${query} ORDER BY id LIMIT ${limit + 1}`

        return query
      })

      const hasNextPage = products.length > limit
      const items = products.slice(0, limit)

      return {
        products: items.map(mapLocalProductToCommerceType),
        pageInfo: {
          hasNextPage,
          endCursor: hasNextPage ? items[items.length - 1].id : null,
        },
      }
    },

    /**
     * Search products - uses LOCAL DB full-text search
     */
    async search(query: string): Promise<Product[]> {
      const products = await withTenant(tenantId, async () => {
        return sql`
          SELECT * FROM products
          WHERE status = 'active'
            AND to_tsvector('english', title || ' ' || COALESCE(description, ''))
                @@ plainto_tsquery('english', ${query})
          ORDER BY ts_rank(
            to_tsvector('english', title || ' ' || COALESCE(description, '')),
            plainto_tsquery('english', ${query})
          ) DESC
          LIMIT 50
        `
      })

      return products.map(mapLocalProductToCommerceType)
    },
  }
}
```

---

## Part 4: Updated Onboarding Flow

### Updated Wizard Steps

| Step | Name | Description |
|------|------|-------------|
| 1 | Basic Information | Brand name, slug, colors, logo |
| 2 | Connect Shopify | OAuth + checkout configuration |
| 2b | Shopify Setup | Checkout redirects, webhook verification |
| 3 | Configure Domains | Custom domain setup with DNS instructions |
| 4 | Configure Payments | Stripe Connect, Wise |
| 5 | Enable Features | Module toggles |
| 6 | Import Products | Initial Shopify product sync |
| 7 | Invite Users | Team invitations |
| 8 | Review & Launch | Final checklist |

### Step 3: Domain Configuration (New)

```typescript
// apps/orchestrator/src/app/brands/new/step-3/page.tsx
'use client'

import { DNSInstructions } from '@/components/domains/dns-instructions'

export default function DomainConfigStep() {
  const { organization, stepData, updateStep, nextStep, skipStep } = useOnboarding()
  const [adminDomain, setAdminDomain] = useState('')
  const [storefrontDomain, setStorefrontDomain] = useState('')
  const [activeTab, setActiveTab] = useState<'storefront' | 'admin'>('storefront')
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([])
  const [verificationStatus, setVerificationStatus] = useState<Record<string, string>>({})

  async function addDomain(type: 'admin' | 'storefront') {
    const domain = type === 'admin' ? adminDomain : storefrontDomain

    const response = await fetch('/api/platform/domains/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: organization.id,
        domain,
        domainType: type,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      setDnsRecords(data.dnsRecords)
      setVerificationStatus({ ...verificationStatus, [type]: 'pending' })
    }
  }

  async function verifyDomain(type: 'admin' | 'storefront') {
    const domain = type === 'admin' ? adminDomain : storefrontDomain

    const response = await fetch('/api/platform/domains/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: organization.id,
        domain,
      }),
    })

    const data = await response.json()
    setVerificationStatus({
      ...verificationStatus,
      [type]: data.verified ? 'verified' : 'failed',
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold">Configure Domains</h2>
        <p className="text-muted-foreground mt-1">
          Set up custom domains for your storefront and admin portal.
          You can skip this step and use platform subdomains.
        </p>
      </div>

      {/* Platform Subdomains (Always Available) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Platform Subdomains</CardTitle>
          <CardDescription>
            These are automatically available for your brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Storefront</p>
              <p className="font-mono">{organization?.slug}.platform.com</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Admin</p>
              <p className="font-mono">admin.{organization?.slug}.platform.com</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Domains */}
      <Tabs value={activeTab} onValueChange={setActiveTab as any}>
        <TabsList>
          <TabsTrigger value="storefront">Storefront Domain</TabsTrigger>
          <TabsTrigger value="admin">Admin Domain</TabsTrigger>
        </TabsList>

        <TabsContent value="storefront" className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={storefrontDomain}
              onChange={(e) => setStorefrontDomain(e.target.value)}
              placeholder="www.yourbrand.com"
            />
            <Button onClick={() => addDomain('storefront')}>
              Add Domain
            </Button>
          </div>

          {verificationStatus.storefront && (
            <DNSInstructions
              domain={storefrontDomain}
              dnsRecords={dnsRecords}
              verificationStatus={verificationStatus.storefront as any}
              onVerify={() => verifyDomain('storefront')}
            />
          )}
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={adminDomain}
              onChange={(e) => setAdminDomain(e.target.value)}
              placeholder="admin.yourbrand.com"
            />
            <Button onClick={() => addDomain('admin')}>
              Add Domain
            </Button>
          </div>

          {verificationStatus.admin && (
            <DNSInstructions
              domain={adminDomain}
              dnsRecords={dnsRecords}
              verificationStatus={verificationStatus.admin as any}
              onVerify={() => verifyDomain('admin')}
            />
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={skipStep}>
          Use Platform Subdomains
        </Button>
        <Button onClick={nextStep}>
          Continue
        </Button>
      </div>
    </div>
  )
}
```

---

## Part 5: Admin Settings Pages

After onboarding, brands can manage these settings from their admin portal.

### Domain Management Page

```typescript
// apps/admin/src/app/admin/settings/domains/page.tsx
export default async function DomainsSettingsPage() {
  const tenant = await getTenantContext()
  const domains = await getDomainVerifications(tenant.organizationId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Domain Settings</h1>
        <p className="text-muted-foreground">
          Manage custom domains for your storefront and admin portal
        </p>
      </div>

      <DomainsManager
        organizationId={tenant.organizationId}
        currentDomains={domains}
      />
    </div>
  )
}
```

### Shopify Settings Page

```typescript
// apps/admin/src/app/admin/settings/shopify/page.tsx
export default async function ShopifySettingsPage() {
  const tenant = await getTenantContext()
  const config = await getShopifyConfig(tenant.organizationId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shopify Configuration</h1>
        <p className="text-muted-foreground">
          Manage your Shopify connection and checkout settings
        </p>
      </div>

      {/* Connection Status */}
      <ShopifyConnectionCard config={config} />

      {/* Checkout Settings */}
      <CheckoutSettingsCard config={config} />

      {/* Webhook Status */}
      <WebhookStatusCard organizationId={tenant.organizationId} />

      {/* Product Sync Status */}
      <ProductSyncCard organizationId={tenant.organizationId} />

      {/* Re-sync Button */}
      <ManualSyncCard organizationId={tenant.organizationId} />
    </div>
  )
}
```

---

## Success Criteria

- [ ] Domains can be added programmatically via Vercel API
- [ ] DNS instructions show correct records for each domain type
- [ ] Domain verification polling works correctly
- [ ] SSL is automatically provisioned after DNS verification
- [ ] Shopify checkout redirects work correctly
- [ ] Post-checkout redirect script is generated correctly
- [ ] Products sync from Shopify to local DB on initial import
- [ ] Products stay in sync via webhooks
- [ ] Storefront reads from local DB for fast page loads
- [ ] Admin can manage domains after onboarding
- [ ] Admin can view/edit Shopify configuration
- [ ] Admin can trigger manual product re-sync

---

## Dependencies

- Vercel API access token with domain management permissions
- Shopify OAuth app with required scopes
- Background jobs infrastructure for product sync
- Tenant-aware database queries

---

## Environment Variables Required

```bash
# Vercel Domain Management
VERCEL_ACCESS_TOKEN=           # Team-level access token
VERCEL_TEAM_ID=                # Team ID
VERCEL_ADMIN_PROJECT_ID=       # Project ID for admin app
VERCEL_STOREFRONT_PROJECT_ID=  # Project ID for storefront app

# Shopify App
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_SCOPES=read_products,write_products,read_orders,...
```
