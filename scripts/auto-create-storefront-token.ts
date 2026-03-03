#!/usr/bin/env tsx
/**
 * Automatically create Storefront Access Token for Meliusly
 * 
 * Uses the existing Admin API token from shopify_sessions to create
 * a Storefront Access Token via Shopify GraphQL API.
 */

import { sql } from '@vercel/postgres'

const SHOP = 'meliusly.myshopify.com'
const SLUG = 'meliusly'

async function main() {
  try {
    console.log('🚀 Auto-creating Storefront Access Token for Meliusly\n')

    // 1. Get Admin API token from shopify_sessions
    console.log('1. Fetching Admin API token from shopify_sessions...')
    const sessionResult = await sql`
      SELECT "accessToken", shop, expires
      FROM public.shopify_sessions
      WHERE shop = ${SHOP}
      AND "isOnline" = false
      ORDER BY expires DESC NULLS FIRST
      LIMIT 1
    `

    if (sessionResult.rows.length === 0) {
      throw new Error(`No offline session found for ${SHOP}`)
    }

    const adminToken = sessionResult.rows[0]!.accessToken as string
    const expires = sessionResult.rows[0]!.expires
    
    console.log('   ✅ Found Admin API token')
    if (expires) {
      console.log(`   ⚠️  Token expires: ${expires}`)
    } else {
      console.log('   ✅ Token does not expire (offline token)')
    }

    // 2. Create Storefront Access Token via Shopify Admin API
    console.log('\n2. Creating Storefront Access Token via Shopify Admin API...')

    const mutation = `
      mutation {
        storefrontAccessTokenCreate(input: {
          title: "Meliusly Headless Storefront - CGK Platform"
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
    `

    const response = await fetch(
      `https://${SHOP}/admin/api/2026-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken,
        },
        body: JSON.stringify({ query: mutation }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify API error (${response.status}): ${errorText}`)
    }

    const result = await response.json()

    // Check for user errors
    const userErrors = result.data?.storefrontAccessTokenCreate?.userErrors
    if (userErrors && userErrors.length > 0) {
      console.error('   ❌ Shopify API errors:')
      userErrors.forEach((err: any) => {
        console.error(`      ${err.field}: ${err.message}`)
      })
      throw new Error('Shopify API returned errors')
    }

    const storefrontToken =
      result.data?.storefrontAccessTokenCreate?.storefrontAccessToken?.accessToken

    if (!storefrontToken) {
      console.error('   ❌ No storefront token in response:', JSON.stringify(result, null, 2))
      throw new Error('No storefront token returned from Shopify API')
    }

    console.log('   ✅ Created Storefront Access Token')
    console.log(`      Token: ${storefrontToken.substring(0, 25)}...`)

    // 3. Save to organizations.shopify_config
    console.log('\n3. Saving token to organizations.shopify_config...')

    await sql`
      UPDATE public.organizations
      SET shopify_config = jsonb_set(
        COALESCE(shopify_config, '{}'::jsonb),
        '{storefrontAccessToken}',
        to_jsonb(${storefrontToken}::text)
      )
      WHERE slug = ${SLUG}
    `

    console.log('   ✅ Token saved to database')

    // 4. Verify
    console.log('\n4. Verifying configuration...')
    const verifyResult = await sql`
      SELECT
        slug,
        shopify_store_domain,
        shopify_config
      FROM public.organizations
      WHERE slug = ${SLUG}
    `

    const org = verifyResult.rows[0]
    console.log('   ✅ Final configuration:')
    console.log(`      Shop: ${org.shopify_store_domain}`)
    console.log(`      Checkout Domain: ${org.shopify_config.checkoutDomain}`)
    console.log(`      Has Token: ${!!org.shopify_config.storefrontAccessToken}`)

    console.log('\n🎉 SUCCESS! Storefront should now load products.')
    console.log('\n📝 Next steps:')
    console.log('   1. Restart storefront: cd apps/storefront && pnpm dev')
    console.log('   2. Visit http://localhost:3000')
    console.log('   3. Check that products load correctly')

    await sql.end()
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
