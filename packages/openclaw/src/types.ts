/**
 * Wire protocol types for openCLAW gateway WebSocket RPC
 */

/** Profile slug — a string identifier for an openCLAW profile instance */
export type ProfileSlug = string

/** Outbound RPC request frame (protocol v3) */
export interface RequestFrame {
  type: 'req'
  id: string
  method: string
  params?: Record<string, unknown>
}

/** Inbound RPC response frame (protocol v3) */
export interface ResponseFrame {
  type?: string
  id: string
  ok: boolean
  payload?: unknown
  error?: {
    code: number | string
    message: string
    data?: unknown
  }
}

/** Inbound push event frame */
export interface EventFrame {
  type?: string
  event: string
  data: unknown
}

/** Connect challenge from gateway after WS open (arrives as event frame) */
export interface ConnectChallengeFrame {
  type: 'event'
  event: 'connect.challenge'
  payload: {
    nonce: string
    ts: number
  }
}

/** Hello-ok response after successful connect handshake (arrives as res frame) */
export interface HelloOkFrame {
  type: 'res'
  id: string
  ok: true
  payload: {
    type: 'hello-ok'
    protocol: number
    server: Record<string, unknown>
    features?: {
      methods?: string[]
      [key: string]: unknown
    }
  }
}

/** Union of all inbound frames */
export type InboundFrame = ResponseFrame | EventFrame | ConnectChallengeFrame | HelloOkFrame

// ─── Gateway Health ─────────────────────────────────────────

export interface SlackChannelHealth {
  configured: boolean
  botTokenSource: string
  appTokenSource: string
  running: boolean
  lastStartAt: number | null
  lastStopAt: number | null
  lastError: string | null
  probe?: {
    ok: boolean
    status: number
    elapsedMs: number
    bot?: { id: string; name: string }
    team?: { id: string; name: string }
  }
  lastProbeAt: number | null
  accountId: string
  accounts?: Record<string, unknown>
}

export interface GatewayAgent {
  agentId: string
  isDefault: boolean
  heartbeat?: {
    enabled: boolean
    every: string
    everyMs: number
    prompt: string
    target: string
    ackMaxChars: number
  }
  sessions?: Record<string, unknown>
}

/** Gateway health snapshot — actual wire format from health RPC */
export interface GatewayHealth {
  ok: boolean
  ts: number
  durationMs: number
  channels: {
    slack: SlackChannelHealth
    [key: string]: unknown
  }
  channelOrder: string[]
  channelLabels: Record<string, string>
  heartbeatSeconds: number
  defaultAgentId: string
  agents: GatewayAgent[]
  sessions?: unknown
}

// ─── Cron ───────────────────────────────────────────────────

export interface CronJobSchedule {
  kind: 'cron' | 'every'
  cron?: string
  everyMs?: number
  anchorMs?: number
  timezone?: string
}

export interface CronJobState {
  nextRunAtMs: number | null
  lastRunAtMs: number | null
  lastRunStatus: string | null
  lastStatus: string | null
  lastDurationMs: number | null
  lastDeliveryStatus: string | null
  consecutiveErrors: number
  lastDelivered: boolean
}

/** Cron job definition — actual wire format */
export interface CronJob {
  id: string
  agentId: string
  name: string
  enabled: boolean
  notify: boolean
  createdAtMs: number
  updatedAtMs: number
  schedule: CronJobSchedule
  sessionTarget: string
  wakeMode: string
  payload: {
    kind: string
    message: string
    timeoutSeconds?: number
  }
  delivery: {
    mode: string
    channel?: string
    to?: string
    threadId?: string | null
  }
  state: CronJobState
}

/** Cron list response wrapper */
export interface CronListResponse {
  jobs: CronJob[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
  nextOffset: number | null
}

/** Cron status response */
export interface CronStatusResponse {
  enabled: boolean
  storePath: string
  jobs: number
  nextWakeAtMs: number | null
}

/** Cron run history entry */
export interface CronRun {
  id: string
  jobId: string
  startedAt: string
  completedAt?: string
  status: string
  durationMs?: number
  error?: string
}

/** Cron runs response wrapper */
export interface CronRunsResponse {
  entries: CronRun[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
  nextOffset: number | null
}

// ─── Sessions ───────────────────────────────────────────────

/** Active session info — actual wire format */
export interface Session {
  key: string
  kind: string
  displayName?: string
  channel?: string
  groupChannel?: string
  agentId?: string
  [key: string]: unknown
}

/** Sessions list response wrapper */
export interface SessionsListResponse {
  ts: number
  path: string
  count: number
  defaults: {
    modelProvider: string
    model: string
    contextTokens: number
  }
  sessions: Session[]
}

/** Session usage entry */
export interface SessionUsageEntry {
  key: string
  sessionId: string
  updatedAt: number
  agentId: string
  usage: {
    sessionId: string
    firstActivity: number
    lastActivity: number
    durationMs: number
    activityDates: string[]
    dailyBreakdown?: unknown[]
    [key: string]: unknown
  }
}

/** Aggregated session usage response */
export interface SessionUsageResponse {
  updatedAt: number
  startDate: string
  endDate: string
  sessions: SessionUsageEntry[]
}

// ─── Agents ─────────────────────────────────────────────────

/** Agent list response */
export interface AgentsListResponse {
  defaultId: string
  mainKey: string
  scope: string
  agents: Array<{ id: string; [key: string]: unknown }>
}

// ─── Models ─────────────────────────────────────────────────

/** Model entry */
export interface ModelEntry {
  id: string
  name: string
  provider: string
  contextWindow?: number
  reasoning?: boolean
  input?: string[]
}

/** Models list response */
export interface ModelsListResponse {
  models: ModelEntry[]
}

// ─── Skills ─────────────────────────────────────────────────

/** Skill info — actual wire format */
export interface SkillInfo {
  name: string
  description?: string
  source: string
  bundled: boolean
  filePath?: string
  [key: string]: unknown
}

/** Skills status response */
export interface SkillsStatusResponse {
  workspaceDir: string
  managedSkillsDir: string
  skills: SkillInfo[]
}

// ─── Channels ───────────────────────────────────────────────

/** Channels status response — actual wire format */
export interface ChannelsStatusResponse {
  ts: number
  channelOrder: string[]
  channelLabels: Record<string, string>
  channelDetailLabels?: Record<string, string>
  channelMeta?: Array<{ id: string; label: string; [key: string]: unknown }>
  channels: Record<string, SlackChannelHealth>
}

// ─── Logs ───────────────────────────────────────────────────

/** Log tail response */
export interface LogsTailResponse {
  file: string
  cursor: number
  size: number
  lines: string[]
  truncated: boolean
  reset?: unknown
}

/** Parsed log entry (from JSON lines) */
export interface LogEntry {
  time: string
  level: string
  subsystem?: string
  message: string
  [key: string]: unknown
}

// ─── Config ─────────────────────────────────────────────────

/** Gateway config response */
export interface GatewayConfig {
  path: string
  exists: boolean
  raw?: string
  parsed?: Record<string, unknown>
  resolved?: Record<string, unknown>
  valid: boolean
  config: Record<string, unknown>
  hash?: string
  issues?: unknown[]
  warnings?: unknown[]
  [key: string]: unknown
}

// ─── Profile ────────────────────────────────────────────────

/** Profile definition with connection details */
export interface ProfileConfig {
  slug: ProfileSlug
  label: string
  portEnvVar: string
  tokenEnvVar: string
  urlEnvVar: string
  defaultPort: number
}

/** Connection state for a single gateway */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

/** Health response aggregated across all profiles */
export interface AllProfilesHealth {
  profiles: Record<
    ProfileSlug,
    {
      connected: boolean
      health: GatewayHealth | null
      error?: string
    }
  >
}
