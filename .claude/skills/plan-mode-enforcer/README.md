# Plan Mode Enforcer

> **Purpose**: Analyzes user requests to determine if EnterPlanMode is required before implementation work begins

**Version**: 1.0.0
**Type**: Executable Skill
**Invocation**: `/plan-mode-enforcer "<user-request>"`

---

## Overview

This skill enforces the **MANDATORY** planning requirement from CLAUDE.md:

> **CRITICAL REQUIREMENT**: At the start of EVERY Claude session, you MUST enter plan mode before doing any implementation work.

The skill analyzes user requests for complexity indicators and blocks implementation work when planning is required.

---

## Usage

### Basic Analysis

```bash
/plan-mode-enforcer "Add a new creator payment feature to the admin dashboard"
```

**Output**:
```
🔍 Analyzing request complexity...

⚠️  PLAN MODE REQUIRED

Reason: Feature implementation requires planning to ensure alignment with architecture

📝 Required Action:
   1. Invoke EnterPlanMode skill
   2. Explore codebase thoroughly
   3. Design approach
   4. Get user approval via ExitPlanMode
   5. Then implement

❌ DO NOT proceed with implementation without planning.
```

### Verbose Mode

```bash
/plan-mode-enforcer "Fix typo in README.md" --verbose
```

**Output**:
```
🔍 Analyzing request complexity...

📊 Analysis Results:
   Request: Fix typo in README.md
   Complexity: trivial
   File count estimate: 1
   Has architectural decisions: false
   Has feature implementation: false
   Has refactoring: false
   Is research/exploration: false
   Is trivial fix: true
   User requested skip: false

✅ Plan Mode NOT Required

Exemption: Trivial single-line fix (typo, obvious bug)

You may proceed with implementation directly.
```

---

## When Plan Mode IS Required

Plan mode is **MANDATORY** for:

### 1. Feature Implementation

**Examples**:
- "Add creator payment tracking"
- "Create new analytics dashboard"
- "Build subscription management UI"
- "Implement Stripe webhook handling"

**Reason**: Features require architectural alignment, dependency analysis, and comprehensive design.

### 2. Multi-File Changes (3+ Files)

**Examples**:
- "Refactor authentication across all apps"
- "Update database schema and migrations"
- "Add tenant isolation to jobs package"

**Reason**: Multi-file changes need careful planning to avoid breaking existing functionality.

### 3. Architectural Decisions

**Examples**:
- "Design new multi-tenant database schema"
- "Add OAuth integration for Shopify"
- "Implement rate limiting middleware"

**Reason**: Architecture changes affect the entire platform and require upfront design.

### 4. Refactoring

**Examples**:
- "Split large component into smaller ones"
- "Extract shared utilities from admin app"
- "Consolidate duplicate API routes"

**Reason**: Refactoring requires analysis of all usage sites to prevent breaking changes.

### 5. Phase/Milestone Work

**Examples**:
- "Complete Phase 2B (Commerce Package)"
- "Implement all creator portal features"

**Reason**: Phases involve coordinated changes across multiple files and packages.

---

## When Plan Mode is NOT Required (Exemptions)

Plan mode can be **skipped** for:

### 1. Simple Research/Exploration

**Examples**:
- "Read the admin dashboard code"
- "Show me how authentication works"
- "Find all uses of withTenant()"
- "Explain the database schema"

**Reason**: No implementation work, just reading and explaining.

### 2. Trivial Single-Line Fixes

**Examples**:
- "Fix typo in comment"
- "Add missing semicolon"
- "Correct import path"

**Reason**: Simple fixes with zero architectural impact.

### 3. User Explicitly Requests Skip

**Examples**:
- "Skip planning, just fix the bug"
- "No plan needed, this is urgent"
- "Just do it without planning"

**Reason**: User takes responsibility for skipping planning (not recommended).

---

## Decision Logic

The skill uses this decision tree:

```
┌─────────────────────────────────────┐
│ User Request                        │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Analyze Complexity                  │
│ - File count estimate               │
│ - Architectural indicators          │
│ - Feature implementation keywords   │
│ - Refactoring keywords              │
└─────────────┬───────────────────────┘
              │
              ▼
       ┌──────┴──────┐
       │             │
       ▼             ▼
   Trivial?      Complex?
   Research?     Multi-file?
   User skip?    Architecture?
       │             │
       │             │
       ▼             ▼
   EXEMPT        REQUIRES PLAN
   ✅ Proceed    ⚠️  Block until planned
```

---

## Complexity Levels

| Level | File Count | Characteristics | Requires Plan? |
|-------|------------|-----------------|----------------|
| **Trivial** | 1 | Typos, comments, single-line fixes | ❌ No |
| **Low** | 1-2 | Single component, no architecture | ❌ No |
| **Medium** | 3-5 | Multiple files, feature work | ✅ Yes |
| **High** | 6+ | Architecture, refactoring, phase work | ✅ Yes |

---

## Integration with Claude Workflow

This skill should be invoked **automatically** at the start of every Claude session:

```
User: Add creator payment tracking to admin dashboard

Claude:
  1. Invoke /plan-mode-enforcer
     → Result: Plan mode REQUIRED (feature implementation)
  2. Block implementation
  3. Invoke EnterPlanMode
  4. Begin planning phase
```

**NEVER** skip this step for non-trivial work.

### Auto-Invocation Pattern

This skill is **proactively invoked** by Claude agents at the start of every session before implementation work begins. It is NOT optional.

**CLAUDE.md Mandate** (lines 18-36):

> **CRITICAL REQUIREMENT**: At the start of EVERY Claude session, you MUST enter plan mode before doing any implementation work.

**Agent Workflow**:
1. User provides request
2. Agent analyzes request (or invokes `/plan-mode-enforcer` for complex requests)
3. If plan required → invoke `EnterPlanMode` immediately
4. If exempt → proceed with work (still read files before editing)

**Integration with CLAUDE.md**:

This skill enforces the planning workflow mandated in CLAUDE.md. It provides:
- **Complexity analysis** - Estimates file count, detects architectural indicators
- **Decision logic** - Applies exemption rules (trivial fixes, research, user skip)
- **Blocking enforcement** - Prevents implementation without approved plan

See [CLAUDE.md#EnterPlanMode](../../../CLAUDE.md#-mandatory-always-enter-plan-mode-first) for full planning requirements.

---

## Return Values

The skill returns a structured result:

```json
{
  "requiresPlan": true,
  "reason": "Feature implementation requires planning to ensure alignment with architecture",
  "exemption": null,
  "analysis": {
    "complexity": "medium",
    "fileCountEstimate": 5,
    "hasArchitecturalDecisions": false,
    "hasFeatureImplementation": true,
    "hasRefactoring": false,
    "isResearch": false,
    "isTrivialFix": false,
    "userRequestedSkip": false
  },
  "action": "BLOCK_IMPLEMENTATION_UNTIL_PLANNED"
}
```

---

## File Count Estimation

The skill estimates affected file count based on keywords:

| Keyword Pattern | Estimated Files |
|----------------|----------------|
| "all apps", "platform-wide", "entire" | 20 |
| "multiple", "several", "app", "package" | 5 |
| "and", "plus", "also" (count parts) | 2-10 |
| "component", "page", "route" | 2 |
| Single task with no modifiers | 1 |

---

## Examples

### Example 1: Feature Implementation (REQUIRES PLAN)

**Request**: "Add Stripe webhook handling for subscription updates"

**Analysis**:
- Complexity: High
- File count: ~5 (webhook route, handler, DB updates, types, tests)
- Has architectural decisions: Yes (Stripe integration)
- Has feature implementation: Yes

**Decision**: ⚠️  **Plan mode REQUIRED**

**Reason**: Feature implementation with architectural implications

---

### Example 2: Typo Fix (EXEMPT)

**Request**: "Fix typo in README.md - change 'databse' to 'database'"

**Analysis**:
- Complexity: Trivial
- File count: 1
- Is trivial fix: Yes

**Decision**: ✅ **Plan mode NOT required**

**Exemption**: Trivial single-line fix

---

### Example 3: Refactoring (REQUIRES PLAN)

**Request**: "Split the 800-line OrdersPage component into smaller components"

**Analysis**:
- Complexity: Medium
- File count: ~4 (split into 3 new components + original)
- Has refactoring: Yes

**Decision**: ⚠️  **Plan mode REQUIRED**

**Reason**: Refactoring requires careful planning to avoid breaking changes

---

### Example 4: Research (EXEMPT)

**Request**: "Show me how the tenant isolation system works"

**Analysis**:
- Complexity: Research
- Is research: Yes (no implementation keywords)

**Decision**: ✅ **Plan mode NOT required**

**Exemption**: Simple research/exploration task

---

## Agent Responsibilities

**When user provides a request:**

1. **ALWAYS invoke /plan-mode-enforcer first** (except for obvious trivial tasks)
2. **If plan mode required**:
   - Stop immediately
   - Inform user
   - Invoke EnterPlanMode
   - Begin planning phase
3. **If exempt**:
   - Proceed with implementation
   - Still read existing files before editing

**NEVER:**
- Start implementation without checking
- Ignore the plan mode requirement
- Override the decision without user consent

---

## Testing

Create test cases to verify detection:

```javascript
// test-cases.js
const cases = [
  {
    request: 'Add payment tracking feature',
    expectedRequiresPlan: true,
    expectedReason: /feature implementation/i
  },
  {
    request: 'Fix typo in comment',
    expectedRequiresPlan: false,
    expectedExemption: /trivial/i
  },
  {
    request: 'Refactor authentication across all apps',
    expectedRequiresPlan: true,
    expectedReason: /multi-file|refactoring/i
  }
]
```

---

## Related Documentation

- [CLAUDE.md#EnterPlanMode](../../../CLAUDE.md#-mandatory-always-enter-plan-mode-first) - Plan mode requirements
- [MASTER-EXECUTION-GUIDE.md](../../../MULTI-TENANT-PLATFORM-PLAN/MASTER-EXECUTION-GUIDE.md) - Execution workflow
- [ARCHITECTURE.md](../../../MULTI-TENANT-PLATFORM-PLAN/ARCHITECTURE.md) - Architecture decisions

---

## Changelog

- **1.0.0** (2026-02-27): Initial release with complexity analysis and decision logic
