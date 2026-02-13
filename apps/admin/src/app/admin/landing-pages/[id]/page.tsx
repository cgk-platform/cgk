import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PageEditor } from '@/components/admin/landing-pages/page-editor'
import { getPageById } from '@/lib/landing-pages/db'

export default async function EditLandingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditorLoader pageId={id} />
    </Suspense>
  )
}

async function EditorLoader({ pageId }: { pageId: string }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const page = await withTenant(tenantSlug, () => getPageById(pageId))

  if (!page) {
    notFound()
  }

  return <PageEditor page={page} />
}

function EditorSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      <div className="w-64 shrink-0 space-y-4 border-r p-4">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-4 p-4">
        <div className="h-12 animate-pulse rounded-md bg-muted" />
        <div className="h-64 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="w-72 shrink-0 space-y-4 border-l p-4">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
