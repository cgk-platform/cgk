/**
 * E-Signature Admin Library
 *
 * Centralized exports for all e-signature admin functionality.
 */

// Types
export * from './types'

// Document operations
export {
  getDocuments,
  getDocumentWithSigners,
  getPendingDocuments,
  getCounterSignQueue,
  getDocumentAuditLog,
  addAuditLogEntry,
  resendDocument,
  voidDocument,
  markDocumentCompleted,
  getSignerByToken,
  markSignerSigned,
} from './documents'

// Template operations
export {
  listTemplates,
  getTemplate,
  getTemplateWithFields,
  getTemplateStats,
  getActiveTemplates,
  getTemplateFieldCount,
  duplicateTemplate,
  archiveTemplate,
  activateTemplate,
} from './templates'

// Bulk send operations
export {
  createBulkSend,
  getBulkSend,
  getBulkSendWithRecipients,
  listBulkSends,
  updateBulkSendStatus,
  incrementBulkSendCounters,
  updateRecipientStatus,
  getPendingRecipients,
  addBulkSendError,
  cancelBulkSend,
  getScheduledBulkSends,
} from './bulk-sends'

// Webhook operations
export {
  generateWebhookSecret,
  createWebhookSignature,
  createWebhook,
  getWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
  getActiveWebhooksForEvent,
  logWebhookDelivery,
  getWebhookDeliveries,
  getPendingRetryDeliveries,
  updateDeliveryRetry,
  testWebhook,
} from './webhooks'

// In-person signing operations
export {
  createInPersonSession,
  getInPersonSessionByToken,
  getActiveInPersonSession,
  completeInPersonSession,
  cancelInPersonSession,
  expireOldSessions,
  verifyInPersonPin,
  updateSessionStatus,
  extendSessionExpiration,
} from './in-person'

// Reports and analytics
export {
  getDashboardStats,
  getReportData,
  exportReportCsv,
} from './reports'
