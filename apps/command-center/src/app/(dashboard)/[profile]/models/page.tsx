'use client'

import { PROFILES } from '@cgk-platform/openclaw'
import { use, useCallback, useEffect, useState } from 'react'

import { ModelsGrid } from '@/components/models/models-grid'
import { RefreshButton } from '@/components/ui/refresh-button'

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

export default function ModelsPage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/openclaw/${profile}/models`)
      const data = await res.json()
      setModels(data.models || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Models — {config?.label || profile}
          </h1>
          <p className="text-muted-foreground">
            {models.length} models available
          </p>
        </div>
        <RefreshButton onRefresh={fetchData} />
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : (
        <ModelsGrid models={models} />
      )}
    </div>
  )
}
