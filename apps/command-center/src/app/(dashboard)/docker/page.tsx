'use client'

import { StatusBadge } from '@cgk-platform/ui'
import { Box } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { ContainerLogsDialog } from '@/components/docker/container-logs-dialog'
import { ContainerTable } from '@/components/docker/container-table'
import { RefreshButton } from '@/components/ui/refresh-button'

interface ContainerInfo {
  id: string
  name: string
  status: string
  state: string
  image: string
  created: string
  ports: string
  profile: string
}

interface ContainerStats {
  containerId: string
  cpuPerc: string
  memUsage: string
  memPerc: string
  netIO: string
}

export default function DockerPage() {
  const [containers, setContainers] = useState<ContainerInfo[]>([])
  const [stats, setStats] = useState<ContainerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [logsContainerId, setLogsContainerId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/docker')
      const data = await res.json()
      setContainers(data.containers || [])
      setStats(data.stats || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleStop = useCallback(async (containerId: string) => {
    await fetch(`/api/openclaw/docker/${containerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    })
    setTimeout(fetchData, 2000)
  }, [fetchData])

  const profileCounts = containers.reduce<Record<string, number>>((acc, c) => {
    acc[c.profile] = (acc[c.profile] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Docker Sandbox Monitor</h1>
          <p className="text-muted-foreground">
            Active sandbox containers across all profiles
          </p>
        </div>
        <RefreshButton onRefresh={fetchData} />
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
        <Box className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{containers.length} running</span>
          <StatusBadge
            status={containers.length > 0 ? 'active' : 'ready'}
            label={containers.length > 0 ? 'Active' : 'None'}
          />
        </div>
        {Object.entries(profileCounts).map(([profile, count]) => (
          <span key={profile} className="text-xs text-muted-foreground">
            {profile}: {count}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : (
        <ContainerTable
          containers={containers}
          stats={stats}
          onStop={handleStop}
          onViewLogs={setLogsContainerId}
        />
      )}

      {logsContainerId && (
        <ContainerLogsDialog
          containerId={logsContainerId}
          onClose={() => setLogsContainerId(null)}
        />
      )}
    </div>
  )
}
