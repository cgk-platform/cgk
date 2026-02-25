'use client'

import { Card, CardContent, StatusBadge } from '@cgk-platform/ui'
import { Cpu } from 'lucide-react'
import { useMemo, useState } from 'react'

interface Model {
  id: string
  name?: string
  provider?: string
  contextWindow?: number
  reasoning?: boolean
  inputModalities?: string[]
  capabilities?: string[]
  [key: string]: unknown
}

interface ModelsGridProps {
  models: Model[]
}

function formatContextWindow(tokens?: number): string {
  if (!tokens) return '—'
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`
  return String(tokens)
}

function extractProvider(model: Model): string {
  if (model.provider) return model.provider
  const id = model.id || model.name || ''
  const slash = id.indexOf('/')
  if (slash > 0) return id.slice(0, slash)
  return 'other'
}

export function ModelsGrid({ models }: ModelsGridProps) {
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    const lower = search.toLowerCase()
    const filtered = search
      ? models.filter((m) => {
          const name = m.name || m.id || ''
          const provider = extractProvider(m)
          return name.toLowerCase().includes(lower) || provider.toLowerCase().includes(lower)
        })
      : models

    const groups: Record<string, Model[]> = {}
    for (const model of filtered) {
      const provider = extractProvider(model)
      if (!groups[provider]) groups[provider] = []
      groups[provider].push(model)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [models, search])

  if (models.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No models available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search models..."
        className="w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm"
      />

      {grouped.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No models match &ldquo;{search}&rdquo;
        </div>
      ) : (
        grouped.map(([provider, providerModels]) => (
          <div key={provider}>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {provider} ({providerModels.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {providerModels.map((model) => (
                <Card key={model.id} className="card-hover">
                  <CardContent className="flex items-start gap-3 p-4">
                    <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={model.id}>
                        {model.name || model.id}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {model.contextWindow && (
                          <div className="flex justify-between">
                            <span>Context</span>
                            <span className="font-mono">
                              {formatContextWindow(model.contextWindow)}
                            </span>
                          </div>
                        )}
                        {model.inputModalities && model.inputModalities.length > 0 && (
                          <div className="flex justify-between">
                            <span>Input</span>
                            <span>{model.inputModalities.join(', ')}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {model.reasoning && (
                            <StatusBadge status="active" label="reasoning" />
                          )}
                          {model.capabilities?.map((cap) => (
                            <StatusBadge key={cap} status="ready" label={cap} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
