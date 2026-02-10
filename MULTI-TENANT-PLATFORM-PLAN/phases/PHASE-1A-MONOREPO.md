# PHASE-1A: Monorepo Setup

**Duration**: 1 week (Week 1)
**Depends On**: PHASE-0 (Portability)
**Parallel With**: None
**Blocks**: PHASE-1B, PHASE-1C, PHASE-1D

---

## Goal

Initialize the Turborepo monorepo with pnpm workspaces, create all package and app stubs, configure shared tooling (TypeScript, ESLint, Prettier, Tailwind), and establish CI/CD pipeline.

---

## Inputs Required

Before starting this phase:
- [ ] PHASE-0 complete (monorepo structure initialized)
- [ ] Read: `MASTER-EXECUTION-GUIDE.md`
- [ ] Read: `TENANT-ISOLATION.md` (understand isolation patterns)
- [ ] Read: `ARCHITECTURE.md` (understand overall structure)
- [ ] Access to GitHub repository from Phase 0
- [ ] pnpm installed globally

**Required Reading (Full Paths):**
```
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/MASTER-EXECUTION-GUIDE.md
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/TENANT-ISOLATION.md
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/ARCHITECTURE.md
```

---

## Out of Scope (Do NOT Implement)

- [ ] Database migrations or schema (PHASE-1B)
- [ ] Authentication logic (PHASE-1C)
- [ ] Actual UI components (PHASE-1D)
- [ ] Business logic in any package
- [ ] Production dependencies (only devDependencies)
- [ ] Admin features (PHASE-2)

---

## Success Criteria

- [ ] `pnpm install` runs without errors
- [ ] `pnpm turbo build` completes successfully for all packages/apps
- [ ] `pnpm turbo lint` passes with no errors
- [ ] GitHub Actions CI pipeline runs on every PR
- [ ] All package stubs export placeholder modules
- [ ] All app stubs render a basic page

---

## Deliverables

### Monorepo Configuration
- `package.json` with pnpm workspace configuration
- `pnpm-workspace.yaml` defining workspace structure
- `turbo.json` with build/test/lint pipeline configuration
- `.npmrc` for pnpm settings

### Shared Tooling (packages/config)
- TypeScript base configuration (`tsconfig.base.json`)
- ESLint shared configuration
- Prettier configuration
- Tailwind CSS shared configuration

### Package Stubs
- `packages/ui` - Shared UI components (placeholder exports)
- `packages/db` - Database client (placeholder exports)
- `packages/auth` - Authentication utilities (placeholder exports)
- `packages/shopify` - Shopify API clients (placeholder exports)
- `packages/commerce` - Commerce provider abstraction (placeholder exports)
- `packages/config` - Shared configuration files

### App Stubs
- `apps/orchestrator` - Internal management portal (Next.js app shell)
- `apps/admin` - White-labeled admin dashboard (Next.js app shell)
- `apps/storefront` - Headless storefront (Next.js app shell)
- `apps/creator-portal` - Creator portal (Next.js app shell)

### CI/CD
- `.github/workflows/ci.yml` with build, lint, test jobs
- Turbo remote caching configuration (optional)

---

## Constraints

- MUST use pnpm (not npm or yarn)
- MUST use Turborepo for monorepo orchestration
- TypeScript strict mode enabled for all packages
- All packages MUST have `index.ts` barrel exports
- App stubs MUST be Next.js 16+ with App Router
- NO production dependencies installed in stubs yet (only devDependencies)

---

## Pattern References

**Skills to invoke:**
- Context7 MCP: "Turborepo setup guide" - for monorepo best practices
- Context7 MCP: "pnpm workspace configuration" - for workspace setup

**MCPs to consult:**
- Context7 MCP: Search "Turborepo pipeline configuration"
- Context7 MCP: Search "pnpm workspace typescript monorepo"

**RAWDOG code to reference:**
- `/package.json` - Current dependency versions to align with
- `/tsconfig.json` - TypeScript configuration patterns
- `/.eslintrc.json` - ESLint rules to port over
- `/tailwind.config.ts` - Tailwind configuration to extract

**External references:**
- Turborepo official docs: https://turbo.build/repo/docs
- pnpm workspace docs: https://pnpm.io/workspaces

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Exact folder structure within each package stub
2. Whether to use internal packages vs published packages pattern
3. Turbo remote caching setup (Vercel vs self-hosted)
4. Which ESLint plugins to include in shared config
5. Tailwind preset strategy (extend vs override)

---

## Tasks

### [PARALLEL] Initialize Monorepo
- [ ] Create repository with Turborepo (`npx create-turbo@latest`)
- [ ] Configure pnpm workspaces in `pnpm-workspace.yaml`
- [ ] Set up root `package.json` with workspace scripts
- [ ] Configure `turbo.json` pipeline (build, lint, test, dev)

### [PARALLEL] Shared Tooling
- [ ] Create `packages/config/typescript/base.json`
- [ ] Create `packages/config/eslint/index.js`
- [ ] Create `packages/config/tailwind/tailwind.config.js`
- [ ] Create `.prettierrc` at root

### [PARALLEL] Package Stubs
- [ ] Create `packages/ui` with placeholder Button export
- [ ] Create `packages/db` with placeholder sql export
- [ ] Create `packages/auth` with placeholder types
- [ ] Create `packages/shopify` with placeholder client
- [ ] Create `packages/commerce` with placeholder types

### [SEQUENTIAL after Package Stubs] App Stubs
- [ ] Create `apps/orchestrator` Next.js app with basic layout
- [ ] Create `apps/admin` Next.js app with basic layout
- [ ] Create `apps/storefront` Next.js app with basic layout
- [ ] Create `apps/creator-portal` Next.js app with basic layout

### [SEQUENTIAL after App Stubs] CI/CD Setup
- [ ] Create `.github/workflows/ci.yml`
- [ ] Configure build job (all packages/apps)
- [ ] Configure lint job
- [ ] Configure test job (placeholder)
- [ ] Verify CI runs on PR

---

## Expected File Structure

```
multi-tenant-platform/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .npmrc
├── .prettierrc
├── .github/
│   └── workflows/
│       └── ci.yml
├── apps/
│   ├── orchestrator/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/app/
│   │       ├── layout.tsx
│   │       └── page.tsx
│   ├── admin/
│   │   └── (same structure)
│   ├── storefront/
│   │   └── (same structure)
│   └── creator-portal/
│       └── (same structure)
└── packages/
    ├── config/
    │   ├── eslint/
    │   ├── typescript/
    │   └── tailwind/
    ├── ui/
    │   ├── package.json
    │   └── src/index.ts
    ├── db/
    │   ├── package.json
    │   └── src/index.ts
    ├── auth/
    │   ├── package.json
    │   └── src/index.ts
    ├── shopify/
    │   ├── package.json
    │   └── src/index.ts
    └── commerce/
        ├── package.json
        └── src/index.ts
```

---

## Definition of Done

### Code Quality
- [ ] All tasks in this phase completed (no deferrals)
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `pnpm install` completes without errors
- [ ] `pnpm turbo build` builds all packages and apps
- [ ] `pnpm turbo lint` passes
- [ ] No `// TODO` or `// PLACEHOLDER` comments
- [ ] All files under 650 lines

### Deliverables Verified
- [ ] Each package has working `index.ts` export
- [ ] Each package has `CLAUDE.md` file
- [ ] Each app renders a "Hello World" page
- [ ] GitHub Actions CI passes on a test PR
- [ ] Shared tooling (TS, ESLint, Prettier, Tailwind) configured

### Testing
- [ ] Build completes for all packages
- [ ] Lint passes for all packages
- [ ] Apps start with `pnpm dev`

### Documentation
- [ ] Package CLAUDE.md files updated
- [ ] README updated with new structure

### Handoff Ready
- [ ] Type check passes
- [ ] No known blockers for PHASE-1B
- [ ] Handoff document created if starting fresh session

---

## What's Next

**When this phase is complete:**

1. **Proceed to**: PHASE-1B-DATABASE.md
2. **Key outputs Phase 1B needs**:
   - Working monorepo with all packages
   - `packages/db` stub ready for implementation
   - TypeScript configuration working
   - pnpm workspaces functioning
3. **Start Phase 1B by**:
   - Run `npx tsc --noEmit` to verify Phase 1A outputs
   - Read: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-1B-DATABASE.md`
   - Read: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/DATABASE-SCHEMA-2025-02-10.md`

**Phase 1 continues:**
- PHASE-1B (Database) → PHASE-1C (Auth) → PHASE-1D (Packages)

**CHECKPOINT**: After PHASE-1D completes, run Foundation Audit and start fresh session
