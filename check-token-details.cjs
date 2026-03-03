require('dotenv').config({ path: 'apps/admin/.env.local' })
const { sql } = require('@vercel/postgres')

;(async () => {
  const result = await sql`
    SELECT storefront_api_token_encrypted
    FROM tenant_meliusly.shopify_connections
    WHERE status = 'active'
    LIMIT 1
  `

  const token = result.rows[0].storefront_api_token_encrypted
  const parts = token.split(':')
  
  console.log('Token length:', token.length)
  console.log('Number of parts:', parts.length)
  console.log('Part lengths:', parts.map((p, i) => `Part ${i+1}: ${p.length} chars`).join(', '))
  
  process.exit(0)
})()
