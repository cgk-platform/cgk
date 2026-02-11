import { headers } from 'next/headers'
import { Suspense } from 'react'

import { PipelinePage } from '@/components/admin/pipeline'
import { getPipelineProjects, getPipelineStats, getPipelineConfig } from '@/lib/pipeline/db'

export const dynamic = 'force-dynamic'

export default async function CreatorPipelinePage() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <Suspense fallback={<PipelineSkeleton />}>
        <PipelineLoader />
      </Suspense>
    </div>
  )
}

async function PipelineLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="font-mono text-sm text-slate-500">
          No tenant configured. Please select a tenant.
        </p>
      </div>
    )
  }

  // Fetch initial data in parallel
  const [projectsData, stats, config] = await Promise.all([
    getPipelineProjects(tenantSlug, {}, 1, 500),
    getPipelineStats(tenantSlug),
    getPipelineConfig(tenantSlug),
  ])

  return (
    <PipelinePage
      initialProjects={projectsData.projects}
      initialStats={stats}
      initialConfig={config}
    />
  )
}

function PipelineSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 animate-pulse rounded bg-slate-800" />
        <div className="flex gap-2">
          <div className="h-9 w-32 animate-pulse rounded bg-slate-800" />
          <div className="h-9 w-9 animate-pulse rounded bg-slate-800" />
          <div className="h-9 w-28 animate-pulse rounded bg-slate-800" />
        </div>
      </div>

      {/* Stats bar skeleton */}
      <div className="h-12 animate-pulse rounded-lg border border-slate-700/30 bg-slate-900/50" />

      {/* Filter panel skeleton */}
      <div className="h-12 animate-pulse rounded-lg border border-slate-700/30 bg-slate-900/50" />

      {/* Kanban skeleton */}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="w-72 shrink-0 rounded-lg border border-slate-700/30 bg-slate-900/30"
          >
            <div className="border-b border-slate-700/30 px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                <div className="h-5 w-6 animate-pulse rounded-full bg-slate-800" />
              </div>
            </div>
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="rounded border border-slate-700/30 bg-slate-800/30 p-3"
                >
                  <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-slate-700" />
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-5 w-5 animate-pulse rounded-full bg-slate-700" />
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-700" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-3 w-16 animate-pulse rounded bg-slate-700" />
                    <div className="h-3 w-12 animate-pulse rounded bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
