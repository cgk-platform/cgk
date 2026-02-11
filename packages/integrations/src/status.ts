/**
 * Integration status utilities
 *
 * Get unified status for all integrations
 */

import { getGoogleAdsConnection } from './google-ads/oauth.js'
import { getKlaviyoConnection } from './klaviyo/connect.js'
import { getMetaConnection } from './meta/oauth.js'
import { getTikTokConnection } from './tiktok/oauth.js'
import type { IntegrationProvider, IntegrationStatus } from './types.js'

/**
 * Get status for all integrations for a tenant
 */
export async function getAllIntegrationStatuses(
  tenantId: string
): Promise<IntegrationStatus[]> {
  const [meta, googleAds, tiktok, klaviyo] = await Promise.all([
    getMetaConnection(tenantId),
    getGoogleAdsConnection(tenantId),
    getTikTokConnection(tenantId),
    getKlaviyoConnection(tenantId),
  ])

  const statuses: IntegrationStatus[] = [
    {
      provider: 'meta',
      connected: !!meta,
      status: meta ? meta.status : 'not_connected',
      accountName: meta?.selectedAdAccountName || null,
      tokenExpiresAt: meta?.tokenExpiresAt || null,
      needsReauth: meta?.needsReauth || false,
      lastError: meta?.lastError || null,
      lastSyncAt: meta?.lastSyncAt || null,
    },
    {
      provider: 'google_ads',
      connected: !!googleAds,
      status: googleAds ? googleAds.status : 'not_connected',
      accountName: googleAds?.selectedCustomerName || null,
      tokenExpiresAt: googleAds?.tokenExpiresAt || null,
      needsReauth: googleAds?.needsReauth || false,
      lastError: googleAds?.lastError || null,
      lastSyncAt: googleAds?.lastSyncAt || null,
    },
    {
      provider: 'tiktok',
      connected: !!tiktok,
      status: tiktok ? tiktok.status : 'not_connected',
      accountName: tiktok?.selectedAdvertiserName || null,
      tokenExpiresAt: tiktok?.tokenExpiresAt || null,
      needsReauth: tiktok?.needsReauth || false,
      lastError: tiktok?.lastError || null,
      lastSyncAt: tiktok?.lastSyncAt || null,
    },
    {
      provider: 'klaviyo',
      connected: klaviyo?.isActive || false,
      status: klaviyo?.isActive ? 'active' : 'not_connected',
      accountName: klaviyo?.companyName || null,
      tokenExpiresAt: null, // API keys don't expire
      needsReauth: false, // API keys don't need reauth
      lastError: null,
      lastSyncAt: klaviyo?.lastSyncedAt || null,
    },
  ]

  return statuses
}

/**
 * Get status for a single integration
 */
export async function getIntegrationStatus(
  tenantId: string,
  provider: IntegrationProvider
): Promise<IntegrationStatus> {
  switch (provider) {
    case 'meta': {
      const meta = await getMetaConnection(tenantId)
      return {
        provider: 'meta',
        connected: !!meta,
        status: meta ? meta.status : 'not_connected',
        accountName: meta?.selectedAdAccountName || null,
        tokenExpiresAt: meta?.tokenExpiresAt || null,
        needsReauth: meta?.needsReauth || false,
        lastError: meta?.lastError || null,
        lastSyncAt: meta?.lastSyncAt || null,
      }
    }

    case 'google_ads': {
      const googleAds = await getGoogleAdsConnection(tenantId)
      return {
        provider: 'google_ads',
        connected: !!googleAds,
        status: googleAds ? googleAds.status : 'not_connected',
        accountName: googleAds?.selectedCustomerName || null,
        tokenExpiresAt: googleAds?.tokenExpiresAt || null,
        needsReauth: googleAds?.needsReauth || false,
        lastError: googleAds?.lastError || null,
        lastSyncAt: googleAds?.lastSyncAt || null,
      }
    }

    case 'tiktok': {
      const tiktok = await getTikTokConnection(tenantId)
      return {
        provider: 'tiktok',
        connected: !!tiktok,
        status: tiktok ? tiktok.status : 'not_connected',
        accountName: tiktok?.selectedAdvertiserName || null,
        tokenExpiresAt: tiktok?.tokenExpiresAt || null,
        needsReauth: tiktok?.needsReauth || false,
        lastError: tiktok?.lastError || null,
        lastSyncAt: tiktok?.lastSyncAt || null,
      }
    }

    case 'klaviyo': {
      const klaviyo = await getKlaviyoConnection(tenantId)
      return {
        provider: 'klaviyo',
        connected: klaviyo?.isActive || false,
        status: klaviyo?.isActive ? 'active' : 'not_connected',
        accountName: klaviyo?.companyName || null,
        tokenExpiresAt: null,
        needsReauth: false,
        lastError: null,
        lastSyncAt: klaviyo?.lastSyncedAt || null,
      }
    }
  }
}

/**
 * Check if any integrations need attention (reauth, errors)
 */
export async function hasIntegrationIssues(tenantId: string): Promise<boolean> {
  const statuses = await getAllIntegrationStatuses(tenantId)
  return statuses.some((s) => s.needsReauth || s.lastError)
}
