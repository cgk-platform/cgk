# Phase 2CM: Slack Integration & Notifications

> **Status**: COMPLETE
> **Completed**: 2026-02-10
> **Execution**: Part of PHASE-2CM (Communications)
> **Priority**: HIGH - Core notification channel alongside email
> **Dependencies**: PHASE-2CM-SENDER-DNS (email setup pattern to follow)
> **Reference**: RAWDOG implementation in `/src/lib/slack/`, `/src/lib/notifications/channels/slack.ts`

---

## Overview

Slack integration provides real-time notifications to tenant teams. Each tenant connects their own Slack workspace, maps notification types to channels, customizes message templates, and configures scheduled reports.

**This is NOT a communication tool for customers** - Slack is for internal team notifications only.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TENANT LAYER                                     │
│  Each tenant has independent Slack workspace connection                  │
│  - Own OAuth tokens (bot + user)                                        │
│  - Own channel mappings                                                  │
│  - Own notification preferences                                          │
│  - Own scheduled reports                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPER ADMIN LAYER                                │
│  Platform-wide ops notifications (separate Slack workspace)             │
│  - Cross-tenant error alerts                                            │
│  - Health monitoring alerts                                             │
│  - Deployment notifications                                             │
│  - Critical security alerts                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Slack OAuth & Workspace Connection

### 1.1 OAuth Flow

**Admin UI**: `/admin/settings/integrations/slack`

**Outcomes:**
- "Connect Slack" button initiates OAuth flow
- User authorizes both bot AND user scopes
- Tokens are AES-256-CBC encrypted before storage
- OAuth state stored in Redis with 10-minute TTL for CSRF protection
- Connection status shown with workspace name and connected user

**OAuth Implementation:**

```typescript
// packages/slack/src/oauth.ts

// Bot token scopes (40+)
const BOT_SCOPES = [
  'chat:write', 'chat:write.public', 'chat:write.customize',
  'channels:read', 'channels:join', 'channels:history',
  'groups:read', 'groups:history',
  'im:write', 'im:history', 'im:read',
  'mpim:write', 'mpim:history', 'mpim:read',
  'users:read', 'users:read.email',
  'files:read', 'files:write',
  'reactions:read', 'reactions:write',
  'pins:read', 'pins:write',
  'bookmarks:read', 'bookmarks:write',
  'reminders:read', 'reminders:write',
  'dnd:read',
  'usergroups:read', 'usergroups:write',
  'team:read',
  'emoji:read'
]

// User token scopes (for personal assistant mode)
const USER_SCOPES = [
  'channels:read', 'channels:write', 'channels:history',
  'groups:read', 'groups:write', 'groups:history',
  'im:read', 'im:write', 'im:history',
  'mpim:read', 'mpim:write', 'mpim:history',
  'users:read', 'users:read.email', 'users.profile:read',
  'chat:write', 'files:read', 'files:write',
  'reactions:read', 'reactions:write',
  'pins:read', 'pins:write',
  'reminders:read', 'reminders:write',
  'bookmarks:read', 'bookmarks:write',
  'search:read', 'stars:read', 'stars:write',
  'dnd:read', 'dnd:write',
  'usergroups:read', 'usergroups:write',
  'team:read'
]
```

**Token Encryption:**
- Production requires `SLACK_TOKEN_ENCRYPTION_KEY` env var (min 32 chars)
- AES-256-CBC with SCRYPT key derivation
- Lazy-loaded to prevent bundle errors

### 1.2 Disconnect Flow

**Outcomes:**
- User can disconnect Slack at any time
- Tokens are deleted from database
- All scheduled notifications are paused (not deleted)
- Reconnecting resumes scheduled notifications

---

## 2. Channel Picker & Mapping

### 2.1 Channel Selection UI

**Admin UI**: `/admin/settings/notifications/slack`

**Features:**
- List all public channels in workspace
- List private channels where bot is invited
- Search/filter channels
- Create new channel from UI
- Refresh channel list button

### 2.2 Notification Type Categories

Each category has multiple notification types that can be mapped to channels.

**Total: 52 notification types across 8 categories.**

**Creator Notifications (13 types):**
| Type | Description | Default Channel |
|------|-------------|-----------------|
| `creator.application.new` | New creator application submitted | #creators |
| `creator.application.approved` | Application approved | #creators |
| `creator.application.rejected` | Application rejected | #creators |
| `creator.project.update` | Project status changed | #creator-projects |
| `creator.project.submitted` | Content submitted for review | #creator-projects |
| `creator.project.accepted` | Content approved | #creator-projects |
| `creator.project.declined` | Content needs revision | #creator-projects |
| `creator.withdrawal.requested` | Payout requested | #creator-payments |
| `creator.withdrawal.approved` | Payout approved | #creator-payments |
| `creator.withdrawal.completed` | Payout sent | #creator-payments |
| `creator.payment.requested` | Payment pending | #creator-payments |
| `creator.payment.failed` | Payment failed | #creator-payments |
| `creator.payment.escalated` | Payment issue escalated | #creator-payments |
| `creator.message.new` | New message from creator | #creator-inbox |

**Commerce Notifications (8 types):**
| Type | Description | Default Channel |
|------|-------------|-----------------|
| `commerce.order.new` | New order placed | #orders |
| `commerce.order.high_value` | Order over threshold | #orders |
| `commerce.order.failed` | Order processing failed | #orders |
| `commerce.refund.issued` | Refund processed | #orders |
| `commerce.fulfillment.issue` | Fulfillment problem | #orders |
| `commerce.subscription.new` | New subscription | #subscriptions |
| `commerce.subscription.cancelled` | Subscription cancelled | #subscriptions |
| `commerce.subscription.failed` | Subscription payment failed | #subscriptions |
| `commerce.subscription.churn_alert` | High churn risk detected | #subscriptions |

**Review Notifications (4 types):**
| Type | Description | Default Channel |
|------|-------------|-----------------|
| `reviews.new` | New review submitted | #reviews |
| `reviews.negative` | Review <= 3 stars | #reviews |
| `reviews.response_needed` | Review needs response | #reviews |
| `reviews.verified` | Verified purchase review | #reviews |

**Finance & Treasury Notifications (7 types):**
| Type | Description | Default Channel |
|------|-------------|-----------------|
| `treasury.topup.initiated` | Balance top-up started | #treasury |
| `treasury.topup.succeeded` | Top-up completed | #treasury |
| `treasury.topup.failed` | Top-up failed | #treasury |
| `treasury.payout.pending` | Payout awaiting approval | #treasury |
| `treasury.payout.completed` | Payout sent | #treasury |
| `treasury.payout.failed` | Payout failed | #treasury |
| `treasury.balance.low` | Balance below threshold | #treasury |

**System & Security Notifications (5 types):**
| Type | Description | Default Channel |
|------|-------------|-----------------|
| `system.alert` | General system alert | #alerts |
| `system.error.critical` | Critical error | #alerts |
| `system.security` | Security event | #security |
| `system.api.error` | API error | #alerts |
| `system.deployment` | Deployment notification | #deployments |

**Analytics Notifications (3 types):**
| Type | Description | Default Channel |
|------|-------------|-----------------|
| `analytics.ai_task` | AI detected action needed | #analytics |
| `analytics.daily_digest` | Daily performance report | #analytics |
| `analytics.task_reminder` | Task reminder | #analytics |

**Survey Notifications (7 types):**
| Type | Description | Default Channel |
|------|-------------|-----------------|
| `surveys.report` | Scheduled survey report | #surveys |
| `surveys.daily_summary` | Daily survey summary | #surveys |
| `surveys.weekly_report` | Weekly survey report | #surveys |
| `surveys.new_channel` | New attribution channel detected | #surveys |
| `surveys.nps_alert` | NPS threshold triggered | #surveys |
| `surveys.utm_discrepancy` | UTM mismatch detected | #surveys |
| `surveys.sync_failure` | Survey sync failed (critical) | #alerts |

**DAM Notifications (5 types):**
| Type | Description | Default Channel |
|------|-------------|-----------------|
| `dam.mention` | User mentioned in comment | DM to user |
| `dam.reply` | Reply to comment | DM to user |
| `dam.review_requested` | Asset review requested | #content-review |
| `dam.review_approved` | Asset review approved | #content-review |
| `dam.review_rejected` | Asset review rejected | #content-review |

### 2.3 Channel Mapping Configuration

**Admin UI**: `/admin/settings/notifications/slack/mapping`

**Table View:**
```
Notification Type               | Channel          | Enabled | Actions
─────────────────────────────────────────────────────────────────────────
Creator: New Application        | #creators        | ✓       | Edit | Test
Creator: Project Submitted      | #creator-content | ✓       | Edit | Test
Commerce: High Value Order      | #orders          | ✓       | Edit | Test
Treasury: Low Balance           | #treasury-alerts | ✓       | Edit | Test
System: Critical Error          | #alerts          | ✓       | Edit | Test
```

**Features:**
- Enable/disable per notification type
- Select channel per type
- Test button sends sample message
- Bulk enable/disable by category
- Reset to defaults

---

## 3. Scheduled Reports & Daily Digests

### 3.1 Performance Reports

**Admin UI**: `/admin/analytics/slack-reports`

**Configuration:**
- Frequency: Daily, Weekly, Monthly
- Send time: Hour picker (0-23)
- Timezone: 24 timezones + UTC, London, Paris, Tokyo, Sydney
- Channel: Select from connected channels
- Metrics: Drag-and-drop ordering, toggle individual metrics

**Available Metrics by Category:**

**Revenue Metrics:**
- Gross Revenue, Net Revenue, Average Order Value
- Orders Count, Refunds, Refund Rate
- Revenue vs Yesterday, Revenue vs Last Week

**Subscription Metrics:**
- Active Subscriptions, New Subscriptions
- Churned, Churn Rate, MRR
- Subscription Revenue %

**Attribution Metrics:**
- Attributed Revenue, Attribution Rate
- Top Channels, Top Campaigns
- ROAS by Channel

**Marketing Metrics:**
- Total Ad Spend, Meta Spend, Google Spend, TikTok Spend
- Blended ROAS, CAC
- New vs Returning Customer Revenue

**Creator Metrics:**
- Active Creators, New Applications
- Pending Payouts, Total Creator Spend
- Top Performing Creators

### 3.2 Report Scheduling

**Implementation:**
- Trigger.dev scheduled task runs hourly at :30
- Checks for due reports based on frequency and timezone
- Sends report to configured channel
- Tracks last_run timestamp
- Retry logic: 3 attempts with exponential backoff

**Date Range Logic:**
- Daily: Yesterday's data OR custom N-day range
- Weekly: Last 7 days (excluding today)
- Monthly: All of previous month

### 3.3 On-Demand Reports

**Features:**
- "Send Now" button for any report config
- Preview report before sending
- Export as PDF or CSV alongside Slack

---

## 4. Super Admin Ops Notifications

### 4.1 Platform-Wide Alerting

**Super Admin UI**: `/super-admin/settings/notifications/slack`

Separate Slack workspace for platform operations:

**Ops Alert Types:**
| Severity | Channel | Mention | Description |
|----------|---------|---------|-------------|
| Critical | #ops-critical | @here | System down, data loss risk |
| Error | #ops-errors | @oncall | Errors requiring attention |
| Warning | #ops-warnings | none | Potential issues |
| Info | #ops-info | none | Informational updates |

**Cross-Tenant Alerts:**
- Error rate exceeds threshold for any tenant
- Health check failures
- Integration disconnections
- Payment processing failures
- Security events (failed logins, rate limits)

### 4.2 Ops Alert Configuration

**Features:**
- Route alerts by severity to different channels
- Configure @here / @channel mentions
- Set quiet hours (no non-critical alerts)
- On-call rotation integration (future)
- Aggregate similar alerts (don't spam)

---

## 5. Message Templates (Block Kit)

### 5.1 Template Structure

All Slack messages use Block Kit for rich formatting:

**Standard Message Template:**
```typescript
interface SlackMessageTemplate {
  id: string
  tenant_id: string
  notification_type: string
  blocks: SlackBlock[]
  fallback_text: string
  attachments?: SlackAttachment[]
  version: number
  is_active: boolean
}
```

**Block Types Used:**
- `section` - Text with optional accessory (button, image)
- `context` - Small footer text (timestamps, signatures)
- `divider` - Horizontal line
- `actions` - Buttons with URLs
- `header` - Large bold text
- `fields` - Two-column key-value pairs

### 5.2 Pre-Built Templates

**Project Workflow Templates:**
```typescript
// Project Created
{
  blocks: [
    { type: 'header', text: '📋 New Project Created' },
    { type: 'section', text: '*{projectTitle}*\nAssigned to {creatorName}' },
    { type: 'section', fields: [
      { text: '*Rate:* {rateFormatted}' },
      { text: '*Due:* {dueDate}' }
    ]},
    { type: 'actions', elements: [
      { type: 'button', text: 'View Project', url: '{projectUrl}' }
    ]},
    { type: 'context', text: 'Sent by Platform • {timestamp}' }
  ]
}

// Project Submitted
// Project Approved
// Revision Requested
```

**Payment Templates:**
```typescript
// Payment Pending
// Payment Sent
// Payment Failed (with retry button)
```

**Treasury Templates:**
```typescript
// Top-Up Initiated (pending, expected completion)
// Top-Up Succeeded (funds available)
// Top-Up Failed (reason, affected payouts)
```

**Commerce Templates:**
```typescript
// New Order
// High Value Order
// Order Failed
// Subscription Event
```

### 5.3 Template Customization UI

**Admin UI**: `/admin/settings/notifications/slack/templates`

**Features:**
- Visual Block Kit editor
- Variable insertion: `{customerName}`, `{orderNumber}`, `{amount}`, etc.
- Preview with sample data
- Test send to current user's DM
- Version history
- Reset to default
- Duplicate template

---

## 6. User Mapping & Mentions

### 6.1 Team Member ↔ Slack User Association

**Outcomes:**
- Map Clerk/platform users to Slack user IDs
- Support automatic mapping by email
- Support manual override
- Cache mappings in Redis (24-hour TTL)

**Association Methods:**
| Method | Description |
|--------|-------------|
| `auto` | Matched by email address |
| `manual` | Admin explicitly linked |
| `none` | No Slack account found |

### 6.2 Mention Resolution

When a notification needs to mention a team member:

```typescript
async function resolveSlackMention(clerkUserId: string): Promise<string | null> {
  // 1. Check cache
  const cached = await redis.get(`slack:user:${clerkUserId}`)
  if (cached) return cached

  // 2. Get Clerk user email
  const clerkUser = await clerk.users.get(clerkUserId)
  const email = clerkUser.emailAddresses[0].emailAddress

  // 3. Find Slack user by email
  const slackUser = await slack.findUserByEmail(email)
  if (!slackUser) return null

  // 4. Cache for 24 hours
  await redis.set(`slack:user:${clerkUserId}`, slackUser.id, 'EX', 86400)

  return slackUser.id
}
```

### 6.3 Per-User Notification Preferences

Each user can configure their own notification preferences:

**Admin UI**: `/admin/settings/notifications/preferences`

| Setting | Options | Default |
|---------|---------|---------|
| Email enabled | on/off | on |
| Slack enabled | on/off | off |
| Slack DM enabled | on/off | on |
| Notify on mention | on/off | on |
| Notify on reply | on/off | on |
| Notify on asset update | on/off | off |
| Quiet hours start | 0-23 (UTC) | none |
| Quiet hours end | 0-23 (UTC) | none |

**Quiet Hours Handling:**
- Notifications are skipped during quiet hours
- Critical alerts (sync failures, security) bypass quiet hours
- Quiet hours span midnight (e.g., 22:00 to 07:00)

### 6.4 Mention Patterns

**Primary Mention (in header):**
```
📋 New Project for @John Smith
```

**Secondary Mentions (CC in footer):**
```
CC: @Jane Doe, @Bob Johnson
```

---

## 7. Test Message Functionality

### 7.1 Per-Configuration Test

Every notification configuration has a "Test" button:

**API**: `POST /api/admin/notifications/slack/test`

```typescript
interface TestRequest {
  notification_type: string
  channel_id?: string  // Override configured channel
  use_sample_data: boolean
}

interface TestResponse {
  success: boolean
  message_ts?: string
  channel_id?: string
  error?: string
}
```

### 7.2 Connection Test

**API**: `POST /api/admin/integrations/slack/test`

Tests:
- Bot token validity
- User token validity (if configured)
- Can post to default channel
- Can list channels

---

## 8. Database Schema

### 8.1 Tenant Slack Connection

```sql
-- Per-tenant Slack workspace connection
CREATE TABLE tenant_slack_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  workspace_id VARCHAR(50) NOT NULL,
  workspace_name VARCHAR(255),

  -- Encrypted tokens (AES-256-CBC)
  bot_token_encrypted TEXT NOT NULL,
  user_token_encrypted TEXT,

  -- Connected user info
  connected_by_user_id UUID REFERENCES users(id),
  connected_by_slack_user_id VARCHAR(50),

  -- Scopes granted
  bot_scopes TEXT[] NOT NULL,
  user_scopes TEXT[],

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)  -- One workspace per tenant
);

-- Channel mappings
CREATE TABLE tenant_slack_channel_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  notification_type VARCHAR(100) NOT NULL,
  channel_id VARCHAR(50) NOT NULL,
  channel_name VARCHAR(100),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, notification_type)
);

-- Scheduled reports
CREATE TABLE tenant_slack_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  channel_id VARCHAR(50) NOT NULL,
  channel_name VARCHAR(100),

  -- Schedule
  frequency VARCHAR(20) NOT NULL,  -- daily, weekly, monthly
  send_hour INTEGER NOT NULL CHECK (send_hour >= 0 AND send_hour <= 23),
  timezone VARCHAR(50) NOT NULL,

  -- Configuration
  metrics JSONB NOT NULL,  -- Array of { id, enabled, order }
  date_range_type VARCHAR(20),  -- yesterday, last_n_days, last_month
  date_range_days INTEGER,
  custom_header TEXT,

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message templates
CREATE TABLE tenant_slack_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  notification_type VARCHAR(100) NOT NULL,
  blocks JSONB NOT NULL,
  fallback_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, notification_type)
);

-- Notification log
CREATE TABLE tenant_slack_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  notification_type VARCHAR(100) NOT NULL,
  channel_id VARCHAR(50) NOT NULL,
  message_ts VARCHAR(50),
  thread_ts VARCHAR(50),
  status VARCHAR(20) NOT NULL,  -- sent, failed, rate_limited
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User associations
CREATE TABLE tenant_slack_user_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  platform_user_id UUID NOT NULL REFERENCES users(id),
  slack_user_id VARCHAR(50) NOT NULL,
  slack_email VARCHAR(255),
  association_method VARCHAR(20) NOT NULL,  -- auto, manual
  last_verified_at TIMESTAMPTZ,
  lookup_failures INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, platform_user_id)
);

-- Indexes
CREATE INDEX idx_slack_notifications_tenant ON tenant_slack_notifications(tenant_id);
CREATE INDEX idx_slack_notifications_created ON tenant_slack_notifications(created_at DESC);
CREATE INDEX idx_slack_reports_next_run ON tenant_slack_reports(tenant_id, is_enabled, send_hour);
```

### 8.2 Super Admin Slack (Platform Ops)

```sql
-- Platform-level Slack connection (super admin only)
CREATE TABLE platform_slack_workspace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(50) NOT NULL,
  workspace_name VARCHAR(255),
  bot_token_encrypted TEXT NOT NULL,
  user_token_encrypted TEXT,

  -- Alert routing
  channel_critical VARCHAR(50),
  channel_errors VARCHAR(50),
  channel_warnings VARCHAR(50),
  channel_info VARCHAR(50),
  channel_deployments VARCHAR(50),

  -- Mention settings
  mention_critical VARCHAR(50),  -- @here, @channel, user group ID
  mention_errors VARCHAR(50),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform alert log
CREATE TABLE platform_slack_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity VARCHAR(20) NOT NULL,
  service VARCHAR(50) NOT NULL,
  tenant_id UUID,  -- NULL for platform-wide
  title TEXT NOT NULL,
  message TEXT,
  channel_id VARCHAR(50),
  message_ts VARCHAR(50),
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. API Endpoints

### 9.1 Tenant Endpoints

```
POST   /api/admin/integrations/slack/connect      # Get OAuth URL
GET    /api/slack/oauth/callback                  # OAuth callback
DELETE /api/admin/integrations/slack/disconnect   # Disconnect
POST   /api/admin/integrations/slack/test         # Test connection

GET    /api/admin/notifications/slack/channels    # List channels
POST   /api/admin/notifications/slack/channels/refresh  # Refresh list

GET    /api/admin/notifications/slack/mappings    # Get all mappings
PUT    /api/admin/notifications/slack/mappings    # Update mappings
POST   /api/admin/notifications/slack/test        # Send test message

GET    /api/admin/notifications/slack/reports     # List reports
POST   /api/admin/notifications/slack/reports     # Create report
PUT    /api/admin/notifications/slack/reports/:id # Update report
DELETE /api/admin/notifications/slack/reports/:id # Delete report
POST   /api/admin/notifications/slack/reports/:id/send  # Send now

GET    /api/admin/notifications/slack/templates   # List templates
PUT    /api/admin/notifications/slack/templates/:type  # Update template
POST   /api/admin/notifications/slack/templates/:type/reset  # Reset to default

GET    /api/admin/notifications/slack/logs        # View send history
```

### 9.2 Super Admin Endpoints

```
POST   /api/super-admin/slack/connect             # Connect ops Slack
DELETE /api/super-admin/slack/disconnect          # Disconnect
PUT    /api/super-admin/slack/channels            # Configure channels
POST   /api/super-admin/slack/test                # Test alert
GET    /api/super-admin/slack/alerts              # View alert history
```

---

## 10. Slack Client Library

### 10.1 Package Structure

```
packages/slack/
├── src/
│   ├── oauth.ts           # OAuth flow, token encryption
│   ├── client.ts          # Slack API wrapper (2000+ lines)
│   ├── types.ts           # TypeScript interfaces
│   ├── templates.ts       # Block Kit templates
│   ├── notifications.ts   # Notification sending
│   ├── reports.ts         # Scheduled reports
│   └── alerts.ts          # Ops alerting
└── package.json
```

### 10.2 Core Client Operations

```typescript
// packages/slack/src/client.ts

export class SlackClient {
  constructor(botToken: string, userToken?: string)

  // Messages
  postMessage(channel: string, blocks: Block[], text: string): Promise<MessageResponse>
  updateMessage(channel: string, ts: string, blocks: Block[]): Promise<void>
  deleteMessage(channel: string, ts: string): Promise<void>
  sendDM(userId: string, blocks: Block[], text: string): Promise<MessageResponse>

  // Channels
  listChannels(): Promise<Channel[]>
  getAllChannels(): Promise<Channel[]>  // With pagination
  getChannel(id: string): Promise<Channel>
  joinChannel(id: string): Promise<void>

  // Users
  listUsers(): Promise<User[]>
  getAllUsers(): Promise<User[]>  // With pagination
  findUserByEmail(email: string): Promise<User | null>

  // Reactions & Pins
  addReaction(channel: string, ts: string, emoji: string): Promise<void>
  pinMessage(channel: string, ts: string): Promise<void>

  // History
  getChannelHistory(channel: string, limit?: number): Promise<Message[]>
  getThreadReplies(channel: string, ts: string): Promise<Message[]>

  // Scheduled
  scheduleMessage(channel: string, postAt: number, blocks: Block[]): Promise<string>
  listScheduledMessages(): Promise<ScheduledMessage[]>
  deleteScheduledMessage(id: string): Promise<void>
}
```

---

## 11. Integration Points

### 11.1 Event Triggers

Each platform event can trigger Slack notifications:

**Creator Events → Slack**
```typescript
// When creator submits project
await slack.sendNotification('creator.project.submitted', {
  creatorName: creator.name,
  projectTitle: project.title,
  projectUrl: `/admin/creators/${creator.id}/projects/${project.id}`
})
```

**Commerce Events → Slack**
```typescript
// When high-value order placed
if (order.totalCents >= tenant.highValueThreshold) {
  await slack.sendNotification('commerce.order.high_value', {
    orderNumber: order.orderNumber,
    customerEmail: order.email,
    amount: formatCurrency(order.totalCents),
    orderUrl: `/admin/orders/${order.id}`
  })
}
```

**Treasury Events → Slack**
```typescript
// When balance drops below threshold
if (balance < tenant.lowBalanceThreshold) {
  await slack.sendNotification('treasury.balance.low', {
    currentBalance: formatCurrency(balance),
    threshold: formatCurrency(tenant.lowBalanceThreshold),
    topUpUrl: '/admin/treasury/top-up'
  })
}
```

### 11.2 Related Phases

| Phase | Integration |
|-------|-------------|
| PHASE-2CM-EMAIL-QUEUE | Slack as parallel channel (email + Slack) |
| PHASE-2D-TREASURY | Treasury alerts, approval notifications |
| PHASE-2B-COMMERCE | Order, subscription notifications |
| PHASE-4-CREATOR | Creator workflow notifications |
| PHASE-2PO-HEALTH | Health check alerts to ops Slack |
| PHASE-2PO-LOGGING | Error alerts to ops Slack |

---

## 12. Multi-Tenant Considerations

### 12.1 Isolation Requirements

- Each tenant's Slack tokens stored in tenant schema
- Channel IDs unique per workspace (no collision risk)
- Templates customized per tenant
- Notification logs tenant-isolated
- Redis cache keys prefixed with tenant ID

### 12.2 Onboarding Wizard Integration

**Brand Onboarding Step: Notifications (Optional)**

```
Step 5: Team Notifications

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Connect your team's Slack workspace to receive
real-time notifications about orders, creators,
and important events.

[Connect Slack Workspace]

━━━ OR ━━━

You can skip this step and configure notifications
later in Settings → Notifications → Slack

[Skip for Now]
```

---

## 13. Rate Limiting & Error Handling

### 13.1 Rate Limit Handling

Slack API rate limits: ~1 message per second per channel

**Implementation:**
- Check `Retry-After` header on 429 responses
- Queue messages with exponential backoff
- Aggregate similar notifications (e.g., 5 orders → "5 new orders")
- Don't retry failed messages more than 3 times

### 13.2 Error Handling

```typescript
async function sendSlackNotification(type: string, data: any) {
  try {
    const result = await slack.postMessage(channel, blocks, fallback)
    await logNotification(type, 'sent', result.ts)
    return { success: true, messageTs: result.ts }
  } catch (error) {
    if (error.code === 'channel_not_found') {
      // Channel deleted - disable mapping
      await disableChannelMapping(type)
    } else if (error.code === 'token_revoked') {
      // Token invalid - mark workspace disconnected
      await markWorkspaceDisconnected()
    }
    await logNotification(type, 'failed', null, error.message)
    return { success: false, error: error.message }
  }
}
```

---

## 14. Admin UI Components

### 14.1 Slack Connection Card

```
┌─────────────────────────────────────────────────┐
│  🔗 Slack Integration                     ✓ Connected │
├─────────────────────────────────────────────────┤
│                                                 │
│  Workspace: ACME Corp                           │
│  Connected by: john@acme.com                    │
│  Connected: Jan 15, 2025                        │
│                                                 │
│  [Test Connection]  [Disconnect]                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 14.2 Channel Mapping Table

```
┌─────────────────────────────────────────────────────────────────┐
│  Notification Settings                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Category: Creators  [Expand/Collapse]                          │
│                                                                 │
│  ☑️ New Application      → [#creators      ▼]  [Test]           │
│  ☑️ Application Approved → [#creators      ▼]  [Test]           │
│  ☐ Project Submitted     → [#content       ▼]  [Test]           │
│  ☑️ Payment Failed       → [#payments      ▼]  [Test]           │
│                                                                 │
│  Category: Commerce  [Expand/Collapse]                          │
│                                                                 │
│  ☑️ New Order           → [#orders        ▼]  [Test]            │
│  ☑️ High Value Order    → [#orders        ▼]  [Test]            │
│  ☐ Subscription Cancel  → [#subscriptions ▼]  [Test]            │
│                                                                 │
│  [Save Changes]                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 14.3 Scheduled Reports

```
┌─────────────────────────────────────────────────────────────────┐
│  Scheduled Reports                              [+ New Report]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 Daily Performance                                           │
│     Channel: #analytics | Daily at 9:00 AM EST                  │
│     Last sent: Today, 9:00 AM | Status: ✓ Sent                  │
│     [Edit] [Send Now] [Disable]                                 │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  📈 Weekly Summary                                              │
│     Channel: #leadership | Weekly on Monday at 8:00 AM EST     │
│     Last sent: Jan 13, 2025 | Status: ✓ Sent                   │
│     [Edit] [Send Now] [Disable]                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 15. Definition of Done

- [x] Tenant can connect Slack workspace via OAuth
- [x] Bot and user tokens encrypted with AES-256-CBC
- [x] OAuth state protected with Redis TTL
- [x] Tenant can disconnect and reconnect
- [x] Channel list fetched and cached
- [x] All 40+ notification types configurable
- [x] Channel mapping saved per notification type
- [x] Enable/disable per notification type
- [x] Test message works for every type
- [x] Scheduled reports configurable (daily, weekly, monthly)
- [x] Report metrics customizable with drag-and-drop
- [x] Reports send at configured time/timezone
- [x] "Send Now" works for any report
- [x] Message templates use Block Kit
- [x] Templates customizable in admin UI
- [x] User mentions resolve by email
- [x] Super admin ops Slack separate from tenants
- [x] Cross-tenant alerts route by severity
- [x] Rate limiting handled gracefully
- [x] All notifications logged with status
- [x] Multi-tenant isolation verified

---

## References

**RAWDOG Implementation Files:**
- `/src/lib/slack/oauth.ts` - OAuth flow (803 lines)
- `/src/lib/slack/client.ts` - API wrapper (1,982 lines)
- `/src/lib/notifications/channels/slack.ts` - Routing (577 lines)
- `/src/lib/notifications/templates/slack-templates.ts` - Block Kit templates
- `/src/lib/ops/alerts/slack.ts` - Ops alerting
- `/src/app/admin/analytics/components/SlackNotificationsTab.tsx` - UI (953 lines)
- `/src/trigger/slack-performance-reports.ts` - Scheduling

**Related Plan Docs:**
- `PHASE-2CM-SENDER-DNS.md` - Email DNS pattern (similar config UI)
- `PHASE-2CM-EMAIL-QUEUE.md` - Queue pattern (Slack uses similar logging)
- `PHASE-2PO-HEALTH.md` - Health checks trigger ops alerts
- `SEQUENTIAL-02-UNIFIED-COMMUNICATIONS-SYSTEM.md` - Master comms spec
