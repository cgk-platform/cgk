# PHASE-9D: Platform Setup Wizard

**Status**: NOT STARTED
**Duration**: 2-3 days
**Depends On**: All core phases complete
**Blocks**: Production deployment, open-source release
**Priority**: REQUIRED - Web UI provides consistent first-run experience

---

## Goal

Build a web-based setup wizard in the orchestrator app for first-run configuration. This provides a WordPress-style setup experience for new installations.

---

## Current State

**CLI Setup Exists**: `/packages/cli/src/commands/setup.ts`
- 5-step interactive wizard
- Database connection testing
- Migration execution
- Super admin creation
- Platform configuration
- **Works perfectly for technical users**

**Web UI Missing**: No `/setup` route in orchestrator
- No visual first-run experience
- No Vercel integration buttons
- Less friendly for non-technical users

---

## Architecture

```
apps/orchestrator/
├── src/
│   ├── app/
│   │   ├── setup/                    # NEW: Setup wizard
│   │   │   ├── page.tsx              # Step router
│   │   │   ├── layout.tsx            # Minimal layout (no auth)
│   │   │   └── components/
│   │   │       ├── step-indicator.tsx
│   │   │       ├── database-step.tsx
│   │   │       ├── cache-step.tsx
│   │   │       ├── storage-step.tsx
│   │   │       ├── migrations-step.tsx
│   │   │       ├── admin-step.tsx
│   │   │       ├── config-step.tsx
│   │   │       └── complete-step.tsx
│   │   │
│   │   └── api/
│   │       └── setup/                # NEW: Setup API routes
│   │           ├── status/route.ts
│   │           ├── database/route.ts
│   │           ├── cache/route.ts
│   │           ├── storage/route.ts
│   │           ├── migrate/route.ts
│   │           ├── admin/route.ts
│   │           └── config/route.ts
│   │
│   ├── lib/
│   │   └── setup-detection.ts        # NEW: Fresh install detection
│   │
│   └── middleware.ts                 # UPDATE: Add setup redirect
```

---

## Implementation Tasks

### Task 1: Fresh Install Detection

```typescript
// apps/orchestrator/src/lib/setup-detection.ts

import { sql } from '@cgk-platform/db'

export interface SetupStatus {
  isConfigured: boolean
  steps: {
    database: boolean
    cache: boolean
    storage: boolean
    migrations: boolean
    admin: boolean
    config: boolean
  }
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const steps = {
    database: false,
    cache: false,
    storage: false,
    migrations: false,
    admin: false,
    config: false,
  }

  // Check database
  if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    try {
      await sql`SELECT 1`
      steps.database = true
    } catch {
      // Database not connected
    }
  }

  // Check cache
  if (process.env.KV_REST_API_URL || process.env.REDIS_URL) {
    steps.cache = true
  }

  // Check storage (optional)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    steps.storage = true
  }

  // Check migrations
  if (steps.database) {
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM public.schema_migrations
      `
      steps.migrations = (result.rows[0]?.count ?? 0) > 0
    } catch {
      // Migrations not run
    }
  }

  // Check super admin exists
  if (steps.migrations) {
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM public.users
        WHERE role = 'super_admin' AND status = 'active'
      `
      steps.admin = (result.rows[0]?.count ?? 0) > 0
    } catch {
      // No admin
    }
  }

  // Check platform config
  if (steps.migrations) {
    try {
      const result = await sql`
        SELECT value FROM public.platform_config
        WHERE key = 'setup'
      `
      const setup = result.rows[0]?.value
      steps.config = setup?.completed === true
    } catch {
      // No config
    }
  }

  return {
    isConfigured: Object.values(steps).every(Boolean),
    steps,
  }
}

export async function isPlatformConfigured(): Promise<boolean> {
  const status = await getSetupStatus()
  return status.isConfigured
}
```

---

### Task 2: Update Middleware

```typescript
// apps/orchestrator/src/middleware.ts

import { NextResponse, type NextRequest } from 'next/server'
import { isPlatformConfigured } from './lib/setup-detection'

const STATIC_PATHS = ['/_next', '/favicon.ico', '/api/health']
const PUBLIC_PATHS = [
  '/login',
  '/mfa-challenge',
  '/unauthorized',
  '/setup',        // ADD
  '/api/setup',    // ADD
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets
  if (STATIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check if setup is needed (for non-setup routes)
  if (!pathname.startsWith('/setup') && !pathname.startsWith('/api/setup')) {
    try {
      const isConfigured = await isPlatformConfigured()
      if (!isConfigured) {
        return NextResponse.redirect(new URL('/setup', request.url))
      }
    } catch {
      // If we can't check, redirect to setup
      return NextResponse.redirect(new URL('/setup', request.url))
    }
  }

  // ... rest of existing middleware
}
```

---

### Task 3: Setup Page Container

```typescript
// apps/orchestrator/src/app/setup/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StepIndicator } from './components/step-indicator'
import { DatabaseStep } from './components/database-step'
import { CacheStep } from './components/cache-step'
import { StorageStep } from './components/storage-step'
import { MigrationsStep } from './components/migrations-step'
import { AdminStep } from './components/admin-step'
import { ConfigStep } from './components/config-step'
import { CompleteStep } from './components/complete-step'

const STEPS = [
  { id: 'database', label: 'Database', component: DatabaseStep },
  { id: 'cache', label: 'Cache', component: CacheStep },
  { id: 'storage', label: 'Storage', component: StorageStep, optional: true },
  { id: 'migrations', label: 'Migrations', component: MigrationsStep },
  { id: 'admin', label: 'Admin User', component: AdminStep },
  { id: 'config', label: 'Configuration', component: ConfigStep },
  { id: 'complete', label: 'Complete', component: CompleteStep },
]

export default function SetupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStatus, setStepStatus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Check current setup status on mount
    fetch('/api/setup/status')
      .then(res => res.json())
      .then(data => {
        if (data.isConfigured) {
          router.push('/')
          return
        }
        setStepStatus(data.steps)
        // Find first incomplete step
        const firstIncomplete = STEPS.findIndex(
          s => !data.steps[s.id] && !s.optional
        )
        if (firstIncomplete !== -1) {
          setCurrentStep(firstIncomplete)
        }
      })
  }, [router])

  const CurrentStepComponent = STEPS[currentStep].component

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-bold mb-2">Platform Setup</h1>
        <p className="text-zinc-400 mb-8">
          Configure your CGK platform in a few steps.
        </p>

        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          stepStatus={stepStatus}
        />

        <div className="mt-8 bg-zinc-900 rounded-lg p-6">
          <CurrentStepComponent
            onComplete={() => {
              setStepStatus(prev => ({
                ...prev,
                [STEPS[currentStep].id]: true,
              }))
              handleNext()
            }}
            onBack={handleBack}
            isFirst={currentStep === 0}
            isLast={currentStep === STEPS.length - 1}
          />
        </div>
      </div>
    </div>
  )
}
```

---

### Task 4: Setup Layout (No Auth)

```typescript
// apps/orchestrator/src/app/setup/layout.tsx

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950">
        {children}
      </body>
    </html>
  )
}
```

---

### Task 5: Setup API Routes

```typescript
// apps/orchestrator/src/app/api/setup/status/route.ts

import { NextResponse } from 'next/server'
import { getSetupStatus } from '@/lib/setup-detection'

export async function GET() {
  const status = await getSetupStatus()
  return NextResponse.json(status)
}
```

```typescript
// apps/orchestrator/src/app/api/setup/database/route.ts

import { NextResponse } from 'next/server'
import { sql } from '@cgk-platform/db'

export async function POST(request: Request) {
  const { connectionString } = await request.json()

  try {
    // Test connection (would need to handle dynamic connection)
    await sql`SELECT 1`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 400 }
    )
  }
}
```

```typescript
// apps/orchestrator/src/app/api/setup/migrate/route.ts

import { NextResponse } from 'next/server'
import { runPublicMigrations, runTenantTemplateMigrations } from '@cgk-platform/db/migrations'

export async function POST() {
  try {
    // Run public migrations
    await runPublicMigrations()

    // Run tenant template migrations
    await runTenantTemplateMigrations()

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
```

```typescript
// apps/orchestrator/src/app/api/setup/admin/route.ts

import { NextResponse } from 'next/server'
import { sql } from '@cgk-platform/db'
import { hashPassword } from '@cgk-platform/auth'

export async function POST(request: Request) {
  const { email, password, name } = await request.json()

  try {
    const passwordHash = await hashPassword(password)

    await sql`
      INSERT INTO public.users (id, email, password_hash, name, role, status, created_at)
      VALUES (gen_random_uuid(), ${email}, ${passwordHash}, ${name}, 'super_admin', 'active', NOW())
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
```

```typescript
// apps/orchestrator/src/app/api/setup/config/route.ts

import { NextResponse } from 'next/server'
import { sql } from '@cgk-platform/db'

export async function POST(request: Request) {
  const { platformName } = await request.json()

  try {
    await sql`
      INSERT INTO public.platform_config (key, value, created_at)
      VALUES
        ('setup', ${JSON.stringify({ completed: true, date: new Date().toISOString() })}, NOW()),
        ('platform_name', ${JSON.stringify(platformName)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
```

---

## Verification Checklist

- [ ] Fresh install redirects to `/setup`
- [ ] Already-configured install goes to dashboard
- [ ] Step 1: Database connection test works
- [ ] Step 2: Cache connection test works
- [ ] Step 3: Storage (optional) can be skipped
- [ ] Step 4: Migrations run successfully with progress
- [ ] Step 5: Super admin created and can login
- [ ] Step 6: Platform config saved
- [ ] Step 7: Redirects to dashboard

---

## UI/UX Requirements

- Dark theme matching orchestrator
- Clear progress indicator
- Vercel integration buttons (optional)
- Error handling with helpful messages
- Skip option for optional steps
- Back button on all steps
- Success animations on completion

---

## Notes

- **REQUIRED** for 100% feature parity
- Web UI provides consistent experience across all deployment types
- CLI setup (`npx @cgk-platform/cli setup`) remains available as fallback
- WordPress-style first-run experience for all users
- Estimated effort: 2-3 days

---

*Last Updated: 2026-02-13*
