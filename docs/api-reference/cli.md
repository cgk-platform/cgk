# @cgk-platform/cli

Command-line interface for the CGK platform.

## Installation

```bash
# Global installation
npm install -g @cgk-platform/cli

# Or use directly with npx
npx @cgk-platform/cli <command>
```

## Quick Reference

```bash
# Create a new brand site
npx @cgk-platform/cli create my-brand

# Initialize in existing project
npx @cgk-platform/cli init

# Check system requirements
npx @cgk-platform/cli doctor

# Run setup wizard
npx @cgk-platform/cli setup

# Database migrations
npx @cgk-platform/cli migrate
npx @cgk-platform/cli migrate --status
npx @cgk-platform/cli migrate:create add_user_preferences

# Tenant management
npx @cgk-platform/cli tenant:create my_brand
npx @cgk-platform/cli tenant:list
npx @cgk-platform/cli tenant:export rawdog -o backup.sql
npx @cgk-platform/cli tenant:import backup.sql --target new_brand

# Package updates
npx @cgk-platform/cli check-updates
npx @cgk-platform/cli update

# Changelog
npx @cgk-platform/cli changelog
```

## Commands

### create

Create a new CGK brand site from a template.

```bash
npx @cgk-platform/cli create <name> [options]
```

**Arguments:**
- `<name>` - Name of the brand site

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --template <template>` | Template to use: `basic`, `full`, `storefront-only` | `full` |
| `-d, --directory <dir>` | Directory to create the project in | `./<name>` |
| `--skip-install` | Skip installing dependencies | `false` |

**Example:**

```bash
# Create with full template
npx @cgk-platform/cli create my-brand

# Create with basic template in specific directory
npx @cgk-platform/cli create my-brand --template basic --directory ./projects/my-brand

# Create without installing dependencies
npx @cgk-platform/cli create my-brand --skip-install
```

**Output structure:**

```
my-brand/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   └── lib/
├── package.json
├── tsconfig.json
└── platform.config.ts
```

### init

Initialize CGK in an existing Next.js project.

```bash
npx @cgk-platform/cli init
```

**Interactive prompts:**
1. Brand name
2. Brand slug (URL-safe identifier)
3. Features to enable (Creator Portal, A/B Testing, Attribution, Reviews, Subscriptions)

**What it does:**
- Creates `platform.config.ts` with your configuration
- Adds CGK dependencies to `package.json`

**Example:**

```bash
cd my-existing-project
npx @cgk-platform/cli init
```

### doctor

Check system requirements and configuration.

```bash
npx @cgk-platform/cli doctor
```

**Checks performed:**
- Node.js version (20+ required)
- pnpm installation
- `POSTGRES_URL` or `DATABASE_URL` environment variable
- Redis/KV environment variables (optional)
- `JWT_SECRET` environment variable
- CGK project detection (looks for `platform.config.ts`)

**Example output:**

```
CGK Doctor - Checking system...

System Check Results:

  ✓ Node.js: v22.0.0
  ✓ pnpm: 10.0.0
  ✓ Env: POSTGRES_URL: Set
  ⚠ Env: Redis (KV): Not set
     Optional: Add Upstash via Vercel Storage for Redis cache
  ✓ Env: JWT_SECRET: Set
  ✓ CGK Project: Detected

✅ All checks passed! (4 passed, 1 warnings)
```

### setup

Run the platform setup wizard.

```bash
npx @cgk-platform/cli setup [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--database` | Setup database only |

**Setup steps:**
1. Database connection (Neon PostgreSQL)
2. Cache connection (Upstash Redis) - optional
3. Run migrations
4. Create admin user
5. Platform configuration

**Subcommand:**

```bash
# Setup only the database
npx @cgk-platform/cli setup:database
```

### migrate

Run database migrations.

```bash
npx @cgk-platform/cli migrate [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--status` | Show migration status |
| `--rollback [count]` | Rollback migrations (default: 1) |
| `--dry-run` | Preview without executing |
| `--tenant <slug>` | Run migrations for specific tenant |
| `--public-only` | Only run public schema migrations |
| `--tenant-only` | Only run tenant schema migrations (requires `--tenant`) |

**Examples:**

```bash
# Check migration status
npx @cgk-platform/cli migrate --status

# Run all pending migrations
npx @cgk-platform/cli migrate

# Run only public schema migrations
npx @cgk-platform/cli migrate --public-only

# Run migrations for specific tenant
npx @cgk-platform/cli migrate --tenant rawdog

# Preview what would run
npx @cgk-platform/cli migrate --dry-run

# Rollback last migration
npx @cgk-platform/cli migrate --rollback

# Rollback last 3 migrations
npx @cgk-platform/cli migrate --rollback 3
```

**Status output:**

```
Migration Status

  Public Schema:
    Applied:
      ✓ 001_initial_setup (2/10/2026)
      ✓ 002_add_users (2/10/2026)
    Pending:
      ○ 003_add_sessions

  Active Tenants:
    - rawdog
    - acme

  Use --tenant <slug> to see tenant-specific status
```

### migrate:create

Create a new migration file.

```bash
npx @cgk-platform/cli migrate:create <name> [options]
```

**Arguments:**
- `<name>` - Migration name (lowercase, underscores, e.g., `add_user_preferences`)

**Options:**

| Option | Description |
|--------|-------------|
| `--public` | Create public schema migration |
| `--tenant` | Create tenant schema migration (default) |

**Examples:**

```bash
# Create tenant migration (default)
npx @cgk-platform/cli migrate:create add_order_notes

# Create public migration
npx @cgk-platform/cli migrate:create add_platform_settings --public
```

**Output:**

```
✓ Created migration: 015_add_order_notes.sql
  packages/db/src/migrations/tenant/015_add_order_notes.sql

  Next steps:
    1. Edit the migration file with your SQL
    2. Run: npx @cgk-platform/cli migrate --status
    3. Run: npx @cgk-platform/cli migrate --tenant <slug>
```

The generated file includes helpful templates and comments for common patterns.

### tenant:create

Create a new tenant with isolated database schema.

```bash
npx @cgk-platform/cli tenant:create <slug> [options]
```

**Arguments:**
- `<slug>` - Tenant slug (lowercase alphanumeric + underscore)

**Options:**

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | Display name for the tenant |
| `--dry-run` | Show what would be created |

**Examples:**

```bash
# Create tenant with auto-generated name
npx @cgk-platform/cli tenant:create acme_store

# Create tenant with custom name
npx @cgk-platform/cli tenant:create acme_store --name "ACME Store"

# Preview creation
npx @cgk-platform/cli tenant:create acme_store --dry-run
```

**What it does:**
1. Creates `tenant_<slug>` database schema
2. Runs all tenant migrations
3. Creates organization record in public schema

### tenant:list

List all tenants in the platform.

```bash
npx @cgk-platform/cli tenant:list [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--status <status>` | Filter by status: `active`, `suspended`, `onboarding` |
| `--json` | Output as JSON |

**Examples:**

```bash
# List all tenants
npx @cgk-platform/cli tenant:list

# List only active tenants
npx @cgk-platform/cli tenant:list --status active

# Output as JSON (for scripting)
npx @cgk-platform/cli tenant:list --json
```

**Output:**

```
Tenants

  ● Rawdog
     Slug: rawdog
     Schema: tenant_rawdog
     Created: 2/10/2026

  ○ ACME Store
     Slug: acme_store
     Schema: tenant_acme_store
     Created: 2/15/2026

  Total: 2 tenant(s)
```

### tenant:export

Export tenant data to a SQL file.

```bash
npx @cgk-platform/cli tenant:export <slug> [options]
```

**Arguments:**
- `<slug>` - Tenant slug to export

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <file>` | Output file path | `{slug}-export-{timestamp}.sql` |
| `--data-only` | Export data only (no schema) | `false` |
| `--schema-only` | Export schema only (no data) | `false` |
| `--dry-run` | Show what would be exported | `false` |

**Examples:**

```bash
# Export full tenant (schema + data)
npx @cgk-platform/cli tenant:export rawdog

# Export to specific file
npx @cgk-platform/cli tenant:export rawdog -o backup.sql

# Export only data
npx @cgk-platform/cli tenant:export rawdog --data-only

# Preview export
npx @cgk-platform/cli tenant:export rawdog --dry-run
```

### tenant:import

Import tenant data from a SQL file.

```bash
npx @cgk-platform/cli tenant:import <file> [options]
```

**Arguments:**
- `<file>` - SQL file to import

**Options:**

| Option | Description |
|--------|-------------|
| `--target <slug>` | Target tenant slug (required) |
| `--dry-run` | Show what would be imported |
| `--yes, -y` | Skip confirmation prompt |
| `--create-tenant` | Create target tenant if it does not exist |

**Examples:**

```bash
# Import to existing tenant
npx @cgk-platform/cli tenant:import backup.sql --target new_brand

# Import and create tenant if needed
npx @cgk-platform/cli tenant:import backup.sql --target new_brand --create-tenant

# Preview import
npx @cgk-platform/cli tenant:import backup.sql --target new_brand --dry-run
```

### check-updates

Check for available package updates.

```bash
npx @cgk-platform/cli check-updates [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--channel <channel>` | Release channel: `stable`, `beta`, `canary` | `stable` |
| `--all` | Check all packages, not just @cgk-platform/* | `false` |

**Examples:**

```bash
# Check CGK packages only
npx @cgk-platform/cli check-updates

# Check all packages
npx @cgk-platform/cli check-updates --all

# Include beta versions
npx @cgk-platform/cli check-updates --channel beta
```

**Output:**

```
Updates available:

  CGK Platform Packages:
    @cgk-platform/core: 1.0.0 → 1.1.0
    @cgk-platform/db: 1.0.0 → 1.0.1

  2 packages can be updated.

  Run `npx @cgk-platform/cli update` to update packages
  Run `npx @cgk-platform/cli update --dry-run` to preview changes
```

### update

Update packages to latest versions.

```bash
npx @cgk-platform/cli update [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--dry-run` | Preview updates without applying | `false` |
| `--all` | Update all packages, not just @cgk-platform/* | `false` |
| `--yes, -y` | Skip confirmation prompt | `false` |
| `--latest` | Update to latest versions (vs wanted) | `false` |

**Examples:**

```bash
# Preview updates
npx @cgk-platform/cli update --dry-run

# Update CGK packages
npx @cgk-platform/cli update

# Update all packages without confirmation
npx @cgk-platform/cli update --all --yes

# Force latest versions (ignoring semver ranges)
npx @cgk-platform/cli update --latest
```

### changelog

View changelog for a version.

```bash
npx @cgk-platform/cli changelog [version] [options]
```

**Arguments:**
- `[version]` - Version to view (default: latest)

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--json` | Output as JSON | `false` |
| `--all` | Show all versions | `false` |
| `--count <n>` | Show last N versions | `5` |

**Examples:**

```bash
# View latest changelog
npx @cgk-platform/cli changelog

# View specific version
npx @cgk-platform/cli changelog 1.0.0

# View all changelogs
npx @cgk-platform/cli changelog --all

# Output as JSON
npx @cgk-platform/cli changelog --json
```

## Environment Variables

The CLI checks for these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` or `DATABASE_URL` | Yes | PostgreSQL connection string |
| `KV_REST_API_URL` or `UPSTASH_REDIS_REST_URL` | No | Redis/KV connection |
| `JWT_SECRET` | No* | JWT signing secret (*required for auth) |

## Project Detection

The CLI detects CGK projects by looking for `platform.config.ts` in the current directory.

```typescript
// platform.config.ts
import { defineConfig } from '@cgk-platform/core'

export default defineConfig({
  brand: {
    name: 'My Brand',
    slug: 'my-brand',
  },
  features: {
    creators: true,
    abTesting: false,
    attribution: false,
    reviews: true,
  },
  deployment: {
    profile: 'small',
  },
})
```

## Troubleshooting

### "POSTGRES_URL not set"

Add your database connection via Vercel:

```bash
# Add Neon database via Vercel
vercel link
vercel storage add

# Pull environment variables
vercel env pull
```

### "No package.json found"

The `init` command must be run from a project root with `package.json`.

### Migration fails with "relation already exists"

Use `IF NOT EXISTS` in your migrations for idempotency:

```sql
-- Good
CREATE TABLE IF NOT EXISTS my_table (...);
CREATE INDEX IF NOT EXISTS idx_name ON my_table(column);

-- Bad (fails on re-run)
CREATE TABLE my_table (...);
```

### Tenant slug validation

Tenant slugs must be:
- Lowercase letters, numbers, and underscores only
- Start with a letter
- Examples: `my_brand`, `acme_store`, `brand123`
