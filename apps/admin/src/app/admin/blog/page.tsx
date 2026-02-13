import { withTenant } from '@cgk-platform/db'
import { Button, Card, CardContent } from '@cgk-platform/ui'
import { FileText, Plus } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { EmptyState } from '@/components/commerce/empty-state'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { PostStatusBadge } from '@/components/content/status-badge'
import { getPosts, getCategories, getAuthors } from '@/lib/blog/db'
import type { BlogPostRow } from '@/lib/blog/types'
import { formatDateTime } from '@/lib/format'
import { parseBlogFilters, buildFilterUrl } from '@/lib/search-params'

const POST_STATUSES = ['draft', 'published', 'scheduled', 'archived']

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseBlogFilters(params)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        <Button asChild>
          <Link href="/admin/blog/new">
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Link>
        </Button>
      </div>

      <Suspense fallback={<FilterBarSkeleton />}>
        <PostFilterBar filters={filters} />
      </Suspense>

      <Suspense fallback={<PostsTableSkeleton />}>
        <PostsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function PostFilterBar({ filters }: { filters: ReturnType<typeof parseBlogFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const [categories, authors] = await withTenant(tenantSlug, async () => {
    const cats = await getCategories()
    const auths = await getAuthors()
    return [cats, auths]
  })

  const base = '/admin/blog'
  const filterParams: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    category: filters.category || undefined,
    author: filters.author || undefined,
    sort: filters.sort !== 'created_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search posts..." />
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Status:</span>
        <div className="flex gap-1">
          <Link
            href={buildFilterUrl(base, { ...filterParams, status: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${!filters.status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            All
          </Link>
          {POST_STATUSES.map((status) => (
            <Link
              key={status}
              href={buildFilterUrl(base, { ...filterParams, status, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs capitalize ${filters.status === status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {status}
            </Link>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <select
          className="rounded-md border bg-background px-2 py-1 text-sm"
          defaultValue={filters.category}
          onChange={(e) => {
            const url = buildFilterUrl(base, { ...filterParams, category: e.target.value || undefined, page: undefined })
            window.location.href = url
          }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      )}

      {authors.length > 0 && (
        <select
          className="rounded-md border bg-background px-2 py-1 text-sm"
          defaultValue={filters.author}
          onChange={(e) => {
            const url = buildFilterUrl(base, { ...filterParams, author: e.target.value || undefined, page: undefined })
            window.location.href = url
          }}
        >
          <option value="">All Authors</option>
          {authors.map((auth) => (
            <option key={auth.id} value={auth.id}>{auth.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}

async function PostsLoader({ filters }: { filters: ReturnType<typeof parseBlogFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await withTenant(tenantSlug, () => getPosts(filters))

  if (rows.length === 0 && !filters.search && !filters.status) {
    return (
      <EmptyState
        icon={FileText}
        title="No blog posts yet"
        description="Create your first blog post to get started with content marketing."
        action={{ label: 'Create Post', href: '/admin/blog/new' }}
      />
    )
  }

  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/blog'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    category: filters.category || undefined,
    author: filters.author || undefined,
    sort: filters.sort !== 'created_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  const columns: Column<BlogPostRow>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => (
        <Link href={`/admin/blog/${row.id}`} className="font-medium text-primary hover:underline">
          {row.title}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <PostStatusBadge status={row.status} />,
    },
    {
      key: 'author_name',
      header: 'Author',
      render: (row) => row.author_name || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'category_name',
      header: 'Category',
      render: (row) => row.category_name || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'published_at',
      header: 'Published',
      sortable: true,
      render: (row) => row.published_at ? formatDateTime(row.published_at) : '—',
    },
    {
      key: 'updated_at',
      header: 'Updated',
      sortable: true,
      render: (row) => formatDateTime(row.updated_at),
    },
  ]

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={rows}
        keyFn={(r) => r.id}
        basePath={basePath}
        currentFilters={currentFilters}
        currentSort={filters.sort}
        currentDir={filters.dir}
      />
      <Pagination
        page={filters.page}
        totalPages={totalPages}
        totalCount={totalCount}
        limit={filters.limit}
        basePath={basePath}
        currentFilters={currentFilters}
      />
    </div>
  )
}

function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
      <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
    </div>
  )
}

function PostsTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
