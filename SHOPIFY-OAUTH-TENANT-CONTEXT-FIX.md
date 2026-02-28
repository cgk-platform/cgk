# Shopify OAuth Tenant Context Fix

**Issue**: Super admins getting `{"error":"Tenant not found"}` when trying to connect Shopify.

**Root Cause**: The `/api/admin/shopify-app/auth` route was in the `PUBLIC_PATHS` middleware list, causing middleware to skip setting the `x-tenant-slug` header from the JWT.

**Date Fixed**: 2026-02-28

---

## What Was Fixed

### 1. Middleware Change

**File**: `apps/admin/src/middleware.ts`

**Problem**: Both `/api/admin/shopify-app/auth` and `/callback` were in `PUBLIC_PATHS`, causing middleware to skip authentication/tenant context extraction.

**Fix**: Removed `/auth` from `PUBLIC_PATHS` (kept `/callback` as it's called by Shopify directly).

**Reason**:

- `/auth` is USER-INITIATED - super admin clicks "Connect Shopify" in our UI
- `/callback` is SHOPIFY-INITIATED - Shopify redirects back after OAuth approval

### 2. Enhanced Logging

**File**: `apps/admin/src/app/api/admin/shopify-app/auth/route.ts`

Added comprehensive logging to both GET and POST endpoints:

- Logs tenant context, user ID, user role
- Provides debug info in error responses
- Makes troubleshooting easier in production (check Vercel logs)

### 3. Test Suite

**File**: `apps/admin/src/app/api/admin/shopify-app/auth/__tests__/route.test.ts`

Created comprehensive test suite covering:

- Missing tenant context (the bug)
- Super admin with tenant context (the fix)
- Regular user with tenant membership
- Error handling

---

## How Tenant Context Flow Works Now

### For Super Admins:

1. **Login**: Super admin logs in → JWT created with `role: 'super_admin'`, NO tenant context yet
2. **Select Tenant**: Super admin uses SuperAdminTenantSelector dropdown → calls `/api/auth/context/switch` → new JWT with `org` and `orgId` fields
3. **Middleware**: Request to `/api/admin/shopify-app/auth` → middleware extracts `org` from JWT → sets `x-tenant-slug` header
4. **OAuth Route**: Route reads `x-tenant-slug` → initiates OAuth for that tenant → success!

### For Regular Users:

1. **Login**: User logs in → JWT created with `org` and `orgId` from their organization membership
2. **Middleware**: Request to `/api/admin/shopify-app/auth` → middleware extracts `org` from JWT → sets `x-tenant-slug` header
3. **OAuth Route**: Route reads `x-tenant-slug` → initiates OAuth → success!

---

## Testing Guide

### Manual Testing (Required Before Deployment)

#### Test 1: Super Admin with Tenant Context

1. Log in as super admin
2. **CRITICAL**: Select a tenant from SuperAdminTenantSelector dropdown (top-right)
3. Navigate to `/admin/integrations/shopify-app`
4. Enter shop domain (e.g., `test.myshopify.com`)
5. Click "Connect to Shopify"
6. **Expected**: Redirects to Shopify OAuth (no "Tenant not found" error)
7. **Check Vercel Logs**: Should see `[shopify-oauth] GET /api/admin/shopify-app/auth` with `tenantSlug: 'selected-tenant'`

#### Test 2: Super Admin WITHOUT Tenant Context

1. Log in as super admin
2. **DO NOT** select a tenant (or clear context via badge)
3. Navigate to `/admin/integrations/shopify-app`
4. Enter shop domain
5. Click "Connect to Shopify"
6. **Expected**: `{"error":"Tenant not found", "debug": {"message": "Super admins must select a tenant..."}}`

#### Test 3: Regular User with Tenant Membership

1. Log in as regular user (owner/admin role)
2. Navigate to `/admin/integrations/shopify-app`
3. Enter shop domain
4. Click "Connect to Shopify"
5. **Expected**: Redirects to Shopify OAuth (should work)

### Automated Testing

```bash
# Run test suite
pnpm test apps/admin/src/app/api/admin/shopify-app/auth/__tests__/route.test.ts

# Type check
cd apps/admin && pnpm typecheck

# Full build
cd apps/admin && pnpm build
```

---

## Debugging in Production

### Check Vercel Logs for Tenant Context

1. Go to Vercel → cgk-admin project → Logs
2. Filter for: `[shopify-oauth]`
3. Look for log entries like:

```json
{
  "message": "[shopify-oauth] GET /api/admin/shopify-app/auth",
  "tenantSlug": "meliusly", // Should be present!
  "userId": "user_123",
  "userRole": "super_admin"
}
```

If `tenantSlug` is `null`, the problem is:

- Super admin hasn't selected a tenant context
- JWT doesn't have `org` field (check auth cookie)
- Middleware isn't extracting tenant from JWT (check middleware logs)

### Check JWT Contents

In browser console:

```javascript
document.cookie.split('; ').find((c) => c.startsWith('auth_token='))
```

Decode the JWT at jwt.io - check for `org` and `orgId` fields.

### Check SuperAdminTenantSelector Visibility

1. Log in as super admin
2. Look for dropdown in top-right of admin UI
3. If not visible, check:
   - `userRole` prop passed to Header component
   - User actually has `role: 'super_admin'` in database
   - UI package built correctly (`pnpm --filter @cgk-platform/ui build`)

---

## Files Changed

| File                                                                    | Change                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| `apps/admin/src/middleware.ts`                                          | Removed `/api/admin/shopify-app/auth` from PUBLIC_PATHS |
| `apps/admin/src/app/api/admin/shopify-app/auth/route.ts`                | Added comprehensive logging and debug info              |
| `apps/admin/src/app/api/admin/shopify-app/auth/__tests__/route.test.ts` | NEW - Test suite to prevent regression                  |

---

## Related Documentation

- Original issue: `SHOPIFY-OAUTH-SUPER-ADMIN-FIX.md` (temporary SQL workaround)
- Super Admin Tenant Access plan: `.claude/plans/eager-yawning-wilkinson.md`
- Tenant isolation patterns: `.claude/knowledge-bases/multi-tenancy-patterns/README.md`

---

## Preventing Future Regressions

### Pre-commit Checks

- Test suite runs automatically on commit (via vitest if configured)
- TypeScript checks enforce header types

### Code Review Checklist

- [ ] Any route requiring tenant context is NOT in PUBLIC_PATHS
- [ ] Middleware sets `x-tenant-slug` for authenticated routes
- [ ] Routes check for tenant context and return 400 if missing
- [ ] Logs include tenant context for debugging

### Monitoring

- Track "Tenant not found" error rate in production logs
- Alert if error rate > 1% of Shopify OAuth attempts
- Monitor Vercel logs for missing `tenantSlug` in `[shopify-oauth]` entries

---

## FAQs

**Q: Why can't super admins access ALL tenants automatically?**
A: Explicit tenant selection provides:

- Clear audit trail (which tenant was accessed when)
- Intent confirmation (super admin consciously chooses context)
- Prevents accidental data mixing
- Industry standard (AWS, GCP, Azure all require explicit resource selection)

**Q: What if I want to quickly test multiple tenants?**
A: Use the SuperAdminTenantSelector dropdown - it remembers your last selection and allows fast switching.

**Q: Can I auto-assign super admins to all tenants?**
A: Technically yes (SQL fix in `SHOPIFY-OAUTH-SUPER-ADMIN-FIX.md`), but NOT recommended:

- Pollutes `user_organizations` table
- Doesn't scale (100 tenants = 100 rows per super admin)
- No audit trail of conscious access
- Tenant selector is cleaner and more maintainable

**Q: What about impersonation?**
A: Impersonation is for USER TESTING, not routine admin work. Use for:

- Reproducing user-reported bugs
- Testing user-specific permissions
- Compliance audits

For routine work (connecting Shopify, managing products, etc.), use tenant selector.
