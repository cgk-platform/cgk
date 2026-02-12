/**
 * Gift Card Module Index
 *
 * @ai-pattern gift-card-system
 * @ai-required Use withTenant() for all database operations
 */

// Types
export type {
  GiftCardProduct,
  GiftCardProductStatus,
  CreateGiftCardProductInput,
  UpdateGiftCardProductInput,
  GiftCardTransaction,
  GiftCardTransactionStatus,
  GiftCardTransactionSource,
  CreateGiftCardTransactionInput,
  GiftCardTransactionFilters,
  GiftCardEmail,
  GiftCardEmailStatus,
  CreateGiftCardEmailInput,
  GiftCardEmailFilters,
  GiftCardSettings,
  GiftCardEmailTemplate,
  GiftCardStats,
} from './types'

export { DEFAULT_GIFT_CARD_SETTINGS } from './types'

// Database operations
export {
  // Products
  getGiftCardProducts,
  getGiftCardProductById,
  getGiftCardProductByVariantId,
  upsertGiftCardProduct,
  updateGiftCardProduct,
  archiveGiftCardProduct,
  activateGiftCardProduct,
  deleteGiftCardProduct,
  countActiveProducts,
  // Transactions
  getGiftCardTransactions,
  getGiftCardTransactionById,
  getTransactionByOrderAndVariant,
  createGiftCardTransaction,
  markTransactionCredited,
  markTransactionFailed,
  resetTransactionToPending,
  getPendingTransactions,
  getTransactionStats,
  // Emails
  getGiftCardEmails,
  getGiftCardEmailById,
  getEmailsForTransaction,
  createGiftCardEmail,
  markEmailSent,
  markEmailFailed,
  resetEmailToPending,
  skipEmail,
  getPendingEmailsToSend,
  countPendingEmails,
  getEmailStats,
} from './db'

// Settings
export {
  getGiftCardSettings,
  updateGiftCardSettings,
  isGiftCardEnabled,
  isGiftCardEmailEnabled,
} from './settings'

// Shopify product operations
export {
  extractNumericId,
  parseShopifyProduct,
  syncShopifyProduct,
  syncShopifyProducts,
  fetchGiftCardProductsFromShopify,
  isGiftCardLineItem,
  buildGiftCardVariantIdSet,
  GIFT_CARD_PRODUCTS_QUERY,
  type ShopifyProductData,
} from './shopify-products'

// Reward processing
export {
  detectGiftCardLineItems,
  processGiftCardReward,
  processOrderGiftCards,
  issueStoreCredit,
  processPendingTransactions,
  createManualGiftCardCredit,
  type OrderLineItem,
  type OrderData,
  type ProcessRewardResult,
} from './process-reward'

// Email operations
export {
  renderEmailTemplate,
  buildEmailHtml,
  renderGiftCardEmail,
  sendEmail,
  processGiftCardEmail,
  processPendingEmails,
  type RenderedEmail,
  type EmailTemplateVariables,
} from './emails'
