/**
 * Inbound Email Processing Module
 *
 * Provides inbound email handling via Resend webhooks, including:
 * - Treasury approval parsing
 * - Receipt processing with attachment storage
 * - Thread matching for support/creator replies
 * - Auto-reply detection and spam filtering
 *
 * @ai-pattern inbound-email
 * @ai-critical Always use withTenant() when processing tenant-scoped operations
 */

// Types
export type {
  // Email types
  InboundEmail,
  InboundEmailLog,
  InboundEmailType,
  InboundProcessingStatus,
  InboundAddressPurpose,
  InboundAttachment,
  LogInboundEmailInput,
  InboundAddressInfo,
  InboundEmailFilters,

  // Treasury types
  ApprovalStatus,
  ApprovalConfidence,
  ApprovalParseResult,
  TreasuryCommunication,
  CreateTreasuryCommunicationInput,

  // Receipt types
  ReceiptStatus,
  StoredAttachment,
  TreasuryReceipt,
  CreateTreasuryReceiptInput,
  UpdateTreasuryReceiptInput,
  ProcessedReceipt,
  ReceiptFilters,

  // Thread types
  ContactType,
  ThreadStatus,
  EmailThread,
  CreateThreadInput,
  ThreadMessage,
  CreateThreadMessageInput,
  MatchedThread,
  ThreadFilters,

  // Auto-response types
  ConditionOperator,
  ConditionField,
  RuleCondition,
  AutoResponseRule,
  CreateAutoResponseRuleInput,
  AutoResponseLog,
} from './types.js'

// Webhook handler
export {
  verifyResendSignature,
  verifySvixSignature,
  parseInboundEmail,
  findInboundAddressByEmail,
  logInboundEmail,
  updateInboundLogStatus,
  logUnknownInbound,
  getInboundEmailById,
  listInboundEmails,
  type InboundProcessingResult,
} from './webhook-handler.js'

// Treasury parser
export {
  APPROVAL_KEYWORDS,
  AUTO_REPLY_PATTERNS,
  isAutoReply,
  parseTreasuryApproval,
  extractTreasuryRequestId,
  isValidTreasuryRequestId,
  getParseResultSummary,
} from './treasury-parser.js'

// Auto-reply detector
export {
  AUTO_REPLY_HEADER_VALUES,
  AUTOMATED_PRECEDENCE_VALUES,
  AUTO_REPLY_SUBJECT_PREFIXES,
  AUTO_REPLY_BODY_PATTERNS,
  SPAM_PATTERNS,
  SUSPICIOUS_SENDER_PATTERNS,
  isAutoReplySubject,
  hasAutoReplyBody,
  isNoReplySender,
  detectAutoReply,
  calculateSpamScore,
  isLikelySpam,
  analyzeEmail,
  type EmailAnalysisResult,
} from './auto-reply-detector.js'

// Receipt processor
export {
  RECEIPT_CONTENT_TYPES,
  MAX_ATTACHMENT_SIZE,
  isReceiptAttachment,
  isValidAttachmentSize,
  filterReceiptAttachments,
  generateReceiptBlobPath,
  processReceiptEmail,
  extractAmountFromText,
  extractDateFromText,
  extractVendorFromText,
  extractReceiptData,
  defaultUploadToBlob,
  type UploadToBlobFn,
} from './receipt-processor.js'

// Thread matcher
export {
  findMessageByMessageId,
  findThreadByEmail,
  findOpenThreadForContact,
  createThread,
  updateThreadStats,
  addMessageToThread,
  findCreatorByEmail,
  findCustomerByEmail,
  findContactByEmail,
  matchToThread,
  addInboundToThread,
  type ContactInfo,
} from './thread-matcher.js'

// Creator replies
export {
  findOrCreateCreatorThread,
  handleCreatorReply,
  getCreatorThreads,
  getThreadMessages,
  getCreatorCommsSummary,
  type CreatorThreadInfo,
  type CreatorCommsSummary,
} from './creator-replies.js'

// Router
export {
  createTreasuryCommunication,
  createTreasuryReceipt,
  handleTreasuryEmail,
  handleReceiptEmail,
  handleSupportEmail,
  handleCreatorReplyEmail,
  handleGenericEmail,
  routeEmail,
  getEmailTypeFromPurpose,
  type TreasuryHandlerResult,
  type ReceiptHandlerResult,
  type SupportHandlerResult,
  type CreatorHandlerResult,
} from './router.js'
