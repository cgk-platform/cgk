import {
  OpenClawGatewayClient,
  PROFILE_SLUGS,
  type ProfileSlug,
} from '@cgk-platform/openclaw'

/**
 * Singleton pool of gateway clients — one per profile.
 * Lazily connects on first access.
 */

const clients = new Map<ProfileSlug, OpenClawGatewayClient>()

/** Get or create a client for the given profile. Connects lazily. */
export async function getGatewayClient(profile: ProfileSlug): Promise<OpenClawGatewayClient> {
  let client = clients.get(profile)
  if (!client) {
    client = new OpenClawGatewayClient(profile)
    clients.set(profile, client)
  }
  if (!client.connected) {
    await client.connect()
  }
  return client
}

/** Try to get a client, returning null instead of throwing on connection failure */
export async function tryGetGatewayClient(profile: ProfileSlug): Promise<OpenClawGatewayClient | null> {
  try {
    return await getGatewayClient(profile)
  } catch {
    return null
  }
}

/** Get health from all profiles, settling independently */
export async function getAllGatewayHealth() {
  const results = await Promise.allSettled(
    PROFILE_SLUGS.map(async (slug) => {
      const client = await getGatewayClient(slug)
      const health = await client.health()
      return { slug, connected: true, health, error: undefined }
    })
  )

  const profiles: Record<string, { connected: boolean; health: unknown; error?: string }> = {}

  for (let i = 0; i < PROFILE_SLUGS.length; i++) {
    const slug = PROFILE_SLUGS[i]!
    const result = results[i]!
    if (result.status === 'fulfilled') {
      profiles[slug] = result.value
    } else {
      profiles[slug] = {
        connected: false,
        health: null,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      }
    }
  }

  return { profiles }
}

/** Disconnect all clients (for cleanup) */
export function disconnectAll(): void {
  for (const client of clients.values()) {
    client.disconnect()
  }
  clients.clear()
}
