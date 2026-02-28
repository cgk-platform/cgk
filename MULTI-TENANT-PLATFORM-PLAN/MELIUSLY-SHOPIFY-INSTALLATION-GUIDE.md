# Meliusly Shopify App Installation Guide

**Phase:** 1C - Install CGK Platform App to Meliusly Store
**Status:** ⏳ Ready to Execute
**Prerequisites:** Phase 1B complete (multi-tenant architecture implemented)

---

## Overview

This guide walks through installing the CGK Platform Shopify app to the Meliusly store. After installation, the app will:

1. Enable multi-tenant routing (Meliusly shop → Meliusly organization)
2. Store OAuth credentials securely (encrypted)
3. Register webhooks for order sync
4. Enable Storefront API access for the storefront app

---

## Prerequisites

Before starting, ensure you have:

- [ ] Access to Meliusly Shopify store admin (`meliusly.myshopify.com`)
- [ ] CGK Platform Shopify app configured (client ID: `6bdb14a850b3220eaa2c8decb420bb8c`)
- [ ] Environment variables set:
  - `SHOPIFY_CLIENT_ID`
  - `SHOPIFY_CLIENT_SECRET`
  - `SHOPIFY_TOKEN_ENCRYPTION_KEY`
  - `SHOPIFY_WEBHOOK_SECRET`
  - `DATABASE_URL`

---

## Installation Methods

### Method 1: Install via Shopify Admin (Recommended)

**Step 1: Generate Installation URL**

The installation URL format is:
```
https://admin.shopify.com/store/{shop-name}/oauth/install_custom_app?client_id={client_id}
```

For Meliusly:
```
https://admin.shopify.com/store/meliusly/oauth/install_custom_app?client_id=6bdb14a850b3220eaa2c8decb420bb8c
```

**IMPORTANT:** Replace `meliusly` with the actual shop name from your Shopify admin URL. For example:
- If your admin URL is `https://admin.shopify.com/store/meliusly-shop/...`, use `meliusly-shop`
- If your store domain is `meliusly.myshopify.com`, the shop name is usually `meliusly`

**Step 2: Open Installation URL**

1. Copy the installation URL above
2. Open it in a browser where you're logged into the Meliusly Shopify admin
3. Review the permissions the app is requesting

**Step 3: Review Permissions**

The CGK Platform app will request these scopes (see `apps/shopify-app/shopify.app.toml`):

**Product Management:**
- `read_products`, `write_products`
- `read_inventory`, `write_inventory`
- `read_product_listings`

**Order Management:**
- `read_orders`, `write_orders`
- `read_draft_orders`, `write_draft_orders`
- `read_fulfillments`, `write_fulfillments`
- `read_shipping`, `write_shipping`

**Customer Management:**
- `read_customers`, `write_customers`
- `read_checkouts`, `write_checkouts`

**Marketing & Analytics:**
- `write_pixels`, `read_customer_events`
- `read_analytics`, `read_reports`

**Content & Files:**
- `read_content`, `write_content`
- `read_files`, `write_files`
- `read_themes`

**Discounts & Pricing:**
- `read_discounts`, `write_discounts`
- `read_price_rules`, `write_price_rules`

**Other:**
- `read_gift_cards`, `write_gift_cards`
- `read_delivery_customizations`, `write_delivery_customizations`
- `read_cart_transforms`, `write_cart_transforms`
- `read_locations`, `read_markets`, `read_locales`, `read_publications`

**Step 4: Install the App**

1. Click **"Install app"** to approve the installation
2. Wait for OAuth flow to complete
3. You'll be redirected to the app dashboard

**What happens during OAuth:**
1. Shopify redirects to CGK Platform app OAuth endpoint
2. App exchanges authorization code for access token
3. Access token is encrypted and stored in:
   - `tenant_meliusly.shopify_connections` (encrypted credentials)
   - `public.shopify_app_installations` (installation metadata)
4. Webhooks are registered with Shopify
5. Redirect to app dashboard

---

### Method 2: Install via Shopify CLI (Development)

**For development/testing only:**

```bash
cd apps/shopify-app

# Start dev server (uses ngrok tunnel)
shopify app dev

# CLI will output an installation URL
# Open that URL in your browser
```

**Note:** This method uses a temporary ngrok URL and is only for testing. For production, use Method 1.

---

## Verification

After installation, verify everything is set up correctly:

### Step 1: Run Verification Script

```bash
pnpm tsx scripts/verify-meliusly-installation.ts
```

This script checks:
1. ✅ Installation record exists in `public.shopify_app_installations`
2. ✅ Tenant resolution works (`getOrganizationIdForShop()` returns Meliusly org ID)
3. ✅ Shop is marked as active
4. ✅ Credentials stored in `tenant_meliusly.shopify_connections`

**Expected output:**
```
🔍 Verifying Meliusly Shopify App Installation...

1. Checking public.shopify_app_installations...
✅ Installation record found!
   Shop: meliusly.myshopify.com
   Organization ID: 5cb87b13-3b13-4400-9542-53c8b8d12cb8
   Status: active
   Installed At: 2026-02-27T...

2. Testing tenant resolution...
✅ Tenant resolution works!
   Resolved to: 5cb87b13-3b13-4400-9542-53c8b8d12cb8
✅ Correct organization ID!

3. Checking shop active status...
✅ Shop is ACTIVE

4. Checking tenant_meliusly.shopify_connections...
✅ Tenant-specific credentials found!
   Shop: meliusly.myshopify.com
   Active: true
   Last Sync: 2026-02-27T...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All checks passed! Meliusly installation is complete.

Next steps:
1. Test webhook routing
2. Test Storefront API access
3. Proceed to Phase 1D (Update organization)
```

### Step 2: Manual SQL Verification (Optional)

If you prefer to verify manually:

```sql
-- Check installation record
SELECT
  shop,
  organization_id,
  status,
  scopes,
  installed_at
FROM public.shopify_app_installations
WHERE shop = 'meliusly.myshopify.com';

-- Check tenant-specific credentials
SELECT
  shop,
  is_active,
  last_sync_at,
  created_at
FROM tenant_meliusly.shopify_connections
WHERE shop = 'meliusly.myshopify.com';
```

---

## Troubleshooting

### Issue 1: Installation Record Not Created

**Symptom:** Verification script shows "Installation record NOT found"

**Cause:** OAuth callback did not call `recordShopInstallation()`

**Solution:** Manually record the installation:

```bash
pnpm tsx scripts/record-meliusly-installation.ts
```

Then re-run verification:
```bash
pnpm tsx scripts/verify-meliusly-installation.ts
```

---

### Issue 2: Wrong Organization ID

**Symptom:** Tenant resolution returns wrong org ID

**Cause:** Installation record points to wrong organization

**Solution:** Update the installation record:

```sql
UPDATE public.shopify_app_installations
SET organization_id = '5cb87b13-3b13-4400-9542-53c8b8d12cb8'
WHERE shop = 'meliusly.myshopify.com';
```

---

### Issue 3: No Credentials in Tenant Schema

**Symptom:** No entry in `tenant_meliusly.shopify_connections`

**Cause:** OAuth callback did not store credentials

**Solution:** Check OAuth callback logs for errors. Ensure:
1. `SHOPIFY_TOKEN_ENCRYPTION_KEY` is set
2. Database connection is working
3. Tenant schema exists (`tenant_meliusly`)

If OAuth callback is not storing credentials, you may need to reinstall the app.

---

### Issue 4: Webhooks Not Registered

**Symptom:** Orders from Meliusly don't sync

**Cause:** Webhooks failed to register during installation

**Solution:** Manually register webhooks via Shopify CLI:

```bash
cd apps/shopify-app
shopify app webhooks trigger --topic=orders/create --shop=meliusly.myshopify.com
```

Or check webhook status:
```bash
shopify app webhooks list --shop=meliusly.myshopify.com
```

---

## Testing Multi-Tenant Routing

After installation, test that webhooks route to the correct tenant:

### Test 1: Create Test Order

1. Go to Meliusly Shopify admin
2. Create a test order (manually)
3. Check webhook logs for `orders/create` webhook
4. Verify webhook routed to Meliusly tenant:

```bash
# Check logs for webhook processing
# Should show tenant resolution: meliusly.myshopify.com → 5cb87b13-3b13-4400-9542-53c8b8d12cb8
```

### Test 2: Storefront API Access

Test that the storefront app can fetch Meliusly products:

```typescript
// In storefront app
import { getCommerceProvider } from '@/lib/commerce'

const commerce = await getCommerceProvider()
const { items } = await commerce.products.list({ first: 10 })

console.log(items) // Should return Meliusly products
```

---

## Next Steps

After successful installation and verification:

1. ✅ **Mark Phase 1C complete** in the plan
2. ➡️ **Proceed to Phase 1D**: Update organization with Shopify domain
3. ➡️ **Proceed to Phase 1E**: Extract Figma assets
4. ➡️ **Proceed to Phase 1F**: Configure theme

---

## Definition of Done

Phase 1C is complete when:

- [x] CGK Platform app installed to Meliusly Shopify store
- [x] OAuth flow completed successfully
- [x] `shopify_app_installations` record exists for Meliusly
- [x] `shopify_connections` record exists in `tenant_meliusly`
- [x] Tenant resolution works (`getOrganizationIdForShop()` returns Meliusly ID)
- [x] Credentials decryption works
- [x] Test webhook routed to correct tenant
- [x] Storefront API fetches Meliusly products
- [x] No errors in application logs

---

## Important Notes

### Security

- OAuth access tokens are encrypted using `SHOPIFY_TOKEN_ENCRYPTION_KEY` before storage
- Webhook signatures are verified using `SHOPIFY_WEBHOOK_SECRET`
- Never expose credentials in logs or error messages

### Multi-Tenant Architecture

- One CGK Platform app serves ALL tenants (not one app per tenant)
- Tenant resolution happens dynamically via `public.shopify_app_installations`
- Each shop can only be linked to ONE organization
- Reinstalling the app will update the existing installation record (ON CONFLICT DO UPDATE)

### Scopes

- The app requests extensive scopes for full platform functionality
- If you need fewer scopes for Meliusly, update `shopify.app.toml` and redeploy
- Changing scopes requires app reinstallation

---

**Mr. Tinkleberry**, this installation guide provides everything needed to install the CGK Platform app to the Meliusly store and verify it's working correctly.
