require('dotenv').config({ path: 'apps/admin/.env.local' })
const { sql } = require('@vercel/postgres')

;(async () => {
  const tenantId = '5cb87b13-3b13-4400-9542-53c8b8d12cb8' // meliusly
  
  // Query the tenant schema directly
  const result = await sql`
    SELECT 
      storefront_api_token_encrypted,
      updated_at
    FROM tenant_meliusly.shopify_connections
    WHERE tenant_id = ${tenantId}
    AND status = 'active'
    ORDER BY installed_at DESC
    LIMIT 1
  `
  
  if (result.rows.length === 0) {
    console.log('No connection found')
    process.exit(1)
  }
  
  const token = result.rows[0].storefront_api_token_encrypted
  const parts = token.split(':')
  
  console.log('Updated:', result.rows[0].updated_at)
  console.log('Token length:', token.length)
  console.log('Parts:', parts.length)
  console.log('Part lengths:', parts.map((p, i) => `${i+1}:${p.length}`).join(', '))
  console.log('\nFirst 70 chars:', token.substring(0, 70))
  console.log('\n' + (parts.length === 3 ? '✅ 3 PARTS' : '❌ ' + parts.length + ' PARTS'))
  
  process.exit(0)
})()
