'use client'

import { PROFILES } from '@cgk-platform/openclaw/profiles'
import { cn } from '@cgk-platform/ui'
import { use, useCallback, useEffect, useState } from 'react'

import { SkillCredentials } from '@/components/skills/skill-credentials'
import { SkillsGrid } from '@/components/skills/skills-grid'
import { RefreshButton } from '@/components/ui/refresh-button'

interface Skill {
  name: string
  description?: string
  source: string
  bundled: boolean
}

type ViewMode = 'skills' | 'credentials'

export default function SkillsPage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [skills, setSkills] = useState<Skill[]>([])
  const [bundledCount, setBundledCount] = useState(0)
  const [managedCount, setManagedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('skills')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/openclaw/${profile}/skills`)
      const data = await res.json()
      setSkills(data.skills || [])
      setBundledCount(data.bundledCount || 0)
      setManagedCount(data.managedCount || 0)
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
            Skills — {config?.label || profile}
          </h1>
          <p className="text-muted-foreground">
            {skills.length} skills installed ({bundledCount} bundled, {managedCount} managed)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-lg border p-0.5">
            {(['skills', 'credentials'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
                  view === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <RefreshButton onRefresh={fetchData} />
        </div>
      </div>

      {view === 'skills' ? (
        loading ? (
          <div className="h-64 animate-pulse rounded-lg border bg-card" />
        ) : (
          <SkillsGrid skills={skills} />
        )
      ) : (
        <SkillCredentials profile={profile} />
      )}
    </div>
  )
}
