require('dotenv').config({ path: 'apps/admin/.env.local' })
const { sql } = require('@vercel/postgres')

;(async () => {
  // Get tenant ID
  const tenantResult = await sql`SELECT id, slug FROM public.organizations WHERE slug = 'meliusly'`
  const tenantId = tenantResult.rows[0].id
  const tenantSlug = tenantResult.rows[0].slug
  
  console.log('Tenant:', tenantSlug, '(', tenantId, ')')
  
  // Set search path (this is what withTenant does)
  await sql`SET search_path TO tenant_${tenantSlug}, public`
  
  // Query exactly like the app does
  const result = await sql`
    SELECT storefront_api_token_encrypted
    FROM shopify_connections
    WHERE tenant_id = ${tenantId}
    AND status = 'active'
    ORDER BY installed_at DESC
    LIMIT 1
  `
  
  const token = result.rows[0]?.storefront_api_token_encrypted
  const parts = token?.split(':') || []
  
  console.log('\nToken length:', token?.length || 0)
  console.log('Parts:', parts.length)
  console.log('Part 1:', parts[0]?.length, 'chars')
  console.log('Part 2:', parts[1]?.length, 'chars')
  console.log('Part 3:', parts[2]?.length || 'MISSING', 'chars')
  console.log('\nFirst 60 chars:', token?.substring(0, 60))
  
  console.log('\n' + (parts.length === 3 ? '✅ CORRECT' : '❌ WRONG'))
  
  process.exit(0)
})()
