require('dotenv').config({ path: 'apps/admin/.env.local' })
const { sql } = require('@vercel/postgres')

;(async () => {
  const result = await sql`
    SELECT 
      shop,
      status,
      installed_at,
      updated_at,
      LENGTH(storefront_api_token_encrypted) as token_len,
      SUBSTRING(storefront_api_token_encrypted, 1, 50) as token_preview
    FROM tenant_meliusly.shopify_connections
    ORDER BY updated_at DESC
  `

  console.log(`\nFound ${result.rows.length} connection(s):\n`)
  result.rows.forEach((row, i) => {
    console.log(`${i+1}. ${row.shop}`)
    console.log(`   Status: ${row.status}`)
    console.log(`   Token length: ${row.token_len}`)
    console.log(`   Token preview: ${row.token_preview}...`)
    console.log(`   Updated: ${row.updated_at}`)
    console.log()
  })
  
  process.exit(0)
})()
