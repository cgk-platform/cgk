# Phase 5G: Tenant-Managed Integrations

## Overview

This phase implements the architecture where **tenants own their own accounts** for all third-party services (Stripe, Resend, Wise, Mux, AssemblyAI, Anthropic, etc.). The platform only provides encryption infrastructure to securely store tenant-owned credentials.

## Architecture

### Before (WRONG - Platform-Level)
```
Platform Stripe Account → Manages all payments
Platform Resend Account → Sends all emails
                       ↓
         All tenants share one account
```

### After (CORRECT - Tenant-Level)
```
┌─────────────────────────────────────────────────────────────┐
│  TENANT A (rawdog)                                          │
│  ├── Stripe: sk_live_xxx (THEIR account)                    │
│  ├── Resend: re_xxx (THEIR account)                         │
│  ├── Wise: api_xxx (THEIR account)                          │
│  ├── Mux: mux_xxx (THEIR account)                           │
│  ├── AssemblyAI: aai_xxx (THEIR account)                    │
│  └── Anthropic: sk-ant-xxx (THEIR account)                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TENANT B (acme)                                            │
│  ├── Stripe: sk_live_yyy (THEIR account)                    │
│  ├── Resend: re_yyy (THEIR account)                         │
│  └── ... (different credentials, isolated)                  │
└─────────────────────────────────────────────────────────────┘

PLATFORM only provides:
├── INTEGRATION_ENCRYPTION_KEY (encrypts all credentials)
├── SHOPIFY_CLIENT_ID/SECRET (for app installation OAuth)
└── Infrastructure (database, hosting, jobs)
```

## Deliverables

### 1. Encryption Key Scripts
- `scripts/generate-encryption-keys.sh` - Generate encryption keys
- `scripts/add-encryption-keys-to-vercel.sh` - Add keys to all Vercel projects

### 2. Database Schema
Migration: `038_tenant_integration_config.sql`

Tables created:
- `tenant_stripe_config` - Stripe credentials and account info
- `tenant_resend_config` - Resend credentials and sender settings
- `tenant_wise_config` - Wise credentials for international payouts
- `tenant_api_credentials` - Generic table for Mux, AssemblyAI, Anthropic, etc.

### 3. Encryption Utilities (`@cgk-platform/integrations`)

**Types** (`tenant-credentials/types.ts`):
- `TenantStripeConfig`, `TenantResendConfig`, `TenantWiseConfig`
- `TenantApiCredential` for generic services
- `TenantApiService` union type for supported services

**Storage** (`tenant-credentials/storage.ts`):
- `saveTenantStripeConfig()`, `getTenantStripeConfig()`, `getTenantStripeSecretKey()`
- `saveTenantResendConfig()`, `getTenantResendConfig()`, `getTenantResendApiKey()`
- `saveTenantWiseConfig()`, `getTenantWiseConfig()`, `getTenantWiseApiKey()`
- `saveTenantApiCredential()`, `getTenantApiCredential()`, `getTenantApiKey()`

### 4. Service Clients (`@cgk-platform/integrations`)

**Stripe Client** (`clients/stripe.ts`):
```typescript
const stripe = await getTenantStripeClient(tenantId)
const customer = await stripe.customers.create({ email })
```

**Resend Client** (`clients/resend.ts`):
```typescript
const resend = await getTenantResendClient(tenantId)
await resend.emails.send({ from, to, subject, html })
```

**Wise Client** (`clients/wise.ts`):
```typescript
const wise = await getTenantWiseClient(tenantId)
const quote = await wise.createQuote({ sourceCurrency: 'USD', targetCurrency: 'EUR' })
```

**Generic Clients** (`clients/generic.ts`):
```typescript
const mux = await getTenantMuxClient(tenantId)
const assemblyai = await getTenantAssemblyAIClient(tenantId)
const anthropic = await getTenantAnthropicClient(tenantId)
const openai = await getTenantOpenAIClient(tenantId)
```

### 5. Admin Settings UI
- `/admin/settings/integrations/credentials` - Credential management UI
- Organized by category: Payments, Email, Media, AI Services
- Connect/disconnect flows with verification

### 6. API Routes
- `GET /api/admin/integrations/credentials` - List all credential statuses
- `POST /api/admin/integrations/credentials/[service]` - Save credentials
- `DELETE /api/admin/integrations/credentials/[service]` - Delete credentials
- `POST /api/admin/integrations/credentials/[service]/verify` - Verify credentials

## Environment Variables

### Platform-Level (Required)

| Variable | Format | Description |
|----------|--------|-------------|
| `INTEGRATION_ENCRYPTION_KEY` | Base64 32 bytes | Master key for all tenant credentials |
| `SHOPIFY_TOKEN_ENCRYPTION_KEY` | 64 hex chars | Shopify OAuth token encryption |

### How to Generate

```bash
# Generate keys
./scripts/generate-encryption-keys.sh

# Add to Vercel and pull locally
./scripts/add-encryption-keys-to-vercel.sh
pnpm env:pull
```

## Usage Examples

### In Background Jobs

```typescript
import { task } from '@trigger.dev/sdk/v3'
import { getTenantStripeClient, getTenantResendClient } from '@cgk-platform/integrations'

export const sendOrderConfirmation = task({
  id: 'send-order-confirmation',
  run: async (payload: { tenantId: string; orderId: string; customerEmail: string }) => {
    const { tenantId, orderId, customerEmail } = payload

    // Get tenant's Resend client
    const resend = await getTenantResendClient(tenantId)
    if (!resend) {
      throw new Error('Resend not configured for tenant')
    }

    // Send email using tenant's own Resend account
    await resend.emails.send({
      from: 'orders@tenant-domain.com',
      to: customerEmail,
      subject: `Order #${orderId} Confirmed`,
      html: '<p>Your order has been confirmed!</p>',
    })

    return { sent: true }
  },
})
```

### In API Routes

```typescript
import { getTenantContext } from '@cgk-platform/auth'
import { requireTenantStripeClient } from '@cgk-platform/integrations'

export async function POST(req: Request) {
  const { tenantId } = await getTenantContext(req)
  const { amount, customerId } = await req.json()

  // Get tenant's Stripe client (throws if not configured)
  const stripe = await requireTenantStripeClient(tenantId)

  // Create payment intent using tenant's own Stripe account
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    customer: customerId,
  })

  return Response.json({ clientSecret: paymentIntent.client_secret })
}
```

## Supported Services

### Payments
| Service | Client Function | Credentials |
|---------|----------------|-------------|
| Stripe | `getTenantStripeClient()` | Secret key, Publishable key, Webhook secret |
| Wise | `getTenantWiseClient()` | API token, Webhook secret |

### Email
| Service | Client Function | Credentials |
|---------|----------------|-------------|
| Resend | `getTenantResendClient()` | API key |

### Media
| Service | Client Function | Credentials |
|---------|----------------|-------------|
| Mux | `getTenantMuxClient()` | Token ID, Token Secret |
| AssemblyAI | `getTenantAssemblyAIClient()` | API key |

### AI
| Service | Client Function | Credentials |
|---------|----------------|-------------|
| Anthropic | `getTenantAnthropicClient()` | API key |
| OpenAI | `getTenantOpenAIClient()` | API key |

## Configuration Flow

### Option A: During Onboarding (Steps 4-5)

1. **Step 4: Configure Payments**
   - Stripe API key input with live/test toggle
   - Validation via Stripe API
   - Wise API key (optional)
   - "Skip for Now" option

2. **Step 5: Connect Integrations**
   - Resend API key
   - Mux credentials (optional)
   - AssemblyAI key (optional)
   - Anthropic key (optional)
   - All optional with "Skip for Now"

### Option B: Admin Settings (Post-Launch)

Navigate to `/admin/settings/integrations/credentials`:
- Organized by category tabs
- Connect/update/disconnect flows
- Verification status display

## Security

### Encryption
- All credentials encrypted with AES-256-GCM
- PBKDF2 key derivation with 100,000 iterations
- Unique salt and IV per credential
- Format: `salt:iv:authTag:data` (all hex)

### Isolation
- Credentials stored per-tenant in tenant schema
- `withTenant()` wrapper required for all queries
- Client cache isolated by tenant ID

### Access Control
- Only tenant admins can manage credentials
- API routes verify tenant context
- No cross-tenant credential access possible

## Files Created

```
scripts/
├── generate-encryption-keys.sh
└── add-encryption-keys-to-vercel.sh

packages/db/src/migrations/tenant/
└── 038_tenant_integration_config.sql

packages/integrations/src/tenant-credentials/
├── types.ts
├── storage.ts
├── index.ts
└── clients/
    ├── stripe.ts
    ├── resend.ts
    ├── wise.ts
    ├── generic.ts
    └── index.ts

apps/admin/src/app/admin/settings/integrations/credentials/
└── page.tsx

apps/admin/src/app/api/admin/integrations/credentials/
├── route.ts
└── [service]/
    ├── route.ts
    └── verify/
        └── route.ts
```

## Testing Checklist

- [x] Encryption keys generated and added to Vercel
- [x] `pnpm env:pull` shows keys in local .env.local files
- [x] Database migration runs successfully (4 tables created in tenant schema)
- [ ] Tenant can add Stripe API key (UI built, needs integration test)
- [ ] Tenant can add Resend API key (UI built, needs integration test)
- [ ] Credentials are encrypted in database (verify with raw SQL)
- [ ] Service clients decrypt and use credentials correctly
- [ ] Multi-tenant isolation verified (Tenant A cannot see Tenant B credentials)
- [ ] Verification endpoints work for all services
- [ ] Admin UI displays correct status

### Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Encryption scripts | ✅ Complete | `scripts/generate-encryption-keys.sh`, `scripts/add-encryption-keys-to-vercel.sh` |
| Database migration | ✅ Complete | `038_tenant_integration_config.sql` - all 4 tables created |
| Encryption utilities | ✅ Complete | `packages/integrations/src/tenant-credentials/storage.ts` |
| Stripe client | ✅ Complete | `clients/stripe.ts` with caching |
| Resend client | ✅ Complete | `clients/resend.ts` with sender config |
| Wise client | ✅ Complete | `clients/wise.ts` full API client |
| Generic clients | ✅ Complete | `clients/generic.ts` (Mux, AssemblyAI, Anthropic, OpenAI) |
| Admin Settings UI | ✅ Complete | `/admin/settings/integrations/credentials` |
| API Routes | ✅ Complete | CRUD + verify endpoints |
| Trigger.dev config | ✅ Complete | `syncVercelEnvVars()` extension added |

## Dependencies

**New Peer Dependencies** (optional):
- `stripe` - For Stripe client
- `resend` - For Resend client
- `@mux/mux-node` - For Mux client

**Existing Dependencies**:
- `@cgk-platform/db` - Database access
- `@cgk-platform/auth` - Tenant context

## Next Steps

1. Update onboarding flow (Steps 4-5) to use credential storage
2. Wire existing jobs to use tenant service clients
3. Add credential status to platform health checks
4. Implement credential rotation/update notifications
