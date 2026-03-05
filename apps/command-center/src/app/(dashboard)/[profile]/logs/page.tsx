'use client'

import { PROFILES } from '@cgk-platform/openclaw/profiles'
import { use } from 'react'

import { LogViewer } from '@/components/logs/log-viewer'

export default function LogsPage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Logs — {config?.label || profile}
        </h1>
        <p className="text-muted-foreground">Real-time gateway log stream</p>
      </div>

      <LogViewer profile={profile} />
    </div>
  )
}
