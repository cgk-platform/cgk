# Shopify Token Fix Guide

## Problem

The Shopify Storefront Access Token in the database is encrypted with an **old format** (missing authTag), causing this error:

```
Invalid encrypted token format: expected 3 parts (iv:authTag:cipherText), got 2 parts
```

## Quick Fix (Temporary) - Use Environment Variable

**Fastest solution** - Add the token as an environment variable while you fix the database:

### Step 1: Get Your Shopify Storefront Access Token

**Option A: Use Existing Token (if you have it)**

- If you have the plaintext token somewhere, use that

**Option B: Create a New Token via Shopify Admin**

1. Go to Shopify Admin: https://admin.shopify.com/store/meliusly
2. Navigate to: **Settings** → **Apps and sales channels**
3. Click **Develop apps**
4. Find **CGK Platform** app
5. Click **API credentials**
6. Under **Storefront API**, copy the **Storefront API access token**
   - It looks like: `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Add to Vercel Environment Variables

```bash
# From the storefront app directory
cd apps/meliusly-storefront

# Add to all environments (production, preview, development)
vercel env add NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN production --scope cgk-linens-88e79683
vercel env add NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN preview --scope cgk-linens-88e79683
vercel env add NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN development --scope cgk-linens-88e79683
```

**Important:** When prompted, paste your token (the `shpat_xxxxx` value)

### Step 3: Trigger Redeploy

```bash
# Trigger a new deployment to pick up the env var
vercel deploy --prod --scope cgk-linens-88e79683
```

**Or** just push a commit:

```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main
```

---

## Permanent Fix - Re-encrypt Database Token

Once you have the plaintext token, fix the database encryption:

### Step 1: Run the Fix Script

```bash
# Set your token and run the script
SHOPIFY_TOKEN="shpat_your_actual_token_here" pnpm tsx scripts/fix-shopify-token.ts
```

This will:

- ✅ Encrypt the token with the correct format (iv:authTag:cipherText)
- ✅ Update the database
- ✅ Verify decryption works

### Step 2: Remove the Env Var (Optional)

Once the database is fixed, you can remove the fallback env var:

```bash
cd apps/meliusly-storefront
vercel env rm NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN production --scope cgk-linens-88e79683
vercel env rm NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN preview --scope cgk-linens-88e79683
vercel env rm NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN development --scope cgk-linens-88e79683
```

### Step 3: Deploy and Test

```bash
git push origin main
```

Then visit: https://cgk-meliusly-storefront.vercel.app

---

## Why This Happened

The database token was encrypted with an older encryption format before the GCM authTag was added. The current encryption code (AES-256-GCM) requires:

- **Old format:** `iv:cipherText` (2 parts) ❌
- **New format:** `iv:authTag:cipherText` (3 parts) ✅

The old format cannot be decrypted by the new code, so you must re-encrypt the token.

---

## Verification

After fixing, you should see in the logs:

```
[Shopify] ✅ Token decrypted successfully
[Shopify] Storefront client created
```

And products should load correctly on the storefront.
