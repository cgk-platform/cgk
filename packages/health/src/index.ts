/**
 * @cgk/health - Platform health monitoring
 *
 * Provides service health checks, alert system, and monitoring dashboard support.
 *
 * @ai-pattern health-monitoring
 * @ai-required Use for all platform observability
 */

// Types
export type {
  HealthStatus,
  AlertSeverity,
  AlertStatus,
  ServiceTier,
  HealthCheckResult,
  HealthCheckRecord,
  Alert,
  CreateAlertPayload,
  ThresholdConfig,
  AlertChannel,
  TenantServiceStatus,
  TenantHealthSummary,
  ServiceHealthSummary,
  PlatformHealthResponse,
  ServiceHealthResponse,
  HealthMatrixResponse,
  TenantHealthReport,
  SchedulerConfig,
  HealthMonitor,
} from './types.js'

// Thresholds
export {
  DEFAULT_THRESHOLDS,
  getThreshold,
  mergeThresholds,
  type ThresholdCategory,
} from './thresholds.js'

// Evaluator
export {
  evaluateThreshold,
  evaluateThresholdInverse,
  thresholdResultToHealthStatus,
  thresholdResultToSeverity,
  shouldAlert,
  evaluateLatencyHealth,
  aggregateHealthStatus,
  countHealthStatuses,
  type ThresholdResult,
} from './evaluator.js'

// Cache
export {
  CACHE_TTL,
  cacheHealthResult,
  getCachedHealth,
  invalidateHealthCache,
  setLastRunTime,
  getLastRunTime,
  setConsecutiveFailures,
  getConsecutiveFailures,
  clearMemoryCache,
} from './cache.js'

// Monitors
export {
  ALL_MONITORS,
  MONITOR_REGISTRY,
  TIER_CONFIG,
  getMonitor,
  getMonitorsByTier,
  getPlatformMonitors,
  getTenantMonitors,
  getMonitorNamesByTier,
  getServiceTier,
  // Individual check functions
  checkDatabase,
  checkRedis,
  checkShopify,
  checkStripe,
  checkInngest,
  checkMCP,
  checkWise,
  checkMeta,
  checkGoogleAds,
  checkMux,
  checkAssemblyAI,
  checkSlack,
  checkYotpo,
  checkLoop,
  checkVercel,
} from './monitors/index.js'

// Alerts
export {
  // Channels
  getDefaultChannels,
  getEnabledChannels,
  hasAlertChannels,
  validateChannel,
  type SlackConfig,
  type EmailConfig,
  type PagerDutyConfig,
  type WebhookConfig,
  // Dispatch
  createAlert,
  dispatchAlert,
  createAndDispatchAlert,
  // Management
  getOpenAlerts,
  getAlert,
  acknowledgeAlert,
  resolveAlert,
  getAlertCounts,
  getRecentAlerts,
} from './alerts/index.js'

// Scheduler
export {
  runTierHealthChecks,
  runTenantHealthChecks,
  getTiersToRun,
  runScheduledHealthChecks,
  runAllHealthChecks,
} from './scheduler.js'
