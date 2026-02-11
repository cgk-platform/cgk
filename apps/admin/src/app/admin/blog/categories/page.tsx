import { withTenant } from '@cgk/db'
import { Button, Card, CardContent, CardHeader } from '@cgk/ui'
import { FolderTree, Pencil, Trash2 } from 'lucide-react'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { EmptyState } from '@/components/commerce/empty-state'
import { CategoryForm } from '@/components/content/category-form'
import { getCategories } from '@/lib/blog/db'
import type { BlogCategory } from '@/lib/blog/types'

export default async function CategoriesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog Categories</h1>
      </div>

      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesLoader />
      </Suspense>
    </div>
  )
}

async function CategoriesLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const categories = await withTenant(tenantSlug, () => getCategories())

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Categories</h2>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title="No categories yet"
              description="Create categories to organize your blog posts."
            />
          ) : (
            <CategoryList categories={categories} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Add Category</h2>
        </CardHeader>
        <CardContent>
          <CategoryForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  )
}

function CategoryList({ categories }: { categories: BlogCategory[] }) {
  return (
    <div className="space-y-2">
      {categories.map((category) => (
        <CategoryItem key={category.id} category={category} />
      ))}
    </div>
  )
}

function CategoryItem({ category }: { category: BlogCategory }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="font-medium">{category.name}</p>
        <p className="text-sm text-muted-foreground">
          /{category.slug} - {category.post_count} {category.post_count === 1 ? 'post' : 'posts'}
        </p>
        {category.description && (
          <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
        )}
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

function CategoriesSkeleton() {
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
