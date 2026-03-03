import { logger } from '@cgk-platform/logging'
require('dotenv').config({ path: '.env.local' })
const { sql } = require('@vercel/postgres')
const crypto = require('crypto')

const IV_LENGTH = 12

// Decrypt function (format: iv:authTag:cipherText)
function decrypt(encrypted, keyHex) {
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid format')

  const [ivHex, authTagHex, cipherText] = parts
  const key = Buffer.from(keyHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(cipherText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Encrypt function (format: iv:authTag:cipherText)
function encrypt(token, keyHex) {
  const key = Buffer.from(keyHex, 'hex')
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

;(async () => {
  const encKey = process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY

  // Get admin token
  const conn = await sql`
    SELECT shop, access_token_encrypted
    FROM tenant_meliusly.shopify_connections
    WHERE status = 'active'
    LIMIT 1
  `

  const adminToken = decrypt(conn.rows[0].access_token_encrypted, encKey)
  const shop = conn.rows[0].shop

  logger.info('Creating Storefront Access Token for', shop)

  // Create storefront token via Admin API
  const response = await fetch(`https://${shop}/admin/api/2026-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': adminToken,
    },
    body: JSON.stringify({
      query: `
        mutation {
          storefrontAccessTokenCreate(input: {
            title: "Meliusly Headless Storefront"
          }) {
            storefrontAccessToken {
              accessToken
              title
            }
            userErrors {
              field
              message
            }
          }
        }
      `
    })
  })

  const result = await response.json()

  if (result.data?.storefrontAccessTokenCreate?.storefrontAccessToken) {
    const storefrontToken = result.data.storefrontAccessTokenCreate.storefrontAccessToken.accessToken
    logger.info('✓ Created Storefront Token')

    // Encrypt and save to database
    const encrypted = encrypt(storefrontToken, encKey)

    await sql`
      UPDATE tenant_meliusly.shopify_connections
      SET storefront_api_token_encrypted = ${encrypted},
          updated_at = NOW()
      WHERE shop = ${shop}
    `

    logger.info('✓ Saved to database')
    logger.info('✓ Storefront can now fetch products from Shopify!')
  } else {
    logger.error('Error creating token:', JSON.stringify(result, null, 2))
  }

  process.exit(0)
})()
