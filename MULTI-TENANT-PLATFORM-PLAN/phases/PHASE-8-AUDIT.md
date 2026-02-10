# PHASE-8-AUDIT: Multi-Agent Final Verification

**Duration**: 1 week
**Depends On**: All phases (1A through 7C)
**Parallel With**: None (final gate)
**Blocks**: Production deployment

---

## Goal

Execute a comprehensive multi-agent audit to verify all platform components are complete, secure, performant, and production-ready. Each auditor agent runs in parallel, focusing on a specific domain, then reports findings for consolidated review.

---

## Success Criteria

- [ ] All 15 auditor agents pass with zero critical findings
- [ ] All high-severity findings addressed before sign-off
- [ ] Medium-severity findings documented with remediation timeline
- [ ] Full Definition of Done checklist completed
- [ ] Production readiness sign-off obtained

---

## Auditor Agent Roster

### Agent 1: Schema Validator

**Focus**: Verify all database tables exist and match specifications

**Verification Tasks**:
- [ ] All public schema tables exist (organizations, users, sessions, api_keys, billing, super_admin_users, super_admin_audit_log, impersonation_sessions)
- [ ] Tenant schema template includes all 100+ tables from DATABASE-SCHEMA analysis
- [ ] All indexes created for query performance
- [ ] Foreign key constraints properly defined
- [ ] Row-level security policies applied where needed
- [ ] Encrypted columns (OAuth tokens, TIN) using AES-256-GCM

**Spec References**:
- `CODEBASE-ANALYSIS/DATABASE-SCHEMA-2025-02-10.md`
- `ARCHITECTURE.md` - Database section

**Validation Commands**:
```bash
# List all schemas
psql -c "\dn"

# List tables per schema
psql -c "\dt public.*"
psql -c "\dt brand_rawdog.*"

# Verify indexes
psql -c "\di"
```

---

### Agent 2: API Route Auditor

**Focus**: Validate all API routes have correct exports, auth, and error handling

**Verification Tasks**:
- [ ] All admin routes have `export const dynamic = 'force-dynamic'`
- [ ] All admin routes have `export const revalidate = 0`
- [ ] All admin routes have `export const fetchCache = 'force-no-store'`
- [ ] All protected routes use `getAuthUserId()` from `@repo/auth`
- [ ] All routes have proper error handling (try/catch, error responses)
- [ ] All routes validate request body with Zod schemas
- [ ] All routes include tenant context in queries
- [ ] Rate limiting applied per specifications

**Spec References**:
- `CODEBASE-ANALYSIS/API-ROUTES-2025-02-10.md` (1,032 routes)
- `ARCHITECTURE.md` - API section
- `PROMPT.md` - Admin API Route Requirements

**Validation Commands**:
```bash
# Check route exports
grep -r "export const dynamic" apps/*/src/app/api/

# Find routes missing auth
grep -rL "getAuthUserId\|auth()" apps/*/src/app/api/admin/
```

---

### Agent 3: Feature Parity Checker

**Focus**: Verify all 60+ admin sections from RAWDOG are implemented

**Verification Tasks**:
- [ ] Dashboard with KPIs and escalations
- [ ] Orders module (list, detail, filters, timeline)
- [ ] Customers module (list, detail, segment)
- [ ] Subscriptions (Loop integration)
- [ ] Reviews management (internal + Yotpo)
- [ ] Blog management (posts, categories, authors)
- [ ] Landing page builder (70+ block types)
- [ ] Creator directory
- [ ] Creator pipeline (kanban)
- [ ] Creator inbox
- [ ] Payouts dashboard
- [ ] Treasury/expenses
- [ ] A/B testing
- [ ] Attribution tracking
- [ ] Settings (all sections)

**Spec References**:
- `CODEBASE-ANALYSIS/ADMIN-FEATURES-2025-02-10.md`
- `CODEBASE-ANALYSIS/UI-PREVIEW-2025-02-10.md`

**Validation Method**:
- Navigate through all admin sections
- Compare against ADMIN-FEATURES feature list
- Screenshot key pages for comparison

---

### Agent 4: Job Migration Auditor

**Focus**: Verify all 199 Trigger.dev tasks migrated to Inngest

**Verification Tasks**:
- [ ] All 199 tasks have Inngest equivalents
- [ ] Task functionality matches original behavior
- [ ] Event types properly defined
- [ ] Cron schedules correctly configured (40+ cron jobs)
- [ ] Retry policies appropriate per task
- [ ] Dead letter queue handling implemented
- [ ] Tenant context passed to all jobs
- [ ] Job monitoring dashboard operational

**Spec References**:
- `CODEBASE-ANALYSIS/AUTOMATIONS-TRIGGER-DEV-2025-02-10.md`
- `phases/PHASE-5A-JOBS-SETUP.md` through `PHASE-5E-JOBS-SCHEDULED.md`

**Validation Commands**:
```bash
# Count Inngest functions
grep -r "inngest.createFunction" packages/jobs/src/ | wc -l

# Verify against task list
diff <(cat AUTOMATIONS-TRIGGER-DEV-2025-02-10.md | grep "^- ") <(find packages/jobs -name "*.ts" -exec basename {} \;)
```

---

### Agent 5: Integration Tester

**Focus**: Verify all 24+ third-party integrations working

**Verification Tasks**:
- [ ] **OAuth Integrations (7)**:
  - [ ] Shopify OAuth flow complete
  - [ ] Stripe Connect authorization working
  - [ ] Meta Ads API connected
  - [ ] Google Ads OAuth functional
  - [ ] TikTok Ads API connected
  - [ ] Google Calendar integration working
  - [ ] Google Drive upload functional
- [ ] **API Key Integrations (12+)**:
  - [ ] GA4 tracking firing
  - [ ] Resend email delivery working
  - [ ] Retell AI calls functional
  - [ ] Mux video processing operational
  - [ ] AssemblyAI transcription working
  - [ ] Yotpo reviews syncing
  - [ ] Klaviyo events sending
  - [ ] Loop subscriptions syncing
  - [ ] Wise payouts functional
  - [ ] SendPulse SMS working
  - [ ] Vercel Blob uploads working
  - [ ] Upstash Redis connected
- [ ] Per-tenant credential storage working
- [ ] Token refresh handling properly

**Spec References**:
- `CODEBASE-ANALYSIS/INTEGRATIONS-2025-02-10.md`

---

### Agent 6: Security Auditor

**Focus**: Identify security vulnerabilities

**Verification Tasks**:
- [ ] **SQL Injection**: All queries use parameterized statements
- [ ] **XSS**: All user input sanitized in rendering
- [ ] **CSRF**: Tokens implemented for state-changing operations
- [ ] **Auth Bypass**: All protected routes verified
- [ ] **Tenant Leaks**: No cross-tenant data access possible
- [ ] **Secrets**: No hardcoded credentials in codebase
- [ ] **OAuth**: State parameter validated, PKCE implemented
- [ ] **Session**: Secure flags set, short expiry enforced
- [ ] **Rate Limiting**: Applied to all public endpoints
- [ ] **Audit Logging**: All sensitive operations logged
- [ ] **Encryption**: Sensitive data encrypted at rest
- [ ] **MFA**: Required for super admin operations

**Validation Commands**:
```bash
# Find potential SQL injection
grep -r "sql\`.*\${" --include="*.ts" | grep -v "sql\`SELECT"

# Find hardcoded secrets
grep -rE "(api_key|secret|password|token)\s*=\s*['\"]" --include="*.ts"

# Check for unsafe innerHTML
grep -r "dangerouslySetInnerHTML" --include="*.tsx"
```

---

### Agent 7: Performance Auditor

**Focus**: Identify performance bottlenecks

**Verification Tasks**:
- [ ] **N+1 Queries**: No loops with individual database calls
- [ ] **Caching**: Redis caching implemented for hot paths
- [ ] **Bundle Size**:
  - [ ] Initial JS < 200KB
  - [ ] Largest route < 500KB
- [ ] **API Response Times**: P95 < 100ms for read operations
- [ ] **Database Queries**: All queries have explain plans < 100ms
- [ ] **Connection Pooling**: Properly configured per tenant
- [ ] **Image Optimization**: All images WebP, properly sized
- [ ] **Edge Caching**: Static assets cached at edge
- [ ] **ISR**: Appropriate revalidation times set

**Validation Commands**:
```bash
# Analyze bundle size
npm run build && npx @next/bundle-analyzer

# Check for N+1 patterns
grep -rE "for.*await.*sql\`" --include="*.ts"
```

---

### Agent 8: Documentation Auditor

**Focus**: Verify documentation completeness

**Verification Tasks**:
- [ ] Root CLAUDE.md complete with all patterns
- [ ] Each package has CLAUDE.md with:
  - [ ] Purpose and scope
  - [ ] Key exports
  - [ ] Usage examples
  - [ ] Common gotchas
- [ ] API documentation generated
- [ ] README.md complete for open-source distribution
- [ ] Environment variable documentation accurate
- [ ] Deployment runbook complete
- [ ] Incident response playbook drafted
- [ ] All specs cross-referenced correctly

**Spec References**:
- `CLAUDE-MD-PACKAGE-TEMPLATE.md`
- `README-TEMPLATE.md`

---

### Agent 9: Test Coverage Auditor

**Focus**: Verify critical flow test coverage

**Verification Tasks**:
- [ ] **Unit Tests**:
  - [ ] Auth functions (JWT, session, MFA)
  - [ ] Commerce provider abstraction
  - [ ] Database utilities
  - [ ] Utility functions
- [ ] **Integration Tests**:
  - [ ] API routes (auth, CRUD operations)
  - [ ] Database operations (tenant isolation)
  - [ ] Background job triggers
- [ ] **E2E Tests (Playwright)**:
  - [ ] User login flow
  - [ ] Admin navigation
  - [ ] Order management
  - [ ] Creator onboarding
  - [ ] Checkout flow
- [ ] **Performance Tests (k6)**:
  - [ ] API load testing
  - [ ] Concurrent user simulation
- [ ] Coverage thresholds:
  - [ ] Core packages > 80%
  - [ ] Critical paths > 90%

**Validation Commands**:
```bash
# Run tests with coverage
npm run test:coverage

# Check coverage thresholds
npx c8 check-coverage --lines 80
```

---

### Agent 10: Commerce Provider Auditor

**Focus**: Verify Shopify + Custom abstraction layer

**Verification Tasks**:
- [ ] `CommerceProvider` interface fully implemented
- [ ] `ShopifyCommerceProvider` complete:
  - [ ] Product queries (getProduct, getProducts, getCollection)
  - [ ] Cart operations (create, add, update, remove)
  - [ ] Checkout flow (create, redirect)
  - [ ] Inventory sync
  - [ ] Order management
- [ ] `CustomCommerceProvider` scaffolded (interface ready)
- [ ] Feature flag `commerce.provider` controls switching
- [ ] Per-tenant provider configuration working
- [ ] Webhook routing by tenant operational
- [ ] Error handling consistent across providers

**Spec References**:
- `COMMERCE-PROVIDER-SPEC-2025-02-10.md`

---

### Agent 11: MCP Tool Auditor

**Focus**: Verify 70+ MCP tools migrated and functional

**Verification Tasks**:
- [ ] Streamable HTTP transport implemented
- [ ] MCP handler class complete
- [ ] Per-request authentication working
- [ ] Streaming responses functional
- [ ] All 70+ tools from RAWDOG migrated:
  - [ ] Commerce tools (orders, products, customers)
  - [ ] Content tools (blog, landing pages)
  - [ ] Creator tools (pipeline, payouts)
  - [ ] Analytics tools (metrics, attribution)
  - [ ] Operations tools (health, logs)
- [ ] Tool registry with tenant filtering
- [ ] Rate limiting implemented:
  - [ ] Per-tenant limits
  - [ ] Per-tool limits
  - [ ] AI cost tracking
- [ ] Usage analytics captured
- [ ] Claude Connector OAuth integration ready

**Spec References**:
- `phases/PHASE-6A-MCP-TRANSPORT.md`
- `phases/PHASE-6B-MCP-TOOLS.md`

---

### Agent 12: Health Monitor Auditor

**Focus**: Verify 15+ health monitors operational

**Verification Tasks**:
- [ ] All monitors implemented:
  - [ ] Database connectivity
  - [ ] Redis connectivity
  - [ ] Shopify API
  - [ ] Stripe API
  - [ ] Wise API
  - [ ] Resend API
  - [ ] Mux API
  - [ ] AssemblyAI API
  - [ ] Yotpo API
  - [ ] Klaviyo API
  - [ ] Meta Ads API
  - [ ] Google Ads API
  - [ ] TikTok Ads API
  - [ ] Inngest jobs
  - [ ] Vercel functions
- [ ] 3 scheduling tiers configured:
  - [ ] Critical (1min): DB, Redis, Shopify
  - [ ] Core (5min): Stripe, Wise, Resend
  - [ ] Integration (15min): Ads, Analytics
- [ ] Alert system operational:
  - [ ] Slack notifications
  - [ ] Email notifications
  - [ ] PagerDuty integration (optional)
- [ ] Health matrix dashboard functional
- [ ] Per-tenant health status available

**Spec References**:
- `HEALTH-MONITORING-SPEC-2025-02-10.md`
- `phases/PHASE-2PO-HEALTH.md`

---

### Agent 13: Feature Flag Auditor

**Focus**: Verify 6 flag types and caching

**Verification Tasks**:
- [ ] All 6 flag types implemented:
  - [ ] Boolean (on/off)
  - [ ] Percentage rollout
  - [ ] User segment
  - [ ] Tenant override
  - [ ] Time-based (scheduled)
  - [ ] Multivariate (A/B)
- [ ] Consistent hashing for percentage rollouts
- [ ] Multi-layer caching:
  - [ ] In-memory (30s TTL)
  - [ ] Redis (5min TTL)
  - [ ] Database (source of truth)
- [ ] Flag management UI complete
- [ ] Audit log capturing flag changes
- [ ] SDK client for frontend evaluation
- [ ] Server-side evaluation middleware

**Spec References**:
- `FEATURE-FLAGS-SPEC-2025-02-10.md`
- `phases/PHASE-2PO-FLAGS.md`

---

### Agent 14: Onboarding Flow Auditor

**Focus**: Verify 9-step brand onboarding wizard

**Verification Tasks**:
- [ ] All 9 steps implemented:
  - [ ] Step 1: Basic Information (name, slug, colors, logo)
  - [ ] Step 2: Connect Shopify (OAuth + headless checkout config)
  - [ ] Step 3: Configure Domains (Vercel provisioning + DNS instructions)
  - [ ] Step 4: Configure Payments (Stripe Connect, Wise)
  - [ ] Step 5: Connect Integrations (Meta/Google/TikTok Ads, GA4, Klaviyo, Yotpo, Slack)
  - [ ] Step 6: Enable Features (module toggles, feature flags)
  - [ ] Step 7: Import Products (Shopify product sync to local DB)
  - [ ] Step 8: Invite Users (email invitations with roles)
  - [ ] Step 9: Review & Launch (checklist verification, go-live)
- [ ] "Can Skip" functionality for optional steps (3, 4, 5, 7, 8)
- [ ] Progress persistence across sessions
- [ ] Step validation before progression
- [ ] Rollback capability on failure
- [ ] Welcome email sent on completion
- [ ] Tenant schema created successfully
- [ ] Integration credentials stored encrypted
- [ ] Health check runs after completion

**Spec References**:
- `BRAND-ONBOARDING-SPEC-2025-02-10.md`
- `phases/PHASE-2PO-ONBOARDING.md`

---

### Agent 15: Super Admin Auditor

**Focus**: Verify orchestrator functionality

**Verification Tasks**:
- [ ] Super admin authentication working
- [ ] MFA enforced for sensitive operations
- [ ] **Impersonation system**:
  - [ ] Reason required
  - [ ] 1-hour session limit
  - [ ] All actions audited
  - [ ] Target user notified
  - [ ] Visual indicator in brand admin
- [ ] **Cross-tenant operations**:
  - [ ] Error explorer with tenant filter
  - [ ] Log viewer across tenants
  - [ ] Health matrix (service x tenant)
  - [ ] Job status across tenants
  - [ ] Webhook delivery status
- [ ] **Platform KPIs**:
  - [ ] Total GMV
  - [ ] Platform MRR
  - [ ] Active brands count
  - [ ] System health status
  - [ ] Error rate 24h
  - [ ] Uptime percentage
- [ ] **Audit logging**:
  - [ ] All super admin actions logged
  - [ ] Before/after state captured
  - [ ] IP address and user agent recorded
  - [ ] 90-day retention minimum

**Spec References**:
- `SUPER-ADMIN-ARCHITECTURE-2025-02-10.md`
- `phases/PHASE-2SA-*.md`

---

## Definition of Done

### Core Platform

- [ ] Turborepo monorepo fully operational
- [ ] All packages building without errors
- [ ] `tsc --noEmit` passes across all packages
- [ ] Linting passes (`npm run lint`)
- [ ] All dependencies up to date (no critical vulnerabilities)

### Brand Admin

- [ ] All 60+ admin sections functional
- [ ] White-label theming working (logo, colors)
- [ ] Custom domain support verified
- [ ] All navigation items working
- [ ] Badge counters updating correctly
- [ ] Real-time data refresh operational
- [ ] Mobile responsive layout complete

### Super Admin (Orchestrator)

- [ ] Super admin authentication working
- [ ] All brands visible in grid
- [ ] Health indicators accurate
- [ ] Impersonation functional with full audit
- [ ] Platform KPIs displaying correctly
- [ ] Error explorer operational
- [ ] Log viewer working
- [ ] Feature flag management complete

### Storefront

- [ ] Product pages rendering from Shopify
- [ ] Collection pages functional
- [ ] Cart operations working
- [ ] Checkout redirects correctly
- [ ] Reviews displaying
- [ ] A/B test assignment working
- [ ] Attribution tracking firing
- [ ] GA4 + Meta + TikTok pixels working
- [ ] Per-tenant theming applied
- [ ] Dynamic landing pages rendering

### Creator Portal

- [ ] Creator authentication working
- [ ] Multi-brand dashboard functional
- [ ] Stripe Connect payout working
- [ ] Wise payout working
- [ ] Balance display accurate
- [ ] Withdrawal request flow complete
- [ ] Project management functional
- [ ] File uploads working
- [ ] E-signature system operational
- [ ] W-9 collection working
- [ ] 1099 generation ready

### MCP Server

- [ ] Streamable HTTP transport operational
- [ ] All 70+ tools functional
- [ ] Per-tenant tool filtering working
- [ ] Rate limiting enforced
- [ ] Usage analytics captured
- [ ] Claude Connector ready

### Quality

- [ ] Zero critical security findings
- [ ] Zero high-severity bugs
- [ ] P95 API latency < 100ms
- [ ] Bundle size targets met
- [ ] Test coverage thresholds passed
- [ ] Documentation complete
- [ ] Runbooks prepared

---

## Tasks

### [PARALLEL] Auditor Agent Execution

Launch all 15 auditor agents simultaneously:

- [ ] Agent 1: Schema Validator
- [ ] Agent 2: API Route Auditor
- [ ] Agent 3: Feature Parity Checker
- [ ] Agent 4: Job Migration Auditor
- [ ] Agent 5: Integration Tester
- [ ] Agent 6: Security Auditor
- [ ] Agent 7: Performance Auditor
- [ ] Agent 8: Documentation Auditor
- [ ] Agent 9: Test Coverage Auditor
- [ ] Agent 10: Commerce Provider Auditor
- [ ] Agent 11: MCP Tool Auditor
- [ ] Agent 12: Health Monitor Auditor
- [ ] Agent 13: Feature Flag Auditor
- [ ] Agent 14: Onboarding Flow Auditor
- [ ] Agent 15: Super Admin Auditor

### [SEQUENTIAL after audits] Finding Consolidation

- [ ] Collect all agent reports
- [ ] Categorize findings by severity (Critical/High/Medium/Low)
- [ ] Identify blocking issues for production
- [ ] Create remediation tasks

### [SEQUENTIAL after consolidation] Critical Remediation

- [ ] Address all critical findings
- [ ] Address all high-severity findings
- [ ] Re-run affected auditor agents

### [SEQUENTIAL after remediation] Sign-off

- [ ] Complete Definition of Done checklist
- [ ] Obtain production readiness sign-off
- [ ] Document any accepted risks
- [ ] Create post-launch monitoring plan

---

## Constraints

- All 15 auditor agents MUST complete before production deployment
- Zero critical findings policy - no exceptions
- High-severity findings require remediation OR documented risk acceptance
- Audit reports must be preserved for compliance
- Re-audits required after any significant remediation

---

## Pattern References

**Skills to invoke:**
- `/webapp-testing` - E2E test validation
- `/frontend-design` - UI review

**MCPs to consult:**
- Context7 MCP: "security best practices"
- Context7 MCP: "performance optimization Next.js"
- Shopify Dev MCP: GraphQL validation

**RAWDOG code to reference:**
- `/src/lib/auth/debug.ts` - Auth pattern reference
- `/src/app/admin/layout.tsx` - Admin layout pattern

**Spec documents:**
- All CODEBASE-ANALYSIS docs for comparison
- All SPEC docs for requirements verification

---

## AI Discretion Areas

The implementing agent should determine the best approach for:

1. Order of auditor agent execution (all parallel is recommended)
2. Severity classification thresholds
3. Remediation prioritization when multiple issues exist
4. Trade-offs between fixing now vs documenting for post-launch
5. Depth of penetration testing for security audit

---

## Audit Report Template

Each auditor agent should produce a report in this format:

```markdown
# Auditor Agent {N} Report: {Focus Area}

## Summary
- **Status**: PASS | FAIL | PARTIAL
- **Critical Findings**: {count}
- **High Findings**: {count}
- **Medium Findings**: {count}
- **Low Findings**: {count}

## Checklist Results
[Completed checklist with pass/fail per item]

## Critical Findings
[Detailed description of any critical issues]

## High Severity Findings
[Detailed description of high-severity issues]

## Medium/Low Findings
[Summary of non-blocking issues]

## Recommendations
[Suggested improvements beyond requirements]

## Evidence
[Screenshots, logs, or command output supporting findings]
```
