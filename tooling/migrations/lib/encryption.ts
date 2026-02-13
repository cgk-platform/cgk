/**
 * Encryption Utilities for Migration
 *
 * Provides AES-256-GCM encryption for sensitive data during migration.
 * Uses Node.js crypto module for encryption operations.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

/** Encryption algorithm - AES-256-GCM provides authenticated encryption */
const ALGORITHM = 'aes-256-gcm'

/** Key length in bytes (256 bits for AES-256) */
const KEY_LENGTH = 32

/** IV length in bytes (96 bits for GCM) */
const IV_LENGTH = 12

/**
 * Auth tag length: 16 bytes (128 bits) is the default for GCM mode.
 * This is handled internally by Node.js crypto module.
 */

/** Salt length for key derivation */
const SALT_LENGTH = 16

/**
 * Result of encryption operation
 */
export interface EncryptedData {
  /** Encrypted data as base64 string */
  ciphertext: string
  /** Initialization vector as base64 string */
  iv: string
  /** Authentication tag as base64 string */
  authTag: string
  /** Salt used for key derivation as base64 string */
  salt: string
}

/**
 * Combined encrypted payload (single string for storage)
 * Format: salt:iv:authTag:ciphertext (all base64)
 */
export type EncryptedPayload = string

/**
 * Derive an encryption key from a password using scrypt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH)
}

/**
 * Get the encryption key from environment
 * Falls back to a warning and generates a random key for development
 */
function getEncryptionKey(): string {
  const key = process.env['MIGRATION_ENCRYPTION_KEY']

  if (!key) {
    console.warn(
      '\x1b[33m[WARNING] MIGRATION_ENCRYPTION_KEY not set. ' +
        'Using generated key for development. ' +
        'Set MIGRATION_ENCRYPTION_KEY in production.\x1b[0m'
    )
    // Generate a random key for development (NOT for production use)
    return randomBytes(32).toString('hex')
  }

  return key
}

/**
 * Encrypt sensitive data using AES-256-GCM
 *
 * @param plaintext - The data to encrypt
 * @returns Encrypted payload as a single base64 string
 */
export function encrypt(plaintext: string): EncryptedPayload {
  const password = getEncryptionKey()
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(password, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Combine all parts into a single string: salt:iv:authTag:ciphertext
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

/**
 * Decrypt data encrypted with the encrypt function
 *
 * @param payload - The encrypted payload string
 * @returns Decrypted plaintext
 */
export function decrypt(payload: EncryptedPayload): string {
  const password = getEncryptionKey()
  const parts = payload.split(':')

  if (parts.length !== 4) {
    throw new Error('Invalid encrypted payload format')
  }

  const [saltB64, ivB64, authTagB64, ciphertextB64] = parts as [string, string, string, string]

  const salt = Buffer.from(saltB64, 'base64')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')

  const key = deriveKey(password, salt)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * Encrypt a value if it exists, return null otherwise
 */
export function encryptIfPresent(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  return encrypt(value)
}

/**
 * Check if a string is an encrypted payload
 */
export function isEncryptedPayload(value: string): boolean {
  const parts = value.split(':')
  if (parts.length !== 4) {
    return false
  }

  // Check if all parts are valid base64
  const base64Regex = /^[A-Za-z0-9+/]*(=*)$/
  return parts.every((part) => base64Regex.test(part))
}

/**
 * Re-encrypt data with a new key
 * Useful for key rotation
 */
export function reEncrypt(payload: EncryptedPayload, newPassword: string): EncryptedPayload {
  const plaintext = decrypt(payload)

  // Temporarily override the key for encryption
  const originalKey = process.env['MIGRATION_ENCRYPTION_KEY']
  process.env['MIGRATION_ENCRYPTION_KEY'] = newPassword

  try {
    return encrypt(plaintext)
  } finally {
    // Restore original key
    if (originalKey !== undefined) {
      process.env['MIGRATION_ENCRYPTION_KEY'] = originalKey
    } else {
      delete process.env['MIGRATION_ENCRYPTION_KEY']
    }
  }
}

/**
 * Hash a value for comparison without exposing the original
 * Uses HMAC-SHA256 for consistency
 */
export function hashForComparison(value: string): string {
  const { createHmac } = require('crypto') as typeof import('crypto')
  const key = getEncryptionKey()
  return createHmac('sha256', key).update(value).digest('hex')
}

/**
 * Sensitive column identifiers that should be encrypted
 */
export const SENSITIVE_COLUMNS = [
  'access_token',
  'access_token_encrypted',
  'refresh_token',
  'refresh_token_encrypted',
  'api_key',
  'api_secret',
  'private_api_key',
  'webhook_secret',
  'payout_details',
  'password_hash',
  'ssn',
  'tax_id',
  'bank_account',
  'routing_number',
] as const

export type SensitiveColumn = (typeof SENSITIVE_COLUMNS)[number]

/**
 * Check if a column name indicates sensitive data
 */
export function isSensitiveColumn(columnName: string): boolean {
  const lowerName = columnName.toLowerCase()

  // Check exact matches
  if (SENSITIVE_COLUMNS.includes(lowerName as SensitiveColumn)) {
    return true
  }

  // Check patterns
  const sensitivePatterns = [
    /_encrypted$/,
    /_secret$/,
    /_token$/,
    /_key$/,
    /password/,
    /credential/,
    /^ssn/,
    /tax_id/,
  ]

  return sensitivePatterns.some((pattern) => pattern.test(lowerName))
}

/**
 * Encrypt sensitive columns in a row object
 */
export function encryptSensitiveColumns(
  row: Record<string, unknown>,
  sensitiveColumns?: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...row }

  for (const [key, value] of Object.entries(row)) {
    // Check if this column should be encrypted
    const shouldEncrypt =
      sensitiveColumns?.includes(key) || isSensitiveColumn(key)

    if (shouldEncrypt && typeof value === 'string' && value !== '') {
      // Check if already encrypted
      if (!isEncryptedPayload(value)) {
        result[key] = encrypt(value)
      }
    }
  }

  return result
}
