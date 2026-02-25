import {
  OpenClawGatewayClient,
  PROFILE_SLUGS,
  type GatewayHealth,
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

/** Normalize raw gateway health into a shape the dashboard UI can consume */
export function normalizeHealth(raw: GatewayHealth) {
  const slack = raw.channels?.slack
  // Slack is "connected" if either socket mode is running OR probe shows ok
  const slackConnected = slack?.running === true || slack?.probe?.ok === true
  const slackConfigured = slack?.configured === true
  const slackBotName = slack?.probe?.bot?.name
  const slackTeamName = slack?.probe?.team?.name

  // Count sessions if available
  const sessionCount = raw.sessions
    ? (raw.sessions as { count?: number }).count ?? 0
    : 0

  return {
    ok: raw.ok,
    ts: raw.ts,
    slackConnected,
    slackConfigured,
    slackBotName,
    slackTeamName,
    heartbeatSeconds: raw.heartbeatSeconds,
    defaultAgentId: raw.defaultAgentId,
    agentCount: raw.agents?.length ?? 0,
    agents: raw.agents?.map((a) => ({
      agentId: a.agentId,
      isDefault: a.isDefault,
      heartbeatEnabled: a.heartbeat?.enabled ?? false,
      heartbeatEvery: a.heartbeat?.every,
    })),
    sessionCount,
  }
}

/** Get health from all profiles, settling independently */
export async function getAllGatewayHealth() {
  const results = await Promise.allSettled(
    PROFILE_SLUGS.map(async (slug) => {
      const client = await getGatewayClient(slug)
      const raw = await client.health()
      return { slug, connected: true, health: normalizeHealth(raw), error: undefined }
    })
  )

  const profiles: Record<string, { connected: boolean; health: ReturnType<typeof normalizeHealth> | null; error?: string }> = {}

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
