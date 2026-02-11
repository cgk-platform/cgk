/**
 * Health monitoring types for the CGK platform
 */

/**
 * Health status values
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

/**
 * Alert severity levels
 */
export type AlertSeverity = 'p1' | 'p2' | 'p3'

/**
 * Alert status values
 */
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'

/**
 * Service tier determines check frequency
 */
export type ServiceTier = 'critical' | 'core' | 'integrations' | 'external'

/**
 * Result from a health check
 */
export interface HealthCheckResult {
  status: HealthStatus
  latencyMs: number
  details: Record<string, unknown>
  error?: string
}

/**
 * Health check result with metadata
 */
export interface HealthCheckRecord extends HealthCheckResult {
  service: string
  tenantId?: string
  checkedAt: string
  consecutiveFailures: number
}

/**
 * Alert record in the database
 */
export interface Alert {
  id: string
  severity: AlertSeverity
  source: 'health_check' | 'threshold' | 'error_tracker' | 'manual'
  service: string
  tenantId?: string
  tenantSlug?: string
  metric?: string
  currentValue?: number
  thresholdValue?: number
  title: string
  message: string
  metadata: Record<string, unknown>
  status: AlertStatus
  createdAt: string
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionNotes?: string
  deliveryStatus: Record<string, 'sent' | 'failed' | 'pending'>
}

/**
 * Alert creation payload
 */
export interface CreateAlertPayload {
  severity: AlertSeverity
  source: Alert['source']
  service: string
  tenantId?: string
  metric?: string
  currentValue?: number
  thresholdValue?: number
  title: string
  message: string
  metadata?: Record<string, unknown>
}

/**
 * Threshold configuration for a metric
 */
export interface ThresholdConfig {
  warning: number
  critical: number
}

/**
 * Alert channel configuration
 */
export interface AlertChannel {
  type: 'dashboard' | 'email' | 'slack' | 'pagerduty' | 'webhook'
  enabled: boolean
  config: Record<string, string>
  severities: AlertSeverity[]
}

/**
 * Tenant-specific health status
 */
export interface TenantServiceStatus {
  status: HealthStatus
  latencyMs: number
  lastChecked: string
  consecutiveFailures: number
  lastError?: string
}

/**
 * Summary of tenant health
 */
export interface TenantHealthSummary {
  tenantId: string
  tenantSlug: string
  status: HealthStatus
  unhealthyServices: string[]
  lastChecked: string
}

/**
 * Summary of service health across tenants
 */
export interface ServiceHealthSummary {
  service: string
  status: HealthStatus
  avgLatencyMs: number
  failingTenants: string[]
  lastChecked: string
}

/**
 * Platform health response from master endpoint
 */
export interface PlatformHealthResponse {
  status: HealthStatus
  timestamp: string
  summary: {
    healthy: number
    degraded: number
    unhealthy: number
    unknown: number
  }
  tenants: TenantHealthSummary[]
  services: ServiceHealthSummary[]
  alerts: Alert[]
}

/**
 * Per-service health response
 */
export interface ServiceHealthResponse {
  service: string
  status: HealthStatus
  timestamp: string
  latencyMs: number
  details: Record<string, unknown>
  tenantStatuses?: Record<string, TenantServiceStatus>
}

/**
 * Health matrix response (service x tenant grid)
 */
export interface HealthMatrixResponse {
  timestamp: string
  tenants: string[]
  services: string[]
  statuses: Record<string, Record<string, HealthStatus>>
  platformStatuses: Record<string, HealthStatus>
}

/**
 * Tenant health report
 */
export interface TenantHealthReport {
  tenantId: string
  timestamp: string
  overallStatus: HealthStatus
  services: Record<string, HealthCheckResult>
}

/**
 * Health check scheduler configuration
 */
export interface SchedulerConfig {
  tier: ServiceTier
  interval: number
  services: string[]
}

/**
 * Health monitor interface
 */
export interface HealthMonitor {
  name: string
  tier: ServiceTier
  check: (tenantId?: string) => Promise<HealthCheckResult>
  requiresTenant: boolean
}
