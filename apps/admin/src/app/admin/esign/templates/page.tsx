/**
 * E-Signature Templates Page
 *
 * Template library management.
 */

import { Button, Card, CardContent, cn } from '@cgk/ui'
import { FileStack, Plus } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'
import { listTemplates, getTemplateStats, getTemplateFieldCount } from '@/lib/esign'
import type { EsignTemplate, EsignTemplateStatus } from '@/lib/esign/types'

interface PageProps {
  searchParams: Promise<{
    status?: string
    page?: string
  }>
}

export default async function TemplatesPage({ searchParams }: PageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Templates
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage document templates for e-signatures
          </p>
        </div>
        <Link href="/admin/esign/templates/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2">
        {(['', 'active', 'draft', 'archived'] as const).map((status) => (
          <Link
            key={status}
            href={status ? `?status=${status}` : '?'}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              (params.status || '') === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            )}
          >
            {status === '' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </Link>
        ))}
      </div>

      <Suspense fallback={<TemplatesGridSkeleton />}>
        <TemplatesLoader status={params.status} page={params.page} />
      </Suspense>
    </div>
  )
}

async function getTenantSlug(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-slug')
}

async function TemplatesLoader({
  status,
  page,
}: {
  status?: string
  page?: string
}) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <EmptyState />
  }

  const { templates } = await listTemplates(tenantSlug, {
    status: status as EsignTemplateStatus | undefined,
    page: page ? parseInt(page, 10) : 1,
    limit: 12,
  })

  if (templates.length === 0) {
    return <EmptyState />
  }

  // Get stats for each template
  const templatesWithStats = await Promise.all(
    templates.map(async (template) => {
      const stats = await getTemplateStats(tenantSlug, template.id)
      const fieldCount = await getTemplateFieldCount(tenantSlug, template.id)
      return { ...template, stats, fieldCount }
    })
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templatesWithStats.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  )
}

interface TemplateCardProps {
  template: EsignTemplate & {
    stats: { documentCount: number; completedCount: number; pendingCount: number }
    fieldCount: number
  }
}

function TemplateCard({ template }: TemplateCardProps) {
  return (
    <Link href={`/admin/esign/templates/${template.id}`}>
      <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'rounded-lg p-2.5',
                  template.status === 'active'
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : template.status === 'draft'
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                )}
              >
                <FileStack className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900 group-hover:text-primary dark:text-slate-100">
                  {template.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {template.pageCount || 0} page{template.pageCount !== 1 ? 's' : ''} - {template.fieldCount} field{template.fieldCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                template.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : template.status === 'draft'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {template.status}
            </span>
          </div>

          {template.description && (
            <p className="mt-3 line-clamp-2 text-sm text-slate-500">
              {template.description}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex gap-4 text-sm">
              <span className="text-slate-500">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {template.stats.documentCount}
                </span>{' '}
                docs
              </span>
              <span className="text-slate-500">
                <span className="font-medium text-emerald-600">
                  {template.stats.completedCount}
                </span>{' '}
                completed
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {formatDate(template.updatedAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex h-48 items-center justify-center">
        <div className="text-center">
          <FileStack className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">
            No templates yet
          </p>
          <p className="text-sm text-slate-500">
            Create your first template to get started
          </p>
          <Link href="/admin/esign/templates/new" className="mt-4 inline-block">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function TemplatesGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-1.5">
                  <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
              <div className="h-5 w-14 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="mt-3 h-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex gap-4">
                <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-3 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
