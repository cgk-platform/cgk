/**
 * Platform-level types for the Orchestrator dashboard
 */

/**
 * Platform KPI metrics displayed on the overview dashboard
 */
export interface PlatformKPIs {
  /** Total Gross Merchandise Value across all tenants */
  totalGMV: { value: number; change: number }
  /** Platform Monthly Recurring Revenue */
  platformMRR: { value: number; change: number }
  /** Total number of brands/tenants */
  totalBrands: number
  /** Number of active brands */
  activeBrands: number
  /** Overall system health status */
  systemStatus: 'healthy' | 'degraded' | 'critical'
  /** Open alerts by priority */
  openAlerts: { p1: number; p2: number; p3: number }
  /** Error rate in last 24 hours */
  errorRate24h: number
  /** Average API latency in milliseconds */
  avgLatency: number
  /** Platform uptime percentage */
  uptimePercent: number
  /** Number of pending background jobs */
  pendingJobs: number
  /** Failed jobs in last 24 hours */
  failedJobs24h: number
}

/**
 * Brand/tenant summary for the brands grid
 */
export interface BrandSummary {
  /** Organization ID */
  id: string
  /** Display name */
  name: string
  /** URL-safe slug */
  slug: string
  /** Logo URL (if set) */
  logoUrl: string | null
  /** Current status */
  status: 'active' | 'paused' | 'onboarding'
  /** Health indicator */
  health: 'healthy' | 'degraded' | 'unhealthy'
  /** Revenue in last 24 hours */
  revenue24h: number
  /** Orders in last 24 hours */
  orders24h: number
  /** Error count in last 24 hours */
  errorCount24h: number
  /** Shopify integration status */
  shopifyConnected: boolean
  /** Stripe integration status */
  stripeConnected: boolean
  /** Creation date */
  createdAt: Date
}

/**
 * Alert priority levels
 */
export type AlertPriority = 'p1' | 'p2' | 'p3'

/**
 * Alert status
 */
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'

/**
 * Platform alert for the alert feed
 */
export interface PlatformAlert {
  /** Alert ID */
  id: string
  /** Alert title */
  title: string
  /** Alert message/description */
  message: string
  /** Priority level */
  priority: AlertPriority
  /** Current status */
  status: AlertStatus
  /** Associated brand (if any) */
  brandId: string | null
  /** Brand name for display */
  brandName: string | null
  /** When the alert was created */
  createdAt: Date
  /** When acknowledged (if any) */
  acknowledgedAt: Date | null
  /** Who acknowledged */
  acknowledgedBy: string | null
  /** When resolved (if any) */
  resolvedAt: Date | null
}

/**
 * System health status
 */
export interface SystemHealth {
  /** Overall status */
  status: 'healthy' | 'degraded' | 'critical'
  /** Component-level health */
  components: {
    database: 'healthy' | 'degraded' | 'critical'
    cache: 'healthy' | 'degraded' | 'critical'
    shopify: 'healthy' | 'degraded' | 'critical'
    stripe: 'healthy' | 'degraded' | 'critical'
    jobs: 'healthy' | 'degraded' | 'critical'
  }
  /** Last health check timestamp */
  checkedAt: Date
}

/**
 * Paginated response for brands list
 */
export interface PaginatedBrands {
  /** Brand summaries */
  brands: BrandSummary[]
  /** Total count */
  total: number
  /** Current page */
  page: number
  /** Items per page */
  pageSize: number
  /** Total pages */
  totalPages: number
}

/**
 * Navigation item for the sidebar
 */
export interface NavItem {
  /** Display label */
  label: string
  /** Route path */
  href: string
  /** Icon name from Lucide */
  icon: string
  /** Sub-items (for expandable sections) */
  children?: NavItem[]
  /** Badge text (e.g., alert count) */
  badge?: string | number
  /** Whether this section requires MFA */
  requiresMfa?: boolean
}
