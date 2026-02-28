# Tenant Creation Guide

**Date**: 2026-02-28
**Version**: 1.0
**For**: CGK Platform Administrators

---

## Overview

This guide documents the complete process for creating new tenants (brands/organizations) in the CGK platform, including normal flow, error handling, validation steps, and recovery procedures.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Normal Creation Flow (Happy Path)](#normal-creation-flow-happy-path)
3. [Method 1: Via Orchestrator UI](#method-1-via-orchestrator-ui)
4. [Method 2: Via CLI](#method-2-via-cli)
5. [Validation Steps](#validation-steps)
6. [Error Scenarios & Recovery](#error-scenarios--recovery)
7. [Rollback Procedures](#rollback-procedures)
8. [Post-Creation Checklist](#post-creation-checklist)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before creating a new tenant, ensure:

- ✅ You have super admin access to the orchestrator app
- ✅ Database is accessible and healthy
- ✅ All migrations are up to date (run `npx @cgk-platform/cli migrate:auto`)
- ✅ Chosen slug is available and follows naming rules
- ✅ Creator/owner user exists in `public.users`

### Slug Naming Rules

**Valid slug format**: `^[a-z0-9_]+$`

- ✅ Valid: `mybrand`, `my_brand`, `brand_2024`, `rawdog`
- ❌ Invalid: `My-Brand`, `Brand Name`, `MYBRAND`, `my-brand`

**Length**: 3-50 characters

---

## Normal Creation Flow (Happy Path)

The tenant creation process involves 6 steps:

### Step-by-Step Flow

```
1. User submits tenant creation request
   ↓
2. Validate input data (slug, name, email)
   ↓
3. Check slug availability (UNIQUE constraint)
   ↓
4. Create organization record in public.organizations
   ↓
5. Create tenant schema (tenant_{slug})
   ↓
6. Run all 116 migrations sequentially
   ↓
7. Add creator as organization owner
   ↓
8. Update onboarding session with organization ID
   ↓
9. ✅ SUCCESS - Redirect to dashboard
```

### Expected Timeline

- **Step 1-4**: < 1 second
- **Step 5-6 (migrations)**: 20-40 seconds
- **Step 7-9**: < 1 second
- **Total**: ~30-45 seconds

---

## Method 1: Via Orchestrator UI

### Access the Onboarding Wizard

1. Log in to orchestrator as super admin
2. Navigate to: `/platform/brands/onboard`
3. You'll see a multi-step wizard

### Step 1: Basic Information

**URL**: `/platform/brands/onboard/step-1`

**Form Fields**:
- **Brand Name** (required): Display name (e.g., "My Brand")
- **Slug** (required): URL-safe identifier (e.g., "my_brand")
- **Primary Contact Email** (required): Admin email
- **Primary Contact Name** (optional): Admin name

**Validation**:
- Slug must be unique (checked in real-time)
- Slug must match `^[a-z0-9_]+$` pattern
- Email must be valid format

**Click**: "Continue" →

### Step 2: Review & Confirm

**URL**: `/platform/brands/onboard/step-2`

**Review**:
- Organization details
- Estimated setup time: ~30 seconds
- Migration count: 116 migrations

**Click**: "Create Organization" →

### Step 3: Creation in Progress

**What Happens**:
1. Loading spinner shows progress
2. Organization created
3. Schema created
4. Migrations running (progress may not be visible)
5. Success message

**On Success**:
- ✅ Redirects to organization dashboard
- ✅ Shows success notification
- ✅ Organization is accessible

**On Failure**:
- ❌ Shows error message
- ❌ May require manual cleanup (see Recovery section)

---

## Method 2: Via CLI

### Create Tenant Command

```bash
npx @cgk-platform/cli tenant:create <slug> [options]
```

**Options**:
- `--name <name>` - Organization name (default: slug capitalized)
- `--email <email>` - Primary contact email (required)
- `--skip-migrations` - Create schema without running migrations (NOT RECOMMENDED)

**Example**:
```bash
# Full creation with migrations
npx @cgk-platform/cli tenant:create my_brand \
  --name "My Brand" \
  --email "admin@mybrand.com"

# Check status after creation
npx @cgk-platform/cli tenant:health my_brand
```

### CLI Output

```
Creating tenant: my_brand
✓ Validating slug format
✓ Checking slug availability
✓ Creating organization record
✓ Creating tenant schema (tenant_my_brand)
Running migrations...
  ✓ 001_initial_schema.sql
  ✓ 002_add_customers.sql
  ...
  ✓ 116_latest_migration.sql
✓ All 116 migrations applied
✓ Created user-organization relationship
✅ Tenant created successfully!

Organization ID: abc-123-def-456
Slug: my_brand
Schema: tenant_my_brand
Tables: 397
```

---

## Validation Steps

### Immediate Post-Creation Validation

Run the health check command:

```bash
npx @cgk-platform/cli tenant:health my_brand
```

**Expected Output**:
```
🏥 Tenant Health Check: my_brand

✅ Organization: Organization exists: My Brand
✅ Schema: Schema 'tenant_my_brand' exists
✅ Migrations: All migrations applied (116/116)
✅ Tables: All 397 tables present
✅ Foreign Keys: 245 foreign keys defined
✅ User Access: 1 user(s) have access
✅ Query Test: Sample query successful (orders table)

✅ Health check passed
```

### Manual Verification

```sql
-- 1. Check organization exists
SELECT id, slug, name, status, created_at
FROM public.organizations
WHERE slug = 'my_brand';

-- 2. Check schema exists
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'tenant_my_brand';

-- 3. Check migrations applied
SELECT COUNT(*) FROM tenant_my_brand.schema_migrations;
-- Expected: 116

-- 4. Check table count
SELECT COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'tenant_my_brand'
AND table_type = 'BASE TABLE';
-- Expected: 397

-- 5. Check user is owner
SELECT u.email, uo.role
FROM public.user_organizations uo
JOIN public.users u ON uo.user_id = u.id
JOIN public.organizations o ON uo.organization_id = o.id
WHERE o.slug = 'my_brand';
-- Expected: At least 1 row with role = 'owner'
```

---

## Error Scenarios & Recovery

### Error 1: "Slug already taken"

**Cause**: Organization with this slug already exists

**Check**:
```sql
SELECT id, slug, name, status
FROM public.organizations
WHERE slug = 'my_brand';
```

**If organization exists but incomplete**:
```bash
# Run health check
npx @cgk-platform/cli tenant:health my_brand

# If schema missing or migrations incomplete, clean up and retry
```

**If organization is valid**:
- Choose a different slug

---

### Error 2: "Migration #N failed"

**Example**:
```
Running migrations...
  ✓ 001_initial_schema.sql
  ✓ 002_add_customers.sql
  ...
  ✓ 044_analytics.sql
  ✗ 045_products_table.sql (ERROR: syntax error at line 15)
```

**Impact**:
- Organization created
- Schema exists with tables 001-044
- Tables 045-116 missing (72 tables)

**Recovery Option 1** (Clean slate):
```bash
# Drop everything and start over
psql $DATABASE_URL << EOF
  DROP SCHEMA IF EXISTS tenant_my_brand CASCADE;
  DELETE FROM public.organizations WHERE slug = 'my_brand';
  DELETE FROM public.user_organizations WHERE organization_id IN (
    SELECT id FROM public.organizations WHERE slug = 'my_brand'
  );
EOF

# Fix the problematic migration file
# Then retry tenant creation
```

**Recovery Option 2** (Resume migrations) - **NOT YET IMPLEMENTED**:
```bash
# Would resume from last successful migration
npx @cgk-platform/cli migrate:resume my_brand
```

---

### Error 3: "User not found"

**Cause**: The email provided doesn't match any user in `public.users`

**Check**:
```sql
SELECT id, email, status
FROM public.users
WHERE email = 'admin@mybrand.com';
```

**Fix**:
```sql
-- If user doesn't exist, create them first
INSERT INTO public.users (email, name, status, email_verified)
VALUES ('admin@mybrand.com', 'Admin Name', 'active', true);

-- Then retry tenant creation
```

---

### Error 4: "Database connection timeout"

**Cause**: Network issue, database overloaded, or migration taking too long

**Symptoms**:
- Creation process hangs
- Timeout error after 60+ seconds
- Partial schema may exist

**Recovery**:
```bash
# 1. Check database health
npx @cgk-platform/cli doctor

# 2. Check if tenant was partially created
npx @cgk-platform/cli tenant:health my_brand

# 3. If partial, clean up and retry
# (Use Error 2 recovery steps)
```

---

### Error 5: "User-organization relationship failed"

**Impact**:
- ✅ Organization fully created (all 397 tables)
- ❌ Creator not added as owner
- ❌ Cannot access organization

**Symptoms**:
- Tenant creation succeeds
- But user can't see organization in UI
- Health check shows "No users assigned"

**Recovery**:
```sql
-- Find organization ID
SELECT id FROM public.organizations WHERE slug = 'my_brand';

-- Find user ID
SELECT id FROM public.users WHERE email = 'admin@mybrand.com';

-- Manually create relationship
INSERT INTO public.user_organizations (user_id, organization_id, role)
VALUES ('user-uuid', 'org-uuid', 'owner')
ON CONFLICT DO NOTHING;
```

---

## Rollback Procedures

### Full Rollback (Delete Tenant)

**Use case**: Tenant creation failed, want to start over

**⚠️ WARNING**: This permanently deletes all tenant data

```bash
# Connect to database
psql $DATABASE_URL

# Run rollback script
\i scripts/rollback-tenant.sql my_brand
```

**Manual rollback**:
```sql
-- 1. Find organization ID
SELECT id FROM public.organizations WHERE slug = 'my_brand';
-- Copy the ID

-- 2. Drop tenant schema (CASCADE removes all tables)
DROP SCHEMA IF EXISTS tenant_my_brand CASCADE;

-- 3. Delete organization
DELETE FROM public.organizations WHERE id = 'org-uuid';

-- 4. Delete user-organization relationships
DELETE FROM public.user_organizations WHERE organization_id = 'org-uuid';

-- 5. Clear onboarding sessions
UPDATE onboarding_sessions
SET organization_id = NULL
WHERE organization_id = 'org-uuid';

-- 6. Verify cleanup
SELECT COUNT(*) FROM information_schema.schemata
WHERE schema_name = 'tenant_my_brand';
-- Expected: 0

SELECT COUNT(*) FROM public.organizations
WHERE slug = 'my_brand';
-- Expected: 0
```

---

## Post-Creation Checklist

After successfully creating a tenant, complete these steps:

### 1. Verify Health

```bash
npx @cgk-platform/cli tenant:health my_brand --verbose
```

### 2. Configure Tenant Settings

Navigate to admin portal as tenant admin:
- **URL**: `https://cgk-admin.vercel.app?tenant=my_brand`
- **Login**: Use the creator email

**Configure**:
- [ ] Brand profile (logo, colors, etc.)
- [ ] Payment settings (Stripe Connect)
- [ ] Email templates
- [ ] Feature flags
- [ ] Integration credentials (Shopify, etc.)

### 3. Test Core Functionality

- [ ] Create a test product
- [ ] Create a test order
- [ ] Test customer registration
- [ ] Test admin dashboard access
- [ ] Verify database queries work

### 4. Document Tenant Details

Record in internal documentation:
- Organization ID
- Slug
- Primary contact
- Creation date
- Purpose/use case
- Special configuration notes

---

## Troubleshooting

### Problem: Tenant creation takes > 60 seconds

**Possible causes**:
- Database under heavy load
- Network latency
- One migration is slow (e.g., large data import)

**Solutions**:
1. Check database performance metrics
2. Review migration SQL for slow queries
3. Consider splitting large migrations into smaller ones

---

### Problem: "UNIQUE constraint violation"

**Error message**: `duplicate key value violates unique constraint "organizations_slug_key"`

**Cause**: Slug already exists (race condition or retry without cleanup)

**Solution**:
```bash
# Check if organization exists
psql $DATABASE_URL -c "SELECT * FROM public.organizations WHERE slug = 'my_brand';"

# If it's a failed creation, clean up and retry
# (See Rollback Procedures)
```

---

### Problem: Tenant created but can't access admin portal

**Symptoms**:
- Tenant creation succeeded
- User can't log in or sees "No organization" error

**Debug steps**:
```bash
# 1. Check user-organization relationship
psql $DATABASE_URL -c "
  SELECT uo.role, u.email, o.slug
  FROM public.user_organizations uo
  JOIN public.users u ON uo.user_id = u.id
  JOIN public.organizations o ON uo.organization_id = o.id
  WHERE o.slug = 'my_brand';
"

# 2. If no results, user isn't linked (see Error 5 recovery)
```

---

### Problem: Some tables missing in tenant schema

**Symptoms**:
- Health check shows < 397 tables
- Application errors referencing missing tables

**Check which migrations failed**:
```sql
SELECT version, name, applied_at
FROM tenant_my_brand.schema_migrations
ORDER BY version;
```

**If migrations are incomplete**:
- Use Error 2 recovery procedure
- Clean up and retry OR
- Wait for `migrate:resume` command implementation

---

## Quick Reference Commands

```bash
# Create tenant (CLI)
npx @cgk-platform/cli tenant:create <slug> --name "Name" --email "email@example.com"

# Check tenant health
npx @cgk-platform/cli tenant:health <slug>

# List all tenants
npx @cgk-platform/cli tenant:list

# Full cleanup (manual)
psql $DATABASE_URL << EOF
  DROP SCHEMA IF EXISTS tenant_<slug> CASCADE;
  DELETE FROM public.organizations WHERE slug = '<slug>';
  DELETE FROM public.user_organizations WHERE organization_id IN (
    SELECT id FROM public.organizations WHERE slug = '<slug>'
  );
EOF
```

---

## Related Documentation

- [TENANT-ONBOARDING-FAILURE-MODES.md](./TENANT-ONBOARDING-FAILURE-MODES.md) - Detailed failure mode analysis
- [COMPREHENSIVE-DATABASE-AUDIT-ALL-APPS.md](./COMPREHENSIVE-DATABASE-AUDIT-ALL-APPS.md) - Full database audit
- [.claude/knowledge-bases/multi-tenancy-patterns/README.md](./.claude/knowledge-bases/multi-tenancy-patterns/README.md) - Multi-tenancy patterns

---

## Support

For issues not covered in this guide:
- Check application logs in orchestrator app
- Run database health check: `npx @cgk-platform/cli doctor`
- Review migration files in `packages/db/src/migrations/tenant/`
- Contact platform administrator

---

**Guide Version**: 1.0
**Last Updated**: February 28, 2026
**Author**: Claude Sonnet 4.5
**Reviewed By**: Mr. Tinkleberry
