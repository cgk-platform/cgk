#!/usr/bin/env tsx
/**
 * Fix Shopify Storefront Token Encryption
 *
 * This script re-encrypts the Shopify Storefront Access Token with the correct format.
 *
 * Usage:
 *   1. Get your plaintext Shopify Storefront Access Token from Shopify Admin
 *   2. Run: SHOPIFY_TOKEN="shpat_xxxxx" pnpm tsx scripts/fix-shopify-token.ts
 *
 * The script will:
 *   - Encrypt the token with the correct format (iv:authTag:cipherText)
 *   - Update the database
 *   - Verify the token can be decrypted
 */

import { sql } from '@vercel/postgres'
import { encryptToken, decryptToken } from '../packages/shopify/src/oauth/encryption'

const TENANT_ID = '5cb87b13-3b13-4400-9542-53c8b8d12cb8'

async function main() {
  const plaintextToken = process.env.SHOPIFY_TOKEN

  if (!plaintextToken) {
    console.error('❌ Error: SHOPIFY_TOKEN environment variable is required')
    console.error('')
    console.error('Usage:')
    console.error('  SHOPIFY_TOKEN="shpat_xxxxx" pnpm tsx scripts/fix-shopify-token.ts')
    console.error('')
    console.error('Get your token from:')
    console.error('  1. Shopify Admin → Settings → Apps and sales channels')
    console.error('  2. Develop apps → CGK Platform app')
    console.error('  3. API credentials → Storefront API access token')
    process.exit(1)
  }

  console.log('🔐 Encrypting token with correct format...')
  const encrypted = encryptToken(plaintextToken)

  console.log('✅ Token encrypted successfully')
  console.log(`   Format: iv:authTag:cipherText`)
  console.log(`   Length: ${encrypted.length} chars`)
  console.log(`   Parts: ${encrypted.split(':').length}`)

  // Verify decryption works
  console.log('')
  console.log('🔓 Verifying decryption...')
  const decrypted = decryptToken(encrypted)

  if (decrypted === plaintextToken) {
    console.log('✅ Decryption verified - token matches original')
  } else {
    console.error('❌ Decryption failed - token mismatch!')
    process.exit(1)
  }

  // Update database
  console.log('')
  console.log('💾 Updating database...')

  await sql`
    UPDATE public.shopify_connections
    SET
      storefront_api_token_encrypted = ${encrypted},
      updated_at = NOW()
    WHERE tenant_id = ${TENANT_ID}
  `

  console.log('✅ Database updated successfully')
  console.log('')
  console.log('✨ Done! Your Shopify storefront should now work correctly.')
  console.log('')
  console.log('Test it:')
  console.log('  1. Deploy to Vercel (git push)')
  console.log('  2. Visit: https://cgk-meliusly-storefront.vercel.app')
  console.log('  3. Check products load correctly')

  await sql.end()
}

main().catch((error) => {
  console.error('❌ Error:', error.message)
  if (error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
})
