# Phase 0X: Super Admin Authentication Fix - Implementation Summary

**Status**: ✅ COMPLETE (Awaiting Testing)
**Date**: 2026-02-27
**Blocking**: Phase 1F (Meliusly Storefront Creation)

---

## Problem Statement

Super admin users could not:
1. Access the organizations dropdown in Orchestrator (returned 403 error)
2. Access any tenant data (empty `auth.orgs` array)

### Root Causes

1. **Empty Organizations Dropdown**
   - `/api/organizations` endpoint checks `auth.role !== 'super_admin'` (line 14)
   - BUT `auth.role` comes from JWT, which didn't properly set super_admin role during login
   - Result: Super admin JWT had wrong role, failed permission check

2. **Cannot Access All Tenants**
   - `getAuthContextFromHeaders()` only populated `auth.orgs` from `user_organizations` table
   - Super admins with `users.role = 'super_admin'` were NOT in `user_organizations`
   - Result: Super admins saw empty `auth.orgs` array

3. **Session Creation Issue**
   - Sessions created with specific `organization_id` even for super admins
   - Super admins should have `organization_id = null` (not tied to single tenant)

---

## Implementation Details

### Files Modified

#### 1. `packages/auth/src/context.ts`

**Function**: `getAuthContextFromHeaders()` (lines 104-149)

**Changes**:
- Added user role query to determine if user is super admin
- Added conditional organization fetching:
  - Super admins: Fetch ALL organizations from `public.organizations`
  - Regular users: Fetch only memberships from `user_organizations`
- Set effective role to 'super_admin' when `users.role = 'super_admin'`

**Code**:
```typescript
// Determine effective role (super_admin always takes precedence)
const effectiveRole = user.role === 'super_admin' ? 'super_admin' : (role || user.role)

// Get organizations based on role
let orgs: OrgContext[]
if (user.role === 'super_admin') {
  // Super admins get ALL organizations
  const orgsResult = await sql`
    SELECT id, slug
    FROM public.organizations
    WHERE status != 'deleted'
    ORDER BY name ASC
  `
  orgs = orgsResult.rows.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    role: 'super_admin' as UserRole,
  }))
} else {
  // Regular users get only their memberships
  // ... existing query
}
```

---

#### 2. `packages/auth/src/session.ts`

**Function**: `createSession()` (lines 36-65)

**Changes**:
- Added user role query at start of function
- Force `orgId = null` for super admins (they don't belong to a single org)

**Code**:
```typescript
// Check if user is super admin - super admins should have null orgId
const userResult = await sql`
  SELECT role FROM public.users WHERE id = ${userId}
`
const user = userResult.rows[0] as { role: string } | undefined

// Force null orgId for super admins (they access all tenants)
if (user?.role === 'super_admin') {
  orgId = null
}
```

---

#### 3. `apps/orchestrator/src/app/api/auth/verify/route.ts`

**Function**: `POST /api/auth/verify` (lines 66-101)

**Changes**:
- Added super admin check after fetching user
- Conditional organization fetching:
  - Super admins: Query ALL organizations directly
  - Regular users: Use existing `getUserOrganizations()` helper
- Set `currentOrgId = null` and `currentRole = 'super_admin'` for super admins
- Ensures JWT contains correct role and all organizations

**Code**:
```typescript
if (user.role === 'super_admin') {
  // Super admins get ALL organizations
  const { sql: sqlClient } = await import('@cgk-platform/db')
  const orgsResult = await sqlClient`
    SELECT id, slug
    FROM public.organizations
    WHERE status != 'deleted'
    ORDER BY name ASC
  `
  orgs = orgsResult.rows.map((row: any) => ({
    id: row.id as string,
    slug: row.slug as string,
    role: 'super_admin' as const,
  }))
  currentOrgId = null
  currentOrgSlug = null
  currentRole = 'super_admin'
} else {
  // Regular users logic...
}
```

---

## Architecture Flow (After Fix)

### Super Admin Login Flow

```
1. User with users.role = 'super_admin' requests magic link
   ↓
2. Verify magic link → fetch user from database
   ↓
3. Check: user.role === 'super_admin'? YES
   ↓
4. Fetch ALL organizations (not just user_organizations)
   ↓
5. Set currentRole = 'super_admin'
   ↓
6. Create session with organization_id = null
   ↓
7. Create JWT with:
   - role: 'super_admin'
   - orgs: [ALL organizations with role 'super_admin']
   ↓
8. Return JWT in HTTP-only cookie
   ↓
9. Subsequent requests:
   - JWT decoded → auth.role = 'super_admin'
   - getAuthContextFromHeaders() checks users.role
   - Fetches ALL organizations
   - auth.orgs contains ALL orgs
   ↓
10. /api/organizations checks auth.role === 'super_admin'? PASS ✅
```

### Regular User Login Flow (Unchanged)

```
1. User with users.role = 'admin'/'member' requests magic link
   ↓
2. Verify magic link → fetch user from database
   ↓
3. Check: user.role === 'super_admin'? NO
   ↓
4. Fetch ONLY user_organizations memberships
   ↓
5. Set currentRole = first org's role
   ↓
6. Create session with organization_id = first org ID
   ↓
7. Create JWT with:
   - role: org-specific role
   - orgs: [only assigned orgs]
   ↓
8. /api/organizations checks auth.role === 'super_admin'? FAIL → 403 ✅
```

---

## Expected Outcomes

After implementing these changes, super admins will:

1. ✅ **Login successfully**
   - JWT contains `role: 'super_admin'`
   - JWT contains ALL organizations in `orgs` array
   - Session has `organization_id: null`

2. ✅ **Access organizations API**
   - GET `/api/organizations` returns 200 (not 403)
   - Response includes all organizations
   - User creation modal shows all orgs in dropdown

3. ✅ **Access any tenant**
   - Can switch to any tenant via tenant selector
   - `auth.orgs` includes all organizations
   - Can view tenant-specific data without permission errors

4. ✅ **Regular users unchanged**
   - Non-super admin users only see their org memberships
   - Non-super admin users get 403 on `/api/organizations`
   - JWT `orgs` array only includes explicit memberships

---

## Type Safety

All modified files pass TypeScript type checking:
- ✅ `pnpm --filter @cgk-platform/auth typecheck` - PASSED
- ✅ `cd apps/orchestrator && pnpm typecheck` - PASSED

---

## Testing Checklist

### 1. Super Admin Login Test

```bash
# 1. Verify user has super_admin role in database
psql $DATABASE_URL -c "SELECT id, email, role FROM public.users WHERE role = 'super_admin';"

# 2. Login as super admin via Orchestrator
# Browser: http://localhost:3000/login (orchestrator)
# Enter super admin credentials

# 3. Check JWT payload in browser DevTools
# Application → Cookies → auth-token
# Decode JWT at jwt.io - verify:
#   - role === 'super_admin'
#   - orgs array contains ALL organizations
```

**Expected Results**:
- [ ] JWT `role` field = `'super_admin'`
- [ ] JWT `orgs` array contains ALL organizations (not empty)
- [ ] Each org in array has `role: 'super_admin'`
- [ ] Session in database has `organization_id = NULL`

---

### 2. Organizations API Test

```bash
# 1. Open Orchestrator user creation page
# Browser: http://localhost:3000/users/new

# 2. Check network tab for /api/organizations request
# Should return 200 (not 403)

# 3. Verify dropdown shows all organizations
```

**Expected Results**:
- [ ] GET `/api/organizations` returns **200 OK** (not 403)
- [ ] Response body contains all organizations
- [ ] Organizations dropdown in user modal shows all orgs
- [ ] Can select any organization when creating a user

---

### 3. Tenant Access Test

```bash
# 1. Login as super admin
# 2. Open tenant selector (top-right of Orchestrator)
# 3. Verify list shows ALL tenants
# 4. Switch to any tenant
# 5. Navigate to tenant-specific pages (e.g., /organizations)
# 6. Verify no permission errors
```

**Expected Results**:
- [ ] Tenant selector shows ALL organizations
- [ ] Can switch to any tenant without errors
- [ ] After switching, can access tenant data
- [ ] No "Permission denied" or 403 errors
- [ ] `auth.orgs` in request context includes ALL orgs

---

### 4. Regular User Test (Regression Check)

```bash
# 1. Login as regular user (role: 'admin' or 'member')
# 2. Verify they ONLY see organizations they're members of
# 3. Try accessing /api/organizations (should 403)
```

**Expected Results**:
- [ ] JWT `orgs` array contains ONLY assigned orgs
- [ ] Tenant selector shows ONLY assigned orgs
- [ ] GET `/api/organizations` returns **403 Forbidden**
- [ ] Cannot access tenants they're not a member of
- [ ] No regression - regular users still work correctly

---

### 5. Database Verification

```sql
-- Check super admin session (should have null organization_id)
SELECT id, user_id, organization_id, expires_at
FROM public.sessions
WHERE user_id = (SELECT id FROM public.users WHERE role = 'super_admin')
ORDER BY created_at DESC
LIMIT 1;

-- Expected: organization_id = NULL

-- Check regular user session (should have specific org ID)
SELECT id, user_id, organization_id, expires_at
FROM public.sessions
WHERE user_id = (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)
ORDER BY created_at DESC
LIMIT 1;

-- Expected: organization_id = (some UUID)
```

**Expected Results**:
- [ ] Super admin session has `organization_id = NULL`
- [ ] Regular user session has `organization_id = <UUID>`

---

## Rollback Plan

If issues arise, revert these commits:
1. `packages/auth/src/context.ts` - revert `getAuthContextFromHeaders()`
2. `packages/auth/src/session.ts` - revert `createSession()`
3. `apps/orchestrator/src/app/api/auth/verify/route.ts` - revert POST handler

**Git commands**:
```bash
git diff HEAD packages/auth/src/context.ts
git diff HEAD packages/auth/src/session.ts
git diff HEAD apps/orchestrator/src/app/api/auth/verify/route.ts

# If needed to revert:
git checkout HEAD -- packages/auth/src/context.ts
git checkout HEAD -- packages/auth/src/session.ts
git checkout HEAD -- apps/orchestrator/src/app/api/auth/verify/route.ts
```

---

## Next Steps

After testing confirms fixes work:

1. ✅ **Mark Phase 0X as complete**
2. ✅ **Proceed to Phase 1F** - Create Meliusly Storefront App
3. ✅ **Update CLAUDE.md** - Remove Phase 0X blocker note
4. ✅ **Commit changes** with message:
   ```
   fix(auth): resolve super admin authentication issues

   - Super admins now have access to ALL organizations
   - Fixed /api/organizations 403 error for super admins
   - Session creation properly handles super admin context
   - JWT includes correct role and all orgs for super admins

   Fixes Phase 0X blocking issues.
   ```

---

## Related Files

- `packages/auth/src/context.ts` - Auth context extraction
- `packages/auth/src/session.ts` - Session management
- `packages/auth/src/jwt.ts` - JWT signing/verification (no changes needed)
- `apps/orchestrator/src/app/api/auth/verify/route.ts` - Login verification
- `apps/orchestrator/src/app/api/organizations/route.ts` - Organizations API

---

**Mr. Tinkleberry**, this implementation resolves the blocking Phase 0X issues. Super admins will now have full access to all tenants and the organizations dropdown will populate correctly. The changes are type-safe and preserve existing behavior for regular users.
