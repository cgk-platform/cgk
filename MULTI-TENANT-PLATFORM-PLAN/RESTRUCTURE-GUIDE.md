# Phase Document Restructuring Guide

> **PURPOSE**: This guide ensures all sub-agents restructure phase documents consistently without losing features.

---

## Core Principles

### 1. NO FEATURE REMOVAL
- Every feature from the original docs MUST appear in the restructured docs
- If unsure, include it
- Cross-reference against CODEBASE-ANALYSIS docs for completeness

### 2. GOAL-ORIENTED, NOT CODE-PRESCRIPTIVE
- Replace inline code snippets with pattern references
- Point to skills, MCPs, existing RAWDOG code
- Let AI determine best implementation during execution

### 3. EXPLICIT PARALLELIZATION
- Mark what can run in parallel
- Mark dependencies clearly
- Enable multi-agent execution

### 4. SMALLER, FOCUSED DOCS
- Target: 150-250 lines per doc (was 400-900)
- One clear deliverable per doc
- 1 week max duration per doc

---

## New Phase Doc Template

```markdown
# PHASE-{X}{Letter}: {Title}

**Duration**: {N} days/week
**Depends On**: {Phase IDs that must complete first}
**Parallel With**: {Phase IDs that can run simultaneously}
**Blocks**: {Phase IDs that cannot start until this completes}

---

## Goal

{1-3 sentences describing the objective - focus on OUTCOMES not specific implementations}

---

## Success Criteria

- [ ] {Measurable outcome 1}
- [ ] {Measurable outcome 2}
- [ ] {Measurable outcome 3}
- [ ] Setup documentation complete (if applicable)
- [ ] New user can configure in < 15 minutes (if applicable)
...

---

## Tenant Isolation (MANDATORY)

**READ**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

{Explain how tenant isolation applies to this phase. Include specific examples.}

```typescript
// Example of correct tenant-isolated code for this phase
```

---

## Portability Requirements

{If this phase involves infrastructure that users need to set up:}

### CLI Setup
- What CLI command should handle setup?
- What should it do?

### Documentation Required
- `docs/setup/{COMPONENT}.md` - User-facing setup guide

### Web Configuration
- What (if anything) must be done in a web dashboard?
- Keep this to absolute minimum (API keys only ideally)

---

## Deliverables

### {Category 1}
- {Specific output 1}
- {Specific output 2}

### {Category 2}
- {Specific output 1}
...

---

## Constraints

- MUST enforce tenant isolation (see TENANT-ISOLATION.md)
- MUST document setup process for new users
- {Other hard requirements}
- {Anti-pattern to avoid}
...

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - {when/why}
- `/mcp-builder` - {when/why}

**MCPs to consult:**
- Context7 MCP: "{search query 1}"
- Shopify Dev MCP: "{when to use}"

**RAWDOG code to reference:**
- `{path}` - {what pattern to extract}

**Spec documents:**
- `{SPEC-NAME}.md` - {what to reference}

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. {Open question 1}
2. {Open question 2}
...

---

## Tasks

### [PARALLEL] {Task group that can run simultaneously}
- [ ] {Task 1}
- [ ] {Task 2}

### [SEQUENTIAL after {dependency}] {Task group}
- [ ] {Task 1}
- [ ] {Task 2}

---

## Definition of Done

- [ ] {Verification step 1}
- [ ] {Verification step 2}
- [ ] `npx tsc --noEmit` passes
- [ ] Tests pass (if applicable)
```

---

## Directory Structure After Restructure

```
docs/MULTI-TENANT-PLATFORM-PLAN/
├── PLAN.md                          # Updated with new phase references
├── PROMPT.md                        # Simplified, less prescriptive
├── ARCHITECTURE.md                  # Keep as-is (reference doc)
├── INDEX.md                         # Updated navigation
├── RESTRUCTURE-GUIDE.md             # This file (for agent reference)
│
├── phases/                          # NEW: All phase docs in subdirectory
│   ├── PHASE-0-PORTABILITY.md       # Keep (already focused)
│   │
│   ├── PHASE-1A-MONOREPO.md         # Week 1
│   ├── PHASE-1B-DATABASE.md         # Week 2
│   ├── PHASE-1C-AUTH.md             # Week 3
│   ├── PHASE-1D-PACKAGES.md         # Week 4
│   │
│   ├── PHASE-2A-ADMIN-SHELL.md      # Week 5
│   ├── PHASE-2B-ADMIN-COMMERCE.md   # Week 5-6
│   ├── PHASE-2C-ADMIN-CONTENT.md    # Week 6
│   ├── PHASE-2D-ADMIN-FINANCE.md    # Week 7
│   │
│   ├── PHASE-2SA-ACCESS.md          # Week 5 (parallel with 2A)
│   ├── PHASE-2SA-DASHBOARD.md       # Week 6
│   ├── PHASE-2SA-ADVANCED.md        # Week 7
│   │
│   ├── PHASE-2PO-HEALTH.md          # Week 8
│   ├── PHASE-2PO-LOGGING.md         # Week 8 (parallel with health)
│   ├── PHASE-2PO-FLAGS.md           # Week 9
│   ├── PHASE-2PO-ONBOARDING.md      # Week 10
│   │
│   ├── PHASE-3A-STOREFRONT-FOUNDATION.md  # Week 11
│   ├── PHASE-3B-STOREFRONT-CART.md        # Week 12
│   ├── PHASE-3C-STOREFRONT-FEATURES.md    # Week 13
│   ├── PHASE-3D-STOREFRONT-THEMING.md     # Week 14
│   │
│   ├── PHASE-4A-CREATOR-PORTAL.md         # Week 15
│   ├── PHASE-4B-CREATOR-PAYMENTS.md       # Week 16
│   ├── PHASE-4C-CREATOR-PROJECTS.md       # Week 17
│   ├── PHASE-4D-CREATOR-TAX.md            # Week 18
│   │
│   ├── PHASE-5A-JOBS-SETUP.md             # Week 19
│   ├── PHASE-5B-JOBS-COMMERCE.md          # Week 19-20
│   ├── PHASE-5C-JOBS-CREATORS.md          # Week 20
│   ├── PHASE-5D-JOBS-ANALYTICS.md         # Week 20-21
│   ├── PHASE-5E-JOBS-SCHEDULED.md         # Week 21
│   │
│   ├── PHASE-6A-MCP-TRANSPORT.md          # Week 22
│   ├── PHASE-6B-MCP-TOOLS.md              # Week 23
│   │
│   ├── PHASE-7A-MIGRATION-DATA.md         # Week 24
│   ├── PHASE-7B-MIGRATION-TESTING.md      # Week 25
│   ├── PHASE-7C-MIGRATION-CUTOVER.md      # Week 26
│   │
│   └── PHASE-8-AUDIT.md                   # Week 27 (NEW)
│
├── CODEBASE-ANALYSIS/               # Keep as-is (reference)
└── specs/                           # Moved specs here
    ├── COMMERCE-PROVIDER-SPEC.md
    ├── HEALTH-MONITORING-SPEC.md
    ├── LOGGING-SPEC.md
    ├── FEATURE-FLAGS-SPEC.md
    ├── BRAND-ONBOARDING-SPEC.md
    └── SUPER-ADMIN-ARCHITECTURE.md
```

---

## Feature Preservation Checklist

Each restructured phase MUST preserve these from originals:

### Phase 1 (Foundation)
- [ ] Turborepo + pnpm workspace setup
- [ ] All package stubs (ui, db, auth, shopify, commerce, config)
- [ ] All app stubs (orchestrator, admin, storefront, creator-portal)
- [ ] Schema-per-tenant database design
- [ ] Public schema (organizations, users, sessions, api_keys, billing)
- [ ] Tenant schema template (orders, customers, products, etc.)
- [ ] JWT + session authentication
- [ ] Magic link system
- [ ] Auth middleware with tenant context injection
- [ ] Commerce Provider abstraction (factory pattern)

### Phase 2 (Admin)
- [ ] Navigation structure (all 7 top-level sections)
- [ ] Dashboard with KPIs and escalations
- [ ] Orders module (list, detail, filters)
- [ ] Customers module
- [ ] Subscriptions (Loop integration)
- [ ] Reviews management
- [ ] Blog management
- [ ] Landing page builder (70+ block types)
- [ ] Creator directory
- [ ] Creator pipeline (kanban)
- [ ] Creator inbox
- [ ] Payouts dashboard
- [ ] Treasury/expenses
- [ ] Tenant configuration system
- [ ] White-labeling (theme, logo, colors)
- [ ] Custom domain support

### Phase 2 Super Admin
- [ ] Super admin user registry + MFA
- [ ] Audit logging
- [ ] Platform KPIs (GMV, MRR, brands)
- [ ] Brands grid with health indicators
- [ ] Impersonation with time limit + audit
- [ ] Cross-tenant error explorer
- [ ] Health matrix (service x tenant)

### Phase 2 Platform Ops
- [ ] 15+ health monitors (DB, Redis, Shopify, Stripe, etc.)
- [ ] 3 scheduling tiers (critical/core/integration)
- [ ] Alert system (Slack, email, PagerDuty)
- [ ] PlatformLogger with buffering
- [ ] PostgreSQL partitioned log storage
- [ ] Redis real-time streaming
- [ ] Log viewer with filters
- [ ] Error aggregation
- [ ] 6 feature flag types
- [ ] Consistent hashing for rollouts
- [ ] Multi-layer caching
- [ ] Flag management UI
- [ ] 9-step onboarding wizard
- [ ] Shopify OAuth flow
- [ ] Stripe Connect setup

### Phase 3 (Storefront)
- [ ] Commerce Provider integration
- [ ] Shopify Storefront API client
- [ ] Product listing/detail pages
- [ ] Cart management with attributes
- [ ] Checkout flow (Shopify default)
- [ ] Custom checkout UI scaffold
- [ ] Reviews integration (internal + Yotpo)
- [ ] Bundle builder with dynamic pricing
- [ ] A/B test assignment (consistent hashing)
- [ ] Attribution tracking (UTM, click IDs)
- [ ] GA4 + Meta + TikTok pixel tracking
- [ ] Per-tenant theming
- [ ] Dynamic landing pages
- [ ] Feature flag for commerce.provider toggle

### Phase 4 (Creator)
- [ ] Multi-brand creator model
- [ ] Creator authentication
- [ ] Creator dashboard (cross-brand)
- [ ] Stripe Connect integration
- [ ] Wise Business API integration
- [ ] Payment provider selection logic
- [ ] Unified balance system
- [ ] Withdrawal requests
- [ ] Project management
- [ ] File uploads (Vercel Blob)
- [ ] E-signature system
- [ ] W-9 collection (encrypted TIN)
- [ ] 1099-NEC generation

### Phase 5 (Jobs)
- [ ] Provider evaluation and selection (documented)
- [ ] All 199 background tasks rebuilt
- [ ] Event types definition with tenantId required
- [ ] Vendor-agnostic abstraction layer
- [ ] Order sync function
- [ ] Review email queue
- [ ] Payout processing
- [ ] Creator application processing
- [ ] Attribution processing
- [ ] Daily metrics aggregation
- [ ] Webhook queue processing
- [ ] All cron/scheduled jobs rebuilt
- [ ] CLI setup command (`npx @cgk-platform/cli setup:jobs`)
- [ ] Setup documentation (`docs/setup/BACKGROUND-JOBS.md`)

### Phase 6 (MCP)
- [ ] Streamable HTTP transport
- [ ] MCP handler class
- [ ] Per-request authentication
- [ ] Streaming response support
- [ ] 70+ tools migrated
- [ ] Tool registry with tenant filtering
- [ ] Commerce/content/creator/analytics/ops tools
- [ ] Claude Connector OAuth integration
- [ ] Rate limiting (tenant/tool/AI cost)
- [ ] Usage analytics

### Phase 7 (Migration)
- [ ] Migration scripts (batch processing)
- [ ] Data validation queries
- [ ] Foreign key integrity checks
- [ ] Unit tests for tenant isolation
- [ ] Integration tests for API routes
- [ ] E2E tests (Playwright)
- [ ] Performance tests (k6)
- [ ] Cutover checklist
- [ ] Zero-downtime strategy
- [ ] Monitoring dashboard

---

## Agent Assignment

| Agent ID | Phase Group | Files to Create |
|----------|-------------|-----------------|
| 1 | Phase 1 | 1A, 1B, 1C, 1D |
| 2 | Phase 2 Admin | 2A, 2B, 2C, 2D |
| 3 | Phase 2 Super Admin | 2SA-*, move spec |
| 4 | Phase 2 Platform Ops | 2PO-*, move specs |
| 5 | Phase 3 | 3A, 3B, 3C, 3D |
| 6 | Phase 4 | 4A, 4B, 4C, 4D |
| 7 | Phase 5 | 5A, 5B, 5C, 5D, 5E |
| 8 | Phase 6 + 7 | 6A, 6B, 7A, 7B, 7C |
| 9 | Phase 8 + Index | PHASE-8-AUDIT, INDEX update |

---

## Validation

After all agents complete, run validation:

1. **Feature count check**: Count features in original vs restructured
2. **Cross-reference check**: Every item in Feature Preservation Checklist covered
3. **Syntax check**: All markdown valid
4. **Link check**: All internal links work
