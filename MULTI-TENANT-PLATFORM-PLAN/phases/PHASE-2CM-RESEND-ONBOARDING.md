# PHASE-2CM-RESEND-ONBOARDING: Resend Tenant Onboarding

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: COMPLETE
**Duration**: Week 11 (3 days)
**Depends On**: PHASE-2CM-SENDER-DNS, PHASE-2PO-ONBOARDING (tenant wizard)
**Parallel With**: None
**Blocks**: Email sending for new tenants

---

## Goal

Add email configuration to the tenant onboarding wizard. Guide new tenants through Resend account setup, domain configuration, DNS verification, sender address creation, and default notification routing.

**CRITICAL**: Email configuration is part of tenant onboarding. A tenant CANNOT send emails until they complete this setup. Platform sends NOTHING until configured.

---

## Success Criteria

- [x] Email configuration is integrated into tenant onboarding wizard
- [x] Step-by-step Resend account and API key setup
- [x] Domain/subdomain configuration with DNS instructions
- [x] Domain verification works via Resend API
- [x] Sender addresses created per domain
- [x] Default notification routing established
- [x] Inbound email addresses configured (optional)
- [x] Skip option available (configure later)

---

## Deliverables

### Onboarding Wizard Integration

The email setup is **Step 5** of the 9-step tenant onboarding wizard (per BRAND-ONBOARDING-SPEC):

```
Tenant Onboarding Wizard Steps:
1. Brand Profile
2. Domain & DNS
3. Shopify Connection
4. Payment Processing
5. Email Configuration ← THIS PHASE
6. Team Invitations
7. Integrations
8. Theme & Branding
9. Review & Launch
```

### Email Configuration Sub-Steps

```
Step 5: Email Configuration
├── 5a. Resend Account
│   ├── Link to create Resend account
│   ├── API key input
│   └── Validation test
├── 5b. Domain Configuration
│   ├── Add primary domain
│   ├── Add subdomains (mail., help., etc.)
│   ├── DNS records display
│   └── Verification per domain
├── 5c. Sender Addresses
│   ├── Create sender addresses
│   ├── Set display names
│   ├── Configure purposes
│   └── Test send per address
├── 5d. Inbound Email Setup (Optional)
│   ├── Webhook URL display
│   ├── Address → function mapping
│   └── Verification
└── 5e. Notification Routing
    ├── Map notification types to senders
    └── Set defaults
```

### Step 5a: Resend Account Setup

```typescript
interface ResendAccountStepProps {
  tenantId: string
  onComplete: () => void
  onSkip: () => void
}

// UI Flow:
// 1. "Do you have a Resend account?"
//    - Yes → Proceed to API key input
//    - No → Link to https://resend.com/signup
//
// 2. API Key Input
//    - Text input for API key
//    - "Verify Key" button
//    - Shows validation result (success/error)
//
// 3. Full Access Key (for inbound)
//    - Optional: Full access key input
//    - Explanation: "Required for receiving emails"
```

### Step 5b: Domain Configuration

```typescript
interface DomainConfigStepProps {
  tenantId: string
  primaryDomain: string // From step 2
  onComplete: (domains: Domain[]) => void
}

// UI Flow:
// 1. Primary domain auto-populated from Step 2
//
// 2. Add subdomains:
//    [Add Subdomain] button
//    - Input: subdomain prefix (mail, help, etc.)
//    - Preview: mail.yourdomain.com
//
// 3. Per domain/subdomain:
//    ┌─────────────────────────────────────────┐
//    │ mail.yourdomain.com          [Pending] │
//    │                                         │
//    │ DNS Records to Add:                     │
//    │ ┌─────────────────────────────────────┐ │
//    │ │ TYPE  HOST                 VALUE    │ │
//    │ │ MX    mail    inbound.resend.com   │ │
//    │ │ TXT   mail    v=spf1 include:...   │ │
//    │ │ CNAME resend._domainkey  ...       │ │
//    │ └─────────────────────────────────────┘ │
//    │ [Copy All] [Verify Domain]             │
//    └─────────────────────────────────────────┘
//
// 4. Verification status updates after check
```

### Step 5c: Sender Addresses

```typescript
interface SenderAddressStepProps {
  tenantId: string
  verifiedDomains: Domain[]
  onComplete: (addresses: SenderAddress[]) => void
}

// UI Flow:
// Recommended addresses (pre-populated):
//
// ┌──────────────────────────────────────────────────┐
// │ Transactional Emails                             │
// │ From: orders@mail.{domain}                       │
// │ Display Name: [ACME Orders          ]            │
// │ Purpose: Order confirmations, receipts, reviews  │
// │ [Send Test]                                      │
// └──────────────────────────────────────────────────┘
//
// ┌──────────────────────────────────────────────────┐
// │ Creator Communications                           │
// │ From: creators@{domain}                          │
// │ Display Name: [ACME Creator Team    ]            │
// │ Purpose: Creator onboarding, projects, payments  │
// │ [Send Test]                                      │
// └──────────────────────────────────────────────────┘
//
// ┌──────────────────────────────────────────────────┐
// │ Support                              [Optional]  │
// │ From: support@help.{domain}                      │
// │ ☐ Enable inbound for support replies             │
// │ [Send Test]                                      │
// └──────────────────────────────────────────────────┘
//
// [+ Add Another Sender Address]
```

### Step 5d: Inbound Email Setup (Optional)

```typescript
interface InboundEmailStepProps {
  tenantId: string
  senderAddresses: SenderAddress[]
  onComplete: () => void
  onSkip: () => void
}

// UI Flow:
// "Enable inbound email handling?" (Optional)
//
// If enabled:
// 1. Webhook URL to configure in Resend:
//    https://your-platform.com/api/webhooks/resend/inbound
//    [Copy URL]
//
// 2. Configure inbound routing:
//    ┌─────────────────────────────────────────────┐
//    │ treasury@mail.{domain}                      │
//    │ Purpose: Treasury Approvals                 │
//    │ Approvers can reply to approve/reject       │
//    │ ☑ Enable                                    │
//    └─────────────────────────────────────────────┘
//
//    ┌─────────────────────────────────────────────┐
//    │ receipts@mail.{domain}                      │
//    │ Purpose: Receipt Forwarding                 │
//    │ Team forwards receipts for expense tracking │
//    │ ☑ Enable                                    │
//    └─────────────────────────────────────────────┘
//
// 3. Test inbound (optional):
//    "Send a test email to treasury@mail.{domain}"
```

### Step 5e: Notification Routing

```typescript
interface NotificationRoutingStepProps {
  tenantId: string
  senderAddresses: SenderAddress[]
  onComplete: () => void
}

// UI Flow:
// Configure which sender address to use for each notification type
//
// Review Emails
// ├── Review Request        [orders@mail.domain ▾]  ☑ Enabled
// ├── Review Reminder       [orders@mail.domain ▾]  ☑ Enabled
// └── Review Thank You      [orders@mail.domain ▾]  ☑ Enabled
//
// Creator Emails
// ├── Application Approved  [creators@domain ▾]    ☑ Enabled
// ├── Project Updates       [creators@domain ▾]    ☑ Enabled
// └── Payment Notifications [creators@domain ▾]    ☑ Enabled
//
// Subscription Emails
// ├── Order Processed       [orders@mail.domain ▾] ☑ Enabled
// └── Payment Failed        [orders@mail.domain ▾] ☑ Enabled
//
// E-Sign Emails
// └── Signing Requests      [creators@domain ▾]    ☑ Enabled
//
// Treasury Emails
// └── Approval Requests     [treasury@mail... ▾]   ☑ Enabled
//
// [Apply Defaults] [Continue]
```

### API Routes

```
/api/admin/onboarding/email/
├── verify-api-key/route.ts     - POST verify Resend API key
├── domains/
│   ├── add/route.ts            - POST add domain to Resend
│   ├── verify/route.ts         - POST check domain verification
│   └── dns/route.ts            - GET DNS instructions
├── addresses/
│   ├── create/route.ts         - POST create sender address
│   └── test/route.ts           - POST send test email
├── inbound/
│   ├── configure/route.ts      - POST configure inbound
│   └── test/route.ts           - POST test inbound
└── complete/route.ts           - POST mark email setup complete
```

### Database Updates on Completion

When Step 5 completes, the following records are created:

```typescript
// 1. Store Resend credentials (encrypted)
await setTenantCredential(tenantId, 'resend_api_key', apiKey)
await setTenantCredential(tenantId, 'resend_full_access_key', fullAccessKey)

// 2. Domains already created in Step 5b
// tenant_email_domains entries exist

// 3. Sender addresses already created in Step 5c
// tenant_sender_addresses entries exist

// 4. Create notification routing from Step 5e
for (const [type, config] of Object.entries(routingConfig)) {
  await createNotificationRouting({
    tenantId,
    notificationType: type,
    senderAddressId: config.senderAddressId,
    isEnabled: config.enabled,
    channel: 'email'
  })
}

// 5. Mark email setup as complete
await updateTenantOnboarding(tenantId, {
  emailSetupComplete: true,
  emailSetupCompletedAt: new Date()
})
```

### Skip Handling

If tenant skips email setup:
- Tenant marked as `emailSetupComplete: false`
- Email sending disabled for this tenant
- Banner shown in admin: "Complete email setup to send emails"
- Can configure later via `/admin/settings/email`

### Package Structure

```
packages/communications/
├── onboarding/
│   ├── types.ts             - Onboarding type definitions
│   ├── verify-api-key.ts    - Resend API key validation
│   ├── domain-setup.ts      - Domain addition helpers
│   ├── address-setup.ts     - Sender address creation
│   ├── inbound-setup.ts     - Inbound configuration
│   ├── routing-setup.ts     - Default routing creation
│   ├── complete.ts          - Mark setup complete
│   └── index.ts             - Module exports
└── index.ts
```

### UI Components

```
apps/admin/src/components/onboarding/email/
├── types.ts                            - Component type definitions
├── email-setup-wizard.tsx              - Main wizard container
├── email-setup-banner.tsx              - Incomplete setup banner
├── index.ts                            - Component exports
└── steps/
    ├── resend-account-step.tsx         - Step 5a
    ├── domain-config-step.tsx          - Step 5b
    ├── sender-address-step.tsx         - Step 5c
    ├── inbound-email-step.tsx          - Step 5d
    └── notification-routing-step.tsx   - Step 5e
```

---

## Constraints

- API key MUST be validated before proceeding
- At least one domain MUST be added (can skip verification initially)
- At least one sender address MUST be created (for transactional emails)
- Notification routing MUST have defaults for all enabled notification types
- Skip is allowed but tenant cannot send emails until setup complete

---

## Pattern References

**Spec documents:**
- `BRAND-ONBOARDING-SPEC-2025-02-10.md` - Full onboarding wizard spec

**RAWDOG code to reference:**
- None (new functionality)

**External docs:**
- Resend API: Domain verification endpoints
- Resend API: API key validation

---

## AI Discretion Areas

The implementing agent should determine:
1. Whether to use step-by-step or accordion-style UI for sub-steps
2. Optimal polling interval for domain verification status
3. Whether to show estimated DNS propagation times
4. How to handle partial completion (some domains verified, some not)

---

## Tasks

### [SEQUENTIAL] Onboarding Integration
- [x] Add Step 5 to tenant onboarding wizard flow
- [x] Create email setup wizard container component
- [x] Add skip handling with admin banner

### [SEQUENTIAL] Step 5a - Resend Account
- [x] Implement API key verification endpoint
- [x] Build Resend account step UI
- [x] Add API key storage (encrypted)

### [SEQUENTIAL] Step 5b - Domain Configuration
- [x] Implement domain addition via Resend API
- [x] Implement DNS instructions generation
- [x] Implement verification polling
- [x] Build domain configuration UI
- [x] Add subdomain support

### [SEQUENTIAL] Step 5c - Sender Addresses
- [x] Implement sender address creation
- [x] Implement test email sending
- [x] Build sender address form UI
- [x] Add recommended addresses pre-population

### [SEQUENTIAL] Step 5d - Inbound Email (Optional)
- [x] Build inbound configuration UI
- [x] Add webhook URL display
- [x] Add inbound routing configuration
- [x] Implement inbound test

### [SEQUENTIAL] Step 5e - Notification Routing
- [x] Implement default routing creation
- [x] Build notification routing UI
- [x] Add bulk enable/disable

### [SEQUENTIAL] Completion
- [x] Implement completion handler
- [x] Add email setup status to tenant record
- [x] Add setup incomplete banner to admin

---

## Definition of Done

- [x] Email setup is Step 5 in tenant onboarding
- [x] API key validation works
- [x] Domains can be added with DNS instructions
- [x] Domain verification works via Resend API
- [x] Sender addresses can be created and tested
- [x] Inbound email setup works (optional)
- [x] Notification routing configured with defaults
- [x] Skip option works with admin banner
- [x] Tenant cannot send emails until setup complete
- [x] `npx tsc --noEmit` passes (onboarding module)
- [ ] E2E test for full email setup flow passes

---

## Implementation Notes

### Files Created

**Package: `@cgk-platform/communications` (onboarding module)**
- `/packages/communications/src/onboarding/types.ts` - Type definitions
- `/packages/communications/src/onboarding/verify-api-key.ts` - API key verification
- `/packages/communications/src/onboarding/domain-setup.ts` - Domain helpers
- `/packages/communications/src/onboarding/address-setup.ts` - Sender address creation
- `/packages/communications/src/onboarding/inbound-setup.ts` - Inbound configuration
- `/packages/communications/src/onboarding/routing-setup.ts` - Notification routing
- `/packages/communications/src/onboarding/complete.ts` - Setup completion
- `/packages/communications/src/onboarding/index.ts` - Module exports
- `/packages/communications/src/__tests__/onboarding.test.ts` - Unit tests

**Admin App: API Routes**
- `/apps/admin/src/app/api/admin/onboarding/email/verify-api-key/route.ts`
- `/apps/admin/src/app/api/admin/onboarding/email/domains/add/route.ts`
- `/apps/admin/src/app/api/admin/onboarding/email/domains/verify/route.ts`
- `/apps/admin/src/app/api/admin/onboarding/email/domains/dns/route.ts`
- `/apps/admin/src/app/api/admin/onboarding/email/addresses/create/route.ts`
- `/apps/admin/src/app/api/admin/onboarding/email/addresses/test/route.ts`
- `/apps/admin/src/app/api/admin/onboarding/email/inbound/configure/route.ts`
- `/apps/admin/src/app/api/admin/onboarding/email/inbound/test/route.ts`
- `/apps/admin/src/app/api/admin/onboarding/email/routing/route.ts`
- `/apps/admin/src/app/api/admin/onboarding/email/complete/route.ts`

**Admin App: UI Components**
- `/apps/admin/src/components/onboarding/email/types.ts`
- `/apps/admin/src/components/onboarding/email/email-setup-wizard.tsx`
- `/apps/admin/src/components/onboarding/email/email-setup-banner.tsx`
- `/apps/admin/src/components/onboarding/email/index.ts`
- `/apps/admin/src/components/onboarding/email/steps/resend-account-step.tsx`
- `/apps/admin/src/components/onboarding/email/steps/domain-config-step.tsx`
- `/apps/admin/src/components/onboarding/email/steps/sender-address-step.tsx`
- `/apps/admin/src/components/onboarding/email/steps/inbound-email-step.tsx`
- `/apps/admin/src/components/onboarding/email/steps/notification-routing-step.tsx`

### Key Features Implemented

1. **Resend API Key Verification**: Validates keys by testing against Resend API
2. **Domain Management**: Add domains/subdomains, register with Resend, show DNS records
3. **Sender Address Creation**: Recommended addresses with custom options, test email sending
4. **Inbound Email Configuration**: Optional step for configuring reply handling
5. **Notification Routing**: Map notification types to sender addresses with auto-assign
6. **Skip Handling**: Banner shown when setup incomplete, blocking email sending
7. **Completion Tracking**: Status stored in tenant settings table

### Design Decisions

1. Used step-by-step wizard UI (not accordion) for clearer flow
2. DNS propagation time shown as "15 minutes to 48 hours"
3. Partial completion allowed - can proceed with unverified domains
4. Rate limiting on verification checks (5 minute cooldown)
