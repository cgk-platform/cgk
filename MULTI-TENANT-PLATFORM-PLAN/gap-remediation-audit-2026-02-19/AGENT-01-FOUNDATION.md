# Gap Remediation Audit: Foundation & Portability

**Agent:** 01 | **Date:** 2026-02-19 | **Pass:** 1

---

## Executive Summary

The CGK platform's foundation is substantially built and well beyond stub/placeholder status. Core packages (`core`, `db`, `auth`, `cli`, `ui`, `shopify`, `commerce`) are all implemented with real logic, tests, and thorough documentation. However, several planned features from the phase docs remain genuinely incomplete: the `withPlatformContext` super-admin cross-tenant utility is entirely absent, migration file numbering has pervasive duplicate conflicts that will cause silent skips in CI, and the Phase-0B database-setup-UX phase is marked "COMPLETE" in the header but its actual success criteria checklist shows every item unchecked (pre-commit hooks, CI migration tests, TypeScript type generation from schema, `cgk init` full flow validation). Priority concerns are the duplicate migration numbers and the missing super-admin cross-tenant context pattern.

---

## Feature Status Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Turborepo monorepo configuration | ✅ DONE | `turbo.json`, `pnpm-workspace.yaml`, proper pipeline |
| pnpm workspaces | ✅ DONE | All packages/apps/starters/tooling registered |
| GitHub Actions CI (lint/typecheck/test) | ✅ DONE | `.github/workflows/ci.yml` present and complete |
| GitHub Actions release workflow | ✅ DONE | `release.yml` and `canary.yml` present |
| Changesets versioning | ✅ DONE | `.changeset/config.json` present |
| All package stubs w/ CLAUDE.md | ✅ DONE | Every package has CLAUDE.md |
| `packages/core` — defineConfig, types, utilities | ✅ DONE | Full implementation |
| `packages/db` — sql client (Neon/Vercel Postgres) | ✅ DONE | Uses `@vercel/postgres`, fully implemented |
| `packages/db` — `withTenant()` utility | ✅ DONE | Correct search_path pattern, validation, cleanup |
| `packages/db` — `createTenantCache()` utility | ✅ DONE | In-memory + Upstash Redis implementations |
| `packages/db` — migration runner | ✅ DONE | Public + tenant schema runners, status, dry-run |
| `packages/db` — `withPlatformContext()` | ❌ NOT DONE | Specified in TENANT-ISOLATION.md; never implemented |
| Multi-DB adapter support (PlanetScale/Turso) | ❌ NOT DONE | Hard-coded to `@vercel/postgres`; no adapter layer |
| Public schema migrations | ✅ DONE | 26 files, 001–026 |
| Public migration duplicate numbers (008, 009, 012) | ⚠️ PARTIAL | Runner uses `name` as PK so deduplication works, but version numbers are ambiguous |
| Tenant schema migrations | ✅ DONE | 59+ files covering all core tables |
| Tenant migration duplicate numbers | ⚠️ PARTIAL | 13 duplicate version buckets (009, 010, 012, 015, 016, 018, 024, 026, 027, 031, 034, 039, 048) |
| `packages/auth` — JWT sign/verify | ✅ DONE | Custom JWT, full implementation |
| `packages/auth` — session management | ✅ DONE | Session validation, revocation |
| `packages/auth` — magic link auth | ✅ DONE | Implemented |
| `packages/auth` — password auth | ✅ DONE | Implemented |
| `packages/auth` — `getTenantContext()` | ✅ DONE | Header → JWT → subdomain extraction chain |
| `packages/auth` — `authMiddleware()` | ✅ DONE | Next.js compatible, injects context headers |
| `packages/auth` — super admin system | ✅ DONE | `super-admin.ts`, impersonation |
| `packages/auth` — RBAC / permissions | ✅ DONE | Full role hierarchy and permissions |
| `packages/ui` — core components | ✅ DONE | Button, Card, Input, Alert, Badge, Spinner, Toast, etc. |
| `packages/shopify` — Admin/Storefront clients | ✅ DONE | Full implementation with queries |
| `packages/commerce` — CommerceProvider interface | ✅ DONE | Full interface + Shopify provider |
| `packages/cli` — create/init/doctor commands | ✅ DONE | All implemented |
| `packages/cli` — setup wizard (CLI) | ✅ DONE | `setup.ts` with step-by-step wizard |
| `packages/cli` — migrate command | ✅ DONE | Full: status, dry-run, rollback |
| `packages/cli` — tenant:create/list/export/import | ✅ DONE | All implemented |
| `packages/cli` — check-updates/update/changelog | ✅ DONE | All implemented |
| `packages/cli` — `tenant:upgrade` (tier upgrade) | ❌ NOT DONE | Planned in PORTABILITY-ARCHITECTURE.md; absent |
| `packages/cli` — `deploy` / `env:push` commands | ❌ NOT DONE | Planned in PORTABILITY-ARCHITECTURE.md; absent |
| Starter templates (basic, full, storefront-only) | ⚠️ PARTIAL | Config + minimal src/app; no real implementation pages |
| Starters — `storefront-only` in workspace | ✅ DONE | Registered in pnpm-workspace.yaml |
| `tooling/migrations` | 🔄 CHANGED | Legacy rawdog-specific data migration tool, NOT the new platform migration system |
| Orchestrator setup wizard (web UI) | ✅ DONE | 9-step wizard at `/setup` in orchestrator app |
| docs/ directory | ✅ DONE | getting-started, guides, api-reference present |
| Pre-commit hooks (migration SQL validation) | ❌ NOT DONE | No `.husky` directory, no pre-commit hooks |
| CI migration tests (from-scratch in CI) | ❌ NOT DONE | CI runs unit tests only; no migration e2e in CI |
| TypeScript types generated from DB schema | ❌ NOT DONE | Planned in Phase-0B; manual types only |
| `cgk init` full validation (tables check, health) | ⚠️ PARTIAL | `init` creates config + updates package.json; does NOT run migrations or table validation |
| `cgk doctor` database connectivity test | ⚠️ PARTIAL | Checks env vars for DB URL presence; does NOT actually test connection |
| Platform.config.ts `defineConfig` | ✅ DONE | Type-safe config in `packages/core/src/config.ts` |
| Deployment profiles (small/medium/large/enterprise) | ⚠️ PARTIAL | Types defined in config schema; no runtime enforcement |
| LICENSE file | ✅ DONE | Present at repo root |
| CONTRIBUTING.md | ✅ DONE | Present at repo root |

---

## Detailed Gaps

### 1. `withPlatformContext()` — ❌ NOT DONE

**Planned:** `TENANT-ISOLATION.md` specifies a `withPlatformContext()` function exported from `@cgk-platform/db` that marks super-admin cross-tenant queries, with explicit documentation that it requires super-admin auth. The doc shows usage pattern: `const allOrders = await withPlatformContext(async () => { ... })`.

**Found:** Only `withTenant()`, `setTenantSchema()`, and `resetToPublicSchema()` exist in `packages/db/src/tenant.ts`. There is no `withPlatformContext()`. The `super-admin.ts` in auth package handles super-admin auth, but has no cross-tenant query wrapper.

**Files checked:**
- `/packages/db/src/tenant.ts`
- `/packages/db/src/index.ts`
- `grep -r "withPlatformContext"` → zero results across all packages

**Impact:** Code in the orchestrator or any super-admin context that performs cross-tenant queries has no standardized, audited wrapper. Developers will write ad-hoc cross-tenant queries with no consistent pattern or permission gate.

**TODO List:**
- [ ] Create `packages/db/src/platform-context.ts` implementing `withPlatformContext<T>(operation: () => Promise<T>): Promise<T>` that sets `search_path = public` and adds a console/log marker for audit
- [ ] Add a `requireSuperAdminContext()` guard parameter so the function cannot be called without passing an explicit super-admin auth context (e.g., `withPlatformContext(authCtx, async () => {...})` where `authCtx.role === 'super_admin'` is validated)
- [ ] Export `withPlatformContext` from `packages/db/src/index.ts`
- [ ] Add JSDoc `@ai-pattern super-admin-only` warning
- [ ] Write unit test in `packages/db/src/__tests__/tenant.test.ts` that verifies calls without super-admin auth throw

---

### 2. Duplicate Migration Version Numbers — ⚠️ PARTIAL

**Planned:** `PHASE-0B-DATABASE-SETUP-UX.md` explicitly calls for "migrations are sequential" validation and a pre-commit hook to "ensure migrations are sequential." The migration loader sorts by filename, and the runner uses `name` as the primary key for idempotency — which technically prevents double-application but makes `--status` output misleading and version-based `targetVersion` filtering unreliable.

**Found:**
- Public schema: 3 duplicate version buckets — `008` (super_admin + team_management), `009` (platform_alerts + platform_logs + roles + user_management), `012` (context_switching + feature_flags)
- Tenant schema: 13 duplicate version buckets — `009`, `010`, `012`, `015`, `016`, `018`, `024`, `026`, `027`, `031`, `034`, `039`, `048`
- The `targetVersion` option in `MigrationOptions` (used by `--rollback`) filters by `m.version <= targetVersion` which breaks when multiple migrations share a version
- Running `cgk migrate --status` shows version numbers that are confusing and non-sequential

**Files checked:**
- `/packages/db/src/migrations/public/` — directory listing
- `/packages/db/src/migrations/tenant/` — directory listing
- `/packages/db/src/migrations/runner.ts` — version handling logic

**TODO List:**
- [ ] Audit all duplicate version numbers and renumber them sequentially. For public schema: renumber files from `008` through `026` so no version number is shared. For tenant schema: renumber from the first duplicate through `059`. Use a script to avoid manual errors.
- [ ] Create a renumbering script at `scripts/renumber-migrations.ts` that reads all migration files, assigns sequential numbers, renames files, and prints a diff for review
- [ ] After renumbering, run `DELETE FROM schema_migrations` (dev DB only) and re-run all migrations to verify the new order doesn't introduce dependency failures
- [ ] Update migration loader in `packages/db/src/migrations/loader.ts` to throw an error if duplicate version numbers are detected after loading (fail-fast rather than silent skip)
- [ ] Add a `scripts/validate-migrations.ts` check that can be run in CI: `pnpm validate-migrations` — fails if any two files in public/ or tenant/ share the same version prefix
- [ ] Add this validation script to `.github/workflows/ci.yml` as a dedicated job

---

### 3. Pre-commit Hooks (Migration SQL Validation) — ❌ NOT DONE

**Planned:** Phase-0B explicitly requires "Add pre-commit hook: Validate SQL syntax in migration files, Check for proper naming conventions, Ensure migrations are sequential."

**Found:** No `.husky` directory, no `lint-staged` configuration, no `pre-commit` script in root `package.json`. The root `package.json` has no `prepare` script.

**TODO List:**
- [ ] Add `husky` and `lint-staged` as devDependencies in root `package.json`
- [ ] Run `pnpm exec husky init` to create `.husky/` directory structure
- [ ] Create `.husky/pre-commit` script that runs: `pnpm lint-staged`
- [ ] Configure `lint-staged` in root `package.json` to run on `packages/db/src/migrations/**/*.sql`: a SQL syntax validator (can use `pgformatter` or a simple regex check for common errors from the Phase-0B lessons-learned section)
- [ ] Add to pre-commit: run `pnpm validate-migrations` (the script from gap #2) to catch new duplicate version numbers before they're committed
- [ ] Document the pre-commit hook in `packages/db/CLAUDE.md` under a "Before Committing Migrations" section

---

### 4. `cgk doctor` — Does Not Test Database Connectivity — ⚠️ PARTIAL

**Planned:** Phase-0B specifies `cgk doctor` should "Test database connectivity" and "Verify migration status" and "Check schema-per-tenant setup" and "Suggest specific fixes for each issue found."

**Found:** `packages/cli/src/commands/doctor.ts` checks whether the `POSTGRES_URL` / `DATABASE_URL` environment variable is *set* but does NOT attempt an actual database connection. It also does not check migration status, does not verify that the public schema tables exist, and does not validate tenant isolation.

**Files checked:**
- `/packages/cli/src/commands/doctor.ts` (lines 1–80 read)

**TODO List:**
- [ ] Add a "Database Connection" check in `doctor.ts` that dynamically imports `@cgk-platform/db` and runs `sql\`SELECT 1\`` — report pass/fail with the error message on failure
- [ ] Add a "Migrations Status" check that calls `getMigrationStatus('public')` and reports: number applied, number pending, last applied migration name
- [ ] Add a "Schema Isolation" check that verifies `withTenant()` correctly changes `search_path` (use a safe read-only query: `SELECT current_schema()`)
- [ ] Add a "Required Tables" check that verifies core public tables exist: `organizations`, `users`, `sessions`, `magic_links`
- [ ] For each failing check, print the specific fix command (e.g., "Run: `cgk migrate` to apply pending migrations")
- [ ] Wrap all database checks in try/catch so one failure doesn't abort the whole doctor run

---

### 5. `cgk init` — Missing Migration Execution and Table Validation — ⚠️ PARTIAL

**Planned:** Phase-0B envisions `cgk init` as the one-command setup that: checks env, creates schemas, runs migrations, verifies all tables exist, tenant isolation works, and prints pass/fail summary.

**Found:** `packages/cli/src/commands/init.ts` only: checks for `package.json`, prompts for brand name/slug/features, writes `platform.config.ts`, and updates `package.json` dependencies. It does NOT run migrations, does NOT connect to the database, and does NOT verify setup.

The `setup.ts` command does run migrations (step 3 in the wizard), but it's a separate command and the Phase-0B vision was that `init` would be the one-command flow.

**TODO List:**
- [ ] After writing `platform.config.ts`, add a prompt: "Run database setup now? (requires DATABASE_URL in .env.local)" — if yes, call the `setupDatabase()` logic from `setup.ts` inline
- [ ] After migrations, add verification: query `information_schema.tables` to confirm at minimum `organizations`, `users`, `sessions` exist in the public schema
- [ ] Print a clear success summary showing: tables created, schemas created, next steps (`cgk tenant:create` or `pnpm dev`)
- [ ] If `DATABASE_URL` is not set, print a clear message directing to `docs/setup/DATABASE.md` rather than silently skipping

---

### 6. CI Migration Tests (From-Scratch in CI) — ❌ NOT DONE

**Planned:** Phase-0B requires "Add CI check: Set up test database in CI, Run all migrations from scratch, Verify tables created correctly, Run `cgk doctor` to validate setup."

**Found:** `.github/workflows/ci.yml` runs lint, typecheck, and unit tests only. No migration e2e step. The `tooling/migrations/tests/e2e/` directory contains e2e tests (`migration.test.ts`, `idempotent.test.ts`, etc.) but these are for the legacy rawdog data migration tool, not the platform migration system, and they're not wired into CI.

**TODO List:**
- [ ] Add a `migrate-test` job to `.github/workflows/ci.yml` that:
  - Sets up a Neon test branch (using Neon's GitHub Action) or a Postgres service container
  - Runs `pnpm cgk migrate` against the test database
  - Runs `pnpm cgk doctor` to validate the resulting state
  - Creates a test tenant (`pnpm cgk tenant:create ci_test`) and verifies tenant migrations applied
  - Tears down the test branch on completion
- [ ] Add `TEST_DATABASE_URL` as a GitHub Actions secret
- [ ] Document the CI migration test setup in `.github/workflows/ci.yml` comments

---

### 7. TypeScript Types Generated from DB Schema — ❌ NOT DONE

**Planned:** Phase-0B: "Generate TypeScript types from schema: Use @vercel/postgres schema introspection, Auto-generate type definitions, Keep types in sync with migrations, Include in build process."

**Found:** All TypeScript types for database rows are written manually. There is no schema introspection script, no generated types file, and no build step that generates types. Types in `packages/auth/src/types.ts`, `packages/db/src/types.ts`, etc. are hand-written.

**TODO List:**
- [ ] Evaluate and select a type generation approach: `pg-to-ts`, `kanel`, or a custom script using `information_schema.columns` queries
- [ ] Create `packages/db/src/generated/` directory where generated types will live
- [ ] Write `scripts/generate-types.ts` that connects to the database, queries `information_schema.columns` for all tables in `public` schema, and emits TypeScript interfaces
- [ ] Add `"db:generate-types": "tsx scripts/generate-types.ts"` to root `package.json`
- [ ] Wire into the turbo `build` pipeline so generated types are up-to-date before dependent packages compile
- [ ] Document in `packages/db/CLAUDE.md`: "Do not edit `src/generated/` directly — these are auto-generated from the database schema"

---

### 8. Starter Templates — Minimal Implementation — ⚠️ PARTIAL

**Planned:** Three starter templates (`basic`, `full`, `storefront-only`) should provide meaningful starting points. The architecture doc envisions them as "brand site starter kits."

**Found:** Each starter has only:
- `platform.config.ts` — placeholder config with `mybrand` slug
- `src/app/layout.tsx` + `src/app/page.tsx` — minimal Next.js shell
- `next.config.js`, `tailwind.config.js`, `tsconfig.json` — configs
- No routes, no middleware, no auth integration, no real content

Additionally, the `create` command in CLI looks for templates in `packages/cli/src/../templates/{template}` (a `templates/` directory that does NOT exist), falling back to `createBasicStructure()` which just creates a bare scaffold. The actual `starters/` directory at the repo root is not referenced by the CLI.

**Files checked:**
- `/starters/basic/`, `/starters/full/`, `/starters/storefront-only/`
- `/packages/cli/src/commands/create.ts` (lines 1–80)

**TODO List:**
- [ ] Fix `create.ts` to point at the correct `starters/` directory: change `path.join(import.meta.dirname, '..', '..', 'templates', options.template)` to resolve to the monorepo's `starters/{template}` directory
- [ ] Add middleware.ts to each starter that calls `authMiddleware` from `@cgk-platform/auth`
- [ ] Add `.env.example` that is copied into the created project (both starters already have this file but CLI's `createBasicStructure` doesn't copy it)
- [ ] For `starters/basic`: add a working login page that uses magic-link auth from `@cgk-platform/auth`
- [ ] For `starters/full`: add a placeholder admin dashboard layout showing tenant context
- [ ] For `starters/storefront-only`: add a working product listing page using `@cgk-platform/commerce`
- [ ] Add the starter `src/` contents to the CLI's bundled templates so `npx @cgk-platform/cli create` actually ships the full starter content (or adjust the CLI to copy from the monorepo path at runtime)

---

### 9. Multi-DB Adapter Support (PlanetScale/Turso) — ❌ NOT DONE

**Planned:** `PORTABILITY-ARCHITECTURE.md` describes support for multiple database backends. The architecture envisions a portable platform that can run on different providers.

**Found:** `packages/db/src/client.ts` is a 6-line file that directly imports from `@vercel/postgres`: `export const sql = vercelSql`. There is no adapter abstraction, no `createDbClient()` factory, no support for anything other than Vercel/Neon Postgres.

**Note:** This may be an intentional scope reduction (the architecture doc listed it as aspirational), but it's a significant portability gap given the phase name is "Portability."

**TODO List:**
- [ ] Decide and document in `packages/db/CLAUDE.md` whether multi-DB adapter support is in scope for v1 or explicitly deferred to v2
- [ ] If in scope: create a `DbAdapter` interface in `packages/db/src/adapter.ts` with `query()` and `sql` template tag
- [ ] Implement `VercelPostgresAdapter` wrapping `@vercel/postgres`
- [ ] Create `createDbClient(config: DbConfig): DbAdapter` factory exported from the package
- [ ] Update `withTenant()` and `createTenantCache()` to use the adapter interface rather than calling `sql` directly
- [ ] If NOT in scope for v1: add explicit note to `PORTABILITY-ARCHITECTURE.md` that multi-DB is deferred and the current implementation is Neon/Vercel Postgres only

---

### 10. CLI Tenant Tier Upgrade and Deploy Commands — ❌ NOT DONE

**Planned:** `PORTABILITY-ARCHITECTURE.md` specifies:
```bash
npx @cgk-platform/cli tenant:upgrade rawdog --tier=schema
npx @cgk-platform/cli deploy
npx @cgk-platform/cli deploy --preview
npx @cgk-platform/cli env:push
npx @cgk-platform/cli status
```

**Found:** None of these commands exist in `/packages/cli/src/commands/` or are registered in `packages/cli/src/index.ts`.

**TODO List:**
- [ ] Implement `tenant:upgrade <slug> --tier=<schema|dedicated>` command that: validates the target tier, creates a new schema/database as appropriate, migrates data, updates the `organizations` table with the new tier info
- [ ] Implement `deploy` command that wraps `vercel deploy` with platform-specific pre-checks (migrations status, env var validation)
- [ ] Implement `env:push` command that reads `.env.local` and pushes to Vercel via `vercel env add`
- [ ] Implement `status` command that shows: current platform version, tenant count, migration status, health check results
- [ ] Register all new commands in `packages/cli/src/index.ts`

---

### 11. Deployment Profiles — Runtime Enforcement Missing — ⚠️ PARTIAL

**Planned:** `PORTABILITY-ARCHITECTURE.md` defines deployment profiles (`small`, `medium`, `large`, `enterprise`) with concrete limits (connections, rate limits, jobs/hour).

**Found:** `packages/core/src/config.ts` defines `DeploymentConfig` with `profile?: 'small' | 'medium' | 'large' | 'enterprise'` — TypeScript types only. There is no runtime enforcement, no connection pool sizing, no rate limiting tied to profile, and no middleware that reads the profile.

**TODO List:**
- [ ] Create `packages/core/src/deployment-profiles.ts` with the profile constants (max connections, rate limits, jobs/hour) as exported objects
- [ ] Export from `packages/core/src/index.ts`
- [ ] Document in `packages/core/CLAUDE.md` how to read the active profile at runtime
- [ ] Decide and document whether profile enforcement belongs in `packages/db` (connection pooling) or application middleware (rate limiting) — add TODO comments if deferred

---

### 12. `tooling/migrations` — Legacy Code Confusion — 🔄 CHANGED

**Planned:** `PHASE-1B-DATABASE.md` references `tooling/migrations` as part of the platform's migration tooling.

**Found:** `tooling/migrations/` is a legacy rawdog-specific data migration tool containing `migrate-rawdog.ts`, `rollback.ts`, and utility libraries for migrating data between table structures (`migrate-table.ts`, `transform-row.ts`, etc.). It is NOT part of the new platform-wide migration system. The actual platform migration system lives in `packages/db/src/migrations/`.

The `tooling/migrations` package appears to be from the pre-platform codebase and was not cleaned up during the monorepo transition.

**TODO List:**
- [ ] Determine if `tooling/migrations` is still needed for any active rawdog data migration work
- [ ] If no longer needed: remove the package and unregister from `pnpm-workspace.yaml` (currently registered as `tooling/*`)
- [ ] If still needed: add a `README.md` in `tooling/migrations/` that clearly states "This is a one-time rawdog data migration tool, NOT the platform migration system. Platform migrations are in `packages/db/src/migrations/`."
- [ ] Update `CLAUDE.md` at repo root to note the distinction between `tooling/migrations` (legacy) and `packages/db/src/migrations/` (platform)

---

## Architectural Observations

### Tenant Isolation: Solid Foundation, One Critical Gap

The `withTenant()` + `createTenantCache()` + `getTenantContext()` trifecta is well-implemented and correctly follows the patterns in `TENANT-ISOLATION.md`. The `packages/db/src/request.ts` `requireTenant()` utility is clean and production-quality. The critical gap is `withPlatformContext()` — without it, super-admin cross-tenant queries have no standardized pattern, increasing the risk of developers bypassing tenant isolation in the orchestrator app.

### Migration Numbering Is a Ticking Time Bomb

The current migration system uses `name` (not `version`) as the primary key in `schema_migrations`. This means duplicate version numbers don't cause double-application (good), but they DO cause `targetVersion` filtering in rollback to silently include/exclude the wrong migrations (bad). With 13 duplicate version buckets in the tenant schema alone, the migration numbering urgently needs a one-time renumbering pass before the codebase grows further.

### `@vercel/postgres` Hard-Dependency Is a Portability Risk

The platform is named "portable" but the DB client is directly bound to Vercel's SDK. The `set_config('search_path', ...)` pattern used by `withTenant()` is standard PostgreSQL and would work with any Postgres adapter, but the `sql` export is Vercel-only. If any user wants to deploy to Railway, Supabase, or a self-hosted Postgres without going through Vercel, this is a hard blocker.

### Phase-0B Status Flag Is Misleading

`PHASE-0B-DATABASE-SETUP-UX.md` has a `> **STATUS**: ✅ COMPLETE` header but its Definition of Done checklist has every single item unchecked (`[ ]`). This is almost certainly a copy-paste error from the template, but it's dangerous — agents reading only the status header will assume this phase is complete when it demonstrably is not. The pre-commit hooks, CI migration tests, and TypeScript type generation are all absent.

### Tooling Package Namespace Collision Risk

`pnpm-workspace.yaml` registers `tooling/*` as a workspace, which includes `tooling/migrations`. If new tooling packages are added (e.g., `tooling/eslint`, `tooling/typescript`), the legacy rawdog migration scripts in `tooling/migrations` could cause confusion in `pnpm turbo build` output.

### Starters Are Placeholders, Not Functional Starters

The three starter templates have only 2 pages each (`layout.tsx` + `page.tsx`). A developer who runs `npx @cgk-platform/cli create my-brand` gets a non-functional shell with no auth, no API routes, no middleware, and no real content — while the CLI itself has a broken template path (looking in `packages/cli/src/../templates/` which doesn't exist). This is the largest UX gap for a "portable" platform.

---

## Priority Ranking

1. **🔴 CRITICAL — Duplicate migration version numbers** (Gap #2): Silent ordering ambiguity breaks rollback and status display. Renumber all migrations before further schema work. Risk: data corruption in non-obvious rollback scenarios.

2. **🔴 CRITICAL — `withPlatformContext()` missing** (Gap #1): Super-admin cross-tenant queries have no standardized isolation pattern. As the orchestrator grows, this gap invites accidental cross-tenant data exposure. Implement before any new super-admin features.

3. **🟠 HIGH — Phase-0B status flag correction and pre-commit hooks** (Gaps #3, #4): The misleading "COMPLETE" status on Phase-0B is actively misleading to agents. Pre-commit migration validation is the most impactful single change to prevent future migration quality issues.

4. **🟠 HIGH — CLI `create` template path bug** (Gap #8): `npx @cgk-platform/cli create my-brand` falls back to `createBasicStructure()` instead of using the real `starters/` directory. This is broken for the platform's primary UX touchpoint.

5. **🟡 MEDIUM — `cgk doctor` database connectivity** (Gap #4): Doctor only checks env var presence, not actual connectivity. Easy to fix, high value for first-time installers.

6. **🟡 MEDIUM — `cgk init` missing migration execution** (Gap #5): The "one-command setup" vision requires `init` to connect and run migrations. Currently requires knowing to also run `cgk setup`.

7. **🟡 MEDIUM — CI migration tests** (Gap #6): Platform cannot guarantee migrations work from a fresh clone without running them in CI.

8. **🟡 MEDIUM — Starter templates need real content** (Gap #8, continuation): After fixing the CLI template path, the starters need auth pages and working integrations to be genuinely useful.

9. **⚪ LOW — TypeScript types from schema** (Gap #7): Nice to have for type safety, but not blocking current development since manual types are comprehensive.

10. **⚪ LOW — Multi-DB adapter support** (Gap #9): Portability vision gap but acceptable for v1 if explicitly documented as Neon/Vercel Postgres only.

11. **⚪ LOW — CLI deploy/tenant:upgrade commands** (Gap #10): Convenience commands; workarounds exist via Vercel CLI directly.

12. **⚪ LOW — Deployment profile runtime enforcement** (Gap #11): Types are defined; runtime enforcement is a future operational concern.

13. **⚪ LOW — tooling/migrations cleanup** (Gap #12): Aesthetic/clarity issue, not blocking.
