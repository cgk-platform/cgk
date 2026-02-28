# ADR-004: Skill Architecture Separation (Skills vs Knowledge Bases)

**Date**: 2026-02-27
**Status**: Accepted
**Deciders**: Platform Architect Team
**Context**: Claude Code skill system architecture

---

## Context and Problem Statement

The `.claude/skills/` directory contains both executable skills (user-invocable workflows) and knowledge bases (domain documentation for agents). Should these be separated, and if so, how?

**Current State**:
- 1 executable skill: `meliusly-figma-audit/` (has index.js)
- 4 knowledge bases: `database-migration-expert/`, `payment-processing-expert/`, etc. (README only)

**Problem**: Mixing executable workflows with reference documentation creates confusion about what's invocable vs informational.

---

## Decision Drivers

* **Clarity**: Users/agents must easily distinguish between invocable skills and reference docs
* **Discoverability**: Skill registry should list only executable skills
* **Unix philosophy**: "Do one thing well" + separation of concerns
* **Maintainability**: Clear boundaries between code (skills) and docs (knowledge bases)

---

## Considered Options

1. **Three-tier separation** (skills/, knowledge-bases/, agents/)
2. **Two-tier** (skills/ contains both, marked with metadata)
3. **Keep current structure** (no separation)

---

## Decision Outcome

**Chosen option**: "Three-tier separation", following Unix philosophy and MCP protocol best practices.

### Structure

```
.claude/
├── skills/              # Executable, user-invocable workflows (/skill-name)
│   ├── tenant-isolation-validator/
│   │   ├── index.js         # Entry point (REQUIRED for executable skills)
│   │   ├── package.json     # Dependencies
│   │   └── README.md        # Usage guide
│   └── frontend-design/
│
├── knowledge-bases/     # Context documentation (agent reference only)
│   ├── database-migration-patterns/
│   │   └── README.md        # Patterns, examples, best practices
│   ├── payment-processing-patterns/
│   │   └── README.md
│   └── shopify-api-guide/
│       └── README.md
│
└── agents/             # Agent personas and configurations
    ├── architect.md
    ├── implementer.md
    └── reviewer.md
```

### Positive Consequences

* ✅ **Clear separation**: Skills = code (executable), Knowledge Bases = docs (informational)
* ✅ **Discoverability**: `/skill-name` only shows executable skills
* ✅ **Unix philosophy**: Each directory has one purpose
* ✅ **Maintainability**: Easy to know where to add new skills vs docs
* ✅ **Skill registry**: Lists only executable skills (no clutter)

### Negative Consequences

* ❌ **Migration effort**: Move 4 knowledge bases to new directory
* ❌ **More directories**: 3 top-level dirs instead of 1 (acceptable trade-off)

---

## Definitions

### Executable Skill
**Criteria**: User-invocable workflow via `/skill-name`
**Required files**:
- `index.js` or `index.ts` - Entry point with `execute()` function
- `package.json` - Metadata and dependencies
- `README.md` - Usage guide with examples

**Example**: `/tenant-isolation-validator` checks code for violations

### Knowledge Base
**Criteria**: Agent reference documentation (not user-invocable)
**Required files**:
- `README.md` - Patterns, examples, best practices

**Example**: `database-migration-patterns/` contains SQL migration best practices

---

## Migration Plan

```bash
# Create knowledge-bases/ directory
mkdir -p .claude/knowledge-bases

# Move 4 existing knowledge bases
mv .claude/skills/database-migration-expert .claude/knowledge-bases/database-migration-patterns
mv .claude/skills/payment-processing-expert .claude/knowledge-bases/payment-processing-patterns
mv .claude/skills/shopify-integration-expert .claude/knowledge-bases/shopify-api-guide
mv .claude/skills/storefront-development-expert .claude/knowledge-bases/figma-design-system

# Update READMEs to remove "skill" terminology, focus on "patterns"
```

---

## Links

* [SKILL-REGISTRY.md](../SKILL-REGISTRY.md) - Catalog of skills and knowledge bases
* [Anthropic MCP Protocol](https://modelcontextprotocol.io/) - Skill system inspiration
