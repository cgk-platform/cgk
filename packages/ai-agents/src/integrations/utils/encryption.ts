/**
 * Encryption utilities for storing sensitive integration credentials
 *
 * Uses AES-256-GCM for encryption with a random IV per encryption
 * The encryption key should be stored in environment variables
 */

import * as crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Get the encryption key from environment
 * Key should be a 32-byte hex string (64 characters)
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY or ENCRYPTION_KEY environment variable is required for credential encryption'
    )
  }

  // Support both hex and base64 encoded keys
  let key: Buffer
  if (keyHex.length === 64) {
    key = Buffer.from(keyHex, 'hex')
  } else if (keyHex.length === 44) {
    key = Buffer.from(keyHex, 'base64')
  } else {
    throw new Error(
      `Invalid encryption key length. Expected 64 hex chars or 44 base64 chars, got ${keyHex.length}`
    )
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes`)
  }

  return key
}

/**
 * Encrypt a string value
 *
 * @param plaintext - The value to encrypt
 * @returns Encrypted value as base64 string (format: iv:tag:ciphertext)
 *
 * @example
 * ```ts
 * const encrypted = encrypt('my-secret-token')
 * // Store encrypted in database
 * ```
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  // Combine iv + tag + ciphertext and encode as base64
  const combined = Buffer.concat([iv, tag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt an encrypted value
 *
 * @param encryptedBase64 - The encrypted value (base64 string)
 * @returns Decrypted plaintext
 *
 * @example
 * ```ts
 * const decrypted = decrypt(storedEncryptedValue)
 * // Use decrypted value
 * ```
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedBase64, 'base64')

  // Extract iv, tag, and ciphertext
  const iv = combined.subarray(0, IV_LENGTH)
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

/**
 * Safely decrypt a value, returning null if decryption fails
 *
 * @param encryptedBase64 - The encrypted value (base64 string) or null
 * @returns Decrypted plaintext or null
 */
export function safeDecrypt(encryptedBase64: string | null | undefined): string | null {
  if (!encryptedBase64) return null

  try {
    return decrypt(encryptedBase64)
  } catch (error) {
    console.error('[encryption] Failed to decrypt value:', error)
    return null
  }
}

/**
 * Check if a value appears to be encrypted (base64 encoded with correct structure)
 */
export function isEncrypted(value: string): boolean {
  try {
    const decoded = Buffer.from(value, 'base64')
    // Should have at least iv (16) + tag (16) + some ciphertext
    return decoded.length > IV_LENGTH + TAG_LENGTH
  } catch {
    return false
  }
}

/**
 * Generate a new encryption key (for setup/rotation)
 *
 * @returns A random 256-bit key as hex string
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex')
}

/**
 * Hash a value for lookup purposes (not encryption)
 * Uses SHA-256 to create a deterministic hash
 */
export function hashForLookup(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}
