# Underscore Variable Tracking

**Created**: 2026-02-11
**Purpose**: Track variables prefixed with underscore (`_`) that were marked unused to suppress TypeScript errors but should be properly implemented in future phases.

---

## Why This Document Exists

During rapid development for Vercel deployment, several TypeScript "unused variable" errors were fixed by prefixing variables with underscores. This document tracks these so future phases properly implement the functionality rather than leaving dead code.

**RULE**: When working on any phase listed below, check this document and implement the actual functionality.

---

## @cgk/ai-agents Package

### Autonomy System

| File | Variable | Current State | Future Implementation |
|------|----------|---------------|----------------------|
| `src/autonomy/check.ts:176` | `_agentId` | Returns default actions without querying DB | **Phase 2AI-CORE**: Implement `getActionsRequiringApproval()` to query `agent_action_autonomy` table by agentId |

**Action Required**: Query the database for agent-specific autonomy settings instead of returning defaults.

```typescript
// CURRENT (placeholder)
export async function getActionsRequiringApproval(_agentId: string): Promise<string[]> {
  return Object.entries(DEFAULT_ACTION_AUTONOMY)
    .filter(([_, level]) => level !== 'autonomous')
    .map(([action, _]) => action)
}

// SHOULD BE
export async function getActionsRequiringApproval(agentId: string): Promise<string[]> {
  const result = await sql`
    SELECT action_type FROM agent_action_autonomy
    WHERE agent_id = ${agentId} AND autonomy_level != 'autonomous'
  `
  return result.rows.map(r => r.action_type as string)
}
```

---

### Personality System

| File | Variable | Current State | Future Implementation |
|------|----------|---------------|----------------------|
| `src/personality/prompt-builder.ts:173` | `_humor` | Not used in greeting preview | **Phase 2AI-CORE**: Make humor trait affect greeting style (add jokes/playfulness for high humor) |

**Action Required**: Use humor trait to customize greeting messages.

```typescript
// CURRENT - _humor is ignored
function buildGreetingPreview(
  greeting: string,
  emoji: string,
  formality: TraitLevel,
  _humor: TraitLevel,  // Not used!
  personality: AgentPersonality
): string {
  // Only uses formality...
}

// SHOULD BE - use humor to add playful touches
function buildGreetingPreview(
  greeting: string,
  emoji: string,
  formality: TraitLevel,
  humor: TraitLevel,
  personality: AgentPersonality
): string {
  let message = `${greeting}${emoji}\n\n`

  // Add humor-based variations
  if (humor === 'high') {
    message += "Hey! Ready to crush it today? 🚀 "
  }
  // ... rest of implementation
}
```

---

### Integration Router

| File | Variable | Current State | Future Implementation |
|------|----------|---------------|----------------------|
| `src/integrations/router.ts:109-110` | `_tenantId`, `_eventType` | Not used in calendar routing | **Phase 2AI-INTEGRATIONS**: Use for tenant-scoped calendar handling, event type filtering |
| `src/integrations/router.ts:152` | `_tenantId` | Not used in SMS routing | **Phase 2AI-INTEGRATIONS**: Use for tenant-scoped SMS routing and rate limiting |
| `src/integrations/router.ts:249` | `_tenantId` | Not used in agent selection | **Phase 2AI-INTEGRATIONS**: Use for tenant-scoped agent selection |

**Action Required**: Implement tenant-scoped routing logic.

```typescript
// CURRENT - _tenantId ignored
async function routeCalendarEvent(
  _tenantId: string,
  _eventType: string,
  payload: Record<string, unknown>
): Promise<RouteResult> {
  // Just processes webhook without tenant context
}

// SHOULD BE - use tenant context for scoping
async function routeCalendarEvent(
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<RouteResult> {
  // Use tenantId to scope calendar operations
  // Use eventType to filter/handle different event types
}
```

---

### Google Calendar Integration

| File | Variable | Current State | Future Implementation |
|------|----------|---------------|----------------------|
| `src/integrations/google/calendar.ts:512` | `_resourceId` | Not used in webhook handler | **Phase 2AI-INTEGRATIONS**: Validate resourceId matches expected calendar |

---

### Slack Integration

| File | Variable | Current State | Future Implementation |
|------|----------|---------------|----------------------|
| `src/integrations/slack/interactions.ts:295` | `_ctx` | Not used in handleShortcut | **Phase 2AI-INTEGRATIONS**: Use context for shortcut handling |
| `src/integrations/slack/interactions.ts:307-308` | `_ctx`, `_payload` | Not used in handleMessageAction | **Phase 2AI-INTEGRATIONS**: Implement message action handling |
| `src/integrations/slack/interactions.ts:410` | `_tenantId` | Not used in approval handling | **Phase 2AI-INTEGRATIONS**: Use for tenant-scoped approval tracking |

---

### Email Integration

| File | Variable | Current State | Future Implementation |
|------|----------|---------------|----------------------|
| `src/integrations/email/sender.ts:164` | `_tenantId` | Not used in inbound email | **Phase 2CM-INBOUND-EMAIL**: Use for tenant-scoped email routing |

---

### SMS Integration

| File | Variable | Current State | Future Implementation |
|------|----------|---------------|----------------------|
| `src/integrations/sms/handler.ts:35` | `_tenantId` (class field) | Class doesn't use tenant context | **Phase 2AI-INTEGRATIONS**: Inject tenant context into SMS handler class |

---

### Unused Imports (Likely Removable)

These were imported but not used. Verify if they should be removed or implemented:

| File | Import | Status |
|------|--------|--------|
| `src/rag/search.ts:9` | `_recordMemoryAccess` | Check if memory access should be recorded during RAG search |
| `src/rag/context-builder.ts:8` | `_recordMemoryAccess` | Check if memory access should be recorded during context building |
| `src/integrations/sms/handler.ts:17` | `_decrypt` | Removed - using `safeDecrypt` instead |
| `src/integrations/sms/handler.ts:21-22` | `_AgentSMSConversation`, `_AgentSMSMessage` | Check if these types are needed |

---

## How to Use This Document

### When Working on a Phase

1. Search this document for the phase name (e.g., "Phase 2AI-INTEGRATIONS")
2. Find all underscore variables associated with that phase
3. Implement the actual functionality
4. Remove the underscore prefix
5. Update this document to mark as COMPLETE

### Definition of Done

When implementing these:
- [ ] Remove the underscore prefix
- [ ] Implement actual functionality
- [ ] Add appropriate tests
- [ ] Update this tracking document
- [ ] Run `pnpm turbo typecheck` to verify

---

## Completion Status

| Phase | Variables | Status |
|-------|-----------|--------|
| Phase 2AI-CORE | `_agentId`, `_humor` | PENDING |
| Phase 2AI-INTEGRATIONS | `_tenantId` (x5), `_eventType`, `_resourceId`, `_ctx`, `_payload` | PENDING |
| Phase 2CM-INBOUND-EMAIL | `_tenantId` (email) | PENDING |

---

## Notes

- This tracking approach is better than leaving `// TODO` comments scattered in code
- Centralizes cleanup tasks for easier tracking
- Ensures future agents know what needs implementation
- Prevents "accidental dead code" from persisting indefinitely
