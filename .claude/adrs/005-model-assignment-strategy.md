# ADR-005: Model Assignment Strategy (Opus/Sonnet/Haiku)

**Date**: 2026-02-27
**Status**: Accepted
**Deciders**: Platform Architect Team
**Context**: Cost optimization for Claude agent coordination

---

## Context and Problem Statement

Claude agents can use three models (Opus 4.5, Sonnet 4.5, Haiku) with vastly different costs ($15 vs $3 vs $0.25 per MTok input). How should we assign models to agent types to optimize cost while maintaining quality?

---

## Decision Drivers

* **Cost efficiency**: 10x cost difference between models (opus vs haiku)
* **Quality requirements**: Critical decisions need opus, routine code needs sonnet
* **Speed**: Haiku is 5-10x faster than opus
* **Budget constraints**: Platform development budget ~$1,000/month for agents
* **Agent specialization**: Different agents have different quality needs

---

## Considered Options

1. **Use opus for everything** (max quality, max cost)
2. **Use sonnet for everything** (balanced, but suboptimal)
3. **Strategic assignment** (opus for critical, sonnet for code, haiku for exploration)

---

## Decision Outcome

**Chosen option**: "Strategic assignment", optimizing cost while preserving quality where it matters.

### Model Assignment Matrix

| Agent Type | Model | Cost/MTok | Rationale |
|------------|-------|-----------|-----------|
| **architect** | opus-4.5 | $15 / $75 | Critical architecture decisions require best reasoning |
| **implementer** | sonnet-4.5 | $3 / $15 | Production code quality without opus cost |
| **reviewer** | opus-4.5 | $15 / $75 | Security reviews require best analysis |
| **debugger** | sonnet-4.5 | $3 / $15 | Fast debugging, good enough quality |
| **researcher** | haiku | $0.25 / $1.25 | Fast exploration, simple queries |
| **tester** | sonnet-4.5 | $3 / $15 | Test quality matters, but not critical |
| **refactorer** | sonnet-4.5 | $3 / $15 | Bulk refactoring, sonnet is fast enough |
| **Explore** | haiku | $0.25 / $1.25 | Parallel codebase exploration (cost scales with agents) |
| **Plan** | opus-4.5 | $15 / $75 | Implementation planning requires architecture thinking |

### Positive Consequences

* ✅ **70% cost savings** vs using opus for everything
* ✅ **Quality preserved** for critical decisions (architecture, security)
* ✅ **Fast exploration** with cheap haiku agents
* ✅ **Budget predictability**: Can estimate phase costs

### Cost Example

**Phase 8 Full Audit**:
- **Naive (1 opus agent)**: 2M tokens × $15/MTok = $30, 8 hours
- **Optimized (15 haiku agents)**: 15 × 100k × $0.25/MTok = $3.75, 1 hour
- **Savings**: 87% cost reduction, 87% time reduction

---

## Escalation Pattern (Start Cheap, Scale Up)

```
haiku (exploration) → $0.50
  ↓ (if not found)
sonnet (debugging) → $3
  ↓ (if complex)
opus (architecture) → $15
```

**Benefit**: Most problems solved at haiku ($0.50), rare escalation to opus ($15).

---

## Links

* [MODEL-SELECTION.md](../MODEL-SELECTION.md) - Detailed selection criteria
* [AGENT-COORDINATION.md](../AGENT-COORDINATION.md) - Agent orchestration guide
