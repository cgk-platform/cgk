# Phase 2CM-SENDER-DNS Handoff Document

**Completed**: 2026-02-10
**Status**: COMPLETE

---

## Summary

Implemented email sender addresses and DNS configuration for multi-tenant email sending. This phase enables tenants to configure multiple sender email addresses with subdomain support, provides in-app DNS setup instructions, and handles domain verification via the Resend API.

---

## Completed Tasks

### Database Schema
- [x] Created `tenant_email_domains` table with indexes
- [x] Created `tenant_sender_addresses` table with indexes
- [x] Created `tenant_notification_routing` table with indexes
- [x] Migration file: `packages/db/src/migrations/tenant/009_email_sender.sql`

### Package Implementation (`packages/communications/src/sender/`)
- [x] `domains.ts` - CRUD for email domains
- [x] `addresses.ts` - Sender address management
- [x] `routing.ts` - Get sender for notification type, notification routing CRUD
- [x] `dns-instructions.ts` - Generate DNS setup steps
- [x] `verification.ts` - Resend domain verification wrapper
- [x] `index.ts` - Module exports

### Types (`packages/communications/src/types.ts`)
- [x] `NOTIFICATION_TYPES` - All notification types in the system
- [x] `DEFAULT_NOTIFICATION_ROUTING` - Maps notification types to purposes
- [x] `EmailDomain`, `SenderAddress`, `SenderAddressWithDomain` types
- [x] `NotificationRouting`, `NotificationRoutingWithSender` types
- [x] `VerificationStatus`, `SenderPurpose`, `NotificationChannel` types

### API Routes (`apps/admin/src/app/api/admin/settings/email/`)
- [x] `domains/route.ts` - GET list, POST add domain
- [x] `domains/[id]/route.ts` - GET, DELETE domain
- [x] `domains/[id]/verify/route.ts` - POST trigger verification
- [x] `domains/[id]/dns/route.ts` - GET DNS instructions
- [x] `addresses/route.ts` - GET list, POST add address
- [x] `addresses/[id]/route.ts` - GET, PATCH, DELETE address
- [x] `addresses/[id]/test/route.ts` - POST send test email
- [x] `routing/route.ts` - GET all routing rules
- [x] `routing/[type]/route.ts` - PATCH update routing for type

### UI Components (`apps/admin/src/app/admin/settings/email/`)
- [x] Main page with Domains & Routing tabs
- [x] `components/domain-list.tsx` - Domain list with verification status
- [x] `components/add-domain-modal.tsx` - Add domain with subdomain support
- [x] `components/dns-instructions-panel.tsx` - Step-by-step DNS setup
- [x] `components/sender-address-list.tsx` - Sender address list per domain
- [x] `components/add-sender-address-modal.tsx` - Add sender address form
- [x] `components/test-email-modal.tsx` - Send test email form
- [x] `components/routing-list.tsx` - Notification routing configuration
- [x] `domains/page.tsx` - Dedicated domains page
- [x] `senders/page.tsx` - All sender addresses view

### Integration
- [x] Added "Email" tab to settings layout
- [x] `getSenderForNotification()` function for sender resolution
- [x] Rate limiting on verification checks (5 minute cooldown)

---

## Key Files Created/Modified

### New Files
```
packages/db/src/migrations/tenant/009_email_sender.sql
packages/communications/src/types.ts (extended)
packages/communications/src/sender/domains.ts
packages/communications/src/sender/addresses.ts
packages/communications/src/sender/routing.ts
packages/communications/src/sender/dns-instructions.ts
packages/communications/src/sender/verification.ts
packages/communications/src/sender/index.ts
apps/admin/src/app/api/admin/settings/email/domains/route.ts
apps/admin/src/app/api/admin/settings/email/domains/[id]/route.ts
apps/admin/src/app/api/admin/settings/email/domains/[id]/verify/route.ts
apps/admin/src/app/api/admin/settings/email/domains/[id]/dns/route.ts
apps/admin/src/app/api/admin/settings/email/addresses/route.ts
apps/admin/src/app/api/admin/settings/email/addresses/[id]/route.ts
apps/admin/src/app/api/admin/settings/email/addresses/[id]/test/route.ts
apps/admin/src/app/api/admin/settings/email/routing/route.ts
apps/admin/src/app/api/admin/settings/email/routing/[type]/route.ts
apps/admin/src/app/admin/settings/email/components/domain-list.tsx
apps/admin/src/app/admin/settings/email/components/add-domain-modal.tsx
apps/admin/src/app/admin/settings/email/components/dns-instructions-panel.tsx
apps/admin/src/app/admin/settings/email/components/sender-address-list.tsx
apps/admin/src/app/admin/settings/email/components/add-sender-address-modal.tsx
apps/admin/src/app/admin/settings/email/components/test-email-modal.tsx
apps/admin/src/app/admin/settings/email/components/routing-list.tsx
apps/admin/src/app/admin/settings/email/domains/page.tsx
apps/admin/src/app/admin/settings/email/senders/page.tsx
```

### Modified Files
```
apps/admin/src/app/admin/settings/layout.tsx (added Email tab)
apps/admin/src/app/admin/settings/email/page.tsx (updated with new tabs)
packages/communications/src/index.ts (added sender exports)
packages/communications/package.json (added sender export path)
```

---

## Usage Examples

### Sender Resolution (Critical Pattern)
```typescript
import { getSenderForNotification, NOTIFICATION_TYPES } from '@cgk-platform/communications'
import { withTenant } from '@cgk-platform/db'

const result = await withTenant(tenantSlug, () =>
  getSenderForNotification(NOTIFICATION_TYPES.REVIEW_REQUEST)
)

if (result.success) {
  // Use result.sender.from for email "from" address
  await resend.emails.send({
    from: result.sender.from,
    to: recipientEmail,
    reply_to: result.sender.replyTo,
    // ...
  })
}
```

### Domain Management
```typescript
import { createDomain, verifyDomainWithResend, getResendConfig } from '@cgk-platform/communications'
import { withTenant } from '@cgk-platform/db'

// Create domain
const domain = await withTenant(tenantSlug, () =>
  createDomain({ domain: 'example.com', subdomain: 'mail' })
)

// Verify domain
const config = getResendConfig()
const result = await withTenant(tenantSlug, () =>
  verifyDomainWithResend(domain.id, config)
)
```

---

## Environment Variables Required

```bash
RESEND_API_KEY=re_xxxx  # Required for domain verification and email sending
```

---

## Known Issues / Notes

1. Pre-existing type errors in `packages/communications/src/queue/` files (not related to this phase)
2. The `verified_at` column update was simplified to avoid nested SQL template issues
3. Domain verification requires Resend API key to be configured

---

## Next Phase Dependencies

This phase enables:
- **PHASE-2CM-INBOUND-EMAIL**: Uses verified domains for inbound email handling
- **PHASE-2CM-RESEND-ONBOARDING**: Uses sender addresses for onboarding emails
- All email sending features: Uses `getSenderForNotification()` for sender resolution

---

## Definition of Done Checklist

- [x] Tenant can add/remove domains with subdomains
- [x] DNS instructions are clear and copy-pasteable
- [x] Domain verification works via Resend API
- [x] Sender addresses can be created per domain
- [x] Notification types are routable to different senders
- [x] Test emails can be sent from any verified sender
- [x] No hardcoded sender addresses in codebase
- [x] Type check passes for sender module (`pnpm --filter @cgk-platform/communications typecheck` - no sender-related errors)
