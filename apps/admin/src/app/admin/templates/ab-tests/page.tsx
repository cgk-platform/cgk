import { Suspense } from 'react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button, Card, CardContent, Badge, cn } from '@cgk/ui'

import { getTemplateABTests } from '@/lib/ab-tests/db'
import type { TemplateABTest } from '@/lib/ab-tests/types'

export default function TemplateABTestsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Template A/B Tests
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Test email templates for better engagement
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/templates/ab-tests/new">
            <Plus className="mr-2 h-4 w-4" />
            New Template Test
          </Link>
        </Button>
      </div>

      {/* Test List */}
      <Suspense fallback={<TestListSkeleton />}>
        <TestListLoader />
      </Suspense>
    </div>
  )
}

async function getTenantSlug(): Promise<string | null> {
  const headerList = await headers()
  return headerList.get('x-tenant-slug')
}

async function TestListLoader() {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return <TestListSkeleton />

  const tests = await getTemplateABTests(tenantSlug)
  return <TemplateTestList tests={tests} />
}

function TemplateTestList({ tests }: { tests: TemplateABTest[] }) {
  if (tests.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <MailIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-1 font-semibold text-slate-900">No template tests yet</h3>
          <p className="mb-4 text-sm text-slate-500">
            Test your email templates to improve engagement
          </p>
          <Button asChild>
            <Link href="/admin/templates/ab-tests/new">Create Template Test</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tests.map((test) => (
        <TemplateTestCard key={test.id} test={test} />
      ))}
    </div>
  )
}

function TemplateTestCard({ test }: { test: TemplateABTest }) {
  const statusConfig = {
    draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
    running: { label: 'Running', className: 'bg-emerald-100 text-emerald-700' },
    paused: { label: 'Paused', className: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Completed', className: 'bg-slate-100 text-slate-700' },
  }

  const { label, className } = statusConfig[test.status]

  return (
    <Card className="border-slate-200 hover:border-slate-300 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/admin/templates/ab-tests/${test.id}`}
              className="font-semibold text-slate-900 hover:text-cyan-600"
            >
              {test.name}
            </Link>
            <Badge className={cn('ml-2 text-xs', className)}>
              {test.status === 'running' && (
                <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              )}
              {label}
            </Badge>
          </div>
          {test.winner && (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
              Winner: {test.winner.toUpperCase()}
            </Badge>
          )}
        </div>

        {test.description && (
          <p className="mt-2 text-sm text-slate-500">{test.description}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <TemplatePreview
            label="Template A"
            name={test.templateAName}
            isWinner={test.winner === 'a'}
          />
          <TemplatePreview
            label="Template B"
            name={test.templateBName}
            isWinner={test.winner === 'b'}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <MetricBox
            label="Opens"
            a={test.metrics.opens.a}
            b={test.metrics.opens.b}
          />
          <MetricBox
            label="Clicks"
            a={test.metrics.clicks.a}
            b={test.metrics.clicks.b}
          />
          <MetricBox
            label="Conv."
            a={test.metrics.conversions.a}
            b={test.metrics.conversions.b}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function TemplatePreview({
  label,
  name,
  isWinner,
}: {
  label: string
  name: string
  isWinner: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        isWinner
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-slate-50'
      )}
    >
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-900">{name}</p>
    </div>
  )
}

function MetricBox({
  label,
  a,
  b,
}: {
  label: string
  a: number
  b: number
}) {
  const aWins = a > b
  const bWins = b > a

  return (
    <div className="rounded bg-slate-50 p-2">
      <p className="text-slate-500">{label}</p>
      <div className="mt-1 flex justify-center gap-2 font-mono text-sm">
        <span className={aWins ? 'font-semibold text-emerald-600' : 'text-slate-600'}>
          {a}
        </span>
        <span className="text-slate-300">/</span>
        <span className={bWins ? 'font-semibold text-emerald-600' : 'text-slate-600'}>
          {b}
        </span>
      </div>
    </div>
  )
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function TestListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="border-slate-200">
          <CardContent className="p-5">
            <div className="animate-pulse space-y-4">
              <div className="h-5 w-3/4 rounded bg-slate-200" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 rounded bg-slate-100" />
                <div className="h-16 rounded bg-slate-100" />
              </div>
              <div className="h-12 rounded bg-slate-100" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
