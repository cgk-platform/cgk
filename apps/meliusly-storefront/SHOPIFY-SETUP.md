# Shopify Setup Guide

## Current Status

The storefront is currently using **mock product data** because the Shopify connection is not fully configured. Product images are placeholder images from placehold.co.

## Why Mock Data?

The database has a Shopify connection record with placeholder tokens. To use real Shopify data, you need to:

1. Get actual Shopify API tokens
2. Encrypt and store them in the database
3. Restart the application

## Getting Real Shopify Tokens

### Prerequisites

- Shopify Partners account (https://partners.shopify.com)
- Access to meliusly.myshopify.com store
- Admin access to CGK Platform database

### Step 1: Get Admin API Access Token

**Option A: Via Shopify Partners Dashboard** (Recommended)

1. Go to https://partners.shopify.com
2. Navigate to Apps
3. Find the "CGK Platform" app (or create one if it doesn't exist)
4. Install the app to meliusly.myshopify.com
5. During OAuth flow, you'll receive an `access_token`
6. Save this token securely

**Option B: Via Custom App** (Deprecated but still works)

1. Go to meliusly.myshopify.com/admin
2. Settings > Apps and sales channels > Develop apps
3. Create a custom app (if allowed)
4. Configure Admin API scopes:
   - `read_products`
   - `read_product_listings`
   - `read_inventory`
5. Install the app
6. Copy the Admin API access token

### Step 2: Generate Storefront API Token

The Storefront API token must be created using the Admin API token from Step 1.

**Using GraphQL Admin API:**

```graphql
mutation {
  storefrontAccessTokenCreate(input: { title: "Meliusly Headless Storefront" }) {
    storefrontAccessToken {
      accessToken
      title
    }
  }
}
```

Copy the returned `accessToken` value.

### Step 3: Encrypt the Tokens

Both tokens must be encrypted before storing in the database.

**Using the CGK encryption helper:**

```typescript
import { encrypt } from '@cgk-platform/core'

const encryptedAdminToken = encrypt(adminAccessToken, process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY!)

const encryptedStorefrontToken = encrypt(
  storefrontAccessToken,
  process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY!
)
```

**Or using Node.js crypto directly:**

```typescript
import crypto from 'crypto'

function encrypt(text: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}
```

### Step 4: Insert into Database

```sql
-- Update the existing connection record
UPDATE public.shopify_connections
SET
  access_token_encrypted = 'YOUR_ENCRYPTED_ADMIN_TOKEN_HERE',
  storefront_api_token_encrypted = 'YOUR_ENCRYPTED_STOREFRONT_TOKEN_HERE',
  status = 'active',
  updated_at = NOW()
WHERE shop = 'meliusly.myshopify.com';

-- Or insert a new record if it doesn't exist
INSERT INTO public.shopify_connections (
  id,
  shop,
  access_token_encrypted,
  storefront_api_token_encrypted,
  tenant_id,
  status
) VALUES (
  gen_random_uuid(),
  'meliusly.myshopify.com',
  'YOUR_ENCRYPTED_ADMIN_TOKEN_HERE',
  'YOUR_ENCRYPTED_STOREFRONT_TOKEN_HERE',
  '5cb87b13-3b13-4400-9542-53c8b8d12cb8',  -- meliusly tenant ID
  'active'
);
```

### Step 5: Restart the Application

Once the tokens are in the database, restart the Vercel deployment:

```bash
# Trigger a redeploy
vercel --prod --force
```

Or simply push a commit to the main branch to trigger auto-deployment.

## Testing

After setup, test the connection:

```bash
# Visit the storefront
open https://meliusly.com

# Check the browser console for any errors
# Products should load from Shopify instead of showing mock data
```

## Troubleshooting

### Products Not Loading

1. Check database connection:

   ```sql
   SELECT * FROM public.shopify_connections WHERE shop = 'meliusly.myshopify.com';
   ```

2. Verify tokens are encrypted correctly (they should be long hex strings)

3. Check application logs for decryption errors

### Authentication Errors

1. Verify the tokens haven't expired
2. Regenerate tokens if needed (they don't expire by default)
3. Check API scopes are correct

### Environment Variables

The storefront uses database-driven credentials, NOT environment variables.

However, these env vars are still needed for the OAuth app flow:

```bash
# .env.local
SHOPIFY_CLIENT_ID="your_client_id_from_partners_dashboard"
SHOPIFY_CLIENT_SECRET="your_client_secret_from_partners_dashboard"
SHOPIFY_API_VERSION="2026-01"
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN="meliusly.myshopify.com"
```

## Database Schema

Shopify connections are stored in:

```sql
public.shopify_connections (
  id UUID PRIMARY KEY,
  shop TEXT NOT NULL,
  access_token_encrypted TEXT,           -- Admin API token (encrypted)
  storefront_api_token_encrypted TEXT,   -- Storefront API token (encrypted)
  tenant_id UUID NOT NULL REFERENCES public.organizations(id),
  status TEXT DEFAULT 'active',
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

## Security Notes

- **NEVER commit unencrypted tokens** to git
- **NEVER commit `.env.production`** files
- Always use encrypted tokens in the database
- Tokens are decrypted at runtime using `SHOPIFY_TOKEN_ENCRYPTION_KEY`
- The encryption key itself should only be in Vercel environment variables

## Next Steps

Once Shopify is connected:

1. Verify products display correctly
2. Test product image loading
3. Check pricing and inventory sync
4. Test cart and checkout flow
5. Monitor application logs for any errors
