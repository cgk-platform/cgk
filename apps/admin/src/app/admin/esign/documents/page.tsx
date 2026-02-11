/**
 * E-Signature Documents List Page
 *
 * Lists all documents with filtering and pagination.
 */

import { headers } from 'next/headers'
import { Suspense } from 'react'
import { DocumentList } from '@/components/esign'
import { getDocuments, getActiveTemplates } from '@/lib/esign'
import type { EsignDocumentFilters } from '@/lib/esign/types'

interface PageProps {
  searchParams: Promise<{
    status?: string
    templateId?: string
    creatorId?: string
    search?: string
    page?: string
    limit?: string
  }>
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Documents
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          View and manage all e-signature documents
        </p>
      </div>

      <Suspense fallback={<DocumentListSkeleton />}>
        <DocumentListLoader params={params} />
      </Suspense>
    </div>
  )
}

async function getTenantSlug(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-slug')
}

async function DocumentListLoader({
  params,
}: {
  params: {
    status?: string
    templateId?: string
    creatorId?: string
    search?: string
    page?: string
    limit?: string
  }
}) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return (
      <DocumentList
        documents={[]}
        templates={[]}
        total={0}
        page={1}
        limit={20}
      />
    )
  }

  const filters: EsignDocumentFilters = {}
  if (params.status) {
    filters.status = params.status as EsignDocumentFilters['status']
  }
  if (params.templateId) {
    filters.templateId = params.templateId
  }
  if (params.creatorId) {
    filters.creatorId = params.creatorId
  }
  if (params.search) {
    filters.search = params.search
  }

  const page = parseInt(params.page || '1', 10)
  const limit = parseInt(params.limit || '20', 10)

  const [{ documents, total }, templates] = await Promise.all([
    getDocuments(tenantSlug, filters, page, limit),
    getActiveTemplates(tenantSlug),
  ])

  return (
    <DocumentList
      documents={documents}
      templates={templates}
      total={total}
      page={page}
      limit={limit}
    />
  )
}

function DocumentListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="h-96 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}
