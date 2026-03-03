require('dotenv').config({ path: 'apps/admin/.env.local' })
const { sql } = require('@vercel/postgres')
const { withTenant } = require('@cgk-platform/db')

;(async () => {
  // Get tenant ID (mimics resolveTenantFromDomain)
  const tenantResult = await sql`SELECT id, slug FROM public.organizations WHERE slug = 'meliusly'`
  const tenantId = tenantResult.rows[0].id
  const tenantSlug = tenantResult.rows[0].slug
  
  console.log('\n1. Tenant:', tenantSlug, '(', tenantId, ')')
  
  // This is EXACTLY what getShopifyInstallation does
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT id, shop, access_token_encrypted, storefront_api_token_encrypted,
             tenant_id, status, installed_at, updated_at
      FROM shopify_connections
      WHERE tenant_id = ${tenantId}
      AND status = 'active'
      ORDER BY installed_at DESC
      LIMIT 1
    `
  })
  
  if (result.rows.length === 0) {
    console.log('❌ No connection found!')
    process.exit(1)
  }
  
  const row = result.rows[0]
  const token = row.storefront_api_token_encrypted
  
  console.log('\n2. Query result:')
  console.log('   Shop:', row.shop)
  console.log('   Status:', row.status)
  console.log('   Updated:', row.updated_at)
  
  console.log('\n3. Token analysis:')
  console.log('   Length:', token?.length || 0)
  console.log('   Type:', typeof token)
  console.log('   Parts:', token?.split(':').length || 0)
  console.log('   First 50 chars:', token?.substring(0, 50))
  
  const parts = token.split(':')
  console.log('\n4. Part lengths:')
  console.log('   Part 1:', parts[0]?.length || 0, 'chars')
  console.log('   Part 2:', parts[1]?.length || 0, 'chars')
  console.log('   Part 3:', parts[2]?.length || 0, 'chars')
  
  console.log('\n5. Result:', parts.length === 3 ? '✅ CORRECT' : '❌ WRONG - still 2 parts!')
  
  process.exit(0)
})()
