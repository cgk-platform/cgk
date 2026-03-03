require('dotenv').config({ path: 'apps/admin/.env.local' })
const { sql } = require('@vercel/postgres')

;(async () => {
  const result = await sql`
    SELECT 
      shop,
      storefront_api_token_encrypted,
      array_length(string_to_array(storefront_api_token_encrypted, ':'), 1) as part_count
    FROM tenant_meliusly.shopify_connections
    WHERE status = 'active'
  `

  const row = result.rows[0]
  const token = row.storefront_api_token_encrypted
  const parts = token.split(':')
  
  console.log('\n📊 Token Analysis:')
  console.log('  Total length:', token.length)
  console.log('  Number of parts:', parts.length)
  console.log('  Part 1 (IV) length:', parts[0]?.length, 'chars')
  console.log('  Part 2 (AuthTag) length:', parts[1]?.length, 'chars')
  console.log('  Part 3 (Cipher) length:', parts[2]?.length || 'MISSING', 'chars')
  console.log('\n  Result:', parts.length === 3 ? '✅ CORRECT FORMAT' : '❌ WRONG FORMAT')
  
  process.exit(0)
})()
