# Agent Coordination Guide

> **Purpose**: Comprehensive guide for orchestrating Claude agents across the CGK multi-tenant platform

**Last Updated**: 2026-02-27
**Status**: Active
**Related**: [MODEL-SELECTION.md](./MODEL-SELECTION.md), [CONTEXT-MGMT.md](./CONTEXT-MGMT.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Agent Types & Capabilities](#agent-types--capabilities)
3. [Model Assignment Strategy](#model-assignment-strategy)
4. [Task-to-Agent Mapping](#task-to-agent-mapping)
5. [Coordination Patterns](#coordination-patterns)
6. [Handoff Workflows](#handoff-workflows)
7. [Parallel vs Sequential Execution](#parallel-vs-sequential-execution)
8. [Emergency Procedures](#emergency-procedures)
9. [Cost Optimization](#cost-optimization)

---

## Overview

The CGK platform uses specialized Claude agents for different types of work. This guide defines how to select, coordinate, and optimize agent workflows for maximum efficiency and minimum cost.

### Key Principles

1. **Start Cheap, Scale Up**: Begin with haiku for exploration, escalate to opus only for critical decisions
2. **Specialize**: Use the right agent for the right task (don't use architect for coding)
3. **Parallelize**: Run independent agents concurrently whenever possible
4. **Handoff Cleanly**: Session transitions must preserve context via handoff documents
5. **Track Costs**: Monitor token usage and optimize model selection

---

## Agent Types & Capabilities

### Available Agents

Located in `.claude/agents/`, these agent definitions provide specialized capabilities:

| Agent | Model | Primary Role | Secondary Capabilities |
|-------|-------|--------------|----------------------|
| **architect** | opus-4.5 | System design, architecture decisions | Plan creation, ADR authoring, dependency analysis |
| **implementer** | sonnet-4.5 | Production code writing | Feature implementation, refactoring, bug fixes |
| **reviewer** | opus-4.5 | Code quality, security audits | Standards enforcement, vulnerability detection |
| **debugger** | sonnet-4.5 | Root cause analysis, bug investigation | Stack trace analysis, test failure diagnosis |
| **researcher** | haiku | Fast documentation lookup, codebase exploration | API reference checks, pattern discovery |
| **tester** | sonnet-4.5 | Test generation, TDD workflows | Unit tests, integration tests, E2E tests |
| **refactorer** | sonnet-4.5 | Large-scale code restructuring | Module extraction, pattern migration |

### Specialized Sub-Agents (Used via Task Tool)

| Sub-Agent | Model | Purpose | Invocation |
|-----------|-------|---------|------------|
| **Explore** | haiku | Fast codebase exploration | `Task tool with subagent_type=Explore` |
| **Plan** | opus-4.5 | Implementation planning | `EnterPlanMode` or `Task tool with subagent_type=Plan` |

---

## Model Assignment Strategy

### Claude Model Comparison

| Model | Cost (Input/Output per MTok) | Speed | Best For |
|-------|------------------------------|-------|----------|
| **Opus 4.5** | $15 / $75 | Slow | Complex architecture, security reviews, critical decisions |
| **Sonnet 4.5** | $3 / $15 | Fast | Production code, debugging, testing |
| **Haiku** | $0.25 / $1.25 | Fastest | Exploration, documentation lookup, simple queries |

### Selection Guidelines

**Use Opus 4.5 when:**
- Designing multi-component architectures
- Making irreversible technical decisions (ADRs)
- Security-critical code reviews
- Planning complex migrations
- Resolving architectural conflicts

**Use Sonnet 4.5 when:**
- Writing production code
- Debugging errors
- Implementing features from approved plans
- Writing tests
- Refactoring existing code

**Use Haiku when:**
- Exploring codebases to find files/patterns
- Looking up API documentation
- Answering simple factual questions
- Quick file searches
- Preliminary research before planning

### Cost Example

**Phase 8 Audit Scenario**:
- **1 opus agent** sequential audit: ~$300, 8 hours
- **15 haiku agents** parallel audit: ~$30, 1 hour
- **Savings**: 10x cost reduction, 8x time reduction

---

## Task-to-Agent Mapping

### CGK-Specific Task Assignments

| Task Type | Agent | Model | Rationale |
|-----------|-------|-------|-----------|
| **New feature planning** | architect → implementer | opus → sonnet | Architect designs, implementer codes |
| **Bug investigation** | debugger | sonnet | Fast root cause analysis |
| **Security audit** | reviewer | opus | Critical security decisions |
| **Test writing** | tester | sonnet | Production test quality |
| **Code refactoring** | refactorer | sonnet | Large-scale safe changes |
| **Codebase exploration** | researcher or Explore | haiku | Fast, cheap exploration |
| **Migration planning** | architect | opus | High-stakes decision |
| **Migration execution** | implementer | sonnet | Careful implementation |
| **Documentation lookup** | researcher | haiku | Quick reference checks |
| **Tenant isolation review** | reviewer | opus | Security-critical validation |

### Workflow Patterns

**Pattern 1: Feature Implementation**
```
1. architect (opus) → Create plan
2. implementer (sonnet) → Write code
3. tester (sonnet) → Add tests
4. reviewer (opus) → Security/quality check
```

**Pattern 2: Bug Fix**
```
1. debugger (sonnet) → Diagnose issue
2. implementer (sonnet) → Fix code
3. tester (sonnet) → Add regression test
```

**Pattern 3: Large Refactoring**
```
1. architect (opus) → Design approach
2. refactorer (sonnet) → Execute in isolated worktree
3. tester (sonnet) → Verify all tests pass
4. reviewer (opus) → Validate correctness
```

**Pattern 4: Phase Audit**
```
1. researcher (haiku) → Explore files (parallel: 5 agents)
2. reviewer (opus) → Validate critical items
3. implementer (sonnet) → Fix violations
```

---

## Coordination Patterns

### 1. Sequential Handoff

**When to use**: Tasks with dependencies where later steps need earlier results.

**Example**: Feature implementation
```
architect (opus)
  ↓ [handoff: plan document]
implementer (sonnet)
  ↓ [handoff: code changes]
tester (sonnet)
  ↓ [handoff: test coverage]
reviewer (opus)
  ↓ [handoff: approval or feedback]
```

**Handoff Document Structure**:
```markdown
# Handoff: [Task Name]

## Previous Agent
- Type: architect
- Model: opus-4.5
- Session ID: abc123

## Completed Work
- Created implementation plan at /path/to/plan.md
- Identified 5 critical files for modification
- Flagged 2 architectural concerns

## Next Agent Instructions
- Implement plan in /path/to/plan.md
- Follow tenant isolation patterns (see TENANT-ISOLATION.md)
- Add tests for edge cases (list in plan)

## Context Preservation
- Database schema changes: [summary]
- API route changes: [summary]
- Breaking changes: None
```

### 2. Parallel Execution

**When to use**: Independent tasks that can run concurrently.

**Example**: Phase 8 audit with 15 parallel agents
```
[architect creates task list]
  ↓
┌─────────┬─────────┬─────────┬─────────┐
│ haiku 1 │ haiku 2 │ haiku 3 │ ... 15  │ (parallel file audits)
└─────────┴─────────┴─────────┴─────────┘
  ↓ [aggregate results]
[reviewer validates critical findings]
  ↓
[implementer fixes violations]
```

**Invocation** (single message with multiple Task calls):
```typescript
// Launch 15 agents in parallel
Task({ subagent_type: 'Explore', prompt: 'Audit apps/admin/**/*.tsx' })
Task({ subagent_type: 'Explore', prompt: 'Audit apps/storefront/**/*.tsx' })
Task({ subagent_type: 'Explore', prompt: 'Audit apps/orchestrator/**/*.tsx' })
// ... 12 more
```

### 3. Escalation Pattern

**When to use**: Start cheap, escalate to more powerful models only when needed.

**Example**: Debugging unknown error
```
haiku (researcher)
  → Explore codebase for error patterns
  → If found: return solution
  → If not found: escalate ↓

sonnet (debugger)
  → Deep dive into error context
  → Run tests, check logs
  → If fixed: return solution
  → If complex: escalate ↓

opus (architect)
  → Analyze architectural implications
  → Design comprehensive fix
  → Return solution
```

### 4. Background Execution

**When to use**: Long-running tasks that don't block other work.

**Example**: Full codebase type check
```typescript
// Run in background
Task({
  subagent_type: 'implementer',
  prompt: 'Run pnpm turbo typecheck and fix all errors',
  run_in_background: true
})

// Continue other work while it runs
// Check status later with TaskOutput
```

---

## Handoff Workflows

### Standard Handoff Process

**Step 1: Session Completion Check**
- Context exceeds 150k tokens?
- Phase milestone reached?
- Agent switching types (opus → sonnet)?

**Step 2: Create Handoff Document**
```bash
# Location: .claude/session-handoffs/
touch .claude/session-handoffs/PHASE-X-TASK-Y-HANDOFF.md
```

**Step 3: Document Structure** (see [SESSION-HANDOFF-TEMPLATE.md](./SESSION-HANDOFF-TEMPLATE.md))
- Previous agent summary
- Completed work
- Next agent instructions
- Context preservation (critical state)
- Files modified (list with line counts)
- Outstanding issues
- Cost tracking (tokens used)

**Step 4: Resume New Session**
```typescript
// In new session, reference handoff
Task({
  subagent_type: 'implementer',
  resume: 'previous-agent-id',  // Continues with full context
  prompt: 'See handoff at .claude/session-handoffs/PHASE-X-TASK-Y-HANDOFF.md'
})
```

### Handoff Triggers (Start New Session When)

| Trigger | Threshold | Action |
|---------|-----------|--------|
| **Context Size** | >150k tokens | Create handoff, start fresh |
| **Phase Boundary** | Phase complete | Audit checkpoint + handoff |
| **Model Switch** | opus → sonnet or vice versa | Handoff to preserve context |
| **Agent Type Change** | architect → implementer | Handoff with plan document |
| **Error State** | Stuck >3 iterations | Escalate to opus with handoff |

### Existing Handoff Documents

The platform has **44 session handoff documents** at `.claude/session-handoffs/`. These provide templates and patterns for common transitions. Key examples:

- `PHASE-2A-ADMIN-SETUP-HANDOFF.md` - Admin portal foundation
- `PHASE-3A-STOREFRONT-HANDOFF.md` - Headless commerce setup
- `PHASE-4A-CREATOR-PORTAL-HANDOFF.md` - Creator portal foundation
- `PHASE-5-JOBS-HANDOFF.md` - Background job system

**Usage**: Reference these documents for handoff patterns specific to your current phase.

---

## Parallel vs Sequential Execution

### When to Parallelize

**✅ Good candidates for parallel execution:**
- Independent file audits (no shared state)
- Multiple package builds (if dependencies allow)
- Simultaneous documentation lookups
- Testing multiple features independently
- Exploring different areas of codebase

**❌ Bad candidates (must be sequential):**
- Database migrations (order-dependent)
- Dependent builds (package A needs package B)
- Test suites with shared database state
- Git operations (commits, pushes)
- Feature implementation from a single plan (coherence)

### Parallel Execution Guidelines

**1. Use Single Message with Multiple Task Calls**
```typescript
// CORRECT - All agents start simultaneously
<single response>
Task({ prompt: 'Audit admin app' })
Task({ prompt: 'Audit storefront app' })
Task({ prompt: 'Audit orchestrator app' })
</single response>

// WRONG - Sequential execution
Task({ prompt: 'Audit admin app' })
[wait for completion]
Task({ prompt: 'Audit storefront app' })
```

**2. Aggregate Results**
```typescript
// After parallel execution completes
const results = [agent1Result, agent2Result, agent3Result]
const summary = aggregateFindings(results)
```

**3. Cost-Benefit Analysis**
- **Parallel haiku agents**: $0.25/MTok × 15 agents = ~$4 total
- **Sequential opus agent**: $15/MTok × 1 agent = $15 (slower)
- **Savings**: 75% cost reduction + 90% time reduction

---

## Emergency Procedures

### Stuck Agent (Infinite Loop)

**Symptoms**:
- Agent repeats same action >3 times
- No progress on task after 10 iterations
- Context window approaching limit (>180k tokens)

**Resolution**:
1. **Stop current agent** (if background task: `TaskStop`)
2. **Create handoff document** with error state details
3. **Escalate to opus** (architect or reviewer)
4. **Start fresh session** with handoff reference

### Context Overflow

**Symptoms**:
- Token usage >180k
- Response quality degrading
- Agent forgetting earlier context

**Resolution**:
1. **Immediate handoff** - Create comprehensive handoff document
2. **Summarize key state** - Critical context only (files, decisions, errors)
3. **Start new session** with handoff reference
4. **Resume agent** using `resume` parameter if applicable

### Tenant Isolation Violation

**Symptoms**:
- Pre-commit hook blocks commit
- Validator finds raw SQL/cache/jobs without tenant context

**Resolution**:
1. **Stop implementation** - Do NOT bypass hook
2. **Invoke reviewer (opus)** - Security-critical validation
3. **Fix violations** - Use implementer (sonnet) with reviewer guidance
4. **Re-validate** - Run `pnpm validate:tenant-isolation`

### Migration Failure

**Symptoms**:
- Migration validator fails pre-commit
- ID type mismatch errors
- Missing IF NOT EXISTS

**Resolution**:
1. **Run migration validator** - `bash scripts/validate-migration.sh`
2. **Review errors** - Identify specific violations
3. **Consult knowledge base** - `knowledge-bases/database-migration-patterns/`
4. **Fix with implementer** - Apply validated patterns
5. **Re-validate** before commit

---

## Cost Optimization

### Token Budget Guidelines

| Session Type | Model | Target Budget | Max Budget |
|--------------|-------|---------------|------------|
| **Exploration** | haiku | 50k tokens | 100k tokens |
| **Implementation** | sonnet | 100k tokens | 150k tokens |
| **Architecture** | opus | 75k tokens | 120k tokens |
| **Review** | opus | 50k tokens | 80k tokens |

### Optimization Strategies

**1. Batch Similar Work**
```typescript
// GOOD - Single session for related tasks
Task({ prompt: 'Implement feature A, B, and C together' })

// BAD - Separate sessions (context re-loading overhead)
Task({ prompt: 'Implement feature A' })
[new session]
Task({ prompt: 'Implement feature B' })
```

**2. Use Haiku for Discovery**
```typescript
// Phase 1: Haiku exploration (~$1)
Task({
  subagent_type: 'Explore',
  model: 'haiku',
  prompt: 'Find all files with tenant isolation violations'
})

// Phase 2: Sonnet implementation (~$5)
Task({
  subagent_type: 'implementer',
  model: 'sonnet',
  prompt: 'Fix violations found in exploration phase'
})

// Total: ~$6 vs ~$50 if using opus for everything
```

**3. Parallelize with Haiku**
```typescript
// 15 parallel haiku agents (~$3 total)
// vs 1 sequential opus agent (~$30 total)
// Savings: 90% cost + 80% time
```

**4. Cache Context**
- Use handoff documents to preserve context
- Avoid re-reading entire codebase in new sessions
- Reference existing session handoffs (44 documents available)

**5. Monitor Token Usage**
- Track token counts in handoff documents
- Set alerts at 150k tokens
- Start fresh sessions proactively before overflow

### Cost Tracking Template

```markdown
## Session Cost Summary

- **Model**: sonnet-4.5
- **Input Tokens**: 85,000
- **Output Tokens**: 12,000
- **Estimated Cost**: ~$3.50
- **Task**: Phase 2A Admin Portal Setup
- **Efficiency**: On budget (target: <$5)
```

---

## References

- [MODEL-SELECTION.md](./MODEL-SELECTION.md) - Detailed model selection criteria
- [CONTEXT-MGMT.md](./CONTEXT-MGMT.md) - Session management strategies
- [SESSION-HANDOFF-TEMPLATE.md](./SESSION-HANDOFF-TEMPLATE.md) - Handoff document template
- [SKILL-REGISTRY.md](./SKILL-REGISTRY.md) - Available skills and knowledge bases
- [agents/](./agents/) - Agent definitions
- [session-handoffs/](./session-handoffs/) - 44 existing handoff documents

---

## Changelog

- **2026-02-27**: Initial version with model assignment, coordination patterns, and cost optimization
