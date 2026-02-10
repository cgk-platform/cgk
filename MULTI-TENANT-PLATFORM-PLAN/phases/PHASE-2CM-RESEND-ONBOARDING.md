# PHASE-2CM-RESEND-ONBOARDING: Resend Tenant Onboarding

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

- [ ] Email configuration is integrated into tenant onboarding wizard
- [ ] Step-by-step Resend account and API key setup
- [ ] Domain/subdomain configuration with DNS instructions
- [ ] Domain verification works via Resend API
- [ ] Sender addresses created per domain
- [ ] Default notification routing established
- [ ] Inbound email addresses configured (optional)
- [ ] Skip option available (configure later)

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
│   ├── verify-api-key.ts     - Resend API key validation
│   ├── domain-setup.ts       - Domain addition helpers
│   ├── address-setup.ts      - Sender address creation
│   ├── inbound-setup.ts      - Inbound configuration
│   ├── routing-setup.ts      - Default routing creation
│   └── complete.ts           - Mark setup complete
└── index.ts
```

### UI Components

#### Email Setup Wizard Container
```typescript
interface EmailSetupWizardProps {
  tenantId: string
  primaryDomain: string
  onComplete: () => void
  onSkip: () => void
}

// State machine:
// resend_account → domain_config → sender_addresses →
// inbound_setup (optional) → notification_routing → complete
```

#### Resend Account Step Component
```typescript
interface ResendAccountFormProps {
  onApiKeyVerified: (apiKey: string) => void
}

// Features:
// - Link to Resend signup
// - API key input with mask/reveal toggle
// - Verify button with loading state
// - Success/error feedback
```

#### Domain Configuration Component
```typescript
interface DomainConfigFormProps {
  primaryDomain: string
  onDomainsConfigured: (domains: Domain[]) => void
}

// Features:
// - Primary domain pre-filled
// - Add subdomain form
// - DNS records table with copy buttons
// - Verification status badges
// - Polling for verification updates
```

#### Sender Address Form
```typescript
interface SenderAddressFormProps {
  verifiedDomains: Domain[]
  onAddressesCreated: (addresses: SenderAddress[]) => void
}

// Features:
// - Recommended addresses pre-populated
// - Custom address form
// - Display name inputs
// - Purpose selector
// - Test send buttons
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
- [ ] Add Step 5 to tenant onboarding wizard flow
- [ ] Create email setup wizard container component
- [ ] Add skip handling with admin banner

### [SEQUENTIAL] Step 5a - Resend Account
- [ ] Implement API key verification endpoint
- [ ] Build Resend account step UI
- [ ] Add API key storage (encrypted)

### [SEQUENTIAL] Step 5b - Domain Configuration
- [ ] Implement domain addition via Resend API
- [ ] Implement DNS instructions generation
- [ ] Implement verification polling
- [ ] Build domain configuration UI
- [ ] Add subdomain support

### [SEQUENTIAL] Step 5c - Sender Addresses
- [ ] Implement sender address creation
- [ ] Implement test email sending
- [ ] Build sender address form UI
- [ ] Add recommended addresses pre-population

### [SEQUENTIAL] Step 5d - Inbound Email (Optional)
- [ ] Build inbound configuration UI
- [ ] Add webhook URL display
- [ ] Add inbound routing configuration
- [ ] Implement inbound test

### [SEQUENTIAL] Step 5e - Notification Routing
- [ ] Implement default routing creation
- [ ] Build notification routing UI
- [ ] Add bulk enable/disable

### [SEQUENTIAL] Completion
- [ ] Implement completion handler
- [ ] Add email setup status to tenant record
- [ ] Add setup incomplete banner to admin

---

## Definition of Done

- [ ] Email setup is Step 5 in tenant onboarding
- [ ] API key validation works
- [ ] Domains can be added with DNS instructions
- [ ] Domain verification works via Resend API
- [ ] Sender addresses can be created and tested
- [ ] Inbound email setup works (optional)
- [ ] Notification routing configured with defaults
- [ ] Skip option works with admin banner
- [ ] Tenant cannot send emails until setup complete
- [ ] `npx tsc --noEmit` passes
- [ ] E2E test for full email setup flow passes
