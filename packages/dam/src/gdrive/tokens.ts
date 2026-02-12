/**
 * Token Encryption/Decryption
 * Handles secure storage of OAuth tokens using AES-256-GCM
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

/**
 * Get encryption key from environment
 * Key must be exactly 32 bytes (256 bits)
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.DAM_TOKEN_ENCRYPTION_KEY

  if (!keyEnv) {
    throw new Error(
      'DAM_TOKEN_ENCRYPTION_KEY environment variable is required. ' +
      'Generate one with: openssl rand -hex 32'
    )
  }

  // Support both hex-encoded and base64-encoded keys
  let key: Buffer
  if (keyEnv.length === 64) {
    // Hex encoded (64 chars = 32 bytes)
    key = Buffer.from(keyEnv, 'hex')
  } else if (keyEnv.length === 44) {
    // Base64 encoded (44 chars ~ 32 bytes)
    key = Buffer.from(keyEnv, 'base64')
  } else {
    throw new Error(
      'DAM_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)'
    )
  }

  if (key.length !== 32) {
    throw new Error('Encryption key must be exactly 32 bytes')
  }

  return key
}

/**
 * Encrypt a token using AES-256-GCM
 *
 * Output format: base64(IV + AuthTag + EncryptedData)
 */
export function encryptToken(token: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Combine: IV (12 bytes) + AuthTag (16 bytes) + EncryptedData
  const combined = Buffer.concat([iv, authTag, encrypted])

  return combined.toString('base64')
}

/**
 * Decrypt a token encrypted with encryptToken
 */
export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedToken, 'base64')

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Rotate encrypted token with new key
 * Used during key rotation
 */
export function rotateTokenEncryption(
  encryptedToken: string,
  oldKey: string,
  newKey: string
): string {
  // Decrypt with old key
  const oldKeyBuffer = Buffer.from(oldKey, 'hex')
  const combined = Buffer.from(encryptedToken, 'base64')

  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, oldKeyBuffer, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  const token = decrypted.toString('utf8')

  // Re-encrypt with new key
  const newKeyBuffer = Buffer.from(newKey, 'hex')
  const newIv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, newKeyBuffer, newIv)
  const newEncrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const newAuthTag = cipher.getAuthTag()

  const newCombined = Buffer.concat([newIv, newAuthTag, newEncrypted])
  return newCombined.toString('base64')
}

/**
 * Validate that a string looks like an encrypted token
 */
export function isEncryptedToken(value: string): boolean {
  try {
    const buffer = Buffer.from(value, 'base64')
    // Minimum size: IV (12) + AuthTag (16) + at least 1 byte of data
    return buffer.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1
  } catch {
    return false
  }
}

/**
 * Generate a new encryption key
 * Returns a hex-encoded 32-byte key
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex')
}
