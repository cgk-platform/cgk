# Multi-Tenant E-Commerce Platform - Master Plan

> **START HERE**: This is the primary planning document. Agents should read this first, then PROMPT.md for implementation context, then the relevant PHASE-*.md document.

---

## Source Codebase Reference

**IMPORTANT**: The new multi-tenant platform will be a NEW project in a SEPARATE directory. All planning docs and reference code are in the RAWDOG codebase.

### Planning Documentation Location

```
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/
```

| Document | Full Path |
|----------|-----------|
| This file (PLAN.md) | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PLAN.md` |
| Agent context (PROMPT.md) | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PROMPT.md` |
| Architecture | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/ARCHITECTURE.md` |
| Phase docs | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PHASE-*.md` |
| Codebase analysis | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/` |

### RAWDOG Source Code (Reference)

```
/Users/holdenthemic/Documents/rawdog-web/
```

| Reference Type | Full Path |
|----------------|-----------|
| Source code | `/Users/holdenthemic/Documents/rawdog-web/src/` |
| Trigger.dev tasks (199) | `/Users/holdenthemic/Documents/rawdog-web/src/trigger/` |
| API routes (1,032) | `/Users/holdenthemic/Documents/rawdog-web/src/app/api/` |
| Admin pages (60+) | `/Users/holdenthemic/Documents/rawdog-web/src/app/admin/` |
| Components (465) | `/Users/holdenthemic/Documents/rawdog-web/src/components/` |
| Libraries | `/Users/holdenthemic/Documents/rawdog-web/src/lib/` |

### How Agents Access From New Project

When working in the new project, use full paths to read planning docs or reference code:
```
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PHASE-1-FOUNDATION.md"
Read file_path="/Users/holdenthemic/Documents/rawdog-web/src/trigger/payment-automation.ts"
```

## Executive Summary

This document outlines the comprehensive plan to rebuild the RAWDOG platform as a **multi-tenant, white-labeled e-commerce orchestration system** that can power multiple brands while remaining easily separable for brand sales/transfers.

**Key Design Principle**: This platform is built to be **portable, installable, and open-source ready** from day one:
- Clone and deploy in under an hour
- Platform updates don't break customizations
- AI-first documentation for coding assistants
- Same codebase scales from 1 to 1000+ tenants

See [PORTABILITY-ARCHITECTURE.md](./PORTABILITY-ARCHITECTURE.md) for the distribution strategy.

### Portability Requirements (ALL Agents Must Follow)

Every infrastructure component must be **easy for installing users to set up**:

| Requirement | What It Means |
|-------------|---------------|
| **CLI-First** | `npx @cgk/cli setup:[component]` should handle setup |
| **Minimal Web Config** | Only API keys from web dashboards, everything else via CLI/env |
| **< 15 Min Setup** | Each component should take < 15 minutes to configure |
| **Clear Docs** | Every component needs a `docs/setup/[COMPONENT].md` guide |
| **Verification** | CLI should verify the setup works before proceeding |

**For every infrastructure decision, agents must**:
1. Document how users will set it up
2. Prefer solutions with good CLI tooling
3. Create setup documentation
4. Add CLI setup command to `@cgk/cli`

See each phase doc for component-specific portability requirements.

### Current State Analysis
- **Platform**: Next.js 16 on Vercel + Neon PostgreSQL + Upstash Redis
- **Monthly Cost**: $500-600/month (Vercel compute, Neon, Upstash, Trigger.dev)
- **Pain Points**: Single-tenant architecture, no brand separation, complex cloning, Stripe payout delays, Trigger.dev limitations, SSE-based MCP

### Target State
- **Architecture**: Multi-tenant orchestrator + white-labeled admin portals + independent storefronts
- **Cost Target**: 40-60% reduction through consolidation and smarter resource allocation
- **Key Features**: Brand divorceability, shared codebase updates, independent data isolation

### Tech Stack (Target Versions - February 2026)

**IMPORTANT**: Agents must use these versions when implementing. Updated Feb 2026.

| Technology | Version | Notes |
|------------|---------|-------|
| **Node.js** | >=22.0.0 (LTS) | Node 22 "Jod" is Active LTS |
| **pnpm** | 10.29.x | Major upgrade from v9 |
| **TypeScript** | ^5.9.0 | Latest stable |
| **React** | ^19.0.0 | React 19.2 is stable |
| **Next.js** | ^16.1.0 | Next.js 16.1 LTS with Turbopack stable |
| **Tailwind CSS** | ^4.0.0 | Major rewrite - 5x faster builds |
| **Turborepo** | ^2.8.3 | Latest stable |
| **PostgreSQL** | 17 or 18 | Via Neon (supports up to PG18) |
| **Redis** | 8.x | Via Upstash |

**Key Dependencies**:
| Package | Version | Notes |
|---------|---------|-------|
| `@shopify/shopify-api` | ^12.3.0 | REST IDs now strings |
| `stripe` | ^17.0.0 | Latest stable |
| `radix-ui` | ^1.0.0 | Unified package (not @radix-ui/*) |
| `@modelcontextprotocol/sdk` | ^1.0.0 | MCP Nov 2025 spec |
| `jose` | ^5.2.0 | JWT handling |

**shadcn/ui Notes** (Feb 2026):
- Use unified `radix-ui` package, not individual `@radix-ui/react-*`
- Full Base UI support alongside Radix
- RTL layout support built-in

---

## Why This Migration (Pain Points Addressed)

### 1. High Vercel Bills ($300-400/month)
**Problem**: Unpredictable compute costs, edge function overuse, inefficient caching
**Desired Outcome**:
- Consolidated deployments (one admin app, one storefront template)
- Background work moved off expensive compute
- Proper ISR and edge caching
- Aggressive Redis caching

### 2. Background Job Complexity
**Problem**:
- 199+ async workflows need reliable execution
- Separate processes add cognitive overhead
- Vendor lock-in concerns
- Cost efficiency at scale

**Desired Outcome**:
- Reliable background job execution for all async workflows
- Simple developer experience (ideally no separate worker)
- Event-driven architecture for webhooks, crons, on-demand tasks
- Vendor-agnostic abstraction layer (can swap providers)
- Cost-effective at scale

**Agent Discretion**: Choose the best solution (Inngest, Trigger.dev, Vercel Crons, QStash, or other) based on:
- Developer experience
- Reliability and retry handling
- Cost at projected volume
- Ease of tenant isolation

### 3. Single-Tenant Architecture
**Problem**: Can't serve multiple brands, no data isolation, complex cloning
**Solution**: Schema-per-tenant PostgreSQL + shared orchestrator

### 4. No Brand Separation
**Problem**: Hard to sell/transfer brands, all data intermingled
**Solution**: Each brand gets isolated schema, can export with `pg_dump`

### 5. SSE-Based MCP (Deprecated)
**Problem**: SSE deprecated in MCP protocol 2024-11-05
**Solution**: Streamable HTTP transport

---

## Codebase Analysis Reference

Before implementing, agents MUST review the codebase analysis in `./CODEBASE-ANALYSIS/`:

| Document | What It Covers |
|----------|----------------|
| `ANALYSIS-SUMMARY-2025-02-10.md` | Executive summary, key findings, gaps |
| `DATABASE-SCHEMA-2025-02-10.md` | 28 schema modules, 100+ tables |
| `AUTOMATIONS-TRIGGER-DEV-2025-02-10.md` | 199 background tasks to rebuild |
| `API-ROUTES-2025-02-10.md` | 1,032 routes with auth methods |
| `INTEGRATIONS-2025-02-10.md` | 29+ third-party services |
| `ADMIN-FEATURES-2025-02-10.md` | 60+ admin sections |
| `ENV-VARS-2025-02-10.md` | All environment variables |

**Key Metrics from Analysis**:
- **199 background tasks** → need reliable async execution
- **1,032 API routes** → need tenant context
- **100+ database tables** → schema-per-tenant migration
- **29+ integrations** → per-tenant credential storage

### Complete Integration List

The platform integrates with **29+ third-party services** across these categories:

**E-Commerce & Payments**:
- Shopify (headless commerce), Stripe (payments + Connect payouts), Wise (international payouts)
- Plaid (bank verification), PayPal (alternative payouts)

**Advertising & Attribution**:
- Meta Ads (CAPI), Google Ads (GAQL), TikTok Ads (Events API), GA4

**Communications**:
- Resend (email), Retell (voice AI + SMS), ElevenLabs (TTS)
- Slack (notifications), Lob (physical mail)

**Content & Media**:
- Mux (video hosting), AssemblyAI (transcription)
- Google Drive (DAM), Google Calendar (scheduling)

**Marketing & Reviews**:
- Klaviyo (email/SMS marketing), Yotpo (reviews), Fairing (surveys)

**Monitoring & Analytics**:
- Sentry (error tracking), Better Stack (uptime), Microsoft Clarity (session recording)

**AI Services**:
- Anthropic (Claude), OpenAI (GPT)

**E-Sign**: Custom-built platform (not DocuSign/HelloSign)

---

## Tenant Isolation (MANDATORY)

**CRITICAL**: All agents MUST read and follow [TENANT-ISOLATION.md](./TENANT-ISOLATION.md).

Every line of code must enforce tenant isolation:
- **Database**: Use `withTenant(tenantId, ...)` for all queries
- **Cache**: Use `createTenantCache(tenantId)` for all Redis operations
- **API Routes**: Call `getTenantContext(req)` first
- **Background Jobs**: Include `tenantId` in every event payload
- **File Storage**: Store under `tenants/{tenantId}/` path

**No exceptions. No shortcuts.**

---

## Expert Panel Consensus

### Panel Composition
1. **Platform Architect** (ex-Shopify) - Multi-tenant patterns, tenant isolation
2. **Frontend Lead** (ex-Vercel) - Headless commerce, performance optimization
3. **Backend Lead** (ex-Stripe) - Payment orchestration, financial systems
4. **Data Architect** (ex-Snowflake) - Database design, data isolation
5. **DevOps Lead** (ex-AWS) - Infrastructure, cost optimization
6. **Security Lead** (ex-Auth0) - Authentication, tenant isolation
7. **E-commerce Specialist** (ex-BigCommerce) - Commerce patterns, Shopify integration
8. **AI/ML Lead** (ex-Anthropic) - MCP design, AI workflows
9. **UX Lead** (ex-Figma) - Admin interfaces, white-labeling
10. **Growth Engineer** (ex-Segment) - Analytics, attribution, tracking

### Unanimous Recommendations

#### 1. Database Architecture: Schema-Per-Tenant (Hybrid)
**Decision**: Use PostgreSQL schema-per-tenant for core data isolation with shared lookup tables.

**Rationale**:
- Balance between full isolation and operational efficiency
- Each brand gets its own schema (`brand_rawdog`, `brand_clientx`)
- Shared `public` schema for: users, billing, platform config
- Easy data export for brand divorces (pg_dump single schema)
- No "noisy neighbor" issues in queries

```sql
-- Structure
public.organizations (id, slug, name, settings)
public.users (id, email, org_ids[])
brand_rawdog.orders (...)
brand_rawdog.customers (...)
brand_clientx.orders (...)
```

#### 2. Frontend Architecture: Monorepo with Deployable Units
**Decision**: Turborepo monorepo with three deployable packages.

```
/packages
  /ui              # Shared component library (Tailwind + shadcn/ui)
  /shopify-client  # Shopify GraphQL client
  /admin-core      # Admin portal components
  /creator-core    # Creator portal components
  /analytics       # Shared analytics utilities

/apps
  /orchestrator    # Central management (internal only)
  /admin           # White-labeled admin portal
  /storefront      # Headless storefront template
  /creator-portal  # Creator/contractor portal
```

#### 3. Storefront Strategy: Next.js (Keep, Don't Switch to Hydrogen)
**Decision**: Remain on Next.js for storefronts.

**Rationale**:
- Already invested in Next.js expertise
- Need non-Shopify features (creator portal, admin, MCP)
- Hydrogen locks you into Shopify's Oxygen hosting
- Next.js ISR + edge caching provides comparable performance
- Multi-tenant admin needs single codebase across brands

#### 4. Background Jobs: Reliable Async Execution
**Outcome Required**: 199+ background workflows execute reliably with proper retries, scheduling, and tenant isolation.

**Requirements**:
- Event-driven architecture (webhooks trigger jobs, crons run scheduled tasks)
- Retry handling with backoff for transient failures
- Step-based execution (resume from failure point, not restart)
- Tenant isolation in every job (tenantId required in all payloads)
- Good developer experience (minimal setup, easy debugging)
- Cost-effective at scale

**Agent Discretion**: Choose the best provider (or combination) based on evaluation:
- Inngest, Trigger.dev, Vercel Crons, Upstash QStash, BullMQ, etc.
- Consider: DX, reliability, cost, tenant isolation support
- Document your recommendation with reasoning

**Vendor-Agnostic Principle**: Regardless of choice, use an abstraction layer:
```typescript
// Abstract interface - provider can be swapped
interface BackgroundJobProvider {
  send(event: string, data: unknown): Promise<void>
  schedule(cron: string, handler: () => Promise<void>): void
}

// Implementation is agent's choice
class ChosenProvider implements BackgroundJobProvider { ... }
```

#### 5. Commerce Provider: Dual Checkout Architecture
**Decision**: Support both Shopify Headless (default) and Custom+Stripe checkout via feature flag.

**Why Dual Approach**:
- **Start with Shopify**: Quick setup, proven checkout, built-in payments
- **Migrate when ready**: Full control over checkout flow, lower transaction fees (Stripe direct vs Shopify Payments)
- **Per-tenant choice**: Some brands stay Shopify, others migrate to custom
- **Feature flag controlled**: Switch providers without code changes

**Implementation Strategy**:
- Unified `CommerceProvider` interface in `@cgk/commerce` package
- Shopify provider fully implemented from day one
- Custom provider interface ready, checkout flow deferred until needed
- All storefront components use the abstraction layer

See [COMMERCE-PROVIDER-SPEC-2025-02-10.md](./COMMERCE-PROVIDER-SPEC-2025-02-10.md) for full specification.

#### 6. Payouts: Hybrid Stripe + Wise Approach
**Decision**: Use Stripe Connect for domestic, Wise Business API for international.

**Rationale**:
- Stripe Connect: Best for US payouts (2-3 day settlement)
- Wise Business API: Better rates and speed for international (Brazil, EU)
- Wise BatchTransfer: Pay up to 1000 invoices at once
- Lower FX fees (Wise uses mid-market rates)

#### 7. MCP: Migrate to Streamable HTTP
**Decision**: Implement Streamable HTTP transport per latest MCP spec.

**Rationale**:
- SSE deprecated in protocol 2024-11-05
- Better bidirectional communication
- Simplified server implementation
- Enhanced security (per-request auth)
- Claude Connector compatibility

---

## Architecture Overview

### Tier 1: Central Orchestrator (Super Admin)
- Organization/brand management with onboarding wizard
- User access control across brands (with impersonation)
- Billing and subscription management
- Platform-wide analytics and metrics
- Codebase deployment orchestration
- **Cross-tenant operations monitoring** (errors, logs, health)
- **Feature flag management** (global and per-tenant)
- **Real-time alerting** with Slack/PagerDuty integration

See [SUPER-ADMIN-ARCHITECTURE-2025-02-10.md](./SUPER-ADMIN-ARCHITECTURE-2025-02-10.md) for full specification.

### Tier 2: Brand Admin Portals (White-labeled)
- Per-brand deployment with custom domain
- Isolated data via schema separation
- Shared codebase, brand-specific config
- Full feature parity with current RAWDOG admin

### Tier 3: Storefronts (Independent)
- Fully independent Next.js deployments
- **Dual Commerce Provider**: Shopify Headless (default) OR Custom+Stripe (self-hosted)
- Feature flag controlled provider switching per tenant
- Brand-specific theming via config
- Can be completely divorced and transferred

See [COMMERCE-PROVIDER-SPEC-2025-02-10.md](./COMMERCE-PROVIDER-SPEC-2025-02-10.md) for the dual checkout architecture.

### Tier 4: External User Portals (Creators, Contractors, Vendors)

Three types of external users, all sharing the **payee infrastructure**:

| Type | Portal | Primary Use | Multi-Brand |
|------|--------|-------------|-------------|
| **Creators** | `/creator/*` | Influencers with commission rates, discount codes | Yes (common) |
| **Contractors** | `/contractor/*` | Freelance project workers | Usually single |
| **Vendors** | `/vendor/*` | Service providers, agencies, suppliers | Usually single |

**Shared Infrastructure** (via Payee system):
- Payment methods (Stripe Connect, PayPal, Venmo, check)
- Balance tracking (pending, available, paid)
- Withdrawal requests
- Tax information (W-9, 1099)
- Notification preferences
- Magic link authentication

**Key Differences**:
- Creators: Have commission rates and discount codes per-brand
- Contractors: Project-based with deliverables tracking
- Vendors: Invoice submission for services rendered (no commissions)

See [PAYEE-TYPE-MODEL-SPEC.md](./PAYEE-TYPE-MODEL-SPEC.md) for complete comparison of all payee types.

### Creator Onboarding Flow

The platform includes a complete creator onboarding experience from public application through first project assignment.

**Application Form** (`/creator/join`):
| Step | Content | Validation |
|------|---------|------------|
| 1 - Basic Info | First name, last name, email, phone | All required |
| 2 - Social Media | Instagram, TikTok, YouTube, portfolio URL | Optional |
| 3 - Shipping Address | Full US address for product samples | All required |
| 4 - Content Interests | Checkboxes + configurable survey questions | Conditional |

**Key Features**:
- **Auto-save drafts**: Form progress saved after 1.5s of inactivity
- **Resume applications**: Return via email-based URL `/creator/join?resume={id}`
- **Configurable survey**: Admin-defined questions per tenant
- **Meta Pixel tracking**: Lead events for marketing attribution

**Teleprompter Tool** (`/creator/teleprompter`):
- Full-screen script display for video recording
- Auto-scroll with configurable speed (1-5)
- Font size adjustment (16-72px)
- Mirror mode for reflection setups
- Shot markers: `[SHOT: B-ROLL]`, `[SHOT: TALKING HEAD]`, `[SHOT: PRODUCT SHOT]`, `[SHOT: CTA]`
- Click-to-seek on any word
- Mobile gestures (tap to pause, swipe for speed)

**Welcome Call Scheduling** (`/creator/welcome-call`):
| Mode | Behavior |
|------|----------|
| `internal` | Uses platform's built-in scheduling system (PHASE-2SC) |
| `external` | Embeds or redirects to Cal.com/Calendly |
| `disabled` | Skips welcome call step entirely |

**Application Review**:
- Admin queue at `/admin/creators/applications`
- Approve/reject with automated notification emails
- Approved creators receive portal login credentials

See [PHASE-4A-CREATOR-ONBOARDING-FLOW.md](./phases/PHASE-4A-CREATOR-ONBOARDING-FLOW.md) for complete implementation details.

### Contractor-Specific Features (Project-Based)

Contractors are **project workers** with a structured workflow:

**Project Pipeline (6-Stage Kanban)**:
```
Upcoming → In Progress → Submitted → Revisions → Approved → Payouts
   │           │             │           │           │         │
   │           │             │           │           │         ├─ payout_approved
   │           │             │           │           │         ├─ withdrawal_requested
   │           │             │           │           │         └─ payout_ready
   │           │             │           └─ revision_requested
   │           │             └─ submitted (awaiting review)
   │           └─ in_progress (contractor working)
   └─ pending_contractor, draft (not started)
```

**Portal Pages**:
- `/contractor/projects` - 6-column Kanban board (primary view)
- `/contractor/payments` - Balance and withdrawal history
- `/contractor/request-payment` - Invoice/payment request form
- `/contractor/settings/payout-methods` - Stripe Connect, PayPal, Venmo, Check
- `/contractor/settings/payout-methods/stripe-setup` - Self-hosted Stripe onboarding
- `/contractor/settings/tax` - W-9 submission + 1099-NEC forms

**Invoice/Payment Request System**:
- Contractors submit invoices for completed work
- Admin reviews and approves (or rejects with feedback)
- Approved amount credited to contractor balance
- Contractor requests withdrawal when ready
- $10 minimum request, max 3 pending at once

**Admin Contractor Management**:
- Contractor directory at `/admin/contractors`
- Contractor detail with projects, payments, balance
- Project assignment workflow
- Payment request approval queue
- CSV export for reporting

**Payout Methods (4 Options)**:
| Method | Setup | Use Case |
|--------|-------|----------|
| Stripe Connect | Self-hosted onboarding form | Recommended for direct deposit |
| PayPal | Email entry | Alternative for PayPal users |
| Venmo | Handle entry | Popular for smaller amounts |
| Check | Mailing address | Legacy/preference |

See phase documents:
- [PHASE-4F-CONTRACTOR-PORTAL-CORE.md](./phases/PHASE-4F-CONTRACTOR-PORTAL-CORE.md) - Auth, Kanban, projects
- [PHASE-4F-CONTRACTOR-PAYMENTS.md](./phases/PHASE-4F-CONTRACTOR-PAYMENTS.md) - Payments, methods, tax
- [PHASE-4F-CONTRACTOR-ADMIN.md](./phases/PHASE-4F-CONTRACTOR-ADMIN.md) - Admin management

### Vendor-Specific Features (B2B)

Vendors are **business entities** rather than individuals, requiring additional features:

**Business Entity Support**:
- Business type selection: LLC, S-Corp, C-Corp, Partnership, Sole Proprietor, Other
- Company name (required for business entities)
- EIN vs SSN selection based on entity type
- W-9 with correct entity classification
- 1099-MISC form generation (not 1099-NEC)

**Payment Terms**:
| Term | Days Until Due | Use Case |
|------|---------------|----------|
| Due on Receipt | 0 | Immediate payment |
| Net 15 | 15 | Fast-paying relationships |
| Net 30 | 30 | Standard business terms |
| Net 45 | 45 | Extended terms |
| Net 60 | 60 | Large enterprise contracts |

- Per-vendor payment terms configuration
- Due date calculation from invoice submission
- Overdue invoice tracking with admin notifications
- Payment scheduling based on due dates

**Invoice Workflow**:
```
Invoice Submitted → Pending Review → Approved → Payment Created → Paid
                          ↓
                    Rejected (with reason) → Resubmit
```

**Admin Invoice Management**:
- Pending invoices queue at `/admin/vendors/invoices`
- Approve/reject actions with notes
- Direct payment creation from approved invoices
- Bulk approve for trusted vendors

See [PHASE-4E-VENDOR-MANAGEMENT.md](./phases/PHASE-4E-VENDOR-MANAGEMENT.md) for complete implementation details.

### Creator Admin Analytics

**CRITICAL**: Admins need visibility into creator program health, performance metrics, and operational analytics.

**Admin Analytics Dashboard** (`/admin/creators/analytics`):

| Metric Category | Key Metrics |
|-----------------|-------------|
| **Program Health** | Total creators, active rate, churn rate, avg lifetime value |
| **Application Funnel** | Applications received → approved → onboarded → active |
| **Performance Leaderboard** | Top earners, most productive, fastest delivery |
| **Earnings Analytics** | Total payouts, avg earnings, distribution |
| **Creator Health** | Champions, healthy, at-risk, inactive, churned |
| **Pipeline Analytics** | Value at risk, avg time per stage, throughput |

**Health Score Calculation** (0-100):
- Activity score (30%): Projects in last 30 days
- Earnings score (20%): Earnings trend direction
- Response score (20%): Average message response time
- Delivery score (20%): On-time delivery percentage
- Engagement score (10%): Portal activity level

**Creator Health Categories**:
- **Champions** (90+): Active, high earnings, on-time
- **Healthy** (70-89): Active, good performance
- **At Risk** (50-69): Declining activity or delays
- **Inactive** (30d): No activity in 30+ days
- **Churned** (90d): No activity in 90+ days

**Background Jobs**:
- Daily metrics aggregation (3 AM)
- Weekly creator summary (Sunday 6 AM)
- Monthly creator report (1st of month 4 AM)

**Database Tables**:
- `creator_response_metrics` - Daily per-creator activity metrics
- `creator_analytics_snapshots` - Daily/weekly/monthly aggregations

See [PHASE-4G-CREATOR-ADMIN-ANALYTICS.md](./phases/PHASE-4G-CREATOR-ADMIN-ANALYTICS.md) for complete implementation details.

### Creators Admin Complete System

**CRITICAL**: The platform provides comprehensive admin-side management for the creator program across multiple admin sections.

**Creator Admin Pages**:
```
/admin/creators
├── (directory)                  # Creator list with search, filters, bulk actions
├── /[id]                        # Creator detail (profile, stats, projects, payments)
│   └── /inbox                   # Per-creator messaging thread
├── /applications                # Application queue with review workflow
├── /communications              # Communications hub
│   ├── /queue                   # Email queue (pending, sent, failed)
│   ├── /settings                # Notification configuration per type
│   └── /templates               # Email template editor with variables
├── /inbox                       # Global creator inbox (all conversations)
└── /onboarding-settings         # Onboarding steps, reminders, welcome email

/admin/creator-pipeline          # Project pipeline kanban
├── Kanban view                  # Drag-and-drop stages
├── Table view                   # Sortable, filterable table
├── Calendar view                # Projects by due date
└── Analytics                    # Throughput, bottlenecks, cycle time

/admin/messaging                 # Centralized messaging hub

/admin/onboarding-metrics        # Onboarding funnel analytics

/admin/commissions               # Commission management
├── Commission list              # Pending, approved, paid
├── Bulk approval                # Approve multiple at once
├── Retroactive calculation      # Apply to historical orders
└── Rate configuration           # Default and tier-based rates

/admin/esign                     # E-signatures (see E-Signature section)

/admin/samples                   # Product sample management
├── Request tracking             # Pending, shipped, delivered
├── Shipment management          # Carrier, tracking, delivery
└── Sample inventory             # Stock levels (optional)
```

**Key Features by Section**:

| Section | Features |
|---------|----------|
| **Directory** | Grid/list view, advanced filters, bulk actions, export CSV |
| **Creator Detail** | Profile, earnings, projects, inbox, contracts, tax tabs |
| **Applications** | Queue, approve/reject workflow, rejection templates |
| **Communications** | Global inbox, email queue, template editor, notification settings |
| **Pipeline** | Kanban drag-drop, table, calendar, stage config, automation triggers |
| **Commissions** | Sync orders, bulk approve, tier-based rates, retroactive apply |
| **Samples** | Request tracking, shipment status, delivery confirmation |
| **Onboarding** | Step configuration, reminder settings, metrics dashboard |

See phase documents for implementation:
- [PHASE-2U-CREATORS-ADMIN-DIRECTORY.md](./phases/PHASE-2U-CREATORS-ADMIN-DIRECTORY.md) - Directory, detail pages, per-creator inbox
- [PHASE-2U-CREATORS-ADMIN-PIPELINE.md](./phases/PHASE-2U-CREATORS-ADMIN-PIPELINE.md) - Kanban, table, calendar, automation
- [PHASE-2U-CREATORS-ADMIN-COMMUNICATIONS.md](./phases/PHASE-2U-CREATORS-ADMIN-COMMUNICATIONS.md) - Inbox, queue, templates, settings
- [PHASE-2U-CREATORS-ADMIN-ESIGN.md](./phases/PHASE-2U-CREATORS-ADMIN-ESIGN.md) - Document management, bulk send, counter-sign
- [PHASE-2U-CREATORS-ADMIN-OPS.md](./phases/PHASE-2U-CREATORS-ADMIN-OPS.md) - Commissions, samples, onboarding metrics

### Tax Compliance System

**CRITICAL**: The platform implements comprehensive IRS tax compliance for all payee types.

**Payee Types and Form Mapping**:
| Payee Type | Form Type | Trigger |
|------------|-----------|---------|
| Creator | 1099-NEC | ≥$600 payments/year |
| Contractor | 1099-NEC | ≥$600 payments/year |
| Merchant | 1099-K | Payment processor rules |
| Vendor | 1099-MISC | ≥$600 payments/year |

**W-9 Collection**:
- All tax classification types (Individual, LLC, S-Corp, C-Corp, Nonprofit, Government, etc.)
- AES-256-GCM encrypted TIN storage (SSN/EIN)
- Only last 4 digits visible in UI
- E-delivery consent capture
- Automated 4-level reminder escalation (initial, 7-day, 14-day, 21-day)

**1099 Generation & Filing**:
- Bulk generation for all qualifying payees
- IRS IRIS CSV export for electronic filing
- IRS confirmation number tracking
- State filing requirements tracking
- Type 1 corrections (amount) and Type 2 corrections (recipient info)

**Audit & Compliance**:
- All TIN decryptions logged with IP and user agent
- Form status workflow: draft → approved → filed → delivered
- Immutable audit trail for all tax actions
- Filed forms cannot be voided (only corrected)

**Admin Tax Dashboard**:
- Stats: Requiring 1099, approaching threshold, missing W-9
- 1099 forms list with bulk actions
- IRS filing workflow page
- W-9 status tracking
- Annual payments page with CSV export

See [PHASE-4D-CREATOR-TAX.md](./phases/PHASE-4D-CREATOR-TAX.md) for complete specification.

### Commerce Complete System

**CRITICAL**: The platform implements comprehensive commerce management including subscriptions, reviews, analytics, Google Feed, and surveys.

**Commerce Admin Pages Overview**:

| Section | Pages | Key Features |
|---------|-------|--------------|
| **Subscriptions** | 10+ pages | List, detail, analytics, save flows, selling plans, emails, migration, settings, validation, cutover |
| **Reviews** | 13 pages | Moderation, email queue, bulk send, incentive codes, Q&A, analytics, settings, migration |
| **Analytics** | 6 pages + 6 tabs | Unit economics, spend sensitivity, geography, burn rate, P&L breakdown, custom reports |
| **Google Feed** | 6 pages | Feed overview, images, preview, products, settings |
| **Surveys** | 2 pages | Dashboard, Slack integration |

**Subscription Management**:
- **Provider Abstraction**: Loop, Recharge, Bold, or Custom billing
- **Retention Flows**: Cancellation prevention, win-back campaigns, at-risk intervention
- **Analytics**: MRR/ARR, cohort analysis, churn by reason, LTV by cohort
- **Email Templates**: 9+ template types (renewal, failed payment, etc.)
- **Selling Plans**: Shopify selling plan configuration

**Review System**:
- **Provider Toggle**: Internal system or Yotpo integration
- **Email Request System**: Queue with delivery tracking, reminders, photo requests
- **Bulk Send**: Campaigns for past customers with scheduling
- **Incentive Codes**: Discount code generation and tracking for reviews
- **Q&A Management**: Product questions and answers (separate from reviews)
- **Analytics**: Rating distribution, product performance, sentiment analysis

**Commerce Analytics**:
| Tab | Metrics |
|-----|---------|
| **Unit Economics** | CAC, LTV, LTV:CAC ratio, ARPU, payback period |
| **Spend Sensitivity** | ROAS, CPO, CPA, marginal ROAS curve |
| **Geography** | Revenue by region, shipping by zone |
| **Burn Rate** | Cash position, runway, break-even analysis |
| **Platform Data** | Shopify metrics, conversion rates, inventory |
| **Slack Notifications** | Configurable alerts for revenue, orders, churn |

**Google Feed**:
- **Feed Generation**: Tenant-specific URLs with secure tokens
- **Product Customization**: Per-product overrides for feed data
- **Exclusion Rules**: By tag, vendor, collection, or stock status
- **Category Mapping**: Shopify type → Google product category
- **Custom Labels**: Rule-based label assignment (0-4)

**Surveys** (Own System, NOT Fairing):
- **Post-Purchase Survey**: Shopify checkout extension
- **Attribution Integration**: Correlates with ad platform data
- **Slack Notifications**: Real-time or digest responses

See phase documentation:
- [PHASE-2O-COMMERCE-SUBSCRIPTIONS.md](./phases/PHASE-2O-COMMERCE-SUBSCRIPTIONS.md)
- [PHASE-2O-COMMERCE-REVIEWS.md](./phases/PHASE-2O-COMMERCE-REVIEWS.md)
- [PHASE-2O-COMMERCE-ANALYTICS.md](./phases/PHASE-2O-COMMERCE-ANALYTICS.md)
- [PHASE-2O-COMMERCE-GOOGLE-FEED.md](./phases/PHASE-2O-COMMERCE-GOOGLE-FEED.md)
- [PHASE-2O-COMMERCE-SURVEYS.md](./phases/PHASE-2O-COMMERCE-SURVEYS.md)

### E-Signature System

**CRITICAL**: The platform implements a full-featured e-signature system for contracts, agreements, and legal documents.

**Core Features**:
| Feature | Description |
|---------|-------------|
| Template Library | Reusable templates with variable substitution |
| Multi-Signer Workflows | Sequential and parallel signing order |
| Bulk Send | Send to up to 100 recipients from a single template |
| Counter-Signatures | Internal signers sign from admin portal |
| PDF Generation | Field embedding with coordinate positioning |
| Audit Trail | Append-only log of all document actions |
| Webhooks | Real-time notifications with HMAC signatures |
| Email Notifications | Signing requests, reminders, completions |

**Field Types** (16+):
- **Signature fields**: `signature`, `initial`, `date_signed`
- **Text inputs**: `text`, `textarea`, `number`, `email`
- **Selection**: `checkbox`, `dropdown`, `radio`
- **Data**: `date`, `currency`, `company`, `title`
- **Special**: `attachment`, `image`, `custom_formula`

**Multi-Signer Workflow**:
```
Order 1: Alice, Bob (parallel - both can sign immediately)
    ↓ (wait for ALL order 1 to complete)
Order 2: Charlie (sequential - waits for Alice AND Bob)
    ↓
Order 3: Internal Admin (counter-signature from portal)
    ↓
Document Complete → Generate signed PDF → Notify all parties
```

**Coordinate System**:
- All field positions stored as percentages (0-100%) from top-left
- Y-axis flip for PDF embedding: `pdfY = pageHeight - (percentage * pageHeight)`
- Consistent rendering across preview (CSS) and final PDF (pdf-lib)

**Admin Pages**:
- `/admin/esign/templates` - Template library management
- `/admin/esign/documents` - Document tracking and management
- `/admin/esign/pending` - Documents awaiting action
- `/admin/esign/counter-sign` - Counter-signature queue for internal signers
- `/admin/esign/webhooks` - Webhook configuration
- `/admin/esign/archive` - Completed document archive

**Integration Points**:
- Creator contracts (automated from project creation)
- Contractor agreements (project-based)
- Vendor contracts (service agreements)
- Custom documents (tenant-uploaded PDFs)

**Database Tables**:
- `esign_templates` - Reusable template definitions
- `esign_template_fields` - Field definitions per template
- `esign_documents` - Document instances from templates
- `esign_signers` - Signer records with status tracking
- `esign_fields` - Field values per document
- `esign_signatures` - Signature image storage
- `esign_audit_log` - Append-only audit trail
- `esign_webhooks` - Webhook configurations

See phase documentation:
- [PHASE-4C-ESIGN-CORE.md](./phases/PHASE-4C-ESIGN-CORE.md) - Database, templates, core logic
- [PHASE-4C-ESIGN-PDF.md](./phases/PHASE-4C-ESIGN-PDF.md) - PDF generation and coordinates
- [PHASE-4C-ESIGN-WORKFLOWS.md](./phases/PHASE-4C-ESIGN-WORKFLOWS.md) - Multi-signer workflows
- [PHASE-4C-ESIGN-OPERATIONS.md](./phases/PHASE-4C-ESIGN-OPERATIONS.md) - Bulk send, webhooks, audit

### AI Assistant System (BRII)

**CRITICAL**: The platform includes a sophisticated AI assistant system called BRII (Business Relationships & Interaction Intelligence) that provides autonomous agent capabilities for each tenant.

**Core Architecture**:
| Layer | Description |
|-------|-------------|
| **AI Agents** | Configurable AI employees per tenant with personality traits |
| **Memory System** | Persistent RAG with vector embeddings and semantic search |
| **Multi-Channel** | Slack, Email, SMS, Voice call integrations |
| **Learning** | Correction detection, feedback loops, pattern extraction |
| **Autonomy** | Three-level control (autonomous, suggest_and_confirm, human_required) |
| **Teams** | Multi-agent collaboration with handoffs and org chart |

**Agent Capabilities**:
- **Slack Integration**: Real-time messaging, DMs, mentions, app home
- **Voice Calls**: TTS (ElevenLabs, Google), STT (AssemblyAI), phone calls via Retell
- **Email**: Send/receive with tenant's configured addresses
- **Calendar**: Google Calendar integration for scheduling
- **Memory/RAG**: Vector embeddings (3072-dim), semantic search, confidence decay
- **Tool Execution**: MCP tools with per-action approval workflow

**Personality System** (6 Traits):
- Formality (casual ↔ formal)
- Verbosity (concise ↔ detailed)
- Proactivity (reactive ↔ proactive)
- Humor (serious ↔ playful)
- Emoji usage (none ↔ frequent)
- Assertiveness (deferential ↔ direct)

**Memory Types**:
- `team_member` - Preferences and info about team members
- `creator` - Knowledge about creators the agent works with
- `project_pattern` - Learned patterns from successful projects
- `policy` - Business rules and procedures
- `preference` - User preferences and communication styles
- `fact` - General knowledge and information

**Autonomy Levels**:
| Level | Actions | Approval |
|-------|---------|----------|
| `autonomous` | Lookups, check-ins, reports, Q&A | None required |
| `suggest_and_confirm` | First message, status changes, deadline extensions | Shows suggestion, waits for confirm |
| `human_required` | Payments, approvals, declines, bulk messages | Must be approved by human |

**Multi-Tenant Isolation**:
- Each tenant has their own AI agents
- Separate personality configurations
- Isolated memory stores (no cross-tenant knowledge)
- Per-tenant Slack apps and OAuth tokens
- Separate phone numbers and voice configuration

**Admin UI Pages**:
- `/admin/ai-team` - Agent list and dashboard
- `/admin/ai-team/[agentId]` - Agent configuration (personality, autonomy)
- `/admin/ai-team/[agentId]/memories` - Memory browser and training
- `/admin/ai-team/[agentId]/integrations` - Connected accounts (Slack, Calendar, etc.)
- `/admin/ai-team/actions` - Action log with approval queue
- `/admin/ai-team/calls` - Voice call history and transcripts
- `/admin/ai-team/teams` - Multi-agent team management
- `/admin/org-chart` - Unified human + AI org chart

See phase documentation:
- [PHASE-2AI-CORE.md](./phases/PHASE-2AI-CORE.md) - Agent registry, personality, autonomy, actions
- [PHASE-2AI-ADMIN.md](./phases/PHASE-2AI-ADMIN.md) - 14 BRI admin pages (settings, autonomy, integrations)
- [PHASE-2AI-MEMORY.md](./phases/PHASE-2AI-MEMORY.md) - RAG, embeddings, training, learning
- [PHASE-2AI-VOICE.md](./phases/PHASE-2AI-VOICE.md) - TTS, STT, voice calls
- [PHASE-2AI-INTEGRATIONS.md](./phases/PHASE-2AI-INTEGRATIONS.md) - Slack, Calendar, Email, SMS
- [PHASE-2AI-TEAMS.md](./phases/PHASE-2AI-TEAMS.md) - Multi-agent teams, org chart, handoffs

### Relationship: BRII vs AI Team Management

**Important Distinction**:
- **BRII** is the *operational AI* - the agent that actually executes tasks, responds to messages, and interacts with users
- **AI Team Management** is the *orchestration layer* - how tenants configure, train, and manage multiple AI agents

Think of it like:
- BRII = The employee (does the work)
- AI Team = The HR/management system (manages employees)

A single-agent tenant only needs BRII. Multi-agent tenants use AI Team to:
- Configure multiple specialized agents (e.g., Creator Ops, Support, Sales)
- Define org chart and reporting structure
- Set up handoffs between agents
- Track relationships and familiarity scores

The workflow engine connects to both: it can trigger BRII actions, and BRII can create/execute workflow rules.

### Workflow Automation Engine

**CRITICAL**: The platform includes a powerful rule-based workflow automation engine that enables tenant admins to create automations for their operations.

**Core Architecture**:
| Component | Description |
|-----------|-------------|
| **Workflow Rules** | Trigger → Conditions → Actions pattern |
| **Trigger Types** | `status_change`, `time_elapsed`, `scheduled`, `event`, `manual` |
| **Condition Evaluator** | 13+ operators (equals, contains, greaterThan, etc.) |
| **Action Executor** | Template interpolation with variable substitution |
| **Approval Workflows** | Route high-stakes actions through human approval |
| **Scheduled Actions** | Delayed execution with cancellation conditions |
| **Smart Inbox** | Unified view of all communications (Email, SMS, Slack) |

**Trigger Types**:
- **status_change**: Fire when entity status changes (e.g., project draft → pending)
- **time_elapsed**: Fire after X hours/days in a status (e.g., 48h no response)
- **scheduled**: Cron-based (e.g., daily report at 9 AM)
- **event**: Custom events (e.g., payment_received, review_submitted)
- **manual**: Admin-triggered with optional bypasses

**Condition Operators**:
```
equals, notEquals, greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual
in, notIn, contains, startsWith, endsWith, exists, notExists, matches (regex)
```

**Action Types**:
| Action | Description |
|--------|-------------|
| `send_message` | Email/SMS to creator, customer, team |
| `send_notification` | Internal notification to team member |
| `slack_notify` | Post to Slack channel with @mentions |
| `suggest_action` | Interactive Slack message with buttons |
| `schedule_followup` | Delayed action with cancel conditions |
| `update_status` | Change entity status |
| `update_field` | Modify entity field value |
| `create_task` | Create a task for team member |
| `assign_to` | Assign entity to user |
| `webhook` | Call external webhook |
| `generate_report` | Generate and send report |

**Template Variables**:
Templates support variable interpolation with context data:
```
{firstName}, {lastName}, {name} - Contact info
{entityTitle}, {entityStatus} - Entity info
{dueDate}, {daysSince}, {hoursInStatus} - Computed values
{adminUrl} - Deep link to admin page
```

**Approval Workflow**:
```
Rule fires → Conditions pass → requiresApproval: true
    ↓
Execution paused as pending_approval
    ↓
Admin sees in /admin/workflows/approvals
    ↓
Approve: Actions execute
Reject: Execution marked rejected with reason
```

**Scheduled Actions**:
Scheduled actions can be cancelled automatically if conditions change:
```json
{
  "type": "schedule_followup",
  "config": {
    "delay": "48h",
    "action": { "type": "send_message", "template": "..." },
    "cancel_if": { "status": { "in": ["approved", "completed"] } }
  }
}
```

**Smart Inbox**:
The workflow engine integrates with a unified inbox:
- **Contacts**: Central contact directory with consent tracking
- **Threads**: Multi-channel conversation threads (Email, SMS, Slack)
- **Messages**: Inbound/outbound message history
- **AI Copilot**: Optional AI-generated draft responses
- **Assignment**: Thread assignment and snoozing

**Built-in Rules** (Seeded for New Tenants):
- Project: 48h No Response Reminder
- Project: Stalled 7 Days Alert
- Submission: 24h Review Reminder
- Task: Overdue Alert

**Admin UI Pages**:
- `/admin/workflows` - Rule list and management
- `/admin/workflows/new` - Create new workflow rule
- `/admin/workflows/[id]` - View/edit rule with trigger/conditions/actions
- `/admin/workflows/approvals` - Pending approval queue
- `/admin/workflows/scheduled` - Scheduled actions with cancel option
- `/admin/workflows/logs` - Execution history and audit trail
- `/admin/inbox` - Smart inbox with thread list
- `/admin/inbox/contacts` - Contact directory

**Relationship to BRII**:
- Workflows can trigger BRII actions (e.g., send AI-drafted message)
- BRII can create workflow rules through natural language
- Workflow executions appear in BRII's action log
- BRII uses workflow history for context in conversations

**Multi-Tenant Isolation**:
- Each tenant has their own workflow rules
- Execution history is tenant-scoped
- No cross-tenant triggers or actions
- Templates and inbox data are tenant-isolated

See phase documentation:
- [PHASE-2H-WORKFLOWS.md](./phases/PHASE-2H-WORKFLOWS.md) - Complete workflow engine specification

---

## User Provisioning & Multi-Tenant Access

**CRITICAL**: This section defines how users are managed across the platform. All agents must understand this model.

### User Hierarchy

```
Super Admin (Platform Owner)
    └── Tenant (Brand/Organization)
            ├── Tenant Admin (full tenant access)
            ├── Team Member (role-based access)
            └── External Users
                    ├── Creators (creator portal)
                    ├── Contractors (contractor portal)
                    └── Vendors (vendor portal)
```

### Multi-Tenant User Access

**Users can belong to MULTIPLE tenants** with different roles in each:
- A creator may work with 5 different brands
- A contractor may serve 3 different clients
- An agency team member may manage 10 brands
- A platform operator may have super admin access globally

Each user has:
- **One platform account** (email-based identity)
- **Multiple tenant memberships** (with roles per tenant)
- **Current context** (which tenant they're currently viewing)
- **Context switching** (seamless switch between tenants)

### Role-Based Access Control (RBAC)

**Predefined Roles** (available to all tenants):

| Role | Access Level | Typical User |
|------|--------------|--------------|
| **Tenant Admin** | All permissions within tenant | Brand owner, department head |
| **Manager** | Most permissions, no billing | Operations manager |
| **Finance** | Financial operations only | Accountant, CFO |
| **Creator Manager** | Creator + content operations | Influencer manager |
| **Content Manager** | Content + reviews only | Content team |
| **Support** | View-only + support tools | Customer support |
| **Viewer** | Read-only access | Stakeholders, auditors |

**Custom Roles**: Tenant admins can create custom roles with specific permissions.

**Permission Categories**:
- `tenant.*` - Tenant settings and billing
- `team.*` - Team member management
- `creators.*` - Creator management, contracts, payments
- `vendors.*` - Vendor management, invoices, payments
- `commerce.*` - Orders, subscriptions, reviews
- `finance.*` - Payouts, treasury, expenses
- `content.*` - Blog, landing pages, DAM
- `integrations.*` - Third-party connections
- `analytics.*` - Dashboards, attribution, exports

### Super Admin Capabilities

Super admins have platform-wide access:

**Super Admin Only Pages**:
```
/super-admin (Orchestrator)
├── /tenants                    # Manage all tenants
├── /users                      # View all platform users
├── /ops                        # Cross-tenant operations
├── /flags                      # Platform feature flags
└── /settings                   # Platform configuration
```

**Super Admin Actions**:
- Create, suspend, delete tenants
- Grant/revoke super admin access
- Impersonate tenant admins for support
- View cross-tenant analytics
- Manage platform-wide feature flags
- Access operations dashboard (errors, logs, health)

### Team Member Invitation Flow

```
1. Tenant admin enters email + selects role
2. System sends invitation email
3. User clicks link:
   a. If existing user → Add to tenant
   b. If new user → Create account + add to tenant
4. User can now access tenant with assigned role
```

**Invitation States**: Pending → Accepted/Expired/Revoked

### Context Switching

Users with multiple tenant memberships can switch context:

```typescript
// JWT includes all accessible tenants
{
  sub: "user_123",
  org: "rawdog",          // Current tenant
  role: "admin",          // Role in current tenant
  orgs: [                 // All accessible tenants
    { slug: "rawdog", role: "admin" },
    { slug: "clientx", role: "member" },
    { slug: "clienty", role: "creator" }
  ]
}
```

**UI**: Tenant switcher dropdown in admin header

### Local Development & Testing

**Debug Auth Bypass** (localhost only):
```bash
DEBUG_BYPASS_AUTH=true
NEXT_PUBLIC_DEBUG_MODE=true
```

**Test Tenant** (pre-configured for development):
- Tenant ID: `test_tenant_default`
- Tenant Slug: `test-brand`

**Test Users** (available in debug mode):
- `debug_super_admin` - Super admin access
- `debug_tenant_admin` - Tenant admin for test-brand
- `debug_team_member` - Team member for test-brand

See phase documents for implementation details:
- [PHASE-2E-TEAM-MANAGEMENT.md](./phases/PHASE-2E-TEAM-MANAGEMENT.md)
- [PHASE-2F-RBAC.md](./phases/PHASE-2F-RBAC.md)
- [PHASE-2SA-USERS.md](./phases/PHASE-2SA-USERS.md)
- [PHASE-2G-CONTEXT-SWITCHING.md](./phases/PHASE-2G-CONTEXT-SWITCHING.md)

---

## Tenant Admin Settings

**CRITICAL**: Tenant admin settings pages are accessible to tenant admins for their own tenant only. These are distinct from super admin operations pages (`/admin/ops/*`) which are platform-owner only.

### Access Control Matrix

| Page Category | Super Admin | Tenant Admin | Team Member |
|---------------|-------------|--------------|-------------|
| `/admin/ops/*` (Operations) | **Yes** | **NO** | **NO** |
| `/admin/settings/ai` | Yes (all tenants) | Yes (own tenant) | `tenant.settings.view` |
| `/admin/settings/payouts` | Yes (all tenants) | Yes (own tenant) | `finance.payouts.*` |
| `/admin/settings/permissions` | Yes (all tenants) | Yes (own tenant) | `team.roles.manage` |
| `/admin/config` | Yes (all tenants) | Yes (own tenant) | `tenant.settings.edit` |

**Key Distinction**:
- **Super Admin Only** (`/admin/ops/*`): Error tracking, system logs, health monitoring, alerts, performance metrics - cross-tenant visibility
- **Tenant Accessible**: AI settings, payout settings, permissions, site config - tenant-scoped data only

### AI Settings (`/admin/settings/ai`)

Configure AI/ML features for the tenant:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `ai_enabled` | boolean | true | Master toggle for all AI features |
| `brii_enabled` | boolean | false | Enable BRII AI assistant |
| `ai_content_enabled` | boolean | true | Enable AI content generation |
| `ai_insights_enabled` | boolean | true | Enable AI-powered analytics insights |
| `ai_model_preference` | enum | 'auto' | Preferred model: auto, claude, gpt4 |
| `ai_monthly_budget_usd` | number | null | Monthly AI spending limit |
| `ai_memory_enabled` | boolean | true | Allow AI to remember context |

### Payout Settings (`/admin/settings/payouts`)

Configure payment processing for creators, contractors, and vendors:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `default_payment_method` | enum | 'stripe_connect' | stripe_connect, paypal, wise, check |
| `payout_schedule` | enum | 'weekly' | weekly, bi_weekly, monthly, on_demand |
| `payout_day` | integer | 5 | Day of week (1-7) or month (1-28) |
| `min_payout_threshold_usd` | number | 10.00 | Minimum balance before payout |
| `auto_payout_enabled` | boolean | true | Auto-process when threshold met |
| `payout_fee_type` | enum | 'none' | none, flat, percentage |
| `hold_period_days` | number | 7 | Days to hold before eligible |
| `require_tax_info` | boolean | true | Require W-9 before payouts |

### Site Configuration (`/admin/config`)

Configure site-wide settings including pricing, promotions, and branding:

| Setting Group | Description |
|---------------|-------------|
| **Pricing** | Product pricing, subscription discounts, bundle pricing |
| **Promotions** | Active sale toggle, sale name, dates, discount overrides |
| **Banners** | Announcement bar, promotional banners |
| **Branding** | Logo, colors, fonts, favicon |
| **Navigation** | Header menu, footer configuration |
| **Analytics** | GA4, Meta Pixel, TikTok Pixel IDs |

### Permissions Settings (`/admin/settings/permissions`)

Role and permission management (see PHASE-2F-RBAC.md):
- View permission matrix (roles vs permissions)
- Create and edit custom roles
- Assign permissions to roles
- View team member roles

See phase document for implementation:
- [PHASE-2TS-TENANT-SETTINGS.md](./phases/PHASE-2TS-TENANT-SETTINGS.md)

---

## Unified Communications & Notifications

**CRITICAL**: This is a **PORTABLE platform**. ALL communications must be customizable in-platform, NEVER hardcoded. This is NOT a marketing platform - no campaigns, flows, or drip sequences. Just platform notifications and transactional emails.

### Core Architecture

The platform sends AND receives emails for various functions. Each tenant needs:
- Multiple sender addresses (subdomains) with in-app DNS setup instructions
- Mapping of notification types to sender addresses
- Visual queue UI showing sent/pending/failed per function
- Customizable templates in admin with variable substitution
- Incoming email handling (treasury approvals, receipts, replies)
- Email enabled by default, SMS toggle-able

### Sender Address Configuration

Tenants configure multiple sender addresses for different purposes:

```
orders@mail.{tenant-domain}.com     → Transactional (order confirmations, receipts)
creators@{tenant-domain}.com        → Creator communications
support@help.{tenant-domain}.com    → Support/general (RECEIVES inbound too)
treasury@mail.{tenant-domain}.com   → Treasury approvals (RECEIVES inbound too)
receipts@mail.{tenant-domain}.com   → Receipt forwarding (RECEIVES inbound too)
noreply@{tenant-domain}.com         → System notifications
```

DNS setup instructions shown in-platform per domain/subdomain.

### Per-Function Email Queues

Each part of the app that sends emails has its own queue view:

| Queue Location | Email Types |
|----------------|-------------|
| `/admin/reviews/email-queue` | Review request/reminder emails |
| `/admin/creators/communications/queue` | Onboarding, projects, payments, e-sign |
| `/admin/subscriptions/emails` | Order confirmations, payment failures |
| `/admin/treasury` (integrated) | Approval requests, receipt processing |

Queue features: Status tracking (pending → sent/failed), bulk actions, retry logic, sequence support.

### Inbound Email Handling

The platform receives emails for specific workflows:

| Inbound Address | Purpose |
|-----------------|---------|
| `treasury@mail.{domain}` | Approvers reply to approve/reject treasury requests |
| `receipts@mail.{domain}` | Team forwards receipts to be logged in treasury |
| `support@help.{domain}` | Customers/creators reply to emails |
| `creators@{domain}` | Creator reply handling |

**Treasury Approval Parsing**: System parses replies for approval/rejection keywords, matches to pending requests, updates status automatically.

### Template Management

ALL email templates are editable in admin:
- Review templates (`/admin/reviews/settings → Templates`)
- Creator templates (`/admin/creators/communications/templates`)
- E-Sign templates (`/admin/esign/templates → Email`)
- Subscription templates (`/admin/subscriptions/emails`)
- Treasury templates (`/admin/treasury/settings → Email`)

Features: WYSIWYG editor, variable insertion, preview, test send, sender address selection, version history.

### Central Template Library (`/admin/templates`)

In addition to per-function template editors, the platform provides a **unified template library** that aggregates all ~50 notification templates in one place:

| Feature | Description |
|---------|-------------|
| **Grouped View** | Templates organized by function (Reviews, Creators, E-Sign, etc.) |
| **Status Indicators** | Shows Custom vs Default status per template |
| **Quick Access** | Click any template to navigate to its per-function editor |
| **Search/Filter** | Find templates by name, filter by function or status |
| **Usage Stats** | Sends per template in last 30 days |

**Template Analytics** (`/admin/templates/analytics`):
- Send volume per template over time
- Open rates and click rates (if Resend tracking enabled)
- Bounce rates and delivery health
- Top/bottom performing templates

**IMPORTANT**: This is NOT a marketing platform. The template library shows **notification templates only** - no campaign templates, drip sequences, or marketing email builders.

See [PHASE-2CM-TEMPLATE-LIBRARY.md](./phases/PHASE-2CM-TEMPLATE-LIBRARY.md) for implementation details.

### Resend Integration

Email provider: **Resend** (configured per tenant during onboarding)
- Tenant provides their own Resend API key
- Domain/subdomain verification via Resend API
- Webhook-based inbound email handling
- Email is Step 5 of 9-step tenant onboarding wizard

### SMS Notifications (Optional)

**CRITICAL**: SMS is **OFF by default** for all tenants. SMS is for **platform notifications only** - NOT marketing.

**What SMS Does:**
- Transactional notifications (order shipped, delivery confirmed)
- Creator/contractor alerts (payment available, action required)
- Security notifications (verification codes, security alerts)

**What SMS Does NOT Do (Out of Scope):**
- No marketing campaigns
- No bulk SMS blasts
- No drip sequences or flows
- No abandoned cart SMS
- No promotional SMS

**Per-Notification Channel Selection:**
Each notification type can be configured for:
- Email only (default)
- SMS only (if SMS enabled)
- Both Email + SMS

**Setup Flow:**
1. Tenant explicitly enables SMS in settings (off by default)
2. Guided Twilio setup wizard (Account SID, Auth Token, Phone Number)
3. Test SMS verification
4. Configure per-notification channels

**TCPA Compliance:**
- STOP keyword opt-out handling (automatic)
- Quiet hours enforcement (9pm-9am by default)
- Opt-out list management in admin
- A2P 10DLC registration guidance for high volume

**SMS Templates:**
- 160 character limit (single segment)
- Same variable substitution as email ({{customerName}}, etc.)
- Character counter with segment preview
- Link shortening option

### Non-Negotiable Requirements

- Zero hardcoded email content or sender addresses
- Every notification type must be editable in admin
- Every email-sending function needs a visible queue
- All inbound emails must be logged and routable
- Tenant isolation for all email operations

### Slack Notifications (Team Channel)

**CRITICAL**: Slack is the primary channel for internal team notifications. NOT for customer communication.

**Tenant Slack Features:**
- OAuth connection with bot + user tokens (encrypted AES-256-CBC)
- 52 notification types across 8 categories
- Channel mapping: route each notification type to a specific channel
- Enable/disable per notification type
- Test message button for every type
- Scheduled reports: Daily, weekly, monthly P&L and performance digests
- Custom Block Kit message templates
- User mention resolution (platform user → Slack user via email)
- Per-user notification preferences with quiet hours

**Notification Categories (52 Types):**

| Category | Example Types | Count |
|----------|---------------|-------|
| Creators | Applications, projects, payments | 13 |
| Commerce | Orders, subscriptions, refunds | 8 |
| Reviews | New reviews, negative reviews | 4 |
| Treasury | Top-ups, payouts, low balance | 7 |
| System | Errors, security, deployments | 5 |
| Analytics | Daily digest, AI tasks | 3 |
| Surveys | Reports, NPS alerts, sync failures | 7 |
| DAM | Mentions, replies, review workflow | 5 |

**Channel Picker UI:**
- List all public channels and private channels (where bot invited)
- Search/filter channels
- Create new channel from UI
- Refresh channel list

**Scheduled Performance Reports:**
- Frequency: Daily, Weekly, Monthly
- Send time by timezone (24 global timezones)
- Customizable metrics with drag-and-drop ordering
- Metrics: revenue, orders, subscriptions, attribution, ad spend, ROAS
- "Send Now" for on-demand reports
- Custom header text override

**Message Template Customization:**
- Block Kit visual editor
- Variable substitution: `{customerName}`, `{orderNumber}`, etc.
- Preview with sample data
- Test send to current user's DM
- Version history and reset to default

**Super Admin Ops Slack:**
- Separate workspace for platform operations (not tenant workspaces)
- Routes alerts by severity: critical, error, warning, info
- Cross-tenant error aggregation
- Health check failure alerts
- Deployment notifications
- Configurable @here / @channel mentions

See phase documents for implementation:
- [PHASE-2CM-SENDER-DNS.md](./phases/PHASE-2CM-SENDER-DNS.md) - Sender addresses, DNS config
- [PHASE-2CM-EMAIL-QUEUE.md](./phases/PHASE-2CM-EMAIL-QUEUE.md) - Queue architecture
- [PHASE-2CM-INBOUND-EMAIL.md](./phases/PHASE-2CM-INBOUND-EMAIL.md) - Inbound handling
- [PHASE-2CM-TEMPLATES.md](./phases/PHASE-2CM-TEMPLATES.md) - Per-function template editors
- [PHASE-2CM-TEMPLATE-LIBRARY.md](./phases/PHASE-2CM-TEMPLATE-LIBRARY.md) - Central template library UI
- [PHASE-2CM-RESEND-ONBOARDING.md](./phases/PHASE-2CM-RESEND-ONBOARDING.md) - Tenant setup
- [PHASE-2CM-SMS.md](./phases/PHASE-2CM-SMS.md) - SMS notifications (optional channel)
- [PHASE-2CM-SLACK-INTEGRATION.md](./phases/PHASE-2CM-SLACK-INTEGRATION.md) - **Slack notifications, reports, ops alerting**

---

## Content & SEO Enhancement

**CRITICAL**: Advanced content management and SEO tools are essential for organic growth. These features extend the basic blog/landing page functionality with sophisticated optimization tools.

### Advanced Blog Features

The blog system goes beyond basic CMS with SEO-focused tools:

**Topic Clustering (Pillar-Spoke Strategy)**:
- Create topic clusters with pillar post and spoke posts
- Visual network graph showing content relationships (Cytoscape.js)
- Link suggestions between cluster members
- Target keywords per cluster
- Color-coded clusters for organization

**100-Point Quality Scoring**:
- **SEO (25 pts)**: Title length, meta description, slug, content length, images, internal links
- **Readability (25 pts)**: Flesch score, paragraph length, sentence length, bullet points, headings
- **E-E-A-T (25 pts)**: Named author, credentials, experience phrases, citations, author bio/photo
- **Formatting (25 pts)**: Brand name styling, excerpt, tags, category, markdown structure

**AI Content Tracking**:
- Mark posts as AI-generated with source tracking
- Calculate human edit percentage via diff algorithm
- Minimum 20% human edits required for publication
- Bonus points for 40%+ human contribution

**Link Health Analysis**:
- Detect orphan posts (no internal links)
- One-way link detection (spokes not linking to pillar)
- Product link presence check
- Authoritative external link tracking (.gov, .edu, journals)
- Interactive link map visualization

**Content Freshness**:
- Track content age (fresh, aging, stale, outdated)
- Dashboard showing freshness distribution
- Bulk refresh scheduling

### SEO Management Suite

Comprehensive SEO tools for organic growth:

**Keyword Tracking**:
- Track unlimited keywords per tenant
- Google Search Console integration (OAuth)
- 90-day position history
- Daily sync via background job
- Trend analysis (7d/30d/90d)
- CSV export of full history

**Content Gap Analysis**:
- **Internal gaps**: Find keywords without dedicated content
- **Competitor gaps**: Discover keywords competitors rank for (optional DataForSEO integration)
- Search volume and difficulty data
- Prioritized opportunity list

**URL Redirect Management**:
- 301/302/307/308 redirects with analytics
- Loop detection prevents circular redirects
- CSV import/export for bulk operations
- Hit tracking with most-used stats
- Source path normalization

**Schema Validation**:
- Validate JSON-LD for all blog posts
- Article, Breadcrumb, Person, Organization schemas
- Scoring system (0-100) per post
- Bulk validation with summary stats
- Issue detection: errors, warnings, suggestions

**Site SEO Audit**:
- Page-by-page scoring (0-100)
- Title, meta description, headings analysis
- Image alt text coverage
- Internal/external link counts
- Audit history (30 audits retained)
- Weekly scheduled audits

### User-Generated Content (UGC) Gallery

Customer photo submissions and moderation:

**Public Submission Portal**:
- 3-step wizard (photos, product details, contact info)
- Before/after image upload with validation
- File validation (JPEG/PNG/WebP, max 10MB)
- Marketing consent checkbox for rights management
- Campaign tracking via submission tokens

**Admin Moderation Dashboard**:
- Filter by status (pending, approved, rejected)
- Stats cards with pending count badge
- Detail modal with approve/reject workflow
- Review notes and audit trail
- Reviewer attribution (who approved, when)

**Public Gallery Display**:
- Only approved submissions shown
- Testimonials hidden without marketing consent
- Privacy filter (no email/phone in public API)
- Hover effect toggles before/after
- Lightbox with keyboard navigation

### Non-Negotiable Requirements

- Topic clusters must support pillar-spoke structure
- Quality scoring must be real-time (< 200ms)
- AI content tracking must enforce 20% minimum human edits
- Keyword tracking must integrate with GSC
- Redirect loop detection must be enforced
- Schema validation must support Article + Breadcrumb
- UGC must require marketing consent for public display
- All features must be tenant-isolated

See phase documents for implementation:
- [PHASE-2I-CONTENT-BLOG-ADVANCED.md](./phases/PHASE-2I-CONTENT-BLOG-ADVANCED.md) - Topic clusters, quality scoring, E-E-A-T
- [PHASE-2I-CONTENT-SEO.md](./phases/PHASE-2I-CONTENT-SEO.md) - Keywords, redirects, schema validation
- [PHASE-2I-CONTENT-UGC.md](./phases/PHASE-2I-CONTENT-UGC.md) - Photo submissions, moderation, gallery

---

## Support & Help Desk System

**CRITICAL**: Every tenant needs customer support capabilities. This includes ticket management, knowledge base, live chat, CSAT tracking, and privacy compliance tools.

### Architecture Overview

The support system is fully multi-tenant with complete data isolation:

```
Customer (Storefront/Portal)
    ├── Live Chat Widget (embedded)
    ├── Help Center (public KB)
    ├── Ticket Submission (form/email)
    └── Privacy Request Portal
            ↓
    Support System (Tenant-Isolated)
            ↓
Agent Dashboard (Admin Portal)
    ├── Ticket Queue
    ├── Chat Sessions
    ├── KB Editor
    └── CSAT Analytics
```

### Ticket Management

Full-featured support ticket system:

**Ticket Lifecycle:**
- Channels: Email, chat, phone, form, SMS
- Status workflow: open → pending → resolved → closed
- Priority levels: low, normal, high, urgent
- SLA tracking with breach detection
- Sequential ticket numbering per tenant (TKT-000001)

**Agent Management:**
- Support agents with capacity limits
- Auto-assignment based on availability
- Online/offline status tracking
- Skill-based routing (optional)

**Escalation:**
- Priority-based SLA deadlines
- Sentiment analysis for auto-escalation
- Internal comments (hidden from customers)

### Knowledge Base

Self-service knowledge base for customer support:

**Articles:**
- Rich text editor (HTML/Markdown)
- Categories with icons and ordering
- Tags for improved discoverability
- Published/draft states
- Internal articles (agent-only)

**Search & Discovery:**
- Full-text search (PostgreSQL FTS)
- Related articles (by tags/category)
- Popular articles (by view count)
- Article feedback (helpful/not helpful)

**Default Categories:**
- Getting Started (🚀)
- Account & Billing (👤)
- Products & Orders (📦)
- Shipping & Returns (🚚)
- Creator Program (⭐) - if enabled

### Live Chat Widget

Embeddable chat for real-time support:

**Widget Features:**
- Fully customizable (colors, position, text)
- Business hours with offline mode
- Queue position display
- Agent typing indicators
- File upload support
- Read receipts

**Agent Interface:**
- Queue management (waiting sessions)
- Active chat handling
- Session transfer
- Quick responses

### CSAT Surveys

Customer satisfaction tracking:

**Survey Delivery:**
- Auto-send after ticket resolution
- Configurable delay (default: 1 hour)
- Channels: email, SMS, in-app
- 7-day expiration

**Metrics:**
- 1-5 star ratings
- Response rates
- Per-agent CSAT scores
- Trend analysis

### Privacy Compliance (GDPR/CCPA)

Built-in privacy request handling:

**Request Types:**
- Data Export (portable JSON)
- Data Deletion ("right to be forgotten")
- Do Not Sell (CCPA opt-out)
- Disclosure (data usage explanation)

**Compliance Features:**
- Deadline enforcement (GDPR: 30 days, CCPA: 45 days)
- Identity verification
- Consent record management
- Audit trail

### Non-Negotiable Requirements

- All support data tenant-isolated
- SLA deadlines calculated per-tenant timezone
- Internal comments NEVER visible to customers
- Privacy requests processed within regulatory deadlines
- Consent records immutable (revocation creates new record)

See phase documents for implementation:
- [PHASE-2SP-SUPPORT-TICKETS.md](./phases/PHASE-2SP-SUPPORT-TICKETS.md) - Ticket management, agents, SLA
- [PHASE-2SP-SUPPORT-KB.md](./phases/PHASE-2SP-SUPPORT-KB.md) - Knowledge base articles
- [PHASE-2SP-SUPPORT-CHANNELS.md](./phases/PHASE-2SP-SUPPORT-CHANNELS.md) - Chat, CSAT, privacy

---

## E-Commerce Operations

**CRITICAL**: These operational features are essential for day-to-day commerce management. They bridge the admin portal and storefront, providing tools for cart recovery, promotional campaigns, and customer targeting.

### Abandoned Checkout Recovery

Every tenant needs the ability to recover abandoned checkouts:

**Detection & Tracking:**
- Shopify `checkouts/create` and `checkouts/update` webhooks
- Track checkout abandonment after configurable timeout (default: 1 hour)
- Store checkout data locally for tenant isolation
- Calculate "Value at Risk" metrics per tenant

**Recovery Workflows:**
- Manual recovery: View checkout → Create draft order → Send recovery link
- Automated recovery: Configurable email/SMS sequences
- Draft order creation from abandoned checkout data
- Recovery URL generation (deep link to Shopify checkout)

**Email Sequences:**
- Sequence 1: Initial recovery email (1-3 hours after abandonment)
- Sequence 2: Follow-up (24-48 hours if not recovered)
- Sequence 3: Final reminder with incentive (optional, 3-5 days)
- All templates editable per tenant

**Stats & Reporting:**
- Recovery rate tracking
- Value recovered vs value at risk
- Sequence performance (which email converts best)
- Time-of-day and day-of-week analysis

### Promo Code Management

Full-featured discount code system:

**Code Types:**
- Percentage discount (e.g., 15% off)
- Fixed amount discount (e.g., $10 off)
- Free shipping
- Buy X Get Y (BXGY)
- App-managed discounts (via Shopify Functions)

**Code Creation:**
- Single code creation with custom naming
- Bulk code generation (e.g., 1000 unique codes with prefix)
- Expiration date configuration
- Usage limits (per customer, total uses)
- Minimum purchase requirements
- Customer segment targeting

**Creator Attribution:**
- Link promo codes to creators for commission tracking
- Shareable links with OG metadata (`/d/{CODE}`)
- Custom OG title/description/image per code
- Commission percentage configuration
- Retroactive commission calculation

**Performance Tracking:**
- Uses per code
- Revenue generated
- Average order value with code
- Conversion rate comparison

### Promotions Scheduling

Sitewide sales and promotional campaigns:

**Calendar View:**
- Monthly/weekly calendar of scheduled promotions
- Visual overlap detection
- Drag-and-drop rescheduling
- Quick presets: Black Friday, Cyber Monday, etc.

**Sale Configuration:**
- Sale name and date range
- Sitewide discount percentage
- Subscription-specific discounts (can differ from one-time)
- Bundle-specific discounts
- Per-product price overrides

**Visual Elements:**
- Navigation banner with countdown timer
- Promo page banner
- Product badges (e.g., "SALE", "LIMITED TIME")
- Checkout banner reinforcement

**Timezone Handling:**
- Start times in Eastern (US)
- End times in Pacific (US)
- Ensures full coverage across US timezones
- "Evergreen" option for indefinite sales

**Integration:**
- Selling plan override during sales
- Automatic Klaviyo trigger configuration
- Landing page hero updates

### Selling Plans Configuration

Subscription interval and pricing management:

**Selling Plan CRUD:**
- Create, edit, delete selling plans
- Plan name and internal identifier
- Selector title (customer-facing)
- Priority ordering for display

**Interval Configuration:**
- Delivery frequency: days, weeks, months
- Interval count (e.g., every 2 weeks)
- Prepaid options (pay upfront for N cycles)

**Discount Types:**
- Percentage discount (most common)
- Fixed amount discount
- Explicit price (override MSRP)

**Discount Windows:**
- Initial discount (first N payments)
- Ongoing discount (after window)
- Example: 20% for first 3 months, then 15%

**Product/Collection Assignment:**
- Assign selling plans to individual products
- Assign to entire collections
- Bulk assignment tools

### Samples & Trial Tracking

Track complimentary product shipments:

**UGC Samples:**
- Orders tagged with configurable UGC tags
- Detect via Shopify order tags
- Track fulfillment status
- Link to creator profiles

**TikTok Shop Samples:**
- Orders with TikTok-related tags
- Channel pattern matching (e.g., "tiktok shop")
- Optional $0 order filter (promotional samples only)
- Separate stats from UGC

**Admin Interface:**
- Dual-type filtering (UGC, TikTok, All)
- Fulfillment status filtering
- Customer/order search
- Direct link to Shopify order

**Configuration:**
- Tag arrays for detection (editable)
- Channel patterns (regex-like matching)
- Zero-price toggle for TikTok

### Customer Segmentation

Target customers for promotions and communications:

**Shopify Segments Integration:**
- Sync segments from Shopify Admin API
- Use Shopify's segment query DSL
- Preset "All customers" segment

**Segment Use Cases:**
- Target promo codes to segments
- Review request targeting
- Loyalty tier identification
- VIP customer recognition

**Klaviyo Sync:**
- Push segments to Klaviyo lists
- Two-way sync for list membership
- Segment-based flow triggers

**RFM Segmentation (Platform-Native):**
- Recency: Days since last purchase
- Frequency: Order count in period
- Monetary: Total spend in period
- Auto-calculated tiers: Champions, Loyal, At Risk, etc.

### Non-Negotiable Requirements

- All features must be tenant-isolated
- Promo codes must validate via Shopify (single source of truth)
- Recovery emails must use tenant templates (no hardcoding)
- Segment queries must be scoped to tenant's Shopify store
- Selling plans sync bi-directionally with Shopify

See phase documents for implementation:
- [PHASE-3E-ECOMMERCE-RECOVERY.md](./phases/PHASE-3E-ECOMMERCE-RECOVERY.md) - Abandoned checkout recovery
- [PHASE-3F-ECOMMERCE-PROMOS.md](./phases/PHASE-3F-ECOMMERCE-PROMOS.md) - Promo codes, promotions, selling plans
- [PHASE-3G-ECOMMERCE-SEGMENTS.md](./phases/PHASE-3G-ECOMMERCE-SEGMENTS.md) - Customer segmentation, samples

---

## A/B Testing System

**CRITICAL**: The platform includes a sophisticated A/B testing system that enables tenants to run experiments on landing pages, checkout flows, shipping rates, and email templates with proper statistical analysis.

### Core A/B Testing Features

Every tenant gets a full-featured experimentation platform:

**Test Types Supported:**
| Test Type | Description | Integration |
|-----------|-------------|-------------|
| **Landing Page** | Compare different page designs/content | URL redirects, Landing Page Builder |
| **Shipping** | Test different shipping rates/messaging | Shopify Functions (Delivery Customization) |
| **Email Template** | Compare email subject lines, content | Communications system |
| **Checkout** | Test checkout flow variations | Shopify + Custom checkout |

**Assignment & Tracking:**
- Consistent visitor assignment using deterministic hashing (MurmurHash3)
- Cookie persistence (1 year) across sessions
- Cart attribute injection for checkout-level data
- Order attribution via webhooks

**Test Configuration:**
- Multi-variant tests (not just A/B, supports A/B/C/D/n)
- Traffic allocation per variant (0-100%)
- Control variant designation
- Test scheduling (start/end dates with timezone support)
- Auto-start and auto-end options

### Statistical Methods

**Significance Testing:**
- Z-test for conversion rate comparisons
- Welch's t-test for revenue metrics (continuous variables)
- Configurable confidence levels: 90%, 95%, 99%
- Holm-Bonferroni correction for 3+ variant tests

**Advanced Statistics:**

| Method | Purpose |
|--------|---------|
| **Bootstrap CI** | Non-parametric confidence intervals |
| **CUPED** | Variance reduction using pre-experiment data (20-50% faster) |
| **SRM Detection** | Sample Ratio Mismatch detection (chi-squared test) |
| **Novelty Effect** | Identifies temporary lift that may decay |
| **Drift Detection** | Monitors population changes during test |

### Audience Targeting

Segment visitors for targeted experiments:

**Targeting Conditions:**
- Device type (desktop, mobile, tablet)
- Geography (country, region, city)
- Browser and OS
- UTM parameters (source, medium, campaign)
- Visitor type (new vs returning)
- Custom cookie values
- URL parameters

**Targeting Logic:**
- Multiple conditions with AND/OR logic
- Include, exclude, or force-assign actions
- Priority-based rule evaluation
- Exclusion groups (prevent cross-test contamination)

### Multi-Armed Bandit

Automatic traffic optimization using Thompson Sampling:
- Automatically shifts traffic to winning variants
- Balances exploration vs exploitation
- Maximizes conversions during test
- Periodic reallocation (configurable frequency)

### Guardrails

Protect key metrics during experiments:
- Define metrics that must NOT decrease
- Set threshold percentages
- Actions: warn, pause test, or stop test
- Automated evaluation (hourly)

### LTV Testing

Track long-term impact beyond immediate conversion:
- 30/60/90 day LTV tracking
- Repurchase rate comparison
- Order count analysis
- Delayed winner determination

### Shopify Functions Integration

For checkout-level experiments (shipping A/B tests):

**Shipping Test Features:**
- Multiple shipping rate variants (A, B, C, D)
- Delivery Customization Function (Rust WASM)
- Cart attributes pass variant to checkout
- Net Revenue Per Visitor (NRPV) as primary metric
- Mismatch detection (assigned vs actual rate)

### Admin Pages

```
/admin/ab-tests
├── (list)                       # All tests with filters
├── /new                         # Multi-step creation wizard
├── /[testId]                    # Results dashboard
├── /[testId]/edit               # Edit configuration
└── /data-quality                # SRM, novelty, drift monitoring

/admin/templates/ab-tests        # Email template tests
```

**Results Dashboard Features:**
- Significance banner with winner recommendation
- Variant comparison table
- Time series conversion chart
- Segment breakdown (device, geo, source)
- Guardrail status and CUPED panel
- PDF/CSV export

### Non-Negotiable Requirements

- All test data must be tenant-isolated
- Visitor IDs must persist for 1 year (cookie)
- Assignment algorithm must be deterministic
- SRM check must run daily on active tests
- Guardrail evaluation must run hourly
- Shipping tests require Shopify Function deployment

See phase documents for implementation:
- [PHASE-2AT-ABTESTING-CORE.md](./phases/PHASE-2AT-ABTESTING-CORE.md) - Assignment, tracking, targeting, MAB
- [PHASE-2AT-ABTESTING-STATS.md](./phases/PHASE-2AT-ABTESTING-STATS.md) - Statistical methods, quality detection
- [PHASE-2AT-ABTESTING-SHIPPING.md](./phases/PHASE-2AT-ABTESTING-SHIPPING.md) - Shopify Functions integration
- [PHASE-2AT-ABTESTING-ADMIN.md](./phases/PHASE-2AT-ABTESTING-ADMIN.md) - Admin UI pages

---

## Shopify App & Extensions

**CRITICAL**: The platform includes a comprehensive Shopify App that tenants install on their stores. This app provides checkout customizations, webhooks, pixel tracking, and Shopify Functions for all multi-tenant features.

### App Architecture

**Key Principle**: Single app, multi-tenant architecture. Each tenant installs the same app, but their data is fully isolated.

**App Structure:**
```
shopify-app/
├── shopify.app.toml              # App config with 50+ scopes
├── extensions/
│   ├── delivery-customization/   # Rust/WASM shipping A/B test function
│   ├── session-stitching-pixel/  # Web pixel for GA4 + Meta CAPI
│   ├── post-purchase-survey/     # Checkout UI extension
│   └── (future extensions)       # Discount, cart transform, etc.
└── package.json
```

### Comprehensive Scope List (50+ Scopes)

The app requests all scopes needed for current and future functionality:

| Category | Scopes | Purpose |
|----------|--------|---------|
| **Orders** | `read_orders`, `write_orders`, `read_draft_orders`, `write_draft_orders` | Order management, B2B |
| **Customers** | `read_customers`, `write_customers`, `read_customer_payment_methods` | Customer profiles, saved payments |
| **Products** | `read_products`, `write_products`, `read_inventory`, `write_inventory` | Product catalog, stock |
| **Fulfillment** | `read_fulfillments`, `write_fulfillments`, `read_shipping`, `write_shipping`, `read_locations` | Shipping, fulfillment |
| **Fulfillment Orders** | `read_*_fulfillment_orders`, `write_*_fulfillment_orders` (merchant, third-party, assigned) | 3PL integration |
| **Discounts** | `read_discounts`, `write_discounts`, `read_price_rules`, `write_price_rules` | Promo codes, automatic discounts |
| **Gift Cards** | `read_gift_cards`, `write_gift_cards` | Store credit, gift cards |
| **Content** | `read_content`, `write_content`, `read_themes`, `read_locales` | Metafields, theming |
| **Pixels** | `write_pixels`, `read_customer_events` | Web pixel deployment, tracking |
| **Analytics** | `read_analytics`, `read_reports` | Store analytics |
| **Markets** | `read_markets`, `write_markets` | International markets |
| **Subscriptions** | `read_own_subscription_contracts`, `write_own_subscription_contracts` | Subscription management |
| **Checkouts** | `read_checkouts`, `write_checkouts` | Checkout access |
| **Files** | `read_files`, `write_files` | File management |
| **Shop** | `read_shop`, `read_legal_policies` | Store settings |

### Extension Types

**1. Delivery Customization Function (Rust/WASM)**
- Purpose: A/B test shipping rates by hiding/showing options
- Target: `purchase.delivery-customization.run`
- Performance: < 5ms execution time
- Logic: Cart attribute `_ab_shipping_variant` determines visible rates

**2. Web Pixel Extension**
- Purpose: Session stitching for GA4 and Meta CAPI
- Captures: `_ga4_client_id`, `_ga4_session_id`, `_meta_fbp`, `_meta_fbc`, `_meta_external_id`
- Events: `checkout_started`, `payment_info_submitted`, `checkout_completed`
- Sends: Server-side events to GA4 Measurement Protocol and Meta CAPI

**3. Post-Purchase Survey (Checkout UI Extension)**
- Purpose: Attribution surveys on order confirmation page
- Target: `purchase.thank-you.block.render`
- Configuration: Tenant-specific questions via API
- Data: Responses sent to platform survey system

**4. Future Extensions (Specification Ready)**
| Extension | Target | Purpose |
|-----------|--------|---------|
| Discount Function | `purchase.product-discount.run` | Bundle discounts, tiered pricing |
| Payment Customization | `purchase.payment-customization.run` | Hide/show payment methods |
| Cart Transform | `purchase.cart-transform.run` | Auto-bundles, free gifts |
| Order Routing | `purchase.order-routing-location-rule.run` | Fulfillment optimization |

### Multi-Tenant OAuth Flow

**Installation Flow:**
1. Tenant initiates connection from `/admin/integrations/shopify-app`
2. Platform generates OAuth URL with state token
3. Shopify shows consent screen with all requested scopes
4. Callback exchanges code for access token
5. Token encrypted (AES-256-GCM) and stored per-tenant
6. Webhooks registered for the tenant's shop
7. Shop domain → tenant mapping established

**Credential Storage:**
```sql
shopify_connections (
  tenant_id UUID,           -- Tenant this connection belongs to
  shop TEXT,                -- mystore.myshopify.com
  access_token_encrypted,   -- AES-256-GCM encrypted
  webhook_secret_encrypted, -- For HMAC verification
  scopes TEXT[],            -- Granted scopes
  api_version TEXT,         -- 2026-01
  status TEXT,              -- active, suspended, disconnected
  UNIQUE(tenant_id, shop)
)
```

### Webhook Infrastructure

**Auto-Registered Webhooks (on installation):**
- `orders/create`, `orders/updated`, `orders/paid`, `orders/cancelled`
- `refunds/create`
- `fulfillments/create`, `fulfillments/update`
- `customers/create`, `customers/update`
- `app/uninstalled`

**Webhook Routing:**
```
Request from Shopify
    ↓
Extract shop domain from header
    ↓
Lookup tenant_id from shopify_connections
    ↓
Verify HMAC with tenant's webhook secret
    ↓
Route to handler with tenant context
```

**Background Jobs Triggered:**
- Order sync, attribution, commission calculation
- Review email queue scheduling
- Gift card rewards processing
- A/B test conversion attribution
- Pixel event sending (GA4, Meta)

### Admin UI

**Shopify App Page** (`/admin/integrations/shopify-app`):
- Connection status with shop domain
- Installed scopes verification
- API version display
- Last webhook timestamp
- Connect/Disconnect/Reconnect actions

**Extensions Page** (`/admin/integrations/shopify-app/extensions`):
- Extension status cards (active/inactive)
- Per-extension configuration
- Deployment status
- Last deployed timestamp

**Webhook Health** (`/admin/integrations/shopify-app/webhooks`):
- Registration status per topic
- Recent events with status
- Failure count and retry status
- Manual sync action

### Non-Negotiable Requirements

- All tokens encrypted with AES-256-GCM, never stored plaintext
- Each shop connection scoped to exactly one tenant
- All webhooks verified via HMAC before processing
- Request all scopes upfront (can't request more later without re-auth)
- Credential caching with short TTL to reduce DB load
- Extensions must not break checkout on errors

See phase documents for implementation:
- [PHASE-2SH-SHOPIFY-APP-CORE.md](./phases/PHASE-2SH-SHOPIFY-APP-CORE.md) - OAuth, credentials, admin UI
- [PHASE-2SH-SHOPIFY-EXTENSIONS.md](./phases/PHASE-2SH-SHOPIFY-EXTENSIONS.md) - Functions, pixels, checkout UI
- [PHASE-2SH-SHOPIFY-WEBHOOKS.md](./phases/PHASE-2SH-SHOPIFY-WEBHOOKS.md) - Webhook infrastructure

---

## P&L Configuration & Financial Analytics

**CRITICAL**: Every tenant has unique cost structures. The platform MUST support fully customizable P&L calculations with tenant-specific variable costs, COGS sources, and formula configurations.

### Why Per-Tenant P&L Configuration

Different brands have vastly different cost structures:

| Brand Type | Payment Processing | Pick/Pack | COGS Source |
|------------|-------------------|-----------|-------------|
| Shopify-native | Shopify Payments (2.9% + $0.30) | 3PL invoice | Shopify product cost |
| Self-checkout | Stripe (2.4% + $0.30) | Own warehouse | Manual entry |
| High-volume | Negotiated rates (1.9% + $0.15) | Per-item fee | ERP sync |
| Hybrid | Multiple processors | Variable | Mix |

### Variable Costs Configuration

Each tenant configures their own cost structure at `/admin/settings/costs`:

**Payment Processing:**
- Primary processor (Shopify Payments, Stripe, PayPal, Custom)
- Percentage rate (e.g., 2.9%, 2.4%, 1.9%)
- Fixed fee per transaction (e.g., $0.30, $0.25, $0.15)
- Support for multiple processors with volume-weighted averages

**Fulfillment Costs:**
- Cost model selection: per-order, per-item, or weight-based
- Pick/pack fee (per order or per item)
- Packaging cost (materials per order)
- Handling fee (general per-order fee)
- Weight-based tiers for 3PLs that charge by weight

**Shipping Costs:**
- Tracking method: actual expense (via Treasury), estimated %, or flat rate
- Configurable estimates if not tracking actuals

**Other Variable Costs:**
- Dynamic list of custom per-order costs
- Per-order, per-item, or percentage-of-revenue calculation types

### COGS Source Configuration

**Feature Flag Controlled**: `commerce.cogs_source`

**Two Modes:**

1. **Shopify Sync** (default when `commerce.provider` = 'shopify')
   - COGS pulled automatically from Shopify product cost field
   - Real-time, hourly, or daily sync options
   - Fallback behavior for products without cost data

2. **Internal/Manual** (when `commerce.provider` = 'custom')
   - Per-product COGS management page
   - Inline editing in product cost table
   - CSV bulk import/export
   - Margin calculator showing real-time margin as COGS is edited
   - Fallback options: zero, skip P&L, or percentage of price

### P&L Formula Configuration

Tenants can customize their P&L structure at `/admin/settings/pnl`:

**Visibility Controls:**
- Toggle which line items appear in P&L reports
- Custom labels for each section (e.g., "COGS" vs "Product Cost")
- Grouping options (e.g., combine all fulfillment costs into one line)
- Show/hide margin percentages

**Section Configuration:**
- Revenue: include/exclude shipping revenue, show gross vs net
- COGS: include free samples, show as percentage
- Variable Costs: toggle individual cost types
- Marketing: expand ad spend by platform, combine with creator payouts
- Operating Expenses: show by category, include vendor/contractor payouts

### Expense Categories

Default categories provided, fully customizable per tenant:

- **COGS**: Product Cost
- **Variable**: Payment Processing, Fulfillment, Shipping, Packaging
- **Marketing**: Meta Ads, Google Ads, TikTok Ads, Creator Commissions, Influencer Fees
- **Operating**: Salaries, Rent, Software, Professional Services, Insurance
- **Other**: Miscellaneous

Tenants can add, rename, reorder, and disable categories.

### P&L Generation Integration

The P&L statement generator (`generatePLStatement`) dynamically:
1. Loads tenant-specific cost configuration
2. Applies tenant's payment processing rates (not hardcoded 2.9%)
3. Calculates fulfillment costs based on tenant's cost model
4. Pulls COGS from appropriate source (Shopify or internal)
5. Formats output based on tenant's formula preferences

### Audit Trail

All configuration changes logged:
- Who changed what, when
- Old value vs new value
- IP address and user agent
- Viewable at `/admin/settings/costs/history`

### Non-Negotiable Requirements

- All P&L configs must be tenant-isolated
- Variable cost settings apply to future calculations only (no retroactive)
- COGS source changes require confirmation
- Audit log is append-only
- System expense categories cannot be deleted, only hidden
- CSV imports limited to 10,000 rows per upload

See phase document for implementation:
- [PHASE-2D-PL-CONFIGURATION.md](./phases/PHASE-2D-PL-CONFIGURATION.md) - Complete P&L customization system

---

## Scheduling & Booking System

**CRITICAL**: The platform includes a complete Calendly-style scheduling system for managing team calls, creator meetings, and customer appointments.

### Core Scheduling Features

Every tenant gets a fully-featured booking system:

**Event Types:**
- Custom meeting types with configurable durations (15-120 min)
- Location options: Google Meet (auto-generated), Zoom, phone, in-person, custom
- Custom form questions (text, textarea, select, checkbox)
- Color coding for visual organization
- Per-event-type setting overrides (buffers, notice, booking window)

**Availability Management:**
- Weekly schedule editor (set hours per day)
- Blocked dates (PTO, holidays, conferences)
- Partial-day blocks (e.g., "blocked 9am-12pm")
- Timezone-aware calculations
- Daily booking limits (optional)
- Buffer time (before/after meetings)
- Minimum notice requirement
- Booking window (days in advance)

**Booking Flow:**
- Public booking pages: `/book/[tenantSlug]/[username]/[eventSlug]`
- Calendar date picker respecting availability
- Time slot selection respecting all constraints
- Custom question form rendering
- Rate limiting (10 bookings/minute per IP)
- Distributed locking (prevents double-booking)
- Confirmation with ICS calendar download

**Email Notifications (via Communications system):**
- Booking confirmation (to host + invitee)
- Cancellation notification
- Rescheduling notification
- Configurable reminders (48h, 24h, 2h, 1h, 30m, 15m)

### Google Calendar Integration

**OAuth Flow:**
- User connects Google Calendar from admin settings
- Tokens encrypted at rest (AES-256-GCM)
- Automatic token refresh
- Optional disconnect

**Sync Features:**
- Auto-create calendar events on booking
- Auto-generate Google Meet links
- Update events on reschedule
- Delete events on cancellation
- Import busy times for slot calculation

### Team Scheduling (Round-Robin)

**Team Management:**
- Create scheduling teams with multiple members
- Team admin roles
- Show/hide member profiles

**Scheduling Types:**
- **Round-Robin** (default): Auto-assigns next available host fairly
- **Collective**: Shows only times when ALL team members are available
- **Individual**: Invitee selects which team member to book with

**Fair Distribution:**
- Round-robin counter tracks next host index
- Skips unavailable hosts gracefully
- Analytics track distribution across members

### Booking Analytics

**Dashboard Metrics:**
- Total, upcoming, completed, cancelled bookings
- Cancel rate tracking
- Average bookings per week

**Visualizations:**
- Bookings by event type (with percentages)
- Day of week distribution
- Hour of day breakdown (heat map)
- 30-day trend line

### API Routes (25+)

```
Admin Routes:
  /api/admin/scheduling/users           - User profiles
  /api/admin/scheduling/event-types     - Event type CRUD
  /api/admin/scheduling/availability    - Weekly schedule
  /api/admin/scheduling/blocked-dates   - PTO/holidays
  /api/admin/scheduling/bookings        - List, cancel, reschedule
  /api/admin/scheduling/teams           - Team management
  /api/admin/scheduling/analytics       - Booking stats
  /api/admin/scheduling/auth/google     - OAuth flow

Public Routes:
  /api/public/scheduling/[tenant]/[user]/[event]/slots  - Available slots
  /api/public/scheduling/[tenant]/bookings              - Create booking
  /api/public/scheduling/[tenant]/teams/[team]/[event]  - Team booking
```

### Security & Performance

- **Rate Limiting**: 10 bookings/minute per IP (sliding window)
- **Distributed Locks**: Redis-based, 30s TTL, prevents double-booking
- **Token Encryption**: Google OAuth tokens encrypted (AES-256-GCM)
- **Booking IDs**: UUIDs (not sequential) for cancel/reschedule URLs
- **Tenant Isolation**: All queries scoped to `tenant_id`

### Non-Negotiable Requirements

- All scheduling data tenant-isolated
- Booking times stored as UTC, displayed in user timezone
- Public booking pages work without authentication
- Google Calendar integration optional (graceful fallback)
- All notifications use tenant templates (no hardcoding)

See phase documents for implementation:
- [PHASE-2SC-SCHEDULING-CORE.md](./phases/PHASE-2SC-SCHEDULING-CORE.md) - Event types, availability, bookings
- [PHASE-2SC-SCHEDULING-TEAM.md](./phases/PHASE-2SC-SCHEDULING-TEAM.md) - Team scheduling, round-robin

---

## Productivity & Workflow Automation

**CRITICAL**: The platform includes comprehensive productivity tools and workflow automation for team coordination, task management, and rule-based process automation.

### Task Management

Every tenant gets a full-featured task system:

**Tasks:**
- Create, assign, track tasks with priorities (urgent/high/medium/low)
- Due dates with overdue tracking
- Status workflow: pending → in_progress → completed
- Tags and project organization
- Subtask hierarchies
- Comments and activity logging
- Assignment notifications

**Projects:**
- Kanban board with customizable pipeline stages
- Project ownership and coordination
- Task grouping under projects
- Progress tracking (task completion percentage)
- Due dates and milestones

**Saved Items:**
- Bookmark important content (tasks, messages, files)
- Folder organization (starred, pinned, archive)
- Quick access to frequently referenced items

### Workflow Automation Engine

**Rule-Based Automation:**
- Configurable workflow rules with triggers, conditions, and actions
- Built-in rules for common scenarios (reminders, escalations)
- Custom rule creation by tenant admins

**Trigger Types:**
- `status_change` - When entity moves between statuses
- `time_elapsed` - After duration in a status (e.g., 48 hours pending)
- `scheduled` - Cron-based triggers (e.g., daily at 9am)
- `event` - On system events (e.g., payment received)
- `manual` - Triggered programmatically

**Condition System:**
- All conditions AND-ed together
- 13+ operators: equals, greaterThan, contains, in, exists, matches (regex)
- Computed fields: daysSinceLastUpdate, hoursInStatus, remindersSent
- Field access via dot notation

**Action Types:**
- `send_message` - Email/SMS to contacts with template substitution
- `send_notification` - Internal notification
- `slack_notify` - Post to Slack channel
- `suggest_action` - Interactive message with buttons
- `schedule_followup` - Delayed execution with cancellation conditions
- `update_status` - Change entity status
- `create_task` - Create a new task
- `webhook` - Call external API

**Approval Workflows:**
- Rules can require human approval before executing
- Approval queue for designated approvers
- Approve/reject with reason tracking
- Actions resume after approval

**Execution Controls:**
- Cooldown periods (minimum hours between executions)
- Max executions per entity
- Priority ordering (higher priority rules first)
- Full audit trail of all executions

### Smart Inbox

**Unified Communications:**
- Consolidates Email, SMS, Slack into single inbox view
- Thread-based conversation management
- Contact profiles with communication history

**Thread Management:**
- Status: open, snoozed, closed
- Priority: low, normal, high, urgent
- Assignment to team members
- Snooze until specific date
- Unread count tracking

**AI Copilot (Optional):**
- Auto-generate draft responses
- Confidence scoring
- Suggested actions
- Edit before send

### Non-Negotiable Requirements

- All productivity data tenant-isolated
- Workflow rules cannot affect other tenants
- Smart inbox contacts scoped to tenant
- Template substitution escapes HTML for security
- All executions logged for audit

See phase documents for implementation:
- [PHASE-2H-PRODUCTIVITY.md](./phases/PHASE-2H-PRODUCTIVITY.md) - Tasks, projects, saved items
- [PHASE-2H-WORKFLOWS.md](./phases/PHASE-2H-WORKFLOWS.md) - Workflow engine, smart inbox

---

## Surveys & Post-Purchase Attribution

**CRITICAL**: The platform includes a comprehensive survey system for post-purchase attribution, NPS tracking, and customer feedback. This is an **internal platform capability** - DO NOT integrate with Fairing or other third-party survey tools.

### Survey System Overview

Every tenant gets a full-featured survey builder with:
- **Post-purchase surveys** via Shopify App Extension (order confirmation page)
- **Attribution data collection** ("How did you hear about us?")
- **NPS tracking** with promoter/passive/detractor segmentation
- **Multiple question types** (single-select, multi-select, text, rating, NPS)
- **Conditional logic** (show question B if answer to A is X)
- **Multi-language support**

### Post-Purchase Survey (Shopify App Extension)

The post-purchase survey is implemented as a **Shopify App Extension** that displays on the order confirmation page:

**Extension Target**: `customer-account.order-status.block.render`

**Features:**
- Survey appears on order confirmation (thank you) page
- Attribution questions with predefined + custom options
- Product feedback questions
- NPS score collection
- Custom branding per tenant
- Mobile-optimized display
- Offline-capable (graceful degradation)

**Targeting Options:**
- Minimum order value
- Product/collection tags
- First-time customers only
- Customer tags

### Attribution Options

Each tenant can configure attribution sources with categories:

| Category | Examples |
|----------|----------|
| **Social** | TikTok, Instagram, Facebook, YouTube, Twitter/X |
| **Search** | Google Search, Bing |
| **Ads** | Meta Ads, TikTok Ads, Google Ads |
| **Referral** | Friend/Family, Influencer, Podcast, Blog |
| **Offline** | Retail Store, Event, Print Ad |
| **Other** | Other (please specify) |

System defaults provided, fully customizable per tenant.

### Survey Response Analytics

**Dashboard Metrics:**
- Total responses and completion rate
- Response trend over time
- Answer distribution per question
- Attribution source breakdown with revenue

**NPS Analytics:**
- NPS score with trend line
- Promoters (9-10), Passives (7-8), Detractors (0-6)
- NPS by customer segment
- Low NPS alert triggers

**Attribution Breakdown:**
- Source distribution (pie/bar chart)
- Revenue per attribution source
- Average order value per source
- Conversion attribution

**Export:**
- CSV/Excel export of all responses
- Question-level breakdowns
- Date range filtering

### Slack Integration

**Real-time Notifications:**
- Notify on every survey completion
- Alert on low NPS scores (configurable threshold)
- Connect to tenant's Slack workspace

**Digests:**
- Daily digest with response summary
- Weekly digest with NPS trends
- Configurable delivery schedule

### Integration with Attribution System

Survey attribution data flows to the attribution system (Prompt 22):
- Attribution responses linked to orders
- Revenue attributed to sources
- Multi-touch attribution support
- Cross-channel attribution analysis

### Admin Pages

```
/admin/surveys                       # Survey list
/admin/surveys/new                   # Create new survey
/admin/surveys/[id]                  # Edit survey
/admin/surveys/[id]/questions        # Manage questions
/admin/surveys/[id]/responses        # Response list
/admin/surveys/[id]/analytics        # Analytics dashboard
/admin/surveys/attribution           # Attribution options
/admin/surveys/slack                 # Slack integration
```

### Non-Negotiable Requirements

- All survey data tenant-isolated
- Survey responses are immutable after submission
- One response per order per survey (prevent duplicates)
- Extension must load in < 500ms on mobile
- Slack webhooks encrypted at rest
- System attribution options cannot be deleted, only hidden

See phase documents for implementation:
- [PHASE-2SV-SURVEYS.md](./phases/PHASE-2SV-SURVEYS.md) - Survey builder, Shopify extension, analytics

---

## Video Processing

**CRITICAL**: The platform includes comprehensive video hosting and processing comparable to Loom. All video features must be tenant-isolated.

### Core Video Features

**Mux Integration:**
- Direct browser uploads (no server bandwidth used)
- Adaptive bitrate streaming (HLS.js)
- Thumbnail and storyboard generation
- Video trimming to create clips
- MP4 support (`capped-1080p`) for transcription

**Video Library:**
- Grid/list views with search and filters
- Hierarchical folder organization
- Status tracking (uploading → processing → ready → error)
- Soft deletes with recovery

**Permission System (Loom-style):**

| Level | Capabilities |
|-------|--------------|
| **owner** | Full control, manage permissions, delete |
| **editor** | Edit metadata, CTA buttons, comment |
| **commenter** | Watch + comment with timestamps |
| **viewer** | Watch only |

**Share Targets:** Public (optional password), Team, User, Email invite, Expiring links

### Transcription & AI Content (AssemblyAI + Claude)

- Automatic transcription after MP4 ready
- Speaker diarization (identify different speakers)
- Auto-generated chapters and word-level timestamps
- AI-generated titles (5-10 words) and summaries (2-3 sentences)
- Action item extraction from transcripts
- Full-text search on transcripts (click to seek)

### Creator Tools

**Teleprompter:** Script storage, auto-scrolling during recording, configurable speed/font

**Editing:** Trimming to create clips, CTA button overlays (start/end/timed, max 3)

**Collaboration:** Timestamped comments with threading, emoji reactions, real-time SSE status

### Background Jobs (Trigger.dev)

| Task | Trigger | Purpose |
|------|---------|---------|
| `video-transcription` | Mux webhook | Download MP4, send to AssemblyAI |
| `ai-content-generation` | Transcription complete | Generate title, summary, tasks |
| `video-sync-schedule` | Cron (2 min) | Recover from webhook failures |

### Non-Negotiable Requirements

- All video queries use `withTenant(tenantId, ...)`
- Mux webhooks verified via HMAC-SHA256
- Direct uploads only (no server-side video handling)
- Webhook failures recovered by sync schedule

See phase documents:
- [PHASE-3E-VIDEO-CORE.md](./phases/PHASE-3E-VIDEO-CORE.md) - Mux, uploads, playback, permissions
- [PHASE-3E-VIDEO-TRANSCRIPTION.md](./phases/PHASE-3E-VIDEO-TRANSCRIPTION.md) - AssemblyAI, AI content
- [PHASE-3E-VIDEO-CREATOR-TOOLS.md](./phases/PHASE-3E-VIDEO-CREATOR-TOOLS.md) - Teleprompter, CTA, comments

---

## Digital Asset Management (DAM)

**CRITICAL**: Comprehensive media management for all tenant content including product images, marketing assets, creator content, and ad creatives. All DAM operations must be tenant-isolated.

### Asset Types Supported

| Type | Extensions |
|------|------------|
| **Images** | PNG, JPG, WEBP, GIF, TIFF, RAW, PSD, AI, AVIF |
| **Videos** | MP4, MOV, MXF, WebM, MKV, AVI (with Mux integration) |
| **Audio** | MP3, WAV, M4A, AAC, OGG |
| **Documents** | PDF, DOC, DOCX, XLS, XLSX |

### Core Features

**Asset Library:**
- Grid/list views with filters and full-text search
- Thumbnail generation for all types
- Quality variant tracking (master, full, web, thumbnail, proxy)
- File hash deduplication
- Soft deletes with 30-day trash retention

**Metadata Management:**
- Title, description, custom fields
- Manual and AI-generated tags
- Content classification (hook, testimonial, tutorial, lifestyle, before_after, routine)
- Product association tags, EXIF extraction
- Rights holder and expiration tracking

### Google Drive Integration

**OAuth Connection:** Connect folders for sync, encrypted tokens (AES-256-GCM), auto-refresh

**Sync Modes:**
- **Initial sync**: Full folder scan to import queue
- **Incremental sync**: Changes only via page tokens
- **Push notifications**: Real-time via Drive webhooks (7-day expiry)

**Import Queue:** Review files before importing, batch approve/skip, variant detection, creator suggestion from folder paths

### Collections & Organization

- **Manual collections**: User-curated lists
- **Smart collections**: Rule-based dynamic filtering (asset_type, tags, dates, quality)

### Version Control

- Create snapshot before changes
- View full version history
- Restore to previous version (creates new snapshot)
- Prune old versions (configurable retention)

### Ad Review Workflow

**Project States:** `draft → in_review → approved` (or `→ changes_requested`)

**Features:**
- Multiple reviewers per project
- Per-version review decisions
- Frame-accurate comments with drawing annotations
- Drawing tools: rectangle, circle, arrow, freehand, text
- Consensus approval (all reviewers must approve)

### Rights Management

- **Status tracking**: Active, pending, expired, revoked
- **Expiry monitoring**: Daily job, 7-day advance notifications
- **Auto-actions**: Mark expired, optional auto-archive

### Export Capabilities

| Platform | Integration |
|----------|-------------|
| **TikTok** | Marketing API v1.3 upload |
| **Meta** | Graph API video upload |
| **Manual** | ZIP download (bulk) |

### Collaboration Features

- Threaded comments with @mentions and notifications
- Video timestamp support (click to seek)
- Drawing annotations on video frames
- Multi-channel notifications (email, Slack)
- Per-user notification preferences with quiet hours

### Non-Negotiable Requirements

- All DAM queries use `withTenant(tenantId, ...)`
- OAuth tokens encrypted at rest (AES-256-GCM)
- File hashes computed for deduplication
- Audit logs for all changes
- 30-day trash retention before permanent delete

See phase documents:
- [PHASE-3F-DAM-CORE.md](./phases/PHASE-3F-DAM-CORE.md) - Assets, Drive sync, search, collections
- [PHASE-3F-DAM-WORKFLOWS.md](./phases/PHASE-3F-DAM-WORKFLOWS.md) - Versions, review, rights, exports

---

## Attribution System

**CRITICAL**: The platform includes a comprehensive, Northbeam-inspired multi-touch attribution system with 7 attribution models, 21 admin pages, and advanced analytics including Media Mix Modeling, incrementality testing, and AI-powered insights. All attribution data is strictly tenant-isolated.

### Attribution Overview

The attribution system tracks customer touchpoints across all marketing channels and allocates conversion credit using configurable models. Default behavior mirrors Northbeam: time-decay model, 7-day window, clicks-only mode.

**Key Capabilities:**
- Multi-touch attribution across Meta, Google, TikTok, and organic channels
- 7 attribution models with side-by-side comparison
- 21 admin pages covering all aspects of marketing analytics
- Customer journey visualization
- Media Mix Modeling for budget optimization
- Incrementality testing via geo-holdout experiments
- AI-powered anomaly detection and recommendations

### Attribution Models (7 Total)

| Model | Description | Use Case |
|-------|-------------|----------|
| **First Touch** | 100% credit to first touchpoint | Acquisition focus |
| **Last Touch** | 100% credit to last touchpoint | Conversion focus |
| **Linear** | Equal credit to all touchpoints | Balanced view |
| **Time Decay** | Exponential decay (configurable half-life) | Default - recency weighted |
| **Position-Based** | 40% first, 40% last, 20% middle | Bookend emphasis |
| **Data-Driven** | ML-based Shapley value allocation | Data-optimized (requires training) |
| **Last Non-Direct** | GA4-style: last non-direct touchpoint | GA4 parity |

### Admin Pages (21 Total)

```
/admin/attribution
├── (overview)                    # Main dashboard with KPIs
├── /channels                     # Hierarchical drill-down (channel → campaign → ad)
├── /products                     # Product-level attribution with scatterplot
├── /creatives                    # Card gallery with comparison modal
├── /journeys                     # Customer touchpoint path visualization
├── /cohorts                      # Cohort analysis with LTV curves
├── /model-comparison             # Side-by-side model comparison table
├── /roas-index                   # ROAS by model with AI recommendations
├── /mmm                          # Media Mix Modeling dashboard
├── /incrementality               # Geo-holdout experiment management
├── /ai-insights                  # Automated anomalies and trends
├── /data-quality                 # Tracking health dashboard
├── /pixels                       # Real-time conversion accuracy monitoring
├── /platforms                    # Secondary platform connections (Snap, Pinterest)
├── /influencers                  # Creator/influencer attribution tracking
├── /reports                      # Scheduled PDF report delivery
├── /exports                      # Automated data exports (S3, GCS, webhook)
├── /dashboards                   # Custom dashboard builder
├── /settings                     # Attribution configuration
└── /setup                        # Guided setup wizard
```

### Core Data Flow

```
Touchpoint Capture (pixel/UTM/click ID)
    ↓
Identity Resolution (visitor → customer)
    ↓
Conversion Attribution (order webhook)
    ↓
Model Calculation (all 7 models)
    ↓
Result Storage (per model, per window)
    ↓
Dashboard Aggregation (daily metrics job)
```

### Tracking Strategies

1. **Auto-Tagging (Click IDs)**:
   - Meta: `fbclid` parameter
   - Google: `gclid` parameter
   - TikTok: `ttclid` parameter

2. **Northbeam-Style `nbt` Parameter**:
   ```
   nbt=nb:platform:network:campaignid:adgroupid:adid
   ```

3. **Standard UTM Parameters** (fallback):
   ```
   utm_source, utm_medium, utm_campaign, utm_content, utm_term
   ```

### Attribution Windows

Configurable windows: 1d, 3d, 7d (default), 14d, 28d, 30d, 90d, LTV

### Identity Resolution

- Visitor ID (first-party cookie)
- Customer email hash (SHA-256 with tenant-specific pepper)
- Shopify customer ID
- Device fingerprint
- Cross-device graph linking

### Advanced Analytics

**Media Mix Modeling (MMM):**
- Bayesian regression for channel contribution
- Saturation curve visualization
- Marginal ROI and budget optimization

**Incrementality Testing:**
- Geo-holdout experiment design
- Statistical significance calculation
- Lift measurement with p-values

**AI Insights:**
- Automated anomaly detection
- Trend identification
- Natural language recommendations

### Non-Negotiable Requirements

- All attribution queries use `withTenant(tenantId, ...)`
- Touchpoint data never crosses tenant boundaries
- ML models trained per-tenant (no shared data)
- Email hashes use tenant-specific pepper
- OAuth tokens encrypted at rest (AES-256-GCM)

See phase documents:
- [PHASE-2AT-ATTRIBUTION-CORE.md](./phases/PHASE-2AT-ATTRIBUTION-CORE.md) - Dashboard, settings, data quality, setup
- [PHASE-2AT-ATTRIBUTION-ANALYTICS.md](./phases/PHASE-2AT-ATTRIBUTION-ANALYTICS.md) - Channels, products, creatives, cohorts, ROAS
- [PHASE-2AT-ATTRIBUTION-ADVANCED.md](./phases/PHASE-2AT-ATTRIBUTION-ADVANCED.md) - Journeys, MMM, incrementality, AI insights
- [PHASE-2AT-ATTRIBUTION-INTEGRATIONS.md](./phases/PHASE-2AT-ATTRIBUTION-INTEGRATIONS.md) - Pixels, platforms, influencers, reports, exports

---

## Financial Operations

**CRITICAL**: The platform includes comprehensive financial management for expense tracking, P&L statements, treasury management, gift cards/store credit, and Stripe balance operations. All financial data is tenant-isolated with audit logging.

### Expense Tracking & P&L

Unified expense management aggregating all expense sources:

**Expense Sources:**
- Ad spend (Meta, Google, TikTok - synced from platforms)
- Creator payouts (cash only, not store credit)
- Vendor and contractor payouts
- Operating expenses (manual entries)

**Expense Categories:**
- COGS (cost of goods sold)
- Variable costs (payment processing, fulfillment)
- Marketing (ad spend, creator payouts)
- Operating (SaaS, contractors, vendors)

**Budget Management:**
- Monthly budgets per category
- Budget vs actual variance tracking
- Under/over budget indicators

**P&L Statement Generation:**
```
REVENUE
  Net Sales (Gross - Discounts - Returns + Shipping)

COST OF GOODS SOLD
  Product Cost → Gross Profit (Margin %)

VARIABLE COSTS
  Payment Processing, Shipping, Fulfillment → Contribution Margin

MARKETING & SALES
  Ad Spend, Creator Payouts → Contribution Profit

OPERATING EXPENSES
  (by category) → Operating Income

NET PROFIT (Margin %)
```

**P&L Features:**
- Period selection with quick presets (This Month, YTD, etc.)
- Period comparison (Previous Period, Year-over-Year)
- Expandable categories showing individual items
- P&L inclusion toggle per expense item
- PDF export with tenant branding

### Treasury Management

Draw request workflow for SBA loan and treasury operations:

**Draw Request Flow:**
1. Bundle pending payouts into draw request
2. Generate PDF with line items and signature lines
3. Send to treasurer via email
4. Treasurer approves/rejects via email reply
5. System parses response and updates status
6. Approved requests trigger payouts

**Email-Based Approval:**
- Outbound: PDF attachment, clear approval instructions
- Inbound: Parse for approval/rejection keywords
- Confidence scoring (high/medium/low)
- All communications logged

**Communication Log:**
- Direction (outbound/inbound)
- Parsed status and matched keywords
- Full audit trail

**Receipt Management:**
- Upload receipts/invoices
- Associate with expenses or vendors
- Status tracking (pending, processed, archived)

### Stripe Top-ups & Balance

Platform balance management:

**Balance Operations:**
- View current Stripe balance (available + pending)
- Create top-ups from connected bank accounts
- Track top-up status (pending → succeeded/failed)
- Link top-ups to pending withdrawals

**Funding Sources:**
- List connected bank accounts
- Set default funding source
- Auto top-up configuration (threshold + amount)

**Pending Withdrawals View:**
- Payouts awaiting funding
- Total pending amount
- Link top-ups to cover specific withdrawals

### Gift Cards & Store Credit

Shopify-integrated gift card and store credit system:

**Gift Card Products:**
- Sync products from Shopify
- Track variant IDs for order detection
- Configurable minimum order threshold
- Amount in cents for precision

**Transaction Processing:**
1. Order webhook detects gift card variant
2. Validate order meets minimum threshold
3. Create pending transaction
4. Issue store credit via Shopify Customer API
5. Update status (credited/failed)
6. Queue notification email

**Transaction States:** pending → credited / failed

**Email Queue:**
- Gift card credit confirmations
- Retry on failure with backoff
- Admin notifications (optional)
- Status tracking per email

**Admin Dashboard:**
- Stats overview (issued, credited, pending, failed)
- Product management with Shopify sync
- Transaction list with filters
- Email queue view
- Customizable settings and templates

### Financial Data Isolation

**All financial tables include `tenant_id`:**
- Operating expenses
- Expense categories and budgets
- Treasury draw requests and communications
- Stripe top-ups and settings
- Gift card products, transactions, and emails

**Audit Requirements:**
- All financial mutations logged
- User/action tracking
- Immutable transaction records

### Non-Negotiable Requirements

- All amounts stored as cents (integer) for precision
- P&L calculations performant for 1+ year ranges
- Ad spend synced from external APIs (not manual entry)
- Treasury approvals require email confirmation
- Gift card credits issued via Shopify (single source of truth)
- All data properly tenant-isolated

See phase documents for implementation:
- [PHASE-2H-FINANCIAL-EXPENSES.md](./phases/PHASE-2H-FINANCIAL-EXPENSES.md) - Expense tracking, categories, budgets, P&L
- [PHASE-2H-FINANCIAL-TREASURY.md](./phases/PHASE-2H-FINANCIAL-TREASURY.md) - Treasury management, approvals, receipts
- [PHASE-3G-GIFT-CARDS.md](./phases/PHASE-3G-GIFT-CARDS.md) - Gift cards, store credit, transactions

---

## OAuth Integrations (Ad Platforms)

**CRITICAL**: The platform integrates with major ad platforms for attribution, spend sync, and conversion tracking. All OAuth credentials must be encrypted and tenant-isolated.

### Supported Ad Platform Integrations

| Platform | Auth Type | Key Features |
|----------|-----------|--------------|
| **Meta Ads** | OAuth 2.0 | CAPI, spend sync, 40 scopes |
| **Google Ads** | OAuth 2.0 | GAQL queries, spend sync |
| **TikTok Ads** | OAuth 2.0 | Events API, pixel, spend sync |
| **Klaviyo** | API Key | Email/SMS marketing |

### OAuth Security Requirements

**CSRF Protection (All OAuth Flows):**
- State parameter with cryptographic nonce (16+ bytes)
- HMAC-SHA256 signature using platform secret
- Redis storage with 10-minute TTL
- Validation before token exchange

**Token Encryption (AES-256-GCM):**
- PBKDF2 key derivation with unique salt per token
- Unique IV (16 bytes) per encryption
- AuthTag verification on decryption
- Format: `salt:iv:authTag:encryptedData` (hex)

### Platform-Specific OAuth Details

**Meta Ads:**
- Authorization: `https://www.facebook.com/v21.0/dialog/oauth`
- Token exchange + long-lived token extension (60 days)
- Scopes: `ads_management`, `ads_read`, `business_management`, `conversions_api_access`, 36+ more
- Refresh: Exchange current token for new long-lived token (7 days before expiry)

**Google Ads:**
- Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
- MUST use `access_type=offline` and `prompt=consent` for refresh token
- Scopes: `https://www.googleapis.com/auth/adwords`
- Refresh: Standard OAuth refresh_token flow (5 min before expiry)
- Handle `invalid_grant` for revoked tokens

**TikTok Ads:**
- Authorization: `https://business-api.tiktok.com/open_api/v1.3/oauth2/authorize/`
- Response uses `code=0` for success (not HTTP status)
- Scopes: `advertiser_info`, `ad_account_info`, `campaign_info`, `reporting`
- Tokens expire in 24 hours, refresh via `/oauth2/refresh_token/`

**Klaviyo (API Key):**
- No OAuth - direct API key entry
- Validate format: must start with `pk_`
- Test connection before saving
- Encrypt with same AES-256-GCM pattern

### Token Refresh Schedule

```
Scheduled job: Every 6 hours
├── Meta: Refresh if expiring within 7 days
├── Google: Refresh if expiring within 1 hour
└── TikTok: Refresh if expiring within 1 hour
```

### Multi-Tenant Credential Isolation

- All tokens stored in tenant-scoped tables
- Queries use `withTenant(tenantId, ...)`
- Cache keys prefixed with tenant ID
- No cross-tenant credential access
- Re-auth flows notify tenant admin

### Admin Connection UI

Each platform has admin pages at `/admin/integrations/{platform}`:
- OAuth initiation with scope explanation
- Account/customer selection for multi-account users
- Connection status with sync timestamps
- Token expiry countdown
- Re-auth prompt when needed
- Disconnect with confirmation
- Manual sync trigger

### Error Handling

| Error | Action |
|-------|--------|
| Token expired | Auto-refresh via scheduled job |
| Token revoked | Mark `needs_reauth`, notify admin |
| Rate limited | Exponential backoff |
| Invalid credentials | Mark connection as error |

See phase documents for implementation:
- [PHASE-2PO-OAUTH-INTEGRATIONS.md](./phases/PHASE-2PO-OAUTH-INTEGRATIONS.md) - Complete OAuth flows for Meta, Google, TikTok, Klaviyo
- [PHASE-2P-INTEGRATIONS-ADMIN.md](./phases/PHASE-2P-INTEGRATIONS-ADMIN.md) - Integration hub UI, connection pages, MCP dashboard
- [INTEGRATIONS-CONFIG-SPEC](./INTEGRATIONS-CONFIG-SPEC-2025-02-10.md) - General integration patterns

---

## Customer Portal (White-Label)

**CRITICAL**: Every tenant gets a fully branded customer portal for order history, subscription management, address book, profile, and store credit. The portal is completely customizable - colors, fonts, icons, and all text strings are editable per tenant. This is NOT a hardcoded UI - it's a white-label portal system.

### Portal Architecture

```
/{tenant-slug}/account (or custom domain)
├── (dashboard)                    # Main account dashboard with quick links
├── /login                         # Customer login (OAuth with Shopify)
├── /callback                      # OAuth callback handler
├── /orders                        # Order history list with pagination
├── /orders/[id]                   # Order details with tracking
├── /subscriptions                 # Subscription list with status
├── /subscriptions/[id]            # Full subscription management
├── /addresses                     # Address book CRUD
├── /profile                       # Personal information
├── /store-credit                  # Balance and transaction history
├── /rewards                       # Loyalty points (if enabled)
├── /referrals                     # Referral program (if enabled)
└── /settings                      # Communication preferences
```

### OAuth Authentication (Shopify Customer Account API)

**PKCE Security Flow:**
- Authorization endpoint per Shopify store
- Code verifier + challenge generation (S256)
- State parameter for CSRF protection
- Nonce verification in ID token
- Secure token storage (HTTP-only cookies)

**Token Management:**
- Access token refresh before expiry
- Automatic refresh on API calls
- Logout with Shopify session termination
- Post-login redirect to original destination

### Portal Dashboard

**Personalized Experience:**
- Welcome message with customer name
- Quick stats: active subscriptions, pending orders, credit balance
- Quick access cards to all enabled portal sections
- Feature cards only show for sections tenant has enabled

**Dashboard Cards:**
| Card | Icon | Description |
|------|------|-------------|
| Orders | PackageIcon | View order history and track shipments |
| Subscriptions | RefreshIcon | Manage recurring orders |
| Addresses | MapPinIcon | Manage delivery addresses |
| Profile | UserIcon | Update account information |
| Store Credit | WalletIcon | View balance (shows amount if > $0) |
| Rewards | StarIcon | Loyalty points (if enabled) |
| Referrals | GiftIcon | Referral program (if enabled) |

### Order History & Details

**Order List:**
- Paginated list with all customer orders
- Order number, date, products, status, total
- Color-coded status badges
- Subscription order badge for recurring orders
- Empty state with shop call-to-action

**Order Details:**
- Line items with images, titles, variants, quantities, prices
- Order tracking with carrier links
- Price breakdown (subtotal, shipping, tax, discounts, total)
- Shipping and billing addresses
- Support contact link

### Subscription Management

**Subscription List:**
- All subscriptions with status display
- Status: ACTIVE, PAUSED, CANCELLED, EXPIRED
- Next delivery date for active subscriptions
- Frequency display (e.g., "Every 2 weeks")
- Product thumbnails and titles
- Last order and next order information

**Subscription Details:**
- Full subscription information
- Subscribed products with images, variants, quantities
- Applied discounts displayed
- Order history for this subscription
- Next order preview with pricing breakdown

**Management Actions (status-dependent):**

| Action | Status | Description |
|--------|--------|-------------|
| Pause | ACTIVE | Temporarily pause deliveries |
| Skip | ACTIVE | Skip next order |
| Reschedule | ACTIVE | Change next delivery date (date picker modal) |
| Order Now | ACTIVE | Immediate charge |
| Resume | PAUSED | Resume paused subscription |
| Cancel | ACTIVE, PAUSED | With reason selection modal |
| Reactivate | CANCELLED | Resume cancelled subscription |
| Update Payment | ACTIVE, PAUSED | Change payment method (modal) |
| Manage Addresses | ACTIVE, PAUSED | Link to address management |

### Address Management

**Address List:**
- Grid display of saved addresses
- Default address badge
- Edit and delete actions per address
- "Add New Address" button

**Address-Subscription Sync:**
- Updating default address applies to subscription deliveries
- Clear messaging about subscription impact
- State/province dropdown populated by country

### Store Credit

**Balance Display:**
- Prominent balance box with amount
- "Available to use at checkout" messaging

**Transaction History:**
- Date, type, amount, running balance
- Transaction types: Credit Added, Credit Used, Expired, Refunded
- Empty state messaging

### Optional Portal Sections

**Rewards/Loyalty (if enabled):**
- Points balance display
- Points history (earned, redeemed)
- Available rewards to redeem
- Tier status (if tiered program)

**Referrals (if enabled):**
- Unique referral code/link
- Share buttons (email, social)
- Referral stats (invited, converted, earned)

---

## Portal Theming & Customization

**CRITICAL**: The portal is fully white-labeled. NO hardcoded branding or text. Everything is customizable per tenant.

### Theme Settings

**Colors:**
| Setting | Description |
|---------|-------------|
| Primary Color | Buttons, links, accents |
| Secondary Color | Hover states, badges |
| Background Color | Page background |
| Card Background | Card/section backgrounds |
| Text Color | Body text |
| Border Color | Card and section borders |
| Success/Warning/Error/Info | Status colors |

**Typography:**
| Setting | Description |
|---------|-------------|
| Font Family | Body text font (upload custom or library) |
| Heading Font | Heading font family |
| Base Font Size | Default font size |
| Line Height | Line spacing |

**Branding:**
| Setting | Description |
|---------|-------------|
| Logo | Header logo (upload) |
| Favicon | Browser tab icon |
| Portal Title | Custom portal name |

### Icon Customization

Each portal section has a customizable icon:

**Icon Options:**
1. **Upload Custom**: SVG file upload
2. **Choose from Library**: 50+ pre-built icons

**Default Icons (from RAWDOG reference):**
- Orders: `PackageIcon`
- Subscriptions: `RefreshIcon`
- Addresses: `MapPinIcon`
- Profile: `UserIcon`
- Store Credit: `WalletIcon`
- Empty States: `EmptyBoxIcon`

### Content Customization

**ALL text strings are editable:**
- Page titles and headings
- Button labels
- Empty state messages
- FAQ content
- Legal links (terms, privacy)
- Support contact info
- Welcome messages
- Error messages

**Variable Substitution:**
- `{{customerName}}` - Customer's first name
- `{{balanceAmount}}` - Store credit balance
- `{{subscriptionId}}` - Subscription ID
- `{{nextOrderDate}}` - Next subscription date

### Feature Toggles

**Core Features (always enabled):**
- Orders, Subscriptions, Addresses, Profile

**Optional Features (toggle per tenant):**
- Store Credit section
- Rewards/Loyalty section
- Referrals section
- Communication preferences

**Subscription Action Toggles:**
| Action | Default | Description |
|--------|---------|-------------|
| Pause | Enabled | Allow customers to pause |
| Skip | Enabled | Allow skipping orders |
| Cancel | Enabled | Allow self-service cancel |
| Reschedule | Enabled | Allow date changes |
| Reactivate | Enabled | Allow reactivation |
| Update Payment | Enabled | Allow payment method changes |

---

## Portal Admin Pages

```
/admin/portal
├── /theme                         # Colors, fonts, layout editor
├── /icons                         # Icon customization
├── /content                       # Text strings and labels
├── /features                      # Feature toggles
├── /domain                        # Custom domain setup
├── /analytics                     # Portal usage analytics
└── /preview                       # Live preview as customer
```

### Domain Configuration

**Domain Options:**
1. **Platform Subdomain**: `{tenant}.platform.com/account`
2. **Tenant Domain Path**: `{tenant-domain}/account`
3. **Custom Portal Domain**: `account.{tenant-domain}`

**Custom Domain Setup:**
- Domain input
- DNS instructions (CNAME/A records)
- SSL certificate provisioning (auto via Let's Encrypt)
- Verification status

---

## Subscription Provider Integration

**CRITICAL**: The platform supports multiple subscription providers. Each tenant connects to their chosen provider.

### Supported Providers

| Provider | Integration Type | Features |
|----------|-----------------|----------|
| **Loop** | REST API | Full lifecycle, custom widget |
| **Recharge** | REST API | Full lifecycle |
| **Bold** | REST API | Full lifecycle |
| **Custom** | Platform-native | Built-in subscription engine |

### Provider Abstraction Layer

```typescript
interface SubscriptionProvider {
  listSubscriptions(customerId: string): Promise<Subscription[]>
  getSubscription(id: string): Promise<Subscription>
  pauseSubscription(id: string): Promise<Subscription>
  resumeSubscription(id: string): Promise<Subscription>
  cancelSubscription(id: string, reasonId: number): Promise<Subscription>
  reactivateSubscription(id: string): Promise<Subscription>
  skipNextOrder(id: string): Promise<Subscription>
  rescheduleSubscription(id: string, newDate: Date): Promise<Subscription>
  placeOrderNow(id: string): Promise<Subscription>
  getOrderHistory(id: string): Promise<Order[]>
  getPaymentMethods(customerId: string): Promise<PaymentMethod[]>
  changePaymentMethod(subId: string, methodId: string): Promise<Subscription>
  getCancellationReasons(): Promise<CancellationReason[]>
}
```

---

## Portal Database Schema

```sql
-- Theme settings
CREATE TABLE portal_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  colors JSONB NOT NULL DEFAULT '{}',
  typography JSONB NOT NULL DEFAULT '{}',
  branding JSONB NOT NULL DEFAULT '{}',
  layout JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Icons
CREATE TABLE portal_icons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  icon_key TEXT NOT NULL,
  icon_type TEXT NOT NULL, -- 'library' or 'custom'
  icon_value TEXT NOT NULL,
  UNIQUE(tenant_id, icon_key)
);

-- Content
CREATE TABLE portal_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  content_key TEXT NOT NULL,
  content_value TEXT NOT NULL,
  UNIQUE(tenant_id, content_key)
);

-- Feature flags
CREATE TABLE portal_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}',
  UNIQUE(tenant_id, feature_key)
);

-- Domain configuration
CREATE TABLE portal_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  domain_type TEXT NOT NULL,
  custom_domain TEXT,
  ssl_status TEXT DEFAULT 'pending',
  dns_verified BOOLEAN DEFAULT false,
  UNIQUE(tenant_id)
);
```

---

## Portal Non-Negotiable Requirements

- All pages in RAWDOG portal must be available
- Theme editor with colors, fonts, layout
- Icon customization (upload or library)
- All text strings editable in admin
- Feature toggles for optional sections
- Custom domain support
- Shopify Customer Account API OAuth with PKCE
- Complete tenant isolation
- Per-tenant theming, feature flags, content

See phase documents for implementation:
- [PHASE-3CP-PORTAL-PAGES.md](./phases/PHASE-3CP-PORTAL-PAGES.md) - Pages, auth, Shopify integration
- [PHASE-3CP-PORTAL-THEMING.md](./phases/PHASE-3CP-PORTAL-THEMING.md) - Theme, icons, content customization
- [PHASE-3CP-PORTAL-ADMIN.md](./phases/PHASE-3CP-PORTAL-ADMIN.md) - Admin pages for configuration
- [PHASE-3CP-PORTAL-SUBSCRIPTIONS.md](./phases/PHASE-3CP-PORTAL-SUBSCRIPTIONS.md) - Subscription provider integration

---

## Success Criteria

### Technical
- [ ] Full tenant data isolation (audit-ready)
- [ ] Brand divorce in < 24 hours
- [ ] Shared codebase updates deploy to all brands
- [ ] Zero-downtime deployments
- [ ] < 100ms API response times (p95)

### Cost
- [ ] 40% reduction in monthly infrastructure costs
- [ ] Predictable per-brand cost allocation
- [ ] No surprise Vercel bills

### Business
- [ ] Onboard new brand in < 1 week
- [ ] Transfer brand ownership in < 48 hours
- [ ] Maintain feature velocity across brands

---

## Risk Assessment

### High Risk
1. **Migration Complexity**: Moving existing RAWDOG data to new schema
   - Mitigation: Parallel run period, comprehensive data validation

2. **Multi-tenant Security**: Ensuring complete data isolation
   - Mitigation: Row-level security, schema separation, security audit

### Medium Risk
3. **Background Jobs Rebuild**: 199 async workflows need reliable execution
   - Mitigation: Evaluate providers, build abstraction layer, gradual migration

4. **Wise Integration**: New payment provider
   - Mitigation: Start with single brand, expand after validation

### Low Risk
5. **MCP Transport Change**: SSE to Streamable HTTP
   - Mitigation: Support both during transition

---

## Timeline Overview

| Phase | Duration | Focus |
|-------|----------|-------|
| **Phase 0** | 2 weeks | **Portability Setup** (repo structure, CLI, README, templates) |
| Phase 1 | 4 weeks | Foundation (database, auth, core packages) |
| Phase 2 | 3 weeks | Brand Admin Portal (white-label base) |
| Phase 2A | 3 weeks | Super Admin Dashboard (Orchestrator) |
| Phase 2B | 3 weeks | Platform Operations (Health, Logs, Flags, Onboarding) |
| **Phase 2AI** | 5.5 weeks | **AI Assistant System** (agents, memory, voice, integrations, teams) |
| **Phase 2SC** | 2.5 weeks | **Scheduling & Booking** (events, availability, teams, calendar) |
| **Phase 2SP** | 2.5 weeks | **Support & Help Desk** (tickets, KB, chat, CSAT, privacy) |
| **Phase 2H** | 3.5 weeks | **Productivity & Workflows** (tasks, projects, workflow engine, smart inbox) |
| **Phase 2D** | 2 weeks | **Financial Operations** (expenses, P&L, treasury, Stripe top-ups) |
| Phase 3 | 4 weeks | Storefront (multi-tenant Shopify) |
| **Phase 3G** | 1 week | **Gift Cards & Store Credit** (products, transactions, emails) |
| Phase 4 | 8.5 weeks | Creator Portal + Payments + Vendor Management + **Contractor Portal** + **Admin Analytics** |
| Phase 5 | 3 weeks | Background Jobs (async workflows) |
| Phase 6 | 2 weeks | MCP Rebuild (Streamable HTTP) |
| Phase 7 | 3 weeks | Migration + Testing |

**Total**: ~48.5 weeks (12 months)

**Note**: Phase 0 establishes the portable, installable foundation before any code is written. Phase 2, 2A, 2B, 2AI, 2SC, 2SP, 2H, and 2D can overlap - they depend on Phase 2 shell but can run in parallel with each other. Phase 3G depends on Phase 3A (Storefront Foundation) and Phase 3B (Cart/Checkout).

---

## Cost Projections

### Current Monthly Costs
- Vercel: $300-400
- Neon: $50-100
- Upstash: $30-50
- Trigger.dev: $50-100
- Other services: $50-100
- **Total**: $500-650/month

### Projected Monthly Costs (3 brands)
- Vercel (optimized): $200-250
- Neon (shared): $75-100
- Upstash (shared): $40-60
- Background jobs: $40-80 (provider TBD)
- Wise (if used): Variable per transfer
- **Total**: $355-490/month
- **Per Brand**: ~$120-165/month

---

## Required Skills & Tools

### AI Agent Skills (Pre-installed)

The following skills MUST be used during development:

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `anthropics/skills@frontend-design` | Production-grade UI with high design quality | **ALL React component development** - See `FRONTEND-DESIGN-SKILL-GUIDE.md` |
| `anthropics/skills@mcp-builder` | MCP server best practices and patterns | Phase 6 - MCP rebuild |
| `anthropics/skills@webapp-testing` | Playwright-based web app testing | E2E testing (Phases 2, 3, 7) |
| `upstash/context7@documentation-lookup` | Library/framework best practices lookup | Before implementing with any library |
| `obra/superpowers@writing-plans` | Structured plan writing | Plan mode and architecture decisions |
| `obra/superpowers@executing-plans` | Systematic plan execution | Following phase implementation guides |
| `obra/superpowers@test-driven-development` | TDD methodology | All new feature development |

**CRITICAL**: For the `/frontend-design` skill, see `FRONTEND-DESIGN-SKILL-GUIDE.md` which contains:
- Detailed component prompts for each UI-intensive phase
- Phase-specific guidance (Admin, Super Admin, Storefront, Creator Portal)
- Anti-patterns and verification checklists

### Install Command
```bash
npx skills add anthropics/skills@frontend-design -g -y
npx skills add anthropics/skills@mcp-builder -g -y
npx skills add anthropics/skills@webapp-testing -g -y
npx skills add upstash/context7@documentation-lookup -g -y
npx skills add obra/superpowers@writing-plans -g -y
npx skills add obra/superpowers@executing-plans -g -y
npx skills add obra/superpowers@test-driven-development -g -y
```

### MCP Tools

| Tool | Purpose |
|------|---------|
| Context7 MCP | Documentation lookup for coding best practices |
| Shopify Dev MCP | **REQUIRED** for all Shopify work - schema introspection, validation |

### Shopify Dev MCP Usage

**ALWAYS use Shopify Dev MCP for any Shopify development:**

```typescript
// Step 1: Learn the API
mcp__shopify-dev-mcp__learn_shopify_api(api: "admin")

// Step 2: Explore schema
mcp__shopify-dev-mcp__introspect_graphql_schema(query: "orders")

// Step 3: Validate GraphQL
mcp__shopify-dev-mcp__validate_graphql_codeblocks(codeblocks: [...])
```

### Shopify Function Architecture (from RAWDOG)

For checkout customizations, use Rust/WASM Functions:
- **Language**: Rust compiled to `wasm32-wasip1`
- **Dependencies**: `shopify_function = "0.8"`, `serde`
- **Build**: `cargo build --target=wasm32-wasip1 --release`
- **Pattern**: See ARCHITECTURE.md for full structure

OAuth with encrypted token storage (AES-256-GCM) in PostgreSQL + Redis fallback.

### Skill Usage Guidelines

1. **Frontend Development**: Always invoke `/frontend-design` before building React components
2. **MCP Server Work**: Always invoke `/mcp-builder` and read the reference files before implementing MCP tools
3. **Testing**: Use `/webapp-testing` for all E2E test creation
4. **Documentation Lookup**: Use Context7 MCP to look up library documentation before implementation
5. **Planning**: Use `obra/superpowers` skills for structured planning and execution

### Agent-First Development

**CRITICAL**: Always prefer spawning sub-agents to conserve context and enable parallel work.

| Use Case | Agent Type | Benefit |
|----------|------------|---------|
| Codebase exploration | `Explore` | Keeps main context clean |
| Architecture decisions | `Plan` | Focused expert analysis |
| Multiple parallel tasks | Multiple agents | Faster execution |
| Expert panel review | Multiple `Plan` agents | Diverse perspectives |

See [ARCHITECTURE.md](./ARCHITECTURE.md#agent-architecture) for pre-defined agent prompts.

### Type Checking

**ALWAYS use `tsc --noEmit` instead of `npm run build`** - it's 2-5x faster and sufficient for development validation.

### Tech Debt Prevention

**Clean as you go** - Never leave tech debt:
- Delete unused imports and commented code
- Replace `any` with specific types
- No TODOs without tracking issues
- Extract duplicate code (3+ occurrences)

### Documentation Standards

**All docs go in `/docs/` with dates:**
```
/docs/[FEATURE]-PLAN/
├── PLAN-2025-02-10.md
├── ARCHITECTURE-2025-02-10.md
└── PHASE-1-*.md
```

**Phase progress tracking:**
- Check off items: `- [x] Task (2025-02-10)`
- Update status at file top
- Log decisions and blockers

---

## Next Steps

1. Review and approve this master plan
2. Ensure all required skills are installed (`npx skills list`)
3. Review PROMPT.md for AI agent context
4. Review individual phase documents
5. Prioritize phases based on business needs
6. Begin Phase 1 implementation

---

## Document Index

### How to Use These Documents

**For Agents Starting Work**:
1. Read this PLAN.md (you're here)
2. Read PROMPT.md for implementation patterns and constraints
3. Read the relevant PHASE-*.md for your assigned phase
4. Reference CODEBASE-ANALYSIS/ files as needed during implementation

**For Understanding Current State**:
→ Start with `CODEBASE-ANALYSIS/ANALYSIS-SUMMARY-2025-02-10.md`

---

### Core Planning (Read First)
| Doc | Purpose | When to Read |
|-----|---------|--------------|
| **PLAN.md** (this file) | Master plan, goals, decisions | First |
| **PROMPT.md** | Agent context, patterns, constraints | Before any implementation |
| **ARCHITECTURE.md** | Technical architecture details | Before any implementation |
| **FRONTEND-DESIGN-SKILL-GUIDE.md** | How to use /frontend-design skill | Before ANY UI component work (Phases 2-4) |

### Phase Implementation (Read for Your Phase)
| Phase | Duration | Focus |
|-------|----------|-------|
| [PHASE-0-PORTABILITY.md](./PHASE-0-PORTABILITY.md) | 2 weeks | **NEW: Repo setup, CLI, README, templates** |
| [PHASE-0B-DATABASE-SETUP-UX.md](./phases/PHASE-0B-DATABASE-SETUP-UX.md) | Anytime | **NEW: Database setup UX improvements for portable installation** |
| [PHASE-1-FOUNDATION.md](./PHASE-1-FOUNDATION.md) | 4 weeks | Monorepo, database, auth, core packages |
| [PHASE-2-ADMIN.md](./PHASE-2-ADMIN.md) | 3 weeks | Brand Admin portal shell (white-label base) |
| [PHASE-2A-SUPER-ADMIN.md](./PHASE-2A-SUPER-ADMIN.md) | 3 weeks | Super Admin Dashboard (Orchestrator) |
| [PHASE-2B-PLATFORM-OPS.md](./PHASE-2B-PLATFORM-OPS.md) | 3 weeks | Health, Logging, Flags, Onboarding |
| [PHASE-2PO-OAUTH-INTEGRATIONS.md](./phases/PHASE-2PO-OAUTH-INTEGRATIONS.md) | 1 week | **NEW: Meta/Google/TikTok OAuth, Klaviyo API, token encryption** |
| [PHASE-2P-INTEGRATIONS-ADMIN.md](./phases/PHASE-2P-INTEGRATIONS-ADMIN.md) | 1 week | **NEW: Integration hub UI, connection pages, MCP dashboard** |
| [PHASE-2E-TEAM-MANAGEMENT.md](./phases/PHASE-2E-TEAM-MANAGEMENT.md) | 1.5 weeks | **NEW: Team invitations, member management** |
| [PHASE-2F-RBAC.md](./phases/PHASE-2F-RBAC.md) | 1.5 weeks | **NEW: Role-based access control, permissions** |
| [PHASE-2G-CONTEXT-SWITCHING.md](./phases/PHASE-2G-CONTEXT-SWITCHING.md) | 0.5 weeks | **NEW: Multi-tenant context switching** |
| [PHASE-2SA-USERS.md](./phases/PHASE-2SA-USERS.md) | 1 week | **NEW: Super admin user management** |
| [PHASE-2D-ADMIN-FINANCE.md](./phases/PHASE-2D-ADMIN-FINANCE.md) | 1 week | Creators, payouts, treasury, expenses |
| [PHASE-2D-PL-CONFIGURATION.md](./phases/PHASE-2D-PL-CONFIGURATION.md) | 1 week | **NEW: P&L customization, COGS config, variable costs per tenant** |
| [PHASE-2H-FINANCIAL-EXPENSES.md](./phases/PHASE-2H-FINANCIAL-EXPENSES.md) | 1 week | **NEW: Expense tracking, categories, budgets, P&L statement** |
| [PHASE-2H-FINANCIAL-TREASURY.md](./phases/PHASE-2H-FINANCIAL-TREASURY.md) | 1 week | **NEW: Treasury management, draw requests, approvals, Stripe top-ups** |
| [PHASE-2AI-CORE.md](./phases/PHASE-2AI-CORE.md) | 1.5 weeks | **NEW: AI agents, personality, autonomy, action logging** |
| [PHASE-2AI-MEMORY.md](./phases/PHASE-2AI-MEMORY.md) | 1.5 weeks | **NEW: RAG, embeddings, training, learning** |
| [PHASE-2AI-VOICE.md](./phases/PHASE-2AI-VOICE.md) | 1 week | **NEW: TTS/STT, voice calls, Retell integration** |
| [PHASE-2AI-INTEGRATIONS.md](./phases/PHASE-2AI-INTEGRATIONS.md) | 1.5 weeks | **NEW: Slack, Calendar, Email, SMS integrations** |
| [PHASE-2AI-TEAMS.md](./phases/PHASE-2AI-TEAMS.md) | 1 week | **NEW: Multi-agent teams, org chart, handoffs** |
| [PHASE-2CM-SLACK-INTEGRATION.md](./phases/PHASE-2CM-SLACK-INTEGRATION.md) | 1.5 weeks | **NEW: Slack OAuth, channel mapping, scheduled reports, ops alerts** |
| [PHASE-2SC-SCHEDULING-CORE.md](./phases/PHASE-2SC-SCHEDULING-CORE.md) | 1.5 weeks | **NEW: Event types, availability, bookings, calendar** |
| [PHASE-2SC-SCHEDULING-TEAM.md](./phases/PHASE-2SC-SCHEDULING-TEAM.md) | 1 week | **NEW: Team scheduling, round-robin, analytics** |
| [PHASE-2SP-SUPPORT-TICKETS.md](./phases/PHASE-2SP-SUPPORT-TICKETS.md) | 1.5 weeks | **NEW: Ticket management, agents, SLA, sentiment** |
| [PHASE-2SP-SUPPORT-KB.md](./phases/PHASE-2SP-SUPPORT-KB.md) | 1 week | **NEW: Knowledge base articles, search** |
| [PHASE-2SP-SUPPORT-CHANNELS.md](./phases/PHASE-2SP-SUPPORT-CHANNELS.md) | 1.5 weeks | **NEW: Live chat, CSAT, privacy compliance** |
| [PHASE-2AT-ATTRIBUTION-CORE.md](./phases/PHASE-2AT-ATTRIBUTION-CORE.md) | 1 week | **NEW: Dashboard, settings, data quality, setup wizard** |
| [PHASE-2AT-ATTRIBUTION-ANALYTICS.md](./phases/PHASE-2AT-ATTRIBUTION-ANALYTICS.md) | 1.5 weeks | **NEW: Channels, products, creatives, cohorts, ROAS index, model comparison** |
| [PHASE-2AT-ATTRIBUTION-ADVANCED.md](./phases/PHASE-2AT-ATTRIBUTION-ADVANCED.md) | 1.5 weeks | **NEW: Journeys, MMM, incrementality, AI insights** |
| [PHASE-2AT-ATTRIBUTION-INTEGRATIONS.md](./phases/PHASE-2AT-ATTRIBUTION-INTEGRATIONS.md) | 1 week | **NEW: Pixels, platforms, influencers, reports, exports, dashboards** |
| [PHASE-3-STOREFRONT.md](./PHASE-3-STOREFRONT.md) | 4 weeks | Headless Shopify, cart, checkout |
| [PHASE-3E-VIDEO-CORE.md](./phases/PHASE-3E-VIDEO-CORE.md) | 1.5 weeks | **NEW: Mux video hosting, uploads, playback, permissions** |
| [PHASE-3E-VIDEO-TRANSCRIPTION.md](./phases/PHASE-3E-VIDEO-TRANSCRIPTION.md) | 1 week | **NEW: AssemblyAI transcription, AI content generation** |
| [PHASE-3E-VIDEO-CREATOR-TOOLS.md](./phases/PHASE-3E-VIDEO-CREATOR-TOOLS.md) | 1 week | **NEW: Teleprompter, trimming, CTA, comments, SSE** |
| [PHASE-3F-DAM-CORE.md](./phases/PHASE-3F-DAM-CORE.md) | 1.5 weeks | **NEW: Asset library, Google Drive sync, search, collections** |
| [PHASE-3F-DAM-WORKFLOWS.md](./phases/PHASE-3F-DAM-WORKFLOWS.md) | 1.5 weeks | **NEW: Versions, ad review, rights, TikTok/Meta export** |
| [PHASE-3G-GIFT-CARDS.md](./phases/PHASE-3G-GIFT-CARDS.md) | 1 week | **NEW: Gift cards, store credit, transactions, email notifications** |
| [PHASE-4-CREATOR.md](./PHASE-4-CREATOR.md) | 5.5 weeks | Creator portal, Stripe + Wise payments |
| [PHASE-4A-CREATOR-PORTAL.md](./phases/PHASE-4A-CREATOR-PORTAL.md) | 2 weeks | **EXPANDED: Dashboard, messaging inbox, profile/security/notification settings, password reset, help/FAQ** |
| [PHASE-4A-CREATOR-ONBOARDING-FLOW.md](./phases/PHASE-4A-CREATOR-ONBOARDING-FLOW.md) | 1 week | **NEW: 4-step application form, auto-save drafts, teleprompter, welcome call scheduling** |
| [PHASE-4A-CREATOR-ANALYTICS.md](./phases/PHASE-4A-CREATOR-ANALYTICS.md) | 0.5 weeks | **NEW: Earnings analytics, trend charts, tax summaries, data export (CSV/PDF)** |
| [PHASE-4A-CREATOR-BRAND-PREFERENCES.md](./phases/PHASE-4A-CREATOR-BRAND-PREFERENCES.md) | 0.5 weeks | **NEW: Per-brand settings, discount code sharing, notification overrides** |
| [PHASE-4B-CREATOR-PAYMENTS.md](./phases/PHASE-4B-CREATOR-PAYMENTS.md) | 1.5 weeks | **EXPANDED: Payout methods settings UI, payments dashboard, withdrawal modal, store credit, earnings breakdown** |
| [PHASE-4C-CREATOR-PROJECTS.md](./phases/PHASE-4C-CREATOR-PROJECTS.md) | 1 week | Project management, content delivery |
| [PHASE-4D-CREATOR-TAX.md](./phases/PHASE-4D-CREATOR-TAX.md) | 2 weeks | **EXPANDED: W-9, multi-payee 1099 (NEC/MISC/K), IRIS filing, corrections, state filing, audit logging, admin dashboard** |
| [PHASE-4E-VENDOR-MANAGEMENT.md](./phases/PHASE-4E-VENDOR-MANAGEMENT.md) | 0.5 week | Vendor portal, invoice submission, admin mgmt |
| [PHASE-4F-CONTRACTOR-PORTAL-CORE.md](./phases/PHASE-4F-CONTRACTOR-PORTAL-CORE.md) | 1.5 weeks | **NEW: Contractor auth, 6-stage Kanban, project management** |
| [PHASE-4F-CONTRACTOR-PAYMENTS.md](./phases/PHASE-4F-CONTRACTOR-PAYMENTS.md) | 1 week | **NEW: Invoice submission, payout methods, Stripe Connect, W-9** |
| [PHASE-4F-CONTRACTOR-ADMIN.md](./phases/PHASE-4F-CONTRACTOR-ADMIN.md) | 0.5 week | **NEW: Contractor directory, detail pages, project assignment, approval workflow** |
| [PHASE-4G-CREATOR-ADMIN-ANALYTICS.md](./phases/PHASE-4G-CREATOR-ADMIN-ANALYTICS.md) | 1 week | **NEW: Admin creator analytics, performance tracking, health dashboard** |
| [PHASE-2U-ADMIN-UTILITIES.md](./phases/PHASE-2U-ADMIN-UTILITIES.md) | 1 week | **NEW: Gallery moderation, Stripe top-ups, system sync, changelog** |
| [PHASE-5-JOBS.md](./PHASE-5-JOBS.md) | 3 weeks | **Background jobs rebuild** |
| [PHASE-6-MCP.md](./PHASE-6-MCP.md) | 2 weeks | MCP Streamable HTTP rebuild |
| [PHASE-7-MIGRATION.md](./PHASE-7-MIGRATION.md) | 3 weeks | Data migration, testing, cutover |

### Codebase Analysis (Reference During Implementation)
| Doc | Content |
|-----|---------|
| [ANALYSIS-SUMMARY](./CODEBASE-ANALYSIS/ANALYSIS-SUMMARY-2025-02-10.md) | Executive summary, key metrics |
| [DATABASE-SCHEMA](./CODEBASE-ANALYSIS/DATABASE-SCHEMA-2025-02-10.md) | 28 modules, 100+ tables |
| [AUTOMATIONS-TRIGGER-DEV](./CODEBASE-ANALYSIS/AUTOMATIONS-TRIGGER-DEV-2025-02-10.md) | 199 background tasks (rebuild reference) |
| [API-ROUTES](./CODEBASE-ANALYSIS/API-ROUTES-2025-02-10.md) | 1,032 routes mapped |
| [INTEGRATIONS](./CODEBASE-ANALYSIS/INTEGRATIONS-2025-02-10.md) | 24+ third-party services |
| [ADMIN-FEATURES](./CODEBASE-ANALYSIS/ADMIN-FEATURES-2025-02-10.md) | 60+ admin sections |
| [ENV-VARS](./CODEBASE-ANALYSIS/ENV-VARS-2025-02-10.md) | Environment variables |
| [UI-PREVIEW](./CODEBASE-ANALYSIS/UI-PREVIEW-2025-02-10.md) | ASCII mockups |

### Specifications (Reference for Specific Features)
| Spec | For Phase | Purpose |
|------|-----------|---------|
| [PLATFORM-SETUP-SPEC](./PLATFORM-SETUP-SPEC-2025-02-10.md) | Phase 0 | First-run wizard, Vercel integrations |
| [SUPER-ADMIN-ARCHITECTURE](./SUPER-ADMIN-ARCHITECTURE-2025-02-10.md) | Phase 2A | Orchestrator dashboard design |
| [HEALTH-MONITORING-SPEC](./HEALTH-MONITORING-SPEC-2025-02-10.md) | Phase 2B | 15+ service monitors, alerting |
| [LOGGING-SPEC](./LOGGING-SPEC-2025-02-10.md) | Phase 2B | PlatformLogger, error aggregation |
| [FEATURE-FLAGS-SPEC](./FEATURE-FLAGS-SPEC-2025-02-10.md) | Phase 2B | 6 flag types, evaluation logic |
| [DOMAIN-SHOPIFY-CONFIG-SPEC](./DOMAIN-SHOPIFY-CONFIG-SPEC-2025-02-10.md) | Phase 2PO, 3 | Domains, Shopify headless, product sync |
| [INTEGRATIONS-CONFIG-SPEC](./INTEGRATIONS-CONFIG-SPEC-2025-02-10.md) | Phase 2PO | 24+ integrations, OAuth/API key patterns |
| [BRAND-ONBOARDING-SPEC](./BRAND-ONBOARDING-SPEC-2025-02-10.md) | Phase 2PO | 9-step wizard for new tenants |
| [COMMERCE-PROVIDER-SPEC](./COMMERCE-PROVIDER-SPEC-2025-02-10.md) | Phase 1, 3 | Dual checkout (Shopify + Custom) |
| [PAYEE-TYPE-MODEL-SPEC](./PAYEE-TYPE-MODEL-SPEC.md) | Phase 4 | **NEW: Creator vs Contractor vs Vendor comparison, shared payee infrastructure** |

### Templates
- [CLAUDE-MD-TEMPLATE.md](./CLAUDE-MD-TEMPLATE.md) - New project CLAUDE.md template

---

## References

- [Multi-Tenant Architecture Best Practices](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/)
- [Hydrogen vs Next.js Comparison](https://commerce-ui.com/insights/hydrogen-vs-nextjs-how-to-choose-a-shopify-headless-stack)
- [Stripe vs Wise for Payouts](https://wise.com/us/blog/stripe-international)
- [Trigger.dev vs Inngest](https://medium.com/@matthieumordrel/the-ultimate-guide-to-typescript-orchestration-temporal-vs-trigger-dev-vs-inngest-and-beyond-29e1147c8f2d)
- [MCP Streamable HTTP](https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/)
