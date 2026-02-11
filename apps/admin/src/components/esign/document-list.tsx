/**
 * E-Signature Document List
 *
 * Full document listing with filters and pagination.
 */

'use client'

import { Button, Card, CardContent, Input, Select } from '@cgk/ui'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  Search,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { DocumentStatusBadge } from './document-status-badge'
import type {
  EsignDocumentStatus,
  EsignDocumentWithSigners,
} from '@/lib/esign/types'

interface DocumentListProps {
  documents: EsignDocumentWithSigners[]
  templates: Array<{ id: string; name: string }>
  total: number
  page: number
  limit: number
}

const statusOptions: Array<{ value: EsignDocumentStatus | ''; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
  { value: 'voided', label: 'Voided' },
  { value: 'expired', label: 'Expired' },
]

export function DocumentList({
  documents,
  templates,
  total,
  page,
  limit,
}: DocumentListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const totalPages = Math.ceil(total / limit)

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      startTransition(() => {
        router.push(`?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({ search, page: '1' })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>

            <Select
              value={searchParams.get('status') || ''}
              onChange={(e) => updateParams({ status: e.target.value, page: '1' })}
              className="w-40"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            <Select
              value={searchParams.get('templateId') || ''}
              onChange={(e) => updateParams({ templateId: e.target.value, page: '1' })}
              className="w-48"
            >
              <option value="">All Templates</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>

            {(searchParams.has('status') ||
              searchParams.has('templateId') ||
              searchParams.has('search')) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateParams({ status: null, templateId: null, search: null })
                }
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                  Document
                </th>
                <th className="px-5 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                  Signers
                </th>
                <th className="px-5 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                  Sent
                </th>
                <th className="px-5 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                  Expires
                </th>
                <th className="px-5 py-3 text-right text-sm font-medium text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No documents found
                    </p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/esign/documents/${doc.id}`}
                        className="group"
                      >
                        <p className="font-medium text-slate-900 group-hover:text-primary dark:text-slate-100">
                          {doc.name}
                        </p>
                        {doc.templateName && (
                          <p className="text-xs text-slate-500">
                            {doc.templateName}
                          </p>
                        )}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {doc.signers.length === 1
                            ? doc.signers[0]?.name
                            : `${doc.signers.length} signers`}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <DocumentStatusBadge status={doc.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {doc.expiresAt ? formatDate(doc.expiresAt) : '-'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/esign/documents/${doc.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        {doc.status === 'pending' && (
                          <Button variant="ghost" size="sm" className="gap-1">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Resend
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {(page - 1) * limit + 1} to{' '}
              {Math.min(page * limit, total)} of {total} documents
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: String(page - 1) })}
                disabled={page <= 1 || isPending}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: String(page + 1) })}
                disabled={page >= totalPages || isPending}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
