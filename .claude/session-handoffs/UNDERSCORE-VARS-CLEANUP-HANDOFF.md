# Handoff: Underscore Variable Cleanup & Plan Doc Updates

**Date**: 2026-02-10
**Priority**: Medium (tech debt cleanup)
**Estimated Effort**: 1-2 hours with parallel agents

---

## Context

We fixed ~100 TypeScript errors in `@cgk/ai-agents` by (among other things) prefixing unused variables with underscores. Per our updated CLAUDE.md guidance, we should either:
1. **Remove** the variable entirely if it's dead code
2. **Keep underscore + add comment** explaining why it's intentionally unused

---

## Prompt to Kick Off Cleanup

Copy/paste this to start:

```
I need to clean up underscore-prefixed variables we added to suppress TypeScript errors. For each location below:

1. Determine if the variable is actually needed or dead code
2. If dead code → remove it entirely
3. If intentionally unused (interface requirement) → keep underscore and add comment explaining why

Also update our plan documentation to include the @vercel/postgres patterns from CLAUDE.md.

Run parallel agents to handle this efficiently.

## Files to Review

### @cgk/ai-agents - Underscore Parameters (check if actually needed)

| File | Line | Variable | Action Needed |
|------|------|----------|---------------|
| `src/autonomy/check.ts` | 176 | `_agentId` | Check if should query by agentId or remove param |
| `src/personality/prompt-builder.ts` | 173 | `_humor` | Check if humor should affect greeting |
| `src/integrations/router.ts` | 109-110 | `_tenantId`, `_eventType` | Check if should use for routing logic |
| `src/integrations/router.ts` | 152 | `_tenantId` | Check if should use for SMS routing |
| `src/integrations/router.ts` | 249 | `_tenantId` | Check if should use for agent selection |
| `src/integrations/google/calendar.ts` | 512 | `_resourceId` | Check if needed for webhook handling |
| `src/integrations/slack/interactions.ts` | 295 | `_ctx` | Check if context needed in handleShortcut |
| `src/integrations/slack/interactions.ts` | 307-308 | `_ctx`, `_payload` | Check if needed in handleMessageAction |
| `src/integrations/slack/interactions.ts` | 410 | `_tenantId` | Check if needed for Slack approval |
| `src/integrations/email/sender.ts` | 164 | `_tenantId` | Check if needed for inbound email handling |

### @cgk/ai-agents - Underscore Imports (likely removable)

| File | Line | Import | Recommendation |
|------|------|--------|----------------|
| `src/rag/search.ts` | 9 | `_recordMemoryAccess` | Remove if not planning to use |
| `src/rag/context-builder.ts` | 8 | `_recordMemoryAccess` | Remove if not planning to use |
| `src/integrations/sms/handler.ts` | 17 | `_decrypt` | Remove - using safeDecrypt instead |
| `src/integrations/sms/handler.ts` | 21-22 | `_AgentSMSConversation`, `_AgentSMSMessage` | Remove if truly unused |
| `src/integrations/sms/handler.ts` | 35 | `_tenantId` (class field) | Check if class needs tenant context |

---

## Plan Documentation to Update

Add the @vercel/postgres SQL patterns (from CLAUDE.md) to these plan docs so future phases follow the patterns:

1. `/MULTI-TENANT-PLATFORM-PLAN/ARCHITECTURE.md` - Add SQL patterns section
2. `/MULTI-TENANT-PLATFORM-PLAN/phases/` - Any phases that involve database queries
3. Consider creating `/MULTI-TENANT-PLATFORM-PLAN/SQL-PATTERNS.md` as dedicated reference

Key patterns to document:
- Arrays → PostgreSQL array literals `{val1,val2}::text[]`
- Dates → ISO strings `.toISOString()`
- Type conversion → Double cast `as unknown as Type`
- No SQL fragment composition
- Unused vars → Remove or comment why

---

## Verification

After cleanup, run:
```bash
pnpm turbo typecheck --filter=@cgk/ai-agents
```

Should still pass with 0 errors.
```

---

## Quick Reference

Files with underscore vars: 10
Files with underscore imports: 4
Total locations to review: ~20

Good luck tomorrow!
