/**
 * Shopify OAuth error types
 */

export type ShopifyErrorCode =
  | 'INVALID_SHOP'
  | 'INVALID_HMAC'
  | 'INVALID_STATE'
  | 'SHOP_MISMATCH'
  | 'NOT_CONNECTED'
  | 'TOKEN_EXCHANGE_FAILED'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'MISSING_CONFIG'

export class ShopifyError extends Error {
  constructor(
    public readonly code: ShopifyErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ShopifyError'
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}
