/**
 * Targeting Module
 *
 * Exports all targeting-related functionality.
 */

export {
  matchCondition,
  matchAllConditions,
  matchAnyCondition,
  validateCondition,
} from './conditions.js'

export {
  extractGeoFromHeaders,
  hashIp,
  extractIpFromHeaders,
  parseUserAgent,
  getDeviceType,
  isBot,
  type GeoData,
  type DeviceData,
} from './geo.js'

export {
  evaluateTargeting,
  evaluateMultipleTests,
  shouldExclude,
  getForceAssignment,
  validateTargetingRules,
  TargetingTemplates,
} from './evaluate.js'
