import { getProfileToken, getProfileUrl } from './profiles.js'
import type {
  AgentIdentity,
  ChannelStatus,
  ConnectionState,
  CronJob,
  CronRun,
  EventFrame,
  GatewayConfig,
  GatewayHealth,
  LogEntry,
  ModelEntry,
  ProfileSlug,
  RequestFrame,
  ResponseFrame,
  Session,
  SessionUsage,
  SkillStatus,
} from './types.js'

type EventHandler = (data: unknown) => void

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const RPC_TIMEOUT_MS = 10_000
const RECONNECT_BASE_MS = 5_000
const MAX_RECONNECT_MS = 30_000

/**
 * WebSocket RPC client for a single openCLAW gateway.
 *
 * Handles connection lifecycle, request/response tracking,
 * reconnection with exponential backoff, and event subscriptions.
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

  /** Whether the client is connected */
  get connected(): boolean {
    return this._state === 'connected'
  }

  /** Connect to the gateway */
  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') return

    this.setState('connecting')

    try {
      const { WebSocket } = await import('ws')
      const token = getProfileToken(this.profile)
      const url = getProfileUrl(this.profile)

      this.ws = new WebSocket(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      await new Promise<void>((resolve, reject) => {
        const onOpen = () => {
          cleanup()
          this.setState('connected')
          this.reconnectAttempt = 0
          resolve()
        }
        const onError = (err: Error) => {
          cleanup()
          reject(err)
        }
        const cleanup = () => {
          this.ws?.removeListener('open', onOpen)
          this.ws?.removeListener('error', onError)
        }

        this.ws!.on('open', onOpen)
        this.ws!.on('error', onError)
      })

      this.ws.on('message', (data) => this.handleMessage(data))
      this.ws.on('close', () => this.handleClose())
      this.ws.on('error', (err) => {
        console.error(`[openclaw:${this.profile}] WS error:`, err.message)
      })
    } catch (err) {
      this.setState('disconnected')
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
    // Reject all pending requests
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
    const frame: RequestFrame = { id, method, ...(params ? { params } : {}) }

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

  async cronList(): Promise<CronJob[]> {
    return this.rpc<CronJob[]>('cron.list')
  }

  async cronStatus(): Promise<Record<string, unknown>> {
    return this.rpc<Record<string, unknown>>('cron.status')
  }

  async cronRuns(jobId: string, limit = 20): Promise<CronRun[]> {
    return this.rpc<CronRun[]>('cron.runs', { jobId, limit })
  }

  async cronRun(jobId: string): Promise<{ success: boolean }> {
    return this.rpc<{ success: boolean }>('cron.run', { jobId })
  }

  async sessionsList(): Promise<Session[]> {
    return this.rpc<Session[]>('sessions.list')
  }

  async sessionsUsage(): Promise<SessionUsage> {
    return this.rpc<SessionUsage>('sessions.usage')
  }

  async agentsList(): Promise<AgentIdentity[]> {
    return this.rpc<AgentIdentity[]>('agents.list')
  }

  async agentIdentity(): Promise<AgentIdentity> {
    return this.rpc<AgentIdentity>('agent.identity')
  }

  async modelsList(): Promise<ModelEntry[]> {
    return this.rpc<ModelEntry[]>('models.list')
  }

  async skillsStatus(): Promise<SkillStatus[]> {
    return this.rpc<SkillStatus[]>('skills.status')
  }

  async channelsStatus(): Promise<ChannelStatus[]> {
    return this.rpc<ChannelStatus[]>('channels.status')
  }

  async configGet(): Promise<GatewayConfig> {
    return this.rpc<GatewayConfig>('config.get')
  }

  async logsTail(count = 50): Promise<LogEntry[]> {
    return this.rpc<LogEntry[]>('logs.tail', { count })
  }

  // ─── Internal ────────────────────────────────────────────────────

  private handleMessage(data: import('ws').RawData): void {
    let frame: ResponseFrame | EventFrame
    try {
      frame = JSON.parse(data.toString()) as ResponseFrame | EventFrame
    } catch {
      return
    }

    // Check if it's a response to a pending RPC
    if ('id' in frame && frame.id) {
      const pending = this.pending.get(frame.id)
      if (pending) {
        clearTimeout(pending.timer)
        this.pending.delete(frame.id)
        const response = frame as ResponseFrame
        if (response.error) {
          pending.reject(new Error(response.error.message))
        } else {
          pending.resolve(response.result)
        }
      }
      return
    }

    // Otherwise treat as push event
    if ('event' in frame) {
      const eventFrame = frame as EventFrame
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
