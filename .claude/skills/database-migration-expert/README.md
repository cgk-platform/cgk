# Database Migration Expert - CGK Platform

## Design Principles
1. **Tenant Isolation is Mandatory** - Every migration for public OR tenant schema
2. **ID Type Safety** - UUID (public) vs TEXT (tenant, except projects)
3. **Idempotency First** - IF NOT EXISTS, DO$$ EXCEPTION blocks
4. **Named Migrations** - (version, name) tracking, not strict versioning

## Migration System Architecture

### Custom Built-In Runner
CGK uses a **custom migration runner** (not Prisma/Knex/node-pg-migrate):
- **Named migrations**: Tracked by `(version, name)` composite key in `migrations` table
- **Idempotent by design**: All migrations use `IF NOT EXISTS` / `DO$$ EXCEPTION` blocks
- **Forward-only**: No automatic rollbacks - manual reversion required
- **Neon HTTP optimized**: `SET search_path + query` bundled in single request
- **CLI integration**: `npx @cgk-platform/cli migrate` with dry-run, status, rollback commands

### Migration Tracking Table
```sql
CREATE TABLE IF NOT EXISTS public.migrations (
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (version, name)
);
```

### File Organization
```
packages/db/src/migrations/
├── public/           # Platform-wide tables (UUID IDs)
│   ├── 001_initial_schema.sql
│   ├── 002_add_users.sql
│   └── ...
├── tenant/           # Tenant-scoped tables (TEXT IDs, except projects)
│   ├── 001_orders_customers.sql
│   ├── 002_creators_projects.sql
│   └── ...
├── runner.ts         # Migration execution engine
└── loader.ts         # Migration file discovery
```

## Migration Patterns

### Public Schema Pattern (UUID IDs)
```sql
-- File: packages/db/src/migrations/public/NNN_name.sql

-- Create enum with DO block (idempotent)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create table with UUID primary key
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Tenant Schema Pattern (TEXT IDs)
```sql
-- File: packages/db/src/migrations/tenant/NNN_name.sql

-- Tenant tables use TEXT for IDs (Shopify compatibility)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,                    -- Shopify order ID
  customer_id TEXT,                       -- Shopify customer ID
  total_cents INTEGER NOT NULL,           -- Avoid float precision issues
  currency VARCHAR(3) DEFAULT 'USD',
  line_items JSONB DEFAULT '[]',          -- Denormalized for performance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Use fully-qualified function name
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();  -- Fully qualified!

-- GIN index for JSONB search
CREATE INDEX IF NOT EXISTS idx_orders_line_items ON orders USING GIN(line_items);
```

### Foreign Key Type Validation
```sql
-- WRONG - Type mismatch (public.users.id is UUID)
ALTER TABLE tenant_rawdog.creators
  ADD COLUMN user_id TEXT REFERENCES public.users(id);  -- ❌ TEXT != UUID

-- CORRECT - Types must match
ALTER TABLE tenant_rawdog.creators
  ADD COLUMN user_id UUID REFERENCES public.users(id);  -- ✅ UUID = UUID
```

### pgvector Extension
```sql
-- WRONG - Missing schema qualifier
ALTER TABLE embeddings
  ADD COLUMN vector vector(1536);  -- ❌ Type not found in search_path

-- CORRECT - Fully qualified type
ALTER TABLE embeddings
  ADD COLUMN vector public.vector(1536);  -- ✅ Explicit public schema
```

### Adding Columns with Defaults
```sql
-- Add column with default value
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add non-nullable column (must have default or backfill)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'unfulfilled' NOT NULL;
```

### Creating Indexes Concurrently
```sql
-- For large tables, use CONCURRENT to avoid locking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at
  ON orders(created_at DESC);

-- Note: CONCURRENTLY cannot be used inside a transaction block
-- Migration runner must handle these specially
```

### JSONB Operations
```sql
-- Add JSONB column with default
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- GIN index for JSONB containment queries
CREATE INDEX IF NOT EXISTS idx_products_metadata
  ON products USING GIN(metadata);

-- GIN index for JSONB path queries
CREATE INDEX IF NOT EXISTS idx_products_metadata_jsonb_path
  ON products USING GIN(metadata jsonb_path_ops);
```

### Enum Types
```sql
-- Add new enum type
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add value to existing enum (PostgreSQL 12+)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded';

-- Change column to use enum
ALTER TABLE orders
  ALTER COLUMN status TYPE order_status USING status::order_status;
```

## Common Gotchas
1. **Missing IF NOT EXISTS** → Migration fails on re-run
2. **Type mismatch on foreign keys** → UUID vs TEXT confusion
3. **Unqualified function names** → Use `public.update_updated_at_column()`
4. **Unqualified pgvector types** → Use `public.vector(1536)`
5. **Forgetting indexes** → Slow queries on large tables
6. **No rollback plan** → Manual SQL required for reversion
7. **Float for money** → Use INTEGER for cents to avoid precision errors
8. **Missing CASCADE on foreign keys** → Orphaned records on delete
9. **Concurrent index without isolation** → Can't run in transaction block
10. **Enum value order** → Can't reorder, only append

## Migration CLI Commands
```bash
# Create new migration
npx @cgk-platform/cli migrate:create add_feature
npx @cgk-platform/cli migrate:create add_users --public
npx @cgk-platform/cli migrate:create add_orders --tenant

# Run migrations
npx @cgk-platform/cli migrate                # All (public + all tenants)
npx @cgk-platform/cli migrate --public-only  # Public schema only
npx @cgk-platform/cli migrate --tenant rawdog  # Specific tenant
npx @cgk-platform/cli migrate --dry-run      # Validate without applying
npx @cgk-platform/cli migrate --status       # Show applied/pending

# Rollback (manual reversion required)
npx @cgk-platform/cli migrate --rollback 1   # Remove last migration record
```

## Decision Tree
```
Need to add a table?
  ├─ Multi-tenant data (orders, customers, products)?
  │    → Tenant schema (packages/db/src/migrations/tenant/)
  │    → Use TEXT for IDs (Shopify compatibility)
  │    → Fully qualify functions: public.update_updated_at_column()
  ├─ Shared infrastructure (users, organizations, billing)?
  │    → Public schema (packages/db/src/migrations/public/)
  │    → Use UUID for IDs
  │    → Functions already in search_path
  └─ AI/vector data?
       → Tenant schema + public.vector(1536) type

Need to reference another table?
  ├─ Check ID type: \d public.users → Shows id UUID
  ├─ Foreign key column MUST match exactly
  └─ Add ON DELETE CASCADE / SET NULL for cleanup

Need to add an index?
  ├─ Single column → CREATE INDEX IF NOT EXISTS idx_table_column
  ├─ Composite → CREATE INDEX IF NOT EXISTS idx_table_col1_col2
  ├─ JSONB search → CREATE INDEX USING GIN(jsonb_column)
  ├─ Unique constraint → CREATE UNIQUE INDEX or ADD CONSTRAINT UNIQUE
  └─ Large table → Use CONCURRENTLY (cannot be in transaction)

Need to modify enum?
  ├─ Add value → ALTER TYPE enum_name ADD VALUE IF NOT EXISTS 'new_value'
  ├─ Remove value → NOT POSSIBLE - create new enum, migrate data
  └─ Reorder values → NOT POSSIBLE - enum values are ordered by creation
```

## ID Type Reference
| Table | Schema | ID Type | Reason |
|-------|--------|---------|--------|
| `users` | public | UUID | Platform-wide |
| `organizations` | public | UUID | Platform-wide |
| `sessions` | public | UUID | Platform-wide |
| `api_keys` | public | UUID | Platform-wide |
| `orders` | tenant | TEXT | Shopify IDs are strings |
| `customers` | tenant | TEXT | Shopify IDs are strings |
| `products` | tenant | TEXT | Shopify IDs are strings |
| `creators` | tenant | TEXT | Tenant-scoped identifiers |
| `projects` | tenant | **UUID** | Exception - internal entities |
| `reviews` | tenant | TEXT | Tenant-scoped identifiers |
| `videos` | tenant | TEXT | Tenant-scoped identifiers |
| `blog_posts` | tenant | TEXT | Tenant-scoped identifiers |
| `ai_agents` | tenant | TEXT | Tenant-scoped identifiers |

## Neon HTTP Optimization

CGK uses Neon's HTTP connection pool. For tenant queries, the migration runner bundles `SET search_path` with the query to minimize round trips:

```typescript
// Optimized: Single HTTP request
await sql`
  SET search_path TO tenant_rawdog, public;
  CREATE TABLE IF NOT EXISTS orders (...);
`

// Less optimal: Two HTTP requests
await sql`SET search_path TO tenant_rawdog, public`
await sql`CREATE TABLE IF NOT EXISTS orders (...)`
```

## Testing Migrations

### Dry Run
Always test migrations with `--dry-run` first:
```bash
npx @cgk-platform/cli migrate --dry-run
```

This validates:
- SQL syntax
- File naming
- Idempotency (runs twice to ensure IF NOT EXISTS works)
- Type compatibility (basic checks)

### Local Testing
1. Create migration file
2. Run `migrate --dry-run` to validate
3. Run `migrate --public-only` to test public schema
4. Run `migrate --tenant rawdog` to test one tenant
5. Check `migrate --status` to verify tracking

### Rollback Strategy
Since there are no automatic rollbacks, create a reversion script:
```sql
-- migration: 005_add_orders_status.sql
ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending';

-- reversion: 005_add_orders_status_revert.sql
ALTER TABLE orders DROP COLUMN IF EXISTS status;
```

Store reversion scripts in `packages/db/src/migrations/reversions/` for manual execution if needed.

## References
- Migration runner: `/packages/db/src/migrations/runner.ts`
- Migration loader: `/packages/db/src/migrations/loader.ts`
- CLI commands: `/packages/cli/src/commands/migrate.ts`
- Public migrations: `/packages/db/src/migrations/public/`
- Tenant migrations: `/packages/db/src/migrations/tenant/`
- Schema docs: `/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-0B-DATABASE-SETUP-UX.md`

## Example: Complete Migration

```sql
-- File: packages/db/src/migrations/tenant/015_add_subscription_analytics.sql
-- Purpose: Add analytics tracking for subscription events

-- Create enum for event types
DO $$ BEGIN
  CREATE TYPE subscription_event_type AS ENUM (
    'created',
    'updated',
    'cancelled',
    'renewed',
    'payment_failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create analytics table
CREATE TABLE IF NOT EXISTS subscription_events (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  event_type subscription_event_type NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id
  ON subscription_events(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_customer_id
  ON subscription_events(customer_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at
  ON subscription_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_events_metadata
  ON subscription_events USING GIN(metadata);

-- Add foreign key (if subscriptions table exists)
DO $$ BEGIN
  ALTER TABLE subscription_events
    ADD CONSTRAINT fk_subscription_events_subscription
    FOREIGN KEY (subscription_id)
    REFERENCES subscriptions(id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;  -- Table doesn't exist yet
END $$;
```

---

*This skill provides CGK-specific migration patterns and prevents the #1 source of production errors.*
