# Vercel Debugging Skill

TypeScript skill for production debugging and environment variable management with Vercel CLI.

## Purpose

Streamline Vercel production debugging workflows by providing a unified interface for:

- Environment variable management (list, add, bulk pull)
- Production log viewing
- Deployment inspection
- Quick debugging workflows

## Prerequisites

- Vercel CLI installed: `npm install -g vercel`
- Authenticated with Vercel: `vercel login`
- Access to the CGK Linens team: `cgk-linens-88e79683`

## Commands

### `env:list [--app APP]`

List environment variables for all apps or a specific app.

**Examples:**

```bash
# List env vars for all apps
npx ts-node .claude/skills/vercel/index.ts env:list

# List env vars for admin app only
npx ts-node .claude/skills/vercel/index.ts env:list --app admin
```

---

### `env:add VAR_NAME VAR_VALUE [--app APP]`

Add an environment variable to all apps or a specific app. Automatically adds to production, preview, and development environments.

**Examples:**

```bash
# Add DATABASE_URL to all apps
npx ts-node .claude/skills/vercel/index.ts env:add DATABASE_URL "postgres://user:pass@host/db"

# Add SHOPIFY_API_KEY to admin app only
npx ts-node .claude/skills/vercel/index.ts env:add SHOPIFY_API_KEY "abc123" --app admin
```

**Important**: This command adds to ALL three environments (production, preview, development) automatically.

---

### `env:bulk-pull`

Pull all environment variables from Vercel to local `.env.local` files for all apps.

**Example:**

```bash
npx ts-node .claude/skills/vercel/index.ts env:bulk-pull
```

**Output:**

- `apps/admin/.env.local`
- `apps/storefront/.env.local`
- `apps/creator-portal/.env.local`
- `apps/contractor-portal/.env.local`
- `apps/orchestrator/.env.local`
- `apps/shopify-app/.env.local`
- `apps/command-center/.env.local`

---

### `logs APP [--since TIME] [--limit N]`

View production logs for a specific app.

**Examples:**

```bash
# View last 1 hour of logs (default)
npx ts-node .claude/skills/vercel/index.ts logs admin

# View last 2 hours of logs
npx ts-node .claude/skills/vercel/index.ts logs admin --since 2h

# View last 30 minutes
npx ts-node .claude/skills/vercel/index.ts logs admin --since 30m

# View last 50 log entries
npx ts-node .claude/skills/vercel/index.ts logs admin --limit 50
```

**Time format**: `Xh` (hours), `Xm` (minutes), `Xd` (days)

---

### `inspect APP`

Inspect a deployment: view recent deployments and environment variables.

**Example:**

```bash
npx ts-node .claude/skills/vercel/index.ts inspect admin
```

**Output:**

- Recent deployments
- All environment variables

---

### `quick:debug APP`

Quick debugging workflow combining env vars, logs, and deployments.

**Example:**

```bash
npx ts-node .claude/skills/vercel/index.ts quick:debug admin
```

**Output:**

1. Environment variables
2. Recent logs (last 1 hour)
3. Latest deployments

**Use case**: When investigating a production issue, this command gives you all critical information in one go.

---

## Apps

The skill works with the following CGK Platform apps:

- `admin`
- `storefront`
- `creator-portal`
- `contractor-portal`
- `orchestrator`
- `shopify-app`
- `command-center`

## Team Configuration

**Team ID**: `cgk-linens-88e79683`
**Team Name**: CGK Linens

All commands automatically use the `--scope cgk-linens-88e79683` flag.

## Common Workflows

### Debugging a Production Error

```bash
# 1. Quick debug to see env vars, logs, and deployments
npx ts-node .claude/skills/vercel/index.ts quick:debug admin

# 2. If you need more logs, expand time range
npx ts-node .claude/skills/vercel/index.ts logs admin --since 6h

# 3. Check if env vars are correct
npx ts-node .claude/skills/vercel/index.ts env:list --app admin
```

### Adding a New Environment Variable

```bash
# 1. Add to specific app
npx ts-node .claude/skills/vercel/index.ts env:add NEW_VAR "value" --app admin

# 2. Or add to all apps
npx ts-node .claude/skills/vercel/index.ts env:add NEW_VAR "value"

# 3. Pull to local for testing
npx ts-node .claude/skills/vercel/index.ts env:bulk-pull
```

### Syncing Local and Production Env Vars

```bash
# Pull all production env vars to local .env.local files
npx ts-node .claude/skills/vercel/index.ts env:bulk-pull

# Verify what's in production
npx ts-node .claude/skills/vercel/index.ts env:list
```

## Integration with Claude Agents

### Debugger Agent

The debugger agent should use this skill when investigating production issues:

```typescript
// When debugging production error
Skill({ skill: 'vercel', args: 'quick:debug admin' })

// When checking logs
Skill({ skill: 'vercel', args: 'logs admin --since 2h' })
```

### Implementer Agent

The implementer agent should use this skill when setting up environment variables:

```typescript
// Add new env var
Skill({ skill: 'vercel', args: 'env:add DATABASE_URL "postgres://..." --app admin' })

// Pull env vars for local testing
Skill({ skill: 'vercel', args: 'env:bulk-pull' })
```

## Limitations

1. **Vercel CLI required**: Must have Vercel CLI installed and authenticated
2. **Team access required**: Must have access to `cgk-linens-88e79683` team
3. **No deletion**: This skill does not support deleting env vars (use Vercel dashboard)
4. **No project creation**: This skill assumes projects already exist

## Security Notes

- **Never commit** `.env.local` files to git
- Environment variables are encrypted at rest by Vercel
- Use Vercel's secret management for sensitive values
- Audit environment variable access via Vercel dashboard

## Troubleshooting

### "Not authenticated"

Run `vercel login` and authenticate.

### "No access to team"

Contact the team owner to grant access to `cgk-linens-88e79683`.

### "Project not found"

Ensure you're in the correct directory and the app exists in Vercel.

### "Command not found: vercel"

Install Vercel CLI: `npm install -g vercel`

## See Also

- [.claude/knowledge-bases/vercel-deployment-patterns/](../knowledge-bases/vercel-deployment-patterns/) - Vercel deployment patterns and best practices
- [.claude/knowledge-bases/environment-variables-guide/](../knowledge-bases/environment-variables-guide/) - Environment variable management guide
