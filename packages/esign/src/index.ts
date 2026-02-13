/**
 * @cgk-platform/esign - E-Signature System Core
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
  WORKFLOW_STATUSES,
  WORKFLOW_STEP_TYPES,
  WORKFLOW_TRIGGER_TYPES,
  WORKFLOW_CONDITION_TYPES,
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
  // Workflow types
  type WorkflowStatus,
  type WorkflowStepType,
  type WorkflowTriggerType,
  type WorkflowConditionType,
  type WorkflowCondition,
  type WorkflowStep,
  type EsignWorkflow,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type WorkflowExecution,
  type CreateWorkflowExecutionInput,
  type CounterSignPending,
  type SignatureData,
  type CompleteSigningResult,
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

// ============================================================================
// Workflow Management
// ============================================================================

export {
  // Workflow CRUD
  createWorkflow,
  getWorkflow,
  listWorkflows,
  updateWorkflow,
  deleteWorkflow,
  activateWorkflow,
  archiveWorkflow,
  // Workflow Execution
  createWorkflowExecution,
  getWorkflowExecution,
  updateWorkflowExecution,
  listWorkflowExecutions,
  getPendingExecutions,
  // Step Management
  getCurrentStep,
  advanceToNextStep,
  checkStepCondition,
  // Validation
  validateWorkflow,
  getWorkflowsByTrigger,
} from './lib/workflows.js'

// ============================================================================
// Signing Session Flow
// ============================================================================

export {
  // Session management
  getSigningSession,
  canSignerSign,
  getNextSigners,
  markDocumentViewed,
  // Signature submission
  processSignature,
  completeSignerSigning,
  sendToNextSigners,
  // Validation
  validateSigningToken,
  getSigningProgress,
} from './lib/signing-session.js'

// ============================================================================
// Email Functions
// ============================================================================

export {
  // Types
  type EmailConfig,
  type SigningRequestParams,
  type SigningCompleteParams,
  type DocumentCompleteParams,
  type ReminderParams,
  type VoidNotificationParams,
  type DeclineNotificationParams,
  type ExpirationWarningParams,
  type EmailResult,
  // Email builders
  buildSigningRequestEmail,
  buildSigningCompleteEmail,
  buildDocumentCompleteEmail,
  buildReminderEmail,
  buildVoidNotificationEmail,
  buildDeclineNotificationEmail,
  buildExpirationWarningEmail,
  // Job payload builders
  buildSigningRequestJobPayload,
  buildReminderJobPayload,
  buildCompletionJobPayload,
  // Recipient helpers
  getCompletionRecipients,
  getCCRecipients as getEmailCCRecipients,
  getSignersPendingReminder,
} from './lib/email.js'

// ============================================================================
// Decline Flow
// ============================================================================

export {
  // Types
  type DeclineDocumentInput,
  type DeclineDocumentResult,
  type VoidDocumentInput,
  type VoidDocumentResult,
  // Decline operations
  declineDocument,
  voidDocument as voidDocumentWithNotification,
  canDecline,
  getDeclineStats,
} from './lib/decline.js'

// ============================================================================
// Background Jobs
// ============================================================================

export {
  // Job types
  type EsignJobPayload,
  type SendRemindersPayload,
  type ExpireDocumentsPayload,
  type ProcessWorkflowStepPayload,
  type SendSigningRequestPayload,
  type SendCompletionNotificationPayload,
  // Job result types
  type ReminderJobResult,
  type ExpirationJobResult,
  type WorkflowStepResult,
  type CleanupResult,
  // Job processors
  processReminders,
  processExpirations,
  processWorkflowStep,
  cleanupOldData,
  // Schedules
  ESIGN_JOB_SCHEDULES,
} from './lib/jobs.js'

// ============================================================================
// Coordinate System
// ============================================================================

export {
  // Types
  type FieldPosition,
  type PdfCoordinates,
  type PageSize,
  type PageSizeName,
  // Constants
  PAGE_SIZES,
  // Coordinate conversions
  toPreviewCSS,
  toPreviewCSSWithPx,
  toPdfCoordinates,
  fromPdfCoordinates,
  fromPixelCoordinates,
  toPixelCoordinates,
  // Validation helpers
  clampPosition,
  isValidPosition,
  fieldsOverlap,
  getDefaultFieldSize,
  snapToGrid,
  // Utility functions
  getBoundingBox,
  centerField,
  distributeFields,
  alignFields,
  getFieldCenter,
  getFieldDistance,
} from './lib/coordinates.js'

// ============================================================================
// PDF Operations
// ============================================================================

export {
  // Types
  type EmbedOptions,
  type EmbedContext,
  type VerificationResult,
  type PdfPageInfo,
  // Main embedding
  embedFieldsInPDF,
  // PDF information
  getPdfPageInfo,
  getPdfPageCount,
  // Flattening
  forceFlattenPdf,
  verifyPdfFlattened,
  // PDF utilities
  createPdfDocument,
  loadPdf,
  mergePdfs,
  extractPages,
  addWatermark,
  // Alternative checkbox style
  embedXMark,
} from './lib/pdf.js'

// ============================================================================
// Storage Operations
// ============================================================================

export {
  // Types
  type FinalizeDocumentOptions,
  type PreviewOptions,
  type SignatureImageOptions,
  type UploadResult,
  // Path generators
  getSignedDocumentPath,
  getPreviewPath,
  getSignatureImagePath,
  getTemplatePath,
  getThumbnailPath,
  getDocumentPath,
  // Document finalization
  finalizeSignedDocument,
  generatePreviewPdf,
  // Signature storage
  saveSignatureImage,
  deleteSignatureImage,
  // Template storage
  uploadTemplatePdf,
  uploadTemplateThumbnail,
  deleteTemplateFiles,
  // Document storage
  uploadDocumentPdf,
  deleteDocumentFiles,
  // Cleanup
  cleanupPreviews,
  // Utilities
  getDownloadUrl as getStorageDownloadUrl,
  isVercelBlobUrl,
  extractBlobPathname,
} from './lib/storage.js'
