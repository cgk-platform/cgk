#!/usr/bin/env tsx

/**
 * Verify Meliusly Shopify App Installation
 *
 * This script checks if the Meliusly Shopify store is properly
 * installed and linked to the Meliusly organization.
 *
 * Usage:
 *   pnpm tsx scripts/verify-meliusly-installation.ts
 */

import { sql } from '@cgk-platform/db'
import {
  getOrganizationIdForShop,
  getShopInstallation,
  isShopActive,
  recordShopInstallation,
} from '@cgk-platform/shopify/app/tenant-resolution'

const MELIUSLY_SHOP = 'meliusly.myshopify.com'
const MELIUSLY_ORG_ID = '5cb87b13-3b13-4400-9542-53c8b8d12cb8'

async function main() {
  console.log('🔍 Verifying Meliusly Shopify App Installation...\n')

  // 1. Check if shop is in shopify_app_installations
  console.log('1. Checking public.shopify_app_installations...')
  const installation = await getShopInstallation(MELIUSLY_SHOP)

  if (installation) {
    console.log('✅ Installation record found!')
    console.log(`   Shop: ${installation.shop}`)
    console.log(`   Organization ID: ${installation.organizationId}`)
    console.log(`   Status: ${installation.status}`)
    console.log(`   Installed At: ${installation.installedAt}`)
    console.log(`   Scopes: ${installation.scopes.join(', ')}\n`)
  } else {
    console.log('❌ Installation record NOT found in public.shopify_app_installations\n')
    console.log('   This means one of two things:')
    console.log('   1. The app has not been installed yet via Shopify OAuth')
    console.log('   2. The OAuth callback did not call recordShopInstallation()\n')
  }

  // 2. Check tenant resolution
  console.log('2. Testing tenant resolution...')
  const resolvedOrgId = await getOrganizationIdForShop(MELIUSLY_SHOP)

  if (resolvedOrgId) {
    console.log('✅ Tenant resolution works!')
    console.log(`   Resolved to: ${resolvedOrgId}`)

    if (resolvedOrgId === MELIUSLY_ORG_ID) {
      console.log('✅ Correct organization ID!\n')
    } else {
      console.log(`❌ Wrong organization ID! Expected ${MELIUSLY_ORG_ID}\n`)
    }
  } else {
    console.log('❌ Tenant resolution failed (shop not found)\n')
  }

  // 3. Check if shop is active
  console.log('3. Checking shop active status...')
  const active = await isShopActive(MELIUSLY_SHOP)

  if (active) {
    console.log('✅ Shop is ACTIVE\n')
  } else {
    console.log('❌ Shop is NOT ACTIVE (may be uninstalled or suspended)\n')
  }

  // 4. Check shopify_connections (tenant schema)
  console.log('4. Checking tenant_meliusly.shopify_connections...')
  const connectionResult = await sql`
    SELECT
      shop,
      is_active,
      last_sync_at,
      created_at
    FROM tenant_meliusly.shopify_connections
    WHERE shop = ${MELIUSLY_SHOP}
    LIMIT 1
  `

  if (connectionResult.rows.length > 0) {
    const conn = connectionResult.rows[0]
    console.log('✅ Tenant-specific credentials found!')
    console.log(`   Shop: ${conn.shop}`)
    console.log(`   Active: ${conn.is_active}`)
    console.log(`   Last Sync: ${conn.last_sync_at}`)
    console.log(`   Created: ${conn.created_at}\n`)
  } else {
    console.log('❌ No credentials in tenant_meliusly.shopify_connections\n')
    console.log('   This means the OAuth token has not been stored yet.\n')
  }

  // 5. Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (installation && resolvedOrgId === MELIUSLY_ORG_ID && active && connectionResult.rows.length > 0) {
    console.log('✅ All checks passed! Meliusly installation is complete.\n')
    console.log('Next steps:')
    console.log('1. Test webhook routing')
    console.log('2. Test Storefront API access')
    console.log('3. Proceed to Phase 1D (Update organization)\n')
  } else {
    console.log('⚠️  Installation incomplete. See missing items above.\n')
    console.log('If you have installed the app via Shopify UI but records are missing,')
    console.log('you may need to manually create the installation record.\n')
    console.log('Run this command to manually record the installation:')
    console.log(`  pnpm tsx scripts/record-meliusly-installation.ts\n`)
  }

  process.exit(0)
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
