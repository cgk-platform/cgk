'use client'

import { AlertTriangle, CheckCircle, Activity, Eye } from 'lucide-react'

import { Card, CardContent, cn } from '@cgk/ui'

import type { DataQualityOverview as OverviewType } from '@/lib/ab-tests/types'

interface OverviewProps {
  overview: OverviewType
}

export function DataQualityOverview({ overview }: OverviewProps) {
  const scoreColor =
    overview.overallScore >= 90
      ? 'text-emerald-600'
      : overview.overallScore >= 70
        ? 'text-amber-600'
        : 'text-red-600'

  const scoreBg =
    overview.overallScore >= 90
      ? 'bg-emerald-50'
      : overview.overallScore >= 70
        ? 'bg-amber-50'
        : 'bg-red-50'

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* Overall Score */}
      <Card className={cn('border-slate-200', scoreBg)}>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-full p-2', scoreBg.replace('50', '100'))}>
              <Activity className={cn('h-5 w-5', scoreColor)} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Quality Score
              </p>
              <p className={cn('font-mono text-2xl font-bold', scoreColor)}>
                {overview.overallScore}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests with Issues */}
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100 p-2">
              <Eye className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tests with Issues
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900">
                {overview.testsWithIssues}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SRM Alerts */}
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'rounded-full p-2',
                overview.srmAlerts > 0 ? 'bg-red-100' : 'bg-emerald-100'
              )}
            >
              {overview.srmAlerts > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                SRM Alerts
              </p>
              <p
                className={cn(
                  'font-mono text-2xl font-bold',
                  overview.srmAlerts > 0 ? 'text-red-600' : 'text-slate-900'
                )}
              >
                {overview.srmAlerts}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Novelty Warnings */}
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'rounded-full p-2',
                overview.noveltyWarnings > 0 ? 'bg-amber-100' : 'bg-emerald-100'
              )}
            >
              {overview.noveltyWarnings > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Novelty Warnings
              </p>
              <p
                className={cn(
                  'font-mono text-2xl font-bold',
                  overview.noveltyWarnings > 0 ? 'text-amber-600' : 'text-slate-900'
                )}
              >
                {overview.noveltyWarnings}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drift Warnings */}
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'rounded-full p-2',
                overview.driftWarnings > 0 ? 'bg-amber-100' : 'bg-emerald-100'
              )}
            >
              {overview.driftWarnings > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Drift Warnings
              </p>
              <p
                className={cn(
                  'font-mono text-2xl font-bold',
                  overview.driftWarnings > 0 ? 'text-amber-600' : 'text-slate-900'
                )}
              >
                {overview.driftWarnings}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
