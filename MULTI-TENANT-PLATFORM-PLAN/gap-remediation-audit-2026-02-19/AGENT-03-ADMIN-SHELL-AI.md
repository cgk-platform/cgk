# Gap Remediation Audit: Admin Shell & AI
**Agent:** 03 | **Date:** 2026-02-19 | **Pass:** 1

---

## Executive Summary

The Admin Shell foundation (PHASE-2A) is **complete and solid** — layout, sidebar, header, mobile nav, tenant config, and white-labeling all work. The single-agent "Bri" admin section (PHASE-2AI-ADMIN) is **fully implemented** with 14 pages and all backing API routes.

However, there are **three categories of critical gaps**:

1. **🐛 Critical Bug**: The `aiAgents` feature flag used in `navigation.ts` is **missing from the `TenantFeatures` interface** in `tenant.ts`, meaning the entire Bri/AI section is **silently hidden** from the sidebar unless explicitly set as an untyped property in the database. TypeScript won't catch this because of a `as keyof typeof` cast.

2. **❌ Multi-Agent UI Entirely Missing**: While the backend fully supports multiple AI agents (registry, teams, org chart, handoffs, relationships), there is **zero frontend UI** for managing more than one agent. The `/admin/ai-team/` route only has voice config and call history sub-pages — no agent list, no agent creation, no agent configuration, no teams management, and no org chart visualization.

3. **❌ Memory & Training UI Deferred**: The memory browser and training session UI were explicitly deferred to "PHASE-2AI-UI" in the phase doc but no such phase exists in the plan — this work has no home.

Backend packages are **comprehensive and production-ready**. The gap is almost entirely in admin frontend pages.

---

## Feature Status Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Admin shell layout (sidebar + header + main area) | ✅ DONE | `admin-shell.tsx`, fully functional |
| Sidebar navigation with feature flag filtering | ✅ DONE | `sidebar.tsx` works correctly |
| Mobile responsive drawer nav | ✅ DONE | `mobile-nav.tsx` |
| Tenant config loading + caching | ✅ DONE | `lib/tenant.ts` with Redis cache |
| White-label theming (CSS variables) | ✅ DONE | `lib/theme.ts` inferred |
| Custom domain middleware | ✅ DONE | `middleware.ts` |
| `aiAgents` feature flag in TenantFeatures type | 🐛 BUG | Flag used in nav but not declared in interface |
| Bri dashboard (single-agent) | ✅ DONE | `/admin/bri` — 14 pages |
| Bri conversations viewer | ✅ DONE | `/admin/bri/conversations` |
| Bri action log + approval workflow UI | ✅ DONE | `/admin/bri/action-log` |
| Bri creative ideas management | ✅ DONE | `/admin/bri/creative-ideas` |
| Bri autonomy configuration UI | ✅ DONE | `/admin/bri/autonomy` |
| Bri voice configuration UI | ✅ DONE | `/admin/bri/voice` + `/admin/ai-team/[agentId]/voice` |
| Bri integrations management | ✅ DONE | `/admin/bri/integrations` |
| Bri team memories | ✅ DONE | `/admin/bri/team-memories` |
| Bri team defaults | ✅ DONE | `/admin/bri/team-defaults` |
| Bri Slack user linking | ✅ DONE | `/admin/bri/slack-users` |
| Bri notifications config | ✅ DONE | `/admin/bri/notifications` |
| Bri follow-ups | ✅ DONE | `/admin/bri/followups` |
| Multi-agent list/management page | ❌ NOT DONE | No `/admin/ai-team` index page |
| Agent creation UI | ❌ NOT DONE | No create agent form anywhere |
| Agent configuration/detail page | ❌ NOT DONE | Only voice sub-page exists |
| Agent personality configuration UI | ❌ NOT DONE | API exists, no UI |
| AI Teams management UI | ❌ NOT DONE | API complete, UI missing |
| Org chart visualization | ❌ NOT DONE | API complete, UI missing |
| Relationship explorer UI | ❌ NOT DONE | API complete, UI missing |
| Approval queue for AI agents | ⚠️ PARTIAL | Workflows approvals page exists but is generic |
| Memory browser UI | ❌ NOT DONE | Explicitly deferred, no phase for it |
| Training session UI | ❌ NOT DONE | Explicitly deferred, no phase for it |
| Call history page | ✅ DONE | `/admin/ai-team/calls` — implemented |
| Call detail + transcript page | ✅ DONE | `/admin/ai-team/calls/[callId]` |
| Voice config per-agent page | ✅ DONE | `/admin/ai-team/[agentId]/voice` |
| AI agent package — core (registry, autonomy, actions) | ✅ DONE | All in `packages/ai-agents/src/` |
| AI agent package — memory + RAG + embeddings | ✅ DONE | `packages/ai-agents/src/memory/` |
| AI agent package — teams + routing + org chart | ✅ DONE | `packages/ai-agents/src/teams/` + `org-chart/` |
| AI agent package — handoffs | ✅ DONE | `packages/ai-agents/src/handoffs/` |
| AI agent package — relationships + familiarity | ✅ DONE | `packages/ai-agents/src/relationships/` |
| AI agent package — voice (TTS/STT/Retell) | ✅ DONE | `packages/ai-agents/src/voice/` |
| AI agent package — integrations (Slack/Email/SMS/Calendar) | ✅ DONE | `packages/ai-agents/src/integrations/` |
| Background jobs (org sync, familiarity decay, handoff cleanup) | ✅ DONE | `packages/ai-agents/src/jobs/` |
| API routes — ai-agents CRUD | ✅ DONE | `/api/admin/ai-agents/` |
| API routes — ai-teams CRUD | ✅ DONE | `/api/admin/ai-teams/` |
| API routes — org chart + sync | ✅ DONE | `/api/admin/org-chart/` |
| API routes — handoffs | ✅ DONE | `/api/admin/ai-agents/handoffs/` |
| API routes — relationships | ✅ DONE | `/api/admin/ai-agents/[agentId]/relationships/` |
| API routes — voice config + calls | ✅ DONE | Full route tree exists |
| Integration tests (teams/handoffs/voice) | ❌ NOT DONE | Only `voice/__tests__/voice.test.ts` exists |

---

## Detailed Gaps

---

### 1. Critical Bug: `aiAgents` Feature Flag Missing from TenantFeatures — 🐛 BUG

**Planned:** Bri/AI section of the navigation is gated behind an `aiAgents` feature flag.

**Found:**
- `apps/admin/src/lib/navigation.ts` line 322: `featureFlag: 'aiAgents'`
- `apps/admin/src/components/admin/sidebar.tsx` line 22: `tenant.features[section.featureFlag as keyof typeof tenant.features]`
- `apps/admin/src/lib/tenant.ts`: The `TenantFeatures` interface only contains: `creators`, `contractors`, `subscriptions`, `abTesting`, `attribution`, `scheduling` — **`aiAgents` is not declared**
- The `DEFAULT_FEATURES` object also does NOT include `aiAgents`

**Effect:** `tenant.features['aiAgents']` evaluates as `undefined` (falsy), so the entire Bri nav section is **never rendered** unless a tenant has manually set `{ aiAgents: true }` in their `settings.features` JSONB column in the database. TypeScript does not catch this because of the `as keyof typeof tenant.features` unsafe cast.

**Files checked:**
- `apps/admin/src/lib/tenant.ts`
- `apps/admin/src/lib/navigation.ts`
- `apps/admin/src/components/admin/sidebar.tsx`
- `apps/admin/src/components/admin/mobile-nav.tsx`

**TODO List:**
- [ ] Add `aiAgents: boolean` to the `TenantFeatures` interface in `apps/admin/src/lib/tenant.ts`
- [ ] Add `aiAgents: true` to `DEFAULT_FEATURES` (enable by default, or `false` if opt-in is intended)
- [ ] Remove the unsafe `as keyof typeof tenant.features` cast in sidebar.tsx and mobile-nav.tsx — use a typed lookup instead
- [ ] Verify all other `featureFlag` values in `navigation.ts` (`attribution`, `creators`, `contractors`, `esign`, `scheduling`) are declared in `TenantFeatures`

---

### 2. Multi-Agent Management UI — ❌ NOT DONE

**Planned (PHASE-2AI-TEAMS + PHASE-2AI-CORE):**
- Agent list page at `/admin/ai-team` showing all agents
- Agent creation form
- Agent configuration/detail page at `/admin/ai-team/[agentId]`
- Per-agent personality trait configuration
- Per-agent autonomy level overrides

**Found:**
- `/admin/ai-team/` directory only contains:
  - `[agentId]/voice/page.tsx` — voice config ✅
  - `calls/[callId]/page.tsx` — call detail ✅
  - `calls/page.tsx` — call history ✅
- No index page (`/admin/ai-team/page.tsx`)
- No agent creation flow
- No agent configuration page (personality, capabilities, model selection)

**Files checked:**
- `apps/admin/src/app/admin/ai-team/` (entire directory tree)
- `apps/admin/src/lib/navigation.ts` (no nav links to agent list/config)
- `apps/admin/src/app/api/admin/ai-agents/route.ts` (API exists but no UI consuming it)

**TODO List:**
- [ ] Create `/admin/ai-team/page.tsx` — agent list page showing all agents with status badges, last activity, and quick-action buttons (edit, view conversations, manage voice)
- [ ] Create `/admin/ai-team/new/page.tsx` — agent creation wizard (name, role, model, personality defaults)
- [ ] Create `/admin/ai-team/[agentId]/page.tsx` — agent configuration hub (tabbed: Overview, Personality, Autonomy, Capabilities)
- [ ] Create `/admin/ai-team/[agentId]/personality/page.tsx` — sliders for 6 personality traits (formality, verbosity, proactivity, humor, emoji_usage, assertiveness)
- [ ] Create `/admin/ai-team/[agentId]/autonomy/page.tsx` — per-action autonomy overrides (currently only accessible via `/admin/bri/autonomy` for primary agent)
- [ ] Add navigation links for AI team management in `navigation.ts` under the "Bri" section or a new "AI Team" section
- [ ] Add agent selector/filter to the call history page (`/admin/ai-team/calls/page.tsx`) — the Agent dropdown `SelectContent` is empty (no agents loaded from API)

---

### 3. Org Chart Visualization UI — ❌ NOT DONE

**Planned (PHASE-2AI-TEAMS):**
- `/admin/org-chart` page with interactive visual org chart
- Shows humans and AI agents in unified hierarchy
- [Sync] and [Expand] controls
- Color coding: 🤖 AI Agent, 👤 Human

**Found:**
- `GET /api/admin/org-chart` — API route exists and returns tree structure ✅
- `POST /api/admin/org-chart/sync` — API route exists ✅
- `packages/ai-agents/src/org-chart/builder.ts` — full `buildOrgChart()` function ✅
- `packages/ai-agents/src/org-chart/sync.ts` — sync logic ✅
- **Zero frontend page** for org chart visualization
- No nav link for org chart in `navigation.ts`

**Files checked:**
- `apps/admin/src/app/admin/` (searched for org-chart directory — not found)
- `apps/admin/src/lib/navigation.ts` (no org-chart entry)

**TODO List:**
- [ ] Create `/admin/org-chart/page.tsx` — org chart page with tree visualization
- [ ] Build `OrgChartTree` component — recursive tree renderer for `OrgChartNode[]` data structure
- [ ] Add [Sync] button that calls `POST /api/admin/org-chart/sync`
- [ ] Add [Expand All] / [Collapse All] controls
- [ ] Differentiate AI vs human nodes visually (robot emoji, different card color)
- [ ] Show agent status (active/paused) on AI nodes
- [ ] Add nav entry under the "Bri" or "Team" section in `navigation.ts`
- [ ] Consider a React Flow or similar library for interactive node positioning

---

### 4. AI Teams Management UI — ❌ NOT DONE

**Planned (PHASE-2AI-TEAMS):**
- `/admin/ai-team/teams` page — list of AI teams with members
- Create/edit team form (name, domain, Slack channel, supervisor)
- Add/remove agents from teams
- View team activity

**Found:**
- Full API routes: `GET/POST /api/admin/ai-teams`, `GET/PATCH/DELETE /api/admin/ai-teams/[teamId]`, `POST /api/admin/ai-teams/[teamId]/members`, `DELETE /api/admin/ai-teams/[teamId]/members/[agentId]` — all ✅
- `packages/ai-agents/src/teams/` — registry.ts, members.ts, routing.ts all ✅
- **Zero frontend** for teams management
- No nav link for teams in `navigation.ts`

**Files checked:**
- `apps/admin/src/app/admin/ai-team/` (no `teams/` subdirectory)
- `apps/admin/src/app/api/admin/ai-teams/` (all routes exist)

**TODO List:**
- [ ] Create `/admin/ai-team/teams/page.tsx` — teams list showing each team's name, domain, member count, supervisor, Slack channel
- [ ] Create `/admin/ai-team/teams/new/page.tsx` or modal — team creation form
- [ ] Create `/admin/ai-team/teams/[teamId]/page.tsx` — team detail: member list with roles, team configuration
- [ ] Build `TeamMemberCard` component — shows agent avatar, name, role in team, specializations
- [ ] Add team member add/remove via `POST /api/admin/ai-teams/[teamId]/members`
- [ ] Add nav links for teams under the AI/Bri section in `navigation.ts`
- [ ] Add task routing configuration UI per team (channel → team mapping)

---

### 5. Relationship Explorer UI — ❌ NOT DONE

**Planned (PHASE-2AI-TEAMS):**
- `/admin/ai-team/[agentId]/relationships` page
- Shows familiarity scores between agent and team members/creators
- Displays interaction count, last interaction, communication preferences
- Visual familiarity score meter (0–1)

**Found:**
- API routes: `GET /api/admin/ai-agents/[agentId]/relationships`, `GET /api/admin/ai-agents/[agentId]/relationships/[personType]/[personId]` — both ✅
- `packages/ai-agents/src/relationships/tracker.ts` — full implementation ✅
- `packages/ai-agents/src/relationships/familiarity.ts` — scoring ✅
- **No frontend page** for relationship exploration

**Files checked:**
- `apps/admin/src/app/admin/ai-team/[agentId]/` (only `voice/` subdirectory)

**TODO List:**
- [ ] Create `/admin/ai-team/[agentId]/relationships/page.tsx` — relationship list for an agent
- [ ] Build `FamiliarityMeter` component — visual 0–1 score display with label (Stranger/Acquaintance/Familiar/Close)
- [ ] Show interaction count, total conversation minutes, last interaction timestamp
- [ ] Show communication preferences (preferred channel, response style)
- [ ] Show relationship summary text generated by the agent
- [ ] Link each person to their profile (creator or team member page)

---

### 6. Handoff Management UI — ⚠️ PARTIAL

**Planned (PHASE-2AI-TEAMS):**
- Handoff queue view showing pending handoffs
- Accept/decline controls
- Handoff context and key points display

**Found:**
- API routes: `GET /api/admin/ai-agents/handoffs`, `POST /api/admin/ai-agents/[agentId]/handoffs`, `POST /api/admin/ai-agents/handoffs/[handoffId]/accept`, `POST .../decline` — all ✅
- Handoff logic in `packages/ai-agents/src/handoffs/` — ✅
- The `workflows/approvals` page exists but is for workflow action approvals, **not AI handoffs**
- **No dedicated handoff UI** in the admin

**Files checked:**
- `apps/admin/src/app/admin/workflows/approvals/page.tsx` (workflow-specific, not AI handoffs)
- `apps/admin/src/app/admin/ai-team/` (no handoffs sub-page)

**TODO List:**
- [ ] Create `/admin/ai-team/handoffs/page.tsx` — list of pending/completed handoffs across agents
- [ ] Show: from-agent, to-agent, conversation channel, reason, status, created timestamp
- [ ] Build `HandoffDetailPanel` — shows `context_summary` and `key_points` from handoff record
- [ ] Add accept/decline buttons for pending handoffs (calls existing API routes)
- [ ] Add handoffs tab or link to individual agent pages (`/admin/ai-team/[agentId]/handoffs`)
- [ ] Add handoff count badge to navigation for pending items

---

### 7. Memory Browser & Training UI — ❌ NOT DONE

**Planned (PHASE-2AI-MEMORY):**
The phase doc explicitly states: _"Admin UI for memory management and training (deferred to PHASE-2AI-UI)"_. However, **no PHASE-2AI-UI exists** in the plan.

**Found:**
- `/admin/bri/team-memories/page.tsx` — exists, shows team member memories for the primary agent. This is a limited subset of the full memory system (type: `team_member` only).
- Full memory package in `packages/ai-agents/src/memory/` — storage, embeddings, confidence, consolidation, search, trainer, feedback, patterns — all ✅
- Training session schema defined, `trainer.ts` implemented ✅
- **No memory browser** for viewing/searching all memories by type (creator, project_pattern, policy, preference, etc.)
- **No training session UI** — no way to manually import knowledge or run training sessions
- **No per-agent memory management** — can't view or delete memories for a specific agent from the admin

**Files checked:**
- `apps/admin/src/app/admin/bri/team-memories/page.tsx` (limited to team_member type)
- `packages/ai-agents/src/memory/` (full implementation, no UI)

**TODO List:**
- [ ] Designate a phase or epic for PHASE-2AI-UI — this work needs a home in the plan
- [ ] Create `/admin/ai-team/[agentId]/memories/page.tsx` — full memory browser
  - Filter by `memory_type`: team_member, creator, project_pattern, policy, preference, procedure, fact
  - Sort by confidence, importance, last_used_at, created_at
  - Show: title, content preview, confidence bar, importance, times_used, source
  - Search by semantic query (call `/api/admin/bri/memories/search` or equivalent)
- [ ] Create `/admin/ai-team/[agentId]/memories/[memoryId]/page.tsx` — memory detail + edit confidence
- [ ] Build `MemoryCard` component with confidence meter, importance indicator, source badge
- [ ] Add "Edit Memory" — update content or mark as superseded
- [ ] Add "Delete Memory" — soft delete (set `is_active = false`)
- [ ] Create `/admin/ai-team/[agentId]/training/page.tsx` — training session management
  - Create new training session (type: correction, new_knowledge, policy, procedure, etc.)
  - Upload text or paste content for batch memory import
  - View training history with session status (pending/processing/complete/failed)
  - View memories created per training session
- [ ] Upgrade `/admin/bri/team-memories` to use the full memory API (currently limited to team_member type)
- [ ] Add memory count to agent status cards in the agent list page

---

### 8. Call History Agent Filter — ⚠️ PARTIAL

**Planned (PHASE-2AI-VOICE):**
- Call history page with agent filter dropdown

**Found:**
- `/admin/ai-team/calls/page.tsx` line ~127: `RadixSelect` for Agent filter renders with an **empty `SelectContent`** — no agents are loaded from the API
- The component has `agentId` state and passes it to the API query, but never fetches the agent list to populate the dropdown options

**Files checked:**
- `apps/admin/src/app/admin/ai-team/calls/page.tsx` (lines 120–135)

**TODO List:**
- [ ] Fetch agent list on component mount: `GET /api/admin/ai-agents` → populate agent dropdown options
- [ ] Add `useEffect` to load agents and set them in state
- [ ] Map agent IDs to display names in the call list (currently shows raw agent IDs)
- [ ] Consider adding agent name to the individual call card display

---

### 9. Navigation Structure Missing AI Team Links — ❌ NOT DONE

**Planned:** Navigation structure should reflect all AI management capabilities.

**Found in `navigation.ts` Bri section (lines 322–338):**
```
Bri → Dashboard, Conversations, Action Log, Creative Ideas, Autonomy, 
      Voice, Voice Calls, Integrations, Team Memories, Team Defaults, 
      Slack Users, Notifications, Follow-ups
```

**Missing nav links:**
- `/admin/ai-team` — Agent list/management
- `/admin/org-chart` — Org chart
- `/admin/ai-team/teams` — Teams management  
- `/admin/ai-team/handoffs` — Handoff queue
- `/admin/ai-team/[agentId]/relationships` — Relationship explorer
- `/admin/ai-team/[agentId]/memories` — Memory browser
- `/admin/ai-team/[agentId]/training` — Training sessions

**TODO List:**
- [ ] Add "Agents" nav link to Bri section pointing to `/admin/ai-team`
- [ ] Add "Org Chart" nav link
- [ ] Add "AI Teams" nav link
- [ ] Add "Handoffs" nav link (with pending count badge)
- [ ] Consider restructuring the Bri section into a two-tier "AI Team" section: top level = team management pages, nested under each agent = per-agent settings pages

---

### 10. Integration Tests — ❌ NOT DONE

**Planned:** Integration tests for teams, handoffs, voice, org chart.

**Found:**
- `packages/ai-agents/src/voice/__tests__/voice.test.ts` — exists but only for voice config validation
- No tests for: teams CRUD, org chart sync, handoffs, relationship tracking, memory storage/retrieval

**TODO List:**
- [ ] Add integration tests for `packages/ai-agents/src/teams/` (create team, add member, route task)
- [ ] Add integration tests for `packages/ai-agents/src/handoffs/` (initiate, accept, decline)
- [ ] Add integration tests for `packages/ai-agents/src/org-chart/` (build, sync, level calculation)
- [ ] Add integration tests for `packages/ai-agents/src/memory/` (store, embed, search, decay)
- [ ] Add integration tests for `packages/ai-agents/src/relationships/` (track, familiarity scoring)

---

## Architectural Observations

### 1. Bri vs AI Team — Two Overlapping Systems
The admin currently has two parallel navigation paths for AI management:
- `/admin/bri/*` — Single-agent management (complete, 14 pages)
- `/admin/ai-team/*` — Multi-agent management (stub, only 3 pages)

Both paths exist but serve different purposes. The plan appears to intend `/admin/bri` for the "primary agent" fast path, while `/admin/ai-team` would scale to multiple agents. However, the voice config page exists in **both** (`/admin/bri/voice` AND `/admin/ai-team/[agentId]/voice`). This creates potential UX confusion and maintenance duplication. A decision is needed: should `/admin/bri` be retired in favor of `/admin/ai-team/[primaryAgentId]`, or should they coexist?

### 2. Feature Flag Type Safety Gap
The `featureFlag` field in navigation is typed as `string` (not a union of `keyof TenantFeatures`), and the sidebar lookup uses an unsafe cast. This means any typo in a feature flag name will silently hide an entire navigation section. This should be type-safe.

### 3. API Routes Complete, UI Missing
The backend API surface area is **excellent** — all necessary endpoints for multi-agent management are implemented and likely tested manually. The gap is purely in the React frontend. This means the implementation risk for the missing UI is lower than usual — it's primarily a UI/UX build-out task, not a backend problem.

### 4. Memory UI Gap Has No Phase
The PHASE-2AI-MEMORY doc explicitly deferred the admin UI to "PHASE-2AI-UI" but no such phase was created. This work will likely be discovered at the last moment and rushed. It should be planned intentionally.

### 5. Background Jobs Not Registered
The job definitions exist in `packages/ai-agents/src/jobs/` (`syncOrgChartJob`, `decayFamiliarityJob`, `cleanupHandoffsJob`), but there's no evidence these are registered in the job scheduler. Verify that the orchestrator or a cron system actually runs these jobs, or the org chart will drift and familiarity scores will not decay.

### 6. `console.error` Calls in UI
The voice config page (`/admin/ai-team/[agentId]/voice/page.tsx`) has a `console.error('Failed to fetch voices')` — this should use proper error state management consistent with the rest of the page's error handling pattern. Minor but indicates copy-paste during rapid development.

---

## Priority Ranking

| Priority | Item | Effort | Risk |
|----------|------|--------|------|
| 🔴 P0 | **Fix `aiAgents` feature flag bug** — Bri section may be invisible to users | 30 min | High |
| 🔴 P0 | **Verify background jobs are registered** — org sync, familiarity decay need to run | 1 hr | High |
| 🟠 P1 | **Multi-agent list + agent config pages** — core multi-tenancy value prop | 3–4 days | Medium |
| 🟠 P1 | **Org chart visualization** — key product differentiator, API is ready | 2–3 days | Medium |
| 🟠 P1 | **AI Teams management UI** — API is ready, purely frontend work | 2 days | Low |
| 🟡 P2 | **Memory browser UI** — plan the PHASE-2AI-UI epic, then build | 3–4 days | Low |
| 🟡 P2 | **Training session UI** — needed for knowledge import workflow | 2 days | Low |
| 🟡 P2 | **Fix call history agent dropdown** — incomplete filter, confusing UX | 2 hrs | Low |
| 🟡 P2 | **Handoff management UI** — needed for multi-agent collaboration | 1–2 days | Low |
| 🟢 P3 | **Relationship explorer** — nice-to-have, API ready | 1 day | Low |
| 🟢 P3 | **Navigation structure updates** — add missing links for new pages | 30 min | Low |
| 🟢 P3 | **Integration tests** — foundational quality, not blocking shipping | 3 days | Low |
| 🟢 P3 | **Bri vs AI Team consolidation** — architectural decision needed | 1 day | Low |
