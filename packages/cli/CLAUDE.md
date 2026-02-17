# @cgk-platform/cli - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

CLI tool for the CGK platform. Provides commands to create brand sites, initialize projects, run setup wizards, and manage database migrations.

---

## Quick Reference

```bash
# Create new brand site
npx @cgk-platform/cli create my-brand
npx @cgk-platform/cli create my-brand --template=basic

# Initialize in existing project
npx @cgk-platform/cli init

# Check system requirements
npx @cgk-platform/cli doctor

# Run setup wizard
npx @cgk-platform/cli setup

# Database migrations
npx @cgk-platform/cli migrate
npx @cgk-platform/cli migrate --status
npx @cgk-platform/cli migrate --rollback

# Tenant management
npx @cgk-platform/cli tenant:create my_brand
npx @cgk-platform/cli tenant:list

# Tenant export/import
npx @cgk-platform/cli tenant:export rawdog -o backup.sql
npx @cgk-platform/cli tenant:import backup.sql --target new_brand

# Check for package updates
npx @cgk-platform/cli check-updates
npx @cgk-platform/cli check-updates --all

# Update packages
npx @cgk-platform/cli update
npx @cgk-platform/cli update --dry-run
npx @cgk-platform/cli update --all --yes

# View changelog
npx @cgk-platform/cli changelog
npx @cgk-platform/cli changelog 1.0.0
```

---

## Commands

### `create <name>`

Create a new CGK brand site.

**Options:**
- `-t, --template <template>` - Template: basic, full, storefront-only (default: full)
- `-d, --directory <dir>` - Target directory
- `--skip-install` - Skip dependency installation

**Example:**
```bash
npx @cgk-platform/cli create my-brand --template=full
```

### `init`

Initialize CGK in an existing Next.js project.

**Example:**
```bash
cd existing-project
npx @cgk-platform/cli init
```

### `doctor`

Check system requirements and configuration.

**Checks:**
- Node.js version (20+ required)
- pnpm installation
- Environment variables (DATABASE_URL, JWT_SECRET, etc.)
- CGK project detection

### `setup`

Run the platform setup wizard.

**Options:**
- `--database` - Setup database only
- `--cache` - Setup cache only

**Steps:**
1. Database (Neon PostgreSQL)
2. Cache (Upstash Redis)
3. Migrations
4. Admin user creation
5. Platform configuration

### `migrate`

Run database migrations.

**Options:**
- `--status` - Show migration status
- `--rollback` - Rollback last migration
- `--dry-run` - Preview without executing

### `check-updates`

Check for available package updates.

**Options:**
- `--channel <channel>` - Release channel: stable, beta, canary (default: stable)
- `--all` - Check all packages, not just @cgk-platform/*

**Example:**
```bash
npx @cgk-platform/cli check-updates
npx @cgk-platform/cli check-updates --all
npx @cgk-platform/cli check-updates --channel beta
```

### `update`

Update packages to latest versions.

**Options:**
- `--dry-run` - Preview updates without applying them
- `--all` - Update all packages, not just @cgk-platform/*
- `--yes, -y` - Skip confirmation prompt
- `--latest` - Update to latest versions (default: wanted versions)

**Example:**
```bash
npx @cgk-platform/cli update
npx @cgk-platform/cli update --dry-run
npx @cgk-platform/cli update --all --yes
```

### `tenant:export`

Export tenant data to a SQL file.

**Arguments:**
- `<slug>` - Tenant slug to export

**Options:**
- `-o, --output <file>` - Output file path (default: `{slug}-export-{timestamp}.sql`)
- `--data-only` - Export data only (no schema)
- `--schema-only` - Export schema only (no data)
- `--dry-run` - Show what would be exported without creating file

**Example:**
```bash
npx @cgk-platform/cli tenant:export rawdog
npx @cgk-platform/cli tenant:export rawdog -o backup.sql
npx @cgk-platform/cli tenant:export rawdog --data-only --dry-run
```

### `tenant:import`

Import tenant data from a SQL file.

**Arguments:**
- `<file>` - SQL file to import

**Options:**
- `--target <slug>` - Target tenant slug (required)
- `--dry-run` - Show what would be imported without executing
- `--yes, -y` - Skip confirmation prompt
- `--create-tenant` - Create the target tenant if it does not exist

**Example:**
```bash
npx @cgk-platform/cli tenant:import backup.sql --target new_brand
npx @cgk-platform/cli tenant:import backup.sql --target new_brand --create-tenant
npx @cgk-platform/cli tenant:import backup.sql --target new_brand --dry-run
```

### `changelog`

View changelog for a version.

**Arguments:**
- `[version]` - Version to view (default: latest)

**Options:**
- `--json` - Output as JSON
- `--all` - Show all versions
- `--count <n>` - Show last N versions (default: 5)

**Example:**
```bash
npx @cgk-platform/cli changelog
npx @cgk-platform/cli changelog 1.0.0
npx @cgk-platform/cli changelog --all
npx @cgk-platform/cli changelog --json
```

---

## File Map

| File | Purpose |
|------|---------|
| `index.ts` | CLI entry point, command registration |
| `commands/create.ts` | Create new brand site |
| `commands/init.ts` | Initialize in existing project |
| `commands/doctor.ts` | System health check |
| `commands/setup.ts` | Platform setup wizard |
| `commands/migrate.ts` | Database migrations |
| `commands/migrate-create.ts` | Create new migration file |
| `commands/tenant.ts` | Tenant create/list commands |
| `commands/tenant-export.ts` | Export tenant data to SQL |
| `commands/tenant-import.ts` | Import tenant data from SQL |
| `commands/check-updates.ts` | Check for package updates |
| `commands/update.ts` | Update packages |
| `commands/changelog.ts` | View changelog |
| `commands/setup-jobs.ts` | Setup background jobs provider |

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `commander` | CLI framework |
| `inquirer` | Interactive prompts |
| `chalk` | Terminal colors |
| `ora` | Spinners |
| `fs-extra` | File operations |

---

## Adding New Commands

```typescript
// src/commands/new-command.ts
import { Command } from 'commander'

export const newCommand = new Command('new-command')
  .description('Description')
  .option('-f, --flag', 'Flag description')
  .action(async (options) => {
    // Implementation
  })

// src/index.ts
import { newCommand } from './commands/new-command.js'
program.addCommand(newCommand)
```
