require('dotenv').config({ path: 'apps/admin/.env.local' })
const { sql } = require('@vercel/postgres')

;(async () => {
  try {
    const result = await sql`
      SELECT
        shop,
        storefront_api_token_encrypted IS NOT NULL as has_token,
        LENGTH(storefront_api_token_encrypted) as token_length,
        SUBSTRING(storefront_api_token_encrypted, 1, 50) as token_preview
      FROM tenant_meliusly.shopify_connections
      WHERE status = 'active'
      LIMIT 1
    `

    if (result.rows.length === 0) {
      console.log('❌ No active connection found')
      process.exit(1)
    }

    const row = result.rows[0]
    console.log('\n🔍 Storefront Token Check:')
    console.log('  Shop:', row.shop)
    console.log('  Has Token:', row.has_token)
    console.log('  Token Length:', row.token_length)
    console.log('  Preview:', row.token_preview)

    if (!row.has_token || row.token_length === 0) {
      console.log('\n❌ PROBLEM: Storefront token is NULL or empty!')
      console.log('   You need to re-authorize the Shopify app to generate it.')
    } else {
      console.log('\n✅ Token exists in database')
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
