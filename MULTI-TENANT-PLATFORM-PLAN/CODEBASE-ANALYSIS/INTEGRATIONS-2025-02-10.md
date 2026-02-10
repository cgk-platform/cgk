# RAWDOG Third-Party Integrations
**Generated**: 2025-02-10
**Updated**: 2026-02-10 (Gap remediation - added missing integrations)
**Coverage**: 29+ integrations

---

## Source Codebase Path

**RAWDOG Root**: `/Users/holdenthemic/Documents/rawdog-web/`
**Integration Files**: `/Users/holdenthemic/Documents/rawdog-web/src/lib/*/` (per-feature)

All file paths in this document are relative to the RAWDOG root. Use full paths when referencing from the new project.

---

## Executive Summary

The RAWDOG codebase integrates with **29+ major third-party services** across ecommerce, payments, advertising, communications, and infrastructure. Integrations follow consistent patterns: credentials stored in database (preferred) with environment variable fallback.

### Integration Categories Summary

| Category | Count | Examples |
|----------|-------|----------|
| E-Commerce & Payments | 5 | Shopify, Stripe, Wise, Plaid, PayPal |
| Advertising & Attribution | 4 | Meta Ads, Google Ads, TikTok Ads, GA4 |
| Communications | 5 | Resend, Retell, ElevenLabs, Slack, Lob |
| Content & Media | 4 | Mux, AssemblyAI, Google Drive, Google Calendar |
| Marketing & Reviews | 3 | Klaviyo, Yotpo, Fairing |
| Monitoring & Analytics | 3 | Sentry, Better Stack, Microsoft Clarity |
| AI Services | 2 | Anthropic, OpenAI |
| Infrastructure | 3 | Vercel, Upstash, Trigger.dev |

**Note**: E-Sign system is **custom-built** (not DocuSign/HelloSign).

---

## 1. Shopify Integration

**Status**: Primary ecommerce platform
**Auth**: OAuth + API Tokens (v2025-01)
**Scope**: 40+ Admin API scopes, Storefront API

### Key Files
- `/src/lib/shopify/credentials.ts` - Credential management
- `/src/lib/shopify/db/schema.ts` - Database schema
- `/src/lib/shopify-admin.ts` - Admin client
- `/src/lib/shopify-cart.ts` - Cart operations

### Webhook Handlers
- `/src/app/api/webhooks/shopify/orders/route.ts` - Orders (1,788 lines)
- `/src/app/api/webhooks/shopify/checkouts/route.ts` - Checkouts
- `/src/app/api/webhooks/shopify/customers/route.ts` - Customers

### Data Flows
1. **Order Sync**: Webhook → DB → A/B Attribution → Pixel Events
2. **Customer Sync**: Order → Customers table
3. **Gift Cards**: Fulfillment → Gift card processing
4. **Review Emails**: Fulfillment → Review queue

---

## 2. Stripe Payments

**Status**: Primary payment processor
**Auth**: API Keys (Secret Key)

### Connection Types
1. **Standard Charges**: Subscription processing
2. **Stripe Connect**: Vendor/contractor payouts
   - Custom accounts with hosted onboarding
   - Requirements management (KYC/KYB)

### Key Files
- `/src/lib/creator-portal/stripe-connect.ts` - Creator Connect
- `/src/lib/payments/stripe-connect.ts` - Payee Connect
- `/src/app/api/webhooks/stripe-connect/route.ts` - Webhooks

### OAuth Flows
- `/api/creator/payments/connect/oauth/` + callback
- `/api/vendor/payments/connect/oauth/` + callback
- `/api/contractor/payments/connect/oauth/` + callback

---

## 3. Meta Conversions API (CAPI)

**Status**: Server-side event tracking
**Auth**: Access Token (graph.facebook.com v21.0)

### Key Files
- `/src/lib/meta/capi.ts` - CAPI client
- `/src/lib/meta-session-stitching.ts` - Session stitching

### Session Stitching Data
- `fbp` - Facebook Pixel ID
- `fbc` - Facebook Click ID
- `external_id` - Hashed customer ID

### Events
- **Purchase** - With advanced matching
- **Subscribe** - Subscription orders
- **Refund** - With email fallback

---

## 4. Google Ads

**Status**: Attribution and ROAS
**Auth**: OAuth (Google Ads API)

### Key Files
- `/src/lib/google-ads/client/` - API client
- `/src/lib/google-ads/oauth/` - OAuth handling
- `/src/lib/google-ads/sync/` - Data sync

### Features
- Campaign performance queries (GAQL)
- ROI calculation
- Spend syncing

---

## 5. TikTok Ads

**Status**: Pixel + Events API + Attribution
**Auth**: OAuth + Pixel Token

### Key Files
- `/src/lib/attribution/tiktok/credentials.ts` - Credentials
- `/src/lib/attribution/tiktok/oauth.ts` - OAuth
- `/src/lib/tiktok/events-api.ts` - Events API

### Features
- TikTok pixel (client-side)
- Events API (server-side)
- Automatic token refresh

---

## 6. Google Analytics 4 (GA4)

**Status**: Web analytics + revenue tracking
**Auth**: API Key (NEXT_PUBLIC_GA4_MEASUREMENT_ID)

### Key Files
- `/src/lib/ga4/measurement-protocol.ts` - Measurement Protocol
- `/src/lib/ga4/constants.ts` - Product variant mapping

### Events
- **Purchase** - Standard ecommerce
- **Subscribe** - Custom subscription event
- **Refund** - With transaction ID

---

## 7. Resend Email

**Status**: Primary email service
**Auth**: API Key

### Key Files
- `/src/app/api/webhooks/resend/inbound/route.ts` - Inbound webhook
- `/src/app/api/webhooks/resend-creator/route.ts` - Creator bounces

### Use Cases
- Review email campaigns
- Creator notifications
- Subscription templates
- Bounce handling

---

## 8. Retell.AI

**Status**: Voice + SMS platform
**Auth**: API Key
**SDK**: retell-sdk v4.66.0

### Key Files
- `/src/lib/retell/index.ts` - Main client
- `/src/lib/retell/sms.ts` - SMS module
- `/src/app/api/webhooks/retell/route.ts` - Webhooks

### Features
1. **Voice Agents** - AI phone calls
2. **SMS** - Chat-based messaging
3. **Webhooks** - Call/SMS events

---

## 9. Mux Video

**Status**: Video hosting/streaming
**Auth**: Token ID + Token Secret
**SDK**: @mux/mux-node v9.0.1

### Key Files
- `/src/lib/video/services/mux/client.ts` - Client
- `/src/app/api/v1/webhooks/mux/route.ts` - Webhooks

### Features
- Asset upload
- Live streaming
- Playback tracking

---

## 10. AssemblyAI

**Status**: Video/audio transcription
**Auth**: API Key

### Key Files
- `/src/lib/video/services/transcription/assemblyai.ts` - Service
- `/src/app/api/v1/webhooks/assemblyai/route.ts` - Webhooks

---

## 11. Yotpo Reviews

**Status**: UGC and review management
**Auth**: App Key + API Secret

### Key Files
- `/src/lib/yotpo/credentials.ts` - Credentials
- `/src/components/yotpo/` - Display components

### Features
- Product reviews display
- Star ratings
- Product mapping (cleanser, moisturizer, eye-cream, bundle)

---

## 12. Klaviyo

**Status**: Email marketing + SMS
**Auth**: Private API Key + Public API Key

### Key Files
- `/src/lib/klaviyo/credentials.ts` - Credentials
- `/src/lib/smart-inbox/klaviyo-consent.ts` - GDPR consent

### Features
- SMS/email list management
- Customer profile syncing
- GDPR consent tracking

---

## 13. Slack

**Status**: Internal notifications
**Auth**: Bot Token (xoxb-)
**SDK**: @slack/web-api v7.13.0

### Key Files
- `/src/lib/slack/notifications.ts` - Client
- `/src/lib/slack/ai/` - AI agents in Slack

---

## 14. Google Drive / Workspace

**Status**: File storage, DAM
**Auth**: OAuth

### Key Files
- `/src/lib/dam/gdrive/config.ts` - Config
- `/src/lib/dam/gdrive/webhooks.ts` - Webhooks
- `/src/trigger/dam-gdrive-sync.ts` - Sync task

---

## 15. Google Calendar

**Status**: Team scheduling
**Auth**: OAuth

### Key Files
- `/src/lib/bri/google/calendar.ts` - Client
- `/src/lib/scheduling/google-calendar.ts` - Scheduling

---

## 16. Google Search Console

**Status**: SEO monitoring
**Auth**: OAuth

### Key Files
- `/src/lib/seo/google-search-console.ts` - Client

---

## 17. Vercel Infrastructure

**Services**: Postgres, Blob storage, KV (Redis)

### Packages
- `@vercel/postgres` v0.10.0
- `@vercel/blob` v2.0.0
- `@vercel/kv` v3.0.0

---

## 18. Upstash Redis

**Status**: Rate limiting, caching
**Auth**: REST API

### Packages
- `@upstash/redis` v1.35.7
- `@upstash/ratelimit` v2.0.8

---

## 19. Anthropic / AI Services

**Packages**:
- `@ai-sdk/anthropic` v2.0.56
- `@anthropic-ai/sdk` v0.71.2

### Usage
- Brand context embeddings
- BRI AI agent

---

## 20. Fairing (Surveys)

**Status**: Customer surveys

### Key Files
- `/src/lib/fairing/client/`
- `/src/lib/fairing/sync/`

---

## 21. Trigger.dev

**Status**: Background jobs (v4 SDK)
**Package**: `@trigger.dev/sdk` v4.3.2

---

## 22. ElevenLabs (11Labs)

**Status**: Text-to-Speech for BRI AI
**Auth**: API Key (`ELEVENLABS_API_KEY`)
**API**: `https://api.elevenlabs.io/v1/`

### Key Files
- `/src/lib/bri/voice/tts-models.ts` - Model fetching
- `/src/lib/bri/voice/voices.ts` - Voice management
- `/src/lib/bri/voice/defaults.ts` - Default configuration
- `/src/app/api/bri/voice/tts/route.ts` - TTS API endpoint
- `/src/app/api/admin/bri/voices/clone/route.ts` - Voice cloning

### Features
- Text-to-speech synthesis for AI assistant
- Voice model listing and selection
- Voice cloning capability
- Cached model info (24-hour TTL)

---

## 23. Lob

**Status**: Physical mail delivery
**Auth**: API Key (`LOB_API_KEY`, `LOB_WEBHOOK_SECRET`)
**API**: `https://api.lob.com/v1/`

### Key Files
- `/src/app/api/webhooks/lob/route.ts` - Webhook handler
- `/src/lib/creator-portal/tax.ts` - Tax form mail tracking

### Webhook Events
- `letter.mailed` - Entered USPS mail stream
- `letter.in_transit` - Letter in transit
- `letter.in_local_area` - In local delivery area
- `letter.processed_for_delivery` - Ready for delivery
- `letter.delivered` - Delivered (certified mail)
- `letter.returned_to_sender` - Returned

### Use Cases
- Sending tax forms (W-9, 1099) to creators
- Physical mail tracking for compliance

---

## 24. Plaid

**Status**: Bank account verification
**Auth**: API Keys (`PLAID_CLIENT_ID`, `PLAID_SECRET`)
**API**: Environment-based (sandbox/development/production)

### Key Files
- `/src/lib/creator-portal/plaid.ts` - Full client implementation
- `/src/app/api/v1/creator-portal/payments/methods/bank-account/route.ts` - API route

### Environments
- Sandbox: `https://sandbox.plaid.com`
- Development: `https://development.plaid.com`
- Production: `https://production.plaid.com`

### Features
- Link token creation for Plaid Link
- Public token exchange for access token
- Bank account/routing number retrieval
- Institution lookup
- Item (bank connection) management
- Webhook handling for account updates

### Data Flow
1. Create Link token → User completes Plaid Link
2. Exchange public token for access token
3. Retrieve account/routing numbers (stored encrypted)
4. Use for ACH payouts via Stripe or direct

---

## 25. PayPal

**Status**: Alternative payout method
**Auth**: OAuth (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`)
**API**: Environment-based (sandbox/live)

### Key Files
- `/src/lib/creator-portal/paypal.ts` - Full client implementation
- `/src/app/api/v1/creator-portal/payments/methods/paypal/route.ts` - API route

### Environments
- Sandbox: `https://api-m.sandbox.paypal.com`
- Live: `https://api-m.paypal.com`

### Features
- OAuth token management (cached, auto-refresh)
- Batch payouts to email addresses
- Payout status tracking
- Email verification via micro-payout ($0.01)
- Webhook handling for payout events

### Webhook Events
- `PAYMENT.PAYOUTSBATCH.SUCCESS` - Batch completed
- `PAYMENT.PAYOUTSBATCH.DENIED` - Batch denied
- `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` - Item paid
- `PAYMENT.PAYOUTS-ITEM.UNCLAIMED` - Recipient hasn't claimed
- `PAYMENT.PAYOUTS-ITEM.CANCELED` - Item cancelled

### Fee Structure
- 2% of payout amount, max $20 per payout

---

## 26. Microsoft Clarity

**Status**: Behavioral analytics & session recording
**Auth**: Project ID (client-side only)
**SDK**: Native JavaScript (loaded in layout.tsx)

### Key Files
- `/src/lib/clarity.ts` - Client utilities
- `/src/components/ClarityTracker.tsx` - React component

### Features
- Session recording
- Heatmaps
- Custom event tracking
- User identification
- Session upgrading (priority recording)
- Cookie consent management

### Ecommerce Events
- `product_view` - Product page views
- `add_to_cart` - Cart additions
- `remove_from_cart` - Cart removals
- `view_cart` - Cart views
- `begin_checkout` - Checkout initiation
- `purchase` - Order completion

---

## 27. Better Stack (Uptime Monitoring)

**Status**: External uptime monitoring
**Auth**: API Key + Webhook Secret (`BETTER_STACK_WEBHOOK_SECRET`)
**SDK**: Custom webhook handler

### Key Files
- `/src/lib/ops/uptime/better-stack.ts` - Webhook processing
- `/src/lib/ops/uptime/index.ts` - Uptime utilities
- `/src/app/api/ops/uptime/webhook/route.ts` - Webhook endpoint

### Webhook Events
- `incident.started` - Monitor down
- `incident.acknowledged` - Incident acknowledged
- `incident.resolved` - Monitor recovered
- `heartbeat.missing` - Heartbeat missed
- `heartbeat.recovered` - Heartbeat resumed

### Database Tables
- `ops_uptime_incidents` - Incident tracking with downtime calculation

### Features
- Incident lifecycle tracking
- Downtime calculation
- Uptime percentage stats (24h, 7d, 30d)
- Alert creation for incidents
- HMAC webhook signature verification

---

## 28. Sentry

**Status**: Error tracking & performance monitoring
**Auth**: DSN (`NEXT_PUBLIC_SENTRY_DSN`)
**SDK**: `@sentry/nextjs`

### Key Files
- `/src/lib/sentry/index.ts` - Utility wrappers
- `/src/instrumentation.ts` - Next.js instrumentation
- `sentry.client.config.ts` - Client configuration
- `sentry.server.config.ts` - Server configuration
- `sentry.edge.config.ts` - Edge configuration

### Features
- Error capture with ops dashboard sync
- User context setting
- Breadcrumb logging
- Performance transactions
- Wrapped async functions with error capture

### Integration with Ops Dashboard
- Errors synced to `ops_errors` table
- Sentry event ID stored in metadata
- Dual logging (Sentry + local DB)

---

## 29. E-Sign (Custom Built)

**Status**: Native platform e-signature system
**Note**: NOT using DocuSign or other external providers

### Key Files
- `/src/app/sign/[token]/page.tsx` - Signing interface
- `/src/components/esign/SignatureCapture.tsx` - Signature pad
- `/src/components/esign/ReviewModal.tsx` - Document review
- `/src/lib/esign/` - E-sign utilities

### Features
- PDF document rendering
- Field placement (signature, initials, text, date, checkbox)
- Signature capture (draw/type)
- Multi-signer support
- In-person signing mode
- Email delivery via Resend
- Template system

---

## Credential Storage Patterns

### Pattern 1: Database-First (Preferred)
Used by: Shopify, Yotpo, Klaviyo, TikTok

```typescript
// Priority:
1. Database table (encrypted tokens)
2. Environment variables (deprecated)
3. Return null if not configured

// Cache: 60 seconds
```

### Pattern 2: Environment Variables
Used by: Stripe, Meta CAPI, GA4, Resend, Retell, Mux

### Pattern 3: OAuth with Token Refresh
Used by: TikTok, Google Ads, Google Calendar, Google Drive

```typescript
// Token refresh 5 minutes before expiry
// Automatic persistence to database
```

---

## Environment Variables Reference

### Core
- `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY`
- `META_PIXEL_ID` / `META_CAPI_ACCESS_TOKEN`
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID`

### Integrations
- `KLAVIYO_PRIVATE_API_KEY` / `NEXT_PUBLIC_KLAVIYO_PUBLIC_API_KEY`
- `YOTPO_APP_KEY` / `YOTPO_API_SECRET`
- `TIKTOK_PIXEL_ID` / `TIKTOK_EVENTS_API_ACCESS_TOKEN`
- `RESEND_API_KEY` / `RESEND_FULL_ACCESS_API_KEY`
- `RETELL_API_KEY`
- `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET`
- `ASSEMBLYAI_API_KEY`

### Infrastructure
- `POSTGRES_URL`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- `SLACK_BOT_TOKEN`

---

## Security Notes

1. **Encryption**: OAuth tokens stored encrypted in database
2. **HMAC Verification**: All webhooks use signature verification
3. **PII Handling**: Meta CAPI hashes all PII with SHA256
4. **Secret Separation**: API keys server-side only
