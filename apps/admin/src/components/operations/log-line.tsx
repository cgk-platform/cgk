'use client'

import { Badge } from '@cgk/ui'
import type { PlatformLogEntry, LogLevelName } from '@cgk/logging'
import { ChevronDown, ChevronRight, AlertTriangle, Info, Bug, AlertCircle, XCircle } from 'lucide-react'
import { useState } from 'react'

interface LogLineProps {
  log: PlatformLogEntry
  showTenant?: boolean
}

/** Level colors and icons */
const levelConfig: Record<
  LogLevelName,
  { color: string; icon: React.ComponentType<{ className?: string }>; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }
> = {
  trace: {
    color: 'text-gray-400',
    icon: Bug,
    variant: 'secondary',
  },
  debug: {
    color: 'text-blue-500',
    icon: Bug,
    variant: 'info',
  },
  info: {
    color: 'text-green-500',
    icon: Info,
    variant: 'success',
  },
  warn: {
    color: 'text-yellow-500',
    icon: AlertTriangle,
    variant: 'warning',
  },
  error: {
    color: 'text-red-500',
    icon: AlertCircle,
    variant: 'destructive',
  },
  fatal: {
    color: 'text-red-700',
    icon: XCircle,
    variant: 'destructive',
  },
}

function formatTimestamp(date: Date): string {
  return date.toISOString().substring(11, 23) // HH:MM:SS.mmm
}

function formatDate(date: Date): string {
  return date.toISOString().substring(0, 10) // YYYY-MM-DD
}

export function LogLine({ log, showTenant = false }: LogLineProps) {
  const [expanded, setExpanded] = useState(false)
  const config = levelConfig[log.level] ?? levelConfig.info
  const Icon = config.icon
  const timestamp = new Date(log.timestamp)

  const hasDetails = log.data || log.errorStack || log.file

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <div
        className={`flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${hasDetails ? 'cursor-pointer' : ''}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {/* Expand indicator */}
        <div className="w-4 h-4 mt-0.5 flex-shrink-0">
          {hasDetails ? (
            expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )
          ) : null}
        </div>

        {/* Level icon */}
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />

        {/* Timestamp */}
        <span className="text-xs text-gray-500 font-mono flex-shrink-0 w-20" title={timestamp.toISOString()}>
          {formatTimestamp(timestamp)}
        </span>

        {/* Level badge */}
        <Badge variant={config.variant} className="text-xs flex-shrink-0">
          {log.level.toUpperCase()}
        </Badge>

        {/* Service */}
        <span className="text-xs text-gray-600 dark:text-gray-400 flex-shrink-0 font-mono">
          [{log.service}]
        </span>

        {/* Tenant (optional) */}
        {showTenant && log.tenantSlug && (
          <span className="text-xs text-purple-600 dark:text-purple-400 flex-shrink-0">
            @{log.tenantSlug}
          </span>
        )}

        {/* Message */}
        <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 truncate">
          {log.message}
        </span>

        {/* Action */}
        {log.action && (
          <span className="text-xs text-gray-500 flex-shrink-0">
            {log.action}
          </span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="bg-gray-50 dark:bg-gray-800/30 px-10 py-3 space-y-3 text-sm">
          {/* Metadata grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
            <MetaItem label="Date" value={formatDate(timestamp)} />
            <MetaItem label="Request ID" value={log.requestId} />
            <MetaItem label="Trace ID" value={log.traceId} />
            <MetaItem label="User ID" value={log.userId} />
            <MetaItem label="Session ID" value={log.sessionId} />
            {log.file && (
              <MetaItem
                label="Location"
                value={`${log.file}${log.line ? `:${log.line}` : ''}`}
              />
            )}
            {log.functionName && <MetaItem label="Function" value={log.functionName} />}
            <MetaItem label="Environment" value={log.environment} />
            {log.version && <MetaItem label="Version" value={log.version} />}
            {log.region && <MetaItem label="Region" value={log.region} />}
          </div>

          {/* Data */}
          {log.data && Object.keys(log.data).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-1">Data</h4>
              <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Error stack */}
          {log.errorStack && (
            <div>
              <h4 className="text-xs font-semibold text-red-600 mb-1">
                {log.errorType || 'Error'}: {log.errorCode && `(${log.errorCode})`}
              </h4>
              <pre className="text-xs bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                {log.errorStack}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null

  return (
    <div>
      <span className="text-xs text-gray-500">{label}: </span>
      <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  )
}
