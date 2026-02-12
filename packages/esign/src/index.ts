/**
 * @cgk/esign - E-Signature System Core
 *
 * Complete e-signature solution with document templates, field management,
 * signature capture, and compliance tracking.
 *
 * @ai-pattern esign
 * @ai-critical Always use tenant context for all operations
 */

// ============================================================================
// Types
// ============================================================================

export {
  // Enums
  TEMPLATE_STATUSES,
  DOCUMENT_STATUSES,
  SIGNER_STATUSES,
  SIGNER_ROLES,
  FIELD_TYPES,
  SIGNATURE_TYPES,
  // Template types
  type TemplateStatus,
  type EsignTemplate,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type EsignTemplateField,
  type CreateTemplateFieldInput,
  type TemplateWithFields,
  type ListTemplatesOptions,
  // Document types
  type DocumentStatus,
  type EsignDocument,
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type DocumentWithSigners,
  type ListDocumentsOptions,
  // Signer types
  type SignerStatus,
  type SignerRole,
  type EsignSigner,
  type CreateSignerInput,
  type UpdateSignerInput,
  // Field types
  type FieldType,
  type FieldValidation,
  type FieldOption,
  type EsignField,
  type CreateFieldInput,
  type UpdateFieldInput,
  // Signature types
  type SignatureType,
  type EsignSignature,
  type CreateSignatureInput,
  // Session types
  type SigningSession,
} from './types.js'

// ============================================================================
// Constants
// ============================================================================

export {
  STORAGE_PATHS,
  FILE_LIMITS,
  DOCUMENT_DEFAULTS,
  FIELD_CONFIG,
  SIGNATURE_CONFIG,
  RATE_LIMITS,
  SESSION_CONFIG,
  UI_CONFIG,
  STATUS_LABELS,
  FIELD_TYPE_LABELS,
  ERROR_MESSAGES,
} from './constants.js'

// ============================================================================
// Template Operations
// ============================================================================

export {
  createTemplate,
  getTemplate,
  getTemplateWithFields,
  listTemplates,
  updateTemplate,
  deleteTemplate,
  archiveTemplate,
  activateTemplate,
  duplicateTemplate,
  createTemplateField,
  updateTemplateField,
  deleteTemplateField,
  getTemplateFields,
  replaceTemplateFields,
  isTemplateActive,
  getTemplateCounts,
} from './lib/templates.js'

// ============================================================================
// Document Operations
// ============================================================================

export {
  createDocument,
  getDocument,
  getDocumentWithSigners,
  listDocuments,
  updateDocument,
  deleteDocument,
  markDocumentPending,
  markDocumentInProgress,
  markDocumentCompleted,
  markDocumentDeclined,
  voidDocument,
  expireDocument,
  updateLastReminder,
  getDocumentsNeedingReminders,
  getExpiredDocuments,
  getCreatorDocuments,
  getDocumentCounts,
  checkAllSignersSigned,
  getEsignStats,
} from './lib/documents.js'

// ============================================================================
// Signer Operations
// ============================================================================

export {
  createSigner,
  getSigner,
  getSignerByToken,
  getDocumentSigners,
  updateSigner,
  deleteSigner,
  markSignerSent,
  markSignerViewed,
  markSignerSigned,
  markSignerDeclined,
  getNextSigner,
  hasOrderCompleted,
  getSignersPendingNotification,
  getCCRecipients,
  regenerateAccessToken,
  getSignerStats,
  getPendingCounterSignatures,
  isInternalSigner,
  generateSigningUrl,
} from './lib/signers.js'

// ============================================================================
// Field Operations
// ============================================================================

export {
  createField,
  getField,
  getDocumentFields,
  getSignerFields,
  updateField,
  deleteField,
  setFieldValue,
  clearFieldValue,
  setFieldValues,
  copyFieldsFromTemplate,
  areRequiredFieldsFilled,
  areDocumentFieldsFilled,
  getUnfilledRequiredFields,
  getFieldStats,
  getFieldsByGroup,
  getFieldGroups,
} from './lib/fields.js'

// ============================================================================
// Variable System
// ============================================================================

export {
  type SignerContext,
  type CreatorContext,
  type DocumentContext,
  type TenantConfig,
  type VariableContext,
  type VariableDefinition,
  AVAILABLE_VARIABLES,
  replaceVariables,
  hasVariables,
  extractVariables,
  validateVariables,
  getVariablesByCategory,
  getAllVariableKeys,
  isValidVariableKey,
} from './lib/variables.js'

// ============================================================================
// Signature Operations
// ============================================================================

export {
  createSignature,
  getSignature,
  getSignerSignature,
  getSignerSignatures,
  deleteSignature,
  updateSignatureImage,
  hasSignature,
  isDrawnSignature,
  isTypedSignature,
  validateSignatureImage,
  getSignatureImageInfo,
  SIGNATURE_FONTS,
  getSignatureFont,
  isValidSignatureFont,
  generateTypedSignatureSvg,
  svgToDataUrl,
  type SignatureFont,
} from './lib/signatures.js'

// ============================================================================
// Audit Trail
// ============================================================================

export {
  type AuditAction,
  type AuditLogEntry,
  type CreateAuditLogInput,
  addAuditLogEntry,
  getDocumentAuditLog,
  getSignerAuditLog,
  getRecentAuditLog,
  getAuditLogByAction,
  logDocumentCreated,
  logDocumentSent,
  logDocumentViewed,
  logFieldFilled,
  logDocumentSigned,
  logDocumentDeclined,
  logDocumentVoided,
  logReminderSent,
  logDocumentResent,
  logCounterSigned,
  logDocumentExpired,
  logDocumentDownloaded,
  generateComplianceCertificate,
  type ComplianceCertificate,
} from './lib/audit.js'

// ============================================================================
// Email Notifications
// ============================================================================

export {
  type EsignNotificationType,
  type EsignNotificationPayload,
  type NotificationResult,
  type NotificationConfig,
  type SignatureRequestEmailData,
  type DocumentCompletedEmailData,
  type ReminderEmailData,
  type EsignQueueEntryData,
  getNotificationSubject,
  generateSigningUrl as generateNotificationSigningUrl,
  generateDownloadUrl,
  buildSignatureRequestEmailData,
  buildDocumentCompletedEmailData,
  buildReminderEmailData,
  daysSinceSent,
  isDueForReminder,
  getCCRecipientsForNotification,
  buildSignatureRequestQueueEntry,
  buildReminderQueueEntry,
  buildCompletionQueueEntry,
} from './lib/notifications.js'

// ============================================================================
// Document Sending Workflow
// ============================================================================

export {
  type SendDocumentInput,
  type SendDocumentResult,
  type ResendDocumentInput,
  type ResendDocumentResult,
  prepareDocument,
  sendDocument,
  prepareAndSendDocument,
  resendDocument,
  generateDocumentName,
  validateDocumentForSending,
} from './lib/send.js'
