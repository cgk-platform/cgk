#!/usr/bin/env tsx
/**
 * Store the Shopify Storefront Access Token for Meliusly
 * Usage: pnpm tsx scripts/store-storefront-token.ts <your-token-here>
 */

import 'dotenv/config'
import { sql } from '@vercel/postgres'

async function storeStorefrontToken() {
  const token = process.argv[2]

  if (!token) {
    console.error('Usage: pnpm tsx scripts/store-storefront-token.ts <token>')
    process.exit(1)
  }

  try {
    console.log('=== Storing Storefront Access Token ===\n')

    // Check if shopify_storefront_tokens table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'tenant_meliusly'
        AND table_name = 'shopify_storefront_tokens'
      )
    `

    if (!tableExists.rows[0]?.exists) {
      console.log('Creating shopify_storefront_tokens table...')
      await sql`
        CREATE TABLE IF NOT EXISTS tenant_meliusly.shopify_storefront_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          shop TEXT NOT NULL,
          storefront_access_token TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      console.log('✅ Table created')
    }

    // Store the token
    console.log('Storing token...')
    await sql`
      INSERT INTO tenant_meliusly.shopify_storefront_tokens (
        shop,
        storefront_access_token,
        status
      ) VALUES (
        'meliusly.myshopify.com',
        ${token},
        'active'
      )
      ON CONFLICT (shop)
      DO UPDATE SET
        storefront_access_token = ${token},
        updated_at = NOW()
    `

    // Add unique constraint if doesn't exist
    await sql`
      ALTER TABLE tenant_meliusly.shopify_storefront_tokens
      ADD CONSTRAINT IF NOT EXISTS shopify_storefront_tokens_shop_unique
      UNIQUE (shop)
    `.catch(() => {
      // Constraint might already exist
    })

    console.log('✅ Token stored successfully!')
    console.log('\nToken preview:', token.substring(0, 10) + '...')
    console.log('\nNext: Run Phase 1F to create the Meliusly storefront app')
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  process.exit(0)
}

storeStorefrontToken()
