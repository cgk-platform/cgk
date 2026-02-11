import { Suspense } from 'react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Badge, Card, CardHeader, CardContent, cn } from '@cgk/ui'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TemplateTestDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/templates/ab-tests"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to template tests
      </Link>

      {/* Header */}
      <Suspense fallback={<HeaderSkeleton />}>
        <TemplateTestHeader testId={id} />
      </Suspense>

      {/* Template Previews */}
      <Suspense fallback={<PreviewsSkeleton />}>
        <TemplatePreviewsLoader testId={id} />
      </Suspense>

      {/* Results Table */}
      <Suspense fallback={<ResultsSkeleton />}>
        <TemplateResultsLoader testId={id} />
      </Suspense>

      {/* Engagement Chart */}
      <Suspense fallback={<ChartSkeleton />}>
        <EngagementChartLoader testId={id} />
      </Suspense>
    </div>
  )
}

async function getTenantSlug(): Promise<string | null> {
  const headerList = await headers()
  return headerList.get('x-tenant-slug')
}

async function TemplateTestHeader({ testId }: { testId: string }) {
  // In a real implementation, fetch the test data
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Email Subject Line Test
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Testing urgency vs. value-focused subject lines
          </p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700">
          <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Running
        </Badge>
      </div>
      <div className="mt-4 flex gap-6 text-sm text-slate-500">
        <span>
          <strong className="text-slate-700">2</strong> templates
        </span>
        <span>
          <strong className="text-slate-700">50/50</strong> split
        </span>
        <span>
          Started <strong className="text-slate-700">3 days ago</strong>
        </span>
      </div>
    </div>
  )
}

async function TemplatePreviewsLoader({ testId }: { testId: string }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <TemplatePreviewCard
        variant="A"
        name="Urgency Focus"
        subject="Last chance! Your cart expires in 2 hours"
        previewText="Don't miss out on the items you love..."
        isWinner={false}
      />
      <TemplatePreviewCard
        variant="B"
        name="Value Focus"
        subject="Your handpicked items are waiting"
        previewText="We saved your favorites just for you..."
        isWinner={true}
      />
    </div>
  )
}

function TemplatePreviewCard({
  variant,
  name,
  subject,
  previewText,
  isWinner,
}: {
  variant: 'A' | 'B'
  name: string
  subject: string
  previewText: string
  isWinner: boolean
}) {
  return (
    <Card
      className={cn(
        'border-slate-200',
        isWinner && 'ring-2 ring-emerald-500 ring-offset-2'
      )}
    >
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                variant === 'A'
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-cyan-100 text-cyan-700'
              )}
            >
              {variant}
            </span>
            <span className="font-semibold text-slate-900">{name}</span>
          </div>
          {isWinner && (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
              Leading
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Subject
            </p>
            <p className="font-medium text-slate-900">{subject}</p>
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Preview Text
            </p>
            <p className="text-sm text-slate-600">{previewText}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

async function TemplateResultsLoader({ testId }: { testId: string }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Results Comparison</h2>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Template
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sent
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Opens
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Open Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Clicks
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  CTR
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Conversions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                      A
                    </span>
                    <span className="font-medium text-slate-900">Urgency Focus</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-mono text-slate-900">5,432</td>
                <td className="px-6 py-4 text-right font-mono text-slate-900">1,245</td>
                <td className="px-6 py-4 text-right font-mono text-slate-900">22.9%</td>
                <td className="px-6 py-4 text-right font-mono text-slate-900">312</td>
                <td className="px-6 py-4 text-right font-mono text-slate-900">5.7%</td>
                <td className="px-6 py-4 text-right font-mono text-slate-900">45</td>
              </tr>
              <tr className="bg-emerald-50 hover:bg-emerald-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700">
                      B
                    </span>
                    <span className="font-medium text-slate-900">Value Focus</span>
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      Leading
                    </Badge>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-mono text-slate-900">5,421</td>
                <td className="px-6 py-4 text-right font-mono text-slate-900">1,489</td>
                <td className="px-6 py-4 text-right font-mono font-semibold text-emerald-600">
                  27.5%
                </td>
                <td className="px-6 py-4 text-right font-mono text-slate-900">398</td>
                <td className="px-6 py-4 text-right font-mono font-semibold text-emerald-600">
                  7.3%
                </td>
                <td className="px-6 py-4 text-right font-mono text-slate-900">62</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

async function EngagementChartLoader({ testId }: { testId: string }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Engagement Over Time</h2>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex h-64 items-center justify-center text-slate-500">
          Chart placeholder - would show open/click rates over time
        </div>
      </CardContent>
    </Card>
  )
}

function HeaderSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-64 rounded bg-slate-200" />
        <div className="h-4 w-48 rounded bg-slate-200" />
      </div>
    </div>
  )
}

function PreviewsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <Card key={i} className="border-slate-200">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-32 rounded bg-slate-200" />
              <div className="h-24 rounded bg-slate-100" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 rounded bg-slate-200" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-6">
        <div className="h-64 animate-pulse rounded bg-slate-100" />
      </CardContent>
    </Card>
  )
}
