# Shopify Connection Setup Required

## Current Status

The Meliusly storefront is configured but the Shopify connection is not yet established in the database.

## What's Missing

The `shopify_connections` table needs a record for the Meliusly tenant with:

1. Storefront API Access Token (encrypted)
2. Shop domain: meliusly.myshopify.com

## How to Fix

### Option 1: Use Admin API to Create Storefront Token

```typescript
// Use the CGK Admin app or Shopify App to run this mutation
mutation {
  storefrontAccessTokenCreate(input: {
    title: "Meliusly Headless Storefront"
  }) {
    storefrontAccessToken {
      accessToken
      title
    }
  }
}
```

Then insert into database:

```sql
-- First, encrypt the token using the SHOPIFY_TOKEN_ENCRYPTION_KEY
-- Then insert:
INSERT INTO public.shopify_connections (
  tenant_id,
  shop,
  storefront_api_token_encrypted,
  status
) VALUES (
  '5cb87b13-3b13-4400-9542-53c8b8d12cb8', -- meliusly tenant ID
  'meliusly.myshopify.com',
  '<ENCRYPTED_TOKEN_HERE>',
  'active'
);
```

### Option 2: Use Environment Variables (Temporary)

For testing, you can add to `/Users/holdenthemic/Documents/cgk/apps/meliusly-storefront/.env.local`:

```
SHOPIFY_STOREFRONT_ACCESS_TOKEN="<your_token_here>"
```

Then modify the API route to fall back to environment variables if database connection doesn't exist.

### Option 3: Use Mock Data (Testing Only)

Create a mock products API route that returns sample data for UI testing.

## Current Workaround

For now, the products API returns an empty array when Shopify is not configured, allowing the UI to render without errors.

## Files Affected

- `/apps/meliusly-storefront/src/lib/shopify-from-database.ts` - Fixed to use `shopify_connections` table
- `/apps/meliusly-storefront/src/lib/tenant-resolution.ts` - Fixed to remove `type` column reference
- `/apps/meliusly-storefront/src/app/api/products/route.ts` - Updated to handle missing connection gracefully

## Next Steps

1. Set up Shopify Storefront API Access Token
2. Encrypt using `SHOPIFY_TOKEN_ENCRYPTION_KEY`
3. Insert into `shopify_connections` table
4. Test products API
5. Verify product images load correctly
