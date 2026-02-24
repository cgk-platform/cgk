/**
 * AES-256-GCM encryption/decryption utilities for Shopify tokens
 *
 * Uses the Web Crypto API for Edge Runtime compatibility (NOT Node.js crypto).
 * Encrypted format: `iv:authTag:ciphertext` (all hex-encoded, colon-separated).
 */

const ALGORITHM = 'AES-GCM'
const IV_LENGTH = 12 // 96-bit IV recommended for AES-GCM
const TAG_LENGTH = 128 // 128-bit auth tag (bits)
const TAG_BYTES = TAG_LENGTH / 8 // 16 bytes

/**
 * Convert a hex string to an ArrayBuffer-backed Uint8Array.
 * Using ArrayBuffer explicitly avoids TypeScript 5.9+ Uint8Array<ArrayBufferLike>
 * incompatibility with the BufferSource overloads in the Web Crypto API.
 */
function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const pairs = hex.match(/.{2}/g)
  if (!pairs || pairs.length === 0) {
    throw new Error('Invalid hex string')
  }
  const buf = new ArrayBuffer(pairs.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < pairs.length; i++) {
    view[i] = parseInt(pairs[i]!, 16)
  }
  return view
}

/** Convert a Uint8Array to a lowercase hex string */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Derive a CryptoKey from a raw hex or UTF-8 key string.
 * Accepts a 64-character hex string (32 bytes) or any UTF-8 string
 * that will be hashed to 32 bytes via SHA-256.
 */
async function deriveKey(key: string): Promise<CryptoKey> {
  let rawBuf: ArrayBuffer

  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    // 64-char hex → 32 bytes
    rawBuf = fromHex(key).buffer as ArrayBuffer
  } else {
    // Arbitrary string → SHA-256 digest → 32 bytes
    const encoded = new TextEncoder().encode(key)
    rawBuf = await crypto.subtle.digest('SHA-256', encoded)
  }

  return crypto.subtle.importKey(
    'raw',
    rawBuf,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypt plaintext using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt
 * @param key - A 64-char hex string (32 bytes) or any UTF-8 key string
 * @returns `iv:authTag:ciphertext` — all hex-encoded, colon-separated
 */
export async function encryptToken(
  plaintext: string,
  key: string,
): Promise<string> {
  const cryptoKey = await deriveKey(key)

  // Generate a random 96-bit IV
  const ivBuf = new ArrayBuffer(IV_LENGTH)
  crypto.getRandomValues(new Uint8Array(ivBuf))
  const iv = new Uint8Array(ivBuf)

  const encodedData = new TextEncoder().encode(plaintext)

  const ciphertextWithTag = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: ivBuf, tagLength: TAG_LENGTH },
    cryptoKey,
    encodedData,
  )

  // Web Crypto appends the auth tag to the end of the ciphertext buffer.
  // Split off the last TAG_BYTES to isolate the auth tag.
  const full = new Uint8Array(ciphertextWithTag)
  const ciphertext = full.slice(0, full.length - TAG_BYTES)
  const authTag = full.slice(full.length - TAG_BYTES)

  return `${toHex(iv)}:${toHex(authTag)}:${toHex(ciphertext)}`
}

/**
 * Decrypt a token encrypted by `encryptToken`.
 *
 * @param encryptedToken - `iv:authTag:ciphertext` (all hex-encoded)
 * @param key - Must match the key used during encryption
 * @returns The original plaintext string
 * @throws If the format is invalid or decryption fails (bad key / tampered data)
 */
export async function decryptToken(
  encryptedToken: string,
  key: string,
): Promise<string> {
  const parts = encryptedToken.split(':')
  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted token format — expected iv:authTag:ciphertext',
    )
  }

  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string]

  const iv = fromHex(ivHex)
  const authTag = fromHex(authTagHex)
  const ciphertext = fromHex(ciphertextHex)

  // Web Crypto AES-GCM decrypt expects ciphertext || authTag concatenated.
  // Allocate a fresh ArrayBuffer to guarantee a plain ArrayBuffer backing type.
  const combinedBuf = new ArrayBuffer(ciphertext.length + authTag.length)
  const combinedView = new Uint8Array(combinedBuf)
  combinedView.set(ciphertext, 0)
  combinedView.set(authTag, ciphertext.length)

  const cryptoKey = await deriveKey(key)

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer, tagLength: TAG_LENGTH },
    cryptoKey,
    combinedBuf,
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Returns true when a token string looks like an AES-256-GCM encrypted value
 * produced by `encryptToken` (i.e. contains exactly two `:` separators).
 */
export function looksEncrypted(token: string): boolean {
  return token.split(':').length === 3
}
