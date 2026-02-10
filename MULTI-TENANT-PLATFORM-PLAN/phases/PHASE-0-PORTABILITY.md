# Phase 0: Portability & Open Source Setup

**Duration**: 2 weeks (before Phase 1)
**Depends On**: None (first phase)
**Parallel With**: None
**Blocks**: PHASE-1A, PHASE-1B, PHASE-1C, PHASE-1D

---

## Goal

Establish the portable, installable foundation for the CGK platform. Create the monorepo structure, CLI scaffold, and documentation that makes this a reusable package rather than a custom build.

---

## Inputs Required

Before starting this phase, you need:
- [ ] Access to create new GitHub repository
- [ ] npm account for publishing packages (or npmrc configured)
- [ ] Read: `MASTER-EXECUTION-GUIDE.md` (execution context)
- [ ] Read: `PORTABILITY-ARCHITECTURE.md` (architecture design)
- [ ] Read: `CLAUDE-MD-TEMPLATE.md` (documentation template)
- [ ] Read: `CLAUDE-MD-PACKAGE-TEMPLATE.md` (package docs template)
- [ ] Read: `README-TEMPLATE.md` (GitHub README template)

---

## Out of Scope (Do NOT Implement)

- [ ] Database implementation (PHASE-1B)
- [ ] Authentication logic (PHASE-1C)
- [ ] UI components beyond placeholders (PHASE-1D)
- [ ] Admin features (PHASE-2)
- [ ] Storefront features (PHASE-3)
- [ ] Any production business logic

---

## Objectives

1. Initialize the monorepo with npm publishing pipeline
2. **Create root CLAUDE.md** (AI agents do this, not user)
3. Create the CLI tool scaffold
4. Write comprehensive README and setup documentation
5. **Establish CLAUDE.md patterns for packages** (AI agents maintain these)
6. Set up versioning with changesets
7. Create starter templates

---

## CRITICAL: CLAUDE.md Creation is AI Agent Responsibility

**The user will NOT create or maintain CLAUDE.md files.** AI agents must:

1. Create `/CLAUDE.md` (root) at the START of Phase 0
2. Create `/packages/{name}/CLAUDE.md` when each package is built
3. Update CLAUDE.md files whenever patterns or gotchas are discovered
4. Keep documentation in sync with code changes

See `MASTER-EXECUTION-GUIDE.md` for full execution context.

**Required Reading (Full Paths):**
```
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/MASTER-EXECUTION-GUIDE.md
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PORTABILITY-ARCHITECTURE.md
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CLAUDE-MD-TEMPLATE.md
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CLAUDE-MD-PACKAGE-TEMPLATE.md
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/README-TEMPLATE.md
```

---

## Week 1: Repository Foundation

### Tasks

#### [PARALLEL] Initialize Monorepo for Publishing

- [ ] Create new repository `cgk`
- [ ] Configure Turborepo with npm publishing pipeline
- [ ] Set up changesets for versioning
- [ ] Configure GitHub Actions for:
  - CI (lint, typecheck, test)
  - Changesets version & publish
  - Canary releases from main

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install
      - run: pnpm build

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### [PARALLEL] Create Package Stubs with CLAUDE.md

Create each package with minimal implementation and AI documentation:

```
packages/
├── core/
│   ├── package.json
│   ├── CLAUDE.md           # AI context
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── cli/
│   ├── package.json
│   ├── CLAUDE.md
│   └── src/
│       └── index.ts
└── config/
    └── ...
```

**CLAUDE.md Template for Packages:**

```markdown
# @cgk/{package-name} - AI Development Guide

## Purpose
[1-2 sentences on what this package does]

## Quick Reference
\`\`\`typescript
// Most common import pattern
import { ... } from '@cgk/{package-name}'
\`\`\`

## Key Patterns
[3-5 patterns with code examples]

## File Map
| File | Purpose | Key Exports |
|------|---------|-------------|

## Dependencies
- [List dependencies and why]

## Common Gotchas
- [AI-specific warnings]
```

#### [PARALLEL] Create Root README

- [ ] Write comprehensive README.md for GitHub
- [ ] Include:
  - Quick start (< 5 minutes to hello world)
  - Prerequisites
  - Installation guide
  - Configuration reference
  - Deployment guide
  - Contributing guide
  - License

### Deliverables

- Repository initialized with all package stubs
- GitHub Actions workflow for releases
- Changesets configured
- Root README complete

---

## Week 2: CLI & Starter Templates

### Tasks

#### [PARALLEL] Build CLI Scaffold

```typescript
// packages/cli/src/index.ts
import { Command } from 'commander'

const program = new Command()

program
  .name('cgk')
  .description('CGK - Commerce Growth Kit CLI')
  .version('0.1.0')

// Create command
program
  .command('create <name>')
  .description('Create a new brand site')
  .option('-t, --template <template>', 'Template to use', 'full')
  .action(async (name, options) => {
    await createProject(name, options)
  })

// Doctor command
program
  .command('doctor')
  .description('Check system requirements')
  .action(async () => {
    await runDoctor()
  })

// Init command
program
  .command('init')
  .description('Initialize platform in existing project')
  .action(async () => {
    await initProject()
  })

program.parse()
```

#### [PARALLEL] Create Starter Templates

**Basic Template** (`starters/basic/`):
- Admin portal only
- Minimal configuration
- No storefront

**Full Template** (`starters/full/`):
- Admin portal
- Storefront
- Creator portal
- All features enabled

**Storefront-Only Template** (`starters/storefront-only/`):
- Just the headless storefront
- Connects to existing platform

#### [SEQUENTIAL] Test End-to-End Flow

- [ ] Test `npx @cgk/cli create test-brand`
- [ ] Verify template copies correctly
- [ ] Test `pnpm install` works
- [ ] Test `pnpm dev` starts correctly
- [ ] Document any issues

### Deliverables

- Working CLI with `create`, `doctor`, `init` commands
- Three starter templates
- End-to-end flow tested
- Installation documentation complete

---

## File Structure After Phase 0

```
cgk/
├── .changeset/
│   └── config.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
├── CONTRIBUTING.md
├── LICENSE
├── CHANGELOG.md
│
├── packages/
│   ├── core/
│   │   ├── CLAUDE.md
│   │   ├── package.json
│   │   └── src/index.ts
│   ├── cli/
│   │   ├── CLAUDE.md
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── commands/
│   │       │   ├── create.ts
│   │       │   ├── doctor.ts
│   │       │   └── init.ts
│   │       └── utils/
│   ├── config/
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── tailwind/
│   └── [other package stubs]
│
├── starters/
│   ├── basic/
│   │   ├── package.json
│   │   ├── platform.config.ts
│   │   └── src/
│   ├── full/
│   │   ├── package.json
│   │   ├── platform.config.ts
│   │   └── src/
│   └── storefront-only/
│       ├── package.json
│       ├── platform.config.ts
│       └── src/
│
└── docs/
    ├── README.md
    ├── getting-started/
    │   ├── installation.md
    │   ├── configuration.md
    │   └── deployment.md
    ├── guides/
    └── api-reference/
```

---

## Success Criteria

- [ ] `npx @cgk/cli create my-brand --template=basic` works
- [ ] `npx @cgk/cli setup` launches platform setup wizard
- [ ] `npx @cgk/cli doctor` shows configuration status
- [ ] `pnpm install && pnpm dev` starts without errors
- [ ] Fresh install auto-redirects to `/setup` wizard
- [ ] Vercel integrations provision Neon/Upstash with one click
- [ ] Packages can be published to npm
- [ ] README provides complete installation guide
- [ ] Each package has CLAUDE.md for AI context
- [ ] Changesets workflow creates proper releases

---

## Platform Setup Wizard

**Spec**: See [PLATFORM-SETUP-SPEC](../PLATFORM-SETUP-SPEC-2025-02-10.md) for complete implementation.

After cloning and running `pnpm dev`, the platform detects it's a fresh install and shows a WordPress-style setup wizard:

1. **Database** - Connect Neon PostgreSQL (via Vercel integration or manual URL)
2. **Cache** - Connect Upstash Redis (via Vercel integration or manual)
3. **Storage** - Connect Vercel Blob (optional)
4. **Migrations** - Auto-run database schema setup
5. **Admin** - Create first super-admin user
6. **Platform Config** - Set platform name, defaults
7. **Complete** - Redirect to orchestrator dashboard

### CLI Commands for Setup

```bash
# Interactive setup (mirrors web wizard)
npx @cgk/cli setup

# Check configuration status
npx @cgk/cli doctor
# Output:
#   ✓ Database: Connected (Neon PostgreSQL)
#   ✓ Cache: Connected (Upstash Redis)
#   ✓ Migrations: Up to date (v1.2.3)
#   ✓ Admin: 1 super admin configured

# Provision specific services
npx @cgk/cli setup --database
npx @cgk/cli setup --cache
```

### One-Click Vercel Deploy

The preferred installation method - auto-provisions all services:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=...)
```

Vercel integrations automatically add environment variables for Neon, Upstash, and Blob.

---

## Definition of Done

### Code Quality
- [ ] All tasks in this phase completed (no deferrals)
- [ ] `pnpm install` runs without errors
- [ ] `pnpm turbo build` completes successfully
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] No `// TODO` or `// PLACEHOLDER` comments in committed code
- [ ] All files under 650 lines

### Deliverables Verified
- [ ] `npx @cgk/cli create my-brand --template=basic` works
- [ ] `npx @cgk/cli doctor` shows configuration status
- [ ] Packages can be published to npm (dry-run tested)
- [ ] GitHub Actions CI workflow runs successfully
- [ ] Changesets configured and tested

### Documentation
- [ ] Root `/CLAUDE.md` created from template
- [ ] Each package has `CLAUDE.md` file
- [ ] `README.md` complete with installation guide
- [ ] `CONTRIBUTING.md` exists
- [ ] All pattern references documented

### Handoff Ready
- [ ] Type check passes
- [ ] No known blockers for Phase 1
- [ ] Handoff document created at `.claude/session-handoffs/PHASE-0-HANDOFF.md`

---

## What's Next

**When this phase is complete:**

1. **Proceed to**: PHASE-1A-MONOREPO.md
2. **Key outputs Phase 1A needs**:
   - Monorepo structure with pnpm workspaces
   - Package stubs with CLAUDE.md files
   - CI/CD pipeline working
   - CLI scaffold functional
3. **Start Phase 1A by**:
   - Run `npx tsc --noEmit` to verify Phase 0 outputs
   - Read: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-1A-MONOREPO.md`
4. **Context check**: If context window is getting full, create handoff and start fresh session

**Phase 1 sequence (all sequential):**
- PHASE-1A → PHASE-1B → PHASE-1C → PHASE-1D

---

## README Template

See `README-TEMPLATE.md` for the full README content to use for the GitHub repository.
