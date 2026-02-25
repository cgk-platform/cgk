/**
 * Wire protocol types for openCLAW gateway WebSocket RPC
 */

/** Profile slugs for the 3 openCLAW instances */
export type ProfileSlug = 'cgk' | 'rawdog' | 'vitahustle'

/** Outbound RPC request frame */
export interface RequestFrame {
  id: string
  method: string
  params?: Record<string, unknown>
}

/** Inbound RPC response frame */
export interface ResponseFrame {
  id: string
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

/** Inbound push event frame */
export interface EventFrame {
  event: string
  data: unknown
}

/** Union of all inbound frames */
export type InboundFrame = ResponseFrame | EventFrame

/** Gateway health snapshot */
export interface GatewayHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  version: string
  agentCount: number
  slackConnected: boolean
  activeSessionCount: number
  cronJobCount: number
  skillCount: number
  memoryUsage?: {
    rss: number
    heapUsed: number
    heapTotal: number
  }
}

/** Cron job definition */
export interface CronJob {
  id: string
  name: string
  schedule: string
  enabled: boolean
  timezone: string
  lastRun?: string
  nextRun?: string
  lastStatus?: 'success' | 'failure' | 'running'
  sessionTarget: string
  delivery?: {
    mode: string
    channel?: string
    to?: string
  }
  agentId?: string
}

/** Cron run history entry */
export interface CronRun {
  id: string
  jobId: string
  startedAt: string
  completedAt?: string
  status: 'success' | 'failure' | 'running' | 'timeout'
  duration?: number
  error?: string
}

/** Active session info */
export interface Session {
  id: string
  type: 'main' | 'isolated' | 'group'
  agentId?: string
  createdAt: string
  lastActivity?: string
  messageCount: number
  tokenUsage?: {
    input: number
    output: number
    total: number
  }
}

/** Aggregated session usage / cost info */
export interface SessionUsage {
  totalSessions: number
  activeSessions: number
  totalTokens: number
  totalCost: number
  byModel: Record<string, { tokens: number; cost: number }>
}

/** Agent identity */
export interface AgentIdentity {
  name: string
  model: string
  workspace: string
  instructions?: string
}

/** Model entry */
export interface ModelEntry {
  id: string
  provider: string
  name: string
  active: boolean
}

/** Skill status */
export interface SkillStatus {
  name: string
  version?: string
  category?: string
  enabled: boolean
  scriptCount: number
}

/** Slack channel status */
export interface ChannelStatus {
  id: string
  name: string
  connected: boolean
  requireMention: boolean
  lastMessage?: string
}

/** Log entry from gateway */
export interface LogEntry {
  timestamp: string
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string
  source?: string
  data?: Record<string, unknown>
}

/** Gateway config snapshot */
export interface GatewayConfig {
  [key: string]: unknown
}

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
  profiles: Record<ProfileSlug, {
    connected: boolean
    health: GatewayHealth | null
    error?: string
  }>
}
