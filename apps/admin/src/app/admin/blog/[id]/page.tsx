import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PostEditor } from '@/components/content/post-editor'
import { getPostById, getCategories, getAuthors } from '@/lib/blog/db'

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Blog Post</h1>
      <Suspense fallback={<EditorSkeleton />}>
        <EditorLoader postId={id} />
      </Suspense>
    </div>
  )
}

async function EditorLoader({ postId }: { postId: string }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const [post, categories, authors] = await withTenant(tenantSlug, async () => {
    const p = await getPostById(postId)
    const cats = await getCategories()
    const auths = await getAuthors()
    return [p, cats, auths]
  })

  if (!post) {
    notFound()
  }

  return (
    <PostEditor
      post={post}
      categories={categories}
      authors={authors}
      mode="edit"
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
