/**
 * Unit Tests for Encryption Utilities
 *
 * Tests encryption/decryption roundtrip, key handling,
 * and sensitive column detection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  encrypt,
  decrypt,
  encryptIfPresent,
  isEncryptedPayload,
  reEncrypt,
  hashForComparison,
  isSensitiveColumn,
  encryptSensitiveColumns,
  SENSITIVE_COLUMNS,
} from '../../lib/encryption.js'
import { EDGE_CASES } from '../fixtures/test-data.js'

describe('Encryption/Decryption Roundtrip', () => {
  const originalKey = process.env['MIGRATION_ENCRYPTION_KEY']

  beforeEach(() => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'
  })

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env['MIGRATION_ENCRYPTION_KEY'] = originalKey
    } else {
      delete process.env['MIGRATION_ENCRYPTION_KEY']
    }
  })

  it('encrypts and decrypts a simple string', () => {
    const plaintext = 'Hello, World!'
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('produces different ciphertexts for the same plaintext', () => {
    const plaintext = 'Same message'
    const encrypted1 = encrypt(plaintext)
    const encrypted2 = encrypt(plaintext)

    // Due to random IV and salt, encryptions should differ
    expect(encrypted1).not.toBe(encrypted2)

    // But both should decrypt to the same value
    expect(decrypt(encrypted1)).toBe(plaintext)
    expect(decrypt(encrypted2)).toBe(plaintext)
  })

  it('handles empty strings', () => {
    const plaintext = ''
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('handles very long strings', () => {
    const plaintext = EDGE_CASES.longString
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('handles unicode characters', () => {
    const plaintext = EDGE_CASES.unicodeText
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('handles special characters', () => {
    const plaintext = EDGE_CASES.specialChars
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('handles JSON strings', () => {
    const plaintext = JSON.stringify({ key: 'value', nested: { array: [1, 2, 3] } })
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
    expect(JSON.parse(decrypted)).toEqual({ key: 'value', nested: { array: [1, 2, 3] } })
  })

  it('handles newlines and whitespace', () => {
    const plaintext = 'Line 1\nLine 2\r\nLine 3\t\tTabbed'
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })
})

describe('Encrypted Payload Format', () => {
  beforeEach(() => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'
  })

  it('produces payload with 4 colon-separated parts', () => {
    const encrypted = encrypt('test')
    const parts = encrypted.split(':')

    expect(parts).toHaveLength(4)
  })

  it('produces valid base64 encoded parts', () => {
    const encrypted = encrypt('test')
    const parts = encrypted.split(':')

    // Each part should be valid base64
    const base64Regex = /^[A-Za-z0-9+/]*(=*)$/
    parts.forEach((part) => {
      expect(base64Regex.test(part)).toBe(true)
    })
  })

  it('isEncryptedPayload returns true for valid payloads', () => {
    const encrypted = encrypt('test')

    expect(isEncryptedPayload(encrypted)).toBe(true)
  })

  it('isEncryptedPayload returns false for plaintext', () => {
    expect(isEncryptedPayload('plaintext')).toBe(false)
    expect(isEncryptedPayload('hello world')).toBe(false)
    expect(isEncryptedPayload('')).toBe(false)
  })

  it('isEncryptedPayload returns false for invalid formats', () => {
    expect(isEncryptedPayload('a:b:c')).toBe(false) // Only 3 parts
    expect(isEncryptedPayload('a:b:c:d:e')).toBe(false) // 5 parts
    // Empty parts with colons technically pass regex check, testing only structural issues
    expect(isEncryptedPayload('not:valid:base64:!!!')).toBe(false) // Invalid base64 with special chars
  })
})

describe('Invalid Decryption', () => {
  beforeEach(() => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'
  })

  it('throws error for invalid payload format', () => {
    expect(() => decrypt('invalid')).toThrow('Invalid encrypted payload format')
    expect(() => decrypt('a:b:c')).toThrow('Invalid encrypted payload format')
  })

  it('throws error for tampered ciphertext', () => {
    const encrypted = encrypt('test')
    const parts = encrypted.split(':')
    // Tamper with the ciphertext (4th part)
    parts[3] = 'AAAA' + parts[3].slice(4)
    const tampered = parts.join(':')

    expect(() => decrypt(tampered)).toThrow()
  })

  it('throws error for wrong key', () => {
    const encrypted = encrypt('test')

    // Change the key
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'different-key-also-32-chars-!!'

    expect(() => decrypt(encrypted)).toThrow()
  })
})

describe('encryptIfPresent', () => {
  beforeEach(() => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'
  })

  it('encrypts non-null strings', () => {
    const result = encryptIfPresent('secret')

    expect(result).not.toBeNull()
    expect(isEncryptedPayload(result as string)).toBe(true)
    expect(decrypt(result as string)).toBe('secret')
  })

  it('returns null for null input', () => {
    expect(encryptIfPresent(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(encryptIfPresent(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(encryptIfPresent('')).toBeNull()
  })
})

describe('reEncrypt', () => {
  beforeEach(() => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'
  })

  afterEach(() => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'
  })

  it('re-encrypts with a new key', () => {
    const plaintext = 'secret message'
    const originalEncrypted = encrypt(plaintext)
    const newKey = 'brand-new-key-also-32-characters'

    const reEncrypted = reEncrypt(originalEncrypted, newKey)

    // Reencrypted should be different
    expect(reEncrypted).not.toBe(originalEncrypted)

    // Should decrypt with new key
    process.env['MIGRATION_ENCRYPTION_KEY'] = newKey
    expect(decrypt(reEncrypted)).toBe(plaintext)
  })

  it('restores original key after re-encryption', () => {
    const originalKey = 'test-encryption-key-32-chars-!'
    process.env['MIGRATION_ENCRYPTION_KEY'] = originalKey

    const encrypted = encrypt('test')
    reEncrypt(encrypted, 'new-key-for-testing-32-chars-!!')

    // Original key should still be set
    expect(process.env['MIGRATION_ENCRYPTION_KEY']).toBe(originalKey)
  })
})

describe('hashForComparison', () => {
  beforeEach(() => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'
  })

  it('produces consistent hashes for same input', () => {
    const hash1 = hashForComparison('test')
    const hash2 = hashForComparison('test')

    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different inputs', () => {
    const hash1 = hashForComparison('test1')
    const hash2 = hashForComparison('test2')

    expect(hash1).not.toBe(hash2)
  })

  it('produces hex string', () => {
    const hash = hashForComparison('test')

    expect(/^[a-f0-9]+$/i.test(hash)).toBe(true)
  })

  it('produces 64-character hash (SHA-256)', () => {
    const hash = hashForComparison('test')

    expect(hash).toHaveLength(64)
  })
})

describe('isSensitiveColumn', () => {
  it('detects known sensitive columns', () => {
    SENSITIVE_COLUMNS.forEach((column) => {
      expect(isSensitiveColumn(column)).toBe(true)
    })
  })

  it('detects columns ending with _encrypted', () => {
    expect(isSensitiveColumn('data_encrypted')).toBe(true)
    expect(isSensitiveColumn('token_encrypted')).toBe(true)
  })

  it('detects columns ending with _secret', () => {
    expect(isSensitiveColumn('api_secret')).toBe(true)
    expect(isSensitiveColumn('client_secret')).toBe(true)
  })

  it('detects columns ending with _token', () => {
    expect(isSensitiveColumn('auth_token')).toBe(true)
    expect(isSensitiveColumn('session_token')).toBe(true)
  })

  it('detects columns ending with _key', () => {
    expect(isSensitiveColumn('api_key')).toBe(true)
    expect(isSensitiveColumn('private_key')).toBe(true)
  })

  it('detects columns containing password', () => {
    expect(isSensitiveColumn('password')).toBe(true)
    expect(isSensitiveColumn('password_hash')).toBe(true)
    expect(isSensitiveColumn('user_password')).toBe(true)
  })

  it('detects columns containing credential', () => {
    expect(isSensitiveColumn('credentials')).toBe(true)
    expect(isSensitiveColumn('user_credential')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isSensitiveColumn('ACCESS_TOKEN')).toBe(true)
    expect(isSensitiveColumn('Api_Key')).toBe(true)
    expect(isSensitiveColumn('PAYOUT_DETAILS')).toBe(true)
  })

  it('returns false for non-sensitive columns', () => {
    expect(isSensitiveColumn('id')).toBe(false)
    expect(isSensitiveColumn('name')).toBe(false)
    expect(isSensitiveColumn('email')).toBe(false)
    expect(isSensitiveColumn('created_at')).toBe(false)
    expect(isSensitiveColumn('status')).toBe(false)
    expect(isSensitiveColumn('description')).toBe(false)
  })
})

describe('encryptSensitiveColumns', () => {
  beforeEach(() => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'
  })

  it('encrypts auto-detected sensitive columns', () => {
    const row = {
      id: '123',
      name: 'Test',
      access_token: 'secret_token',
      api_key: 'secret_key',
    }

    const result = encryptSensitiveColumns(row)

    expect(result.id).toBe('123')
    expect(result.name).toBe('Test')
    expect(isEncryptedPayload(result.access_token as string)).toBe(true)
    expect(isEncryptedPayload(result.api_key as string)).toBe(true)
    expect(decrypt(result.access_token as string)).toBe('secret_token')
    expect(decrypt(result.api_key as string)).toBe('secret_key')
  })

  it('encrypts specified sensitive columns', () => {
    const row = {
      id: '123',
      custom_field: 'should_encrypt',
      other_field: 'should_not_encrypt',
    }

    const result = encryptSensitiveColumns(row, ['custom_field'])

    expect(isEncryptedPayload(result.custom_field as string)).toBe(true)
    expect(result.other_field).toBe('should_not_encrypt')
  })

  it('does not double-encrypt already encrypted values', () => {
    const original = 'secret_value'
    const alreadyEncrypted = encrypt(original)

    const row = {
      access_token: alreadyEncrypted,
    }

    const result = encryptSensitiveColumns(row)

    // Should remain the same (not double-encrypted)
    expect(result.access_token).toBe(alreadyEncrypted)
    expect(decrypt(result.access_token as string)).toBe(original)
  })

  it('handles null sensitive values', () => {
    const row = {
      id: '123',
      access_token: null,
    }

    const result = encryptSensitiveColumns(row)

    expect(result.access_token).toBeNull()
  })

  it('handles empty string sensitive values', () => {
    const row = {
      id: '123',
      access_token: '',
    }

    const result = encryptSensitiveColumns(row)

    // Empty strings should not be encrypted
    expect(result.access_token).toBe('')
  })

  it('handles non-string sensitive values', () => {
    const row = {
      id: '123',
      api_key: 12345, // Non-string
    }

    const result = encryptSensitiveColumns(row)

    // Non-strings should not be encrypted
    expect(result.api_key).toBe(12345)
  })

  it('preserves original row (immutable)', () => {
    const row = {
      id: '123',
      access_token: 'secret',
    }

    const result = encryptSensitiveColumns(row)

    // Original should be unchanged
    expect(row.access_token).toBe('secret')
    // Result should have encrypted value
    expect(isEncryptedPayload(result.access_token as string)).toBe(true)
  })
})

describe('Key Generation Warning', () => {
  it('generates random key when MIGRATION_ENCRYPTION_KEY is not set', () => {
    const originalKey = process.env['MIGRATION_ENCRYPTION_KEY']
    delete process.env['MIGRATION_ENCRYPTION_KEY']

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // This should trigger the warning and generate a key
    const encrypted = encrypt('test')

    expect(consoleSpy).toHaveBeenCalled()
    expect(isEncryptedPayload(encrypted)).toBe(true)

    consoleSpy.mockRestore()

    // Restore key
    if (originalKey !== undefined) {
      process.env['MIGRATION_ENCRYPTION_KEY'] = originalKey
    }
  })
})
