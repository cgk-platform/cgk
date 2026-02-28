#!/usr/bin/env tsx
/**
 * Create Storefront Access Token using EXISTING CGK Platform Shopify app
 *
 * Uses the Admin API token from the installed app to create a public
 * Storefront Access Token for the headless Meliusly storefront.
 *
 * NO NEW APPS NEEDED - uses existing app's Admin API access!
 */

import { sql } from '@vercel/postgres'

async function createStorefrontToken() {
  try {
    console.log('=== Creating Storefront Token via EXISTING App ===\n')

    // 1. Get the Admin API credentials from the EXISTING app installation
    console.log('1. Fetching Admin API credentials from existing app...')

    const result = await sql`
      SELECT
        sai.shop,
        sai.organization_id,
        o.slug as tenant_slug
      FROM public.shopify_app_installations sai
      JOIN public.organizations o ON o.id = sai.organization_id
      WHERE sai.shop = 'meliusly.myshopify.com'
        AND sai.status = 'active'
      LIMIT 1
    `

    if (result.rows.length === 0) {
      throw new Error('Meliusly shop not found in installations')
    }

    const { shop, organization_id, tenant_slug } = result.rows[0] as {
      shop: string
      organization_id: string
      tenant_slug: string
    }

    console.log(`   ✅ Found installation:`)
    console.log(`      Shop: ${shop}`)
    console.log(`      Tenant: ${tenant_slug}`)

    // 2. Get the Admin API access token
    console.log('\n2. Getting Admin API access token...')

    // Check if we need encryption key
    const encryptionKey = process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY
    if (!encryptionKey) {
      throw new Error(
        'SHOPIFY_TOKEN_ENCRYPTION_KEY not found in environment.\n' +
        'This is needed to decrypt the stored access token.'
      )
    }

    // For now, let's check what's in the shopify_connections table
    const connCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'tenant_${tenant_slug}'
        AND table_name = 'shopify_connections'
      ORDER BY ordinal_position
    `

    console.log('   Available columns:', connCheck.rows.map((r: any) => r.column_name).join(', '))

    // Get connection record
    const conn = await sql`
      SELECT *
      FROM tenant_${tenant_slug}.shopify_connections
      WHERE shop = ${shop}
      LIMIT 1
    `

    if (conn.rows.length === 0) {
      throw new Error(
        `No connection found in tenant_${tenant_slug}.shopify_connections.\n` +
        'The app may not be fully connected yet.'
      )
    }

    const connection = conn.rows[0]
    console.log('   ✅ Found connection record')

    // Check if we have an access token field
    const hasEncryptedToken = 'access_token_encrypted' in connection
    const hasToken = 'access_token' in connection

    if (!hasEncryptedToken && !hasToken) {
      console.log('\n⚠️  Connection record exists but no access token found.')
      console.log('   Available fields:', Object.keys(connection).join(', '))
      throw new Error('Access token not found in connection record')
    }

    console.log(`   Token field: ${hasEncryptedToken ? 'access_token_encrypted' : 'access_token'}`)

    // For now, show what we need to do next
    console.log('\n3. Next steps:')
    console.log('   ✅ We have the Admin API credentials')
    console.log('   📝 TODO: Decrypt token and call storefrontAccessTokenCreate mutation')
    console.log('\n   Mutation to call:')
    console.log(`
      mutation {
        storefrontAccessTokenCreate(input: {
          title: "Meliusly Headless Storefront"
        }) {
          storefrontAccessToken {
            accessToken
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `)

    console.log('\n   This will create a PUBLIC Storefront Access Token using the')
    console.log('   EXISTING CGK Platform app (no new app needed!).')

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  process.exit(0)
}

createStorefrontToken()
