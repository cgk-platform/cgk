# Tenant Onboarding Failure Modes & Recovery Procedures

**Date**: 2026-02-28
**Status**: ⚠️ **CRITICAL ISSUES IDENTIFIED** - 8 robustness issues in tenant creation flow

---

## Executive Summary

The tenant onboarding flow (`createOrganization()` → `createTenantSchema()` → migrations) has **8 critical robustness issues** that can leave the system in an inconsistent state. This document catalogs all failure modes, their impacts, and recovery procedures.

**Current Risk Level**: 🔴 **HIGH**
- Multi-step operations without transaction boundaries
- No rollback mechanism for partial failures
- Manual cleanup required for failed tenant creation

---

## Critical Issues

### Issue 1: No Transaction Boundaries ❌

**Problem**: Multi-step operations are not wrapped in a transaction:
1. INSERT into `public.organizations` (separate commit)
2. CREATE SCHEMA `tenant_{slug}` (separate commit)
3. Run 116 migrations (116 separate commits)
4. INSERT into `public.user_organizations` (separate commit)
5. UPDATE `onboarding_sessions` (separate commit)

**Impact**: If any step fails, previous steps are already committed.

**Example Failure**:
```
Step 1: ✅ Organization created (id: abc-123)
Step 2: ✅ Schema created (tenant_mybrand)
Step 3: ❌ Migration #45 fails (syntax error in SQL)
Result: Organization exists, schema exists with 44 tables, 72 tables missing
```

**Why This Happens**: Vercel Postgres uses connection pooling which doesn't support distributed transactions.

**Workaround Needed**: Application-level cleanup on failure

---

### Issue 2: No Rollback Mechanism ❌

**Problem**: No automatic cleanup when tenant creation fails.

**Current Behavior**:
```typescript
// If this fails...
await createTenantSchema(slug)

// ...organization INSERT is already committed
// No cleanup executed
```

**What Gets Left Behind**:
- ✅ Organization record in `public.organizations`
- ✅ Partial tenant schema with some tables
- ❌ User-organization relationship not created
- ❌ Session not updated with org ID

**Recovery**: Manual database cleanup required

---

### Issue 3: Not Idempotent ❌

**Problem**: Cannot safely retry after failure.

**Current Flow**:
```typescript
// First attempt
await createOrganization({ slug: 'mybrand', ... })
// Fails at migration #45

// Retry attempt
await createOrganization({ slug: 'mybrand', ... })
// ❌ Error: "Slug already taken" (UNIQUE constraint on organizations.slug)
```

**Why Retry Fails**:
1. Organization INSERT succeeded in first attempt
2. Slug is now taken
3. Second attempt checks slug availability
4. Returns error before attempting to resume migrations

**What We Need**: Idempotency check that:
- Detects existing organization
- Checks if schema is complete
- Resumes from last successful migration if incomplete

---

### Issue 4: Orphaned Data Possible ❌

**Problem**: Organization can exist without proper setup.

**Failure Scenario 1**: Schema creation fails
```
✅ public.organizations record exists
❌ No tenant schema created
❌ No user-organization relationship
❌ Session doesn't reference org
```

**Failure Scenario 2**: addUserToOrganization() fails
```
✅ public.organizations record exists
✅ Tenant schema with all 397 tables
❌ No user-organization relationship (orphaned org)
✅ Session updated with org ID
```

**Impact**:
- Super admin created the org but isn't listed as owner
- Cannot access org through UI
- Manual database fix required

---

### Issue 5: Partial Schema Risk ❌

**Problem**: With 116 migrations, any can fail leaving schema in inconsistent state.

**Migration Failure Points**:
- Syntax errors in SQL
- Missing table dependencies
- Type mismatches
- Constraint violations
- Neon connection timeout
- Network errors

**Example Partial Schema**:
```
Migrations 001-044: ✅ Applied (44 tables created)
Migration 045:      ❌ Failed (CREATE TABLE products ...)
Migrations 046-116: ⏸️ Not attempted (72 tables missing)

Result: Tenant schema exists but is unusable
- Orders table references products (doesn't exist)
- Foreign key errors on queries
- Application crashes when accessing tenant
```

**Current Behavior**: Execution stops at first failure (fail-fast)
**Risk**: No mechanism to resume from failed migration

---

### Issue 6: Race Conditions ❌

**Problem**: Concurrent requests can attempt to create same slug.

**Race Condition Window**:
```typescript
// Request A                          // Request B
isSlugAvailable('mybrand')            isSlugAvailable('mybrand')
// ✅ Returns true                     // ✅ Returns true
INSERT INTO organizations...          INSERT INTO organizations...
// ✅ Succeeds                         // ❌ Fails (UNIQUE constraint)
```

**Timeline**:
```
T0: Request A checks slug availability → TRUE
T1: Request B checks slug availability → TRUE
T2: Request A inserts organization → SUCCESS
T3: Request B inserts organization → UNIQUE CONSTRAINT VIOLATION
```

**Impact**: Request B fails even though slug was "available" during check

**Mitigation**: Database-level UNIQUE constraint prevents data corruption, but poor UX

---

### Issue 7: Session Decoupling ❌

**Problem**: Organization and session can get out of sync.

**Scenario**:
```typescript
await createOrganization(...)  // ✅ Succeeds
await addUserToOrganization()  // ✅ Succeeds
await updateSession(orgId)     // ❌ Fails (network error, DB timeout, etc.)
```

**Result**:
- ✅ Organization fully created
- ✅ User is owner
- ❌ Session doesn't know org ID
- ❌ Frontend shows "no organization" state
- ❌ User can't access the org they just created

**Recovery**: Manual session update or user re-login

---

### Issue 8: No Cleanup on Failure ❌

**Problem**: Failed tenant creation leaves database in dirty state.

**What Remains After Failure**:
1. **Organization record** in `public.organizations`
2. **Partial tenant schema** (e.g., `tenant_mybrand` with 44/397 tables)
3. **Migration tracking records** in `tenant_mybrand.schema_migrations`
4. **Potentially user-organization record** (if failure happened later)

**Manual Cleanup Required**:
```sql
-- Must be done manually by super admin
DROP SCHEMA IF EXISTS tenant_mybrand CASCADE;
DELETE FROM public.organizations WHERE slug = 'mybrand';
DELETE FROM public.user_organizations WHERE organization_id = '...';
UPDATE onboarding_sessions SET organization_id = NULL WHERE organization_id = '...';
```

**Risk**: Admin must remember ALL places to clean up

---

## Failure Mode Catalog

### FM-01: Organization INSERT Fails

**Likelihood**: Low
**Cause**: Database constraint violation, network error
**State**:
- ❌ No organization created
- ❌ No schema created

**Recovery**: Retry operation (safe)

---

### FM-02: Schema Creation Fails

**Likelihood**: Very Low
**Cause**: Database permission error, invalid slug format
**State**:
- ✅ Organization exists in `public.organizations`
- ❌ No schema created

**Recovery**:
```sql
-- Delete organization and retry
DELETE FROM public.organizations WHERE slug = 'mybrand';
```

---

### FM-03: Migration #N Fails (Most Common)

**Likelihood**: Medium
**Cause**: SQL syntax error, missing dependency, type mismatch, network timeout
**State**:
- ✅ Organization exists
- ✅ Schema exists with tables 001 to N-1
- ❌ Migration N partially applied or failed
- ❌ Migrations N+1 to 116 not applied

**Recovery**:
```sql
-- Drop everything and retry
DROP SCHEMA IF EXISTS tenant_mybrand CASCADE;
DELETE FROM public.organizations WHERE slug = 'mybrand';
```

**Better Solution** (needs implementation):
```bash
# Resume from last successful migration
npx @cgk-platform/cli migrate:resume mybrand
```

---

### FM-04: addUserToOrganization() Fails

**Likelihood**: Low
**Cause**: Invalid user ID, database error
**State**:
- ✅ Organization exists with all 397 tables
- ❌ No user-organization relationship

**Recovery**:
```sql
-- Manually create user-organization relationship
INSERT INTO public.user_organizations (user_id, organization_id, role)
VALUES ('user-uuid', 'org-uuid', 'owner');
```

---

### FM-05: updateSession() Fails

**Likelihood**: Low
**Cause**: Session already expired, database error
**State**:
- ✅ Organization fully created
- ✅ User is owner
- ❌ Session doesn't reference org

**Recovery**:
```sql
-- Update session manually
UPDATE onboarding_sessions
SET organization_id = 'org-uuid'
WHERE id = 'session-id';
```

**Or**: User can log out and back in to get new session with org

---

### FM-06: Concurrent Slug Creation

**Likelihood**: Low (requires simultaneous requests)
**Cause**: Race condition between availability check and INSERT
**State**:
- ✅ First request succeeds
- ❌ Second request fails with "Slug already taken"

**Recovery**: Second request retries with different slug (handled by UI)

---

## Recovery Procedures

### Procedure 1: Full Cleanup and Retry

**When to Use**: Any failure during tenant creation

**Steps**:
```bash
# 1. Connect to database
psql $DATABASE_URL

# 2. Find organization ID
SELECT id, slug, status FROM public.organizations WHERE slug = 'mybrand';

# 3. Drop tenant schema (if exists)
DROP SCHEMA IF EXISTS tenant_mybrand CASCADE;

# 4. Delete organization
DELETE FROM public.organizations WHERE id = 'org-uuid';

# 5. Delete user-organization relationships
DELETE FROM public.user_organizations WHERE organization_id = 'org-uuid';

# 6. Clear session
UPDATE onboarding_sessions
SET organization_id = NULL
WHERE organization_id = 'org-uuid';

# 7. Retry tenant creation via UI
```

---

### Procedure 2: Resume Partial Migration (Manual)

**When to Use**: Schema exists but migrations incomplete

**Steps**:
```bash
# 1. Check which migrations are applied
psql $DATABASE_URL -c "
  SELECT version, name, applied_at
  FROM tenant_mybrand.schema_migrations
  ORDER BY version;
"

# 2. Find missing migrations
cd packages/db/src/migrations/tenant
ls -1 *.sql | wc -l  # Should be 116

# 3. Run missing migrations manually
psql $DATABASE_URL -c "\
  SET search_path TO tenant_mybrand; \
  $(cat packages/db/src/migrations/tenant/045_*.sql)
"

# 4. Record migration in tracking table
psql $DATABASE_URL -c "
  INSERT INTO tenant_mybrand.schema_migrations (version, name, applied_at)
  VALUES ('045', '045_migration_name', NOW());
"

# 5. Repeat for all missing migrations
```

---

### Procedure 3: Fix Orphaned Organization (No Owner)

**When to Use**: Organization exists but user isn't owner

**Steps**:
```bash
# 1. Find user ID
psql $DATABASE_URL -c "
  SELECT id, email FROM public.users WHERE email = 'admin@example.com';
"

# 2. Find organization ID
psql $DATABASE_URL -c "
  SELECT id FROM public.organizations WHERE slug = 'mybrand';
"

# 3. Create user-organization relationship
psql $DATABASE_URL -c "
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES ('user-uuid', 'org-uuid', 'owner')
  ON CONFLICT DO NOTHING;
"
```

---

### Procedure 4: Fix Session Mismatch

**When to Use**: Session doesn't reference organization after creation

**Steps**:
```bash
# 1. Find session ID (from browser cookie or database)
psql $DATABASE_URL -c "
  SELECT id, user_id, organization_id
  FROM onboarding_sessions
  WHERE user_id = 'user-uuid'
  ORDER BY created_at DESC
  LIMIT 1;
"

# 2. Update session with correct org ID
psql $DATABASE_URL -c "
  UPDATE onboarding_sessions
  SET organization_id = 'org-uuid'
  WHERE id = 'session-id';
"

# 3. User refreshes browser to load new session state
```

---

## Recommended Fixes (Implementation Priority)

### Priority 1: Add Idempotency Check (1 hour)

**File**: `packages/onboarding/src/organization.ts`

```typescript
export async function createOrganization(params: CreateOrgParams) {
  validateTenantSlug(params.slug)

  // NEW: Check if organization already exists
  const existing = await getOrganizationBySlug(params.slug)
  if (existing) {
    // Check if schema is complete
    const schemaExists = await tenantSchemaExists(params.slug)
    const migrationStatus = await getMigrationStatus(`tenant_${params.slug}`)

    if (schemaExists && migrationStatus.pending.length === 0) {
      // Fully created - safe to return
      return { id: existing.id, slug: existing.slug }
    } else {
      // Partial state - needs manual intervention
      throw new Error(
        `Organization '${params.slug}' exists but schema is incomplete. ` +
        `${migrationStatus.pending.length} migrations pending. ` +
        `Run: npx @cgk-platform/cli migrate:resume ${params.slug}`
      )
    }
  }

  // Continue with normal creation...
}
```

---

### Priority 2: Add Cleanup Function (1 hour)

**File**: `packages/onboarding/src/cleanup.ts` (new file)

```typescript
export async function cleanupFailedTenant(
  slug: string,
  organizationId?: string
): Promise<void> {
  console.log(`Cleaning up failed tenant creation: ${slug}`)

  // 1. Drop tenant schema (CASCADE removes all tables)
  try {
    await sql.query(`DROP SCHEMA IF EXISTS tenant_${slug} CASCADE`)
    console.log(`✅ Dropped schema tenant_${slug}`)
  } catch (error) {
    console.error(`Failed to drop schema:`, error)
  }

  if (!organizationId) return

  // 2. Delete organization
  try {
    await sql`DELETE FROM public.organizations WHERE id = ${organizationId}`
    console.log(`✅ Deleted organization ${organizationId}`)
  } catch (error) {
    console.error(`Failed to delete organization:`, error)
  }

  // 3. Delete user-organization relationships
  try {
    await sql`
      DELETE FROM public.user_organizations
      WHERE organization_id = ${organizationId}
    `
    console.log(`✅ Deleted user-organization relationships`)
  } catch (error) {
    console.error(`Failed to delete relationships:`, error)
  }

  // 4. Clear session references
  try {
    await sql`
      UPDATE onboarding_sessions
      SET organization_id = NULL
      WHERE organization_id = ${organizationId}
    `
    console.log(`✅ Cleared session references`)
  } catch (error) {
    console.error(`Failed to clear sessions:`, error)
  }

  console.log(`✅ Cleanup complete for ${slug}`)
}
```

---

### Priority 3: Wrap createOrganization in Try/Catch (30 minutes)

**File**: `packages/onboarding/src/organization.ts`

```typescript
export async function createOrganization(params: CreateOrgParams) {
  let createdOrgId: string | undefined

  try {
    // Check for existing (idempotency)
    const existing = await getOrganizationBySlug(params.slug)
    if (existing) {
      // ... idempotency logic from Priority 1 ...
    }

    // Create organization
    const orgResult = await sql`
      INSERT INTO public.organizations (slug, name, ...)
      VALUES (${params.slug}, ${params.name}, ...)
      RETURNING id
    `
    createdOrgId = orgResult.rows[0]?.id

    if (!createdOrgId) {
      throw new Error('Failed to create organization')
    }

    // Create tenant schema and run migrations
    await createTenantSchema(params.slug)

    return { id: createdOrgId, slug: params.slug }

  } catch (error) {
    console.error(`Tenant creation failed for ${params.slug}:`, error)

    // Cleanup on failure
    if (createdOrgId) {
      await cleanupFailedTenant(params.slug, createdOrgId)
    }

    throw error
  }
}
```

---

### Priority 4: Create migrate:resume Command (2 hours)

**File**: `packages/cli/src/commands/migrate-resume.ts` (new file)

```typescript
import { getMigrationStatus, runTenantMigrations } from '@cgk-platform/db/migrations'

export async function migrateResume(tenantSlug: string): Promise<void> {
  const schemaName = `tenant_${tenantSlug}`

  console.log(`Checking migration status for ${schemaName}...`)

  const status = await getMigrationStatus(schemaName)

  if (status.pending.length === 0) {
    console.log(`✅ All migrations already applied (${status.applied.length} total)`)
    return
  }

  console.log(`Found ${status.pending.length} pending migrations`)
  console.log(`Applied: ${status.applied.length}`)
  console.log(`Pending: ${status.pending.length}`)

  console.log(`\nResuming migrations from #${status.applied.length + 1}...`)

  const results = await runTenantMigrations(tenantSlug, {
    skipApplied: true,
    stopOnError: true
  })

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(`\n✅ Applied ${successful} migrations`)

  if (failed > 0) {
    console.error(`❌ ${failed} migrations failed`)
    process.exit(1)
  }
}
```

---

### Priority 5: Add Advisory Locks for Concurrent Creation (1 hour)

**File**: `packages/onboarding/src/organization.ts`

```typescript
async function acquireSlugLock(slug: string): Promise<void> {
  // PostgreSQL advisory lock based on slug hash
  const lockId = hashStringToInt(slug)
  await sql`SELECT pg_advisory_lock(${lockId})`
}

async function releaseSlugLock(slug: string): Promise<void> {
  const lockId = hashStringToInt(slug)
  await sql`SELECT pg_advisory_unlock(${lockId})`
}

export async function createOrganization(params: CreateOrgParams) {
  await acquireSlugLock(params.slug)

  try {
    // ... creation logic ...
  } finally {
    await releaseSlugLock(params.slug)
  }
}
```

---

## Testing Recommendations

### Test Case 1: Simulated Migration Failure

```typescript
// In test: Create migration that intentionally fails
const badMigration = `
  CREATE TABLE test_table (
    id UUID PRIMARY KEY,
    invalid_reference UUID REFERENCES non_existent_table(id)
  );
`

// Attempt tenant creation
// Verify cleanup runs
// Verify retry works after fixing migration
```

### Test Case 2: Concurrent Slug Creation

```typescript
// Launch 2 simultaneous requests for same slug
await Promise.all([
  createOrganization({ slug: 'test' }),
  createOrganization({ slug: 'test' })
])

// Verify: Only 1 succeeds, other gets "Slug taken" error
// Verify: No partial state for failed request
```

### Test Case 3: Network Interruption

```typescript
// Simulate network timeout during migration #50
// Verify: Can detect partial state
// Verify: Can resume from migration #51
```

---

## Monitoring Recommendations

### Metrics to Track

1. **Tenant creation success rate**
   - Target: >99%
   - Alert if <95%

2. **Average creation time**
   - Baseline: ~30s for 116 migrations
   - Alert if >60s

3. **Failed tenant cleanup count**
   - Count of manual cleanup operations required
   - Target: 0 per week

4. **Migration failure points**
   - Track which migrations fail most often
   - Fix problematic migrations

---

## Conclusion

The tenant onboarding flow has **8 critical robustness issues** that can leave the system in an inconsistent state. The recommended fixes (Priorities 1-5) will take approximately **6-7 hours** to implement and will provide:

- ✅ Idempotency (safe to retry)
- ✅ Automatic cleanup on failure
- ✅ Migration resume capability
- ✅ Race condition prevention
- ✅ Better error messages

**Current Status**: 🔴 **HIGH RISK** - Manual cleanup required for failures
**After Fixes**: 🟢 **LOW RISK** - Automatic recovery, safe retries

---

**Document Version**: 1.0
**Last Updated**: February 28, 2026
**Author**: Claude Sonnet 4.5
**Reviewed By**: Mr. Tinkleberry
