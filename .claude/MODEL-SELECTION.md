# Model Selection Guide

> **Purpose**: Strategic guidelines for selecting Claude models (opus/sonnet/haiku) to optimize cost and performance

**Last Updated**: 2026-02-27
**Status**: Active
**Related**: [AGENT-COORDINATION.md](./AGENT-COORDINATION.md), [CONTEXT-MGMT.md](./CONTEXT-MGMT.md)

---

## Table of Contents

1. [Model Comparison](#model-comparison)
2. [Selection Decision Tree](#selection-decision-tree)
3. [Cost Optimization Strategies](#cost-optimization-strategies)
4. [Context Window Management](#context-window-management)
5. [Session Lifespan Guidelines](#session-lifespan-guidelines)
6. [Real-World Examples](#real-world-examples)

---

## Model Comparison

### Claude Model Specifications (February 2026)

| Model | Full Name | Input Cost | Output Cost | Speed | Context Window |
|-------|-----------|------------|-------------|-------|----------------|
| **Opus 4.5** | claude-opus-4-5-20251101 | $15/MTok | $75/MTok | Slow | 200k tokens |
| **Sonnet 4.5** | claude-sonnet-4-5-20250929 | $3/MTok | $15/MTok | Fast | 200k tokens |
| **Haiku** | claude-haiku-latest | $0.25/MTok | $1.25/MTok | Fastest | 200k tokens |

### Capability Comparison

| Capability | Opus 4.5 | Sonnet 4.5 | Haiku |
|------------|----------|------------|-------|
| **Complex reasoning** | Excellent | Very Good | Good |
| **Code generation** | Excellent | Excellent | Good |
| **Speed** | Slow | Fast | Fastest |
| **Architecture design** | Excellent | Good | Fair |
| **Security analysis** | Excellent | Very Good | Fair |
| **Documentation lookup** | Excellent | Very Good | Excellent (fast) |
| **Codebase exploration** | Good | Good | Excellent (fast) |
| **Test generation** | Excellent | Excellent | Good |
| **Debugging** | Excellent | Excellent | Good |
| **Cost efficiency** | Low | Medium | High |

---

## Selection Decision Tree

### Question 1: Is this a critical decision?

**Critical decisions** (use **opus-4.5**):
- Choosing database architecture (schema-per-tenant vs RLS)
- Designing authentication system (custom JWT vs Clerk)
- Planning multi-tenant isolation strategy
- Security-critical code reviews
- Irreversible technical choices (ADRs)
- Complex multi-component architecture design

**Non-critical decisions** → Continue to Question 2

---

### Question 2: Does it involve writing production code?

**Yes** → Use **sonnet-4.5**:
- Feature implementation from approved plans
- Bug fixes
- Refactoring existing code
- Test writing (unit, integration, E2E)
- API route development
- Database migration execution

**No** → Continue to Question 3

---

### Question 3: Is it exploration or lookup?

**Yes** → Use **haiku**:
- Finding files in codebase
- Searching for patterns (grep, glob)
- API documentation lookup
- Quick factual questions
- Preliminary research before planning
- File content scanning

**No** → Use **sonnet-4.5** as default

---

## Cost Optimization Strategies

### Strategy 1: Start Cheap, Escalate Smart

**Pattern**: Begin with haiku, escalate only when necessary

**Example: Unknown Bug Investigation**
```
1. haiku (researcher) - $0.50
   → Search codebase for error patterns
   → Check recent commits
   → Review documentation
   → Result: Found similar issue in docs

2. If not found, escalate to sonnet (debugger) - $3
   → Deep stack trace analysis
   → Run reproduction tests
   → Check logs and database state

3. If complex, escalate to opus (architect) - $15
   → Analyze architectural implications
   → Design comprehensive fix
   → Write ADR if pattern emerges
```

**Typical outcome**: 70% of bugs solved at haiku level ($0.50), 25% at sonnet ($3), 5% need opus ($15)

**Average cost per bug**: $1.50 vs $15 (90% savings)

---

### Strategy 2: Parallelize with Haiku

**Pattern**: Use multiple cheap agents instead of one expensive agent

**Example: Phase 8 Full Codebase Audit**

**Approach A (Sequential Opus)**:
```
1 opus agent, sequential file review
- Cost: 2M tokens × $15/MTok = $30 input + $15 output = ~$45
- Time: 8 hours (limited by model speed)
```

**Approach B (Parallel Haiku)**:
```
15 haiku agents, parallel directory audits
- Cost: 15 × (100k tokens × $0.25/MTok) = ~$3.75 total
- Time: 1 hour (parallel execution)
- Follow-up: opus reviews flagged items only ($5)
- Total: ~$9 (80% savings, 8x faster)
```

**When to use**:
- Independent file audits
- Documentation generation
- Pattern discovery across modules
- Test coverage analysis
- Dependency graph exploration

---

### Strategy 3: Batch Similar Work

**Anti-pattern** (context re-loading overhead):
```
Session 1: Fix bug in admin app (sonnet, 50k tokens)
[End session]

Session 2: Fix similar bug in storefront app (sonnet, 50k tokens)
[Re-loads entire context, wastes tokens]
```

**Optimized pattern**:
```
Session 1: Fix bugs in admin + storefront + orchestrator (sonnet, 80k tokens)
[Shares context, reuses patterns]
```

**Savings**: ~38% reduction in total tokens (80k vs 150k)

---

### Strategy 4: Use Haiku for Discovery, Sonnet for Implementation

**Example: New Feature Development**

**Phase 1: Discovery (haiku)**
```typescript
Task({
  subagent_type: 'Explore',
  model: 'haiku',
  prompt: 'Find all files related to authentication flow'
})
// Cost: ~$0.50, Time: 2 minutes
```

**Phase 2: Planning (opus)**
```typescript
Task({
  subagent_type: 'Plan',
  model: 'opus',
  prompt: 'Design OAuth integration architecture'
})
// Cost: ~$5, Time: 15 minutes
```

**Phase 3: Implementation (sonnet)**
```typescript
Task({
  subagent_type: 'implementer',
  model: 'sonnet',
  prompt: 'Implement plan from .claude/plans/oauth-integration.md'
})
// Cost: ~$8, Time: 30 minutes
```

**Total**: $13.50 vs $35 if using opus for everything (61% savings)

---

### Strategy 5: Cache-Aware Session Management

**Problem**: Re-loading large context in new sessions wastes tokens

**Solution**: Use handoff documents to preserve critical state

**Example**:
```markdown
# Handoff Document (500 tokens)

## Critical State
- Database schema: Added `oauth_providers` table
- API routes: Created `/api/auth/oauth/callback`
- Env vars: Added `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Files modified: 12 files (list below)

## Next Steps
1. Implement Google OAuth flow
2. Add tests for callback handler
3. Update documentation
```

**Benefit**: New session starts with 500-token handoff instead of re-reading 50k tokens of codebase (99% reduction)

---

## Context Window Management

### Token Budget Guidelines

| Session Type | Model | Target Budget | Max Budget | Trigger Fresh Session |
|--------------|-------|---------------|------------|----------------------|
| **Exploration** | haiku | 50k tokens | 100k tokens | 100k |
| **Implementation** | sonnet | 100k tokens | 150k tokens | 150k |
| **Architecture** | opus | 75k tokens | 120k tokens | 120k |
| **Review** | opus | 50k tokens | 80k tokens | 80k |
| **Debugging** | sonnet | 80k tokens | 120k tokens | 120k |

### When to Start Fresh Session

**Automatic triggers**:
1. **Context size** exceeds threshold (see table above)
2. **Phase milestone** reached (e.g., Phase 2A complete)
3. **Model switch** required (opus → sonnet or vice versa)
4. **Agent type change** (architect → implementer)
5. **Quality degradation** (agent forgetting earlier context)

**Manual triggers**:
1. **Complex task** requires fresh focus
2. **Different domain** (switching from auth to payments)
3. **Emergency escalation** (stuck agent, infinite loop)

### Fresh Session Checklist

- [ ] Create handoff document at `.claude/session-handoffs/`
- [ ] Summarize completed work (bullet points)
- [ ] List modified files with line counts
- [ ] Document critical state (env vars, schema changes)
- [ ] Outline next steps for new agent
- [ ] Track token usage and cost
- [ ] Reference related session handoffs

---

## Session Lifespan Guidelines

### Typical Session Lifespans

| Task Type | Model | Expected Duration | Token Range | Cost Range |
|-----------|-------|-------------------|-------------|------------|
| **Quick fix** | sonnet | 15-30 min | 20k-40k | $0.60-$1.20 |
| **Feature implementation** | sonnet | 1-2 hours | 80k-150k | $2.40-$4.50 |
| **Architecture planning** | opus | 30-60 min | 40k-80k | $6-$12 |
| **Security review** | opus | 45-90 min | 50k-100k | $7.50-$15 |
| **Codebase exploration** | haiku | 10-20 min | 30k-60k | $0.08-$0.15 |
| **Full phase audit** | haiku (parallel) | 1-2 hours | 1M-2M (total) | $2.50-$5 |

### Session Extension Anti-Patterns

**❌ Don't extend session if:**
- Token count >150k (context degradation risk)
- Agent repeating same solution >3 times (stuck)
- Switching from implementation to architecture (use opus)
- Switching from architecture to implementation (use sonnet)
- Major context shift (auth → payments)

**✅ Do extend session if:**
- Related work in same domain
- Token count <120k
- Agent making progress
- Cost of context re-load >$5

---

## Real-World Examples

### Example 1: Phase 2A - Admin Portal Setup

**Task**: Build admin portal foundation (Next.js app, auth, routes)

**Approach**:
```
1. architect (opus) - Plan structure
   - Duration: 45 min
   - Tokens: 60k
   - Cost: ~$9
   - Output: .claude/plans/phase-2a-admin.md

2. implementer (sonnet) - Build foundation
   - Duration: 2 hours
   - Tokens: 120k
   - Cost: ~$3.60
   - Output: apps/admin/ directory structure

3. tester (sonnet) - Add route tests
   - Duration: 30 min
   - Tokens: 40k
   - Cost: ~$1.20
   - Output: apps/admin/__tests__/

4. reviewer (opus) - Security check
   - Duration: 20 min
   - Tokens: 30k
   - Cost: ~$4.50
   - Output: Approval + minor fixes

Total: ~$18.30, 3.5 hours
```

**If using only opus**: ~$50, 5 hours (64% cost savings, 30% time savings)

---

### Example 2: Bug Hunt - Tenant Isolation Violation

**Task**: Find and fix all tenant isolation violations in codebase

**Approach A (Naive - Sequential Opus)**:
```
1 opus agent, manual file review
- Duration: 8 hours
- Tokens: 2M
- Cost: ~$45
```

**Approach B (Optimized - Parallel Haiku + Sonnet)**:
```
1. haiku agents (15 parallel) - Find violations
   - Duration: 1 hour
   - Tokens: 1.5M total (100k each)
   - Cost: ~$3.75
   - Output: List of violations

2. sonnet (implementer) - Fix violations
   - Duration: 1 hour
   - Tokens: 80k
   - Cost: ~$2.40
   - Output: Fixed code

3. opus (reviewer) - Validate fixes
   - Duration: 30 min
   - Tokens: 40k
   - Cost: ~$6
   - Output: Approval

Total: ~$12.15, 2.5 hours
```

**Savings**: 73% cost reduction, 69% time reduction

---

### Example 3: New Feature - Stripe Connect Onboarding

**Task**: Implement Stripe Connect onboarding flow for tenants

**Approach**:
```
1. haiku (researcher) - Explore Stripe docs + existing code
   - Duration: 15 min
   - Tokens: 40k
   - Cost: ~$0.10
   - Output: Relevant API endpoints, existing patterns

2. opus (architect) - Design onboarding flow
   - Duration: 1 hour
   - Tokens: 80k
   - Cost: ~$12
   - Output: Sequence diagram, DB schema changes, ADR

3. sonnet (implementer) - Implement flow
   - Duration: 2 hours
   - Tokens: 140k
   - Cost: ~$4.20
   - Output: API routes, UI components, tests

4. sonnet (tester) - Add E2E tests
   - Duration: 45 min
   - Tokens: 60k
   - Cost: ~$1.80
   - Output: Playwright test suite

5. opus (reviewer) - Security review (handles money!)
   - Duration: 30 min
   - Tokens: 50k
   - Cost: ~$7.50
   - Output: Approval + webhook validation fixes

Total: ~$25.60, 4.5 hours
```

**If using only opus**: ~$75, 6 hours (66% cost savings, 25% time savings)

---

## Cost Tracking Template

Use this template in handoff documents to track session costs:

```markdown
## Session Cost Summary

### Model Used
- **Primary Model**: sonnet-4.5
- **Secondary Model**: haiku (for exploration)

### Token Usage
- **Input Tokens**: 120,000
- **Output Tokens**: 18,000
- **Total Tokens**: 138,000

### Cost Breakdown
- **Input Cost**: 120k × $3/MTok = $0.36
- **Output Cost**: 18k × $15/MTok = $0.27
- **Total Cost**: $0.63

### Budget Status
- **Target Budget**: $5 (Phase 2A implementation)
- **Actual Cost**: $0.63
- **Remaining Budget**: $4.37
- **Efficiency**: ✅ 87% under budget

### Optimization Opportunities
- Used haiku for initial exploration (saved $2 vs opus)
- Batched similar routes in single session (saved $1 vs separate sessions)
- Total savings: ~$3 (83% reduction vs unoptimized approach)
```

---

## Decision Matrix

Quick reference for model selection:

| Task | Critical? | Production Code? | Exploration? | **Model** | Avg Cost |
|------|-----------|------------------|--------------|-----------|----------|
| Write ADR | ✅ Yes | No | No | **opus** | $10-15 |
| Design auth system | ✅ Yes | No | No | **opus** | $15-25 |
| Security review | ✅ Yes | No | No | **opus** | $10-20 |
| Implement feature | No | ✅ Yes | No | **sonnet** | $3-8 |
| Fix bug | No | ✅ Yes | No | **sonnet** | $1-5 |
| Write tests | No | ✅ Yes | No | **sonnet** | $2-6 |
| Find files | No | No | ✅ Yes | **haiku** | $0.10-0.50 |
| Lookup docs | No | No | ✅ Yes | **haiku** | $0.05-0.20 |
| Explore codebase | No | No | ✅ Yes | **haiku** | $0.20-1.00 |
| Debug unknown error | No | No | No | **haiku** → **sonnet** → **opus** | $0.50-15 |

---

## References

- [AGENT-COORDINATION.md](./AGENT-COORDINATION.md) - Agent orchestration guide
- [CONTEXT-MGMT.md](./CONTEXT-MGMT.md) - Session management strategies
- [SESSION-HANDOFF-TEMPLATE.md](./SESSION-HANDOFF-TEMPLATE.md) - Handoff document template
- [Claude API Pricing](https://www.anthropic.com/api) - Official pricing

---

## Changelog

- **2026-02-27**: Initial version with cost optimization strategies and real-world examples
