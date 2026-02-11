import { describe, expect, it } from 'vitest'

import {
  decryptToken,
  encryptToken,
  generateEncryptionKey,
  isValidEncryptionKey,
} from '../encryption.js'

describe('encryption', () => {
  const testKey = generateEncryptionKey()

  describe('encryptToken', () => {
    it('encrypts a token successfully', async () => {
      const token = 'my-secret-token'
      const encrypted = await encryptToken(token, testKey)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(token)
      expect(encrypted.split(':')).toHaveLength(4)
    })

    it('produces different output for same input (random salt/IV)', async () => {
      const token = 'my-secret-token'
      const encrypted1 = await encryptToken(token, testKey)
      const encrypted2 = await encryptToken(token, testKey)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('throws error for short encryption key', async () => {
      await expect(encryptToken('token', 'short')).rejects.toThrow(
        'Encryption key must be at least 32 characters'
      )
    })
  })

  describe('decryptToken', () => {
    it('decrypts an encrypted token correctly', async () => {
      const originalToken = 'my-secret-access-token-12345'
      const encrypted = await encryptToken(originalToken, testKey)
      const decrypted = await decryptToken(encrypted, testKey)

      expect(decrypted).toBe(originalToken)
    })

    it('throws error for wrong encryption key', async () => {
      const token = 'my-secret-token'
      const encrypted = await encryptToken(token, testKey)
      const wrongKey = generateEncryptionKey()

      await expect(decryptToken(encrypted, wrongKey)).rejects.toThrow(
        'Decryption failed'
      )
    })

    it('throws error for invalid format', async () => {
      await expect(decryptToken('invalid', testKey)).rejects.toThrow(
        'Invalid encrypted token format'
      )
    })

    it('throws error for short key', async () => {
      await expect(decryptToken('a:b:c:d', 'short')).rejects.toThrow(
        'Encryption key must be at least 32 characters'
      )
    })
  })

  describe('round-trip', () => {
    it('handles special characters', async () => {
      const tokens = [
        'token-with-special-chars!@#$%^&*()',
        'unicode-token-\u00e9\u00e0\u00fc',
        'token with spaces',
        'token\nwith\nnewlines',
        JSON.stringify({ nested: { data: 'value' } }),
      ]

      for (const token of tokens) {
        const encrypted = await encryptToken(token, testKey)
        const decrypted = await decryptToken(encrypted, testKey)
        expect(decrypted).toBe(token)
      }
    })

    it('handles long tokens', async () => {
      const longToken = 'x'.repeat(10000)
      const encrypted = await encryptToken(longToken, testKey)
      const decrypted = await decryptToken(encrypted, testKey)

      expect(decrypted).toBe(longToken)
    })

    it('handles empty string', async () => {
      const encrypted = await encryptToken('', testKey)
      const decrypted = await decryptToken(encrypted, testKey)

      expect(decrypted).toBe('')
    })
  })

  describe('generateEncryptionKey', () => {
    it('generates a 64-character hex string', () => {
      const key = generateEncryptionKey()

      expect(key).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(key)).toBe(true)
    })

    it('generates unique keys', () => {
      const key1 = generateEncryptionKey()
      const key2 = generateEncryptionKey()

      expect(key1).not.toBe(key2)
    })
  })

  describe('isValidEncryptionKey', () => {
    it('returns true for valid key', () => {
      expect(isValidEncryptionKey(generateEncryptionKey())).toBe(true)
      expect(isValidEncryptionKey('a'.repeat(32))).toBe(true)
    })

    it('returns false for invalid key', () => {
      expect(isValidEncryptionKey('short')).toBe(false)
      expect(isValidEncryptionKey('')).toBe(false)
      // @ts-expect-error testing invalid input
      expect(isValidEncryptionKey(null)).toBe(false)
      // @ts-expect-error testing invalid input
      expect(isValidEncryptionKey(undefined)).toBe(false)
    })
  })
})
