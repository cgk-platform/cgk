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
