/**
 * @cgk/tax - Tax Compliance Package
 *
 * Provides W-9 collection, TIN encryption, 1099 generation,
 * IRS IRIS filing, and tax document management.
 *
 * @ai-pattern tax-compliance
 * @ai-required All TIN operations must use encryption module
 */

// Types
export * from './types.js'

// Encryption
export {
  cleanTIN,
  decryptTIN,
  detectTINType,
  encryptTIN,
  formatTIN,
  getEncryptionKey,
  getLastFour,
  isValidEIN,
  isValidSSN,
  isValidTIN,
  maskTIN,
} from './encryption.js'

// Database operations
export {
  getApprovedForms,
  getAuditLog,
  getPendingW9Reminders,
  getTaxFormById,
  getTaxForm,
  getTaxPayee,
  getTaxPayeeById,
  getTaxReminders,
  getW9Tracking,
  insertTaxForm,
  listTaxForms,
  listTaxPayees,
  logTaxAction,
  updateTaxFormStatus,
  upsertTaxPayee,
  upsertW9Tracking,
} from './db.js'

// W-9 operations
export {
  getDecryptedTIN,
  getW9Status,
  hasCompleteTaxInfo,
  saveW9,
  updateW9,
  validateW9Data,
  type SaveW9Options,
  type W9ValidationResult,
} from './w9.js'

// Payment aggregation
export {
  exportAnnualPaymentsCSV,
  getAllPayeeSummaries,
  getAnnualPayments,
  getMonthlyPayments,
  getPayeesApproachingThreshold,
  getPayeesMissingW9,
  getPayeesRequiring1099,
  getTaxYearStats,
  PAYMENT_SOURCES,
} from './payments.js'

// Form generation
export {
  approve1099,
  bulkApprove1099s,
  bulkGenerate1099s,
  generate1099,
  getFormGenerationStats,
  getFormsReadyForFiling,
  getFormType,
  getPayerInfo,
  submitForReview,
  void1099,
} from './form-generation.js'

// IRS IRIS filing
export {
  generateIRISCSV,
  getFilingStats,
  markFormsAsFiled,
  markFormsAsStateFiled,
  validateForFiling,
} from './iris-filing.js'

// Corrections
export {
  createAmountCorrection,
  createInfoCorrection,
  getCorrections,
  hasPendingCorrections,
} from './corrections.js'

// Delivery
export {
  bulkMarkAvailableInPortal,
  getDeliveryStatus,
  markAvailableInPortal,
  markDeliveredByEmail,
  markDeliveryConfirmed,
  queueForMail,
  updateMailStatus,
} from './delivery.js'
