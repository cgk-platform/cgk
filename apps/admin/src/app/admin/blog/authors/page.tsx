import { withTenant } from '@cgk-platform/db'
import { Button, Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { Users, Pencil, Trash2 } from 'lucide-react'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { EmptyState } from '@/components/commerce/empty-state'
import { AuthorForm } from '@/components/content/author-form'
import { getAuthors } from '@/lib/blog/db'
import type { BlogAuthor } from '@/lib/blog/types'

export default async function AuthorsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog Authors</h1>
      </div>

      <Suspense fallback={<AuthorsSkeleton />}>
        <AuthorsLoader />
      </Suspense>
    </div>
  )
}

async function AuthorsLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const authors = await withTenant(tenantSlug, () => getAuthors())

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Authors</h2>
        </CardHeader>
        <CardContent>
          {authors.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No authors yet"
              description="Add authors to attribute blog posts to team members or contributors."
            />
          ) : (
            <AuthorList authors={authors} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Add Author</h2>
        </CardHeader>
        <CardContent>
          <AuthorForm />
        </CardContent>
      </Card>
    </div>
  )
}

function AuthorList({ authors }: { authors: BlogAuthor[] }) {
  return (
    <div className="space-y-2">
      {authors.map((author) => (
        <AuthorItem key={author.id} author={author} />
      ))}
    </div>
  )
}

function AuthorItem({ author }: { author: BlogAuthor }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="flex items-center gap-3">
        {author.avatar_url ? (
          <img
            src={author.avatar_url}
            alt={author.name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-medium">
            {author.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium">{author.name}</p>
          <p className="text-sm text-muted-foreground">
            {author.post_count} {author.post_count === 1 ? 'post' : 'posts'}
            {author.email && ` - ${author.email}`}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function AuthorsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-10 animate-pulse rounded-md bg-muted" />
            <div className="h-10 animate-pulse rounded-md bg-muted" />
            <div className="h-20 animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
