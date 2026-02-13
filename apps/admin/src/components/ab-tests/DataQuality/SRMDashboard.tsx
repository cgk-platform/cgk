'use client'

import Link from 'next/link'
import { AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'

import { Badge, Card, CardHeader, CardContent, cn } from '@cgk-platform/ui'

import type { SRMAnalysis } from '@/lib/ab-tests/types'

interface SRMDashboardProps {
  analyses: SRMAnalysis[]
}

export function SRMDashboard({ analyses }: SRMDashboardProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Sample Ratio Mismatch (SRM)
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Detects when traffic split differs from expected allocation
            </p>
          </div>
          <SRMInfoTooltip />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {analyses.length === 0 ? (
          <p className="text-sm text-slate-500">No running tests to analyze</p>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis) => (
              <SRMAnalysisRow key={analysis.testId} analysis={analysis} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SRMAnalysisRow({ analysis }: { analysis: SRMAnalysis }) {
  const severityConfig = {
    none: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'OK' },
    low: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Low' },
    medium: { color: 'text-orange-600', bg: 'bg-orange-50', label: 'Medium' },
    high: { color: 'text-red-600', bg: 'bg-red-50', label: 'High' },
  }

  const { color, bg, label } = severityConfig[analysis.severity]

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        analysis.hasSRM ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {analysis.hasSRM ? (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          ) : (
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          )}
          <div>
            <Link
              href={`/admin/ab-tests/${analysis.testId}`}
              className="font-medium text-slate-900 hover:text-cyan-600"
            >
              {analysis.testName}
            </Link>
            <p className="mt-0.5 text-sm text-slate-500">
              Chi-squared: {analysis.chiSquare.toFixed(3)} | p-value: {analysis.pValue.toFixed(4)}
            </p>
          </div>
        </div>
        <Badge className={cn('text-xs', bg, color)}>{label}</Badge>
      </div>

      {/* Traffic Split Visualization */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Expected</p>
          <div className="flex h-4 overflow-hidden rounded">
            {Object.entries(analysis.expectedRatio).map(([name, ratio], i) => {
              const colors = ['bg-slate-500', 'bg-cyan-500', 'bg-emerald-500']
              return (
                <div
                  key={name}
                  className={cn('flex items-center justify-center text-xs text-white', colors[i % colors.length])}
                  style={{ width: `${ratio * 100}%` }}
                >
                  {ratio * 100 > 15 && `${(ratio * 100).toFixed(0)}%`}
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Observed</p>
          <div className="flex h-4 overflow-hidden rounded">
            {Object.entries(analysis.observedRatio).map(([name, ratio], i) => {
              const colors = ['bg-slate-500', 'bg-cyan-500', 'bg-emerald-500']
              return (
                <div
                  key={name}
                  className={cn('flex items-center justify-center text-xs text-white', colors[i % colors.length])}
                  style={{ width: `${ratio * 100}%` }}
                >
                  {ratio * 100 > 15 && `${(ratio * 100).toFixed(0)}%`}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {analysis.recommendation && (
        <div className="mt-3 rounded bg-white/50 p-2 text-sm text-slate-600">
          <strong>Recommendation:</strong> {analysis.recommendation}
        </div>
      )}
    </div>
  )
}

function SRMInfoTooltip() {
  return (
    <div className="group relative">
      <HelpCircle className="h-5 w-5 text-slate-400 hover:text-slate-600" />
      <div className="absolute right-0 top-full z-10 mt-2 hidden w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg group-hover:block">
        <p className="text-sm text-slate-600">
          SRM occurs when the observed traffic split differs significantly from the expected
          allocation. This can indicate issues with your test implementation.
        </p>
      </div>
    </div>
  )
}
