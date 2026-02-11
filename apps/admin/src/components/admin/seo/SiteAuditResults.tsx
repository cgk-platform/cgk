'use client'

import { Badge, Button, Card, CardContent, CardHeader } from '@cgk/ui'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react'
import { useState } from 'react'

import type { SEOAudit, PageSEOAnalysis, AuditSummary } from '@/lib/seo/types'

interface SiteAuditResultsProps {
  audit: SEOAudit | null
  summary: AuditSummary
  onRunAudit: () => Promise<void>
  isLoading?: boolean
}

export function SiteAuditResults({
  audit,
  summary,
  onRunAudit,
  isLoading,
}: SiteAuditResultsProps) {
  const [expandedPage, setExpandedPage] = useState<string | null>(null)

  if (!audit) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No audits yet</p>
          <p className="text-muted-foreground">
            Run your first site audit to see SEO scores
          </p>
          <Button onClick={onRunAudit} className="mt-4" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Running Audit...' : 'Run Site Audit'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-3xl font-bold">{audit.average_score}</p>
              </div>
              {summary.scoreChange !== 0 && (
                <div className={summary.scoreChange > 0 ? 'text-green-600' : 'text-red-600'}>
                  {summary.scoreChange > 0 ? (
                    <TrendingUp className="h-6 w-6" />
                  ) : (
                    <TrendingDown className="h-6 w-6" />
                  )}
                  <span className="text-sm font-medium">
                    {summary.scoreChange > 0 ? '+' : ''}{summary.scoreChange}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-red-100 p-3">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{audit.critical_issues}</p>
              <p className="text-sm text-muted-foreground">Critical Issues</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-yellow-100 p-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{audit.warnings}</p>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{audit.passed}</p>
              <p className="text-sm text-muted-foreground">Passed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Last audit: {new Date(audit.started_at).toLocaleString()} |{' '}
          {audit.total_pages} pages analyzed
        </p>
        <Button variant="outline" onClick={onRunAudit} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Running...' : 'Run New Audit'}
        </Button>
      </div>

      {/* Page Results */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Page Results</h3>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {audit.page_results.map((page) => (
              <PageResultRow
                key={page.url}
                page={page}
                isExpanded={expandedPage === page.url}
                onToggle={() => setExpandedPage(
                  expandedPage === page.url ? null : page.url
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface PageResultRowProps {
  page: PageSEOAnalysis
  isExpanded: boolean
  onToggle: () => void
}

function PageResultRow({ page, isExpanded, onToggle }: PageResultRowProps) {
  const scoreColor =
    page.score >= 90 ? 'bg-green-100 text-green-800' :
    page.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800'

  return (
    <div>
      <div
        className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`rounded-full px-2 py-1 text-sm font-bold ${scoreColor}`}>
            {page.score}
          </div>
          <span className="font-mono text-sm">{page.url}</span>
        </div>
        <div className="flex items-center gap-2">
          {page.criticalIssues.length > 0 && (
            <Badge variant="destructive">{page.criticalIssues.length} critical</Badge>
          )}
          {page.warnings.length > 0 && (
            <Badge variant="secondary">{page.warnings.length} warnings</Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t bg-muted/30 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Title */}
            <div className="rounded-md border bg-background p-3">
              <h4 className="mb-2 text-sm font-medium">Title</h4>
              <p className="text-sm">{page.title.value || '(missing)'}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {page.title.length} characters
              </p>
              {page.title.issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {page.title.issues.map((issue, i) => (
                    <p key={i} className="text-xs text-destructive">{issue}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Meta Description */}
            <div className="rounded-md border bg-background p-3">
              <h4 className="mb-2 text-sm font-medium">Meta Description</h4>
              <p className="text-sm line-clamp-2">{page.metaDescription.value || '(missing)'}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {page.metaDescription.length} characters
              </p>
              {page.metaDescription.issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {page.metaDescription.issues.map((issue, i) => (
                    <p key={i} className="text-xs text-destructive">{issue}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Headings */}
            <div className="rounded-md border bg-background p-3">
              <h4 className="mb-2 text-sm font-medium">Headings</h4>
              <p className="text-sm">H1: {page.headings.h1Count} | H2: {page.headings.h2Count}</p>
              {page.headings.h1s.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  H1: {page.headings.h1s[0]}
                </p>
              )}
              {page.headings.issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {page.headings.issues.map((issue, i) => (
                    <p key={i} className="text-xs text-destructive">{issue}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Images */}
            <div className="rounded-md border bg-background p-3">
              <h4 className="mb-2 text-sm font-medium">Images</h4>
              <p className="text-sm">
                {page.images.withAlt} / {page.images.total} with alt text
              </p>
              {page.images.issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {page.images.issues.map((issue, i) => (
                    <p key={i} className="text-xs text-destructive">{issue}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            <div className="rounded-md border bg-background p-3">
              <h4 className="mb-2 text-sm font-medium">Links</h4>
              <p className="text-sm">
                Internal: {page.links.internal} | External: {page.links.external}
              </p>
              {page.links.issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {page.links.issues.map((issue, i) => (
                    <p key={i} className="text-xs text-destructive">{issue}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Schema */}
            <div className="rounded-md border bg-background p-3">
              <h4 className="mb-2 text-sm font-medium">Structured Data</h4>
              <p className="text-sm">
                {page.schema.hasSchema ? (
                  <>Types: {page.schema.types.join(', ') || 'Yes'}</>
                ) : (
                  'No schema found'
                )}
              </p>
              {page.schema.issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {page.schema.issues.map((issue, i) => (
                    <p key={i} className="text-xs text-destructive">{issue}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* All Issues */}
          <div className="mt-4 space-y-2">
            {page.criticalIssues.map((issue, i) => (
              <div key={`crit-${i}`} className="flex items-center gap-2 text-sm text-red-600">
                <XCircle className="h-4 w-4" />
                {issue}
              </div>
            ))}
            {page.warnings.map((warning, i) => (
              <div key={`warn-${i}`} className="flex items-center gap-2 text-sm text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                {warning}
              </div>
            ))}
            {page.passed.map((pass, i) => (
              <div key={`pass-${i}`} className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                {pass}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
