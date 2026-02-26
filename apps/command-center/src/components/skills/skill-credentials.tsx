'use client'

import { Card, CardContent, StatusBadge } from '@cgk-platform/ui'
import { ChevronDown, ChevronRight, Shield } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface VarStatus {
  name: string
  present: boolean
}

interface SkillCredential {
  name: string
  hasEnvFile: boolean
  requiredVars: VarStatus[]
  healthy: boolean
  category: string
}

interface SkillCredentialsProps {
  profile: string
}

export function SkillCredentials({ profile }: SkillCredentialsProps) {
  const [skills, setSkills] = useState<SkillCredential[]>([])
  const [healthyCount, setHealthyCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/openclaw/${profile}/skills/credentials`)
      const data = await res.json()
      setSkills(data.skills || [])
      setHealthyCount(data.healthyCount || 0)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleExpanded = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg border bg-card" />
  }

  // Group by category
  const grouped = skills.reduce<Record<string, SkillCredential[]>>((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = []
    acc[skill.category]!.push(skill)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">
          {healthyCount}/{skills.length} skills healthy
        </span>
        <StatusBadge
          status={healthyCount === skills.length ? 'healthy' : 'degraded'}
          label={healthyCount === skills.length ? 'All Clear' : 'Issues Found'}
        />
      </div>

      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, categorySkills]) => (
          <div key={category}>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {category} ({categorySkills.length})
            </h3>
            <div className="space-y-2">
              {categorySkills.map((skill) => {
                const isExpanded = expanded.has(skill.name)
                return (
                  <Card key={skill.name}>
                    <CardContent className="p-0">
                      <button
                        onClick={() => toggleExpanded(skill.name)}
                        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent/50"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="flex-1 truncate text-sm font-medium">{skill.name}</span>
                        <StatusBadge
                          status={skill.healthy ? 'healthy' : 'unhealthy'}
                          label={skill.healthy ? 'Healthy' : 'Missing Vars'}
                        />
                      </button>
                      {isExpanded && skill.requiredVars.length > 0 && (
                        <div className="border-t px-4 py-2">
                          <div className="space-y-1">
                            {skill.requiredVars.map((v) => (
                              <div key={v.name} className="flex items-center gap-2 text-xs">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    v.present ? 'bg-emerald-500' : 'bg-red-500'
                                  }`}
                                />
                                <span className="font-mono text-muted-foreground">{v.name}</span>
                              </div>
                            ))}
                          </div>
                          {!skill.hasEnvFile && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              No .env file found
                            </p>
                          )}
                        </div>
                      )}
                      {isExpanded && skill.requiredVars.length === 0 && (
                        <div className="border-t px-4 py-2">
                          <p className="text-xs text-muted-foreground">
                            No required environment variables detected
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
}
