# Phase Definition of Done Template

> **Purpose**: Every phase MUST include a Definition of Done (DoD) checklist. Use this template.

---

## Standard Definition of Done

Copy this section into every phase document at the end:

```markdown
## Definition of Done

### Code Quality
- [ ] All tasks in this phase completed (no deferrals)
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] No `// TODO`, `// FIXME`, or `// PLACEHOLDER` comments
- [ ] All files under 650 lines
- [ ] Import statements use `import type` for type-only imports

### Tenant Isolation
- [ ] All database queries use `withTenant(tenantId, ...)`
- [ ] All cache operations use `createTenantCache(tenantId)`
- [ ] All background jobs include `tenantId` in payload
- [ ] All API routes call `getTenantContext(req)` first
- [ ] No hardcoded tenant IDs anywhere

### Testing
- [ ] Unit tests written for new utilities/functions
- [ ] Integration tests for new API routes
- [ ] Manual verification in debug mode completed

### Documentation
- [ ] Package CLAUDE.md updated if new patterns introduced
- [ ] Complex logic has inline comments explaining "why"
- [ ] API routes have JSDoc comments with @param and @returns

### Handoff Ready
- [ ] Type check passes
- [ ] No known blockers for next phase
- [ ] Dependencies clearly documented
```

---

## UI-Specific DoD (Add for UI phases)

```markdown
### UI Quality
- [ ] Mobile responsive (390px viewport tested)
- [ ] Desktop responsive (1440px viewport tested)
- [ ] Loading states implemented for async operations
- [ ] Error states implemented with user-friendly messages
- [ ] Empty states implemented with helpful guidance
- [ ] `/frontend-design` skill invoked for component design
- [ ] Consistent with existing design patterns
```

---

## API Route DoD (Add for API phases)

```markdown
### API Quality
- [ ] Permission checks implemented (`requirePermission` or `hasPermission`)
- [ ] Tenant context enforced on all routes
- [ ] Proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- [ ] Error responses follow standard format: `{ error: string, details?: any }`
- [ ] Rate limiting considered (add if needed)
- [ ] Request validation with Zod schemas
```

---

## Background Jobs DoD (Add for job phases)

```markdown
### Job Quality
- [ ] TenantId required in all event payloads
- [ ] Retry configuration set with exponential backoff
- [ ] Failure handling routes errors to monitoring
- [ ] Timeout configured appropriately
- [ ] Idempotent where possible (safe to retry)
- [ ] Logging added for debugging
```

---

## Database DoD (Add for schema phases)

```markdown
### Database Quality
- [ ] Migrations are reversible (down migration exists)
- [ ] Indexes added for frequently queried columns
- [ ] Foreign keys properly constrained
- [ ] Tenant schema correctly isolated
- [ ] No use of `db.connect()` or `db.query()`
- [ ] All queries use `sql` template tag
```

---

## Phase Handoff Criteria

### Minimum Requirements to Proceed

1. **All DoD items checked** - No exceptions
2. **Type check clean** - `npx tsc --noEmit` exits with 0
3. **No blocking issues** - Document if any exist
4. **Next phase unblocked** - Dependencies satisfied

### Handoff Documentation

Create handoff entry in `.claude/session-handoffs/`:

```markdown
## Handoff: [PHASE-ID] Complete

**Date**: [YYYY-MM-DD]
**Agent**: [agent ID or name]

### Completed
- [List major accomplishments]

### Files Created/Modified
- [List key files]

### Patterns Established
- [Note any new patterns for future reference]

### Known Issues (Non-blocking)
- [List any minor issues to address later]

### Next Phase Ready
- [PHASE-ID] can begin immediately
- Prerequisites satisfied: [list]
```

---

## Audit Checkpoint Protocol

After major phase groups, run a full audit:

### Phase 1 Complete (Foundation Audit)
```markdown
## Foundation Audit Checklist

- [ ] Monorepo builds successfully: `pnpm build`
- [ ] Database schema-per-tenant verified
- [ ] Auth JWT flow tested end-to-end
- [ ] All packages publish correctly
- [ ] Test suite passes: `pnpm test`
- [ ] No circular dependencies in packages
```

### Phase 2 Complete (Admin Audit)
```markdown
## Admin Platform Audit Checklist

- [ ] All 60+ admin sections functional
- [ ] RBAC permission system working
- [ ] Super admin impersonation tested
- [ ] Feature flags toggle correctly
- [ ] Health monitors reporting
- [ ] Logging aggregation working
- [ ] Brand onboarding wizard completes
```

### Phase 3 Complete (Storefront Audit)
```markdown
## Storefront Audit Checklist

- [ ] Product pages render with commerce provider
- [ ] Cart add/remove/update working
- [ ] Checkout flow completes (or mocked)
- [ ] Mobile responsive on all pages
- [ ] LCP < 2.5s on product pages
- [ ] Theme switching per tenant works
```

### Phase 4 Complete (Portals Audit)
```markdown
## External Portals Audit Checklist

- [ ] Creator portal authentication works
- [ ] Multi-brand context switching functional
- [ ] Stripe Connect onboarding tested
- [ ] Wise international payouts configured
- [ ] W-9 collection with encryption verified
- [ ] 1099 generation produces valid PDFs
- [ ] Vendor invoice workflow complete
```

### Phase 5 Complete (Jobs Audit)
```markdown
## Background Jobs Audit Checklist

- [ ] All 199 tasks migrated
- [ ] Tenant isolation in all job payloads
- [ ] Retry logic functioning
- [ ] Failed jobs route to monitoring
- [ ] Parallel run validation passed (48h)
- [ ] Old system safely disabled
```

### Phase 6 Complete (MCP Audit)
```markdown
## MCP Server Audit Checklist

- [ ] Streamable HTTP transport working
- [ ] All 70+ tools responding
- [ ] Rate limiting enforced
- [ ] Tenant isolation in all tools
- [ ] Claude Connector OAuth tested
- [ ] Tool annotations correct (readOnly, destructive, idempotent)
```

### Phase 7 Complete (Migration Audit)
```markdown
## Migration Audit Checklist

- [ ] All RAWDOG data migrated
- [ ] Row counts match source
- [ ] Foreign key integrity verified
- [ ] Encryption of sensitive fields confirmed
- [ ] Zero-downtime cutover successful
- [ ] Rollback procedure tested
- [ ] Old system decommission scheduled
```

---

## Severity Classification for Issues

### Critical (BLOCKER)
- Prevents phase completion
- Data loss or corruption risk
- Security vulnerability
- Tenant isolation failure

**Action**: STOP. Fix immediately. Do not proceed.

### High (MUST FIX)
- Significant functionality broken
- Performance severely degraded
- Major UX issue

**Action**: Fix before phase handoff.

### Medium (SHOULD FIX)
- Minor functionality issue
- Performance could be better
- Minor UX issue

**Action**: Document, fix if time permits, or defer with tracking.

### Low (NICE TO HAVE)
- Code style improvement
- Minor optimization
- Documentation enhancement

**Action**: Document for future improvement. OK to defer.
