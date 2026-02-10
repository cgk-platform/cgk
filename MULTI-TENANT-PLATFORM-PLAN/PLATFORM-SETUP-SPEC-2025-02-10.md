# Platform Setup Specification (First-Run Wizard)

**Created**: 2025-02-10
**Status**: Design Complete
**Purpose**: WordPress-style first-run installation wizard for platform provisioning

---

## Overview

When someone clones the platform repo and runs it for the first time, they need a guided setup experience that:
1. Detects fresh install (no database configured)
2. Walks through service provisioning (Neon, Upstash, Vercel)
3. Creates the first super-admin user
4. Gets them into the orchestrator dashboard

This is **NOT** brand onboarding (Phase 2PO) - this is the platform-level setup that happens once before any brands exist.

---

## Two Flows: Vercel Deploy vs Local Development

### Flow A: Vercel Deploy Button (Recommended)

The easiest path - one-click deploy that auto-provisions everything:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=...)
```

**What happens:**
1. User clicks "Deploy with Vercel"
2. Vercel clones the repo to their account
3. **Vercel Integrations** auto-provision:
   - **Neon PostgreSQL** (adds `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`)
   - **Upstash Redis** (adds `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
   - **Vercel Blob** (adds `BLOB_READ_WRITE_TOKEN`)
4. User is prompted for remaining required vars in Vercel UI
5. Deploy completes
6. User visits app URL → Platform Setup Wizard (Step 2+)

### Flow B: Local Development / Manual Setup

For developers who want full control:

```bash
# Clone the repo
git clone https://github.com/cgk/platform.git my-platform
cd my-platform

# Install dependencies
pnpm install

# Run setup wizard (CLI-based)
npx @cgk/cli setup

# OR start dev server and use web-based wizard
pnpm dev
# Visit http://localhost:3005 → redirects to /setup
```

---

## Platform Setup Wizard (Web-Based)

### Detection: Is This a Fresh Install?

```typescript
// apps/orchestrator/src/middleware.ts

export async function middleware(request: NextRequest) {
  // Check if platform is configured
  const isConfigured = await isPlatformConfigured()

  if (!isConfigured) {
    // Redirect all routes to /setup except /setup itself and /api/setup/*
    if (!request.nextUrl.pathname.startsWith('/setup')) {
      return NextResponse.redirect(new URL('/setup', request.url))
    }
  }

  // ... rest of middleware
}

async function isPlatformConfigured(): Promise<boolean> {
  // Check 1: Required env vars exist
  const hasRequiredEnvVars = Boolean(
    process.env.POSTGRES_URL &&
    process.env.UPSTASH_REDIS_REST_URL
  )

  if (!hasRequiredEnvVars) return false

  // Check 2: Database has been initialized (platform_config table exists)
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'platform_config'
      )
    `
    if (!result.rows[0]?.exists) return false

    // Check 3: At least one super admin exists
    const admins = await sql`
      SELECT COUNT(*) FROM public.users WHERE role = 'super_admin'
    `
    return admins.rows[0]?.count > 0
  } catch {
    return false
  }
}
```

---

## Setup Wizard Steps

### Step Overview

| Step | Name | Auto-Detected | Description |
|------|------|---------------|-------------|
| 1 | Database | Via Vercel/env | Connect or provision Neon PostgreSQL |
| 2 | Cache | Via Vercel/env | Connect or provision Upstash Redis |
| 3 | File Storage | Via Vercel/env | Connect Vercel Blob (optional) |
| 4 | Run Migrations | Automatic | Initialize database schema |
| 5 | Create Admin | Required | Create first super-admin user |
| 6 | Platform Config | Required | Platform name, domain, defaults |
| 7 | Complete | — | Redirect to orchestrator dashboard |

### Smart Detection: Skip Configured Services

```typescript
interface SetupState {
  database: 'not_configured' | 'env_detected' | 'configured' | 'error'
  cache: 'not_configured' | 'env_detected' | 'configured' | 'error'
  storage: 'not_configured' | 'env_detected' | 'configured' | 'optional'
  migrations: 'pending' | 'running' | 'complete' | 'error'
  admin: 'not_created' | 'created'
  platform: 'not_configured' | 'configured'
}

// On load, detect what's already configured
async function detectSetupState(): Promise<SetupState> {
  return {
    database: process.env.POSTGRES_URL
      ? await testDatabaseConnection()
      : 'not_configured',
    cache: process.env.UPSTASH_REDIS_REST_URL
      ? await testRedisConnection()
      : 'not_configured',
    storage: process.env.BLOB_READ_WRITE_TOKEN
      ? 'env_detected'
      : 'optional',
    migrations: await checkMigrationStatus(),
    admin: await checkAdminExists(),
    platform: await checkPlatformConfig(),
  }
}
```

---

## Step 1: Database Connection

### UI States

**State A: Not Configured**
```
┌────────────────────────────────────────────────────┐
│  Database Connection                               │
│                                                    │
│  Choose how to set up your database:              │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ 🚀 Provision via Vercel (Recommended)        │ │
│  │    Automatically creates Neon PostgreSQL     │ │
│  │    and adds environment variables            │ │
│  │                                              │ │
│  │    [Connect with Vercel]                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ 🔧 Manual Configuration                      │ │
│  │    Enter your own PostgreSQL connection URL  │ │
│  │                                              │ │
│  │    Connection URL:                           │ │
│  │    [postgresql://user:pass@host/db        ]  │ │
│  │                                              │ │
│  │    [Test Connection]  [Save]                 │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

**State B: Auto-Detected (via env)**
```
┌────────────────────────────────────────────────────┐
│  ✅ Database Connection                            │
│                                                    │
│  PostgreSQL database detected from environment:    │
│                                                    │
│  Host: ep-cool-frost-123456.us-east-2.aws.neon.tech│
│  Database: neondb                                  │
│  Status: ✓ Connected                              │
│                                                    │
│  [Test Connection]     [Continue →]                │
└────────────────────────────────────────────────────┘
```

### Vercel Integration Flow

When user clicks "Connect with Vercel":

```typescript
// apps/orchestrator/src/app/api/setup/vercel-integration/route.ts

export async function POST(req: Request) {
  const { integration } = await req.json() // 'neon' | 'upstash' | 'blob'

  // Generate Vercel integration URL
  // This opens Vercel's integration marketplace in a popup
  const integrationUrl = getVercelIntegrationUrl(integration)

  return Response.json({
    url: integrationUrl,
    // After integration completes, Vercel will add env vars
    // User needs to restart the app or we detect via API
  })
}

function getVercelIntegrationUrl(integration: string): string {
  const baseUrl = 'https://vercel.com/integrations'

  switch (integration) {
    case 'neon':
      return `${baseUrl}/neon/new`
    case 'upstash':
      return `${baseUrl}/upstash/new`
    case 'blob':
      return `${baseUrl}/blob/new`
    default:
      throw new Error(`Unknown integration: ${integration}`)
  }
}
```

---

## Step 2: Cache Connection (Redis)

Similar to Step 1 but for Upstash Redis:

```
┌────────────────────────────────────────────────────┐
│  Cache Connection (Redis)                          │
│                                                    │
│  Redis is used for:                               │
│  • Session storage                                │
│  • Rate limiting                                  │
│  • Feature flag caching                           │
│  • Real-time pub/sub                              │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ 🚀 Provision via Vercel (Recommended)        │ │
│  │    Automatically creates Upstash Redis       │ │
│  │                                              │ │
│  │    [Connect with Vercel]                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ 🔧 Manual Configuration                      │ │
│  │                                              │ │
│  │    REST URL:                                 │ │
│  │    [https://us1-merry-cat-12345.upstash...] │ │
│  │                                              │ │
│  │    REST Token:                               │ │
│  │    [AXxx...                               ]  │ │
│  │                                              │ │
│  │    [Test Connection]  [Save]                 │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

---

## Step 3: File Storage (Optional)

```
┌────────────────────────────────────────────────────┐
│  File Storage                                      │
│                                                    │
│  File storage is used for:                        │
│  • Brand logos and assets                         │
│  • Creator content uploads                        │
│  • Document storage                               │
│                                                    │
│  ⚠️ Optional - You can configure this later      │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ 🚀 Vercel Blob (Recommended)                 │ │
│  │    S3-compatible, automatic CDN              │ │
│  │                                              │ │
│  │    [Connect with Vercel]                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  [Skip for Now]                    [Continue →]   │
└────────────────────────────────────────────────────┘
```

---

## Step 4: Run Migrations

Automatic step - runs database migrations:

```
┌────────────────────────────────────────────────────┐
│  Initializing Database                             │
│                                                    │
│  ████████████████████░░░░░░░░░░  65%              │
│                                                    │
│  ✓ Created public schema                          │
│  ✓ Created platform_config table                  │
│  ✓ Created organizations table                    │
│  ✓ Created users table                            │
│  ◐ Creating feature_flags table...               │
│  ○ Creating health_monitors table                 │
│  ○ Creating audit_logs table                      │
│                                                    │
│  This may take a moment...                        │
└────────────────────────────────────────────────────┘
```

### Migration API

```typescript
// apps/orchestrator/src/app/api/setup/migrate/route.ts

export async function POST() {
  const migrations = [
    { name: 'public_schema', fn: createPublicSchema },
    { name: 'platform_config', fn: createPlatformConfigTable },
    { name: 'organizations', fn: createOrganizationsTable },
    { name: 'users', fn: createUsersTable },
    { name: 'feature_flags', fn: createFeatureFlagsTable },
    { name: 'health_monitors', fn: createHealthMonitorsTable },
    { name: 'audit_logs', fn: createAuditLogsTable },
    // ... more migrations
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (const migration of migrations) {
        controller.enqueue(encoder.encode(
          JSON.stringify({ status: 'running', name: migration.name }) + '\n'
        ))

        try {
          await migration.fn()
          controller.enqueue(encoder.encode(
            JSON.stringify({ status: 'complete', name: migration.name }) + '\n'
          ))
        } catch (error) {
          controller.enqueue(encoder.encode(
            JSON.stringify({ status: 'error', name: migration.name, error: error.message }) + '\n'
          ))
          controller.close()
          return
        }
      }

      controller.enqueue(encoder.encode(
        JSON.stringify({ status: 'all_complete' }) + '\n'
      ))
      controller.close()
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  })
}
```

---

## Step 5: Create Super Admin

First user creation - this person will manage the entire platform:

```
┌────────────────────────────────────────────────────┐
│  Create Platform Administrator                     │
│                                                    │
│  This will be the first super admin with full     │
│  access to all brands and platform settings.      │
│                                                    │
│  Full Name:                                        │
│  [                                              ]  │
│                                                    │
│  Email:                                            │
│  [                                              ]  │
│                                                    │
│  Password:                                         │
│  [                                              ]  │
│                                                    │
│  Confirm Password:                                 │
│  [                                              ]  │
│                                                    │
│  □ Send me platform update notifications          │
│                                                    │
│                             [Create Admin →]       │
└────────────────────────────────────────────────────┘
```

### Admin Creation API

```typescript
// apps/orchestrator/src/app/api/setup/admin/route.ts

export async function POST(req: Request) {
  // Verify we're in setup mode
  const isConfigured = await isPlatformConfigured()
  if (isConfigured) {
    return Response.json(
      { error: 'Platform already configured' },
      { status: 400 }
    )
  }

  const { name, email, password } = await req.json()

  // Validate
  if (!name || !email || !password) {
    return Response.json({ error: 'All fields required' }, { status: 400 })
  }

  if (password.length < 12) {
    return Response.json({ error: 'Password must be at least 12 characters' }, { status: 400 })
  }

  // Hash password
  const passwordHash = await hashPassword(password)

  // Create super admin
  const [user] = await sql`
    INSERT INTO public.users (
      email,
      name,
      password_hash,
      role,
      email_verified,
      created_at
    ) VALUES (
      ${email},
      ${name},
      ${passwordHash},
      'super_admin',
      true,
      NOW()
    )
    RETURNING id, email, name, role
  `

  // Create session
  const session = await createSession(user.id)

  return Response.json({
    user,
    session,
    redirectTo: '/setup/platform'
  })
}
```

---

## Step 6: Platform Configuration

Basic platform settings:

```
┌────────────────────────────────────────────────────┐
│  Platform Configuration                            │
│                                                    │
│  Platform Name:                                    │
│  [My Commerce Platform                          ]  │
│                                                    │
│  Platform Domain:                                  │
│  [platform.mycompany.com                        ]  │
│                                                    │
│  Default Timezone:                                 │
│  [America/New_York                           ▼ ]  │
│                                                    │
│  Default Currency:                                 │
│  [USD - US Dollar                            ▼ ]  │
│                                                    │
│  ── Feature Defaults for New Brands ──            │
│                                                    │
│  ☑ Creator Portal                                 │
│  ☑ Reviews System                                 │
│  ☑ Marketing Attribution                          │
│  ☐ A/B Testing                                    │
│  ☐ Subscriptions                                  │
│  ☑ MCP Integration                                │
│                                                    │
│                        [Complete Setup →]          │
└────────────────────────────────────────────────────┘
```

### Platform Config Schema

```typescript
interface PlatformConfig {
  name: string
  domain: string
  timezone: string
  currency: string

  defaultFeatures: {
    creators: boolean
    reviews: boolean
    attribution: boolean
    abTesting: boolean
    subscriptions: boolean
    mcp: boolean
  }

  setup: {
    completedAt: string
    completedBy: string  // user ID
    version: string      // platform version
  }
}
```

---

## Step 7: Complete

```
┌────────────────────────────────────────────────────┐
│                                                    │
│            🎉 Setup Complete!                      │
│                                                    │
│  Your platform is ready to go.                    │
│                                                    │
│  ── What's Next ──                                │
│                                                    │
│  1. Create your first brand                       │
│     → Walk through the 9-step brand wizard        │
│                                                    │
│  2. Configure platform settings                   │
│     → Health monitors, feature flags, etc.        │
│                                                    │
│  3. Invite team members                           │
│     → Add other super admins                      │
│                                                    │
│                                                    │
│    [Go to Dashboard]    [Create First Brand]      │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## CLI Alternative: `npx @cgk/cli setup`

For developers who prefer command-line:

```bash
$ npx @cgk/cli setup

  ╭─────────────────────────────────────────────────╮
  │                                                 │
  │   🚀 CGK Platform Setup                         │
  │                                                 │
  ╰─────────────────────────────────────────────────╯

  Checking environment...

  ✗ POSTGRES_URL not found
  ✗ UPSTASH_REDIS_REST_URL not found
  ✓ BLOB_READ_WRITE_TOKEN found

  How would you like to configure the database?

  ❯ Provision via Vercel (opens browser)
    Enter connection URL manually
    Use local PostgreSQL (docker-compose)

  [Press Enter to select]
```

### CLI Commands

```bash
# Full interactive setup
npx @cgk/cli setup

# Provision specific services
npx @cgk/cli setup --database
npx @cgk/cli setup --cache
npx @cgk/cli setup --storage

# Check configuration status
npx @cgk/cli doctor

# Output:
#   ✓ Database: Connected (Neon PostgreSQL)
#   ✓ Cache: Connected (Upstash Redis)
#   ✓ Storage: Connected (Vercel Blob)
#   ✓ Migrations: Up to date (v1.2.3)
#   ✓ Admin: 1 super admin configured
#   ✓ Platform: Configured

# Reset setup (destructive!)
npx @cgk/cli setup --reset
```

---

## Environment Variables

### Required for Setup

```bash
# Minimum required to complete setup:
# (Can be added during wizard or pre-configured)

# Database (Step 1)
POSTGRES_URL=postgresql://user:pass@host/db

# Cache (Step 2)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Optional but recommended
BLOB_READ_WRITE_TOKEN=...
```

### Auto-Populated by Vercel Integrations

When using Vercel integrations, these are automatically added:

```bash
# Neon Integration adds:
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=

# Upstash Integration adds:
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Vercel Blob Integration adds:
BLOB_READ_WRITE_TOKEN=
```

---

## Database Schema: Platform Config

```sql
-- Stores platform-level configuration
CREATE TABLE public.platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial config inserted during Step 6
INSERT INTO public.platform_config (key, value) VALUES
  ('setup', '{"completedAt": "2025-02-10T...", "completedBy": "user-id", "version": "1.0.0"}'),
  ('platform', '{"name": "My Platform", "domain": "platform.example.com", ...}'),
  ('defaults', '{"timezone": "America/New_York", "currency": "USD", ...}'),
  ('features', '{"creators": true, "reviews": true, ...}');
```

---

## Vercel Deploy Button Configuration

For one-click deployment, create `vercel.json`:

```json
{
  "buildCommand": "pnpm build",
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "env": {
    "NEXT_PUBLIC_APP_URL": "@app_url"
  },
  "integrations": [
    {
      "id": "oac_VFG4OfWCKBCCB3n9M7J8x",
      "name": "Neon",
      "required": true
    },
    {
      "id": "oac_V3R1GIpkoJsvxzLfgJ12",
      "name": "Upstash",
      "required": true
    },
    {
      "id": "oac_ZV3R1GIpkoJsvxzLfgJ13",
      "name": "Vercel Blob",
      "required": false
    }
  ]
}
```

---

## Security Considerations

1. **Setup routes only accessible during setup mode**
   - Once `platform_config.setup` exists, `/setup/*` returns 404
   - Prevents re-running setup on production

2. **Rate limiting on setup APIs**
   - Prevent brute force during admin creation
   - 5 attempts per IP per hour

3. **HTTPS only for production**
   - Redirect HTTP to HTTPS
   - Set secure cookie flags

4. **Audit logging**
   - Log all setup actions
   - Log first admin creation

---

## Relationship to Other Phases

| Phase | Relationship |
|-------|--------------|
| **Phase 0** | CLI commands wrap this wizard (`npx @cgk/cli setup`) |
| **Phase 1B** | Database schema from this spec is foundation |
| **Phase 2SA** | Super admin created here accesses orchestrator |
| **Phase 2PO** | Brand onboarding assumes platform setup complete |

---

## Success Criteria

- [ ] Fresh install redirects to `/setup` automatically
- [ ] Vercel integrations provision services with one click
- [ ] Manual configuration works for non-Vercel deployments
- [ ] Migrations run automatically and show progress
- [ ] First super admin can be created
- [ ] Platform config saves correctly
- [ ] After setup, normal app routes work
- [ ] CLI `npx @cgk/cli setup` mirrors web wizard
- [ ] `npx @cgk/cli doctor` shows configuration status
- [ ] Setup cannot be re-run after completion (security)

---

## Definition of Done

- [ ] `/setup` page with 7-step wizard
- [ ] Vercel integration buttons work
- [ ] Manual database/cache configuration works
- [ ] Migration runner with streaming progress
- [ ] Admin creation with password validation
- [ ] Platform config form and storage
- [ ] Redirect to dashboard after completion
- [ ] CLI setup command implemented
- [ ] Doctor command implemented
- [ ] Security: Setup locked after completion
