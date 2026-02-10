# Phase 0: Portability & Open Source Setup

**Duration**: 2 weeks (before Phase 1)
**Focus**: Repository structure, CLI scaffold, documentation for installability

---

## Purpose

This phase runs BEFORE Phase 1 to establish the portable, installable foundation. Without this, the platform would be a custom build rather than a reusable package.

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

See PROMPT.md "Documentation Requirements" section for full details.

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
- [ ] `pnpm install && pnpm dev` starts without errors
- [ ] Packages can be published to npm
- [ ] README provides complete installation guide
- [ ] Each package has CLAUDE.md for AI context
- [ ] Changesets workflow creates proper releases

---

## Dependencies for Phase 1

Phase 1 (Foundation) requires Phase 0 completion:

- [x] Monorepo structure established
- [x] CLI scaffold working
- [x] Package publishing pipeline ready
- [x] Starter templates available
- [x] Documentation structure in place

---

## README Template

See `README-TEMPLATE.md` for the full README content to use for the GitHub repository.
