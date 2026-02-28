# Context Management Guide

> **Purpose**: Strategies for managing context windows, session lifecycles, and knowledge preservation across agent handoffs

**Last Updated**: 2026-02-27
**Status**: Active
**Related**: [AGENT-COORDINATION.md](./AGENT-COORDINATION.md), [MODEL-SELECTION.md](./MODEL-SELECTION.md)

---

## Table of Contents

1. [Context Window Fundamentals](#context-window-fundamentals)
2. [Fresh Session Triggers](#fresh-session-triggers)
3. [Handoff Document Template](#handoff-document-template)
4. [Session Summary Format](#session-summary-format)
5. [Context Preservation Strategies](#context-preservation-strategies)
6. [Knowledge Persistence](#knowledge-persistence)

---

## Context Window Fundamentals

### Claude Model Context Limits

All Claude models (Opus 4.5, Sonnet 4.5, Haiku) support **200k token context windows**.

**Token Budget Allocation**:
```
200k total capacity
- 20k: System prompt + CLAUDE.md (fixed)
- 30k: Tool definitions + MCP context (fixed)
- 150k: Available for conversation (variable)
```

**Practical limits**:
- **Soft limit**: 150k tokens (start fresh session planning)
- **Hard limit**: 180k tokens (quality degradation, must start fresh)

### Token Consumption Patterns

| Activity | Token Cost | Example |
|----------|------------|---------|
| **Read file (500 lines)** | ~2k tokens | `Read file_path="/path/to/file.ts"` |
| **Grep results (50 matches)** | ~1k tokens | `Grep pattern="withTenant"` |
| **Agent response (complex)** | ~1k-3k tokens | Detailed implementation explanation |
| **Code generation (component)** | ~500-1k tokens | React component with tests |
| **Task tool invocation** | ~500 tokens | Launching sub-agent |

**Example session**:
```
1. Read 20 files (40k tokens)
2. Grep 10 patterns (10k tokens)
3. Generate 5 components (5k tokens)
4. Agent responses (15k tokens)
Total: 70k tokens (47% of 150k budget)
```

---

## Fresh Session Triggers

### Automatic Triggers (Start New Session When)

| Trigger | Threshold | Rationale | Action |
|---------|-----------|-----------|--------|
| **Context Size** | >150k tokens | Quality degradation risk | Create handoff document, start fresh |
| **Phase Boundary** | Phase complete | Audit checkpoint | Handoff + phase summary |
| **Model Switch** | opus ↔ sonnet | Different pricing/capabilities | Handoff with cost tracking |
| **Agent Type Change** | architect → implementer | Different role/focus | Handoff with plan reference |
| **Stuck State** | >3 failed iterations | Agent not progressing | Escalate + handoff |
| **Major Context Shift** | Domain change | Auth → Payments | Handoff to preserve focus |

### Manual Triggers (User-Initiated)

**Invoke fresh session for**:
- Complex multi-phase tasks (>5 hours estimated)
- Security-critical work requiring fresh focus
- After major debugging session (clean slate)
- When agent quality noticeably degrades

---

## Handoff Document Template

**Location**: `.claude/session-handoffs/PHASE-X-TASK-Y-HANDOFF.md`

**Template** (see [SESSION-HANDOFF-TEMPLATE.md](./SESSION-HANDOFF-TEMPLATE.md)):

```markdown
# Session Handoff: [Phase/Task Name]

**Date**: 2026-02-27
**From Agent**: architect (opus-4.5)
**To Agent**: implementer (sonnet-4.5)
**Session ID**: abc-123-xyz

---

## Executive Summary

[1-2 sentence overview of what was accomplished and what's next]

---

## Completed Work

### Deliverables
- [ ] Created implementation plan at `.claude/plans/feature-x.md`
- [ ] Designed database schema changes (3 tables)
- [ ] Identified architectural concerns (2 items)
- [ ] Wrote ADR-006 for decision on job queue architecture

### Files Modified
| File | Lines Changed | Purpose |
|------|---------------|---------|
| `packages/db/src/schema/tenants.sql` | +45 | Added `oauth_providers` table |
| `.claude/adrs/006-job-queue.md` | +120 | Documented queue architecture |
| `.claude/plans/oauth-integration.md` | +200 | Implementation plan |

**Total**: 3 files, 365 lines added

---

## Critical State

### Database Changes
- Created `oauth_providers` table in tenant schema
- Added `provider_type` enum: ['google', 'github', 'microsoft']
- Foreign key: `user_id UUID REFERENCES public.users(id)`

### Environment Variables Added
```bash
# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret
```

**Action Required**: Add these to Vercel for all apps via `vercel env add`

### Architectural Decisions
1. **OAuth flow**: Authorization Code Flow (not implicit)
2. **Token storage**: Encrypted in `oauth_providers.access_token` field
3. **Refresh strategy**: Background job refreshes tokens 24h before expiry

---

## Next Steps (For Implementer)

### Priority 1 (Critical Path)
1. Implement OAuth callback handler at `apps/admin/app/api/auth/oauth/callback/route.ts`
2. Add OAuth provider buttons to login page
3. Implement token encryption/decryption utilities in `@cgk-platform/auth`

### Priority 2 (Supporting Work)
4. Add tests for callback flow
5. Update admin UI to show connected OAuth providers
6. Add webhook handler for OAuth token revocation

### Priority 3 (Documentation)
7. Update `CLAUDE.md` with OAuth setup instructions
8. Add OAuth troubleshooting guide

---

## Outstanding Issues

### Blockers
- **None** - Ready for implementation

### Open Questions
1. **Token refresh timing**: 24h before expiry or on-demand? (Decided: 24h, see ADR-006)
2. **Multi-tenant scoping**: Global OAuth apps or per-tenant? (Decided: Global, see plan)

### Risks
- **Security**: Token encryption key management (mitigation: use `INTEGRATION_ENCRYPTION_KEY`)
- **Rate limits**: Google OAuth has 10 requests/second limit (mitigation: implement retry backoff)

---

## Context Preservation

### Key Files to Reference
- `.claude/plans/oauth-integration.md` - Implementation plan
- `.claude/adrs/006-job-queue.md` - Background job architecture
- `packages/db/src/schema/tenants.sql` - Database schema
- `CLAUDE.md#Authentication` - Auth patterns

### Related Sessions
- Session abc-111: Phase 2B Auth Foundation (JWT setup)
- Session abc-222: Phase 5A Jobs Setup (background jobs)

---

## Cost Tracking

### This Session
- **Model**: opus-4.5
- **Input Tokens**: 80,000
- **Output Tokens**: 12,000
- **Total Cost**: ~$13.20

### Phase Budget Status
- **Phase 2B Budget**: $50
- **Spent So Far**: $28.50 (this session + previous)
- **Remaining**: $21.50
- **Status**: ✅ On track (57% of budget used, 70% of phase complete)

---

## Resumption Instructions

### For New Session

1. **Read this handoff** first
2. **Review plan** at `.claude/plans/oauth-integration.md`
3. **Check schema** at `packages/db/src/schema/tenants.sql`
4. **Start implementation** with Priority 1 tasks
5. **Run tests** after each component

### Quick Start Command
```bash
# Pull latest
git pull origin main

# Verify schema
npx @cgk-platform/cli doctor

# Start admin app
cd apps/admin && pnpm dev
```

---

## Agent-Specific Notes

### For Implementer (Sonnet)
- Follow plan exactly (no architectural changes)
- Use tenant isolation patterns (see `CLAUDE.md#Tenant-Context-Wrapper`)
- Add tests for each component before moving to next
- Reference `knowledge-bases/payment-processing-patterns/` for Stripe patterns

### For Reviewer (Opus) - If Review Requested
- Focus on OAuth token encryption (security-critical)
- Validate PKCE flow implementation
- Check CSRF protection on callback handler
- Verify tenant isolation in provider storage

---

## Success Criteria

Implementation complete when:
- [ ] OAuth flow works end-to-end (Google + GitHub)
- [ ] Tokens stored encrypted in database
- [ ] All tests pass (`pnpm test`)
- [ ] No tenant isolation violations (`pnpm validate:tenant-isolation`)
- [ ] Documentation updated

---

## References

- [OAuth 2.0 Spec](https://datatracker.ietf.org/doc/html/rfc6749)
- [Google OAuth Guide](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Guide](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps)
- Internal: `.claude/knowledge-bases/database-migration-patterns/`

---

**End of Handoff**

_Next agent: Read this document fully before starting work. Reference plan and ADRs for context._
```

---

## Session Summary Format

### Minimal Summary (For Quick Handoffs)

Use when:
- Same agent type continuing work
- Context <100k tokens
- No architectural changes

```markdown
# Quick Handoff: [Task]

## Completed
- Fixed bug in `apps/admin/app/api/orders/route.ts:45`
- Added test in `apps/admin/__tests__/api/orders.test.ts`

## Next
- Fix similar bug in storefront app

## Files
- `apps/admin/app/api/orders/route.ts` (+5, -3)
- `apps/admin/__tests__/api/orders.test.ts` (+25)

## Cost
- Tokens: 45k, Cost: $1.35
```

### Full Summary (For Major Transitions)

Use when:
- Agent type change (architect → implementer)
- Model switch (opus → sonnet)
- Phase boundary
- Context >120k tokens

Use the full template above.

---

## Context Preservation Strategies

### Strategy 1: Handoff Documents

**Purpose**: Preserve critical state between sessions without re-loading entire context.

**Benefits**:
- **99% token reduction**: 500-token handoff vs 50k-token context re-load
- **Cost savings**: ~$1.50 saved per session transition
- **Quality**: Agent gets curated summary instead of noisy full history

**When to use**: Every session transition (150k token threshold or phase boundary)

---

### Strategy 2: Session Memory Summaries

**Location**: `~/.claude/projects/-Users-holdenthemic-Documents-cgk/[session-id]/session-memory/summary.md`

**Purpose**: Automatic summaries of long sessions by Claude Code.

**Content**:
- Key decisions made
- Files modified
- Problems solved
- Outstanding issues

**Usage**:
```bash
# Search past session summaries
Grep pattern="tenant isolation" path="~/.claude/projects/-Users-holdenthemic-Documents-cgk/" glob="**/session-memory/summary.md"
```

---

### Strategy 3: Session Transcript Logs

**Location**: `~/.claude/projects/-Users-holdenthemic-Documents-cgk/[session-id].jsonl`

**Purpose**: Full conversation history in JSONL format.

**Usage**:
```bash
# Search full transcript for specific error
Grep pattern="MIDDLEWARE_INVOCATION_FAILED" path="~/.claude/projects/-Users-holdenthemic-Documents-cgk/" glob="*.jsonl"
```

**When to use**:
- Debugging recurring issues
- Finding when a decision was made
- Recovering lost context

---

### Strategy 4: Plan Documents

**Location**: `.claude/plans/[feature-name].md`

**Purpose**: Implementation plans created by architect agents.

**Content**:
- Feature requirements
- Architecture design
- File modification list
- Testing strategy
- Rollout plan

**Benefits**:
- **Single source of truth** for implementation
- **Persistent reference** across sessions
- **Handoff efficiency**: "Implement plan at `.claude/plans/oauth.md`"

**Example**:
```markdown
# Plan: OAuth Integration

## Scope
Add Google and GitHub OAuth to admin portal

## Architecture
[Sequence diagram]

## Files to Modify
1. `apps/admin/app/api/auth/oauth/callback/route.ts` (new)
2. `packages/db/src/schema/tenants.sql` (+45 lines)
3. `packages/auth/src/oauth.ts` (new)

## Implementation Steps
[Detailed steps]

## Testing
[Test cases]

## Rollout
[Deployment plan]
```

---

### Strategy 5: Knowledge Bases

**Location**: `.claude/knowledge-bases/[domain]/`

**Purpose**: Persistent domain knowledge that agents can reference.

**Content**:
- Database migration patterns
- Payment processing guides
- Shopify API reference
- Figma design system

**Benefits**:
- **Reduces context load**: Reference guide instead of re-explaining patterns
- **Consistency**: All agents follow same patterns
- **Onboarding**: New agents get domain knowledge fast

**Example reference**:
```typescript
// In agent prompt
"Follow database migration patterns from .claude/knowledge-bases/database-migration-patterns/README.md"
```

---

## Knowledge Persistence

### Persistent Artifacts (Always Available)

| Artifact | Location | Purpose | Lifespan |
|----------|----------|---------|----------|
| **CLAUDE.md** | `/CLAUDE.md` | Platform instructions | Permanent |
| **ADRs** | `.claude/adrs/` | Architecture decisions | Permanent |
| **Plans** | `.claude/plans/` | Implementation plans | Per-feature |
| **Knowledge Bases** | `.claude/knowledge-bases/` | Domain knowledge | Permanent |
| **Session Handoffs** | `.claude/session-handoffs/` | Transition docs | Per-phase |
| **Agent Definitions** | `.claude/agents/` | Agent personas | Permanent |

### Ephemeral Context (Session-Scoped)

| Context | Scope | When Lost |
|---------|-------|-----------|
| **Conversation history** | Current session | Session ends |
| **Tool results** | Current response | Next user message |
| **Agent memory** | Current agent | Agent switches |

### Context Recovery Strategies

**Scenario: Lost context after session end**

**Recovery**:
1. **Check handoff documents** at `.claude/session-handoffs/` for transition summary
2. **Search session summaries** with grep pattern in `session-memory/summary.md` files
3. **Search transcripts** in `.jsonl` files for specific details
4. **Reference plans** at `.claude/plans/` for implementation context

**Example**:
```bash
# Find when OAuth decision was made
Grep pattern="OAuth" path="~/.claude/projects/-Users-holdenthemic-Documents-cgk/" glob="**/session-memory/summary.md"

# Get detailed context
Read file_path="~/.claude/projects/-Users-holdenthemic-Documents-cgk/[session-id].jsonl" | grep "OAuth"
```

---

## Best Practices

### DO: Proactive Handoffs

✅ **Create handoff document at 120k tokens** (before hitting 150k limit)
✅ **Summarize critical state** (env vars, schema changes, decisions)
✅ **List modified files** with line counts
✅ **Track costs** in every handoff

### DON'T: Context Waste

❌ **Don't re-read entire codebase** in new sessions (use handoffs)
❌ **Don't continue session past 150k tokens** (quality degrades)
❌ **Don't switch agents without handoff** (context loss)
❌ **Don't ignore cost tracking** (budget overruns)

---

## Handoff Checklist

Before ending session:

- [ ] Token count <150k? (If no, create handoff now)
- [ ] Phase milestone reached? (If yes, create handoff + summary)
- [ ] Agent type changing? (If yes, create handoff with role-specific notes)
- [ ] Model switching? (If yes, track cost in handoff)
- [ ] Critical state to preserve? (Document env vars, schema changes, decisions)
- [ ] Files modified? (List all with line counts)
- [ ] Outstanding issues? (Document blockers, open questions, risks)
- [ ] Next steps clear? (Priority 1/2/3 task list)
- [ ] Cost tracked? (Token usage, cost, budget status)
- [ ] References added? (Links to plans, ADRs, knowledge bases)

---

## References

- [AGENT-COORDINATION.md](./AGENT-COORDINATION.md) - Agent orchestration
- [MODEL-SELECTION.md](./MODEL-SELECTION.md) - Cost optimization
- [SESSION-HANDOFF-TEMPLATE.md](./SESSION-HANDOFF-TEMPLATE.md) - Full template
- [session-handoffs/](./session-handoffs/) - 44 existing handoff examples

---

## Changelog

- **2026-02-27**: Initial version with context management strategies and handoff templates
