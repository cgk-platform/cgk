import { Card, CardContent } from '@cgk-platform/ui'
import { BookOpen, CheckCircle2, Clock, Eye, FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

import { getArticles, getCategories, rowToArticleWithCategory } from '@/lib/knowledge-base/db'
import type { KBArticleWithCategory } from '@/lib/knowledge-base/types'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function KnowledgeBasePage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt((params.page as string) || '1', 10)
  const search = (params.search as string) || ''
  const categoryId = (params.category as string) || ''
  const isPublished =
    params.status === 'published' ? true : params.status === 'draft' ? false : undefined
  const limit = 25

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">
            Manage help articles and customer support content
          </p>
        </div>
        <Link
          href="/admin/knowledge-base/articles/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Article
        </Link>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      <div className="flex items-center gap-3">
        <FiltersBar isPublished={isPublished} />
        <Suspense fallback={null}>
          <CategoryFilter categoryId={categoryId} />
        </Suspense>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <ArticlesLoader
          page={page}
          limit={limit}
          search={search}
          categoryId={categoryId}
          isPublished={isPublished}
        />
      </Suspense>
    </div>
  )
}

async function StatsCards() {
  let totalArticles = 0
  let publishedCount = 0
  let draftCount = 0
  let categoryCount = 0

  try {
    const [allArticles, categories] = await Promise.all([
      getArticles({ page: 1, limit: 1, offset: 0, search: '', categoryId: '', sort: 'created_at', dir: 'desc' }),
      getCategories(),
    ])
    totalArticles = allArticles.totalCount
    categoryCount = categories.length

    const published = await getArticles({
      page: 1, limit: 1, offset: 0, search: '', categoryId: '', sort: 'created_at', dir: 'desc', isPublished: true,
    })
    publishedCount = published.totalCount
    draftCount = totalArticles - publishedCount
  } catch {
    // DB may not exist yet
  }

  const cards = [
    { title: 'Total Articles', value: totalArticles, icon: BookOpen, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Published', value: publishedCount, icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { title: 'Drafts', value: draftCount, icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { title: 'Categories', value: categoryCount, icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-semibold">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function FiltersBar({ isPublished }: { isPublished: boolean | undefined }) {
  const basePath = '/admin/knowledge-base'
  const statuses = [
    { value: undefined, label: 'All', href: basePath },
    { value: true, label: 'Published', href: `${basePath}?status=published` },
    { value: false, label: 'Drafts', href: `${basePath}?status=draft` },
  ]

  return (
    <div className="flex w-fit items-center rounded-lg border bg-card p-1">
      {statuses.map((s) => {
        const isActive = isPublished === s.value
        return (
          <Link
            key={s.label}
            href={s.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {s.label}
          </Link>
        )
      })}
    </div>
  )
}

async function CategoryFilter({ categoryId }: { categoryId: string }) {
  let categories: Awaited<ReturnType<typeof getCategories>> = []
  try {
    categories = await getCategories()
  } catch {
    return null
  }

  if (categories.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Category:</span>
      <div className="flex items-center rounded-lg border bg-card p-1">
        <Link
          href="/admin/knowledge-base"
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            !categoryId
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/admin/knowledge-base?category=${cat.id}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              categoryId === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

async function ArticlesLoader({
  page,
  limit,
  search,
  categoryId,
  isPublished,
}: {
  page: number
  limit: number
  search: string
  categoryId: string
  isPublished: boolean | undefined
}) {
  let articles: KBArticleWithCategory[] = []
  let total = 0

  try {
    const offset = (page - 1) * limit
    const result = await getArticles({
      page,
      limit,
      offset,
      search,
      categoryId,
      isPublished,
      sort: 'updated_at',
      dir: 'desc',
    })
    articles = result.rows.map(rowToArticleWithCategory)
    total = result.totalCount
  } catch {
    // DB may not exist yet
  }

  if (articles.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No articles yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first knowledge base article to get started.
          </p>
          <Link
            href="/admin/knowledge-base/articles/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Article
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-[1fr,140px,120px,120px,160px] items-center gap-4 border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <div>Title</div>
        <div>Category</div>
        <div>Status</div>
        <div>Views</div>
        <div>Last Updated</div>
      </div>
      <div className="divide-y">
        {articles.map((article) => (
          <div
            key={article.id}
            className="grid grid-cols-[1fr,140px,120px,120px,160px] items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30"
          >
            <div className="min-w-0">
              <Link
                href={`/admin/knowledge-base/articles/${article.id}`}
                className="truncate text-sm font-medium hover:underline"
              >
                {article.title}
              </Link>
              {article.excerpt && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{article.excerpt}</p>
              )}
              {article.tags.length > 0 && (
                <div className="mt-1 flex gap-1">
                  {article.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{article.category?.name || '—'}</div>
            <div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  article.isPublished
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {article.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              {article.viewCount}
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(article.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        ))}
      </div>
      {total > limit && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} articles
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/knowledge-base?page=${page - 1}`}
                className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Previous
              </Link>
            )}
            {page * limit < total && (
              <Link
                href={`/admin/knowledge-base?page=${page + 1}`}
                className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-6 w-12 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
