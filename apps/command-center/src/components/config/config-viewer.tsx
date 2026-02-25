'use client'

import { cn } from '@cgk-platform/ui'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useCallback, useState } from 'react'

interface ConfigViewerProps {
  config: Record<string, unknown>
}

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val)
}

function ConfigNode({ label, value, depth = 0 }: { label: string; value: unknown; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const isObj = isObject(value)
  const isArr = Array.isArray(value)
  const isExpandable = isObj || isArr

  const toggle = useCallback(() => setExpanded((prev) => !prev), [])

  // Mask potentially sensitive values
  const isSensitive = /token|secret|key|password|credential/i.test(label)

  if (!isExpandable) {
    let displayValue: string
    let valueClass = 'text-foreground'

    if (isSensitive && typeof value === 'string' && value.length > 0) {
      displayValue = '••••••••'
      valueClass = 'text-muted-foreground italic'
    } else if (typeof value === 'string') {
      displayValue = `"${value}"`
      valueClass = 'text-success'
    } else if (typeof value === 'number') {
      displayValue = String(value)
      valueClass = 'text-info'
    } else if (typeof value === 'boolean') {
      displayValue = String(value)
      valueClass = value ? 'text-success' : 'text-destructive'
    } else if (value === null || value === undefined) {
      displayValue = 'null'
      valueClass = 'text-muted-foreground'
    } else {
      displayValue = String(value)
    }

    return (
      <div className="flex items-baseline gap-2 py-0.5" style={{ paddingLeft: `${depth * 16}px` }}>
        <span className="shrink-0 font-mono text-xs text-gold/80">{label}:</span>
        <span className={cn('font-mono text-xs', valueClass)}>{displayValue}</span>
      </div>
    )
  }

  const entries = isArr
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>)

  return (
    <div>
      <button
        onClick={toggle}
        className="flex w-full items-center gap-1 py-0.5 text-left hover:bg-accent/30"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className="font-mono text-xs text-gold/80">{label}</span>
        <span className="text-2xs text-muted-foreground">
          {isArr ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>
      {expanded && entries.map(([key, val]) => (
        <ConfigNode key={key} label={key} value={val} depth={depth + 1} />
      ))}
    </div>
  )
}

export function ConfigViewer({ config }: ConfigViewerProps) {
  if (!config || Object.keys(config).length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No configuration data
      </div>
    )
  }

  return (
    <div className="overflow-auto rounded-lg border bg-card p-4">
      {Object.entries(config).map(([key, value]) => (
        <ConfigNode key={key} label={key} value={value} />
      ))}
    </div>
  )
}
