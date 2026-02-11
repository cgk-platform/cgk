/**
 * Sender Module Exports
 *
 * Email sender address and domain management.
 */

// Domain management
export {
  createDomain,
  deleteDomain,
  domainExists,
  getDomainById,
  getDomainsByStatus,
  getFullDomainString,
  getVerifiedDomains,
  listDomains,
  updateDomainDNSRecords,
  updateDomainLastCheck,
  updateDomainVerificationStatus,
} from './domains.js'

// Sender address management
export {
  createSenderAddress,
  deleteSenderAddress,
  emailAddressExists,
  formatSenderAddress,
  getDefaultSender,
  getDefaultSenderForPurpose,
  getSenderAddressById,
  getSenderAddressesByPurpose,
  getVerifiedSenderAddresses,
  listSenderAddresses,
  listSenderAddressesByDomain,
  updateSenderAddress,
} from './addresses.js'

// Notification routing
export {
  getAllNotificationRoutingStatus,
  getNotificationRouting,
  getSenderForNotification,
  listNotificationRouting,
  seedDefaultNotificationRouting,
  upsertNotificationRouting,
} from './routing.js'

// DNS instructions
export {
  formatDNSRecordRow,
  formatDNSRecordsTable,
  generateDNSInstructions,
  getCommonRegistrars,
  getProviderInstructions,
  type DNSInstructions,
  type DNSInstructionStep,
} from './dns-instructions.js'

// Domain verification
export {
  canVerifyDomain,
  deleteDomainFromResend,
  getDomainStatusFromResend,
  getNextCheckAllowedAt,
  getResendConfig,
  registerDomainWithResend,
  verifyDomainWithResend,
  type VerificationResult,
} from './verification.js'
