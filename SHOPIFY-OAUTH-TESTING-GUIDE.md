# Shopify OAuth Testing Guide

**Date**: 2026-03-02
**Status**: Ready for testing

---

## Issue Fixed

**Problem**: Shopify OAuth was failing with `error=auth_failed` due to missing environment variables.

**Root Cause**: The admin app's OAuth initiation code requires `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`, but these were only configured in `apps/shopify-app/.env.local`, not in `apps/admin/.env.local`.

**Fix**: Added Shopify OAuth credentials to both local and Vercel environments.

---

## Changes Made

### 1. Local Environment (apps/admin/.env.local)

Added the following environment variables (copied from `apps/shopify-app/.env.local`):

```bash
# Shopify App OAuth Credentials (from CGK Platform app)
SHOPIFY_CLIENT_ID="<from apps/shopify-app/.env.local>"
SHOPIFY_CLIENT_SECRET="<from apps/shopify-app/.env.local>"
SHOPIFY_API_VERSION="2026-01"
SHOPIFY_WEBHOOK_SECRET="<same as SHOPIFY_CLIENT_SECRET>"
```

### 2. Vercel Environment

You manually added these variables via Vercel dashboard to all environments (production, preview, development).

### 3. Script for Future Reference

Created `scripts/add-shopify-oauth-to-vercel.sh` - uses environment variables (no hardcoded secrets) for security.

---

## Testing Steps

### 1. Test Locally (http://localhost:3200)

```bash
# 1. Ensure admin app is running
cd apps/admin
pnpm dev

# 2. Log in as super admin
# 3. Navigate to: http://localhost:3200/admin/integrations/shopify-app
# 4. Select tenant "meliusly" from SuperAdminTenantSelector (if not already selected)
# 5. Enter shop domain: "meliusly" (without .myshopify.com)
# 6. Click "Connect"
```

**Expected Behavior**:

- You should be redirected to Shopify's OAuth authorization page
- URL should look like: `https://meliusly.myshopify.com/admin/oauth/authorize?client_id=...&scope=...&redirect_uri=...&state=...`
- After authorizing, you should be redirected back to the admin app
- Connection should show as "Connected"

**If it fails**:

- Check browser console for errors
- Check server logs (terminal running `pnpm dev`)
- Verify tenant context is set (SuperAdminTenantSelector should show "meliusly")

---

### 2. Test on Production (https://cgk-admin.vercel.app)

**Note**: Production deployment must complete first (check Vercel dashboard).

```bash
# 1. Navigate to: https://cgk-admin.vercel.app/admin/integrations/shopify-app
# 2. Log in as super admin
# 3. Select tenant "meliusly"
# 4. Enter shop domain: "meliusly"
# 5. Click "Connect"
```

**Expected Behavior**: Same as local testing.

---

## Debugging

### Check Environment Variables Are Loaded

In your API route, add temporary logging:

```typescript
console.log('[debug] SHOPIFY_CLIENT_ID exists:', !!process.env.SHOPIFY_CLIENT_ID)
console.log('[debug] SHOPIFY_CLIENT_SECRET exists:', !!process.env.SHOPIFY_CLIENT_SECRET)
```

**IMPORTANT**: Remove this logging after testing (don't log secrets!).

### Check Vercel Logs

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# View logs
vercel logs cgk-admin --scope cgk-linens-88e79683
```

Or use Vercel dashboard: https://vercel.com/cgk-linens-88e79683/cgk-admin/logs

### Common Issues

| Error                    | Cause                           | Fix                                        |
| ------------------------ | ------------------------------- | ------------------------------------------ |
| `error=auth_failed`      | Missing env vars                | Verify credentials in Vercel dashboard     |
| `error=shop_required`    | Frontend not sending shop param | Already fixed (shop domain input added)    |
| `Tenant not found`       | Missing tenant context          | Select tenant via SuperAdminTenantSelector |
| `APP_URL not configured` | Missing NEXT_PUBLIC_APP_URL     | Already fixed (added to Vercel)            |

---

## Verification Checklist

After successful OAuth:

- [ ] Status shows "Connected" on integrations page
- [ ] Shop domain displays correctly (e.g., "meliusly.myshopify.com")
- [ ] OAuth scopes are displayed with checkmarks
- [ ] "Test Connection" button works
- [ ] Entry exists in `tenant_meliusly.shopify_app_installations` table
- [ ] Access token is encrypted and stored

### Check Database Entry

```bash
export $(cat apps/admin/.env.local | grep DATABASE_URL | xargs)

psql "$DATABASE_URL" -c "
  SELECT
    shop,
    installed_at,
    scopes,
    LENGTH(encrypted_access_token) as token_length
  FROM tenant_meliusly.shopify_app_installations
  ORDER BY installed_at DESC
  LIMIT 1;
"
```

---

## Next Steps

After successful OAuth connection:

1. **Test Storefront API Token Creation**
   - Use Admin API to create a Storefront Access Token
   - Store token in database for headless storefront use

2. **Test Webhook Delivery**
   - Create a test order in Shopify
   - Verify webhook is received at `/api/admin/shopify-app/webhooks/orders/create`

3. **Test Order Sync**
   - Verify orders are synced to `tenant_meliusly.orders` table
   - Check that customer data is properly mapped

---

## References

- **Shopify App Config**: `apps/shopify-app/shopify.app.toml`
- **Admin OAuth Route**: `apps/admin/src/app/api/admin/shopify-app/auth/route.ts`
- **OAuth Callback Route**: `apps/admin/src/app/api/admin/shopify-app/callback/route.ts`
- **OAuth Initiation Code**: `packages/shopify/src/oauth/initiate.ts`
- **Tenant Context Fix**: `SHOPIFY-OAUTH-TENANT-CONTEXT-FIX.md`

---

## Security Notes

- ✅ Secrets are NOT committed to git (using environment variables)
- ✅ Access tokens are encrypted in database (using `SHOPIFY_TOKEN_ENCRYPTION_KEY`)
- ✅ OAuth state tokens expire after 10 minutes
- ✅ HMAC verification for webhooks
- ✅ Tenant isolation enforced (shop can only be linked to one tenant)
