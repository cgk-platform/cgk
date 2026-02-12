/**
 * TIN Encryption Module
 *
 * AES-256-GCM encryption for sensitive tax identification numbers.
 * All TIN data must be encrypted at rest.
 *
 * @ai-pattern security-critical
 * @ai-required NEVER log or expose plaintext TINs
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Get the encryption key from environment
 * @throws Error if key is missing or invalid
 */
export function getEncryptionKey(): Buffer {
  const key = process.env.TAX_TIN_ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error(
      'TAX_TIN_ENCRYPTION_KEY must be a 64-character hex string (256 bits). ' +
      'Generate with: openssl rand -hex 32'
    )
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a TIN using AES-256-GCM
 *
 * @param tin - The plaintext TIN (SSN or EIN)
 * @returns Base64 encoded encrypted string containing IV + authTag + ciphertext
 */
export function encryptTIN(tin: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(tin, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  // Format: base64(iv + authTag + ciphertext)
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64'),
  ])

  return combined.toString('base64')
}

/**
 * Decrypt a TIN using AES-256-GCM
 *
 * @param encrypted - Base64 encoded encrypted string
 * @returns The plaintext TIN
 * @throws Error if decryption fails (tampered data or wrong key)
 */
export function decryptTIN(encrypted: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(encrypted, 'base64')

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted TIN format')
  }

  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, undefined, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Extract the last 4 digits from a TIN
 */
export function getLastFour(tin: string): string {
  const digitsOnly = tin.replace(/\D/g, '')
  if (digitsOnly.length < 4) {
    throw new Error('TIN must have at least 4 digits')
  }
  return digitsOnly.slice(-4)
}

/**
 * Mask a TIN for display (shows only last 4 digits)
 *
 * @param tinLastFour - The last 4 digits of the TIN
 * @param tinType - SSN or EIN
 * @returns Masked TIN (e.g., "***-**-1234" or "**-***1234")
 */
export function maskTIN(tinLastFour: string, tinType: 'ssn' | 'ein'): string {
  if (tinType === 'ssn') {
    return `***-**-${tinLastFour}`
  }
  return `**-***${tinLastFour}`
}

/**
 * Format a TIN for display with proper separators
 */
export function formatTIN(tin: string, tinType: 'ssn' | 'ein'): string {
  const digits = tin.replace(/\D/g, '')
  if (tinType === 'ssn') {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 9)}`
}

/**
 * Validate SSN format and patterns
 *
 * SSN validation rules:
 * - Must be 9 digits
 * - Area number (first 3) cannot be 000, 666, or 900-999
 * - Group number (middle 2) cannot be 00
 * - Serial number (last 4) cannot be 0000
 * - Rejects known fake/test numbers
 */
export function isValidSSN(ssn: string): boolean {
  const digits = ssn.replace(/\D/g, '')

  if (digits.length !== 9) {
    return false
  }

  const area = digits.substring(0, 3)
  const group = digits.substring(3, 5)
  const serial = digits.substring(5, 9)

  // Area number validation
  if (area === '000' || area === '666') {
    return false
  }

  // 900-999 reserved for advertising
  if (area.startsWith('9')) {
    return false
  }

  // Group number cannot be 00
  if (group === '00') {
    return false
  }

  // Serial number cannot be 0000
  if (serial === '0000') {
    return false
  }

  // Known fake/test SSNs
  const fakeSSNs = [
    '123456789',
    '111111111',
    '222222222',
    '333333333',
    '444444444',
    '555555555',
    '666666666',
    '777777777',
    '888888888',
    '999999999',
    '123121234',
    '078051120', // Woolworth wallet SSN
    '219099999', // Used in advertising
  ]

  if (fakeSSNs.includes(digits)) {
    return false
  }

  return true
}

/**
 * Validate EIN format and patterns
 *
 * EIN validation rules:
 * - Must be 9 digits
 * - First two digits are valid campus code (01-06, 10-16, 20-27, 30-39, 40-48, 50-59, 60-68, 71-77, 80-88, 90-95, 98-99)
 * - Cannot start with 07, 08, 09 (reserved for IRS)
 */
export function isValidEIN(ein: string): boolean {
  const digits = ein.replace(/\D/g, '')

  if (digits.length !== 9) {
    return false
  }

  const prefix = digits.substring(0, 2)

  // Reserved prefixes
  const invalidPrefixes = ['07', '08', '09']
  if (invalidPrefixes.includes(prefix)) {
    return false
  }

  // Valid campus code prefixes
  const validPrefixes = [
    '01', '02', '03', '04', '05', '06',
    '10', '11', '12', '13', '14', '15', '16',
    '20', '21', '22', '23', '24', '25', '26', '27',
    '30', '31', '32', '33', '34', '35', '36', '37', '38', '39',
    '40', '41', '42', '43', '44', '45', '46', '47', '48',
    '50', '51', '52', '53', '54', '55', '56', '57', '58', '59',
    '60', '61', '62', '63', '64', '65', '66', '67', '68',
    '71', '72', '73', '74', '75', '76', '77',
    '80', '81', '82', '83', '84', '85', '86', '87', '88',
    '90', '91', '92', '93', '94', '95',
    '98', '99',
  ]

  return validPrefixes.includes(prefix)
}

/**
 * Validate a TIN based on type
 */
export function isValidTIN(tin: string, tinType: 'ssn' | 'ein'): boolean {
  if (tinType === 'ssn') {
    return isValidSSN(tin)
  }
  return isValidEIN(tin)
}

/**
 * Determine if a TIN looks like an SSN or EIN based on format
 */
export function detectTINType(tin: string): 'ssn' | 'ein' | null {
  const digits = tin.replace(/\D/g, '')

  if (digits.length !== 9) {
    return null
  }

  // EINs start with specific campus codes
  const prefix = digits.substring(0, 2)
  const einPrefixes = [
    '10', '11', '12', '13', '14', '15', '16',
    '20', '21', '22', '23', '24', '25', '26', '27',
    '30', '31', '32', '33', '34', '35', '36', '37', '38', '39',
    '40', '41', '42', '43', '44', '45', '46', '47', '48',
    '50', '51', '52', '53', '54', '55', '56', '57', '58', '59',
    '60', '61', '62', '63', '64', '65', '66', '67', '68',
    '71', '72', '73', '74', '75', '76', '77',
    '80', '81', '82', '83', '84', '85', '86', '87', '88',
    '90', '91', '92', '93', '94', '95',
    '98', '99',
  ]

  if (einPrefixes.includes(prefix)) {
    return 'ein'
  }

  // SSNs start with 001-665, 667-899
  const area = parseInt(prefix + digits[2], 10)
  if (area >= 1 && area <= 665) return 'ssn'
  if (area >= 667 && area <= 899) return 'ssn'

  return null
}

/**
 * Clean a TIN input (remove formatting characters)
 */
export function cleanTIN(tin: string): string {
  return tin.replace(/\D/g, '')
}
