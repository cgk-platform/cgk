# Claude Code Enhancements for CGK Platform

**Date**: 2026-02-27
**Status**: ✅ Complete
**Implementation Time**: ~3 hours

---

## Summary

Enhanced Claude Code (the AI assistant) for the CGK project through:
1. **4 Priority Skills** - Comprehensive documentation for database, payments, Shopify, storefront
2. **9 Custom MCP Tools** - Schema introspection and job discovery utilities
3. **Type-safe implementation** - All tools pass TypeScript strict checks

This is about making **me** (Claude Code) better at helping you build the platform, not about the platform's multi-tenant AI agents.

---

## What Was Implemented

### Phase 1: Priority Skills (4 skills)

All skills created in `.claude/skills/` directory:

#### 1. Database Migration Expert
**Location**: `.claude/skills/database-migration-expert/README.md`

**Covers**:
- Custom CGK migration runner (not Prisma/Knex)
- UUID (public) vs TEXT (tenant) ID type patterns
- Idempotency patterns (IF NOT EXISTS, DO$$ EXCEPTION)
- Foreign key type validation
- pgvector extension usage
- Common gotchas and decision trees
- CLI commands and examples

**Key Value**: Prevents #1 source of production errors (ID type mismatches)

#### 2. Payment Processing Expert
**Location**: `.claude/skills/payment-processing-expert/README.md`

**Covers**:
- Tenant-managed Stripe/Wise credentials
- Idempotency key patterns (UUID v4)
- Webhook HMAC verification
- Financial audit trail (append-only balance_transactions)
- Stripe Connect patterns
- International payouts via Wise

**Key Value**: Prevents duplicate charges, security vulnerabilities, audit gaps

#### 3. Shopify Integration Expert
**Location**: `.claude/skills/shopify-integration-expert/README.md`

**Covers**:
- Admin API vs Storefront API decision tree
- GraphQL cursor pagination patterns
- Webhook HMAC verification
- OAuth token encryption/storage
- Product sync patterns
- Rate limiting and retry logic

**Key Value**: Prevents API selection errors, webhook security issues, data sync problems

#### 4. Storefront Development Expert
**Location**: `.claude/skills/storefront-development-expert/README.md`

**Covers**:
- Figma → deployed workflow (5 steps)
- Tenant theming with CSS custom properties
- Block-based landing page architecture
- Server-first rendering (RSC vs client components)
- @cgk-platform/ui import patterns
- Product data flow (local DB + Shopify fallback)

**Key Value**: Ensures Figma designs become production-ready storefronts with optimal performance

---

### Phase 2: Custom MCP Tools (9 tools in 2 categories)

#### Schema Introspection Tools (5 tools)
**Location**: `packages/mcp/src/tools/schema.ts`

1. **describe_table** - Get table structure (columns, types, foreign keys, indexes)
2. **list_tables** - List all tables in a schema
3. **check_foreign_key_compatibility** - Validate UUID vs TEXT type compatibility
4. **validate_migration_sql** - Basic SQL syntax validation
5. **get_id_type_reference** - Reference table of ID types across schemas

**Use Case**: Check ID types before adding foreign keys, understand schema before migrations

#### Job Discovery Tools (4 tools)
**Location**: `packages/mcp/src/tools/jobs.ts`

1. **list_job_events** - List all 80+ available job events by category
2. **get_job_event_schema** - Get payload schema for specific event
3. **validate_job_payload** - Validate payload against schema
4. **get_job_categories** - Get all event categories with descriptions

**Use Case**: Discover available Trigger.dev events without grepping, ensure correct payload structure

---

## File Structure

```
cgk/
├── .claude/
│   ├── skills/                                    # NEW: Claude Code skills
│   │   ├── database-migration-expert/
│   │   │   └── README.md                         # Migration patterns (8.7 KB)
│   │   ├── payment-processing-expert/
│   │   │   └── README.md                         # Payment patterns (12.3 KB)
│   │   ├── shopify-integration-expert/
│   │   │   └── README.md                         # Shopify patterns (15.1 KB)
│   │   └── storefront-development-expert/
│   │       └── README.md                         # Storefront patterns (14.6 KB)
│   │
│   └── CLAUDE-CODE-ENHANCEMENTS.md               # This file
│
└── packages/mcp/src/tools/
    ├── schema.ts                                  # NEW: Schema tools (24.5 KB)
    ├── jobs.ts                                    # NEW: Job tools (18.2 KB)
    └── index.ts                                   # UPDATED: Export new tools
```

---

## Verification

### Skills
- [x] Database Migration Expert created
- [x] Payment Processing Expert created
- [x] Shopify Integration Expert created
- [x] Storefront Development Expert created

### MCP Tools
- [x] Schema introspection tools implemented (5 tools)
- [x] Job discovery tools implemented (4 tools)
- [x] Tools registered in index.ts
- [x] Tool annotations added
- [x] TypeScript type check passes (npx tsc --noEmit)

---

## Success Metrics (Baseline)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Migration Errors | 50% reduction | Track UUID/TEXT mismatches before vs after |
| Storefront Build Time | 30% faster | Time to build component from Figma |
| Skill Usage Rate | 80%+ of relevant tasks | Monitor skill invocations |
| MCP Tool Usage | 10+ calls per week | Track tool call logs |
| Error Prevention | 90%+ of common errors | Track gotchas avoided |

---

## How to Use

### Skills
Skills are automatically loaded when relevant keywords are detected:

```
You: "I need to add a migration for orders table"
Claude: [Loads database-migration-expert skill]
Claude: "Let me check the ID type for orders. In tenant schemas, orders uses TEXT..."

You: "How do I process a Stripe payment?"
Claude: [Loads payment-processing-expert skill]
Claude: "Use getTenantStripeClient() and generate an idempotency key..."

You: "Build a product card from this Figma design"
Claude: [Loads storefront-development-expert skill]
Claude: "Follow the 5-step Figma → deployed workflow..."
```

### MCP Tools
Call tools directly via the MCP protocol:

```typescript
// Example: Check foreign key compatibility
const result = await mcpHandler.callTool({
  name: 'check_foreign_key_compatibility',
  arguments: {
    sourceSchema: 'tenant_rawdog',
    sourceTable: 'creators',
    sourceColumn: 'user_id',
    targetSchema: 'public',
    targetTable: 'users',
    targetColumn: 'id'
  }
})
// Returns: { compatible: false, sourceType: 'text', targetType: 'uuid', errors: [...] }

// Example: List job events
const events = await mcpHandler.callTool({
  name: 'list_job_events',
  arguments: { category: 'commerce' }
})
// Returns: { events: [{ name: 'order.created', category: 'commerce', ... }], totalCount: 7 }
```

---

## Next Steps (Optional - Phase 3)

If you want to add workflow documentation:

1. **Workflow Patterns** (`.claude/workflows/README.md`)
   - Migration workflow: Create file → Validate → Test → Apply
   - Payment workflow: Get credentials → Generate key → Call → Log
   - Shopify webhook: Verify HMAC → Check idempotency → Process
   - Storefront build: Extract Figma → Build component → Store config → Deploy

2. **Decision Trees** (`.claude/decision-trees/*.md`)
   - Schema selection flowchart
   - Shopify API selection flowchart
   - Component type selection flowchart
   - Migration safety checklist

---

## Key Learnings

### What Worked Well
1. **Comprehensive skill documentation** - Including examples, gotchas, and decision trees
2. **Type-safe MCP tools** - Using proper TypeScript types throughout
3. **Real-world examples** - Using actual CGK patterns from codebase exploration
4. **Separation of concerns** - Skills for patterns, MCP tools for introspection

### What Changed from Original Plan
1. **Skipped agent orchestration** - Not needed for single-agent Claude Code
2. **Skipped structured memory** - Claude Code has conversation memory
3. **Focused on documentation** - Skills are teach, not orchestrate
4. **Simplified MCP tools** - 9 tools instead of complex server architecture

### Common Pitfalls Avoided
1. **@vercel/postgres limitations** - No sql.unsafe(), no dynamic table names
2. **TypeScript strict mode** - Proper type casts, no any types
3. **ID type confusion** - Clear UUID vs TEXT documentation
4. **Import patterns** - Correct imports from @cgk-platform/ui (main entry only)

---

## Tool Statistics

### Before Enhancement
- **Total MCP tools**: 84 tools (5 categories)
- **Skills**: 0 (none existed)
- **Documentation**: Scattered across CLAUDE.md files

### After Enhancement
- **Total MCP tools**: 93 tools (7 categories) - **+9 tools**
- **Skills**: 4 comprehensive skills - **NEW**
- **Documentation**: Centralized, searchable, examples-driven

### Skill Documentation Size
- Database Migration Expert: ~350 lines
- Payment Processing Expert: ~450 lines
- Shopify Integration Expert: ~500 lines
- Storefront Development Expert: ~550 lines
- **Total**: ~1,850 lines of expert guidance

---

## References

### Implementation Files
- Skills: `/Users/holdenthemic/Documents/cgk/.claude/skills/`
- Schema tools: `/packages/mcp/src/tools/schema.ts`
- Job tools: `/packages/mcp/src/tools/jobs.ts`
- Tool index: `/packages/mcp/src/tools/index.ts`

### Planning Documents
- Original plan: Provided in user message
- Deep exploration: Three research agents (migrations, storefront, packages)

### Related Docs
- Main CLAUDE.md: `/Users/holdenthemic/Documents/cgk/CLAUDE.md`
- MCP package CLAUDE.md: `/packages/mcp/CLAUDE.md`
- Jobs package CLAUDE.md: `/packages/jobs/CLAUDE.md`
- DB package CLAUDE.md: `/packages/db/CLAUDE.md`

---

*Implementation completed on 2026-02-27. All tools type-checked and ready for use, Mr. Tinkleberry.*
