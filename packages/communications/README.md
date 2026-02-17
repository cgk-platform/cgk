# @cgk-platform/communications

Email and SMS communications for the CGK platform - sender management, templates, queue processing, and inbound handling.

## Installation

```bash
pnpm add @cgk-platform/communications
```

## Features

- **Sender Management** - Domain verification, DNS setup, sender addresses
- **Email Templates** - Dynamic templates with variables and versioning
- **Email Queue** - Scheduled sending with retry logic
- **Inbound Processing** - Handle replies, receipts, and support emails
- **SMS Support** - Optional Twilio integration with TCPA compliance
- **Notification Routing** - Route notification types to specific senders
- **Onboarding Wizard** - Guided email setup for new tenants

## Quick Start

### Setup Email Sending

```typescript
import {
  createDomain,
  createSenderAddress,
  upsertNotificationRouting,
} from '@cgk-platform/communications'

// Add domain
const domain = await createDomain({
  tenantId: 'tenant_123',
  subdomain: 'mail',
  rootDomain: 'my-brand.com',
})

// Create sender address
const sender = await createSenderAddress({
  tenantId: 'tenant_123',
  domainId: domain.id,
  localPart: 'hello',
  name: 'My Brand Support',
  purpose: 'transactional',
})

// Route order confirmations to this sender
await upsertNotificationRouting({
  tenantId: 'tenant_123',
  notificationType: 'order_confirmation',
  senderAddressId: sender.id,
  enabled: true,
})
```

### Use Email Templates

```typescript
import {
  renderEmailTemplate,
  createTemplate,
  seedDefaultTemplates,
} from '@cgk-platform/communications'

// Seed default templates
await seedDefaultTemplates('tenant_123')

// Render template
const email = await renderEmailTemplate({
  tenantId: 'tenant_123',
  notificationType: 'order_confirmation',
  variables: {
    order_number: '#1234',
    customer_name: 'John Doe',
    order_total: '$99.99',
    order_items: [
      { name: 'Premium Sheets', quantity: 1, price: '$99.99' },
    ],
  },
})

console.log(email.subject) // "Order #1234 Confirmed"
console.log(email.html) // Rendered HTML
console.log(email.text) // Plain text version
```

### Queue Email for Sending

```typescript
import { createQueueEntry } from '@cgk-platform/communications'

const entry = await createQueueEntry({
  tenantId: 'tenant_123',
  type: 'order_confirmation',
  recipientEmail: 'customer@example.com',
  recipientName: 'John Doe',
  variables: {
    order_number: '#1234',
    order_total: '$99.99',
  },
  scheduledFor: new Date(), // Send immediately
})
```

### Process Email Queue

```typescript
import { claimScheduledEntries, markAsSent } from '@cgk-platform/communications'

// Claim entries ready to send
const entries = await claimScheduledEntries({
  tenantId: 'tenant_123',
  limit: 10,
})

for (const entry of entries) {
  // Render and send email
  const email = await renderEmailTemplate({
    tenantId: entry.tenantId,
    notificationType: entry.type,
    variables: entry.variables,
  })
  
  // Send via your email provider
  await sendEmail(email)
  
  // Mark as sent
  await markAsSent(entry.id)
}
```

### Handle Inbound Emails

```typescript
import { routeEmail, handleSupportEmail } from '@cgk-platform/communications'

// Webhook handler for Resend
export async function POST(request: Request) {
  const payload = await request.json()
  
  const result = await routeEmail({
    tenantId: 'tenant_123',
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    headers: payload.headers,
  })
  
  return Response.json({ success: true, type: result.type })
}
```

### SMS Support (Optional)

```typescript
import {
  updateSmsSettings,
  sendSms,
  renderSmsTemplate,
} from '@cgk-platform/communications'

// Enable SMS
await updateSmsSettings({
  tenantId: 'tenant_123',
  enabled: true,
  twilioAccountSid: 'AC...',
  twilioAuthToken: 'xxx',
  twilioPhoneNumber: '+15551234567',
})

// Send SMS
const sms = await renderSmsTemplate({
  tenantId: 'tenant_123',
  type: 'order_shipped',
  variables: { order_number: '#1234', tracking_url: 'https://...' },
})

await sendSms({
  tenantId: 'tenant_123',
  to: '+15559876543',
  body: sms.body,
})
```

## Key Exports

### Sender Management
- `createDomain()`, `listDomains()`, `verifyDomainWithResend()`
- `createSenderAddress()`, `getSenderForNotification()`
- `upsertNotificationRouting()`, `listNotificationRouting()`

### Templates
- `createTemplate()`, `updateTemplate()`, `getTemplate()`
- `renderEmailTemplate()`, `previewTemplate()`
- `seedDefaultTemplates()`, `resetToDefault()`

### Queue
- `createQueueEntry()`, `claimScheduledEntries()`
- `markAsSent()`, `markAsFailed()`, `scheduleRetry()`
- `getQueueStats()`, `getUpcomingScheduledCount()`

### Inbound
- `routeEmail()`, `handleSupportEmail()`, `handleReceiptEmail()`
- `findThreadByEmail()`, `addMessageToThread()`
- `parseTreasuryApproval()`, `extractReceiptData()`

### SMS
- `updateSmsSettings()`, `sendSms()`, `sendTestSms()`
- `renderSmsTemplate()`, `createSmsQueueEntry()`
- `addOptOut()`, `isOptedOut()`, `performComplianceChecks()`

### Onboarding
- `completeEmailSetup()`, `getEmailSetupStatus()`
- `verifyResendApiKey()`, `addOnboardingDomain()`
- `getRecommendedSenders()`, `configureNotificationRouting()`

### Processors
- `createProcessor()`, `createReviewProcessor()`
- `createRetryProcessor()`, `processTenantSmsQueue()`

## Notification Types

Supported notification types:
- `order_confirmation`, `order_shipped`, `order_delivered`
- `review_request`, `review_followup`
- `cart_abandoned`, `cart_recovered`
- `subscription_confirmation`, `subscription_renewal`
- `team_invitation`, `creator_payout`
- `support_ticket_received`, `support_ticket_resolved`

## License

MIT
