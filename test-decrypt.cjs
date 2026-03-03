require('dotenv').config({ path: 'apps/admin/.env.local' })
const { sql } = require('@vercel/postgres')
const crypto = require('crypto')

async function decryptToken(encrypted) {
  const key = Buffer.from(process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY, 'hex')
  const parts = encrypted.split(':')
  
  console.log('Decryption attempt:')
  console.log('  Parts:', parts.length)
  console.log('  Key length:', key.length, 'bytes')
  
  if (parts.length !== 3) {
    throw new Error(`Invalid format: ${parts.length} parts instead of 3`)
  }
  
  const [ivHex, authTagHex, cipherText] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  
  console.log('  IV length:', iv.length, 'bytes (expect 12)')
  console.log('  AuthTag length:', authTag.length, 'bytes (expect 16)')
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(cipherText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

;(async () => {
  const result = await sql`
    SELECT storefront_api_token_encrypted
    FROM tenant_meliusly.shopify_connections
    WHERE status = 'active'
  `
  
  const token = result.rows[0].storefront_api_token_encrypted
  
  try {
    const decrypted = await decryptToken(token)
    console.log('\n✅ Decryption SUCCESS')
    console.log('  Token starts with:', decrypted.substring(0, 20) + '...')
    console.log('  Token length:', decrypted.length, 'chars')
  } catch (error) {
    console.log('\n❌ Decryption FAILED:', error.message)
  }
  
  process.exit(0)
})()
