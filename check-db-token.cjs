require('dotenv').config({ path: 'apps/admin/.env.local' })
const { sql } = require('@vercel/postgres')

;(async () => {
  try {
    const result = await sql`
      SELECT
        shop,
        status,
        storefront_api_token_encrypted IS NOT NULL as has_token,
        LENGTH(storefront_api_token_encrypted) as token_length,
        SUBSTRING(storefront_api_token_encrypted, 1, 50) as token_preview,
        updated_at
      FROM tenant_meliusly.shopify_connections
      ORDER BY updated_at DESC
    `

    console.log(`\n🔍 Found ${result.rows.length} connection(s):\n`)

    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.shop} (${row.status})`)
      console.log('   Has Token:', row.has_token)
      console.log('   Token Length:', row.token_length)
      console.log('   Preview:', row.token_preview)
      console.log('   Updated:', row.updated_at)

      const parts = row.token_preview ? row.token_preview.split(':').length : 0
      console.log('   Parts:', parts, parts === 3 ? '✅' : '❌')
      console.log()
    })

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
