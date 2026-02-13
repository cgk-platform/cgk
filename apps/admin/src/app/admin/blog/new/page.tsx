import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { PostEditor } from '@/components/content/post-editor'
import { getCategories, getAuthors } from '@/lib/blog/db'

export default async function NewPostPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New Blog Post</h1>
      <Suspense fallback={<EditorSkeleton />}>
        <EditorLoader />
      </Suspense>
    </div>
  )
}

async function EditorLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const [categories, authors] = await withTenant(tenantSlug, async () => {
    const cats = await getCategories()
    const auths = await getAuthors()
    return [cats, auths]
  })

  return (
    <PostEditor
      categories={categories}
      authors={authors}
      mode="create"
    />
  )
}

function EditorSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
    </div>
  )
}
