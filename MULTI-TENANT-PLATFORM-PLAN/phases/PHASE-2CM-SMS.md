# PHASE-2CM-SMS: SMS Notifications (Optional Channel)

**Duration**: Week 11-12 (5 days)
**Depends On**: PHASE-2CM-EMAIL-QUEUE (queue patterns), PHASE-2CM-TEMPLATES (variable substitution)
**Parallel With**: PHASE-2CM-RESEND-ONBOARDING (can share onboarding wizard patterns)
**Blocks**: None (SMS is optional, feature-flagged off by default)

---

## Goal

Implement SMS as an **optional notification channel** for platform notifications. SMS is **OFF by default** for all tenants and must be explicitly enabled. This is NOT a marketing platform - SMS is only for transactional notifications.

**CRITICAL SCOPE LIMITATION**: This phase covers **platform notifications only**. The following are explicitly OUT OF SCOPE:
- SMS marketing campaigns
- Bulk SMS blasts
- SMS drip sequences/flows
- Promotional SMS
- Abandoned cart SMS
- Review request SMS

---

## Success Criteria

- [ ] SMS master toggle works (disabled by default)
- [ ] Twilio setup wizard guides tenant through configuration
- [ ] Per-notification SMS toggle available (Email | SMS | Both)
- [ ] SMS templates have character limits (160 chars) and preview
- [ ] SMS queue shows sent/pending/failed status
- [ ] TCPA-compliant opt-out management works (STOP keyword)
- [ ] No SMS marketing features exist in the platform
- [ ] All SMS operations are tenant-isolated

---

## Deliverables

### SMS Configuration Schema

```sql
-- Master SMS settings per tenant
CREATE TABLE tenant_sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Master switch (OFF by default)
  sms_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Provider configuration
  provider TEXT NOT NULL DEFAULT 'twilio', -- 'twilio' | 'none'
  twilio_account_sid TEXT, -- Encrypted
  twilio_auth_token TEXT,  -- Encrypted
  twilio_phone_number TEXT,
  twilio_messaging_service_sid TEXT, -- Optional, for A2P 10DLC

  -- Compliance
  a2p_10dlc_registered BOOLEAN DEFAULT false,
  toll_free_verified BOOLEAN DEFAULT false,

  -- Quiet hours (TCPA compliance)
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '09:00',
  quiet_hours_timezone TEXT DEFAULT 'America/New_York',

  -- Rate limits
  messages_per_second INTEGER DEFAULT 1,
  daily_limit INTEGER DEFAULT 1000,

  -- Verification
  setup_completed_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unconfigured', -- unconfigured, healthy, degraded, failed

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id)
);

-- Per-notification channel configuration
-- Extends the existing notification_channel_settings pattern from email
CREATE TABLE notification_channel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,

  -- Channel toggles (email is always enabled by default)
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false, -- Only available if master SMS enabled

  -- Template references
  email_template_id UUID REFERENCES email_templates(id),
  sms_template_id UUID REFERENCES sms_templates(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, notification_type)
);

-- SMS templates (short, plain text)
CREATE TABLE sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,

  -- Template content (plain text, 160 char limit enforced)
  content TEXT NOT NULL,
  character_count INTEGER GENERATED ALWAYS AS (length(content)) STORED,
  segment_count INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN length(content) <= 160 THEN 1
      WHEN length(content) <= 306 THEN 2
      ELSE CEIL(length(content)::decimal / 153)
    END
  ) STORED,

  -- Variables available in this template
  available_variables TEXT[] NOT NULL DEFAULT '{}',

  -- Link shortening
  shorten_links BOOLEAN DEFAULT true,

  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, notification_type)
);

-- SMS opt-out tracking (TCPA compliance)
CREATE TABLE sms_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL, -- E.164 format

  -- Opt-out method
  opt_out_method TEXT NOT NULL, -- 'stop_keyword' | 'admin' | 'user_settings'

  -- Original opt-out message if via STOP keyword
  original_message TEXT,

  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, phone_number)
);

-- SMS queue (follows email queue pattern)
CREATE TABLE sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Recipient
  phone_number TEXT NOT NULL, -- E.164 format
  recipient_type TEXT NOT NULL, -- 'customer' | 'creator' | 'contractor' | 'vendor'
  recipient_id TEXT, -- Link to creator/customer/etc
  recipient_name TEXT,

  -- Message content
  notification_type TEXT NOT NULL,
  content TEXT NOT NULL,
  character_count INTEGER NOT NULL,
  segment_count INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending: awaiting processing
    -- scheduled: will send at scheduled_at
    -- processing: currently sending
    -- sent: successfully delivered to carrier
    -- delivered: delivery confirmation received
    -- failed: send failed
    -- skipped: skipped (opt-out, quiet hours, etc)

  -- Scheduling
  scheduled_at TIMESTAMPTZ,

  -- Processing
  trigger_run_id TEXT, -- For atomic claim
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,

  -- Result
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  twilio_message_sid TEXT,

  -- Skip/failure tracking
  skip_reason TEXT,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_queue_tenant ON sms_queue(tenant_id);
CREATE INDEX idx_sms_queue_status ON sms_queue(status);
CREATE INDEX idx_sms_queue_scheduled ON sms_queue(status, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX idx_sms_queue_phone ON sms_queue(phone_number);
```

### SMS Setup Wizard (Part of Tenant Onboarding)

SMS setup is an **optional step** in tenant onboarding:

```typescript
// Step 6 of 9 in onboarding wizard (after Email setup)
interface SmsSetupStep {
  step: 6
  title: 'SMS Notifications (Optional)'
  description: 'Enable SMS for transactional notifications'
  isOptional: true
  defaultSkipped: true // Skip by default, user must opt-in

  subSteps: [
    {
      id: 'enable_sms'
      title: 'Enable SMS'
      description: 'Do you want to enable SMS notifications?'
      type: 'toggle'
      default: false
    },
    {
      id: 'twilio_credentials'
      title: 'Twilio Configuration'
      description: 'Enter your Twilio account credentials'
      type: 'credentials_form'
      fields: [
        { name: 'accountSid', label: 'Account SID', required: true },
        { name: 'authToken', label: 'Auth Token', required: true, secret: true },
        { name: 'phoneNumber', label: 'Phone Number', required: true,
          format: 'phone', help: 'Your Twilio phone number in E.164 format' },
        { name: 'messagingServiceSid', label: 'Messaging Service SID', required: false,
          help: 'Required for A2P 10DLC compliance in the US' }
      ]
      showIf: 'enable_sms === true'
    },
    {
      id: 'verify_twilio'
      title: 'Verify Configuration'
      description: 'We\'ll send a test SMS to verify your setup'
      type: 'verification'
      action: 'send_test_sms'
      showIf: 'enable_sms === true'
    },
    {
      id: 'compliance_info'
      title: 'Compliance Information'
      description: 'Important compliance requirements'
      type: 'info'
      content: `
        SMS notifications are subject to TCPA regulations:
        - Recipients can opt out by replying STOP
        - Quiet hours (9pm-9am) are enforced by default
        - For high-volume SMS in the US, you need A2P 10DLC registration
        - All SMS sent include an unsubscribe instruction
      `
      showIf: 'enable_sms === true'
    }
  ]
}
```

### Per-Notification Channel Selector UI

```typescript
// Admin settings for each notification type
interface NotificationChannelConfig {
  notificationType: string
  displayName: string
  description: string

  // Available channels
  emailEnabled: boolean  // Always available
  smsAvailable: boolean  // Only if master SMS enabled
  smsEnabled: boolean    // User's choice

  // Current templates
  emailTemplateId: string | null
  smsTemplateId: string | null
}

// Example notification types with SMS option:
const NOTIFICATION_TYPES = [
  // Customer notifications
  { type: 'order_shipped', name: 'Order Shipped', smsRecommended: true },
  { type: 'delivery_notification', name: 'Delivery Notification', smsRecommended: true },

  // Creator/Contractor notifications
  { type: 'payment_available', name: 'Payment Available', smsRecommended: true },
  { type: 'payout_sent', name: 'Payout Sent', smsRecommended: false },
  { type: 'action_required', name: 'Action Required', smsRecommended: true },

  // System notifications
  { type: 'verification_code', name: 'Verification Code', smsRecommended: true },
  { type: 'security_alert', name: 'Security Alert', smsRecommended: true },
]
```

### SMS Template Editor

```typescript
interface SmsTemplateEditor {
  // Template content
  content: string
  maxLength: 160 // Single segment

  // Real-time stats
  characterCount: number
  segmentCount: number // 1 segment = 160 chars, 2 = 306, 3+ = 153 each
  estimatedCost: number // segmentCount * rate

  // Variable insertion
  availableVariables: Variable[]
  insertVariable: (variable: Variable) => void

  // Link handling
  shortenLinks: boolean
  linkShorteningPreview: string | null

  // Preview
  preview: string // Content with sample data

  // Validation
  isValid: boolean
  validationErrors: string[]
}

interface Variable {
  key: string
  label: string
  example: string
}

// Example variables:
const COMMON_VARIABLES = [
  { key: '{{customerName}}', label: 'Customer Name', example: 'John' },
  { key: '{{orderNumber}}', label: 'Order Number', example: '#12345' },
  { key: '{{trackingUrl}}', label: 'Tracking URL', example: 'https://...' },
  { key: '{{amount}}', label: 'Amount', example: '$50.00' },
]
```

### SMS Queue UI

Same pattern as email queue, with SMS-specific fields:

```typescript
interface SmsQueueEntry {
  id: string
  tenantId: string

  // Recipient
  phoneNumber: string // Masked: +1***5678
  recipientType: 'customer' | 'creator' | 'contractor' | 'vendor'
  recipientName: string | null

  // Message
  notificationType: string
  content: string
  characterCount: number
  segmentCount: number

  // Status
  status: 'pending' | 'scheduled' | 'processing' | 'sent' | 'delivered' | 'failed' | 'skipped'

  // Timing
  scheduledAt: Date | null
  sentAt: Date | null
  deliveredAt: Date | null

  // Result
  twilioMessageSid: string | null
  skipReason: string | null
  errorMessage: string | null
  attempts: number
}
```

### Opt-Out Management

```typescript
// Webhook handler for Twilio incoming messages
export async function handleTwilioWebhook(req: Request): Promise<Response> {
  const body = await req.formData()
  const from = body.get('From') as string
  const messageBody = body.get('Body') as string

  // Check for opt-out keywords
  const normalized = messageBody.trim().toUpperCase()
  const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']
  const optInKeywords = ['START', 'YES', 'UNSTOP']

  if (optOutKeywords.includes(normalized)) {
    await handleOptOut(from, messageBody)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    })
  }

  if (optInKeywords.includes(normalized)) {
    await handleOptIn(from)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    })
  }

  // Other incoming messages - log but don't auto-reply
  await logIncomingSms(from, messageBody)
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' }
  })
}

async function handleOptOut(phoneNumber: string, originalMessage: string): Promise<void> {
  // Find tenant by phone number lookup
  const tenantId = await findTenantByTwilioNumber(phoneNumber)
  if (!tenantId) return

  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO sms_opt_outs (tenant_id, phone_number, opt_out_method, original_message)
      VALUES (${tenantId}, ${phoneNumber}, 'stop_keyword', ${originalMessage})
      ON CONFLICT (tenant_id, phone_number) DO NOTHING
    `
  })

  // Cancel any pending SMS to this number
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE sms_queue
      SET status = 'skipped', skip_reason = 'recipient_opted_out', updated_at = now()
      WHERE tenant_id = ${tenantId}
        AND phone_number = ${phoneNumber}
        AND status IN ('pending', 'scheduled')
    `
  })
}
```

### API Routes

```
/api/admin/sms/
├── settings/route.ts          - GET/PATCH SMS settings
├── setup/route.ts             - POST Twilio setup wizard
├── setup/verify/route.ts      - POST verify Twilio config
├── health/route.ts            - GET SMS health status
├── templates/route.ts         - GET list templates
├── templates/[type]/route.ts  - GET/PATCH template by type
├── queue/route.ts             - GET queue list with filters
├── queue/[id]/route.ts        - GET/PATCH queue entry
├── queue/stats/route.ts       - GET queue statistics
├── opt-outs/route.ts          - GET list, POST add opt-out
├── opt-outs/[phone]/route.ts  - DELETE remove opt-out
└── test/route.ts              - POST send test SMS
```

### Background Job: SMS Queue Processor

```typescript
// packages/communications/sms/processor.ts

export const processSmsQueue = job({
  id: 'process-sms-queue',
  schedule: { cron: '* * * * *' }, // Every minute
  run: async () => {
    // Get all tenants with SMS enabled
    const tenants = await getSmsEnabledTenants()

    for (const tenantId of tenants) {
      await processTenantSmsQueue(tenantId)
    }
  }
})

async function processTenantSmsQueue(tenantId: string): Promise<void> {
  const settings = await getSmsSettings(tenantId)
  if (!settings.smsEnabled) return

  // Check quiet hours
  if (settings.quietHoursEnabled && isQuietHours(settings)) {
    // Skip processing during quiet hours
    return
  }

  const runId = crypto.randomUUID()

  // Claim entries with atomic lock
  const entries = await withTenant(tenantId, async () => {
    return sql`
      UPDATE sms_queue
      SET status = 'processing', trigger_run_id = ${runId}, updated_at = now()
      WHERE id IN (
        SELECT id FROM sms_queue
        WHERE tenant_id = ${tenantId}
          AND status = 'scheduled'
          AND scheduled_at <= now()
        ORDER BY scheduled_at ASC
        LIMIT 10
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `
  })

  for (const entry of entries.rows) {
    // Check opt-out before sending
    const isOptedOut = await checkOptOut(tenantId, entry.phone_number)
    if (isOptedOut) {
      await markAsSkipped(entry.id, 'recipient_opted_out')
      continue
    }

    try {
      const result = await sendSms(tenantId, {
        to: entry.phone_number,
        content: entry.content
      })

      if (result.success) {
        await markAsSent(entry.id, result.messageSid)
      } else {
        await markAsFailed(entry.id, result.error)
      }
    } catch (error) {
      await markAsFailed(entry.id, error.message)
    }

    // Rate limit: respect tenant's messages_per_second setting
    await sleep(1000 / settings.messagesPerSecond)
  }
}
```

### Package Structure

```
packages/communications/
├── sms/
│   ├── types.ts           - SMS types
│   ├── settings.ts        - Tenant SMS settings
│   ├── provider.ts        - Twilio client wrapper
│   ├── queue.ts           - Queue operations
│   ├── templates.ts       - Template rendering
│   ├── opt-out.ts         - Opt-out management
│   ├── compliance.ts      - TCPA compliance checks
│   └── processor.ts       - Queue processor
└── index.ts               - Export SMS alongside email
```

---

## Constraints

- SMS is **OFF by default** - tenants must explicitly enable
- No SMS marketing features (campaigns, flows, bulk sends)
- 160-character limit enforced for single-segment SMS
- TCPA compliance required (quiet hours, opt-out handling)
- All SMS operations must use `withTenant(tenantId, ...)` wrapper
- Phone numbers stored in E.164 format only
- Credentials encrypted at rest (AES-256-GCM)
- Rate limiting enforced per tenant

---

## Pattern References

**RAWDOG code to reference:**
- `/src/lib/sms/settings.ts` - Comprehensive settings with quiet hours, compliance
- `/src/lib/sms/provider.ts` - Retell/Twilio provider pattern
- `/src/lib/notifications/channels/sms.ts` - SMS channel for notifications
- `/src/lib/sms/consent-rules.ts` - TCPA consent requirements
- `/src/lib/sms/phone-international.ts` - Phone number validation

**Existing platform patterns:**
- `PHASE-2CM-EMAIL-QUEUE.md` - Atomic claim, queue patterns
- `PHASE-2CM-TEMPLATES.md` - Variable substitution
- `PHASE-2PO-ONBOARDING.md` - Setup wizard patterns

---

## AI Discretion Areas

The implementing agent should determine:
1. Whether to support additional SMS providers beyond Twilio (e.g., Vonage, MessageBird)
2. Whether to implement delivery status webhooks from Twilio
3. Link shortening strategy (internal shortener vs. third-party)
4. Whether to queue messages during quiet hours or skip entirely

---

## Tasks

### [PARALLEL] Database Schema
- [ ] Create `tenant_sms_settings` table with encryption for credentials
- [ ] Create `notification_channel_settings` table
- [ ] Create `sms_templates` table with character count validation
- [ ] Create `sms_opt_outs` table
- [ ] Create `sms_queue` table with appropriate indexes

### [PARALLEL] Core SMS Package
- [ ] Implement `SmsSettings` types and getter/setter
- [ ] Implement Twilio provider wrapper with tenant credentials
- [ ] Implement SMS queue operations (claim, send, mark status)
- [ ] Implement opt-out management functions
- [ ] Implement TCPA compliance checks (quiet hours, opt-out)

### [SEQUENTIAL after core] Template Management
- [ ] Implement SMS template CRUD operations
- [ ] Implement variable substitution for SMS
- [ ] Implement character count and segment calculation
- [ ] Implement link shortening integration

### [SEQUENTIAL after templates] Background Processor
- [ ] Implement SMS queue processor job
- [ ] Implement atomic claim pattern for SMS queue
- [ ] Implement retry logic with exponential backoff
- [ ] Implement Twilio webhook handler for delivery status

### [SEQUENTIAL after processor] API Routes
- [ ] Implement SMS settings endpoints
- [ ] Implement template management endpoints
- [ ] Implement queue list/detail endpoints
- [ ] Implement opt-out management endpoints
- [ ] Implement test SMS endpoint

### [SEQUENTIAL after API] UI Components
- [ ] Build SMS enable/disable toggle in settings
- [ ] Build Twilio setup wizard component
- [ ] Build per-notification channel selector
- [ ] Build SMS template editor with character counter
- [ ] Build SMS queue list page
- [ ] Build opt-out management page

### [SEQUENTIAL after UI] Onboarding Integration
- [ ] Add SMS as optional Step 6 in tenant onboarding
- [ ] Implement skip logic for SMS setup
- [ ] Implement Twilio verification flow

---

## Definition of Done

- [ ] SMS is disabled by default for new tenants
- [ ] Twilio setup wizard works and verifies credentials
- [ ] Per-notification SMS toggle works (only when master enabled)
- [ ] SMS templates enforce 160-character limit
- [ ] SMS queue shows real-time status
- [ ] STOP keyword opt-out works correctly
- [ ] Quiet hours are enforced
- [ ] No marketing SMS features exist
- [ ] All SMS operations are tenant-isolated
- [ ] `npx tsc --noEmit` passes
- [ ] Opt-out compliance test passes
