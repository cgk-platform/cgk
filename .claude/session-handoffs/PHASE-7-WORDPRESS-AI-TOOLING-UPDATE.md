# Phase 7: WordPress-Style AI Tooling Update

**Date**: 2026-03-03
**Agent**: implementer (Sonnet 4.5)
**Task**: Update all AI documentation to reflect WordPress-style portable architecture

---

## Summary

Successfully updated all Claude documentation (CLAUDE.md, agent definitions, knowledge bases, skill registry) to reflect the WordPress-style self-hosted distribution model. This ensures all AI agents understand CGK Platform is a **template repository** (like WordPress.org), NOT a multi-tenant SaaS (like WordPress.com).

---

## What Was Implemented

### 1. Created WordPress Distribution Patterns Knowledge Base

**File**: `.claude/knowledge-bases/wordpress-distribution-patterns/README.md`

**Size**: 1,122 lines

**Key Sections**:

- WordPress.org vs WordPress.com comparison (critical distinction)
- Architecture philosophy (template, not platform)
- Distribution model (fork & deploy to user's infrastructure)
- Template repository pattern (protected files with `.gitattributes`)
- Single Vercel project architecture (8 apps, path-based routing)
- Configuration-over-code approach (`platform.config.ts` = `wp-config.php`)
- Self-hosted infrastructure (user owns Vercel, Neon, Upstash)
- One-click install process (5-10 minutes to live site)
- Theme customization system (CSS custom properties)
- Asset management (user's own Vercel Blob storage)
- Tenant export/fork system (migrate brands to separate deployments)
- Migration path from Docker to Vercel (435 lines removed)
- Anti-patterns (what NOT to do - 7 examples)
- Decision trees (3 workflows)
- Code examples (4 patterns)

**Purpose**: Comprehensive reference for all agents to understand the WordPress.org-style distribution model and avoid building SaaS patterns.

---

### 2. Updated CLAUDE.md (Root Project Instructions)

**Changes**:

#### Added WordPress-Style Architecture Section

```markdown
## 🏗️ Architecture: WordPress-Style Portable Platform

**CRITICAL**: CGK Platform is a template repository (like WordPress.org),
NOT a multi-tenant SaaS (like WordPress.com or Shopify).
```

**Key Points**:

- ✅ Distribution model comparison table (CGK vs WordPress.org vs WordPress.com)
- ✅ Single Vercel project with path-based routing (8 apps in one project)
- ✅ `platform.config.ts` = `wp-config.php` analogy
- ✅ Self-hosted infrastructure diagram (user owns everything)
- ✅ Cost breakdown ($0/month free tier to $49/month production)

#### Updated Vercel Team Configuration Section

**Old**: 8 separate Vercel projects (cgk-admin, cgk-storefront, etc.)

**New**: Single Vercel project per user deployment

**Changes**:

- ❌ Removed list of 9 separate Vercel projects (outdated)
- ✅ Added single project architecture with path-based routing
- ✅ Added `vercel.json` configuration explanation
- ✅ Added one-click deploy button workflow (5-10 minutes)
- ✅ Added environment variable management (shared across 8 apps)
- ✅ Added deployment workflow (git push, NOT vercel CLI)
- ✅ Clarified CGK development team has ONE reference project (testing only)

#### Updated Knowledge Bases List

**Added**:

- `wordpress-distribution-patterns/` - Self-hosted architecture, fork workflow

**Total**: 10 knowledge bases (was 9)

#### Updated Key Decisions Table

**Added rows**:

- Distribution: WordPress.org-style template (fork & self-host)
- Deployment: Single Vercel project (8 apps via path-based routing)
- Docker: ❌ REMOVED (435 lines) - Vercel-native only
- Storefronts: Single generic + theming (hard-coded meliusly-storefront REMOVED)

---

### 3. Updated Agent Definitions

#### implementer.md

**Added WordPress-Style Architecture Patterns Section**:

```markdown
## WordPress-Style Architecture Patterns

**CRITICAL**: CGK Platform is a template repository (WordPress.org),
NOT a multi-tenant SaaS (WordPress.com).
```

**Key Additions**:

1. **Self-Hosted Distribution** - Users fork and deploy to THEIR infrastructure
2. **Configuration-Driven Features** - Prefer `platform.config.ts` over hardcoded values
3. **Feature Flag Gating** - Always check feature flags before rendering
4. **Tenant Export/Fork Workflow** - Brand assets in isolated directories
5. **Anti-Patterns to Avoid** - 3 specific examples with code snippets

**Code Examples**:

- ✅ Configuration-driven brand names and colors
- ✅ Feature flag gating for creator portal
- ✅ User's own asset storage (Vercel Blob)
- ❌ Wrong patterns: shared platform services, pricing UI, shared CDN

#### debugger.md

**Added WordPress-Style Deployment Debugging Section**:

```markdown
## WordPress-Style Deployment Debugging

**CRITICAL**: When debugging, remember users deploy to THEIR infrastructure,
not a shared platform.
```

**Key Additions**:

1. **Understanding User's Deployment** - Diagram showing user owns all resources
2. **Common Deployment Scenarios**:
   - Scenario 1: Fresh Deploy (One-Click Button)
   - Scenario 2: Manual Deploy (Git Clone)
3. **Single Vercel Project Architecture** - All 8 apps in ONE project
4. **Debugging Path-Based Routing** - Vercel.json rewrites configuration
5. **Updated Production Issues** - Context of USER's infrastructure
6. **Self-Hosted Infrastructure Debugging** - Commands for user's Neon, Upstash, Vercel

**Updated Commands**:

- All `/vercel` skill commands now explicitly state "USER's Vercel project"
- Added checks for Neon free tier limits (192 hours/month)
- Added checks for Upstash free tier limits (10k commands/day)
- Added path routing debugging steps
- Added environment variable debugging (shared across 8 apps)

---

### 4. Updated SKILL-REGISTRY.md

**Changes**:

#### Updated Knowledge Bases Section

**Count**: Changed from 9 to 10 total

**Added Entry**:

```markdown
### 2.4 wordpress-distribution-patterns

**Domain**: Self-hosted portable platform architecture, WordPress.org-style
distribution model, template repository patterns

**Key Topics**:

- WordPress.org vs WordPress.com comparison
- Template repository pattern (fork & deploy workflow)
- Single Vercel project architecture
- Configuration-over-code approach
- Self-hosted infrastructure
- One-click install process
- Tenant export/fork system
- Docker removal and Vercel-native migration
- Anti-patterns

**When to Reference**:

- Understanding CGK platform distribution model
- Implementing user-facing features (avoid SaaS patterns)
- Debugging deployment issues (user's infrastructure)
- Planning new features (configuration vs code)
- Explaining architecture to new developers
```

**Reordered**: Moved figma-design-system to 2.5 (was 2.4)

---

## Technical Details

### Architecture Changes Documented

1. **Single Vercel Project**
   - Before: 8 separate Vercel projects (cgk-admin, cgk-storefront, etc.)
   - After: 1 Vercel project per user with path-based routing
   - Path routing: `/admin` → `apps/admin/`, `/creator` → `apps/creator-portal/`, etc.

2. **Docker Removal**
   - Removed: Dockerfile, docker-compose.yml, .dockerignore (435 lines)
   - Reason: Vercel-native deployment is simpler for users
   - Migration path documented for existing Docker users

3. **Storefront Architecture**
   - Before: Hard-coded storefronts (meliusly-storefront, cgk-storefront)
   - After: Single generic storefront customized via `platform.config.ts`
   - Theming: CSS custom properties injected at runtime

4. **Configuration System**
   - `platform.config.ts` protected from upstream merges (`.gitattributes merge=ours`)
   - Admin UI at `/admin/platform-config` for non-technical editing
   - Validation function ensures configuration correctness

5. **Self-Hosted Infrastructure**
   - Users own: Vercel project, Neon database, Upstash Redis, Vercel Blob storage, GitHub fork
   - Free tier: $0/month (Vercel Hobby + Neon Free + Upstash Free)
   - Production tier: ~$49/month (Vercel Pro $20 + Neon Launch $19 + Upstash Pro $10)

---

## Anti-Patterns Documented

The knowledge base explicitly documents 7 anti-patterns to avoid:

1. ❌ Building shared infrastructure (users provision own)
2. ❌ Platform-centric branding (user's brand front and center)
3. ❌ "Upgrade" or "Pricing" pages (no platform pricing)
4. ❌ Platform CDN for assets (user's own Vercel Blob)
5. ❌ Centralized analytics (user's own GA4/Mixpanel)
6. ❌ "Admin tenant" with special powers (no cross-deployment access)
7. ❌ Shared secrets across users (each user generates own keys)

---

## Decision Trees Added

Three decision trees to guide development:

1. **Multi-Tenant vs Single-Tenant**
   - 1 brand → Single-tenant mode
   - 2+ brands → Multi-tenant mode
   - Same codebase, different `platform.config.ts`

2. **Fork vs Keep Multi-Tenant**
   - Brands need separation → Export tenant, create new fork
   - Brands stay together → Keep multi-tenant, same deployment

3. **Customize Code vs Use Config**
   - In `platform.config.ts`? → Edit config
   - Visual styling? → Edit CSS custom properties
   - Otherwise → Edit code (fork-friendly)

---

## Code Examples Added

Four practical code examples in knowledge base:

1. **Checking Deployment Mode** - Show/hide tenant switcher based on mode
2. **Tenant-Specific Theming** - Load theme from `platform.config.ts`
3. **Feature Flag Gating** - Conditionally render creator portal
4. **Export Tenant CLI Command** - Complete tenant export workflow

---

## Verification

### Files Changed

1. ✅ `.claude/knowledge-bases/wordpress-distribution-patterns/README.md` (created, 1,122 lines)
2. ✅ `CLAUDE.md` (updated, added WordPress section, updated Vercel section, updated knowledge bases list)
3. ✅ `.claude/agents/implementer.md` (updated, added WordPress patterns section)
4. ✅ `.claude/agents/debugger.md` (updated, added WordPress debugging section)
5. ✅ `.claude/SKILL-REGISTRY.md` (updated, added knowledge base entry, incremented count)

### Content Verification

- ✅ WordPress.org vs WordPress.com distinction explained clearly
- ✅ Template repository pattern documented
- ✅ Single Vercel project architecture explained
- ✅ Path-based routing documented
- ✅ Docker removal mentioned (435 lines)
- ✅ Self-hosted infrastructure emphasized throughout
- ✅ Anti-patterns documented with code examples
- ✅ Decision trees for common scenarios
- ✅ Agent-specific guidance added to implementer and debugger
- ✅ SKILL-REGISTRY updated with new knowledge base

---

## Impact

### For AI Agents

- ✅ Agents now understand CGK is a template, not a SaaS platform
- ✅ Implementer agent will avoid building SaaS patterns
- ✅ Debugger agent will debug in context of user's infrastructure
- ✅ All agents reference wordpress-distribution-patterns knowledge base
- ✅ Consistent terminology: "user's infrastructure", not "platform"

### For Developers

- ✅ Clear distinction between WordPress.org (CGK) vs WordPress.com (not CGK)
- ✅ Understanding of single Vercel project architecture
- ✅ Knowledge of configuration-over-code approach
- ✅ Awareness of anti-patterns to avoid
- ✅ Decision trees for common architectural decisions

### For Users

- ✅ Users understand they own their infrastructure
- ✅ One-click deploy workflow clearly documented
- ✅ Tenant export/fork system explained
- ✅ Cost transparency ($0/month to $49/month)
- ✅ No platform lock-in emphasized

---

## Related Documentation

- [.claude/knowledge-bases/wordpress-distribution-patterns/README.md](.claude/knowledge-bases/wordpress-distribution-patterns/README.md) - Complete patterns guide
- [CLAUDE.md](../../CLAUDE.md) - Root project instructions (updated)
- [.claude/agents/implementer.md](.claude/agents/implementer.md) - Implementer agent definition (updated)
- [.claude/agents/debugger.md](.claude/agents/debugger.md) - Debugger agent definition (updated)
- [.claude/SKILL-REGISTRY.md](.claude/SKILL-REGISTRY.md) - Skill registry (updated)
- [vercel.json](../../vercel.json) - Single project configuration
- [platform.config.ts](../../platform.config.ts) - User configuration example

---

## Next Steps

### Recommended Follow-Up Tasks

1. **Create ADR-006**: Document WordPress distribution model decision
   - Why WordPress.org model over multi-tenant SaaS
   - Trade-offs and benefits
   - Migration path from Docker to Vercel

2. **Update README.md**: Emphasize WordPress-style architecture
   - Add comparison table in "Architecture" section
   - Clarify "fork & deploy" workflow
   - Highlight "zero lock-in"

3. **Update Contributing Guide**: Add section on WordPress-style patterns
   - How to avoid SaaS patterns
   - Configuration-over-code guidelines
   - Fork-friendly code practices

4. **Create Deployment Guide**: Step-by-step Vercel deployment
   - One-click button workflow
   - Manual deployment process
   - Tenant export/import workflow

5. **Add Architect Agent Pattern**: WordPress-style architecture checklist
   - Feature design checklist (config vs code)
   - Multi-tenant vs single-tenant decision tree
   - Self-hosted infrastructure considerations

---

## Definition of Done

- ✅ WordPress distribution patterns knowledge base created (1,122 lines)
- ✅ CLAUDE.md updated with WordPress-style architecture section
- ✅ CLAUDE.md Vercel section updated (single project, not 8 projects)
- ✅ CLAUDE.md knowledge bases list updated (10 total)
- ✅ CLAUDE.md key decisions table updated (Docker removed, single project)
- ✅ implementer.md updated with WordPress patterns section
- ✅ debugger.md updated with WordPress debugging section
- ✅ SKILL-REGISTRY.md updated with new knowledge base
- ✅ All documentation emphasizes "user's infrastructure", not "platform"
- ✅ Anti-patterns documented with code examples
- ✅ Decision trees added for common scenarios
- ✅ Code examples provided for key patterns

**Status**: COMPLETE

---

**Agent**: implementer (Sonnet 4.5)
**Completion Time**: ~30 minutes
**Lines Changed**: ~1,500 lines across 5 files
**New Content**: 1,122 lines (wordpress-distribution-patterns knowledge base)

---

Mr. Tinkleberry, Phase 7: WordPress-Style AI Tooling Update is complete. All Claude documentation has been updated to reflect the WordPress.org-style portable architecture.
