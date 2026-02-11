import { Card, CardContent, CardHeader } from '@cgk/ui'
import { ArrowLeft, Check, X } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { getCategoriesByType } from '@/lib/expenses/db/categories'
import type { ExpenseCategoryType } from '@/lib/expenses/types'

const typeLabels: Record<ExpenseCategoryType, string> = {
  cogs: 'Cost of Goods Sold',
  variable: 'Variable Costs',
  marketing: 'Marketing',
  operating: 'Operating Expenses',
  other: 'Other',
}

const typeDescriptions: Record<ExpenseCategoryType, string> = {
  cogs: 'Direct costs of producing goods sold (product costs)',
  variable: 'Costs that vary with sales volume (payment processing, fulfillment)',
  marketing: 'Marketing and advertising expenses (ad spend, creator payouts)',
  operating: 'Regular operating expenses (SaaS, rent, contractors)',
  other: 'Miscellaneous expenses',
}

const typeColors: Record<ExpenseCategoryType, string> = {
  cogs: 'border-l-red-500',
  variable: 'border-l-orange-500',
  marketing: 'border-l-purple-500',
  operating: 'border-l-blue-500',
  other: 'border-l-gray-500',
}

export default async function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/expenses" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Expense Categories</h1>
      </div>

      <p className="text-muted-foreground max-w-2xl">
        Categories organize your expenses for P&L reporting. System categories are created
        automatically and cannot be deleted. You can create custom categories within each type.
      </p>

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

  const categoriesByType = await getCategoriesByType(tenantSlug, false)

  return (
    <div className="space-y-6">
      {(Object.keys(typeLabels) as ExpenseCategoryType[]).map((type) => {
        const categories = categoriesByType[type] || []
        return (
          <Card key={type} className={`border-l-4 ${typeColors[type]}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{typeLabels[type]}</h3>
                  <p className="text-sm text-muted-foreground">{typeDescriptions[type]}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No categories in this type yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">ID</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                          System
                        </th>
                        <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                          Active
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                          Order
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {categories.map((cat) => (
                        <tr key={cat.category_id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <code className="px-1 py-0.5 bg-muted rounded text-xs">
                              {cat.category_id}
                            </code>
                          </td>
                          <td className="px-4 py-3 font-medium">{cat.name}</td>
                          <td className="px-4 py-3 text-center">
                            {cat.is_system ? (
                              <Check className="h-4 w-4 text-green-600 inline" />
                            ) : (
                              <X className="h-4 w-4 text-gray-400 inline" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {cat.is_active ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {cat.display_order}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Create Custom Category</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            To create a custom category, use the API endpoint:
          </p>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
            {`POST /api/admin/expenses/categories
{
  "category_id": "op_custom_name",
  "name": "Custom Category Name",
  "expense_type": "operating",
  "display_order": 50
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function CategoriesSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex gap-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
