require('dotenv').config({ path: 'apps/admin/.env.local' })
const { sql } = require('@vercel/postgres')

;(async () => {
  const tenantId = '5cb87b13-3b13-4400-9542-53c8b8d12cb8' // meliusly
  
  // Check current token
  const before = await sql`
    SELECT storefront_api_token_encrypted, LENGTH(storefront_api_token_encrypted) as len
    FROM tenant_meliusly.shopify_connections
    WHERE tenant_id = ${tenantId} AND status = 'active'
  `
  
  const currentToken = before.rows[0].storefront_api_token_encrypted
  const parts = currentToken.split(':')
  
  console.log('Current token:')
  console.log('  Length:', before.rows[0].len)
  console.log('  Parts:', parts.length)
  console.log('  Part lengths:', parts.map(p => p.length).join(', '))
  
  if (parts.length !== 3) {
    console.log('\n❌ Token STILL has', parts.length, 'parts!')
    console.log('Need to disconnect/reconnect Shopify app AGAIN')
  } else {
    console.log('\n✅ Token has 3 parts - query should work')
    console.log('\nThe issue must be:')
    console.log('1. Vercel caching old code')
    console.log('2. OR different database/schema being queried')
    console.log('3. OR encryption key mismatch')
  }
  
  process.exit(0)
})()
