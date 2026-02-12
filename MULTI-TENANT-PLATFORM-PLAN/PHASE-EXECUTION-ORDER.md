# Phase Execution Order - Optimized for AI Agents

> **Purpose**: Clear execution order with parallel opportunities and context reset points

---

## Visual Execution Map

```
WEEK 1-2: PHASE 0 (Portability)
          └─ Single Agent
          └─ CHECKPOINT: CLI works

ANYTIME:  PHASE 0B (Database Setup UX) - PARALLEL TRACK
          └─ Single Agent (can run anytime, no dependencies)
          └─ CLI improvements, migration fixes, documentation
          └─ Priority: HIGH (affects all new users)

WEEK 3-6: PHASE 1 (Foundation) - SEQUENTIAL
          1A ─→ 1B ─→ 1C ─→ 1D
          └─ Single Agent
          └─ CHECKPOINT: Foundation Audit (fresh session)

WEEK 7-10: PHASE 2 (Admin) - 2 PARALLEL TRACKS
          ┌─ Track A: 2A ─→ 2B ─→ 2C ─→ 2D (Brand Admin)
          │
          └─ Track B: 2SA-ACCESS ─→ 2SA-DASHBOARD ─→ 2SA-ADVANCED (Super Admin)

          2 Agents can work in parallel
          └─ CHECKPOINT: Admin Shell Audit

WEEK 9-12: PHASE 2 (User Provisioning) - SEQUENTIAL after 2A
          2E ─→ 2F ─→ 2G
          └─ Single Agent (can be same as Track A)

WEEK 10-14: PHASE 2 (Platform Ops) - PARTIALLY PARALLEL
          ┌─ 2PO-HEALTH ║ 2PO-LOGGING (parallel)
          │
          └─ 2PO-FLAGS ─→ 2PO-ONBOARDING (sequential)

          └─ CHECKPOINT: Platform Ops Audit

WEEK 11-16: PHASE 2 (Services) - 4 PARALLEL TRACKS
          ┌─ Track A: 2CM-SENDER ║ 2CM-QUEUE ║ 2CM-TEMPLATES
          │           ─→ 2CM-INBOUND ─→ 2CM-RESEND ─→ 2CM-SMS
          │
          ├─ Track B: 2SC-CORE ─→ 2SC-TEAM
          │
          ├─ Track C: 2AI-CORE ─→ 2AI-ADMIN ║ 2AI-MEMORY ║ 2AI-VOICE
          │           ─→ 2AI-INTEGRATIONS ─→ 2AI-TEAMS
          │
          └─ Track D: 2SP-TICKETS ║ 2SP-KB ─→ 2SP-CHANNELS

          4 Agents can work in parallel
          └─ CHECKPOINT: Services Audit (fresh session)

WEEK 11-16: PHASE 2 (Analytics) - 2 SEQUENTIAL GROUPS
          2AT-ATTRIBUTION-CORE ─→ 2AT-ATTRIBUTION-ANALYTICS ║ 2AT-ATTRIBUTION-ADVANCED
          ─→ 2AT-ATTRIBUTION-INTEGRATIONS

          THEN:

          2AT-ABTESTING-CORE ║ 2AT-ABTESTING-STATS
          ─→ 2AT-ABTESTING-SHIPPING ║ 2AT-ABTESTING-ADMIN

          └─ Can run parallel with Services tracks

WEEK 14-20: PHASE 3 (Storefront) - MIXED
          3A ─→ 3B ─→ 3C ─→ 3D (core, sequential)

          THEN PARALLEL:
          ┌─ 3E-VIDEO-CORE ─→ 3E-VIDEO-TRANSCRIPTION ─→ 3E-VIDEO-CREATOR
          │
          └─ 3F-DAM-CORE ─→ 3F-DAM-WORKFLOWS

          THEN SEQUENTIAL:
          3G ─→ 3H ─→ 3I

          └─ CHECKPOINT: Storefront Audit (fresh session)

WEEK 18-22: PHASE 4 (External Portals) - MOSTLY SEQUENTIAL
          Build Payee Infrastructure (shared)
          ─→ 4A ║ 4A-ONBOARDING (can parallel)
          ─→ 4B ─→ 4C ─→ 4D
          ─→ 4E (can overlap with 4D tail)

          └─ CHECKPOINT: Portals Audit

WEEK 22-25: PHASE 5 (Jobs) - PARALLEL AFTER 5A
          5A (BLOCKING - must complete first)

          THEN 4 PARALLEL AGENTS:
          ┌─ 5B (Commerce Jobs - handlers)
          ├─ 5C (Creator Jobs - handlers)
          ├─ 5D (Analytics Jobs - handlers)
          └─ 5E (Scheduled Jobs - handlers)

          SAVES: 10 days vs sequential
          └─ CHECKPOINT: Jobs Audit (fresh session)

WEEK 25-27: PHASE 6 (MCP) - SEQUENTIAL
          6A ─→ 6B
          └─ Single Agent

WEEK 27: PHASE 5F (Trigger.dev Integration) - SEQUENTIAL
          5F (Wire 240 handlers to actual Trigger.dev tasks)
          └─ Single Agent
          └─ CHECKPOINT: Jobs fully operational

WEEK 27-30: PHASE 7 (Migration) - SEQUENTIAL
          7A ─→ 7B ─→ 7C
          └─ Single Agent (experienced with full context)
          └─ CHECKPOINT: Pre-Cutover Audit

WEEK 30: PHASE 8 (Final Audit) - 15 PARALLEL AGENTS
          All 15 auditors run simultaneously
          └─ PRODUCTION READY
```

---

## Agent Assignment Matrix

### Minimum Agents (Conservative)

| Weeks | Agents | Assignment |
|-------|--------|------------|
| 1-6 | 1 | Foundation (0, 1A-1D) |
| Anytime | 1 | Database Setup UX (0B) - can run in parallel |
| 7-10 | 2 | Brand Admin + Super Admin |
| 11-16 | 4 | Communications + Scheduling + AI + Support |
| 14-20 | 2 | Storefront + Attribution |
| 18-22 | 1 | External Portals |
| 22-25 | 4 | Jobs (after 5A) |
| 25-30 | 1 | MCP + Migration |
| 30 | 15 | Final Audit |

**Maximum concurrent agents**: 4 (during services, jobs)
**Total unique agent slots**: ~6-8 (with reuse)

### Maximum Parallelization

| Weeks | Agents | Assignment |
|-------|--------|------------|
| 1-6 | 1 | Foundation |
| 7-16 | 6 | Admin + Services (all parallel tracks) |
| 14-22 | 4 | Storefront + Portals overlapping |
| 22-25 | 5 | Jobs (5A + 4 parallel) |
| 25-30 | 2 | MCP + Migration prep |
| 30 | 15 | Final Audit |

**Maximum concurrent agents**: 15 (final audit)
**Timeline reduction**: ~10 weeks

---

## Context Preservation Strategy

### Fresh Session Triggers

Start a new Claude session (fresh context) at these points:

1. **After Phase 0** - Repository initialized
2. **After Phase 1D** - Foundation complete
3. **After Phase 2 Admin** - Admin shell complete
4. **After Phase 2 Services** - All services complete
5. **After Phase 3** - Storefront complete
6. **After Phase 4** - Portals complete
7. **After Phase 5** - Jobs migrated
8. **After Phase 7B** - Pre-cutover testing complete

### Session Handoff Protocol

At each trigger, create: `.claude/session-handoffs/PHASE-X-HANDOFF.md`

```markdown
## Session Handoff: Phase [X] Complete

### Date: YYYY-MM-DD

### Summary
[2-3 sentences on what was accomplished]

### Completed Phases
- [List phases completed in this session]

### Key Files Created
- [List 5-10 most important files]

### Patterns Established
- [List any new patterns for future reference]

### Type Check Status
npx tsc --noEmit: PASS/FAIL

### Test Status
[X passing, Y failing, Z skipped]

### Known Issues (Non-blocking)
- [List any minor issues to address later]

### Next Session Should
1. Read this handoff
2. Read PHASE-[NEXT].md
3. Start with: [specific first task]

### Context to Preserve
[Any critical decisions or context the next session needs]
```

---

## Parallel Agent Communication

### Shared State File

Create at project start: `.claude/agent-status.json`

```json
{
  "projectId": "cgk-platform",
  "startedAt": "2025-02-10T00:00:00Z",
  "currentWeek": 7,
  "agents": [],
  "completedPhases": [],
  "inProgressPhases": [],
  "blockers": [],
  "integrationQueue": []
}
```

### Agent Status Updates

Each parallel agent updates their entry:

```json
{
  "id": "agent-2sa-001",
  "role": "Super Admin Builder",
  "phase": "2SA-DASHBOARD",
  "status": "in_progress",
  "startedAt": "2025-02-15T09:00:00Z",
  "lastUpdate": "2025-02-15T14:30:00Z",
  "tasksComplete": 12,
  "tasksTotal": 18,
  "blockers": [],
  "filesCreated": ["apps/orchestrator/src/app/dashboard/page.tsx"],
  "dependenciesNeeded": [],
  "dependenciesProvided": ["super-admin-dashboard-component"]
}
```

### Integration Queue

When parallel agents create interdependent code:

```json
{
  "integrationQueue": [
    {
      "id": "int-001",
      "from": "agent-2sa-001",
      "to": "agent-2a-001",
      "type": "shared-component",
      "description": "KPI card component needs to be shared",
      "status": "pending",
      "priority": "medium"
    }
  ]
}
```

### Orchestrator Agent Responsibilities

One designated "orchestrator" agent:
1. Monitors agent-status.json
2. Resolves integration queue items
3. Triggers checkpoints when all parallel agents complete
4. Initiates fresh sessions at milestones
5. Runs integration tests after parallel phases

---

## Task Priority Within Phases

### Execution Order Within Each Phase

1. **Database migrations** (if any) - create tables first
2. **Type definitions** - define interfaces before use
3. **Shared utilities** - build helpers before consumers
4. **API routes** - backend before frontend
5. **React components** - UI after API
6. **Tests** - after implementation
7. **Documentation** - after tests pass

### [PARALLEL] vs [SEQUENTIAL] Tasks

Phase docs mark tasks as:
- `[PARALLEL]` - Can run simultaneously with other [PARALLEL] tasks
- `[SEQUENTIAL]` - Must wait for prior tasks
- `[SEQUENTIAL after X]` - Depends on specific prior task/group

**Example from Phase 1B:**
```markdown
## Tasks

### Data Model
[PARALLEL] Create public.organizations table migration
[PARALLEL] Create public.users table migration
[PARALLEL] Create public.sessions table migration

### Tenant Schema
[SEQUENTIAL after Data Model] Create tenant schema template
[SEQUENTIAL after template] Create migration runner

### Utilities
[PARALLEL with Tenant Schema] Create withTenant() wrapper
[PARALLEL with Tenant Schema] Create getTenantFromRequest()
```

---

## Risk Mitigation

### If a Phase Takes Longer Than Expected

1. **Identify cause**: scope creep, technical issue, unclear requirements?
2. **Don't skip tasks**: Never defer to "fix later"
3. **Adjust timeline**: Push subsequent phases
4. **Document**: Note issue in handoff for learning

### If Parallel Agents Conflict

1. **Stop both agents** on conflicting code
2. **Orchestrator resolves**: Determine correct approach
3. **One agent implements**: Other agent updates their code
4. **Add to integration tests**: Prevent future conflicts

### If Type Check Fails

1. **Do not proceed** to next task
2. **Fix immediately**: Types are critical
3. **Run again**: Verify fix
4. **If stuck > 30 min**: Document and flag for review

### If Migration Fails

1. **Do not attempt cutover**
2. **Analyze failure**: Data issue? Schema issue?
3. **Fix and re-run**: From failed point if resumable
4. **Extend validation period**: Extra 24-48h after fix

---

## Success Criteria by Milestone

### Milestone 1: Foundation (Week 6)
- [ ] CLI creates working project
- [ ] All packages build
- [ ] Database migrations run
- [ ] Auth JWT flow works
- [ ] Type check passes

### Milestone 2: Admin Platform (Week 16)
- [ ] All 60+ admin sections accessible
- [ ] RBAC permissions enforced
- [ ] Super admin dashboard functional
- [ ] Health monitors active
- [ ] Feature flags working

### Milestone 3: Storefront (Week 20)
- [ ] Products render from commerce provider
- [ ] Cart operations work
- [ ] Checkout flow completes
- [ ] Mobile responsive
- [ ] LCP < 2.5s

### Milestone 4: External Portals (Week 22)
- [ ] Creator auth works
- [ ] Multi-brand switching works
- [ ] Payments configurable
- [ ] Tax forms generate
- [ ] Vendor invoices process

### Milestone 5: Infrastructure (Week 27)
- [ ] All 199 jobs migrated
- [ ] All 70+ MCP tools working
- [ ] Tenant isolation verified
- [ ] Parallel run validation passed

### Milestone 6: Production (Week 30)
- [ ] Data migrated successfully
- [ ] Zero-downtime cutover complete
- [ ] All 15 auditors pass
- [ ] No critical issues
- [ ] Production traffic serving
