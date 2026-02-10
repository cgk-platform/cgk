# RAWDOG API Routes Mapping
**Generated**: 2025-02-10
**Coverage**: 1,032 API routes

---

## Source Codebase Path

**API Routes Location**: `/Users/holdenthemic/Documents/rawdog-web/src/app/api/`

All route paths in this document are relative to the RAWDOG codebase. Use full paths when referencing from the new project.

---

## Executive Summary

The RAWDOG codebase contains **1,032 API routes** organized across multiple functional domains:

| Category | Routes | Purpose |
|----------|--------|---------|
| Admin | 604 | Internal admin dashboard |
| Creator Portal | 60 | Creator contracts, projects, payments |
| Operations | 42 | System monitoring, debugging |
| Contractor Portal | 32 | Payment management, onboarding |
| Vendor Portal | 31 | Payment management, onboarding |
| Internal API (v1) | 30 | Videos, folders, internal data |
| Analytics | 29 | Metrics, reporting, insights |
| E-Signature | 22 | Document signing |
| Cron Jobs | 21 | Scheduled background tasks |
| Scheduling | 19 | Calendar, bookings |
| Webhooks | 14 | Third-party integrations |
| Other | 130+ | Slack, Meta Ads, Google Ads, etc. |

---

## Authentication Methods

| Method | Routes | Purpose |
|--------|--------|---------|
| **Clerk JWT** | 800+ | Admin, creator portal, video API |
| **Session-based** | 60 | Creator portal contracts/projects |
| **Magic Links** | 70 | Contractor/vendor onboarding |
| **Token-based** | 30 | E-signature public signing |
| **Secret Keys** | 50 | Cron jobs, webhooks, ops |
| **Signature Verification** | 20 | Webhook handlers (HMAC) |
| **Public/No Auth** | 50+ | Discount validation, health checks |
| **OAuth** | 40+ | Meta, Google, Slack, Stripe Connect |
| **Debug Bypass** | All | Localhost with `DEBUG_BYPASS_AUTH=true` |

---

## Admin Routes (`/api/admin/*`) - 604 Routes

### Commerce
| Route Pattern | Methods | Purpose |
|--------------|---------|---------|
| `/api/admin/orders` | GET, POST | List orders, create draft |
| `/api/admin/orders/[id]` | GET, PATCH, DELETE | Order details, update, cancel |
| `/api/admin/orders/[id]/tags` | POST, DELETE | Order tagging |
| `/api/admin/orders/[id]/refunds` | POST | Process refund |
| `/api/admin/customers` | GET | Customer search with LTV |
| `/api/admin/customers/[id]` | GET, PATCH | Customer details |
| `/api/admin/subscriptions` | GET | List subscriptions |
| `/api/admin/subscriptions/[id]` | GET, PUT | Subscription management |

### A/B Testing
| Route Pattern | Methods | Purpose |
|--------------|---------|---------|
| `/api/admin/ab-tests` | GET, POST | List/create tests |
| `/api/admin/ab-tests/[id]` | GET, PATCH, DELETE | Test management |
| `/api/admin/ab-tests/[id]/results` | GET | Statistical analysis |
| `/api/admin/ab-tests/[id]/variants` | GET, POST | Variant management |
| `/api/admin/ab-tests/bootstrap-analysis` | GET | Bootstrap stats |
| `/api/admin/ab-tests/cuped-analysis` | GET | CUPED analysis |

### Attribution
| Route Pattern | Methods | Purpose |
|--------------|---------|---------|
| `/api/admin/attribution` | GET | Overview metrics |
| `/api/admin/attribution/channels` | GET | Channel breakdown |
| `/api/admin/attribution/channels/by-level` | GET | By campaign/adset/ad |
| `/api/admin/attribution/journeys` | GET | Customer journeys |
| `/api/admin/attribution/model-comparison` | GET | Model comparison |
| `/api/admin/attribution/cohorts` | GET | Cohort analysis |
| `/api/admin/attribution/export` | GET | CSV export |

### Content
| Route Pattern | Methods | Purpose |
|--------------|---------|---------|
| `/api/admin/blog` | GET, POST | Blog posts |
| `/api/admin/blog/[id]` | GET, PATCH, DELETE | Post management |
| `/api/admin/blog/import` | POST | Import pending posts |
| `/api/admin/landing-pages` | GET, POST | Landing pages |
| `/api/admin/landing-pages/[id]` | GET, PATCH, DELETE | Page management |
| `/api/admin/landing-pages/[id]/publish` | POST | Publish page |

### Creators
| Route Pattern | Methods | Purpose |
|--------------|---------|---------|
| `/api/admin/creators` | GET, POST | Creator directory |
| `/api/admin/creators/[id]` | GET, PATCH, DELETE | Creator management |
| `/api/admin/creators/applications` | GET | Pending applications |
| `/api/admin/commissions` | GET, POST | Commission tracking |

### Finance
| Route Pattern | Methods | Purpose |
|--------------|---------|---------|
| `/api/admin/creator-payments` | GET, POST | Payout management |
| `/api/admin/treasury` | GET, POST | Cash management |
| `/api/admin/expenses` | GET, POST | Expense tracking |
| `/api/admin/tax/1099s` | GET, POST | 1099 management |

### Integrations
| Route Pattern | Methods | Purpose |
|--------------|---------|---------|
| `/api/admin/meta-ads/*` | Various | Meta Ads integration |
| `/api/admin/google-ads/*` | Various | Google Ads integration |
| `/api/admin/tiktok/*` | Various | TikTok integration |
| `/api/admin/shopify/*` | Various | Shopify integration |
| `/api/admin/klaviyo/*` | Various | Klaviyo integration |
| `/api/admin/yotpo/*` | Various | Yotpo integration |

### BRI AI Agent
| Route Pattern | Methods | Purpose |
|--------------|---------|---------|
| `/api/admin/bri` | GET | Agent status |
| `/api/admin/bri/conversations` | GET | Conversation history |
| `/api/admin/bri/personality` | GET, POST | Personality config |
| `/api/admin/bri/training` | GET, POST | Training materials |
| `/api/admin/bri/team-memories` | GET, POST | Shared memories |

---

## Creator Portal (`/api/creator/*`) - 60 Routes

| Route Pattern | Methods | Purpose | Auth |
|--------------|---------|---------|------|
| `/api/creator/contracts` | GET | List contracts | Session |
| `/api/creator/contracts/[id]/sign` | POST | Sign contract | Session |
| `/api/creator/projects` | GET | Active projects | Session |
| `/api/creator/projects/[id]/submit` | POST | Submit work | Session |
| `/api/creator/payments/balance` | GET | Account balance | Session |
| `/api/creator/payments/connect/oauth` | POST | Start Stripe Connect | Session |
| `/api/creator/messages` | GET, POST | Messaging | Session |
| `/api/creator/notifications` | GET | Notifications | Session |
| `/api/creator/settings/profile` | GET, PATCH | Profile | Session |
| `/api/creator/tax/forms` | GET | 1099 forms | Session |

---

## Contractor & Vendor Portals - 32 + 31 Routes

### Auth Routes
| Route Pattern | Methods | Purpose |
|--------------|---------|---------|
| `/api/contractor/auth/signup` | POST | Create account |
| `/api/contractor/auth/signin` | POST | Login |
| `/api/contractor/auth/magic-link` | POST | Request magic link |
| `/api/contractor/auth/reset-password` | POST | Password reset |

### Payment Routes
| Route Pattern | Methods | Purpose |
|--------------|---------|---------|
| `/api/contractor/payments/balance` | GET | Account balance |
| `/api/contractor/payments/methods` | GET | Payment methods |
| `/api/contractor/payments/connect/oauth` | POST | Stripe Connect |
| `/api/contractor/payments/withdraw` | POST | Request withdrawal |
| `/api/contractor/payments/transactions` | GET | Payment history |

---

## Operations (`/api/ops/*`) - 42 Routes

| Route Pattern | Methods | Purpose |
|--------------|---------|---------|
| `/api/ops/health` | GET | System health (public) |
| `/api/ops/health/[component]` | GET | Component health |
| `/api/ops/errors` | GET | Error tracking |
| `/api/ops/logs` | GET | System logs |
| `/api/ops/log-drain` | POST | Log ingest |
| `/api/ops/performance` | GET | Performance metrics |
| `/api/ops/alerts` | GET | Active alerts |
| `/api/ops/recalculate-attribution` | POST | Recalculate |
| `/api/ops/backfill-attribution` | POST | Backfill data |

---

## Webhooks (`/api/webhooks/*`) - 14 Routes

| Route Pattern | Events | Verification |
|--------------|--------|--------------|
| `/api/webhooks/shopify/orders` | orders/create, updated, cancelled | HMAC-SHA256 |
| `/api/webhooks/shopify/checkouts` | checkout.created, updated | HMAC-SHA256 |
| `/api/webhooks/shopify/customers` | customer.created, updated | HMAC-SHA256 |
| `/api/webhooks/stripe-connect` | account.updated, charges.*, payouts.* | Stripe signature |
| `/api/webhooks/resend` | email events | Resend signature |
| `/api/webhooks/retell` | call.ended, SMS callbacks | API key |
| `/api/webhooks/mux` | video.ready, error, deleted | Mux signature |
| `/api/webhooks/github` | push, pull_request | HMAC-SHA256 |

---

## Cron Jobs (`/api/cron/*`) - 21 Routes

| Route Pattern | Schedule | Purpose |
|--------------|----------|---------|
| `/api/cron/sync-orders` | Various | Sync Shopify orders |
| `/api/cron/sync-subscriptions` | Daily | Sync subscription data |
| `/api/cron/sync-meta-ads` | Daily | Sync Meta campaigns |
| `/api/cron/sync-google-ads` | Daily | Sync Google Ads |
| `/api/cron/ab-test-metrics` | Hourly | Calculate test metrics |
| `/api/cron/ab-test-scheduler` | 5 min | Process test actions |
| `/api/cron/aggregate-metrics` | Daily | Aggregate daily metrics |
| `/api/cron/refresh-google-tokens` | Daily | Refresh OAuth tokens |

**Auth**: Secret key via Vercel Cron Auth header

---

## Public Routes (No Auth)

| Route Pattern | Methods | Purpose |
|--------------|---------|---------|
| `/api/discount/[code]` | GET | Validate discount code |
| `/api/ab-tests/active` | GET | Active tests |
| `/api/ab-tests/flags/evaluate` | GET | Feature flag evaluation |
| `/api/ab-visitors` | POST | Visitor tracking |
| `/api/ab-events` | POST | Event tracking |
| `/api/v1/public/videos/[id]` | GET | Public video viewing |
| `/api/cart` | GET, POST | Cart operations |
| `/api/yotpo/*` | Various | Review voting |

---

## Route Export Patterns

### Cache Busting (Admin Routes)
```typescript
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
```

### Standard Response
```typescript
{
  success: boolean,
  data: T,
  error?: string,
  pagination?: { page, limit, total, hasMore }
}
```

### Pagination
- Query: `?page=1&limit=50`
- Default: 50, Max: 100

### Filtering
- Date: `?start=2024-01-01&end=2024-12-31`
- Status: `?status=active`
- Search: `?search=term`
- Sort: `?sort=created_at&order=desc`

---

## Key Auth Files

- `/src/middleware.ts` - Route protection
- `/src/lib/auth/debug.ts` - Debug mode bypass
- `/src/lib/creator-portal/session.ts` - Creator session auth
- `/src/lib/payees/magic-links.ts` - Magic links
