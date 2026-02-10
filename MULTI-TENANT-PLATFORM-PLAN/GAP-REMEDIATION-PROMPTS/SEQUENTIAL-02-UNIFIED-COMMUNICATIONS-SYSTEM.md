# Gap Remediation: Unified Communications & Notifications System

> **Execution**: 🔴 SEQUENTIAL - Run SECOND (after prompt 37, before all parallel prompts)
> **Priority**: CRITICAL
> **Estimated Phases**: 7 focused phase docs (6 email + 1 Slack)
> **IMPORTANT**: This is a PORTABLE platform - ALL communications must be customizable in-platform, NEVER hardcoded

---

## Phase Documents Created

| Phase | Document | Status |
|-------|----------|--------|
| 2CM-SENDER-DNS | `PHASE-2CM-SENDER-DNS.md` | ✅ Created |
| 2CM-EMAIL-QUEUE | `PHASE-2CM-EMAIL-QUEUE.md` | ✅ Created |
| 2CM-INBOUND-EMAIL | `PHASE-2CM-INBOUND-EMAIL.md` | ✅ Created |
| 2CM-TEMPLATES | `PHASE-2CM-TEMPLATES.md` | ✅ Created |
| 2CM-RESEND-ONBOARDING | `PHASE-2CM-RESEND-ONBOARDING.md` | ✅ Created |
| 2CM-SMS | `PHASE-2CM-SMS.md` | ✅ Created |
| 2CM-SLACK-INTEGRATION | `PHASE-2CM-SLACK-INTEGRATION.md` | ✅ Created |

---

## ⚠️ CRITICAL: Read vs Write Locations

| Action | Location | Notes |
|--------|----------|-------|
| **READ FIRST** | `PLAN.md` and `PROMPT.md` in the plan folder | Understand existing architecture |
| **READ** | `/Users/holdenthemic/Documents/rawdog-web/src/` | RAWDOG source - DO NOT MODIFY |
| **WRITE** | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/` | Plan docs ONLY |

**Before writing, read existing docs to ensure your additions fit the planned architecture.**

**Files to update:**
- `PLAN.md` - Add feature section (must align with existing structure)
- `PROMPT.md` - Add implementation patterns
- `PHASE-XX-*.md` - Create new phase docs

**⛔ DO NOT modify any code files or anything outside MULTI-TENANT-PLATFORM-PLAN folder.**

---

## Your Task

### 1. Explore RAWDOG Email Patterns

Use the Explore agent or read these source files:
```
/src/lib/reviews/email-queue/    # Email queue implementation
/src/lib/email/                  # Email utilities
/src/app/admin/reviews/          # Review email queue UI
/src/app/admin/creators/communications/  # Creator email templates
/src/app/api/webhooks/resend/    # Resend webhook handlers
```

### 2. Update Master Documents

**PLAN.md** - Add comprehensive section for:
- Unified communications architecture
- Email queue patterns
- Template customization system
- Inbound email handling

**PROMPT.md** - Add patterns for:
- Email queue database schema
- Template variable substitution
- Resend integration patterns

### 3. Create Phase Docs

Create 4-5 phase docs in `/docs/MULTI-TENANT-PLATFORM-PLAN/`:
- `PHASE-XX-SENDER-ADDRESS-DNS-CONFIG.md`
- `PHASE-XX-INBOUND-EMAIL-HANDLING.md`
- `PHASE-XX-EMAIL-QUEUE-ARCHITECTURE.md`
- `PHASE-XX-TEMPLATE-MANAGEMENT.md`
- `PHASE-XX-RESEND-TENANT-ONBOARDING.md`

---

## Context

The platform sends AND receives emails for various functions. Each tenant needs:
- Multiple sender addresses (subdomains) with in-app DNS setup instructions
- Mapping of notification types to sender addresses
- Visual queue UI showing sent/pending/failed
- Customizable templates in admin
- Incoming email handling (approvals, receipts, replies)
- Email enabled by default, SMS toggle-able

**This is NOT a marketing platform** - no campaigns, flows, or drip sequences. Just platform notifications and transactional emails.

---

## Core Architecture - WHAT We Need

### 1. Sender Address Configuration (/admin/settings/email)

**Multiple Sender Addresses (Subdomains)**

Tenants configure multiple sender addresses for different purposes:

**Outcomes:**
- Tenant can add multiple sender email addresses
- Each address can use a different subdomain
- UI provides DNS setup instructions per domain/subdomain
- Verification status shown per address
- Map notification types to sender addresses

**Example Sender Configuration:**
```
orders@mail.{tenant-domain}.com     → Transactional (order confirmations, receipts)
creators@{tenant-domain}.com        → Creator communications
support@help.{tenant-domain}.com    → Support/general (RECEIVES inbound too)
treasury@mail.{tenant-domain}.com   → Treasury approvals (RECEIVES inbound too)
receipts@mail.{tenant-domain}.com   → Receipt forwarding (RECEIVES inbound too)
noreply@{tenant-domain}.com         → System notifications
```

**DNS Setup Instructions UI:**

For each sender address, show step-by-step instructions:
```
Step 1: Add these DNS records to your domain registrar

For subdomain: mail.yourdomain.com

TYPE    HOST                VALUE                           TTL
----------------------------------------------------------------------
MX      mail                inbound.resend.com              3600
TXT     mail                v=spf1 include:resend.com ~all  3600
CNAME   resend._domainkey   <provided by Resend>            3600

Step 2: Click "Verify Domain" button below
Step 3: Wait up to 48 hours for DNS propagation
```

**Notification → Sender Address Mapping:**
```
/admin/settings/email/routing

Notification Type               | Sender Address
----------------------------------------------------------------
Review requests                 | orders@mail.{domain}
Subscription emails             | orders@mail.{domain}
Creator onboarding              | creators@{domain}
Creator project updates         | creators@{domain}
Contract signing requests       | creators@{domain}
Payout notifications            | creators@{domain}
Contractor/Vendor invites       | noreply@{domain}
Treasury approval requests      | treasury@mail.{domain}
System alerts                   | noreply@{domain}
```

---

### 2. Incoming Email Handling

The platform receives emails for specific workflows. Each tenant configures their inbound addresses.

**Inbound Email Types:**

#### A. Treasury Approval Emails
**Purpose**: Approvers reply to approve/reject treasury draw requests

**Outcomes:**
- Emails sent to `treasury@mail.{domain}` are received via Resend webhook
- System parses reply for approval/rejection keywords
- Matches to pending treasury request via subject line (e.g., "#SBA-202412-001")
- Updates request status automatically
- Logs all communications in treasury_communications table
- Notifies admin via Slack/dashboard if unclear response

**Approval Detection:**
- Approval keywords: "approved", "confirm", "authorized", "go ahead", "proceed", "looks good"
- Rejection keywords: "no", "rejected", "denied", "declined", "cancel", "refused"
- Auto-reply detection: Ignore out-of-office responses
- Confidence levels: high, medium, low

#### B. Receipt Forwarding Emails
**Purpose**: Team forwards receipts/invoices to be logged in treasury

**Outcomes:**
- Emails sent to `receipts@mail.{domain}` are received via Resend webhook
- PDF/image attachments are extracted and stored (Vercel Blob or similar)
- Receipt logged in treasury_receipts table
- Admin notified to process/categorize
- Can link to expense entries
- Can auto-create expense from receipt

#### C. Support/General Inbound
**Purpose**: Customers or creators reply to emails

**Outcomes:**
- Emails sent to `support@help.{domain}` are received
- System matches sender to existing contact (customer, creator, vendor)
- Creates/updates conversation thread
- Routes to appropriate inbox (creator inbox, support tickets)
- Notifies team via Slack/dashboard

#### D. Creator Reply Handling
**Purpose**: Creators reply to project/payment/contract emails

**Outcomes:**
- Replies matched to creator by email address
- Added to creator's conversation thread
- Visible in admin creator inbox
- Can route to Slack for team visibility

**Inbound Webhook Architecture:**

```
Resend Inbound Webhook → /api/webhooks/resend/inbound
    ↓
Route by TO address:
    ├── treasury@... → Treasury approval parser
    ├── receipts@... → Receipt processor
    ├── support@... → General inbox handler
    └── creators@... → Creator reply handler
    ↓
Fetch full email content from Resend API
    ↓
Process based on type
    ↓
Log in appropriate table
    ↓
Notify team (Slack/dashboard)
```

---

### 3. Unified Communications Hub (/admin/communications)

**Outcomes:**
- Central dashboard showing ALL communications (inbound AND outbound)
- Filter by type (email, SMS), direction (in/out), status, recipient type
- Search by recipient email/phone
- Quick stats: sent today, received today, failed rate, pending count

**Inbound Section:**
- View all received emails
- Filter by type (treasury, receipts, support, creator replies)
- Quick actions (process receipt, view thread, link to request)

---

### 4. Per-Function Email Queues (Outbound)

Each part of the app that sends emails has its own queue view:

**Review System (/admin/reviews/email-queue)**
- Queue of review request/reminder emails
- Status: pending, awaiting_delivery, scheduled, processing, sent, skipped, failed
- Bulk actions: skip, reschedule, retry
- Sequence tracking (email 1 of 2, etc.)

**Creator Communications (/admin/creators/communications/queue)**
- Queue of all creator emails
- Types: onboarding, projects, payments, commissions, contracts
- Sequence support for onboarding flow

**E-Sign Emails (/admin/esign - integrated)**
- Signing requests, reminders, completions
- Shows in both esign and communications hub

**Subscription Emails (/admin/subscriptions/emails)**
- Order confirmations, payment failures, status changes
- Template preview and send history

**Treasury Emails (/admin/treasury - integrated)**
- Approval request emails
- Shows sent and received in communications log

---

### 5. Email Template Management

**Per-Function Template Editors:**

Each notification type has customizable templates:

**Review Templates (/admin/reviews/settings → Templates tab)**
- review_request, review_reminder, review_thank_you, review_verification
- incentive_request, incentive_reminder

**Creator Templates (/admin/creators/communications/templates)**
- application_approved, reminder_first/second/final
- project_assigned/in_production/submitted/completed/approved, revision_requested
- payment_available/payout_initiated/payout_ready/payout_failed
- commission_earned/hold/available
- contract_signing_request/complete/reminder/all_signed/voided
- monthly_summary

**E-Sign Templates (/admin/esign/templates → Email tab)**
- signing_request, signing_complete, document_complete, reminder, void_notification

**Subscription Templates (/admin/subscriptions/emails)**
- subscription_created, upcoming_order, order_processed
- payment_failed/retry, subscription_paused/resumed/cancelled
- payment_method_update, reactivation_offer

**Treasury Templates (/admin/treasury/settings → Email tab)**
- approval_request - Sent to approvers for draw requests
- approval_reminder - Follow-up for pending approvals
- approved_notification - Confirmation when approved
- rejected_notification - Notification when rejected

**Contractor/Vendor Templates (/admin/settings/notifications)**
- invite_to_portal, payment_available
- payout_initiated/ready/failed
- tax_document_required, w9_reminder

**Template Editor Features:**
- WYSIWYG editor with preview
- Variable insertion ({{customerName}}, {{orderNumber}}, etc.)
- Subject line customization
- **Sender address selector** (choose from configured addresses)
- Preview with sample data
- Test send to admin email
- Version history
- Reset to default option

---

### 6. Notification Rules Engine

**Outcomes:**
- Configure WHEN each notification type sends
- Configure WHICH sender address to use
- Enable/disable per notification type
- Set delays (e.g., review request 3 days after delivery)
- Set retry rules for failed sends

**Rule Configuration Per Type:**
```
notification_type: review_request
enabled: true
sender_address: orders@mail.{domain}
channel: email (default) | sms | both
trigger: order_delivered
delay_days: 3
max_retries: 3
retry_delay_minutes: 60
```

---

### 7. Resend Setup During Tenant Onboarding

**Tenant Setup Wizard Step: Email Configuration**

**Step 1: Resend Account**
- Link to create Resend account
- API key input with validation test
- Full access key for inbound email content fetching

**Step 2: Domain Configuration**
- Add primary domain
- Add subdomains (mail., help., etc.)
- Show DNS records to add
- Verification button per domain
- Status indicators (pending, verified, failed)

**Step 3: Sender Addresses**
- Create sender addresses per domain
- Configure display names (e.g., "ACME Orders <orders@mail.acme.com>")
- Test send per address

**Step 4: Inbound Email Setup**
- Configure webhook URL (platform provides this)
- Map inbound addresses to functions:
  - Treasury approvals: treasury@mail.{domain}
  - Receipt forwarding: receipts@mail.{domain}
  - Support: support@help.{domain}

**Step 5: Notification Routing**
- Map notification types to sender addresses
- Set defaults (can customize later)

**Can skip and configure later** - platform sends nothing until configured

---

### 8. SMS Configuration (Toggle - Off by Default)

**Outcomes:**
- SMS disabled by default for all tenants
- Can enable per notification type
- Twilio/other provider setup when enabled
- Separate phone number configuration
- Opt-in/opt-out management per recipient

---

### 9. Slack Integration (Team Notifications)

> **Full Spec**: See `phases/PHASE-2CM-SLACK-INTEGRATION.md`

Slack is the primary channel for internal team notifications. Each tenant connects their own workspace; super admin has a separate ops workspace for platform-wide alerts.

**Tenant Slack Features:**
- OAuth connection with bot + user tokens (encrypted AES-256-CBC)
- 40+ notification types across 6 categories (creators, commerce, reviews, finance, system, analytics)
- Channel mapping: route each notification type to a specific channel
- Enable/disable per notification type
- Test message button for every type
- Scheduled reports: Daily, weekly, monthly P&L and performance digests
- Custom Block Kit message templates
- User mention resolution (platform user → Slack user via email)

**Notification Categories:**

| Category | Example Types | Default Channel |
|----------|---------------|-----------------|
| Creators | Applications, projects, payments | #creators |
| Commerce | Orders, subscriptions, refunds | #orders |
| Reviews | New reviews, negative reviews | #reviews |
| Treasury | Top-ups, payouts, low balance | #treasury |
| System | Errors, security, deployments | #alerts |
| Analytics | Daily digest, AI tasks | #analytics |

**Scheduled Reports (P&L / Analytics):**
- Configurable frequency: daily, weekly, monthly
- Configurable send time by timezone (24 global timezones)
- Customizable metrics with drag-and-drop ordering
- Metrics include: revenue, orders, subscriptions, attribution, ad spend, ROAS
- Custom header text override
- "Send Now" button for on-demand reports
- Preview before sending

**Super Admin Ops Slack:**
- Separate workspace for platform operations
- Routes alerts by severity: critical, error, warning, info
- Cross-tenant error aggregation
- Health check failure alerts
- Deployment notifications
- Configurable @here / @channel mentions

**Channel Picker UI:**
- List all public channels
- List private channels where bot is invited
- Search/filter channels
- Create new channel from UI
- Refresh channel list

**Template Customization:**
- Block Kit visual editor
- Variable substitution: `{customerName}`, `{orderNumber}`, etc.
- Preview with sample data
- Test send to current user's DM
- Version history
- Reset to default

---

### 9. Email Logs & Analytics

**Outbound Logs:**
- Every email sent with timestamp
- Recipient, subject, status, sender address used
- Resend message ID for troubleshooting
- Open/click tracking (if enabled)
- Bounce/complaint tracking

**Inbound Logs:**
- Every email received with timestamp
- Sender, subject, type (treasury/receipt/support/reply)
- Processing status (processed, pending, failed)
- Linked records (treasury request, receipt, thread)

**Unified Log (/admin/communications/logs)**
- All emails (in and out) across all functions
- Filterable and searchable
- Export capability

---

## Database Architecture - WHAT Gets Stored

**Sender Addresses Table:**
- tenant_id
- email_address
- display_name
- domain, subdomain
- verification_status (pending, verified, failed)
- is_inbound_enabled (for receiving emails)
- created_at

**Notification Routing Table:**
- tenant_id
- notification_type
- sender_address_id (FK to sender addresses)
- is_active

**Inbound Email Logs Table:**
- tenant_id
- from_address, to_address
- subject, body, body_html
- attachments (JSON array with blob URLs)
- message_id (RFC 2822)
- in_reply_to (for threading)
- email_type (treasury_approval, receipt, support, creator_reply)
- processing_status (pending, processed, failed)
- linked_record_id, linked_record_type
- received_at

**Treasury Communications Table:**
- treasury_request_id
- direction (inbound/outbound)
- channel (email, slack, manual)
- from_address, to_address
- subject, body
- parsed_approval_status (approved, rejected, unclear)
- parsed_confidence (high, medium, low)
- matched_keywords (array)
- message_id, in_reply_to
- created_at

**Treasury Receipts Table:**
- tenant_id
- from_address, subject, body
- attachments (blob URLs)
- status (pending, processed, archived)
- linked_expense_id
- description, amount_cents
- expense_category_id
- created_at

**Communication Threads Table:**
- tenant_id
- contact_id
- thread_type (support, project, general)
- status (open, closed, snoozed)
- last_message_at

**Communication Messages Table:**
- thread_id
- direction (inbound/outbound)
- channel (email, sms, portal)
- subject, body
- sender_type, sender_id
- external_id (message_id for email)
- status
- created_at

---

## Multi-Tenant Considerations

**Per-Tenant Isolation:**
- Each tenant has own Resend API keys
- Each tenant has own domains and sender addresses
- Each tenant has own inbound routing
- Each tenant has own templates
- Logs are tenant-isolated
- Inbound webhooks route by TO address → tenant lookup

**DNS Verification:**
- Platform provides DNS record instructions
- Tenant adds records at their registrar
- Platform verifies via Resend API

---

## Integration Points

- **Prompt 07 (Financial)**: Treasury approvals use email-based approval flow
- **Prompt 24 (Surveys)**: Survey completion can trigger thank-you email
- **Prompt 27 (Commerce)**: Order events trigger emails
- **Prompt 33 (Creators Admin)**: Creator events trigger emails
- **Prompt 18/21 (Contractor/Vendor)**: Portal events trigger emails
- **Prompt 12 (E-Sign)**: Signing events trigger emails
- **Prompt 34 (Shopify App)**: Order events from Shopify

---

## Non-Negotiable Requirements

**Sender Addresses:**
- Multiple sender addresses per tenant
- Subdomain support with DNS instructions in UI
- Verification status per address
- Notification type → sender address mapping

**Inbound Email:**
- Treasury approval parsing with keyword detection
- Receipt forwarding with attachment storage
- Support/reply handling with thread matching
- Webhook-based architecture (Resend)

**Queue System:**
- Visual queue for every email-sending function
- Status tracking (pending → sent/failed)
- Retry logic with exponential backoff
- Bulk actions (skip, reschedule, retry)

**Templates:**
- ALL email templates customizable in admin
- NO hardcoded email content
- Sender address selectable per template
- Variable substitution, preview, test send

**Logging:**
- Every email (in and out) logged with status
- Bounce/complaint tracking
- Unified view across all functions

**Portability:**
- Zero hardcoded sender addresses
- Zero hardcoded email content
- Everything configurable per tenant
- DNS setup instructions in-platform

---

## Definition of Done

**Email:**
- [ ] Tenant can configure multiple sender addresses with subdomains
- [ ] DNS setup instructions shown in UI per domain
- [ ] Domain verification works via Resend API
- [ ] Notification types can be mapped to sender addresses
- [ ] Inbound emails received via Resend webhook
- [ ] Treasury approval emails parsed and processed automatically
- [ ] Receipt forwarding stores attachments and creates records
- [ ] Support/reply emails matched to threads
- [ ] Unified communications hub shows all in/out emails
- [ ] Each function (reviews, creators, e-sign, subscriptions) has queue view
- [ ] All email templates are editable in admin with sender selection
- [ ] Resend setup is part of tenant onboarding wizard
- [ ] Multi-tenant isolation verified for all email functions
- [ ] No hardcoded email content or addresses anywhere in codebase

**Slack:**
- [ ] Tenant can connect Slack workspace via OAuth
- [ ] Bot and user tokens encrypted with AES-256-CBC
- [ ] Channel list fetched with search/filter
- [ ] All 40+ notification types mappable to channels
- [ ] Enable/disable per notification type
- [ ] Test message works for every notification type
- [ ] Scheduled reports configurable (daily, weekly, monthly)
- [ ] Report metrics customizable with drag-and-drop ordering
- [ ] Reports send at configured time/timezone
- [ ] "Send Now" works for on-demand reports
- [ ] Message templates use Block Kit
- [ ] Templates customizable in admin UI
- [ ] User mentions resolve by email
- [ ] Super admin ops Slack separate from tenants
- [ ] Cross-tenant alerts route by severity
- [ ] Rate limiting handled gracefully
- [ ] All Slack notifications logged with status

---

## Output Checklist

- [ ] PLAN.md updated with unified communications section
- [ ] Phase doc for sender address & DNS configuration
- [ ] Phase doc for inbound email handling (treasury, receipts, replies)
- [ ] Phase doc for email queue architecture
- [ ] Phase doc for template management system
- [ ] Phase doc for Resend tenant onboarding
- [x] Phase doc for Slack integration (PHASE-2CM-SLACK-INTEGRATION.md)
- [ ] ARCHITECTURE.md updated with Slack database schema
- [ ] PROMPT.md updated with "all communications customizable" pattern
