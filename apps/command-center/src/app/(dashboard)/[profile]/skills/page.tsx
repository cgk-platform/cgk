'use client'

import { PROFILES } from '@cgk-platform/openclaw'
import { use, useCallback, useEffect, useState } from 'react'

import { SkillsGrid } from '@/components/skills/skills-grid'

interface Skill {
  name: string
  description?: string
  source: string
  bundled: boolean
}

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Skills — {config?.label || profile}
        </h1>
        <p className="text-muted-foreground">
          {skills.length} skills installed ({bundledCount} bundled, {managedCount} managed)
        </p>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : (
        <SkillsGrid skills={skills} />
      )}
    </div>
  )
}
