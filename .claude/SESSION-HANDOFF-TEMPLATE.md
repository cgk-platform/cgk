# Session Handoff Template

> **Purpose**: Standard template for creating session handoff documents that preserve context between agent transitions

**Last Updated**: 2026-02-27
**Status**: Active Template
**Related**: [AGENT-COORDINATION.md](./AGENT-COORDINATION.md), [CONTEXT-MGMT.md](./CONTEXT-MGMT.md)

---

## When to Use This Template

Create a handoff document when:
- Context exceeds 120k-150k tokens
- Switching agent types (architect → implementer)
- Switching models (opus → sonnet)
- Reaching phase boundaries
- Ending a major work session
- Agent stuck or needs escalation

**Location**: `.claude/session-handoffs/[PHASE]-[TASK]-HANDOFF-[DATE].md`

---

## Template (Full Version)

Use this for major transitions:

```markdown
# [Phase/Task Name] Handoff

**Date**: YYYY-MM-DD
**From Agent**: [architect/implementer/reviewer/etc] ([opus/sonnet/haiku])
**To Agent**: [architect/implementer/reviewer/etc] ([opus/sonnet/haiku])
**Session ID**: [if known]
**Status**: [COMPLETE/IN_PROGRESS/BLOCKED]

---

## Executive Summary

[1-3 sentence overview of what was accomplished and what's next]

Example:
> Built the white-labeled admin portal framework at `apps/admin/`. This provides the shell (sidebar, header, mobile nav, dashboard, settings pages) that all subsequent admin features depend on. Next phase will implement content management features.

---

## Completed Tasks

### Major Deliverables
- [ ] [Deliverable 1 with location/link]
- [ ] [Deliverable 2 with location/link]
- [ ] [Deliverable 3 with location/link]

### Component Breakdown

#### Lib Layer ([N] files)
- `path/to/file.ts` - [Brief description of purpose and key functions]
- `path/to/another.ts` - [Brief description]

#### Components ([N] files)
- `path/to/component.tsx` - [Description with key features]
- `path/to/another.tsx` - [Description]

#### API Routes ([N] files)
- `path/to/route.ts` - [Endpoint purpose, methods supported]

#### Tests ([N] files)
- `path/to/test.ts` - [What's tested, coverage %]

#### Other Categories
[Add sections as needed: Database, Jobs, Documentation, etc.]

---

## Verification

**Type checking**:
- `pnpm turbo typecheck --filter=[app-name]` - [PASSES/FAILS with details]

**Linting**:
- `pnpm turbo lint --filter=[app-name]` - [PASSES/FAILS with details]

**Tests**:
- `pnpm test --filter=[app-name]` - [PASSES/FAILS with details]

**Validation**:
- `pnpm validate:tenant-isolation` - [PASSES/FAILS]
- `bash scripts/validate-migration.sh` - [PASSES/FAILS]

---

## Key Patterns Used

[Document the architectural/code patterns followed. This helps the next agent maintain consistency.]

Example:
- **Tenant isolation**: `withTenant()` for all tenant-scoped queries
- **Tenant cache**: `createTenantCache()` for config caching
- **Auth**: `requireAuth()` + `checkPermissionOrRespond()` in API routes
- **Server/client boundary**: `'use client'` only on interactive components
- **Feature flags**: Navigation sections filtered by tenant features config
- **Design system**: Editorial Precision aesthetic with Navy + Gold palette

---

## Critical State

### Database Changes
[List any schema changes, migrations run, seed data added]

Example:
- Created `oauth_providers` table in tenant schema
- Added `provider_type` enum: ['google', 'github', 'microsoft']
- Foreign key: `user_id UUID REFERENCES public.users(id)`
- Migration: `packages/db/src/migrations/020-oauth-providers.sql`

### Environment Variables Added/Changed
```bash
# [Category Name]
VAR_NAME=placeholder-value
ANOTHER_VAR=placeholder-value
```

**Action Required**: Add these to Vercel via `vercel env add`

### Configuration Changes
[Any changes to turbo.json, tsconfig.json, package.json, etc.]

### Architectural Decisions
1. **[Decision name]**: [Brief rationale]
2. **[Another decision]**: [Brief rationale]

[If ADR created, link to it: See `.claude/adrs/00X-decision-name.md`]

---

## Files Modified ([N] new + [M] modified)

### New Files
```
path/to/new/file1.ts
path/to/new/file2.tsx
path/to/new/file3.sql
[List all new files created]
```

### Modified Files
```
path/to/modified/file1.ts (summary of changes)
path/to/modified/file2.tsx (summary of changes)
[List all modified files with brief change description]
```

**Total Line Changes**: +[X] additions, -[Y] deletions

---

## Next Steps (Priority Ordered)

### Priority 1 (Critical Path)
1. [Next task with specific details]
2. [Another critical task]
3. [Third critical task]

### Priority 2 (Supporting Work)
4. [Supporting task]
5. [Another supporting task]

### Priority 3 (Documentation/Polish)
6. [Documentation task]
7. [Code cleanup task]

---

## Outstanding Issues

### Blockers
- [Issue blocking progress with details]
- [Another blocker]
- **None** [if no blockers]

### Open Questions
1. **[Question]**: [Context and why it matters]
2. **[Another question]**: [Options being considered]

### Risks
- **[Risk name]**: [Description + mitigation strategy]
- **[Another risk]**: [Description + mitigation]

### Technical Debt
- [Known debt item to address later]
- [Another debt item]

---

## Context Preservation

### Key Files to Reference
[List critical files the next agent should read before starting]

Example:
- `.claude/plans/oauth-integration.md` - Implementation plan
- `.claude/adrs/006-job-queue.md` - Background job architecture
- `packages/db/src/schema/tenants.sql` - Database schema
- `CLAUDE.md#Authentication` - Auth patterns

### Related Sessions
[Link to other handoff documents for related work]

Example:
- Session abc-111: Phase 2B Auth Foundation (JWT setup)
- Session abc-222: Phase 5A Jobs Setup (background jobs)
- `.claude/session-handoffs/PHASE-2A-HANDOFF.md` - Admin portal foundation

### Knowledge Base References
[Reference relevant knowledge base documents]

Example:
- `.claude/knowledge-bases/database-migration-patterns/` - Migration best practices
- `.claude/knowledge-bases/payment-processing-patterns/` - Stripe integration guide

---

## Cost Tracking

### This Session
- **Model**: [opus-4.5/sonnet-4.5/haiku]
- **Input Tokens**: [number]
- **Output Tokens**: [number]
- **Total Cost**: ~$[amount]
- **Duration**: [hours/minutes]

### Phase/Project Budget Status
- **Total Budget**: $[amount]
- **Spent So Far**: $[amount] (including this session)
- **Remaining**: $[amount]
- **Status**: [✅ On track / ⚠️ Over budget / 🔴 Needs adjustment]
- **Progress**: [X]% of budget used, [Y]% of work complete

### Cost Optimization Notes
[Any opportunities to save cost in future sessions]

Example:
- Used haiku for initial exploration (saved $2 vs opus)
- Batched similar routes in single session (saved $1 vs separate sessions)
- Total savings: ~$3 (83% reduction vs unoptimized approach)

---

## Resumption Instructions

### For New Session

1. **Read this handoff** first (critical context)
2. **Review plan** [if applicable] at `.claude/plans/[name].md`
3. **Check schema** [if applicable] at `packages/db/src/schema/[name].sql`
4. **Verify environment** variables are set
5. **Start implementation** with Priority 1 tasks
6. **Run validations** after each component

### Quick Start Commands
```bash
# Pull latest changes
git pull origin main

# Install dependencies (if needed)
pnpm install

# Verify configuration
npx @cgk-platform/cli doctor

# Start development server
cd apps/[app-name] && pnpm dev

# Run tests
pnpm test --filter=[app-name]
```

---

## Agent-Specific Notes

### For Implementer (Sonnet)
[Specific instructions for implementer agents]

Example:
- Follow plan exactly (no architectural changes without approval)
- Use tenant isolation patterns (see `CLAUDE.md#Tenant-Context-Wrapper`)
- Add tests for each component before moving to next
- Reference knowledge bases for domain-specific patterns

### For Reviewer (Opus)
[Specific instructions for reviewer agents]

Example:
- Focus on security-critical code (auth, payments, tenant isolation)
- Validate architectural patterns match ADRs
- Check for OWASP Top 10 vulnerabilities
- Verify test coverage for critical paths

### For Architect (Opus)
[Specific instructions for architect agents]

Example:
- Review existing ADRs before making new decisions
- Consider multi-tenant implications of all designs
- Document decisions in ADRs if precedent-setting
- Validate against platform constraints (Edge Runtime, etc.)

---

## Success Criteria

[How to know this work is complete]

Example:
Implementation complete when:
- [ ] All Priority 1 tasks finished
- [ ] All tests pass (`pnpm test`)
- [ ] No type errors (`pnpm turbo typecheck`)
- [ ] No lint errors (`pnpm turbo lint`)
- [ ] No tenant isolation violations (`pnpm validate:tenant-isolation`)
- [ ] Documentation updated
- [ ] Code reviewed and approved

---

## References

[External docs, API references, specs, etc.]

Example:
- [OAuth 2.0 Spec](https://datatracker.ietf.org/doc/html/rfc6749)
- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Next.js 16 Docs](https://nextjs.org/docs)
- Internal: `.claude/knowledge-bases/payment-processing-patterns/`

---

**End of Handoff**

_Next agent: Read this document fully before starting work. Reference linked plans and ADRs for additional context._
```

---

## Template (Minimal Version)

Use this for quick transitions within same agent type and model:

```markdown
# Quick Handoff: [Task Name]

**Date**: YYYY-MM-DD
**Status**: [COMPLETE/IN_PROGRESS]

---

## Completed
- [What was finished - bullet points]
- [Another completed item]

## Next
- [What's next - bullet points]
- [Another next step]

## Files Modified
- `path/to/file.ts` (+[X] lines, -[Y] lines)
- `path/to/another.tsx` (+[X] lines)

## Cost
- **Tokens**: [number]k
- **Cost**: ~$[amount]
- **Budget Remaining**: $[amount]

## Notes
[Any important context to preserve]

---

**Next agent**: [Specific instruction for resuming work]
```

---

## Existing Handoff Examples

The platform has **44 session handoff documents** at `.claude/session-handoffs/` following various patterns. Key examples:

### Phase Foundations
- `PHASE-0-HANDOFF.md` - Monorepo setup
- `PHASE-2A-HANDOFF.md` - Admin portal shell
- `PHASE-3A-STOREFRONT-HANDOFF.md` - Headless commerce
- `PHASE-4A-CREATOR-PORTAL-HANDOFF.md` - Creator portal foundation
- `PHASE-5-JOBS-HANDOFF.md` - Background job system

### Feature-Specific
- `PHASE-2AT-ATTRIBUTION-CORE-HANDOFF.md` - Attribution tracking
- `PHASE-2C-HANDOFF.md` - Content management
- `PHASE-2D-HANDOFF.md` - Finance features

### Bug Fixes & Maintenance
- `FRONTEND-FIX-HANDOFF-2026-02-16.md` - Frontend bug fixes

**Usage**: Reference these documents for patterns specific to your current work.

---

## Field-by-Field Guidance

### Executive Summary
- **Length**: 1-3 sentences
- **Content**: What was built + what's next
- **Purpose**: Give next agent immediate context without reading full doc
- **Example**: "Built OAuth integration for Google and GitHub. Next: Add token refresh job and UI for managing connected accounts."

### Completed Tasks
- **Format**: Checkboxes for visual clarity
- **Detail Level**: Enough to understand scope, not implementation details
- **Organization**: Group by category (lib, components, API, tests, etc.)
- **Purpose**: Show what's done so next agent doesn't duplicate work

### Verification
- **Always include**: Type check and lint results
- **Add if relevant**: Test results, validation scripts, manual testing notes
- **Purpose**: Prove code quality before handoff

### Key Patterns Used
- **List patterns**, not implementations
- **Purpose**: Help next agent maintain consistency
- **Examples**: Tenant isolation, auth checks, caching strategies

### Critical State
- **Database changes**: Schema, migrations, seed data
- **Env vars**: What was added/changed + deployment action needed
- **Config**: Changes to build/runtime configuration
- **Purpose**: Prevent "it works on my machine" issues

### Files Modified
- **New files**: Full paths
- **Modified files**: Path + summary of changes
- **Purpose**: Git-style change tracking for next agent

### Next Steps
- **Priority ordering**: Critical path → supporting → polish
- **Specificity**: Actionable tasks, not vague goals
- **Purpose**: Clear roadmap for next agent

### Outstanding Issues
- **Blockers**: Things that MUST be resolved to continue
- **Open Questions**: Decisions not yet made
- **Risks**: Known problems + mitigation plans
- **Tech Debt**: Shortcuts taken that need future cleanup
- **Purpose**: Transparent problem tracking

### Context Preservation
- **Key files**: What to read before starting
- **Related sessions**: Links to other handoffs
- **Knowledge bases**: Domain guides to reference
- **Purpose**: Efficient context loading

### Cost Tracking
- **This session**: Actual tokens/cost used
- **Budget status**: Total spent vs remaining
- **Optimization notes**: How to save cost next time
- **Purpose**: Financial accountability

### Agent-Specific Notes
- **Tailor to recipient**: Different instructions for implementer vs reviewer
- **Reference guides**: Point to relevant patterns/knowledge bases
- **Purpose**: Role-appropriate guidance

### Success Criteria
- **Checkbox format**: Clear done conditions
- **Measurable**: Not subjective ("all tests pass" not "code is good")
- **Purpose**: Definition of done

---

## Common Mistakes to Avoid

### ❌ Don't: Vague Summaries
```markdown
## Summary
Fixed some bugs and added features. Ready for next phase.
```

### ✅ Do: Specific Summaries
```markdown
## Summary
Fixed tenant isolation violations in 12 API routes by wrapping SQL queries in withTenant(). Added pre-commit hook to prevent future violations. Next: Extend validation to cache and job patterns.
```

---

### ❌ Don't: Missing Critical State
```markdown
## Completed
Created OAuth integration
```

### ✅ Do: Document State
```markdown
## Completed
Created OAuth integration

## Critical State
### Environment Variables Added
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
Action Required: Add to Vercel production

### Database Changes
- Added oauth_providers table (migration 020)
- Requires re-running migrations: npx @cgk-platform/cli migrate
```

---

### ❌ Don't: No Next Steps
```markdown
## Next
Finish the feature
```

### ✅ Do: Prioritized Tasks
```markdown
## Next Steps

### Priority 1 (Critical Path)
1. Implement token refresh background job in packages/jobs/src/handlers/oauth-refresh.ts
2. Add cron trigger for daily refresh check

### Priority 2 (Supporting Work)
3. Add UI to /admin/settings/integrations for managing providers
4. Add tests for refresh job

### Priority 3 (Documentation)
5. Update CLAUDE.md with OAuth setup instructions
```

---

## Changelog

- **2026-02-27**: Initial template based on 44 existing handoff documents
