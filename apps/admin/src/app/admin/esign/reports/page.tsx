/**
 * E-Signature Reports Page
 *
 * Analytics and reporting for e-signatures.
 */

import { Button, Card, CardContent, cn } from '@cgk/ui'
import {
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  FileCheck,
  FileX,
} from 'lucide-react'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { getReportData } from '@/lib/esign'
import type { EsignReportData } from '@/lib/esign/types'

interface PageProps {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    templateId?: string
  }>
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            E-signature analytics and insights
          </p>
        </div>
        <a href={`/api/admin/esign/reports?export=csv${params.startDate ? `&startDate=${params.startDate}` : ''}${params.endDate ? `&endDate=${params.endDate}` : ''}`}>
          <Button variant="outline" className="gap-1.5">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </a>
      </div>

      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsLoader params={params} />
      </Suspense>
    </div>
  )
}

async function getTenantSlug(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-slug')
}

async function ReportsLoader({
  params,
}: {
  params: {
    startDate?: string
    endDate?: string
    templateId?: string
  }
}) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <EmptyState />
  }

  const endDate = params.endDate ? new Date(params.endDate) : new Date()
  const startDate = params.startDate
    ? new Date(params.startDate)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

  const report = await getReportData(tenantSlug, {
    startDate,
    endDate,
    templateId: params.templateId,
  })

  return <ReportsContent report={report} />
}

function ReportsContent({ report }: { report: EsignReportData }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Documents Sent"
          value={report.documentsSent}
          icon={FileCheck}
          iconClass="text-sky-600"
        />
        <MetricCard
          label="Completion Rate"
          value={`${report.completionRate}%`}
          icon={CheckCircle}
          iconClass="text-emerald-600"
        />
        <MetricCard
          label="Avg. Time to Complete"
          value={formatDuration(report.avgTimeToComplete)}
          icon={Clock}
          iconClass="text-amber-600"
        />
        <MetricCard
          label="Decline Rate"
          value={`${report.declineRate}%`}
          icon={FileX}
          iconClass="text-rose-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
              Documents by Status
            </h3>
            <div className="space-y-3">
              {Object.entries(report.documentsByStatus).map(([status, count]) => {
                const total = Object.values(report.documentsByStatus).reduce(
                  (a, b) => a + b,
                  0
                )
                const percentage = total > 0 ? (count / total) * 100 : 0
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-24 text-sm capitalize text-slate-600 dark:text-slate-400">
                      {status.replace('_', ' ')}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          getStatusColor(status)
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Templates */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
              Top Templates
            </h3>
            {report.topTemplates.length === 0 ? (
              <p className="text-sm text-slate-500">No templates used yet</p>
            ) : (
              <div className="space-y-3">
                {report.topTemplates.map((template, idx) => (
                  <div
                    key={template.templateId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                          idx === 0
                            ? 'bg-amber-100 text-amber-700'
                            : idx === 1
                              ? 'bg-slate-200 text-slate-700'
                              : idx === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {template.templateName}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {template.documentCount} docs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time to Complete Distribution */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
            Time to Complete Distribution
          </h3>
          {report.timeToCompleteDistribution.length === 0 ? (
            <p className="text-sm text-slate-500">No completed documents yet</p>
          ) : (
            <div className="flex h-48 items-end gap-4">
              {report.timeToCompleteDistribution.map((bucket) => {
                const max = Math.max(
                  ...report.timeToCompleteDistribution.map((b) => b.count)
                )
                const height = max > 0 ? (bucket.count / max) * 100 : 0
                return (
                  <div key={bucket.bucket} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {bucket.count}
                    </span>
                    <div
                      className="w-full rounded-t bg-primary/80 transition-all"
                      style={{ height: `${height}%`, minHeight: bucket.count > 0 ? '8px' : '0' }}
                    />
                    <span className="text-center text-xs text-slate-500 dark:text-slate-400">
                      {bucket.bucket}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {value}
            </p>
          </div>
          <div className={cn('rounded-lg bg-slate-100 p-2.5 dark:bg-slate-800', iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex h-48 items-center justify-center">
        <div className="text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">
            No data yet
          </p>
          <p className="text-sm text-slate-500">
            Reports will appear once documents are sent
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-8 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500'
    case 'pending':
      return 'bg-amber-500'
    case 'in_progress':
      return 'bg-sky-500'
    case 'declined':
      return 'bg-rose-500'
    case 'expired':
      return 'bg-orange-500'
    case 'voided':
      return 'bg-slate-400'
    default:
      return 'bg-slate-300'
  }
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`
  }
  if (hours < 24) {
    return `${Math.round(hours * 10) / 10}h`
  }
  return `${Math.round(hours / 24)}d`
}
