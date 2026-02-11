import { Card, CardContent } from '@cgk/ui'
import { ArrowLeft } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { Pipeline } from '@/components/admin/creators/pipeline'
import { getCreatorsByStage } from '@/lib/creators/db'

export default async function CreatorPipelinePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/creators"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Directory
          </Link>
          <h1 className="text-2xl font-bold">Creator Pipeline</h1>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Drag and drop creators between stages to update their status. Changes are saved automatically.
      </p>

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
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const stages = await getCreatorsByStage(tenantSlug)

  return <Pipeline stages={stages} />
}

function PipelineSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="w-72 shrink-0">
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-5 w-20 animate-pulse rounded bg-muted" />
              <div className="h-5 w-8 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
