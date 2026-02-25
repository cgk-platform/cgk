'use client'

import { PROFILES } from '@cgk-platform/openclaw'
import { use, useCallback, useEffect, useState } from 'react'

import { SkillsGrid } from '@/components/skills/skills-grid'

export default function SkillsPage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [skills, setSkills] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/openclaw/${profile}/skills`)
      const data = await res.json()
      setSkills(data.skills || [])
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
          {skills.length} skills installed
        </p>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : (
        <SkillsGrid skills={skills as Parameters<typeof SkillsGrid>[0]['skills']} />
      )}
    </div>
  )
}
