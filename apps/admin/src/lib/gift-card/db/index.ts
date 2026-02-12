/**
 * Gift Card Database Operations Index
 * Re-exports all database operations
 */

// Products
export {
  getGiftCardProducts,
  getGiftCardProductById,
  getGiftCardProductByVariantId,
  upsertGiftCardProduct,
  updateGiftCardProduct,
  archiveGiftCardProduct,
  activateGiftCardProduct,
  deleteGiftCardProduct,
  countActiveProducts,
} from './products'

// Transactions
export {
  getGiftCardTransactions,
  getGiftCardTransactionById,
  getTransactionByOrderAndVariant,
  createGiftCardTransaction,
  markTransactionCredited,
  markTransactionFailed,
  resetTransactionToPending,
  getPendingTransactions,
  getTransactionStats,
} from './transactions'

// Emails
export {
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
} from './emails'
