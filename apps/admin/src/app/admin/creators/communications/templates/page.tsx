import { Button, Card, CardContent } from '@cgk/ui'
import { FileText, Plus } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { getTemplates } from '@/lib/creator-communications/db'
import { TEMPLATE_CATEGORIES, type TemplateCategory } from '@/lib/creator-communications/types'

import { TemplateGrid } from './template-grid'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TemplatesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const category = (params.category as TemplateCategory) || undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email Templates</h1>
          <p className="text-sm text-muted-foreground">
            Customize email content for creator communications
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/creators/communications/templates/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New Template
          </Link>
        </Button>
      </div>

      <CategoryFilters activeCategory={category} />

      <Suspense fallback={<TemplatesSkeleton />}>
        <TemplatesLoader category={category} />
      </Suspense>
    </div>
  )
}

function CategoryFilters({ activeCategory }: { activeCategory?: TemplateCategory }) {
  const basePath = '/admin/creators/communications/templates'

  return (
    <div className="flex items-center gap-2">
      <Link
        href={basePath}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          !activeCategory
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        All
      </Link>
      {TEMPLATE_CATEGORIES.map((cat) => (
        <Link
          key={cat.value}
          href={`${basePath}?category=${cat.value}`}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeCategory === cat.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {cat.label}
        </Link>
      ))}
    </div>
  )
}

async function TemplatesLoader({ category }: { category?: TemplateCategory }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const templates = await getTemplates(tenantSlug, category)

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No templates</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {category
              ? `No ${category} templates found.`
              : 'Create your first email template.'}
          </p>
          <Button className="mt-4" asChild>
            <Link href="/admin/creators/communications/templates/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Template
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <TemplateGrid templates={templates} />
}

function TemplatesSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
