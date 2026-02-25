'use client'

import { Card, CardContent, StatusBadge } from '@cgk-platform/ui'
import { Puzzle } from 'lucide-react'

interface Skill {
  name: string
  version?: string
  category?: string
  enabled: boolean
  scriptCount: number
}

interface SkillsGridProps {
  skills: Skill[]
}

export function SkillsGrid({ skills }: SkillsGridProps) {
  if (skills.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No skills installed
      </div>
    )
  }

  // Group by category
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const cat = skill.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(skill)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, categorySkills]) => (
          <div key={category}>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {category} ({categorySkills.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categorySkills.map((skill) => (
                <Card key={skill.name} className="card-hover">
                  <CardContent className="flex items-start gap-3 p-4">
                    <Puzzle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{skill.name}</p>
                        <StatusBadge status={skill.enabled ? 'active' : 'disabled'} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {skill.version && <span>v{skill.version}</span>}
                        <span>{skill.scriptCount} scripts</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
