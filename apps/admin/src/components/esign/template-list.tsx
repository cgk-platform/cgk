/**
 * Template List Component
 *
 * Displays e-signature templates with status badges and actions.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Badge,
  Button,
  Card,
  CardContent,
  cn,
  Input,
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cgk/ui'
import {
  Archive,
  Check,
  Copy,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import type { EsignTemplateStatus } from '@/lib/esign/types'

export interface TemplateListItem {
  id: string
  name: string
  description: string | null
  status: EsignTemplateStatus
  pageCount: number | null
  fieldCount: number
  documentCount: number
  thumbnailUrl: string | null
  createdAt: Date
  updatedAt: Date
}

interface TemplateListProps {
  templates: TemplateListItem[]
  onDuplicate?: (id: string) => void
  onArchive?: (id: string) => void
  onActivate?: (id: string) => void
  onDelete?: (id: string) => void
}

const statusConfig: Record<EsignTemplateStatus, { label: string; variant: 'default' | 'outline' | 'secondary'; className: string }> = {
  draft: {
    label: 'Draft',
    variant: 'outline',
    className: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  },
  active: {
    label: 'Active',
    variant: 'default',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  },
  archived: {
    label: 'Archived',
    variant: 'secondary',
    className: 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
}

export function TemplateList({
  templates,
  onDuplicate,
  onArchive,
  onActivate,
  onDelete,
}: TemplateListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EsignTemplateStatus | 'all'>('all')
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = !search ||
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.description?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || template.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleMenuToggle = (id: string) => {
    setExpandedMenu(expandedMenu === id ? null : id)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-3">
          <RadixSelect value={statusFilter} onValueChange={(v) => setStatusFilter(v as EsignTemplateStatus | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </RadixSelect>
          <Link href="/admin/esign/templates/new">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </Link>
        </div>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
              No templates found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first template'}
            </p>
            {!search && statusFilter === 'all' && (
              <Link href="/admin/esign/templates/new" className="mt-4">
                <Button className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const status = statusConfig[template.status]

            return (
              <Card
                key={template.id}
                className={cn(
                  'group relative overflow-hidden transition-all duration-200',
                  'hover:shadow-md hover:-translate-y-0.5',
                  'border-l-4',
                  template.status === 'active'
                    ? 'border-l-emerald-500'
                    : template.status === 'draft'
                      ? 'border-l-amber-500'
                      : 'border-l-slate-400'
                )}
              >
                <CardContent className="p-0">
                  {/* Thumbnail */}
                  <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                    {template.thumbnailUrl ? (
                      <img
                        src={template.thumbnailUrl}
                        alt={template.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FileText className="h-16 w-16 text-slate-300 dark:text-slate-600" />
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge className={cn('text-xs', status.className)}>
                        {status.label}
                      </Badge>
                    </div>
                    {/* Actions Menu */}
                    <div className="absolute top-2 right-2">
                      <div className="relative">
                        <button
                          onClick={() => handleMenuToggle(template.id)}
                          className={cn(
                            'rounded-md p-1.5',
                            'bg-white/90 dark:bg-slate-900/90',
                            'hover:bg-white dark:hover:bg-slate-900',
                            'shadow-sm transition-colors'
                          )}
                        >
                          <MoreHorizontal className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </button>
                        {expandedMenu === template.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setExpandedMenu(null)}
                            />
                            <div
                              className={cn(
                                'absolute right-0 top-full z-20 mt-1 w-40',
                                'rounded-lg border bg-white shadow-lg',
                                'dark:border-slate-700 dark:bg-slate-800',
                                'py-1'
                              )}
                            >
                              <Link
                                href={`/admin/esign/templates/${template.id}/editor`}
                                className={cn(
                                  'flex w-full items-center gap-2 px-3 py-2 text-sm',
                                  'hover:bg-slate-50 dark:hover:bg-slate-700',
                                  'text-slate-700 dark:text-slate-300'
                                )}
                              >
                                <Edit className="h-4 w-4" />
                                Edit Fields
                              </Link>
                              <Link
                                href={`/admin/esign/templates/${template.id}`}
                                className={cn(
                                  'flex w-full items-center gap-2 px-3 py-2 text-sm',
                                  'hover:bg-slate-50 dark:hover:bg-slate-700',
                                  'text-slate-700 dark:text-slate-300'
                                )}
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Link>
                              {onDuplicate && (
                                <button
                                  onClick={() => {
                                    onDuplicate(template.id)
                                    setExpandedMenu(null)
                                  }}
                                  className={cn(
                                    'flex w-full items-center gap-2 px-3 py-2 text-sm',
                                    'hover:bg-slate-50 dark:hover:bg-slate-700',
                                    'text-slate-700 dark:text-slate-300'
                                  )}
                                >
                                  <Copy className="h-4 w-4" />
                                  Duplicate
                                </button>
                              )}
                              {template.status === 'draft' && onActivate && (
                                <button
                                  onClick={() => {
                                    onActivate(template.id)
                                    setExpandedMenu(null)
                                  }}
                                  className={cn(
                                    'flex w-full items-center gap-2 px-3 py-2 text-sm',
                                    'hover:bg-slate-50 dark:hover:bg-slate-700',
                                    'text-emerald-600 dark:text-emerald-400'
                                  )}
                                >
                                  <Check className="h-4 w-4" />
                                  Activate
                                </button>
                              )}
                              {template.status === 'active' && onArchive && (
                                <button
                                  onClick={() => {
                                    onArchive(template.id)
                                    setExpandedMenu(null)
                                  }}
                                  className={cn(
                                    'flex w-full items-center gap-2 px-3 py-2 text-sm',
                                    'hover:bg-slate-50 dark:hover:bg-slate-700',
                                    'text-slate-700 dark:text-slate-300'
                                  )}
                                >
                                  <Archive className="h-4 w-4" />
                                  Archive
                                </button>
                              )}
                              {onDelete && template.documentCount === 0 && (
                                <button
                                  onClick={() => {
                                    onDelete(template.id)
                                    setExpandedMenu(null)
                                  }}
                                  className={cn(
                                    'flex w-full items-center gap-2 px-3 py-2 text-sm',
                                    'hover:bg-red-50 dark:hover:bg-red-900/20',
                                    'text-red-600 dark:text-red-400'
                                  )}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {template.name}
                    </h3>
                    {template.description && (
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span>{template.pageCount || 0} pages</span>
                      <span>{template.fieldCount} fields</span>
                      <span>{template.documentCount} docs</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TemplateListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-72 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-32 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 w-32 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-[4/3] animate-pulse bg-slate-200 dark:bg-slate-700" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="flex gap-4">
                  <div className="h-3 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
