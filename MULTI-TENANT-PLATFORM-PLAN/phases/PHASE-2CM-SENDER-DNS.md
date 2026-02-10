# PHASE-2CM-SENDER-DNS: Sender Address & DNS Configuration

**Duration**: Week 9-10 (5 days)
**Depends On**: Phase 1 (database, auth), Phase 2PO (tenant onboarding)
**Parallel With**: PHASE-2CM-TEMPLATES, PHASE-2CM-EMAIL-QUEUE
**Blocks**: PHASE-2CM-INBOUND-EMAIL, PHASE-2CM-RESEND-ONBOARDING

---

## Goal

Enable tenants to configure multiple sender email addresses with subdomain support, provide in-app DNS setup instructions, verify domains via Resend API, and map notification types to sender addresses.

**CRITICAL**: This is a **PORTABLE platform** - NO hardcoded sender addresses or email content. Every sender address must be configurable per tenant.

---

## Success Criteria

- [ ] Tenant can add multiple sender email addresses
- [ ] Each address can use a different subdomain (e.g., `orders@mail.domain.com`, `support@help.domain.com`)
- [ ] UI provides step-by-step DNS setup instructions per domain/subdomain
- [ ] Verification status shown per address (pending, verified, failed)
- [ ] Notification types can be mapped to sender addresses
- [ ] Zero hardcoded sender addresses in codebase

---

## Deliverables

### Database Schema

#### `tenant_email_domains` Table
```sql
CREATE TABLE tenant_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  subdomain TEXT, -- NULL for root domain, 'mail', 'help', etc.
  verification_status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, failed
  verification_token TEXT,
  resend_domain_id TEXT, -- Resend's internal domain ID
  dns_records JSONB, -- DNS records to add {mx, txt_spf, cname_dkim}
  verified_at TIMESTAMPTZ,
  last_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, domain, subdomain)
);

CREATE INDEX idx_tenant_email_domains_tenant ON tenant_email_domains(tenant_id);
CREATE INDEX idx_tenant_email_domains_status ON tenant_email_domains(verification_status);
```

#### `tenant_sender_addresses` Table
```sql
CREATE TABLE tenant_sender_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES tenant_email_domains(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  display_name TEXT NOT NULL, -- "ACME Orders", "ACME Support"
  purpose TEXT NOT NULL, -- transactional, creator, support, treasury, system
  is_default BOOLEAN DEFAULT false,
  is_inbound_enabled BOOLEAN DEFAULT false, -- Can receive emails?
  reply_to_address TEXT, -- Optional different reply-to
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, email_address)
);

CREATE INDEX idx_tenant_sender_addresses_tenant ON tenant_sender_addresses(tenant_id);
CREATE INDEX idx_tenant_sender_addresses_purpose ON tenant_sender_addresses(purpose);
```

#### `tenant_notification_routing` Table
```sql
CREATE TABLE tenant_notification_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sender_address_id UUID REFERENCES tenant_sender_addresses(id) ON DELETE SET NULL,
  is_enabled BOOLEAN DEFAULT true,
  channel TEXT NOT NULL DEFAULT 'email', -- email, sms, both
  delay_days INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  retry_delay_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, notification_type)
);

CREATE INDEX idx_tenant_notification_routing_tenant ON tenant_notification_routing(tenant_id);
```

### Notification Types Registry

```typescript
// packages/communications/types.ts
export const NOTIFICATION_TYPES = {
  // Review System
  REVIEW_REQUEST: 'review_request',
  REVIEW_REMINDER: 'review_reminder',
  REVIEW_THANK_YOU: 'review_thank_you',
  REVIEW_VERIFICATION: 'review_verification',
  INCENTIVE_REQUEST: 'incentive_request',
  INCENTIVE_REMINDER: 'incentive_reminder',

  // Subscription Emails
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPCOMING_ORDER: 'subscription_upcoming_order',
  SUBSCRIPTION_ORDER_PROCESSED: 'subscription_order_processed',
  SUBSCRIPTION_PAYMENT_FAILED: 'subscription_payment_failed',
  SUBSCRIPTION_PAUSED: 'subscription_paused',
  SUBSCRIPTION_RESUMED: 'subscription_resumed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',

  // Creator Communications
  CREATOR_APPLICATION_APPROVED: 'creator_application_approved',
  CREATOR_REMINDER: 'creator_reminder',
  CREATOR_PROJECT_ASSIGNED: 'creator_project_assigned',
  CREATOR_PROJECT_COMPLETED: 'creator_project_completed',
  CREATOR_REVISION_REQUESTED: 'creator_revision_requested',
  CREATOR_PAYMENT_AVAILABLE: 'creator_payment_available',
  CREATOR_PAYOUT_INITIATED: 'creator_payout_initiated',
  CREATOR_MONTHLY_SUMMARY: 'creator_monthly_summary',

  // E-Sign
  ESIGN_SIGNING_REQUEST: 'esign_signing_request',
  ESIGN_SIGNING_COMPLETE: 'esign_signing_complete',
  ESIGN_REMINDER: 'esign_reminder',
  ESIGN_VOID_NOTIFICATION: 'esign_void_notification',

  // Treasury
  TREASURY_APPROVAL_REQUEST: 'treasury_approval_request',
  TREASURY_APPROVAL_REMINDER: 'treasury_approval_reminder',
  TREASURY_APPROVED_NOTIFICATION: 'treasury_approved_notification',
  TREASURY_REJECTED_NOTIFICATION: 'treasury_rejected_notification',

  // Contractor/Vendor
  CONTRACTOR_PORTAL_INVITE: 'contractor_portal_invite',
  CONTRACTOR_PAYMENT_AVAILABLE: 'contractor_payment_available',
  CONTRACTOR_TAX_DOCUMENT_REQUIRED: 'contractor_tax_document_required',

  // Team
  TEAM_INVITATION: 'team_invitation',

  // System
  SYSTEM_ALERT: 'system_alert',
} as const

export const DEFAULT_NOTIFICATION_ROUTING: Record<string, { purpose: string; channel: string }> = {
  [NOTIFICATION_TYPES.REVIEW_REQUEST]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.CREATOR_APPLICATION_APPROVED]: { purpose: 'creator', channel: 'email' },
  [NOTIFICATION_TYPES.TREASURY_APPROVAL_REQUEST]: { purpose: 'treasury', channel: 'email' },
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: { purpose: 'system', channel: 'email' },
  // ... etc
}
```

### API Routes

```
/api/admin/settings/email/
├── domains/
│   ├── route.ts              - GET list, POST add domain
│   ├── [id]/route.ts         - GET, DELETE domain
│   ├── [id]/verify/route.ts  - POST trigger verification
│   └── [id]/dns/route.ts     - GET DNS instructions
├── addresses/
│   ├── route.ts              - GET list, POST add address
│   ├── [id]/route.ts         - PATCH, DELETE address
│   └── [id]/test/route.ts    - POST send test email
├── routing/
│   ├── route.ts              - GET all routing rules
│   └── [type]/route.ts       - PATCH update routing for type
```

### Package Structure

```
packages/communications/
├── sender/
│   ├── domains.ts            - Domain CRUD operations
│   ├── addresses.ts          - Sender address management
│   ├── routing.ts            - Notification routing logic
│   ├── dns-instructions.ts   - Generate DNS setup steps
│   └── verification.ts       - Resend domain verification
├── types.ts                  - Notification types, sender types
└── index.ts                  - Public exports
```

### UI Components (/admin/settings/email)

#### Email Settings Page Layout
```
/admin/settings/email
├── Domains & Addresses Tab
│   ├── Domain List (with verification status badges)
│   ├── Add Domain Modal (with subdomain input)
│   ├── DNS Instructions Panel (step-by-step)
│   └── Sender Addresses per Domain
├── Notification Routing Tab
│   ├── Notification Type List
│   ├── Sender Address Selector per Type
│   └── Enable/Disable Toggle per Type
└── Test Email Tab
    ├── Address Selector
    └── Send Test Button
```

#### DNS Instructions UI Component
```typescript
interface DNSInstructionsProps {
  domain: string
  subdomain: string | null
  records: {
    mx: { host: string; value: string; priority: number }
    txt_spf: { host: string; value: string }
    cname_dkim: { host: string; value: string }
  }
}

// Display format:
// Step 1: Add these DNS records to your domain registrar
//
// For subdomain: mail.yourdomain.com
//
// TYPE    HOST                VALUE                           TTL
// ------------------------------------------------------------------------
// MX      mail                inbound.resend.com              3600
// TXT     mail                v=spf1 include:resend.com ~all  3600
// CNAME   resend._domainkey   <provided by Resend>            3600
//
// Step 2: Click "Verify Domain" button below
// Step 3: Wait up to 48 hours for DNS propagation
```

---

## Constraints

- Domain verification MUST use Resend API (not custom DNS lookups)
- Each tenant MUST have at least one verified sender before sending emails
- DNS instructions MUST include exact copy-paste values
- Verification check should be rate-limited (max once per 5 minutes)
- All sender addresses stored in `tenant_sender_addresses` (never in code)

---

## Pattern References

**RAWDOG code to reference:**
- `/src/lib/reviews/emails/send.ts` - Current email sending patterns
- `/src/lib/email/` - Email utility patterns

**External docs:**
- Resend API: Domain verification endpoints
- Resend API: DNS record requirements

**MCPs to consult:**
- Context7 MCP: "Resend domain verification API"

---

## AI Discretion Areas

The implementing agent should determine:
1. Whether to poll for verification status or use webhooks
2. Optimal UI layout for DNS instructions (table vs cards)
3. Whether to auto-detect common registrars and show registrar-specific instructions
4. How to handle subdomain vs root domain verification differences

---

## Tasks

### [PARALLEL] Database Setup
- [ ] Create `tenant_email_domains` table with indexes
- [ ] Create `tenant_sender_addresses` table with indexes
- [ ] Create `tenant_notification_routing` table with indexes
- [ ] Create migration for default notification types

### [PARALLEL] Package Implementation
- [ ] Implement `domains.ts` - CRUD for email domains
- [ ] Implement `addresses.ts` - Sender address management
- [ ] Implement `routing.ts` - Get sender for notification type
- [ ] Implement `dns-instructions.ts` - Generate DNS setup steps
- [ ] Implement `verification.ts` - Resend domain verification wrapper

### [SEQUENTIAL after package] API Routes
- [ ] Implement domain list/add endpoints
- [ ] Implement domain verification endpoint
- [ ] Implement DNS instructions endpoint
- [ ] Implement sender address CRUD endpoints
- [ ] Implement test email endpoint
- [ ] Implement notification routing endpoints

### [SEQUENTIAL after API] UI Components
- [ ] Build Domains & Addresses tab UI
- [ ] Build Add Domain modal with subdomain support
- [ ] Build DNS Instructions component (step-by-step)
- [ ] Build Sender Address list per domain
- [ ] Build Notification Routing tab UI
- [ ] Build Test Email sender

### [SEQUENTIAL after UI] Integration
- [ ] Integrate `getSenderForNotification()` into email sending utilities
- [ ] Update all email sending functions to use tenant-configured sender
- [ ] Add verification status checks before sending

---

## Definition of Done

- [ ] Tenant can add/remove domains with subdomains
- [ ] DNS instructions are clear and copy-pasteable
- [ ] Domain verification works via Resend API
- [ ] Sender addresses can be created per domain
- [ ] Notification types are routable to different senders
- [ ] Test emails can be sent from any verified sender
- [ ] No hardcoded sender addresses in any codebase files
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests for routing logic pass
- [ ] E2E test for domain addition and verification passes
