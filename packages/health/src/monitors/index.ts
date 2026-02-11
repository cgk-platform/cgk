/**
 * Health monitors index
 *
 * Exports all health monitors and provides registry functionality.
 */

import type { HealthMonitor, ServiceTier } from '../types.js'
import { databaseMonitor, checkDatabase } from './database.js'
import {
  muxMonitor,
  assemblyAIMonitor,
  slackMonitor,
  yotpoMonitor,
  loopMonitor,
  vercelMonitor,
  checkMux,
  checkAssemblyAI,
  checkSlack,
  checkYotpo,
  checkLoop,
  checkVercel,
} from './external.js'
import { googleAdsMonitor, checkGoogleAds } from './google-ads.js'
import { inngestMonitor, checkInngest } from './inngest.js'
import { mcpMonitor, checkMCP } from './mcp.js'
import { metaMonitor, checkMeta } from './meta.js'
import { redisMonitor, checkRedis } from './redis.js'
import { shopifyMonitor, checkShopify } from './shopify.js'
import { stripeMonitor, checkStripe } from './stripe.js'
import { wiseMonitor, checkWise } from './wise.js'

// Re-export check functions
export {
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
}

/**
 * All registered health monitors
 */
export const ALL_MONITORS: HealthMonitor[] = [
  // Critical tier (1 min)
  databaseMonitor,
  redisMonitor,
  // Core tier (5 min)
  shopifyMonitor,
  stripeMonitor,
  inngestMonitor,
  // Integrations tier (15 min)
  metaMonitor,
  googleAdsMonitor,
  wiseMonitor,
  mcpMonitor,
  // External tier (30 min)
  muxMonitor,
  assemblyAIMonitor,
  slackMonitor,
  yotpoMonitor,
  loopMonitor,
  vercelMonitor,
]

/**
 * Monitor registry for lookup by name
 */
export const MONITOR_REGISTRY = new Map<string, HealthMonitor>(
  ALL_MONITORS.map((m) => [m.name, m])
)

/**
 * Get monitor by name
 */
export function getMonitor(name: string): HealthMonitor | undefined {
  return MONITOR_REGISTRY.get(name)
}

/**
 * Get monitors by tier
 */
export function getMonitorsByTier(tier: ServiceTier): HealthMonitor[] {
  return ALL_MONITORS.filter((m) => m.tier === tier)
}

/**
 * Get all platform monitors (don't require tenant)
 */
export function getPlatformMonitors(): HealthMonitor[] {
  return ALL_MONITORS.filter((m) => !m.requiresTenant)
}

/**
 * Get all tenant-specific monitors
 */
export function getTenantMonitors(): HealthMonitor[] {
  return ALL_MONITORS.filter((m) => m.requiresTenant)
}

/**
 * Get monitor names by tier
 */
export function getMonitorNamesByTier(tier: ServiceTier): string[] {
  return getMonitorsByTier(tier).map((m) => m.name)
}

/**
 * Get service tier for a monitor
 */
export function getServiceTier(service: string): ServiceTier {
  const monitor = MONITOR_REGISTRY.get(service)
  return monitor?.tier || 'external'
}

/**
 * Service tier configuration with intervals
 */
export const TIER_CONFIG: Record<ServiceTier, { interval: number; services: string[] }> = {
  critical: {
    interval: 60_000, // 1 minute
    services: getMonitorNamesByTier('critical'),
  },
  core: {
    interval: 300_000, // 5 minutes
    services: getMonitorNamesByTier('core'),
  },
  integrations: {
    interval: 900_000, // 15 minutes
    services: getMonitorNamesByTier('integrations'),
  },
  external: {
    interval: 1_800_000, // 30 minutes
    services: getMonitorNamesByTier('external'),
  },
}
