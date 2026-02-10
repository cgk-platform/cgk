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
    "@cgk/db": "workspace:*"  // Local reference, no npm
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
├── packages/                        # PUBLISHED TO NPM (@cgk/*)
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
  "name": "@cgk/monorepo",
  "config": {
    "packageNamespace": "@cgk"
  }
}
```

**Package list**:

```
@cgk/core           # Core utilities, types
@cgk/db             # Database client
@cgk/auth           # Authentication
@cgk/ui             # UI components
@cgk/commerce       # **Commerce provider abstraction (Shopify + Custom)**
@cgk/shopify        # Shopify client (used by commerce provider)
@cgk/payments       # Payment providers (Stripe + Wise for payouts)
@cgk/jobs           # Background jobs
@cgk/mcp            # MCP server utilities
@cgk/analytics      # Analytics & attribution
@cgk/commerce-hooks # Headless commerce hooks
@cgk/logging        # Structured logging
@cgk/cli            # CLI tool
@cgk/config         # Shared configs
```

**Note**: During development, packages can remain unpublished. Publishing to npm only required when you want external brand sites to consume the packages.

---

## Versioning Strategy

### Semantic Versioning with Lockstep

All `@cgk/*` packages share the same version number (like React or Next.js):

```json
{
  "dependencies": {
    "@cgk/core": "2.4.1",
    "@cgk/db": "2.4.1",
    "@cgk/auth": "2.4.1"
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

### `@cgk/cli` Commands

```bash
# === PROJECT CREATION ===
npx @cgk/cli create my-brand          # Create new brand site
npx @cgk/cli create my-brand --template=basic
npx @cgk/cli create my-brand --template=full
npx @cgk/cli init                      # Initialize in existing project

# === HEALTH & DIAGNOSTICS ===
npx @cgk/cli doctor                    # Check system requirements
npx @cgk/cli status                    # Show platform status

# === UPDATES ===
npx @cgk/cli check-updates             # Check for new versions
npx @cgk/cli update                    # Update all packages
npx @cgk/cli update --channel=beta     # Update from beta channel
npx @cgk/cli changelog 2.4.0           # View changelog

# === DATABASE ===
npx @cgk/cli migrate                   # Run pending migrations
npx @cgk/cli migrate --status          # Check migration status
npx @cgk/cli migrate --rollback        # Rollback last migration
npx @cgk/cli migrate:create add-foo    # Create new migration

# === TENANT MANAGEMENT ===
npx @cgk/cli tenant:create             # Interactive tenant setup
npx @cgk/cli tenant:list               # List all tenants
npx @cgk/cli tenant:export rawdog      # Export tenant data
npx @cgk/cli tenant:import backup.sql  # Import tenant data

# === DEVELOPMENT ===
npx @cgk/cli dev                       # Start dev server
npx @cgk/cli build                     # Build for production
npx @cgk/cli typecheck                 # Run TypeScript checks

# === DEPLOYMENT ===
npx @cgk/cli deploy                    # Deploy to Vercel
npx @cgk/cli deploy --preview          # Preview deployment
npx @cgk/cli env:push                  # Push env vars to Vercel
```

---

## Update Mechanism

### How Brand Sites Receive Updates

**Standard npm/pnpm updates:**

```bash
# Check for updates
npx @cgk/cli check-updates

# Update all platform packages
pnpm update "@cgk/*" --latest

# Run migrations if needed
npx @cgk/cli migrate
```

### Protected Customization Layers

1. **Core Layer** (`@cgk/*` packages): Never edit, just update
2. **Extension Layer**: Hook points for customization
3. **Override Layer**: Local files that take precedence

```typescript
// Brand site can override any component:
// src/components/ui/button.tsx

// Option 1: Re-export core unchanged
export { Button } from '@cgk/ui'

// Option 2: Wrap with customizations
import { Button as CoreButton } from '@cgk/ui'
export const Button = styled(CoreButton, customStyles)

// Option 3: Complete replacement
export const Button = MyCustomButton
```

### Configuration-Based Customization

```typescript
// platform.config.ts - Brand site configuration
import { defineConfig } from '@cgk/core'

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
npx @cgk/cli migrate

# Dry run (preview)
npx @cgk/cli migrate --dry-run

# Rollback last migration
npx @cgk/cli migrate --rollback

# Show migration status
npx @cgk/cli migrate --status
```

---

## Frontend/Backend Separation

### API Contract

Storefronts communicate with the platform via:

1. **GraphQL API** (primary): Full-featured, typed queries
2. **REST API** (fallback): Simpler integrations
3. **SDK Hooks** (React): Pre-built client logic

### Hook Library (`@cgk/commerce-hooks`)

Headless hooks for any React-based storefront:

```typescript
import {
  useCart,
  useDynamicConfig,
  useABTest,
  useFreeGifts,
  useLandingPage
} from '@cgk/commerce-hooks'

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
| 1 | `@cgk/commerce-hooks` | Headless logic (required) |
| 2 | `@cgk/commerce-primitives` | Unstyled, accessible components (optional) |
| 3 | `@cgk/ui` | Fully styled reference components (optional) |

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
npx @cgk/cli tenant:upgrade rawdog --tier=schema
npx @cgk/cli tenant:upgrade enterprise-client --tier=dedicated
```

---

## Success Criteria

- [ ] `npx @cgk/cli create my-brand` works end-to-end
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
