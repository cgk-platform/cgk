# Tenant Provisioner

> **Purpose**: Automated multi-tenant provisioning workflow - creates schemas, runs migrations, generates admin users, and configures encryption keys.

**Version**: 1.0.0
**Type**: Workflow
**Invocation**: `/tenant-provisioner [options]`

---

## Overview

The Tenant Provisioner is an end-to-end automation tool for creating new tenants in the CGK multi-tenant platform. It handles all aspects of tenant setup including database schema creation, migration application, admin user provisioning with magic link authentication, encryption key generation, and default settings configuration. The workflow includes rollback capabilities on failure.

**CRITICAL**: Tenant provisioning is a high-risk operation that involves database schema creation and data setup. This skill automates the process to ensure consistency and prevent human error during manual tenant onboarding.

---

## Usage

### Basic Usage

```bash
# Provision new tenant
/tenant-provisioner \
  --slug acme \
  --name "Acme Corp" \
  --admin-email admin@acme.com

# Dry-run mode (preview steps)
/tenant-provisioner \
  --slug acme \
  --name "Acme Corp" \
  --admin-email admin@acme.com \
  --dry-run

# Skip migrations (schema only)
/tenant-provisioner \
  --slug acme \
  --name "Acme Corp" \
  --admin-email admin@acme.com \
  --skip-migrations
```

### Production Usage

```bash
# Interactive provisioning session
/tenant-provisioner \
  --slug meliusly \
  --name "Meliusly Linens" \
  --admin-email nova@meliusly.com
```

**Expected Output**:
```
🏢 Tenant Provisioner

📋 Tenant Configuration:

  Slug: meliusly
  Name: Meliusly Linens
  Admin Email: nova@meliusly.com
  Schema: tenant_meliusly

⏳ Step 1: Creating organization record...
✅ Organization created

⏳ Step 2: Creating tenant schema...
✅ Schema created: tenant_meliusly

⏳ Step 3: Running tenant migrations...
✅ Migrations applied

⏳ Step 4: Creating admin user...
✅ Admin user created: nova@meliusly.com
   Magic link token: a1b2c3d4e5f6...

⏳ Step 5: Generating encryption keys...
✅ Encryption keys generated

⏳ Step 6: Configuring default settings...
✅ Default settings configured

────────────────────────────────────────────────────────────────────────────────
✅ Tenant Provisioned Successfully!

📊 Summary:

  Tenant: Meliusly Linens
  Slug: meliusly
  Schema: tenant_meliusly
  Admin User: nova@meliusly.com
  Organization ID: 4f7b9a1c2d3e...

🔑 Admin Access:

  Magic Link: https://admin.cgk.app/auth/magic?token=a1b2c3d4e5f6...
  (Valid for 24 hours)

📝 Next Steps:

  1. Send magic link to admin user
  2. Configure tenant integrations (Stripe, Shopify, etc.)
  3. Set up domain/subdomain (if applicable)
  4. Import initial data (if needed)
```

---

## Provisioning Workflow

### Step 1: Create Organization Record

**Action**: Insert record into `public.organizations` table

**SQL**:
```sql
INSERT INTO public.organizations (
  id,
  slug,
  name,
  status,
  created_at,
  updated_at
) VALUES (
  uuid_generate_v4(),
  'acme',
  'Acme Corp',
  'active',
  NOW(),
  NOW()
)
RETURNING id;
```

**Why**: Organizations table is the tenant registry in the public schema. All tenants must have an organization record.

---

### Step 2: Create Tenant Schema

**Action**: Create dedicated schema for tenant data

**SQL**:
```sql
CREATE SCHEMA IF NOT EXISTS tenant_acme;
```

**Why**: CGK uses schema-per-tenant architecture. Each tenant gets an isolated PostgreSQL schema for complete data isolation.

---

### Step 3: Run Tenant Migrations

**Action**: Apply all tenant-scoped migrations to new schema

**Command**:
```bash
pnpm db:migrate:tenant --tenant acme
```

**What it does**:
- Creates all tables in `tenant_acme` schema
- Applies indexes and constraints
- Inserts default data (if any)
- Validates migration success

**Why**: Tenant schemas need all table structures before they can be used.

---

### Step 4: Create Admin User

**Action**: Create initial admin user in `public.users` table

**SQL**:
```sql
INSERT INTO public.users (
  id,
  email,
  organization_id,
  role,
  status,
  created_at,
  updated_at
) VALUES (
  uuid_generate_v4(),
  'admin@acme.com',
  '<org-id>',
  'admin',
  'active',
  NOW(),
  NOW()
)
RETURNING id;
```

**Magic Link Generation**:
```typescript
const magicLinkToken = randomBytes(32).toString('hex')
// Store hashed token in database
// Send link: https://admin.cgk.app/auth/magic?token={token}
```

**Why**: Admin user needs to be created before tenant can access the platform.

---

### Step 5: Generate Encryption Keys

**Action**: Generate encryption keys for tenant integrations

**Keys Generated**:
```typescript
{
  integrationKey: randomBytes(32).toString('hex'),  // For Stripe, Resend, etc.
  shopifyKey: randomBytes(32).toString('hex')       // For Shopify OAuth tokens
}
```

**Storage**: Keys stored in tenant settings table (encrypted)

**Why**: Tenant integrations require encryption keys to secure API credentials (Stripe secret keys, OAuth tokens, etc.)

---

### Step 6: Configure Default Settings

**Action**: Insert default tenant settings

**Settings**:
```json
{
  "theme": "light",
  "timezone": "UTC",
  "currency": "USD",
  "language": "en"
}
```

**Why**: Provides sensible defaults for new tenants. Can be customized later via admin UI.

---

## Input Validation

### Slug Format

**Rule**: Lowercase letters, numbers, and hyphens only

**Valid**:
```
acme
acme-corp
acme-corp-2024
```

**Invalid**:
```
Acme           # Uppercase
acme_corp      # Underscore
acme corp      # Space
acme.com       # Period
```

**Why**: Slugs are used in schema names (`tenant_{slug}`), URLs, and identifiers. Strict format prevents SQL injection and routing issues.

---

### Email Format

**Rule**: Standard email validation (`user@domain.tld`)

**Valid**:
```
admin@acme.com
nova.russell@meliusly.com
admin+test@example.co.uk
```

**Invalid**:
```
admin          # Missing @
@acme.com      # Missing local part
admin@         # Missing domain
```

---

### Required Arguments

**All required**:
- `--slug`: Tenant identifier (lowercase, hyphenated)
- `--name`: Tenant display name (any characters)
- `--admin-email`: Admin user email (valid email format)

**Optional**:
- `--dry-run`: Preview steps without applying
- `--skip-migrations`: Skip migration application (schema only)

---

## Rollback Handling

If provisioning fails at any step, the workflow attempts rollback:

**Rollback SQL** (manual cleanup required):
```sql
-- 1. Drop tenant schema
DROP SCHEMA IF EXISTS tenant_acme CASCADE;

-- 2. Delete organization record
DELETE FROM public.organizations WHERE slug = 'acme';

-- 3. Delete admin user (if created)
DELETE FROM public.users WHERE email = 'admin@acme.com';
```

**Why**: Database transactions can't span schema creation and multiple migrations. Manual rollback ensures clean state after failures.

---

## Dry-Run Mode

**Command**:
```bash
/tenant-provisioner --slug acme --name "Acme Corp" --admin-email admin@acme.com --dry-run
```

**Output**:
```
🔍 Dry-run mode - Preview steps:

  1. ✓ Create organization record in public.organizations
  2. ✓ Create schema: tenant_acme
  3. ✓ Run tenant migrations
  4. ✓ Create admin user
  5. ✓ Generate encryption keys
  6. ✓ Configure default settings

✅ Dry-run complete. Run without --dry-run to provision tenant.
```

**Why**: Preview workflow before making database changes. Useful for validation and documentation.

---

## Output Format

### Success Response

```json
{
  "status": "success",
  "tenant": {
    "slug": "acme",
    "name": "Acme Corp",
    "organizationId": "4f7b9a1c-2d3e-5f6g-7h8i-9j0k1l2m3n4o",
    "schema": "tenant_acme",
    "adminEmail": "admin@acme.com",
    "magicLinkToken": "a1b2c3d4e5f6..."
  },
  "steps": [
    { "step": 1, "status": "success", "data": { "orgId": "..." } },
    { "step": 2, "status": "success" },
    { "step": 3, "status": "success" },
    { "step": 4, "status": "success", "data": { "userId": "...", "magicLinkToken": "..." } },
    { "step": 5, "status": "success", "data": { "integrationKey": "...", "shopifyKey": "..." } },
    { "step": 6, "status": "success", "data": { "theme": "light", ... } }
  ]
}
```

---

### Failure Response

```json
{
  "status": "failed",
  "error": "Migration failed: syntax error at line 45",
  "steps": [
    { "step": 1, "status": "success" },
    { "step": 2, "status": "success" },
    { "step": 3, "status": "failed" }
  ],
  "rollbackRequired": true
}
```

**Manual Rollback Commands** (displayed in output):
```
⚠️  Manual cleanup required:
  1. DROP SCHEMA IF EXISTS tenant_acme CASCADE;
  2. DELETE FROM public.organizations WHERE slug = 'acme';
```

---

## Options

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| `--slug <string>` | Tenant identifier (lowercase, hyphenated) | - | ✅ Yes |
| `--name <string>` | Tenant display name | - | ✅ Yes |
| `--admin-email <email>` | Admin user email | - | ✅ Yes |
| `--dry-run` | Preview steps without applying | `false` | No |
| `--skip-migrations` | Skip migration application | `false` | No |

---

## Integration

### With Other Skills

**Pre-provisioning validation**:
```bash
# 1. Validate migrations before provisioning
/migration-impact-analyzer --migration 001-create-tenant-tables.sql

# 2. Provision tenant
/tenant-provisioner --slug acme --name "Acme Corp" --admin-email admin@acme.com

# 3. Verify deployment readiness
/deployment-readiness-checker --app admin
```

**Post-provisioning setup**:
```bash
# 1. Provision tenant
/tenant-provisioner --slug acme --name "Acme Corp" --admin-email admin@acme.com

# 2. Configure Vercel environment
/vercel-config-auditor --fix

# 3. Audit permissions
/permission-auditor --path apps/admin
```

---

### Automation Script

```bash
#!/bin/bash
# scripts/provision-tenant.sh

set -e

SLUG=$1
NAME=$2
EMAIL=$3

if [ -z "$SLUG" ] || [ -z "$NAME" ] || [ -z "$EMAIL" ]; then
  echo "Usage: ./provision-tenant.sh <slug> <name> <email>"
  exit 1
fi

echo "🏢 Provisioning tenant: $NAME ($SLUG)"
echo ""

# 1. Dry-run first
echo "📋 Dry-run preview..."
/tenant-provisioner --slug "$SLUG" --name "$NAME" --admin-email "$EMAIL" --dry-run

# 2. Confirm
read -p "Proceed with provisioning? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# 3. Provision
echo "⏳ Provisioning..."
/tenant-provisioner --slug "$SLUG" --name "$NAME" --admin-email "$EMAIL"

echo ""
echo "✅ Tenant provisioned successfully!"
```

---

## Examples

### Example 1: Dry-Run Preview

```bash
/tenant-provisioner --slug acme --name "Acme Corp" --admin-email admin@acme.com --dry-run
```

**Output**:
```
🏢 Tenant Provisioner

📋 Tenant Configuration:

  Slug: acme
  Name: Acme Corp
  Admin Email: admin@acme.com
  Schema: tenant_acme

🔍 Dry-run mode - Preview steps:

  1. ✓ Create organization record in public.organizations
  2. ✓ Create schema: tenant_acme
  3. ✓ Run tenant migrations
  4. ✓ Create admin user
  5. ✓ Generate encryption keys
  6. ✓ Configure default settings

✅ Dry-run complete. Run without --dry-run to provision tenant.
```

---

### Example 2: Successful Provisioning

```bash
/tenant-provisioner --slug meliusly --name "Meliusly Linens" --admin-email nova@meliusly.com
```

**Output**: See [Production Usage](#production-usage) section

---

### Example 3: Schema Only (Skip Migrations)

```bash
/tenant-provisioner --slug acme --name "Acme Corp" --admin-email admin@acme.com --skip-migrations
```

**Output**:
```
🏢 Tenant Provisioner

📋 Tenant Configuration:

  Slug: acme
  Name: Acme Corp
  Admin Email: admin@acme.com
  Schema: tenant_acme

⏳ Step 1: Creating organization record...
✅ Organization created

⏳ Step 2: Creating tenant schema...
✅ Schema created: tenant_acme

⏭️  Step 3: Skipping migrations

⏳ Step 4: Creating admin user...
✅ Admin user created: admin@acme.com

⏳ Step 5: Generating encryption keys...
✅ Encryption keys generated

⏳ Step 6: Configuring default settings...
✅ Default settings configured

✅ Tenant provisioned (migrations skipped - run manually)
```

---

### Example 4: Provisioning Failure with Rollback

```bash
/tenant-provisioner --slug acme --name "Acme Corp" --admin-email admin@acme.com
```

**Output** (if migration fails):
```
🏢 Tenant Provisioner

⏳ Step 1: Creating organization record...
✅ Organization created

⏳ Step 2: Creating tenant schema...
✅ Schema created: tenant_acme

⏳ Step 3: Running tenant migrations...
❌ Migration failed: syntax error at line 45

❌ Provisioning failed: Migration failed: syntax error at line 45

🔄 Rolling back changes...

⚠️  Manual cleanup required:
  1. DROP SCHEMA IF EXISTS tenant_acme CASCADE;
  2. DELETE FROM public.organizations WHERE slug = 'acme';
```

---

## Troubleshooting

### Issue: "Invalid slug format"

**Cause**: Slug contains invalid characters

**Fix**: Use lowercase letters, numbers, and hyphens only
```bash
# WRONG
/tenant-provisioner --slug "Acme Corp" ...  # Uppercase + space

# CORRECT
/tenant-provisioner --slug acme-corp ...
```

---

### Issue: "Migration failed: relation already exists"

**Cause**: Tenant schema already exists (previous failed provisioning)

**Fix**: Manual cleanup before re-provisioning
```sql
-- Check existing schemas
SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';

-- Drop existing schema
DROP SCHEMA IF EXISTS tenant_acme CASCADE;

-- Delete organization record
DELETE FROM public.organizations WHERE slug = 'acme';

-- Re-run provisioning
/tenant-provisioner --slug acme --name "Acme Corp" --admin-email admin@acme.com
```

---

### Issue: "pnpm db:migrate:tenant: command not found"

**Cause**: Migration script not configured in package.json

**Fix**: Add migration script
```json
{
  "scripts": {
    "db:migrate:tenant": "node scripts/migrate-tenant.js"
  }
}
```

Or skip migrations and run manually:
```bash
/tenant-provisioner --slug acme --name "Acme Corp" --admin-email admin@acme.com --skip-migrations

# Then run migrations manually
cd packages/db
pnpm migrate:tenant --tenant acme
```

---

### Issue: Magic link expires before admin can use it

**Cause**: Magic links valid for 24 hours only

**Fix**: Regenerate magic link
```sql
-- Generate new token
UPDATE public.users
SET magic_link_token = encode(gen_random_bytes(32), 'hex'),
    magic_link_expires_at = NOW() + INTERVAL '24 hours'
WHERE email = 'admin@acme.com';

-- Retrieve new token
SELECT magic_link_token FROM public.users WHERE email = 'admin@acme.com';
```

---

## Related Documentation

- **CLAUDE.md**: [Multi-Tenancy Patterns](/CLAUDE.md#multi-tenancy-patterns)
- **CLAUDE.md**: [Database Schema-Per-Tenant](/CLAUDE.md#database-schema-per-tenant)
- **Migration Guide**: `packages/db/migrations/README.md`
- **Related Skills**:
  - [migration-impact-analyzer](../migration-impact-analyzer/README.md) - Analyze migration risks
  - [vercel-config-auditor](../vercel-config-auditor/README.md) - Validate environment setup
  - [deployment-readiness-checker](../deployment-readiness-checker/README.md) - Pre-deployment validation

---

## Security Considerations

### Encryption Keys

**CRITICAL**: Encryption keys generated during provisioning must be:
1. Stored securely (encrypted at rest)
2. Never logged or displayed in plain text
3. Rotated periodically (quarterly recommended)
4. Backed up in secure key management system

**Storage**:
```typescript
// Encryption keys stored in tenant settings (encrypted)
await sql`
  INSERT INTO tenant_${slug}.settings (
    key,
    value_encrypted
  ) VALUES (
    'integration_encryption_key',
    pgp_sym_encrypt(${integrationKey}, ${MASTER_KEY})
  )
`
```

---

### Magic Links

**Security rules**:
1. Tokens are cryptographically random (32 bytes)
2. Valid for 24 hours only
3. Single-use (invalidated after first login)
4. Sent via secure channel (email)

**Best practices**:
- Send magic link immediately after provisioning
- Use HTTPS for magic link URLs
- Invalidate token after first use
- Log authentication attempts

---

### Schema Isolation

**CRITICAL**: Each tenant schema is completely isolated:
- No cross-tenant queries possible
- Tenant data never mixed
- Schema names validated to prevent injection

**Validation**:
```typescript
// Slug validation prevents SQL injection
if (!/^[a-z0-9-]+$/.test(slug)) {
  throw new Error('Invalid slug format')
}

// Safe to use in schema name
const schema = `tenant_${slug}`  // e.g., tenant_acme
```

---

## Changelog

### Version 1.0.0 (2026-02-27)
- Initial release
- 6-step automated provisioning workflow
- Organization record creation in public schema
- Tenant schema creation with migration support
- Admin user creation with magic link authentication
- Encryption key generation (integration + Shopify)
- Default settings configuration
- Dry-run mode for preview
- Rollback handling on failure
- Input validation (slug format, email format)
- Comprehensive error messages and troubleshooting
