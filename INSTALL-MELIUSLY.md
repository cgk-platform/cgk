# Install CGK Platform App to Meliusly Store

## Quick Answer
You do NOT need to redeploy the app. Use the same CGK Platform app that's installed on CGK Linens.

---

## Method 1: Custom App Installation URL (Easiest)

**Step 1: Generate the install URL**

Format:
```
https://admin.shopify.com/store/{shop-name}/oauth/install_custom_app?client_id={client_id}
```

For Meliusly:
```
https://admin.shopify.com/store/meliusly/oauth/install_custom_app?client_id=6bdb14a850b3220eaa2c8decb420bb8c
```

**Step 2: Get the correct shop name**

1. Log into Meliusly Shopify admin
2. Look at your admin URL: `https://admin.shopify.com/store/YOUR-SHOP-NAME/...`
3. Replace `meliusly` in the install URL with `YOUR-SHOP-NAME`

**Step 3: Open the install URL**

1. Make sure you're logged into Meliusly Shopify admin
2. Open the install URL in your browser
3. Review permissions
4. Click "Install app"
5. OAuth flow completes automatically

---

## Method 2: Via Shopify CLI (Alternative)

If you want to test in development first:

```bash
cd apps/shopify-app

# Start dev server (creates ngrok tunnel)
shopify app dev

# CLI outputs an install URL like:
# https://your-tunnel.ngrok.io/auth?shop=meliusly.myshopify.com

# Open that URL in your browser
```

**Note:** This is for testing only. Use Method 1 for production.

---

## Method 3: Share App Link (If App is Published)

If the app is published to Shopify App Store:

1. Go to Shopify Partners → Apps → CGK Platform
2. Copy the app listing URL
3. Share with Meliusly store admin
4. They install from the App Store

**Note:** App must be approved by Shopify for this method.

---

## What Happens During Install

### Automatic Process

1. **Shopify** redirects user to CGK Platform OAuth endpoint
2. **OAuth callback** (`packages/shopify/src/oauth/callback.ts`) runs:
   - Exchanges code for access token
   - Encrypts token
   - Stores in `tenant_meliusly.shopify_connections`
   - **Records in `public.shopify_app_installations`** (multi-tenant routing)
   - Registers webhooks
3. **User** redirected to app dashboard

### Database Changes

Two tables updated:

**Public schema** (for tenant resolution):
```sql
-- public.shopify_app_installations
shop: 'meliusly.myshopify.com'
organization_id: '5cb87b13-3b13-4400-9542-53c8b8d12cb8'
status: 'active'
```

**Tenant schema** (for credentials):
```sql
-- tenant_meliusly.shopify_connections
shop: 'meliusly.myshopify.com'
access_token_encrypted: '<encrypted>'
status: 'active'
```

---

## Verify Installation

After installing, run:

```bash
pnpm tsx scripts/verify-meliusly-installation.ts
```

Expected output:
```
✅ All checks passed! Meliusly installation is complete.
```

---

## Troubleshooting

### Issue: "App is not available"

**Cause:** App is in development mode and not published

**Solution:** Use Method 1 (custom app install URL) instead of App Store

### Issue: "Invalid shop domain"

**Cause:** Wrong shop name in URL

**Solution:** Check your Shopify admin URL for the correct shop name

### Issue: "Permissions already granted"

**Cause:** App already installed (reinstalling)

**Solution:** This is fine - OAuth will update the existing installation

---

## Multi-Tenant Verification

After installation, verify multi-tenant routing works:

**Test 1: Tenant Resolution**
```typescript
import { getOrganizationIdForShop } from '@cgk-platform/shopify/app/tenant-resolution'

const orgId = await getOrganizationIdForShop('meliusly.myshopify.com')
console.log(orgId) // Should be: 5cb87b13-3b13-4400-9542-53c8b8d12cb8
```

**Test 2: Check Both Stores**
```sql
SELECT shop, organization_id, status
FROM public.shopify_app_installations
ORDER BY installed_at DESC;
```

Should see:
```
shop                          | organization_id                      | status
------------------------------|--------------------------------------|--------
meliusly.myshopify.com        | 5cb87b13-3b13-4400-9542-53c8b8d12cb8 | active
cgk-linens.myshopify.com      | <cgk-linens-org-id>                  | active
```

---

## Why This Works (Multi-Tenant Architecture)

The same Shopify app can be installed to unlimited stores because:

1. **App is registered once** in Shopify Partners (CGK Platform, client ID: 6bdb14a850b3220eaa2c8decb420bb8c)
2. **Each installation is tracked separately** in `public.shopify_app_installations`
3. **Webhooks include shop domain** in headers → system looks up tenant → routes to correct schema
4. **Credentials stored per-tenant** in `tenant_{slug}.shopify_connections`

**Example webhook flow:**
```
1. Order created in Meliusly store
2. Shopify sends webhook with header: x-shopify-shop-domain: meliusly.myshopify.com
3. Webhook handler calls: getOrganizationIdForShop('meliusly.myshopify.com')
4. Returns: 5cb87b13-3b13-4400-9542-53c8b8d12cb8
5. Handler uses: withTenant('5cb87b13-3b13-4400-9542-53c8b8d12cb8', ...)
6. Data saved to: tenant_meliusly schema
```

---

## Next Steps After Install

1. ✅ Verify installation passes all checks
2. ➡️ Phase 1D: Update organization with Shopify domain
3. ➡️ Phase 1E: Extract Figma assets
4. ➡️ Continue with storefront implementation

---

**Mr. Tinkleberry**, just use the custom install URL - no redeployment needed!
