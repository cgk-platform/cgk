/**
 * Token encryption/decryption for Shopify OAuth tokens
 *
 * Uses AES-256-GCM for authenticated encryption.
 * Tokens are stored as: iv:authTag:cipherText (all hex-encoded)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { ShopifyError } from './errors.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

/**
 * Get the encryption key from environment
 * @throws ShopifyError if key is missing or invalid
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY

  if (!keyHex) {
    throw new ShopifyError(
      'MISSING_CONFIG',
      'SHOPIFY_TOKEN_ENCRYPTION_KEY environment variable is required'
    )
  }

  if (keyHex.length !== 64) {
    throw new ShopifyError(
      'MISSING_CONFIG',
      'SHOPIFY_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters)'
    )
  }

  return Buffer.from(keyHex, 'hex')
}

/**
 * Encrypt a token using AES-256-GCM
 *
 * @param token - Plaintext token to encrypt
 * @returns Encrypted string in format: iv:authTag:cipherText
 */
export function encryptToken(token: string): string {
  try {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(token, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    // Format: iv:authTag:encrypted (all hex-encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  } catch (error) {
    if (error instanceof ShopifyError) {
      throw error
    }
    throw new ShopifyError(
      'ENCRYPTION_FAILED',
      'Failed to encrypt token',
      { error: error instanceof Error ? error.message : String(error) }
    )
  }
}

/**
 * Decrypt a token encrypted with AES-256-GCM
 *
 * @param encrypted - Encrypted string in format: iv:authTag:cipherText
 * @returns Decrypted plaintext token
 */
export function decryptToken(encrypted: string): string {
  try {
    const key = getEncryptionKey()
    const parts = encrypted.split(':')

    if (parts.length !== 3) {
      throw new ShopifyError(
        'DECRYPTION_FAILED',
        'Invalid encrypted token format'
      )
    }

    const [ivHex, authTagHex, cipherText] = parts

    const iv = Buffer.from(ivHex!, 'hex')
    const authTag = Buffer.from(authTagHex!, 'hex')

    if (iv.length !== IV_LENGTH) {
      throw new ShopifyError(
        'DECRYPTION_FAILED',
        'Invalid IV length in encrypted token'
      )
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new ShopifyError(
        'DECRYPTION_FAILED',
        'Invalid auth tag length in encrypted token'
      )
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(cipherText!, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    if (error instanceof ShopifyError) {
      throw error
    }
    throw new ShopifyError(
      'DECRYPTION_FAILED',
      'Failed to decrypt token',
      { error: error instanceof Error ? error.message : String(error) }
    )
  }
}

/**
 * Generate a secure random token
 *
 * @param bytes - Number of random bytes
 * @returns Hex-encoded random token
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex')
}
