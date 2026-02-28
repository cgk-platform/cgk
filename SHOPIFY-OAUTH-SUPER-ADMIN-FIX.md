# Shopify OAuth Super Admin Fix

**Issue**: Super admin getting "Tenant not found" error when trying to connect Shopify

**Error Messages**:
- `Schema from context store: NONE - will query public schema!`
- `Invalid tenant slug "5cb87b13-3b13-4400-9542-53c8b8d12cb8"`
- `"error": "Tenant not found"`

---

## Root Cause

Super admins are **platform-level** users without a default tenant/organization. The Shopify OAuth flow requires a tenant context to work because:

1. Shopify connections are **per-tenant** (each brand has its own Shopify store)
2. The middleware tries to set `x-tenant-slug` header from the JWT
3. Super admin JWTs don't have `org` or `orgId` fields
4. The Shopify OAuth route requires `x-tenant-slug` to be present

---

## Solution Options

### Option 1: Add Super Admin to an Organization (RECOMMENDED)

Add your super admin user to at least one organization so you can access tenant-specific features.

**Steps**:

```bash
# 1. Get your super admin user ID and email
psql $DATABASE_URL << 'EOF'
SELECT id, email FROM public.users WHERE is_super_admin = true;
EOF
# Copy the user ID

# 2. Get the organization you want to connect Shopify to
psql $DATABASE_URL << 'EOF'
SELECT id, slug, name FROM public.organizations;
EOF
# Copy the organization ID and slug you want to use

# 3. Add yourself as a member of that organization
psql $DATABASE_URL << 'EOF'
INSERT INTO public.user_organizations (user_id, organization_id, role)
VALUES (
  'your-user-id-here',
  'org-id-here',
  'owner'
)
ON CONFLICT (user_id, organization_id) DO UPDATE
SET role = 'owner';
EOF

# 4. Log out and log back in
# Your JWT will now include the organization context
```

**Example**:
```sql
-- If your super admin user ID is: abc-123
-- And you want to add to organization "meliusly": def-456

INSERT INTO public.user_organizations (user_id, organization_id, role)
VALUES (
  'abc-123',
  'def-456',
  'owner'
)
ON CONFLICT (user_id, organization_id) DO UPDATE
SET role = 'owner';
```

---

### Option 2: Use Impersonation Feature

If you want to keep your super admin account separate and access tenants on-demand:

**In Orchestrator App**:

1. Navigate to: `https://cgk-orchestrator.vercel.app/platform/users`
2. Find a user who is a member of the organization you want to access
3. Click "Impersonate" button
4. You'll get a new JWT with that user's tenant context
5. Navigate to admin app: `https://cgk-admin.vercel.app`
6. You'll now have tenant context and can connect Shopify

**To stop impersonation**: Click "End Impersonation" in the header

---

### Option 3: Switch Tenant Context via API (If Already Member)

If you're already a member of multiple organizations, use the tenant switcher:

**In Admin App UI**:
- Look for the tenant switcher in the header (top-right)
- Click it and select the tenant you want to work with
- The page will reload with the new tenant context

**Via API** (manual):
```bash
# Get your current token from browser cookies
# Then call the switch API:

curl -X POST https://cgk-admin.vercel.app/api/auth/context/switch \
  -H "Cookie: token=your-token-here" \
  -H "Content-Type: application/json" \
  -d '{"targetTenantSlug": "meliusly"}'
```

---

## Verification

After applying any of the above solutions, verify your tenant context:

**1. Check your JWT payload**:
```javascript
// In browser console on admin app:
const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1]
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]))
  console.log('JWT Payload:', payload)
  console.log('Org ID:', payload.orgId)
  console.log('Org Slug:', payload.org)
}
```

**Expected output**:
```javascript
{
  sub: "your-user-id",
  orgId: "some-org-uuid",
  org: "meliusly",  // ← This should be present!
  role: "owner",
  sid: "session-id"
}
```

**2. Check headers in network tab**:
- Open DevTools → Network tab
- Navigate to any page in admin app
- Look at the request headers
- You should see:
  - `x-tenant-id: some-org-uuid`
  - `x-tenant-slug: meliusly` ← **This is required**

**3. Test Shopify OAuth**:
- Navigate to: `/admin/integrations/shopify-app`
- Enter shop domain: `meliusly.myshopify.com`
- Click "Connect to Shopify"
- Should redirect to Shopify (no "Tenant not found" error)

---

## Why This Happens

### Platform Architecture

The CGK platform has two types of users:

1. **Tenant Users** (regular admins):
   - Belong to one or more organizations
   - JWT includes `orgId` and `org` fields
   - Middleware sets `x-tenant-slug` header automatically
   - Can access tenant-specific features (Shopify, products, orders, etc.)

2. **Super Admins** (platform operators):
   - Platform-level access
   - Can manage all tenants via orchestrator
   - JWT doesn't include `orgId`/`org` by default
   - Need to select a tenant to access tenant-specific features

### Why Shopify Needs Tenant Context

Shopify connections are **per-tenant** because:
- Each brand/organization has its own Shopify store
- Shopify credentials are stored in the tenant's schema
- Product sync, order sync, etc. are tenant-specific
- Multiple tenants can have different Shopify stores

---

## Recommended Workflow for Super Admins

### For Development/Testing:
1. Add yourself as `owner` to a test tenant (Option 1)
2. This gives you full access to test tenant-specific features
3. Keep orchestrator app open in another tab for platform-level admin

### For Production Support:
1. Use impersonation feature (Option 2)
2. This keeps audit trail (logs show "Super Admin X impersonating User Y")
3. Auto-expires after configured time (default: 1 hour)
4. Can switch between tenants quickly

---

## Quick Fix (Copy-Paste)

**If you just want to connect Shopify ASAP**, run this:

```bash
# Set these variables
export SUPER_ADMIN_EMAIL="your-email@example.com"
export TARGET_ORG_SLUG="meliusly"  # or whichever tenant you want

# Run the fix
psql $DATABASE_URL << EOF
INSERT INTO public.user_organizations (user_id, organization_id, role)
SELECT
  u.id,
  o.id,
  'owner'
FROM public.users u
CROSS JOIN public.organizations o
WHERE u.email = '$SUPER_ADMIN_EMAIL'
  AND o.slug = '$TARGET_ORG_SLUG'
ON CONFLICT (user_id, organization_id) DO UPDATE
SET role = 'owner';
EOF

echo "✅ Done! Now log out and log back in to get new JWT with tenant context."
```

**Then**:
1. Log out of admin app
2. Log back in
3. You should now have tenant context
4. Try Shopify OAuth again

---

## Additional Debug Info

If you're still having issues after the fix:

**Check middleware logs**:
```bash
# In admin app logs, look for:
[SQL] Schema from context store: tenant_meliusly  # ← Should show tenant, not NONE
```

**Check database directly**:
```sql
-- Verify user-org relationship exists
SELECT
  u.email,
  o.slug,
  uo.role
FROM public.user_organizations uo
JOIN public.users u ON uo.user_id = u.id
JOIN public.organizations o ON uo.organization_id = o.id
WHERE u.email = 'your-email@example.com';

-- Should return at least one row
```

**Check JWT after re-login**:
```javascript
// Browser console:
const token = document.cookie.match(/token=([^;]+)/)?.[1]
const payload = JSON.parse(atob(token.split('.')[1]))
console.log(payload)

// Must have:
// - orgId: "some-uuid"
// - org: "tenant-slug"
```

---

**Fix Applied**: Add super admin to organization
**Time to Fix**: 1 minute
**Status**: Ready to test

---

Mr. Tinkleberry, the issue is that super admins don't have a default tenant context. Add yourself to an organization using the quick fix above, then log out/in and try Shopify OAuth again!
