/**
 * Token encryption utilities using AES-256-GCM
 *
 * @ai-pattern security
 * @ai-required All tokens MUST be encrypted before database storage
 */

import crypto from 'crypto'

/** Encrypted token structure */
export interface EncryptedToken {
  salt: string // 16 bytes, hex
  iv: string // 16 bytes, hex
  authTag: string // 16 bytes, hex
  data: string // encrypted token, hex
}

/** PBKDF2 configuration */
const PBKDF2_ITERATIONS = 100000
const PBKDF2_KEY_LENGTH = 32 // 256 bits for AES-256
const PBKDF2_DIGEST = 'sha256'

/** Salt and IV lengths */
const SALT_LENGTH = 16
const IV_LENGTH = 16

/**
 * Encrypt a token using AES-256-GCM with PBKDF2 key derivation
 *
 * @param plaintext - The token to encrypt
 * @param encryptionKey - The master encryption key (should be 32+ chars)
 * @returns Encrypted token string in format: salt:iv:authTag:data (all hex)
 *
 * @ai-pattern encryption
 * @ai-required Use this for ALL token storage
 */
export async function encryptToken(
  plaintext: string,
  encryptionKey: string
): Promise<string> {
  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error('Encryption key must be at least 32 characters')
  }

  // Generate cryptographically secure salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)

  // Derive key from encryption key + salt using PBKDF2
  const key = crypto.pbkdf2Sync(
    encryptionKey,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST
  )

  // Create AES-256-GCM cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  // Encrypt the plaintext
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  // Get authentication tag
  const authTag = cipher.getAuthTag()

  // Return as: salt:iv:authTag:data (all hex)
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

/**
 * Decrypt a token encrypted with encryptToken
 *
 * @param encryptedString - The encrypted token string (salt:iv:authTag:data format)
 * @param encryptionKey - The master encryption key used for encryption
 * @returns The original plaintext token
 *
 * @ai-pattern encryption
 * @ai-required Use this when reading encrypted tokens from database
 */
export async function decryptToken(
  encryptedString: string,
  encryptionKey: string
): Promise<string> {
  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error('Encryption key must be at least 32 characters')
  }

  // Parse the encrypted string
  const parts = encryptedString.split(':')
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted token format')
  }

  const saltHex = parts[0]!
  const ivHex = parts[1]!
  const authTagHex = parts[2]!
  const dataHex = parts[3]!

  // Convert from hex
  const salt = Buffer.from(saltHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')

  // Validate buffer lengths
  if (salt.length !== SALT_LENGTH) {
    throw new Error('Invalid salt length')
  }
  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length')
  }
  if (authTag.length !== 16) {
    throw new Error('Invalid auth tag length')
  }

  // Derive key using same parameters
  const key = crypto.pbkdf2Sync(
    encryptionKey,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST
  )

  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  // Decrypt
  try {
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
    return decrypted.toString('utf8')
  } catch (error) {
    throw new Error('Decryption failed - invalid key or corrupted data')
  }
}

/**
 * Generate a secure encryption key
 * Use this to generate keys for environment variables
 *
 * @returns A 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Validate that a key meets minimum requirements
 */
export function isValidEncryptionKey(key: string): boolean {
  return typeof key === 'string' && key.length >= 32
}
