/**
 * @cgk/slack - Token encryption utilities
 *
 * @ai-pattern encryption
 * @ai-note AES-256-CBC encryption for Slack tokens with SCRYPT key derivation
 */

import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const SALT_LENGTH = 16
const SCRYPT_COST = 16384
const SCRYPT_BLOCK_SIZE = 8
const SCRYPT_PARALLELIZATION = 1

/**
 * Get the encryption key from environment variables
 * @throws Error if key is not configured or too short
 */
function getEncryptionKey(): string {
  const key = process.env.SLACK_TOKEN_ENCRYPTION_KEY

  if (!key) {
    throw new Error(
      'SLACK_TOKEN_ENCRYPTION_KEY environment variable is required. ' +
      'Must be at least 32 characters for AES-256 encryption.'
    )
  }

  if (key.length < 32) {
    throw new Error(
      `SLACK_TOKEN_ENCRYPTION_KEY must be at least 32 characters (got ${key.length}). ` +
      'Use a strong random string for production.'
    )
  }

  return key
}

/**
 * Derive a 256-bit key from the master key using SCRYPT
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return scryptSync(masterKey, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  })
}

/**
 * Encrypt a Slack token using AES-256-CBC
 *
 * Format: base64(salt + iv + ciphertext)
 *
 * @param plaintext - The token to encrypt
 * @returns Base64-encoded encrypted token
 */
export function encryptToken(plaintext: string): string {
  const masterKey = getEncryptionKey()
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(masterKey, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  // Combine salt + iv + ciphertext
  const combined = Buffer.concat([salt, iv, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt a Slack token encrypted with encryptToken
 *
 * @param encrypted - Base64-encoded encrypted token
 * @returns The decrypted token
 */
export function decryptToken(encrypted: string): string {
  const masterKey = getEncryptionKey()
  const combined = Buffer.from(encrypted, 'base64')

  // Extract salt, iv, and ciphertext
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH)

  const key = deriveKey(masterKey, salt)
  const decipher = createDecipheriv(ALGORITHM, key, iv)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey()
    return true
  } catch {
    return false
  }
}

/**
 * Validate encryption configuration
 * @throws Error if configuration is invalid
 */
export function validateEncryptionConfig(): void {
  getEncryptionKey()
}
