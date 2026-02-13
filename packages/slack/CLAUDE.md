# @cgk-platform/slack - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

Slack integration for the CGK platform. Provides notifications, scheduled reports, and ops alerting. Each tenant has their own independent Slack workspace connection with full channel mapping and custom template support.

---

## Quick Reference

```typescript
import {
  sendNotification,
  sendTestNotification,
  sendCriticalAlert,
  SlackClient,
} from '@cgk-platform/slack'

// Send tenant notification
await sendNotification('rawdog', 'commerce.order.new', {
  orderNumber: '1001',
  orderAmount: '$149.99',
  customerEmail: 'customer@example.com',
})

// Send platform alert (super admin)
await sendCriticalAlert('api', 'High Error Rate', 'Error rate exceeded 5%')
```

---

## Key Patterns

### Pattern 1: Sending Tenant Notifications

```typescript
import { sendNotification } from '@cgk-platform/slack'

// Send a notification to the mapped channel
const result = await sendNotification('rawdog', 'creator.project.submitted', {
  creatorName: 'John Doe',
  projectTitle: 'Summer Campaign Video',
  projectUrl: 'https://admin.example.com/projects/123',
})

if (!result.success) {
  console.error('Failed to send notification:', result.error)
}
```

### Pattern 2: OAuth Flow

```typescript
import {
  generateOAuthState,
  serializeOAuthState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  processOAuthResponse,
} from '@cgk-platform/slack'

// Step 1: Generate state and redirect
const state = generateOAuthState(tenantId, userId)
const serialized = serializeOAuthState(state)
const authUrl = buildAuthorizationUrl(serialized)
// Redirect user to authUrl

// Step 2: Handle callback
const tokens = await exchangeCodeForTokens(code)
const processed = processOAuthResponse(tokens)
// Save processed tokens to database
```

### Pattern 3: Creating a Client

```typescript
import { SlackClient } from '@cgk-platform/slack'

// From encrypted tokens
const client = SlackClient.fromEncryptedTokens(
  workspace.botTokenEncrypted,
  workspace.userTokenEncrypted,
)

// Direct instantiation
const client = new SlackClient({
  botToken: 'xoxb-...',
  userToken: 'xoxp-...',
})

// Use client
const channels = await client.listChannels()
await client.postMessage(channelId, blocks, fallbackText)
```

### Pattern 4: Platform Alerts

```typescript
import {
  sendCriticalAlert,
  sendErrorAlert,
  sendWarningAlert,
  sendDeploymentAlert,
} from '@cgk-platform/slack'

// Critical alerts include @here mention
await sendCriticalAlert('database', 'Connection Pool Exhausted')

// Error alerts include @oncall mention
await sendErrorAlert('api', 'High Latency', 'P99 > 2s')

// Warning alerts - no mention
await sendWarningAlert('jobs', 'Queue Backlog', 'Jobs pending: 500')

// Deployment notifications
await sendDeploymentAlert('v2.1.0 Released', 'Deployed to production')
```

### Pattern 5: Scheduled Reports

```typescript
import { createReport, sendReport, getReports } from '@cgk-platform/slack'

// Create a report
const report = await createReport('rawdog', {
  name: 'Daily Performance',
  channelId: 'C0123456789',
  frequency: 'daily',
  sendHour: 9,
  timezone: 'America/New_York',
  metrics: [
    { id: 'gross_revenue', enabled: true, order: 1 },
    { id: 'orders_count', enabled: true, order: 2 },
  ],
})

// Send report on demand
await sendReport('rawdog', report.id)
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `types.ts` | Type definitions | All types, `NOTIFICATION_TYPES`, `REPORT_METRICS` |
| `encryption.ts` | Token encryption | `encryptToken`, `decryptToken` |
| `oauth.ts` | OAuth flow | `buildAuthorizationUrl`, `exchangeCodeForTokens` |
| `client.ts` | Slack API wrapper | `SlackClient` |
| `templates.ts` | Block Kit templates | `buildMessage`, `getTemplate` |
| `notifications.ts` | Notification sending | `sendNotification`, `sendTestNotification` |
| `reports.ts` | Scheduled reports | `createReport`, `sendReport` |
| `alerts.ts` | Platform alerting | `sendCriticalAlert`, `sendAlert` |

---

## Notification Types (52 total)

| Category | Types | Default Channel |
|----------|-------|-----------------|
| Creator (14) | application.*, project.*, withdrawal.*, payment.*, message.* | #creators |
| Commerce (9) | order.*, refund.*, fulfillment.*, subscription.* | #orders |
| Reviews (4) | new, negative, response_needed, verified | #reviews |
| Treasury (7) | topup.*, payout.*, balance.low | #treasury |
| System (5) | alert, error.critical, security, api.error, deployment | #alerts |
| Analytics (3) | ai_task, daily_digest, task_reminder | #analytics |
| Surveys (7) | report, daily_summary, weekly_report, new_channel, nps_alert, utm_discrepancy, sync_failure | #surveys |
| DAM (5) | mention, reply, review_requested, review_approved, review_rejected | #content-review |

---

## Environment Variables

```bash
# Required
SLACK_CLIENT_ID=           # Slack App OAuth Client ID
SLACK_CLIENT_SECRET=       # Slack App OAuth Client Secret
SLACK_OAUTH_REDIRECT_URI=  # OAuth callback URL
SLACK_TOKEN_ENCRYPTION_KEY= # Min 32 chars for AES-256
```

---

## Database Tables

### Tenant Schema
- `tenant_slack_workspaces` - Workspace connections
- `tenant_slack_channel_mappings` - Notification type to channel mappings
- `tenant_slack_reports` - Scheduled report configs
- `tenant_slack_templates` - Custom Block Kit templates
- `tenant_slack_notifications` - Notification log
- `tenant_slack_user_associations` - User ID mappings
- `tenant_user_notification_preferences` - Per-user preferences

### Public Schema
- `platform_slack_workspace` - Super admin Slack connection
- `platform_slack_alerts` - Platform alert log

---

## Common Gotchas

### 1. Token Encryption Required

```typescript
// WRONG - Storing tokens in plain text
await sql`INSERT INTO ... VALUES (${token})`

// CORRECT - Encrypt before storing
import { encryptToken } from '@cgk-platform/slack'
const encrypted = encryptToken(token)
await sql`INSERT INTO ... VALUES (${encrypted})`
```

### 2. Tenant Isolation

```typescript
// WRONG - No tenant context
const workspace = await sql`SELECT * FROM tenant_slack_workspaces`

// CORRECT - Always use tenant context
import { getTenantWorkspace } from '@cgk-platform/slack'
const workspace = await getTenantWorkspace(tenantId)
```

### 3. Rate Limiting

Slack allows ~1 message per second per channel. The client handles rate limiting automatically, but for bulk operations:

```typescript
// WRONG - Sending many messages at once
for (const item of items) {
  await sendNotification(tenantId, type, item)
}

// CORRECT - Aggregate similar notifications
await sendNotification(tenantId, 'commerce.order.new', {
  summary: `${items.length} new orders`,
})
```

### 4. Channel Not Found

```typescript
// Handle deleted channels gracefully
const result = await sendNotification(...)
if (result.error?.includes('channel_not_found')) {
  // Channel was deleted - mapping auto-disabled
}
```

---

## Integration Points

### Uses:
- `@cgk-platform/db` - Database operations with tenant isolation
- `@slack/web-api` - Official Slack API client

### Used by:
- Commerce events (orders, subscriptions)
- Creator events (projects, payouts)
- Treasury events (topups, low balance)
- Platform ops (errors, deployments)
- Background jobs (scheduled reports)

---

## Testing

```bash
pnpm typecheck   # Type check
pnpm test        # Run tests
```

### Test Connection
```typescript
import { SlackClient } from '@cgk-platform/slack'

const client = SlackClient.fromEncryptedTokens(botToken)
const result = await client.testConnection(testChannelId)
console.log(result)
// { botValid: true, userValid: true, canPost: true, canListChannels: true }
```
