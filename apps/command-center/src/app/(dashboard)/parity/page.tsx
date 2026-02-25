'use client'

import { Card, CardContent, CardHeader, CardTitle, cn } from '@cgk-platform/ui'
import { Check, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const PROFILE_LABELS: Record<string, string> = {
  cgk: 'CGK',
  rawdog: 'RAWDOG',
  vitahustle: 'VitaHustle',
}

interface ParityData {
  profiles: Record<string, unknown>
  skillDiffs: Array<{
    name: string
    present: Record<string, boolean>
  }>
}

export default function ParityPage() {
  const [data, setData] = useState<ParityData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/analytics/parity')
      const json = await res.json()
      setData(json)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Parity Checker</h1>
        <p className="text-muted-foreground">
          Compare configuration and skills across all profiles
        </p>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : data ? (
        <>
          {/* Skill parity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skill Differences</CardTitle>
            </CardHeader>
            <CardContent>
              {data.skillDiffs.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-success">
                  <Check className="h-4 w-4" />
                  All profiles have identical skills
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium">Skill</th>
                        {Object.keys(PROFILE_LABELS).map((slug) => (
                          <th key={slug} className="p-3 text-center font-medium">
                            {PROFILE_LABELS[slug]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.skillDiffs.map((diff) => (
                        <tr key={diff.name} className="border-b">
                          <td className="p-3 font-mono text-xs">{diff.name}</td>
                          {Object.keys(PROFILE_LABELS).map((slug) => (
                            <td key={slug} className="p-3 text-center">
                              {diff.present[slug] ? (
                                <Check className="mx-auto h-4 w-4 text-success" />
                              ) : (
                                <X className="mx-auto h-4 w-4 text-destructive" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile count summary */}
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(data.profiles).map(([slug, profileData]) => {
              const d = profileData as {
                skills: Array<{ name: string }> | null
                config: Record<string, unknown> | null
              } | null
              return (
                <Card key={slug}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {PROFILE_LABELS[slug] || slug}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Skills</span>
                        <span className={cn(
                          'font-semibold',
                          d?.skills ? '' : 'text-destructive'
                        )}>
                          {d?.skills?.length ?? 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Config Keys</span>
                        <span className={cn(
                          'font-semibold',
                          d?.config ? '' : 'text-destructive'
                        )}>
                          {d?.config ? Object.keys(d.config).length : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No data available
          </CardContent>
        </Card>
      )}
    </div>
  )
}
