# Gap Remediation Prompts - Complete Feature Parity

> **Purpose**: 37 prompts to bring the Multi-Tenant Platform Plan to 100% feature parity with RAWDOG.
> **Total Prompts**: 37 (+ 1 integration prompt = 38 files)
> **Philosophy**: Focus on WHAT (outcomes, definitions of done) - let AI decide HOW

---

## Feature Coverage Summary

| Category | Admin Pages | Before | After All Prompts |
|----------|-------------|--------|-------------------|
| **Attribution** | 20 pages | 40% | 100% |
| **A/B Testing** | 5+ pages | 45% | 100% |
| **Commerce** | 50+ pages | 70% | 100% |
| **Creators Admin** | 20+ pages | 60% | 100% |
| **Creator Portal** | 15+ pages | 47% | 100% |
| **Contractor Portal** | 10+ pages | 0% | 100% |
| **Vendor Portal** | 8+ pages | 0% | 100% |
| **Integrations** | 15+ pages | 50% | 100% |
| **Operations** | 10+ pages | 80% | 100% |
| **AI/BRI** | 15+ pages | 30% | 100% |
| **Shopify App** | Extensions + Scopes | 60% | 100% |
| **Communications** | Queues + Templates | 0% | 100% |
| **Customer Portal** | 10+ pages | 0% | 100% |
| **User Provisioning** | RBAC + Multi-Tenant | 0% | 100% |
| **Other Admin** | 30+ pages | 60% | 100% |

---

## Execution Strategy

### 🚨 EXECUTION ORDER

```
PHASE 1: SEQUENTIAL (Run First - Foundation)
├── SEQUENTIAL-01-USER-PROVISIONING-MULTI-TENANT-ACCESS.md  ← Run FIRST
└── SEQUENTIAL-02-UNIFIED-COMMUNICATIONS-SYSTEM.md          ← Run SECOND

PHASE 2: PARALLEL (Run All at Once - Open Many Windows)
├── PARALLEL-01 through PARALLEL-07
├── PARALLEL-10 through PARALLEL-15
├── PARALLEL-17 through PARALLEL-21
├── PARALLEL-22 through PARALLEL-34
├── PARALLEL-36
└── (All 33 prompts can run simultaneously)

PHASE 3: LAST (Run After All Complete)
└── LAST-MASTER-INTEGRATION.md                               ← Run LAST

SKIP: SKIP-08, SKIP-09 (superseded by PARALLEL-22, PARALLEL-23)
```

### Phase 1: Sequential (2 prompts)

Run these first - they establish foundational patterns:

| Order | File | Why First |
|-------|------|-----------|
| 1st | `SEQUENTIAL-01-USER-PROVISIONING-MULTI-TENANT-ACCESS.md` | Defines tenant context, RBAC, user hierarchy |
| 2nd | `SEQUENTIAL-02-UNIFIED-COMMUNICATIONS-SYSTEM.md` | Defines email patterns used by all other prompts |

### Phase 2: Parallel (33 prompts)

After Phase 1 completes, open 33 new Claude Code windows and run all of these simultaneously:

| Prompts | Focus |
|---------|-------|
| 01, 02 | AI Assistant, Scheduling |
| 03, 04 | Support, Video/DAM |
| 05, 06 | SMS, Productivity |
| 07, 10 | Financial, E-Commerce |
| 11, 12, 13, 14, 15 | Content, E-Sign, Tax, Integrations, Vendor Brief |
| 17, 18, 19, 20, 21 | OAuth, Contractor, Creator Portal, Creator Analytics, Vendor |
| 22, 23, 24, 25 | Attribution, A/B Testing, Surveys, Creator Onboarding |
| 26, 27, 28 | Utilities, Commerce, Integrations Admin |
| 29, 30, 31, 32, 33 | Ops, Workflows, Templates, BRI, Creators Admin |
| 34, 36 | Shopify App, Customer Portal |

### Phase 3: Last (1 prompt)

Run ONLY after all other prompts complete:

| File | Purpose |
|------|---------|
| `LAST-MASTER-INTEGRATION.md` | Consolidates all phase docs, validates coverage |

### Skip These (Superseded)

| File | Replaced By |
|------|-------------|
| ~~`SKIP-08-ATTRIBUTION-ENHANCEMENT.md`~~ | `PARALLEL-22-ATTRIBUTION-FULL-SYSTEM.md` |
| ~~`SKIP-09-AB-TESTING-ENHANCEMENT.md`~~ | `PARALLEL-23-AB-TESTING-FULL-SYSTEM.md` |

---

## Prompt Philosophy

### CRITICAL: Focus on WHAT, Not HOW

Each prompt specifies:
- **Outcomes** - What the feature accomplishes
- **Definition of Done** - Clear success criteria
- **Non-Negotiable Requirements** - Must-have features

Each prompt does NOT specify:
- Implementation details
- Technology choices
- Database schemas
- API designs
- UI patterns

**Let the AI agent decide HOW to implement based on context.**

### Open-Ended (AI Discretion)
- Phase organization and granularity
- Tool and library selection
- UI/UX patterns
- Database schema details
- Architecture patterns
- Code organization

### Non-Negotiable
- ALL features must be preserved
- ALL admin pages must be documented
- Multi-tenant isolation maintained
- No features simplified or removed
- Super admin pages are NOT visible to tenants
- **ALL communications customizable in-platform (no hardcoded emails)**

---

## Important Context

### Super Admin vs Tenant Admin
- **Super Admin Only**: Operations, Logs, Health, Errors, Alerts, Performance (prompt 29)
- **Tenant Admin**: All other admin pages (scoped to their tenant)

### Surveys - Build Our Own
- **DO NOT** use Fairing integration
- Build own post-purchase survey via Shopify App Extension (prompts 24 + 34)

### Shopify App - Future-Proof Scopes
- Include ALL possible scopes for future features (prompt 34)
- Current + future extensions documented

### Communications - NO Marketing
- **NO marketing campaigns, drip sequences, or automation flows**
- Platform notifications only (transactional emails, system alerts)
- Email enabled by default, SMS toggle-able (off by default)
- ALL templates customizable in admin (prompt 35)
- Resend setup during tenant onboarding

### Customer Portal - White-Label
- Each tenant gets branded customer portal (prompt 36)
- Full theming: colors, fonts, icons, layout
- All text strings editable in admin
- Feature toggles for optional sections (rewards, referrals)
- Custom domain support
- No hardcoded branding

### User Provisioning & Multi-Tenant Access
- Users can belong to multiple tenants (prompt 37)
- Different roles per tenant
- Context switching UI in header
- Super admin manages all tenants
- Tenant admin manages their team
- Role-based access control (RBAC)
- Predefined roles + custom role creation
- Audit logging for all permission changes

### Debug Auth Bypass & Test Tenant
- Debug mode works on localhost only (triple-protected)
- Set `DEBUG_BYPASS_AUTH=true` and `NEXT_PUBLIC_DEBUG_MODE=true`
- Mock user ID: `debug_local_user_bypass`
- Test tenant for AI agent testing: `test-brand`
- Visual "D" badge shows debug mode active

### Portable Platform
- Zero hardcoded email content
- Zero hardcoded sender addresses
- Zero hardcoded portal branding
- ALL communications configurable per tenant
- ALL portal UI customizable per tenant
- This is an installable platform - everything must be customizable

---

## Complete Prompt List (37 Prompts)

### Sequential Prompts (Run First)
| Order | File | Gap Area | Priority |
|-------|------|----------|----------|
| 1st | `SEQUENTIAL-01-USER-PROVISIONING-MULTI-TENANT-ACCESS.md` | **RBAC, multi-tenant access** - users, roles, context switching | Critical |
| 2nd | `SEQUENTIAL-02-UNIFIED-COMMUNICATIONS-SYSTEM.md` | **Email queues, templates, Resend setup** - all customizable | Critical |

### Parallel Prompts (Run All Simultaneously)
| # | File | Gap Area | Priority |
|---|------|----------|----------|
| 01 | `PARALLEL-01-AI-ASSISTANT.md` | BRII backend: voice, RAG, memory | Critical |
| 02 | `PARALLEL-02-SCHEDULING-BOOKING.md` | Calendar, availability, events | Critical |
| 03 | `PARALLEL-03-SUPPORT-HELPDESK.md` | Tickets, KB, chat | Critical |
| 04 | `PARALLEL-04-VIDEO-DAM.md` | Mux, transcription, assets | Critical |
| 05 | `PARALLEL-05-SMS-COMMUNICATIONS.md` | SMS notifications (off by default, no marketing) | Medium |
| 06 | `PARALLEL-06-PRODUCTIVITY-WORKFLOWS.md` | Tasks, inbox, automation | High |
| 07 | `PARALLEL-07-FINANCIAL-OPS.md` | Expenses, P&L, treasury, gift cards | High |
| 10 | `PARALLEL-10-ECOMMERCE-OPS.md` | Abandoned carts, promos, samples | Medium |
| 11 | `PARALLEL-11-CONTENT-SEO.md` | Blog, SEO tools, gallery | Medium |
| 12 | `PARALLEL-12-ESIGN-ENHANCEMENT.md` | Templates, bulk, PDF gen | Medium |
| 13 | `PARALLEL-13-TAX-COMPLIANCE.md` | 1099, W-9, reporting | Medium |
| 14 | `PARALLEL-14-INTEGRATIONS.md` | Missing third-party services | Medium |
| 15 | `PARALLEL-15-VENDOR-MANAGEMENT.md` | Vendor portal (brief) | Low |
| 17 | `PARALLEL-17-OAUTH-INTEGRATIONS.md` | Meta, Google, TikTok, Klaviyo OAuth | Critical |
| 18 | `PARALLEL-18-CONTRACTOR-PORTAL.md` | Full contractor portal (32 API routes) | Critical |
| 19 | `PARALLEL-19-CREATOR-PORTAL-ENHANCEMENTS.md` | Missing 53% of creator features | High |
| 20 | `PARALLEL-20-CREATOR-ADMIN-ANALYTICS.md` | Admin creator dashboards, metrics | High |
| 21 | `PARALLEL-21-VENDOR-PORTAL.md` | Full vendor system (31 API routes) | Medium |
| 22 | `PARALLEL-22-ATTRIBUTION-FULL-SYSTEM.md` | **All 20 attribution pages** | Critical |
| 23 | `PARALLEL-23-AB-TESTING-FULL-SYSTEM.md` | **All A/B test pages + stats** | Critical |
| 24 | `PARALLEL-24-SURVEYS-AUTOMATIONS.md` | Surveys (OWN APP, not Fairing), automations | Medium |
| 25 | `PARALLEL-25-CREATOR-ONBOARDING-FLOW.md` | Join form, teleprompter, welcome call | High |
| 26 | `PARALLEL-26-ADMIN-UTILITY-PAGES.md` | Gallery, projects, recorder, etc. | Medium |
| 27 | `PARALLEL-27-COMMERCE-FULL-SYSTEM.md` | All commerce admin pages | High |
| 28 | `PARALLEL-28-INTEGRATIONS-ADMIN-PAGES.md` | All integration admin UIs | High |
| 29 | `PARALLEL-29-OPERATIONS-SETTINGS.md` | **SUPER ADMIN ONLY** - Ops, logs, health | Medium |
| 30 | `PARALLEL-30-WORKFLOWS-AI-TEAM.md` | Workflows, AI Team management | Medium |
| 31 | `PARALLEL-31-CAMPAIGNS-TEMPLATES.md` | Template library (NO marketing campaigns) | Medium |
| 32 | `PARALLEL-32-BRI-COMPLETE.md` | All BRI admin pages (12 pages) | High |
| 33 | `PARALLEL-33-CREATORS-ADMIN-COMPLETE.md` | All creator admin pages | High |
| 34 | `PARALLEL-34-SHOPIFY-APP-COMPLETE.md` | **Comprehensive Shopify App** - all scopes, extensions | Critical |
| 36 | `PARALLEL-36-CUSTOMER-PORTAL.md` | **White-label customer portal** - orders, subscriptions, theming | Critical |

### Last Prompt (Run After All Complete)
| File | Purpose |
|------|---------|
| `LAST-MASTER-INTEGRATION.md` | Final consolidation of all phase docs |

### Skip Prompts (Superseded)
| File | Replaced By |
|------|-------------|
| ~~`SKIP-08-ATTRIBUTION-ENHANCEMENT.md`~~ | `PARALLEL-22-ATTRIBUTION-FULL-SYSTEM.md` |
| ~~`SKIP-09-AB-TESTING-ENHANCEMENT.md`~~ | `PARALLEL-23-AB-TESTING-FULL-SYSTEM.md` |

---

## Admin Page Coverage by Section

### CONTENT (6 pages)
- Blog, Topic Clusters, Link Health, SEO, Landing Pages, Brand Context
- Covered by: 11-CONTENT-SEO.md

### DAM (9 pages)
- Asset Library, Import Queue, Collections, Ad Projects, Rights, Analytics, Google Drive, Trash, Settings
- Covered by: 04-VIDEO-DAM.md

### COMMERCE (50+ pages)
- Orders, Customers, Subscriptions (10 sub-pages), Reviews (12 sub-pages), Analytics (6 sub-pages), A/B Tests, Surveys, Promotions, Promo Codes, Abandoned Carts, Gift Cards (4 sub-pages), Google Feed (5 sub-pages)
- Covered by: 27-COMMERCE-FULL-SYSTEM.md, 22-ATTRIBUTION.md, 23-AB-TESTING.md, 24-SURVEYS.md

### ATTRIBUTION (20 pages)
- Overview, Channels, Creatives, Journeys, Model Comparison, Cohorts, MMM, AI Insights, Influencers, Pixels, Data Quality, Settings, Dashboards, Exports, Incrementality, Platforms, Products, Reports, ROAS Index, Setup
- Covered by: 22-ATTRIBUTION-FULL-SYSTEM.md

### CREATORS (20+ pages)
- Directory, Applications, Communications (3 sub-pages), Pipeline, Messaging, Onboarding Metrics, Commissions, E-Signatures (11 sub-pages), Samples
- Covered by: 33-CREATORS-ADMIN-COMPLETE.md, 20-CREATOR-ADMIN-ANALYTICS.md

### FINANCE (9 pages)
- Payouts, Treasury, Receipts, Expenses (3 sub-pages), Tax (5 sub-pages), Vendors, Contractors, Payee Invites
- Covered by: 07-FINANCIAL-OPS.md, 13-TAX-COMPLIANCE.md, 18-CONTRACTOR.md, 21-VENDOR.md

### COMMUNICATE (8 pages)
- BRI (12 sub-pages), Creator Inbox, Productivity (3 sub-pages), Templates (notification templates only), Calendar (9 sub-pages), Videos, Recorder
- Covered by: 32-BRI-COMPLETE.md, 31-CAMPAIGNS-TEMPLATES.md, 02-SCHEDULING.md, 35-UNIFIED-COMMUNICATIONS.md

### OPERATIONS (7 pages) - SUPER ADMIN ONLY
- Dashboard, Errors, Logs, Health, Alerts, Analytics, Performance, Settings
- Covered by: 29-OPERATIONS-SETTINGS.md
- **NOT visible to tenant admins**

### INTEGRATIONS (12 pages)
- Overview, SMS/Voice, MCP, Slack, Shopify App, Meta Ads, Google Ads, TikTok, Klaviyo, Yotpo
- Covered by: 28-INTEGRATIONS-ADMIN-PAGES.md, 17-OAUTH-INTEGRATIONS.md

### UTILITY & SETTINGS (10+ pages)
- Config, Automations, Settings (3 sub-pages), Gallery, Projects, Stripe Topups, System Sync, Workflows (2 sub-pages), AI Team (6 sub-pages), Support (4 sub-pages)
- Covered by: 26-ADMIN-UTILITY-PAGES.md, 29-OPERATIONS-SETTINGS.md, 30-WORKFLOWS-AI-TEAM.md

### SHOPIFY APP (Extensions + Admin)
- Post-purchase survey extension
- Delivery customization (shipping A/B tests)
- Web pixel (GA4 + Meta CAPI session stitching)
- Future: Discount, Payment, Cart Transform, Checkout UI, Order Routing
- Covered by: 34-SHOPIFY-APP-COMPLETE.md

### COMMUNICATIONS SYSTEM
- Email queues per function (reviews, creators, e-sign, subscriptions)
- Template management for all notification types
- Resend setup during tenant onboarding
- SMS toggle (off by default)
- Covered by: 35-UNIFIED-COMMUNICATIONS-SYSTEM.md

### CUSTOMER PORTAL (White-Label)
- Customer-facing portal pages (orders, subscriptions, addresses, profile, store credit)
- Admin portal configuration (theme, icons, content, features, domain)
- Subscription lifecycle management (pause, skip, cancel, reschedule, reactivate)
- Shopify Customer Account API integration
- Subscription provider integration (Loop, Recharge, Bold, etc.)
- Covered by: 36-CUSTOMER-PORTAL.md

### USER PROVISIONING & MULTI-TENANT ACCESS
- Super admin dashboard and tenant management
- Tenant admin team management and invitations
- Role-based access control (RBAC) with predefined and custom roles
- Multi-tenant user access with context switching
- Permission categories (tenant, team, creators, commerce, finance, content, integrations, analytics)
- Audit logging for all permission changes
- Debug auth bypass for local testing
- Covered by: 37-USER-PROVISIONING-MULTI-TENANT-ACCESS.md

---

## Portal Coverage

### Customer Portal (10+ pages) - WHITE-LABEL
- Auth (2), Dashboard, Orders (2), Subscriptions (2), Addresses, Profile, Store Credit, Rewards (optional), Referrals (optional), Settings
- Admin customization: Theme, Icons, Content, Features, Domain
- Covered by: 36-CUSTOMER-PORTAL.md

### Creator Portal (15+ pages)
- Auth (4), Dashboard, Projects, Contracts, Messages, Payments, Settings (6), Teleprompter, Welcome Call, Public Profile, Join Form (5 steps)
- Covered by: 19-CREATOR-PORTAL-ENHANCEMENTS.md, 25-CREATOR-ONBOARDING-FLOW.md

### Contractor Portal (10+ pages)
- Auth (4), Payments, Projects, Request Payment, Settings (4)
- Covered by: 18-CONTRACTOR-PORTAL.md

### Vendor Portal (8+ pages)
- Auth (4), Payments, Request Payment, Settings (4)
- Covered by: 21-VENDOR-PORTAL.md

---

## Validation Checklist

After all 37 prompts complete:
- [ ] ALL 200+ admin pages documented
- [ ] ALL 4 portals fully specified (Customer, Creator, Contractor, Vendor)
- [ ] ALL integrations with OAuth flows
- [ ] ALL statistical methods documented
- [ ] Shopify App with ALL scopes and extensions
- [ ] Super admin pages isolated from tenants
- [ ] Own post-purchase survey (not Fairing)
- [ ] **ALL email templates customizable in admin (no hardcoded)**
- [ ] **Email queues with visual UI for every sending function**
- [ ] **Resend setup in tenant onboarding wizard**
- [ ] **NO marketing campaigns/flows (notifications only)**
- [ ] **Customer portal fully white-labeled (theme, icons, content)**
- [ ] **Portal feature toggles work (enable/disable sections)**
- [ ] **User provisioning with RBAC implemented**
- [ ] **Multi-tenant context switching works**
- [ ] **Super admin can manage all tenants**
- [ ] **Debug auth bypass works on localhost with test tenant**
- [ ] PLAN.md fully comprehensive
- [ ] PROMPT.md has all patterns
- [ ] 30-50 focused phase docs created
- [ ] No features simplified or removed
- [ ] Multi-tenant isolation everywhere

---

## Quick Start - Copy-Paste Instructions

### Step 1: Run Sequential Prompts (2 windows, one at a time)

**Window 1 - Run FIRST:**
```
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/SEQUENTIAL-01-USER-PROVISIONING-MULTI-TENANT-ACCESS.md
```

**Window 2 - Run SECOND (after first completes):**
```
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/SEQUENTIAL-02-UNIFIED-COMMUNICATIONS-SYSTEM.md
```

### Step 2: Run All Parallel Prompts (33 windows simultaneously)

After sequential prompts complete, open 33 new Claude Code windows and run ALL of these at once:

```
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-01-AI-ASSISTANT.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-02-SCHEDULING-BOOKING.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-03-SUPPORT-HELPDESK.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-04-VIDEO-DAM.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-05-SMS-COMMUNICATIONS.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-06-PRODUCTIVITY-WORKFLOWS.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-07-FINANCIAL-OPS.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-10-ECOMMERCE-OPS.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-11-CONTENT-SEO.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-12-ESIGN-ENHANCEMENT.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-13-TAX-COMPLIANCE.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-14-INTEGRATIONS.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-15-VENDOR-MANAGEMENT.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-17-OAUTH-INTEGRATIONS.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-18-CONTRACTOR-PORTAL.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-19-CREATOR-PORTAL-ENHANCEMENTS.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-20-CREATOR-ADMIN-ANALYTICS.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-21-VENDOR-PORTAL.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-22-ATTRIBUTION-FULL-SYSTEM.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-23-AB-TESTING-FULL-SYSTEM.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-24-SURVEYS-AUTOMATIONS.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-25-CREATOR-ONBOARDING-FLOW.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-26-ADMIN-UTILITY-PAGES.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-27-COMMERCE-FULL-SYSTEM.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-28-INTEGRATIONS-ADMIN-PAGES.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-29-OPERATIONS-SETTINGS.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-30-WORKFLOWS-AI-TEAM.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-31-CAMPAIGNS-TEMPLATES.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-32-BRI-COMPLETE.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-33-CREATORS-ADMIN-COMPLETE.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-34-SHOPIFY-APP-COMPLETE.md
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/PARALLEL-36-CUSTOMER-PORTAL.md
```

### Step 3: Run Master Integration (after ALL complete)

```
Read and execute: /docs/MULTI-TENANT-PLATFORM-PLAN/GAP-REMEDIATION-PROMPTS/LAST-MASTER-INTEGRATION.md
```

### DO NOT RUN (Superseded)
```
SKIP-08-ATTRIBUTION-ENHANCEMENT.md  (replaced by PARALLEL-22)
SKIP-09-AB-TESTING-ENHANCEMENT.md   (replaced by PARALLEL-23)
```

### What Each Agent Should Do

Each prompt is self-contained. The agent should:
1. Read the prompt file
2. Explore RAWDOG source files for patterns
3. Focus on WHAT (outcomes) not HOW (implementation)
4. Update PLAN.md with the feature section
5. Update PROMPT.md with implementation patterns
6. Create focused phase docs with definitions of done

---

## Expected Output

- **PLAN.md**: Complete with ALL features (outcomes-focused)
- **PROMPT.md**: All implementation patterns
- **Phase Docs**: 30-50 focused documents with clear definitions of done
- **Spec Docs**: PAYEE-TYPE-MODEL, SHOPIFY-APP, COMMUNICATIONS-SYSTEM, etc.
- **Coverage**: 70% → **100%** feature parity
