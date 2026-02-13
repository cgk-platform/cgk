'use client'

import { Badge, Button, Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { ExternalLink, FileQuestion, FileX, AlertTriangle } from 'lucide-react'

import type { ContentGap, GapType } from '@/lib/seo/types'

interface ContentGapTableProps {
  gaps: ContentGap[]
  onRefresh?: () => void
  isLoading?: boolean
}

const gapTypeConfig: Record<GapType, { label: string; color: string; icon: React.ElementType }> = {
  no_content: {
    label: 'No Content',
    color: 'bg-red-100 text-red-800',
    icon: FileX,
  },
  weak_content: {
    label: 'Weak Content',
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertTriangle,
  },
  no_dedicated_page: {
    label: 'No Dedicated Page',
    color: 'bg-orange-100 text-orange-800',
    icon: FileQuestion,
  },
}

export function ContentGapTable({ gaps, onRefresh, isLoading }: ContentGapTableProps) {
  if (gaps.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileQuestion className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No content gaps found</p>
          <p className="text-muted-foreground">
            Run a content gap analysis to identify opportunities
          </p>
          {onRefresh && (
            <Button onClick={onRefresh} className="mt-4" disabled={isLoading}>
              {isLoading ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="font-semibold">Content Gaps ({gaps.length})</h3>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? 'Analyzing...' : 'Refresh'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Keyword</th>
                <th className="pb-3 font-medium">Gap Type</th>
                <th className="pb-3 font-medium text-right">Relevance</th>
                {gaps.some((g) => g.search_volume !== null) && (
                  <>
                    <th className="pb-3 font-medium text-right">Volume</th>
                    <th className="pb-3 font-medium text-right">Difficulty</th>
                  </>
                )}
                {gaps.some((g) => g.competitor_url) && (
                  <th className="pb-3 font-medium">Competitor</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {gaps.map((gap) => {
                const config = gapTypeConfig[gap.gap_type]
                const Icon = config.icon

                return (
                  <tr key={gap.id} className="group">
                    <td className="py-3">
                      <span className="font-medium">{gap.keyword}</span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.color}`}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {gap.relevance_score !== null ? (
                        <Badge variant={gap.relevance_score >= 50 ? 'default' : 'secondary'}>
                          {gap.relevance_score}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    {gaps.some((g) => g.search_volume !== null) && (
                      <>
                        <td className="py-3 text-right">
                          {gap.search_volume?.toLocaleString() || '-'}
                        </td>
                        <td className="py-3 text-right">
                          {gap.difficulty !== null ? (
                            <span className={
                              gap.difficulty < 30 ? 'text-green-600' :
                              gap.difficulty < 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }>
                              {gap.difficulty}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </>
                    )}
                    {gaps.some((g) => g.competitor_url) && (
                      <td className="py-3">
                        {gap.competitor_url && (
                          <a
                            href={gap.competitor_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

interface ContentGapSummaryProps {
  noContent: number
  weakContent: number
  noDedicatedPage: number
}

export function ContentGapSummary({ noContent, weakContent, noDedicatedPage }: ContentGapSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-red-100 p-3">
            <FileX className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{noContent}</p>
            <p className="text-sm text-muted-foreground">No Content</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-yellow-100 p-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{weakContent}</p>
            <p className="text-sm text-muted-foreground">Weak Content</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-orange-100 p-3">
            <FileQuestion className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{noDedicatedPage}</p>
            <p className="text-sm text-muted-foreground">No Dedicated Page</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
