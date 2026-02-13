# Portability & Distribution Architecture

**Created**: 2025-02-10
**Status**: Design Complete
**Purpose**: Make the platform portable, installable, and updateable like WordPress or Shopify themes

---

## Design Goals

1. **Clone and Deploy**: Users can clone a repo and have a working platform in under an hour
2. **Updateable Core**: Platform updates don't break customizations
3. **AI-First Development**: Documentation and logging optimized for AI coding tools
4. **Scalable from 1 to 1000+**: Same codebase works for solo entrepreneur or enterprise

---

## Development vs Production

### Private Development Phase

During development, the repository can remain private:

```yaml
# GitHub repo settings
Visibility: Private
Branch protection: main (require PR reviews)
Secrets: Store npm token for eventual publishing
```

**Private npm packages** (if needed before public release):
- Use GitHub Packages with private registry
- Or keep packages unpublished and use workspace references

```json
{
  "dependencies": {
    "@cgk-platform/db": "workspace:*"  // Local reference, no npm
  }
}
```

### Transition to Public

When ready to open-source:
1. Audit for secrets/credentials
2. Add LICENSE file (MIT recommended)
3. Set up npm publishing workflow
4. Change GitHub visibility to Public
5. Publish initial version to npm

---

## Repository Structure

### Recommended: Hybrid Monorepo + Published Packages

```
cgk/                                 # Main repo (open source)
├── package.json                     # Workspace root
├── turbo.json                       # Turborepo config
├── pnpm-workspace.yaml
├── CHANGELOG.md                     # Auto-generated from changesets
├── LICENSE                          # MIT or similar
│
├── packages/                        # PUBLISHED TO NPM (@cgk-platform/*)
│   ├── core/                        # Types, utilities, config schemas
│   │   ├── CLAUDE.md               # AI context for this package
│   │   ├── package.json
│   │   └── src/
│   ├── db/                          # Database client, tenant utilities
│   ├── auth/                        # JWT, sessions, middleware
│   ├── ui/                          # shadcn/ui components
│   ├── commerce/                    # **Commerce provider abstraction (Shopify + Custom)**
│   ├── shopify/                     # Shopify Admin/Storefront clients
│   ├── payments/                    # Stripe + Wise abstraction (payouts)
│   ├── jobs/                        # Background job abstraction (Inngest)
│   ├── mcp/                         # MCP transport utilities
│   ├── analytics/                   # GA4, attribution
│   ├── commerce-hooks/              # Headless React hooks
│   ├── commerce-primitives/         # Unstyled UI primitives
│   ├── logging/                     # Structured logging
│   ├── cli/                         # Setup and update CLI
│   └── config/                      # ESLint, TypeScript, Tailwind presets
│
├── apps/                            # REFERENCE IMPLEMENTATIONS
│   ├── orchestrator/                # Super Admin Dashboard
│   ├── admin/                       # White-label Admin template
│   ├── storefront/                  # Headless Shopify template
│   ├── creator-portal/              # Creator Portal template
│   └── mcp-server/                  # MCP Server template
│
├── starters/                        # BRAND SITE STARTER KITS
│   ├── basic/                       # Minimal setup (admin only)
│   ├── full/                        # Complete feature set
│   └── storefront-only/             # Just the headless storefront
│
├── docs/                            # Documentation
│   ├── getting-started/
│   ├── guides/
│   ├── api-reference/
│   └── architecture/
│
└── .changeset/                      # Changesets for versioning
```

### Package Naming Convention

All packages are published under a configurable namespace. The namespace is defined in the root `package.json`:

```json
{
  "name": "@cgk-platform/monorepo",
  "config": {
    "packageNamespace": "@cgk"
  }
}
```

**Package list**:

```
@cgk-platform/core           # Core utilities, types
@cgk-platform/db             # Database client
@cgk-platform/auth           # Authentication
@cgk-platform/ui             # UI components
@cgk-platform/commerce       # **Commerce provider abstraction (Shopify + Custom)**
@cgk-platform/shopify        # Shopify client (used by commerce provider)
@cgk-platform/payments       # Payment providers (Stripe + Wise for payouts)
@cgk-platform/jobs           # Background jobs
@cgk-platform/mcp            # MCP server utilities
@cgk-platform/analytics      # Analytics & attribution
@cgk-platform/commerce-hooks # Headless commerce hooks
@cgk-platform/logging        # Structured logging
@cgk-platform/cli            # CLI tool
@cgk-platform/config         # Shared configs
```

**Note**: During development, packages can remain unpublished. Publishing to npm only required when you want external brand sites to consume the packages.

---

## Versioning Strategy

### Semantic Versioning with Lockstep

All `@cgk-platform/*` packages share the same version number (like React or Next.js):

```json
{
  "dependencies": {
    "@cgk-platform/core": "2.4.1",
    "@cgk-platform/db": "2.4.1",
    "@cgk-platform/auth": "2.4.1"
  }
}
```

> **Note**: Replace `@cgk` with your chosen namespace throughout.

### Version Policy

```markdown
MAJOR (X.0.0) - Breaking Changes
- Database schema changes requiring migrations
- Removed or renamed exports
- Changes to required environment variables
- Auth/session structure changes

MINOR (0.X.0) - New Features
- New package exports
- New components or utilities
- New optional configuration options
- Non-breaking database additions

PATCH (0.0.X) - Bug Fixes
- Bug fixes
- Performance improvements
- Security patches
```

### Release Channels

| Channel | Purpose | npm Tag | Update Frequency |
|---------|---------|---------|-----------------|
| `stable` | Production-ready | `latest` | Monthly |
| `beta` | Feature-complete testing | `beta` | Weekly |
| `canary` | Daily builds from main | `canary` | Daily |
| `next` | Experimental features | `next` | As needed |

### Compatibility Matrix

| Platform | Node.js | PostgreSQL | Shopify API | Inngest |
|----------|---------|------------|-------------|---------|
| 3.x | >= 20 | >= 15 | 2025-01 | >= 3.0 |
| 2.x | >= 18 | >= 14 | 2024-10 | >= 2.0 |
| 1.x | >= 18 | >= 13 | 2024-04 | >= 1.0 |

---

## CLI Tool

### `@cgk-platform/cli` Commands

```bash
# === PROJECT CREATION ===
npx @cgk-platform/cli create my-brand          # Create new brand site
npx @cgk-platform/cli create my-brand --template=basic
npx @cgk-platform/cli create my-brand --template=full
npx @cgk-platform/cli init                      # Initialize in existing project

# === HEALTH & DIAGNOSTICS ===
npx @cgk-platform/cli doctor                    # Check system requirements
npx @cgk-platform/cli status                    # Show platform status

# === UPDATES ===
npx @cgk-platform/cli check-updates             # Check for new versions
npx @cgk-platform/cli update                    # Update all packages
npx @cgk-platform/cli update --channel=beta     # Update from beta channel
npx @cgk-platform/cli changelog 2.4.0           # View changelog

# === DATABASE ===
npx @cgk-platform/cli migrate                   # Run pending migrations
npx @cgk-platform/cli migrate --status          # Check migration status
npx @cgk-platform/cli migrate --rollback        # Rollback last migration
npx @cgk-platform/cli migrate:create add-foo    # Create new migration

# === TENANT MANAGEMENT ===
npx @cgk-platform/cli tenant:create             # Interactive tenant setup
npx @cgk-platform/cli tenant:list               # List all tenants
npx @cgk-platform/cli tenant:export rawdog      # Export tenant data
npx @cgk-platform/cli tenant:import backup.sql  # Import tenant data

# === DEVELOPMENT ===
npx @cgk-platform/cli dev                       # Start dev server
npx @cgk-platform/cli build                     # Build for production
npx @cgk-platform/cli typecheck                 # Run TypeScript checks

# === DEPLOYMENT ===
npx @cgk-platform/cli deploy                    # Deploy to Vercel
npx @cgk-platform/cli deploy --preview          # Preview deployment
npx @cgk-platform/cli env:push                  # Push env vars to Vercel
```

---

## Update Mechanism

### How Brand Sites Receive Updates

**Standard npm/pnpm updates:**

```bash
# Check for updates
npx @cgk-platform/cli check-updates

# Update all platform packages
pnpm update "@cgk-platform/*" --latest

# Run migrations if needed
npx @cgk-platform/cli migrate
```

### Protected Customization Layers

1. **Core Layer** (`@cgk-platform/*` packages): Never edit, just update
2. **Extension Layer**: Hook points for customization
3. **Override Layer**: Local files that take precedence

```typescript
// Brand site can override any component:
// src/components/ui/button.tsx

// Option 1: Re-export core unchanged
export { Button } from '@cgk-platform/ui'

// Option 2: Wrap with customizations
import { Button as CoreButton } from '@cgk-platform/ui'
export const Button = styled(CoreButton, customStyles)

// Option 3: Complete replacement
export const Button = MyCustomButton
```

### Configuration-Based Customization

```typescript
// platform.config.ts - Brand site configuration
import { defineConfig } from '@cgk-platform/core'

export default defineConfig({
  // Brand identity
  brand: {
    name: 'RAWDOG',
    slug: 'rawdog',
    domain: 'justrawdogit.com'
  },

  // Theme customization
  theme: {
    colors: {
      primary: '#3d3d3d',
      accent: '#374d42'
    },
    fonts: {
      heading: 'Oswald',
      body: 'Inter'
    }
  },

  // Feature toggles
  features: {
    creators: true,
    abTesting: true,
    attribution: {
      enabled: true,
      models: ['last-touch', 'linear', 'first-touch']
    },
    reviews: true,
    subscriptions: true
  },

  // Integrations
  shopify: {
    storeDomain: 'rawdog-store.myshopify.com'
  },

  // Deployment
  deployment: {
    profile: 'medium',  // small | medium | large | enterprise
    region: 'us-east-1'
  }
})
```

### Migration System

```
migrations/
├── platform/                    # Core platform migrations
│   ├── 2.3.0/
│   │   ├── 001_add_feature_x.sql
│   │   └── rollback/
│   │       └── 001_add_feature_x.sql
│   └── 2.4.0/
│       └── 001_new_table.sql
└── brand/                       # Brand-specific migrations
    └── 001_custom_fields.sql
```

```bash
# Run all pending migrations
npx @cgk-platform/cli migrate

# Dry run (preview)
npx @cgk-platform/cli migrate --dry-run

# Rollback last migration
npx @cgk-platform/cli migrate --rollback

# Show migration status
npx @cgk-platform/cli migrate --status
```

---

## Frontend/Backend Separation

### API Contract

Storefronts communicate with the platform via:

1. **GraphQL API** (primary): Full-featured, typed queries
2. **REST API** (fallback): Simpler integrations
3. **SDK Hooks** (React): Pre-built client logic

### Hook Library (`@cgk-platform/commerce-hooks`)

Headless hooks for any React-based storefront:

```typescript
import {
  useCart,
  useDynamicConfig,
  useABTest,
  useFreeGifts,
  useLandingPage
} from '@cgk-platform/commerce-hooks'

function ProductPage() {
  const { config, isSaleActive } = useDynamicConfig()
  const { cart, addToCart } = useCart()
  const { variant } = useABTest('pricing-test')
  const { qualifiedGifts } = useFreeGifts()

  // Use data however you want in your custom UI
}
```

### Component Library Tiers

| Tier | Package | Purpose |
|------|---------|---------|
| 1 | `@cgk-platform/commerce-hooks` | Headless logic (required) |
| 2 | `@cgk-platform/commerce-primitives` | Unstyled, accessible components (optional) |
| 3 | `@cgk-platform/ui` | Fully styled reference components (optional) |

Brands can use any tier or mix-and-match.

---

## Deployment Models

### Single-Deployment with Tenant Routing (Recommended at Scale)

```
┌─────────────────────────────────────────────────────────┐
│                    Edge Layer (Cloudflare/Vercel)        │
│  admin.brand1.com → admin app + tenant=brand1           │
│  admin.brand2.com → admin app + tenant=brand2           │
│  shop.brand1.com → storefront app + tenant=brand1       │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                    Single Deployment                     │
│  apps/admin (one deployment, serves ALL tenants)        │
│  apps/storefront (one deployment, serves ALL tenants)   │
│  apps/orchestrator (internal only)                       │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- 5 deployments total regardless of tenant count
- Faster deployments
- Shared cold-start optimization
- Easier to maintain

### Multi-Deployment (Small Scale)

For 1-10 tenants, separate deployments per tenant are acceptable:

```
admin-rawdog.vercel.app    → apps/admin (TENANT=rawdog)
admin-clientx.vercel.app   → apps/admin (TENANT=clientx)
```

---

## Scaling Profiles

### Deployment Profiles

```typescript
type DeploymentProfile = 'small' | 'medium' | 'large' | 'enterprise'

// platform.config.ts
export default defineConfig({
  deployment: {
    profile: 'medium'  // Automatically sets appropriate limits
  }
})
```

| Profile | Tenants | Connections | API Rate | Jobs/Hour |
|---------|---------|-------------|----------|-----------|
| `small` | 1-10 | 50 | 100/min | 500 |
| `medium` | 10-100 | 200 | 500/min | 2,000 |
| `large` | 100-1000 | 1,000 | 1,000/min | 10,000 |
| `enterprise` | 1000+ | 5,000 | 10,000/min | 100,000 |

---

## Database Strategy

### Tiered Multi-Tenancy

| Tier | Criteria | Isolation | Connection Pool |
|------|----------|-----------|-----------------|
| **Shared** | < $10K MRR | Row-Level Security | Shared pool |
| **Schema** | $10K-100K MRR | Schema per tenant | Reserved allocation |
| **Dedicated** | > $100K MRR | Separate database | Dedicated pool |

Default for new tenants: **Shared** (RLS-based)

Upgrade path: CLI command to migrate tenant to higher tier:

```bash
npx @cgk-platform/cli tenant:upgrade rawdog --tier=schema
npx @cgk-platform/cli tenant:upgrade enterprise-client --tier=dedicated
```

---

## Success Criteria

- [ ] `npx @cgk-platform/cli create my-brand` works end-to-end
- [ ] Brand sites can update packages without breaking customizations
- [ ] Documentation sufficient for AI agents to implement features
- [ ] Logging useful for debugging without overwhelming production
- [ ] Same codebase deploys from 1 to 1000+ tenants
- [ ] README covers complete setup from clone to production

---

## Next Steps

1. Create PHASE-0-PORTABILITY.md with implementation tasks
2. Create README-TEMPLATE.md for GitHub repository
3. Update LOGGING-SPEC for AI-friendly, sampled logging
4. Create CLAUDE.md templates for each package
5. Design CLI tool architecture
