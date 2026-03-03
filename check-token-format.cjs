require('dotenv').config({ path: 'apps/admin/.env.local' })
const { sql } = require('@vercel/postgres')

;(async () => {
  try {
    const result = await sql`
      SELECT
        shop,
        access_token_encrypted,
        storefront_api_token_encrypted
      FROM tenant_meliusly.shopify_connections
      WHERE status = 'active'
      LIMIT 1
    `

    if (result.rows.length === 0) {
      console.log('❌ No connection found')
      process.exit(1)
    }

    const conn = result.rows[0]

    console.log('\n📊 Token Formats:\n')
    console.log('Admin Token (access_token_encrypted):')
    console.log('  Length:', conn.access_token_encrypted?.length || 0)
    console.log('  Parts:', conn.access_token_encrypted?.split(':').length || 0)
    console.log('  Preview:', conn.access_token_encrypted?.substring(0, 100))

    console.log('\nStorefront Token (storefront_api_token_encrypted):')
    console.log('  Length:', conn.storefront_api_token_encrypted?.length || 0)
    console.log('  Parts:', conn.storefront_api_token_encrypted?.split(':').length || 0)
    console.log('  Preview:', conn.storefront_api_token_encrypted?.substring(0, 100))

    console.log('\n✅ Expected format: iv:authTag:cipherText (3 parts)')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
