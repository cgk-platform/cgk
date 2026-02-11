/**
 * Klaviyo API key connection
 *
 * @ai-pattern api-key-auth
 * @ai-note Klaviyo uses API keys instead of OAuth
 */

import { sql, withTenant } from '@cgk/db'

import { encryptToken, decryptToken } from '../encryption.js'
import type { KlaviyoConnectResult, KlaviyoConnection, KlaviyoList } from '../types.js'

import { getIntegrationEncryptionKey, isValidKlaviyoApiKey, KLAVIYO_CONFIG } from './config.js'

/**
 * Connect Klaviyo using API key
 *
 * @param tenantId - The tenant to connect
 * @param privateApiKey - Klaviyo private API key (starts with pk_)
 * @param publicApiKey - Optional public API key for client-side tracking
 * @returns Connection result with account info
 */
export async function connectKlaviyo(params: {
  tenantId: string
  privateApiKey: string
  publicApiKey?: string
}): Promise<KlaviyoConnectResult> {
  // 1. Validate API key format
  if (!isValidKlaviyoApiKey(params.privateApiKey)) {
    throw new Error('Invalid Klaviyo API key format - must start with pk_')
  }

  // 2. Test the API key
  const testResponse = await fetch(`${KLAVIYO_CONFIG.apiUrl}/accounts/`, {
    headers: {
      Authorization: `Klaviyo-API-Key ${params.privateApiKey}`,
      revision: KLAVIYO_CONFIG.apiRevision,
      Accept: 'application/json',
    },
  })

  if (!testResponse.ok) {
    const error = (await testResponse.json().catch(() => ({}))) as {
      errors?: Array<{ detail?: string }>
    }
    throw new Error(
      `Invalid Klaviyo API key: ${error.errors?.[0]?.detail || testResponse.statusText}`
    )
  }

  interface KlaviyoAccount {
    id: string
    attributes?: {
      contact_information?: {
        organization_name?: string
        default_sender_name?: string
      }
    }
  }

  const accountResult = (await testResponse.json()) as { data?: KlaviyoAccount[] }
  const account = accountResult.data?.[0]

  if (!account) {
    throw new Error('Could not retrieve Klaviyo account information')
  }

  // 3. Fetch lists for configuration
  const listsResponse = await fetch(`${KLAVIYO_CONFIG.apiUrl}/lists/`, {
    headers: {
      Authorization: `Klaviyo-API-Key ${params.privateApiKey}`,
      revision: KLAVIYO_CONFIG.apiRevision,
      Accept: 'application/json',
    },
  })

  if (!listsResponse.ok) {
    throw new Error('Failed to fetch Klaviyo lists')
  }

  const listsResult = (await listsResponse.json()) as {
    data?: Array<{ id: string; attributes: { name: string } }>
  }

  const lists: KlaviyoList[] = (listsResult.data || []).map(
    (list) => ({
      id: list.id,
      name: list.attributes.name,
      type: 'list' as const,
    })
  )

  // 4. Store encrypted key
  const encryptionKey = getIntegrationEncryptionKey()
  const encryptedPrivateKey = await encryptToken(params.privateApiKey, encryptionKey)

  const companyName =
    account.attributes?.contact_information?.organization_name ||
    account.attributes?.contact_information?.default_sender_name ||
    'Unknown'

  await withTenant(params.tenantId, async () => {
    await sql`
      INSERT INTO klaviyo_connections (
        tenant_id,
        private_api_key_encrypted,
        public_api_key,
        company_name,
        account_id,
        lists,
        is_active,
        connected_at
      ) VALUES (
        ${params.tenantId},
        ${encryptedPrivateKey},
        ${params.publicApiKey || null},
        ${companyName},
        ${account.id},
        ${JSON.stringify(lists)},
        true,
        NOW()
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        private_api_key_encrypted = EXCLUDED.private_api_key_encrypted,
        public_api_key = EXCLUDED.public_api_key,
        company_name = EXCLUDED.company_name,
        account_id = EXCLUDED.account_id,
        lists = EXCLUDED.lists,
        is_active = true,
        connected_at = NOW(),
        disconnected_at = NULL
    `
  })

  return {
    connected: true,
    companyName,
    lists,
  }
}

/**
 * Get Klaviyo connection for a tenant
 */
export async function getKlaviyoConnection(
  tenantId: string
): Promise<KlaviyoConnection | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        private_api_key_encrypted as "privateApiKeyEncrypted",
        public_api_key as "publicApiKey",
        company_name as "companyName",
        account_id as "accountId",
        sms_list_id as "smsListId",
        email_list_id as "emailListId",
        lists,
        is_active as "isActive",
        last_synced_at as "lastSyncedAt",
        connected_at as "connectedAt",
        disconnected_at as "disconnectedAt"
      FROM klaviyo_connections
      WHERE tenant_id = ${tenantId}
    `
  })

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return {
    id: row.id as string,
    tenantId: row.tenantId as string,
    privateApiKeyEncrypted: row.privateApiKeyEncrypted as string,
    publicApiKey: row.publicApiKey as string | null,
    companyName: row.companyName as string | null,
    accountId: row.accountId as string | null,
    smsListId: row.smsListId as string | null,
    emailListId: row.emailListId as string | null,
    lists: (row.lists as KlaviyoList[]) || [],
    isActive: row.isActive as boolean,
    lastSyncedAt: row.lastSyncedAt ? new Date(row.lastSyncedAt as string) : null,
    connectedAt: new Date(row.connectedAt as string),
    disconnectedAt: row.disconnectedAt ? new Date(row.disconnectedAt as string) : null,
  }
}

/**
 * Disconnect Klaviyo
 */
export async function disconnectKlaviyo(tenantId: string): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE klaviyo_connections
      SET is_active = false, disconnected_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
}

/**
 * Get decrypted Klaviyo API key
 */
export async function getKlaviyoApiKey(tenantId: string): Promise<string> {
  const connection = await getKlaviyoConnection(tenantId)

  if (!connection) {
    throw new Error('No Klaviyo connection found')
  }

  if (!connection.isActive) {
    throw new Error('Klaviyo connection is disconnected')
  }

  const encryptionKey = getIntegrationEncryptionKey()
  return decryptToken(connection.privateApiKeyEncrypted, encryptionKey)
}

/**
 * Test Klaviyo connection
 */
export async function testKlaviyoConnection(tenantId: string): Promise<boolean> {
  try {
    const apiKey = await getKlaviyoApiKey(tenantId)

    const response = await fetch(`${KLAVIYO_CONFIG.apiUrl}/accounts/`, {
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: KLAVIYO_CONFIG.apiRevision,
        Accept: 'application/json',
      },
    })

    return response.ok
  } catch {
    return false
  }
}

/**
 * Update list selection for a Klaviyo connection
 */
export async function updateKlaviyoLists(
  tenantId: string,
  emailListId: string | null,
  smsListId: string | null
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE klaviyo_connections
      SET
        email_list_id = ${emailListId},
        sms_list_id = ${smsListId}
      WHERE tenant_id = ${tenantId}
    `
  })
}

/**
 * Refresh Klaviyo lists from API
 */
export async function refreshKlaviyoLists(tenantId: string): Promise<KlaviyoList[]> {
  const apiKey = await getKlaviyoApiKey(tenantId)

  const response = await fetch(`${KLAVIYO_CONFIG.apiUrl}/lists/`, {
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: KLAVIYO_CONFIG.apiRevision,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to refresh Klaviyo lists')
  }

  const resultData = (await response.json()) as {
    data?: Array<{ id: string; attributes: { name: string } }>
  }

  const lists: KlaviyoList[] = (resultData.data || []).map(
    (list) => ({
      id: list.id,
      name: list.attributes.name,
      type: 'list' as const,
    })
  )

  // Update stored lists
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE klaviyo_connections
      SET lists = ${JSON.stringify(lists)}, last_synced_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })

  return lists
}
