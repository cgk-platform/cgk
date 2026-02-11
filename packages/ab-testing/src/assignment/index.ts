/**
 * Assignment Module
 *
 * Exports all assignment-related functionality.
 */

export { murmurHash3, getNormalizedHash, getHashBucket, isInPercentage } from './hash.js'

export { assignVariant, applyAllocations, validateAllocations } from './allocate.js'

export {
  generateVisitorId,
  parseABCookie,
  serializeABCookie,
  getOrCreateVisitorId,
  getAssignmentFromCookie,
  addAssignmentToCookie,
  removeAssignmentFromCookie,
  cleanupCookie,
  generateSetCookieHeader,
  getCookieName,
  estimateCookieSize,
  isCookieNearLimit,
} from './cookies.js'

export {
  assignVisitor,
  getVisitorAssignments,
  isAssignedToTest,
  getVariantIdFromCookie,
  type AssignOptions,
  type FullAssignmentResult,
} from './assign.js'
