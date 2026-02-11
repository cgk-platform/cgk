'use client'

import { AlertTriangle, CheckCircle, Info } from 'lucide-react'

import { Card, CardHeader, CardContent, cn } from '@cgk/ui'

import { useSRMAnalysis } from '@/lib/ab-tests/hooks'

interface DataQualityCardProps {
  testId: string
}

export function DataQualityCard({ testId }: DataQualityCardProps) {
  const { analysis, isLoading } = useSRMAnalysis(testId)

  if (isLoading) {
    return (
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Data Quality
          </h3>
        </CardHeader>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-3/4 rounded bg-slate-200" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const issues: { type: 'error' | 'warning' | 'info'; message: string }[] = []

  if (analysis?.hasSRM) {
    issues.push({
      type: 'error',
      message: `Sample Ratio Mismatch detected (p=${analysis.pValue.toFixed(4)})`,
    })
  }

  const qualityScore = analysis?.hasSRM ? 60 : 100

  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Data Quality
          </h3>
          <QualityBadge score={qualityScore} />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {issues.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            <span>No issues detected</span>
          </div>
        ) : (
          <div className="space-y-2">
            {issues.map((issue, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2 rounded-lg p-2 text-sm',
                  issue.type === 'error' && 'bg-red-50 text-red-700',
                  issue.type === 'warning' && 'bg-amber-50 text-amber-700',
                  issue.type === 'info' && 'bg-slate-50 text-slate-600'
                )}
              >
                {issue.type === 'error' && (
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                )}
                {issue.type === 'warning' && (
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                )}
                {issue.type === 'info' && (
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                )}
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Traffic Split */}
        {analysis && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-medium text-slate-500">Traffic Split</p>
            <div className="space-y-2">
              {Object.entries(analysis.observedRatio).map(([name, ratio]) => {
                const expected = analysis.expectedRatio[name] || 0
                const diff = Math.abs(ratio - expected)
                const isOff = diff > 0.02

                return (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{name}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-mono',
                          isOff ? 'text-amber-600' : 'text-slate-900'
                        )}
                      >
                        {(ratio * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-slate-400">
                        (exp: {(expected * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function QualityBadge({ score }: { score: number }) {
  const config =
    score >= 90
      ? { label: 'Good', className: 'bg-emerald-100 text-emerald-700' }
      : score >= 70
        ? { label: 'Fair', className: 'bg-amber-100 text-amber-700' }
        : { label: 'Poor', className: 'bg-red-100 text-red-700' }

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}
