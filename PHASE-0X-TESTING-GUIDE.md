# Phase 0X: Super Admin Fix - Quick Testing Guide

**Purpose**: Verify super admin authentication works correctly after implementing fixes.

---

## Prerequisites

1. Database connection configured (`DATABASE_URL` in `.env.local`)
2. Orchestrator app running (`pnpm dev` in `apps/orchestrator`)
3. Super admin user exists in database

### Create Super Admin User (if needed)

```sql
-- Check if super admin exists
SELECT id, email, role FROM public.users WHERE role = 'super_admin';

-- If none exists, update an existing user:
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'your-email@example.com';

-- Or create new super admin:
INSERT INTO public.users (email, name, role, email_verified)
VALUES ('superadmin@example.com', 'Super Admin', 'super_admin', true)
RETURNING id, email, role;
```

---

## Test 1: Super Admin Login ✅

**Steps**:
1. Open http://localhost:3000/login (Orchestrator)
2. Enter super admin email
3. Check email for magic link
4. Click magic link to verify
5. Should redirect to dashboard

**Verify**:
- Open DevTools → Application → Cookies
- Find `auth-token` cookie
- Copy value and paste into https://jwt.io
- Check decoded payload:

```json
{
  "sub": "user-id-here",
  "email": "superadmin@example.com",
  "role": "super_admin",  // ← Should be 'super_admin'
  "orgs": [
    {
      "id": "org-1-id",
      "slug": "rawdog",
      "role": "super_admin"  // ← Should be 'super_admin'
    },
    {
      "id": "org-2-id",
      "slug": "meliusly",
      "role": "super_admin"  // ← Should be 'super_admin'
    }
    // ... all organizations
  ]
}
```

✅ **PASS**: JWT contains `role: "super_admin"` and `orgs` array has ALL organizations

❌ **FAIL**: JWT has wrong role OR `orgs` array is empty/incomplete

---

## Test 2: Organizations API ✅

**Steps**:
1. Stay logged in as super admin
2. Open http://localhost:3000/users/new (create user modal)
3. Open DevTools → Network tab
4. Look for `/api/organizations` request

**Verify**:
- Status: **200 OK** (not 403)
- Response body contains array of organizations
- UI dropdown shows all organizations

✅ **PASS**: API returns 200, dropdown shows all orgs

❌ **FAIL**: API returns 403 OR dropdown is empty

---

## Test 3: Tenant Switching ✅

**Steps**:
1. Stay logged in as super admin
2. Click tenant selector (top-right corner)
3. Verify list shows ALL tenants
4. Click a different tenant (e.g., switch from "Rawdog" to "Meliusly")
5. Navigate to `/organizations` page

**Verify**:
- Tenant selector shows ALL organizations
- Can switch without errors
- After switching, page loads correctly
- No 403 or permission errors

✅ **PASS**: Can switch to any tenant, no errors

❌ **FAIL**: Cannot see all tenants OR get permission errors

---

## Test 4: Regular User (Regression) ✅

**Steps**:
1. Logout from super admin
2. Login as regular user (role: 'admin' or 'member')
3. Open tenant selector
4. Try to access http://localhost:3000/api/organizations (in new tab)

**Verify**:
- Tenant selector shows ONLY assigned organizations (not all)
- `/api/organizations` returns **403 Forbidden**
- Cannot access tenants they're not a member of

✅ **PASS**: Regular users only see their orgs, API returns 403

❌ **FAIL**: Regular users see all orgs OR API returns 200

---

## Test 5: Database Check ✅

**Query**:
```sql
-- Check super admin session
SELECT
  s.id,
  s.user_id,
  s.organization_id,  -- Should be NULL for super admin
  u.email,
  u.role
FROM public.sessions s
JOIN public.users u ON u.id = s.user_id
WHERE u.role = 'super_admin'
  AND s.revoked_at IS NULL
  AND s.expires_at > NOW()
ORDER BY s.created_at DESC
LIMIT 1;
```

**Expected**:
```
user_id          | organization_id | email                  | role
---------------- | --------------- | ---------------------- | -----------
abc-123-def-456  | NULL            | superadmin@example.com | super_admin
```

✅ **PASS**: Super admin session has `organization_id = NULL`

❌ **FAIL**: Super admin session has specific org ID (not NULL)

---

## Quick Validation Checklist

Run through these quickly to verify all fixes:

- [ ] Super admin can login
- [ ] JWT contains `role: "super_admin"`
- [ ] JWT `orgs` array contains ALL organizations
- [ ] Session has `organization_id = NULL`
- [ ] `/api/organizations` returns 200 (not 403)
- [ ] Organizations dropdown shows all orgs
- [ ] Can switch to any tenant
- [ ] No permission errors when accessing tenant data
- [ ] Regular users still only see their assigned orgs
- [ ] Regular users get 403 on `/api/organizations`

---

## Troubleshooting

### Issue: JWT still has wrong role

**Fix**: Clear cookies and login again. Old JWT may be cached.

```javascript
// In browser console:
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
// Then reload and login again
```

---

### Issue: Organizations dropdown still empty

**Check**:
1. Network tab shows 403? → JWT issue, clear cookies and re-login
2. Network tab shows 200 but empty array? → Check database has orgs:
   ```sql
   SELECT COUNT(*) FROM public.organizations WHERE status != 'deleted';
   ```

---

### Issue: Cannot switch tenants

**Check**:
1. JWT `orgs` array in jwt.io - does it contain ALL orgs?
2. If no, clear cookies and re-login
3. If yes but still fails, check browser console for errors

---

## Success Criteria

**ALL checks must pass**:
- ✅ Super admin login works
- ✅ JWT contains correct role and all orgs
- ✅ Organizations API returns 200
- ✅ Organizations dropdown populates
- ✅ Can switch to any tenant
- ✅ Regular users unchanged (regression check)

---

**If ALL tests pass**: Phase 0X is complete, proceed to Phase 1F (Meliusly Storefront)

**If ANY test fails**: Review implementation, check logs, verify database state
