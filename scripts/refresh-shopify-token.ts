#!/usr/bin/env tsx
/**
 * Refresh expired Shopify access token using refresh token
 */

import { sql } from '@vercel/postgres'

const SHOP = 'meliusly.myshopify.com'

async function main() {
  console.log('🔄 Refreshing Shopify Access Token\n')

  // 1. Get refresh token and session ID
  console.log('1. Fetching refresh token from database...')
  const sessionResult = await sql`
    SELECT id, shop, "refreshToken", "refreshTokenExpires"
    FROM public.shopify_sessions
    WHERE shop = ${SHOP}
    AND "isOnline" = false
    LIMIT 1
  `

  if (sessionResult.rows.length === 0) {
    throw new Error('No session found')
  }

  const session = sessionResult.rows[0]
  const refreshToken = session.refreshToken as string | null
  const sessionId = session.id as string

  if (!refreshToken) {
    throw new Error('No refresh token available - need to reinstall app')
  }

  console.log(`   ✅ Found refresh token (expires: ${session.refreshTokenExpires})`)

  // 2. Get API credentials
  const apiKey = process.env.SHOPIFY_API_KEY
  const apiSecret = process.env.SHOPIFY_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('SHOPIFY_API_KEY and SHOPIFY_API_SECRET must be set')
  }

  // 3. Call Shopify token exchange endpoint
  console.log('\n2. Exchanging refresh token for new access token...')

  const response = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token refresh failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const newAccessToken = data.access_token

  if (!newAccessToken) {
    throw new Error('No access token in response')
  }

  console.log('   ✅ Received new access token')

  // 4. Update session in database
  console.log('\n3. Updating session in database...')

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

  await sql`
    UPDATE public.shopify_sessions
    SET
      "accessToken" = ${newAccessToken},
      expires = ${expiresAt.toISOString()}
    WHERE id = ${sessionId}
  `

  console.log('   ✅ Session updated')
  console.log(`   Token expires: ${expiresAt.toISOString()}`)

  console.log('\n✅ Token refreshed successfully!')
  console.log('\nNow run the storefront token creation script:')
  console.log('  pnpm tsx scripts/auto-create-storefront-token.ts')

  await sql.end()
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})
