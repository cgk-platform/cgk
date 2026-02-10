# RAWDOG Codebase Analysis Summary
**Generated**: 2025-02-10
**Purpose**: Complete codebase analysis for multi-tenant platform migration

---

## Source Codebase Path

**RAWDOG Codebase Root**: `/Users/holdenthemic/Documents/rawdog-web/`

All paths in this document are relative to this root. When referencing from the new project, use the full path.

---

## Executive Summary

This comprehensive analysis documents the RAWDOG e-commerce platform codebase to enable a complete multi-tenant platform rebuild. The analysis covers database schemas, background jobs, API routes, third-party integrations, admin features, and UI components.

---

## Analysis Coverage

### Files Analyzed

| Category | Count | Full Path |
|----------|-------|-----------|
| Database Schemas | 28 modules | `/Users/holdenthemic/Documents/rawdog-web/src/lib/*/db/schema.ts` |
| Trigger.dev Tasks | 75 files, 199 tasks | `/Users/holdenthemic/Documents/rawdog-web/src/trigger/` |
| API Routes | 1,032 routes | `/Users/holdenthemic/Documents/rawdog-web/src/app/api/` |
| React Components | 465 components | `/Users/holdenthemic/Documents/rawdog-web/src/components/` |
| Admin Sections | 60+ sections | `/Users/holdenthemic/Documents/rawdog-web/src/app/admin/` |
| Third-Party Integrations | 24+ services | Various (see INTEGRATIONS doc) |

### Key Metrics

- **Total Tables**: 100+ PostgreSQL tables
- **Total API Routes**: 1,032 routes
- **Total Background Tasks**: 199 Trigger.dev tasks
- **Total Components**: 465 React components
- **Total Admin Sections**: 60+ sections

---

## Deliverables Created

| Document | Purpose |
|----------|---------|
| `DATABASE-SCHEMA-2025-02-10.md` | Complete database documentation |
| `AUTOMATIONS-TRIGGER-DEV-2025-02-10.md` | All background tasks with Inngest migration guide |
| `API-ROUTES-2025-02-10.md` | Complete API route mapping |
| `INTEGRATIONS-2025-02-10.md` | Third-party service documentation |
| `ADMIN-FEATURES-2025-02-10.md` | Admin dashboard features |
| `UI-PREVIEW-2025-02-10.md` | ASCII mockups for new platform |
| `HEALTH-MONITORING-2025-02-10.md` | Monitoring specification |
| `FEATURE-FLAGS-2025-02-10.md` | Feature flag system design |

---

## Key Findings

### 1. Database Architecture

**Current State:**
- 28+ feature-specific schema modules
- 100+ PostgreSQL tables
- Heavy use of JSONB for flexibility
- Encrypted credential storage for OAuth tokens
- Redis for caching, queuing, and real-time data

**Multi-Tenant Considerations:**
- Schema-per-tenant architecture recommended
- Need tenant context (`tenant_id`) on all tables
- OAuth tokens already encrypted (good pattern)
- Connection pooling needs per-tenant configuration

### 2. Background Jobs

**Current State:**
- 199+ Trigger.dev tasks
- Heavy scheduled job usage (40+ cron jobs)
- Multi-channel notifications (Email, SMS, Slack, Portal)
- Complex payment orchestration (domestic vs international)

**Migration to Inngest:**
- SDK changes required (v4 → Inngest functions)
- Cron syntax compatible
- Event-driven architecture aligns well
- Need to migrate task triggers

### 3. API Architecture

**Current State:**
- 1,032 total routes
- Multiple auth methods (Clerk, session, magic links, tokens)
- Comprehensive admin API (604 routes)
- Portal-specific routes (Creator, Contractor, Vendor)

**Multi-Tenant Considerations:**
- All routes need tenant context
- Auth needs to map users to tenant(s)
- Rate limiting per tenant
- Debug mode pattern is reusable

### 4. Third-Party Integrations

**OAuth Integrations (7):**
- Shopify, Stripe Connect, Meta Ads, Google Ads, TikTok Ads, Google Calendar, Google Drive

**API Key Integrations (12+):**
- GA4, Resend, Retell, Mux, AssemblyAI, Yotpo, Klaviyo, etc.

**Multi-Tenant Considerations:**
- Per-tenant OAuth credentials (already encrypted)
- Per-tenant API key storage
- Webhook routing by tenant

### 5. Admin Dashboard

**Current State:**
- 60+ sections across 8 navigation groups
- Complex features (A/B testing, attribution, LP builder)
- Badge counters for pending items
- Real-time data refresh

**White-Label Considerations:**
- Need tenant-specific theming
- Feature access control per tenant/plan
- Super admin dashboard for platform oversight

---

## Migration Priorities

### Phase 1: Foundation (Weeks 1-4)
1. Monorepo setup with Turborepo
2. Schema-per-tenant database architecture
3. Custom auth replacing Clerk
4. Core shared packages

### Phase 2: Admin Portal (Weeks 5-10)
1. Super admin dashboard for platform
2. Brand onboarding wizard
3. White-label admin with feature flags
4. Health monitoring infrastructure

### Phase 3: Storefront (Weeks 11-14)
1. Headless Shopify integration
2. Per-tenant storefront config
3. Cart and checkout
4. Product/collection pages

### Phase 4: Creator Portal (Weeks 15-18)
1. Multi-tenant creator portal
2. Stripe Connect per tenant
3. Wise Business API integration
4. Payout orchestration

### Phase 5: Background Jobs (Weeks 19-21)
1. Inngest migration from Trigger.dev
2. Per-tenant job queues
3. Event-driven architecture
4. Monitoring and alerting

### Phase 6: MCP Server (Weeks 22-23)
1. Streamable HTTP transport
2. Tool registry per tenant
3. Analytics and logging

### Phase 7: Data Migration (Weeks 24-26)
1. RAWDOG data migration
2. Integration testing
3. Production cutover

---

## Gaps Identified

### Missing Documentation
1. Subscription management (Loop integration details)
2. Inventory sync patterns
3. Customer payment methods storage

### Technical Debt
1. Some large files (LP builder: 27K lines)
2. Direct Clerk auth calls (should use wrapper)
3. Inconsistent error handling patterns

### Multi-Tenant Gaps
1. No tenant isolation in current architecture
2. Single database schema
3. Hardcoded brand references
4. No super admin functionality

---

## Recommended Next Steps

### Immediate Actions
1. Review this analysis with stakeholders
2. Validate migration timeline
3. Identify team assignments per phase
4. Set up development environment for new platform

### Technical Prerequisites
1. Turborepo monorepo skeleton
2. PostgreSQL schema-per-tenant proof of concept
3. Inngest evaluation and migration plan
4. Custom auth system design

### Documentation Needs
1. API specification for new platform
2. Database ERD for multi-tenant schema
3. Integration contracts for each service
4. Feature parity checklist

---

## Files and Locations Reference

**Base Path**: `/Users/holdenthemic/Documents/rawdog-web/`

### Core Application
```
/Users/holdenthemic/Documents/rawdog-web/src/app/          - Next.js App Router pages
/Users/holdenthemic/Documents/rawdog-web/src/components/   - React components
/Users/holdenthemic/Documents/rawdog-web/src/lib/          - Business logic and utilities
/Users/holdenthemic/Documents/rawdog-web/src/trigger/      - Trigger.dev tasks (199 tasks)
/Users/holdenthemic/Documents/rawdog-web/src/hooks/        - React hooks
/Users/holdenthemic/Documents/rawdog-web/src/contexts/     - React context providers
```

### Configuration
```
/Users/holdenthemic/Documents/rawdog-web/src/lib/pricing-config.ts  - Pricing configuration
/Users/holdenthemic/Documents/rawdog-web/src/lib/analytics.ts       - GA4 tracking
/Users/holdenthemic/Documents/rawdog-web/src/middleware.ts          - Route protection
```

### Documentation
```
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/   - Migration planning
/Users/holdenthemic/Documents/cgk/ai-reference/                  - Integration guides
/Users/holdenthemic/Documents/rawdog-web/CLAUDE.md                          - Development instructions
```

---

## Conclusion

The RAWDOG codebase is mature and well-organized, with clear separation of concerns and consistent patterns. The multi-tenant migration will require significant architectural changes but can leverage existing patterns for credential encryption, OAuth flows, and modular feature organization.

Key success factors:
1. **Schema-per-tenant isolation** for data security
2. **Inngest migration** for reliable background jobs
3. **Feature flags** for gradual rollout
4. **Super admin dashboard** for platform oversight
5. **Health monitoring** for multi-tenant operations

The 26-week timeline outlined in the migration plan is achievable with dedicated resources and phased execution.

---

*Analysis completed by Claude Code on 2025-02-10*
