import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { BrandContextEditor } from '@/components/content/brand-context-editor'
import { getDocumentById, getDocumentVersions } from '@/lib/brand-context/db'

export default async function EditBrandContextPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditorLoader documentId={id} />
    </Suspense>
  )
}

async function EditorLoader({ documentId }: { documentId: string }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const [document, versions] = await withTenant(tenantSlug, async () => {
    const doc = await getDocumentById(documentId)
    const vers = doc ? await getDocumentVersions(documentId) : []
    return [doc, vers]
  })

  if (!document) {
    notFound()
  }

  return <BrandContextEditor document={document} versions={versions} />
}

function EditorSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </div>
  )
}
