#!/usr/bin/env tsx

/**
 * Manually Record Meliusly Shopify App Installation
 *
 * Use this script ONLY if:
 * 1. You installed the app via Shopify OAuth UI
 * 2. The installation record was not automatically created
 * 3. You need to manually link the shop to the Meliusly organization
 *
 * This script will create the entry in public.shopify_app_installations
 * to enable tenant resolution.
 *
 * Usage:
 *   pnpm tsx scripts/record-meliusly-installation.ts
 */

import { recordShopInstallation } from '@cgk-platform/shopify/app/tenant-resolution'

const MELIUSLY_SHOP = 'meliusly.myshopify.com'
const MELIUSLY_ORG_ID = '5cb87b13-3b13-4400-9542-53c8b8d12cb8'

// Scopes from shopify.app.toml
const SCOPES = [
  'write_pixels',
  'read_customer_events',
  'read_orders',
  'write_orders',
  'read_customers',
  'write_customers',
  'read_draft_orders',
  'write_draft_orders',
  'read_products',
  'write_products',
  'read_discounts',
  'write_discounts',
  'read_price_rules',
  'write_price_rules',
  'read_inventory',
  'write_inventory',
  'read_fulfillments',
  'write_fulfillments',
  'read_shipping',
  'write_shipping',
  'read_gift_cards',
  'write_gift_cards',
  'read_content',
  'write_content',
  'read_themes',
  'read_locales',
  'read_markets',
  'read_reports',
  'read_analytics',
  'read_checkouts',
  'write_checkouts',
  'read_product_listings',
  'read_publications',
  'read_locations',
  'read_merchant_managed_fulfillment_orders',
  'write_merchant_managed_fulfillment_orders',
  'read_third_party_fulfillment_orders',
  'write_third_party_fulfillment_orders',
  'read_assigned_fulfillment_orders',
  'write_assigned_fulfillment_orders',
  'read_files',
  'write_files',
  'read_delivery_customizations',
  'write_delivery_customizations',
  'read_cart_transforms',
  'write_cart_transforms',
]

async function main() {
  console.log('📝 Recording Meliusly Shopify App Installation...\n')
  console.log(`   Shop: ${MELIUSLY_SHOP}`)
  console.log(`   Organization ID: ${MELIUSLY_ORG_ID}`)
  console.log(`   Scopes: ${SCOPES.length} scopes\n`)

  try {
    await recordShopInstallation({
      shop: MELIUSLY_SHOP,
      organizationId: MELIUSLY_ORG_ID,
      scopes: SCOPES,
      shopifyAppId: null, // Not available for manual recording
      primaryContactEmail: null,
    })

    console.log('✅ Installation recorded successfully!\n')
    console.log('Next steps:')
    console.log('1. Run verification script: pnpm tsx scripts/verify-meliusly-installation.ts')
    console.log('2. Test tenant resolution')
    console.log('3. Test webhook routing\n')
  } catch (error) {
    console.error('❌ Error recording installation:', error)
    throw error
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
