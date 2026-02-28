#!/usr/bin/env tsx
/**
 * Create a Shopify Storefront Access Token for Meliusly
 * Uses the existing Admin API token to create a public Storefront API token
 */

import 'dotenv/config'
import { sql } from '@vercel/postgres'
import { decryptToken } from '@cgk-platform/shopify/crypto'

async function createStorefrontToken() {
  try {
    console.log('=== Creating Storefront Access Token for Meliusly ===\n')

    // 1. Get the encrypted Admin API token from database
    console.log('1. Fetching Admin API credentials...')
    const installation = await sql`
      SELECT shop, organization_id
      FROM public.shopify_app_installations
      WHERE shop = 'meliusly.myshopify.com'
      LIMIT 1
    `

    if (installation.rows.length === 0) {
      throw new Error('Meliusly installation not found')
    }

    const { shop, organization_id } = installation.rows[0] as {
      shop: string
      organization_id: string
    }

    console.log(`   Shop: ${shop}`)
    console.log(`   Org ID: ${organization_id}`)

    // 2. Get Admin API token from shopify_connections
    // Note: We need to check the actual table schema
    console.log('\n2. Checking shopify_connections table schema...')
    const schemaCheck = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'tenant_meliusly'
        AND table_name = 'shopify_connections'
      ORDER BY ordinal_position
    `

    console.log('   Table columns:')
    schemaCheck.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type}`)
    })

    console.log(
      '\n⚠️  MANUAL STEP REQUIRED:\n' +
        '   1. Go to Shopify Admin: https://admin.shopify.com/store/meliusly\n' +
        '   2. Settings → Apps and sales channels → Add sales channel\n' +
        '   3. Select "Headless"\n' +
        '   4. Get the Storefront API access token\n' +
        '   5. Run: pnpm tsx scripts/store-storefront-token.ts <token>\n'
    )
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  process.exit(0)
}

createStorefrontToken()
