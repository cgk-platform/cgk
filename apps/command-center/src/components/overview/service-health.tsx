'use client'

import { cn } from '@cgk-platform/ui'
import { useCallback, useEffect, useState } from 'react'

import { useAlerts } from '@/context/alerts-context'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  detail?: string
}

const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-success',
  degraded: 'bg-warning',
  down: 'bg-destructive',
  unknown: 'bg-gray-400',
}

export function ServiceHealth() {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const { pushAlert } = useAlerts()

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/services')
      const data = await res.json()
      const svcs = (data.services || []) as ServiceStatus[]
      setServices(svcs)

      // Push alerts for down services
      for (const svc of svcs) {
        if (svc.status === 'down') {
          pushAlert({
            level: 'critical',
            message: `${svc.name} is down`,
            source: 'Services',
          })
        }
      }
    } catch {
      // ignore
    }
  }, [pushAlert])

  useEffect(() => {
    fetchServices()
    const interval = setInterval(fetchServices, 30_000)
    return () => clearInterval(interval)
  }, [fetchServices])

  if (services.length === 0) return null

  return (
    <div className="flex items-center gap-4 rounded-lg border px-4 py-2 text-sm">
      <span className="font-medium text-muted-foreground">Services:</span>
      {services.map((svc) => (
        <div
          key={svc.name}
          className="flex items-center gap-1.5"
          title={svc.detail || svc.status}
        >
          <div className={cn('h-2 w-2 rounded-full', STATUS_COLORS[svc.status] || 'bg-gray-400')} />
          <span className={cn(
            svc.status === 'healthy' ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {svc.name}
          </span>
        </div>
      ))}
    </div>
  )
}
