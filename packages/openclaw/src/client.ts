import crypto from 'crypto'
import { getProfileToken, getProfileUrl } from './profiles.js'
import type {
  AgentsListResponse,
  ChannelsStatusResponse,
  ConnectionState,
  CronListResponse,
  CronRunsResponse,
  CronStatusResponse,
  EventFrame,
  GatewayConfig,
  GatewayHealth,
  LogsTailResponse,
  ModelsListResponse,
  ProfileSlug,
  ResponseFrame,
  SessionsListResponse,
  SessionUsageResponse,
  SkillsStatusResponse,
} from './types.js'

type EventHandler = (data: unknown) => void

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

interface DeviceIdentity {
  deviceId: string
  privateKeyPem: string
  publicKeyBase64Url: string
}

const RPC_TIMEOUT_MS = 10_000
const CONNECT_TIMEOUT_MS = 15_000
const RECONNECT_BASE_MS = 5_000
const MAX_RECONNECT_MS = 30_000

/** Default scopes to request when device signing is available */
const DEFAULT_SCOPES = ['operator.admin', 'operator.read', 'operator.write']

/**
 * Load device identity from environment variables.
 * Returns null if not configured (falls back to token-only auth).
 */
function getDeviceIdentity(): DeviceIdentity | null {
  const deviceId = process.env.OPENCLAW_DEVICE_ID
  const privateKeyB64 = process.env.OPENCLAW_DEVICE_PRIVATE_KEY
  const publicKeyB64 = process.env.OPENCLAW_DEVICE_PUBLIC_KEY

  if (!deviceId || !privateKeyB64 || !publicKeyB64) {
    return null
  }

  // Keys are stored as base64-encoded PEM strings (to avoid newline issues in env vars)
  const privateKeyPem = Buffer.from(privateKeyB64, 'base64').toString('utf8')
  const publicKeyPem = Buffer.from(publicKeyB64, 'base64').toString('utf8')

  // Extract raw 32-byte Ed25519 public key from PEM and base64url encode
  const pubKeyDer = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' })
  const rawPubKey = pubKeyDer.subarray(12) // Ed25519 SPKI has 12-byte prefix
  const publicKeyBase64Url = rawPubKey.toString('base64url')

  return { deviceId, privateKeyPem, publicKeyBase64Url }
}

/**
 * Build the v2 pipe-delimited auth payload and Ed25519 signature.
 */
function buildDeviceAuth(
  identity: DeviceIdentity,
  token: string,
  nonce: string,
  scopes: string[]
): { device: Record<string, unknown>; scopes: string[] } {
  const signedAtMs = Date.now()
  const scopesStr = scopes.join(',')

  // v2 pipe-delimited payload format (from CLI source)
  const payload = [
    'v2',
    identity.deviceId,
    'gateway-client',
    'backend',
    'operator',
    scopesStr,
    String(signedAtMs),
    token,
    nonce,
  ].join('|')

  const privateKey = crypto.createPrivateKey(identity.privateKeyPem)
  const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64url')

  return {
    device: {
      id: identity.deviceId,
      publicKey: identity.publicKeyBase64Url,
      signature,
      signedAt: signedAtMs,
      nonce,
    },
    scopes,
  }
}

/**
 * WebSocket RPC client for a single openCLAW gateway.
 *
 * Implements the protocol v3 handshake:
 *   1. Open WebSocket
 *   2. Receive `connect.challenge` frame with nonce
 *   3. Send `connect` request with auth token + device signature
 *   4. Receive `hello-ok` response
 *   5. RPC ready
 */
export class OpenClawGatewayClient {
  readonly profile: ProfileSlug
  private ws: import('ws').WebSocket | null = null
  private _state: ConnectionState = 'disconnected'
  private pending = new Map<string, PendingRequest>()
  private eventHandlers = new Map<string, Set<EventHandler>>()
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private requestCounter = 0
  private stateChangeHandlers = new Set<(state: ConnectionState) => void>()

  constructor(profile: ProfileSlug) {
    this.profile = profile
  }

  /** Current connection state */
  get state(): ConnectionState {
    return this._state
  }

  /** Whether the client is connected and authenticated */
  get connected(): boolean {
    return this._state === 'connected'
  }

  /** Connect to the gateway and complete the protocol v3 handshake */
  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') return

    this.setState('connecting')

    try {
      const { WebSocket } = await import('ws')
      const token = getProfileToken(this.profile) || ''
      const url = getProfileUrl(this.profile)
      const deviceIdentity = getDeviceIdentity()

      this.ws = new WebSocket(url)

      const connectId = `${this.profile}-connect`

      await new Promise<void>((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          cleanup()
          reject(new Error(`Connect timeout for ${this.profile} (${CONNECT_TIMEOUT_MS}ms)`))
        }, CONNECT_TIMEOUT_MS)

        const onMessage = (data: import('ws').RawData) => {
          let frame: Record<string, unknown>
          try {
            frame = JSON.parse(data.toString()) as Record<string, unknown>
          } catch {
            return
          }

          // Step 2: Receive connect.challenge (arrives as event frame)
          if (frame.type === 'event' && frame.event === 'connect.challenge') {
            const challengePayload = frame.payload as { nonce: string; ts: number }

            // Build connect frame with optional device-signed auth
            let scopes = ['operator.read']
            let deviceField: Record<string, unknown> | undefined

            if (deviceIdentity) {
              const auth = buildDeviceAuth(
                deviceIdentity,
                token,
                challengePayload.nonce,
                DEFAULT_SCOPES
              )
              scopes = auth.scopes
              deviceField = auth.device
            }

            const connectFrame: Record<string, unknown> = {
              type: 'req',
              id: connectId,
              method: 'connect',
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: 'gateway-client',
                  version: '2026.2.23',
                  platform: 'darwin',
                  mode: 'backend',
                },
                role: 'operator',
                scopes,
                caps: [],
                commands: [],
                auth: { token },
                ...(deviceField ? { device: deviceField } : {}),
                locale: 'en-US',
                userAgent: 'command-center/1.0',
              },
            }
            this.ws!.send(JSON.stringify(connectFrame))
            return
          }

          // Step 4: Connect response
          if (frame.id === connectId && frame.ok === true) {
            cleanup()
            clearTimeout(connectTimeout)
            this.setState('connected')
            this.reconnectAttempt = 0
            resolve()
            return
          }

          // Handle connect rejection
          if (frame.id === connectId && frame.ok === false) {
            cleanup()
            clearTimeout(connectTimeout)
            const errMsg = (frame.error as { message?: string })?.message || 'Connect rejected'
            reject(new Error(`Gateway auth failed for ${this.profile}: ${errMsg}`))
            return
          }
        }

        const onError = (err: Error) => {
          cleanup()
          clearTimeout(connectTimeout)
          reject(err)
        }

        const onClose = () => {
          cleanup()
          clearTimeout(connectTimeout)
          reject(new Error(`WebSocket closed during handshake for ${this.profile}`))
        }

        const cleanup = () => {
          this.ws?.removeListener('message', onMessage)
          this.ws?.removeListener('error', onError)
          this.ws?.removeListener('close', onClose)
        }

        this.ws!.on('message', onMessage)
        this.ws!.on('error', onError)
        this.ws!.on('close', onClose)
      })

      // Handshake complete — attach persistent listeners
      this.ws.on('message', (data) => this.handleMessage(data))
      this.ws.on('close', () => this.handleClose())
      this.ws.on('error', (err) => {
        console.error(`[openclaw:${this.profile}] WS error:`, err.message)
      })
    } catch (err) {
      this.setState('disconnected')
      if (this.ws) {
        this.ws.removeAllListeners()
        this.ws.close()
        this.ws = null
      }
      this.scheduleReconnect()
      throw err
    }
  }

  /** Disconnect from the gateway */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = null
    }
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Client disconnected'))
      this.pending.delete(id)
    }
    this.setState('disconnected')
  }

  /** Send an RPC request and await the response */
  async rpc<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    if (!this.ws || this._state !== 'connected') {
      throw new Error(`Not connected to ${this.profile} gateway`)
    }

    const id = `${this.profile}-${++this.requestCounter}`
    const frame = {
      type: 'req' as const,
      id,
      method,
      ...(params ? { params } : {}),
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC timeout: ${method} (${RPC_TIMEOUT_MS}ms)`))
      }, RPC_TIMEOUT_MS)

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      })

      this.ws!.send(JSON.stringify(frame))
    })
  }

  /** Subscribe to push events */
  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)

    return () => {
      this.eventHandlers.get(event)?.delete(handler)
    }
  }

  /** Subscribe to connection state changes */
  onStateChange(handler: (state: ConnectionState) => void): () => void {
    this.stateChangeHandlers.add(handler)
    return () => {
      this.stateChangeHandlers.delete(handler)
    }
  }

  // ─── Typed convenience methods ───────────────────────────────────

  async health(): Promise<GatewayHealth> {
    return this.rpc<GatewayHealth>('health')
  }

  async cronList(): Promise<CronListResponse> {
    return this.rpc<CronListResponse>('cron.list')
  }

  async cronStatus(): Promise<CronStatusResponse> {
    return this.rpc<CronStatusResponse>('cron.status')
  }

  async cronRuns(jobId: string, limit = 20): Promise<CronRunsResponse> {
    return this.rpc<CronRunsResponse>('cron.runs', { jobId, limit })
  }

  async cronRun(jobId: string): Promise<unknown> {
    return this.rpc('cron.run', { jobId })
  }

  async sessionsList(): Promise<SessionsListResponse> {
    return this.rpc<SessionsListResponse>('sessions.list')
  }

  async sessionsUsage(): Promise<SessionUsageResponse> {
    return this.rpc<SessionUsageResponse>('sessions.usage')
  }

  async agentsList(): Promise<AgentsListResponse> {
    return this.rpc<AgentsListResponse>('agents.list')
  }

  async modelsList(): Promise<ModelsListResponse> {
    return this.rpc<ModelsListResponse>('models.list')
  }

  async skillsStatus(): Promise<SkillsStatusResponse> {
    return this.rpc<SkillsStatusResponse>('skills.status')
  }

  async channelsStatus(): Promise<ChannelsStatusResponse> {
    return this.rpc<ChannelsStatusResponse>('channels.status')
  }

  async configGet(): Promise<GatewayConfig> {
    return this.rpc<GatewayConfig>('config.get')
  }

  async logsTail(): Promise<LogsTailResponse> {
    return this.rpc<LogsTailResponse>('logs.tail')
  }

  // ─── Internal ────────────────────────────────────────────────────

  private handleMessage(data: import('ws').RawData): void {
    let frame: Record<string, unknown>
    try {
      frame = JSON.parse(data.toString()) as Record<string, unknown>
    } catch {
      return
    }

    // Check if it's a response to a pending RPC
    if ('id' in frame && frame.id) {
      const pending = this.pending.get(frame.id as string)
      if (pending) {
        clearTimeout(pending.timer)
        this.pending.delete(frame.id as string)
        const response = frame as unknown as ResponseFrame
        if (response.ok === false || response.error) {
          const errMsg = response.error?.message || 'RPC call failed'
          pending.reject(new Error(errMsg))
        } else {
          pending.resolve(response.payload)
        }
      }
      return
    }

    // Push events
    if ('event' in frame) {
      const eventFrame = frame as unknown as EventFrame
      const handlers = this.eventHandlers.get(eventFrame.event)
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(eventFrame.data)
          } catch (err) {
            console.error(`[openclaw:${this.profile}] Event handler error:`, err)
          }
        }
      }
    }
  }

  private handleClose(): void {
    this.ws = null
    this.setState('disconnected')
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return

    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt),
      MAX_RECONNECT_MS
    )
    this.reconnectAttempt++
    this.setState('reconnecting')

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.connect()
      } catch {
        // connect() will schedule another reconnect on failure
      }
    }, delay)
  }

  private setState(state: ConnectionState): void {
    if (this._state === state) return
    this._state = state
    for (const handler of this.stateChangeHandlers) {
      try {
        handler(state)
      } catch {
        // ignore handler errors
      }
    }
  }
}
