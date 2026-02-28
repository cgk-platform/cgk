# ADR-003: Husky Pre-Commit Hooks over ESLint Plugin

**Date**: 2026-02-27
**Status**: Accepted
**Deciders**: Platform Architect Team
**Context**: Validation strategy for tenant isolation and code quality

---

## Context and Problem Statement

The CGK platform requires automated validation of tenant isolation patterns (no raw SQL, cache, or jobs without tenant context). Should we implement this as an ESLint plugin (IDE-integrated) or pre-commit hooks (terminal-based)?

**Development Context**: Primary development tool is **Claude Code CLI** (terminal-based), not VS Code or other IDE.

---

## Decision Drivers

* **Development workflow**: Terminal-based with Claude Code CLI
* **Validation timing**: Catch violations before commit (not during typing)
* **Implementation effort**: Standalone scripts vs ESLint plugin architecture
* **Enforcement**: Block bad commits (not just warnings)
* **Maintenance**: Simple scripts vs complex ESLint plugin API

---

## Considered Options

1. **Husky + lint-staged + standalone scripts**
2. **ESLint plugin** (custom rules for tenant isolation)
3. **Both** (ESLint for IDE, Husky for CLI)

---

## Decision Outcome

**Chosen option**: "Husky + lint-staged + standalone scripts", because the terminal-based workflow makes pre-commit hooks the natural enforcement point.

### Positive Consequences

* ✅ **Terminal-native**: Runs automatically on `git commit` (primary workflow)
* ✅ **Blocks commits**: Validation failures prevent bad code from entering repo
* ✅ **Simple implementation**: Standalone TypeScript/Bash scripts (no ESLint plugin complexity)
* ✅ **Fast**: Only validates changed files (via lint-staged)
* ✅ **Manual invocation**: `pnpm validate:tenant-isolation` for on-demand checks
* ✅ **Industry standard**: Husky used by React, Vue, Node.js, etc.

### Negative Consequences

* ❌ **No real-time feedback**: Violations caught at commit time, not while typing
* ❌ **Terminal-only**: No VS Code integration (not needed for Claude Code workflow)

---

## Pros and Cons of the Options

### Husky + lint-staged ✅ (Chosen)

**Pros**:
* ✅ Terminal-native (matches Claude Code CLI workflow)
* ✅ Automatic enforcement (runs on every commit)
* ✅ Simple scripts (TypeScript/Bash, no plugin API)
* ✅ Fast (lint-staged only checks changed files)
* ✅ Industry standard (30M+ downloads/week)

**Cons**:
* ❌ No real-time feedback (not needed in terminal workflow)
* ❌ No IDE integration (not used in Claude Code workflow)

### ESLint Plugin

**Pros**:
* ✅ Real-time feedback in VS Code (red squiggles)
* ✅ Integrated with existing ESLint setup

**Cons**:
* ❌ **IDE-focused** (not useful in terminal workflow)
* ❌ **Complex implementation** (ESLint plugin API, AST parsing)
* ❌ **No enforcement** (just warnings, doesn't block commits)
* ❌ **Maintenance burden** (keep up with ESLint versions)

### Both

**Pros**:
* ✅ Best of both worlds (IDE + terminal)

**Cons**:
* ❌ **Duplicate effort** (maintain 2 validation systems)
* ❌ **Over-engineering** (IDE not used in current workflow)

---

## Implementation

```json
// package.json
{
  "scripts": {
    "prepare": "husky install",
    "validate:tenant-isolation": "node scripts/validate-tenant-context.ts",
    "validate:migrations": "bash scripts/validate-migration.sh",
    "validate:all": "pnpm validate:tenant-isolation && pnpm validate:migrations"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "node scripts/validate-tenant-context.ts",
      "prettier --write"
    ],
    "packages/db/src/migrations/**/*.sql": [
      "bash scripts/validate-migration.sh"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit validations..."
pnpm lint-staged

echo "✅ All validations passed"
```

---

## Links

* [Husky Documentation](https://typicode.github.io/husky/)
* [lint-staged Documentation](https://github.com/okonet/lint-staged)
* [scripts/validate-tenant-context.ts](../../scripts/validate-tenant-context.ts)
