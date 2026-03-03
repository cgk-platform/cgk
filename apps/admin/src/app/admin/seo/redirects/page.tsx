'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

import { SEONav } from '@/components/admin/seo/SEONav'
import { RedirectManager } from '@/components/admin/seo/RedirectManager'
import type { SEORedirect, CreateRedirectInput, UpdateRedirectInput } from '@/lib/seo/types'

export default function RedirectsPage() {
  const searchParams = useSearchParams()

  const [redirects, setRedirects] = useState<SEORedirect[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10))

  const fetchRedirects = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      const res = await fetch(`/api/admin/seo/redirects?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setRedirects(data.redirects)
      setTotalCount(data.pagination.totalCount)
    } catch (err) {
      console.error('Failed to fetch redirects:', err)
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchRedirects()
  }, [fetchRedirects])

  const handleCreate = async (input: CreateRedirectInput) => {
    const res = await fetch('/api/admin/seo/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await res.json()

    if (!res.ok) throw new Error(data.error)

    fetchRedirects()
  }

  const handleUpdate = async (input: UpdateRedirectInput) => {
    const res = await fetch('/api/admin/seo/redirects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await res.json()

    if (!res.ok) throw new Error(data.error)

    fetchRedirects()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this redirect?')) return

    const res = await fetch(`/api/admin/seo/redirects?id=${id}`, { method: 'DELETE' })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }

    fetchRedirects()
  }

  const handleImportCSV = async (file: File) => {
    const text = await file.text()

    const res = await fetch('/api/admin/seo/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: text,
    })
    const data = await res.json()

    if (!res.ok) throw new Error(data.error)

    fetchRedirects()
    return { imported: data.imported, errors: data.errors || [] }
  }

  const handleExportCSV = () => {
    window.location.href = '/api/admin/seo/redirects?export=csv'
  }

  if (isLoading && redirects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">URL Redirects</h1>
          <p className="text-muted-foreground">
            Manage 301/302 redirects with loop detection
          </p>
        </div>
        <SEONav />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">URL Redirects</h1>
        <p className="text-muted-foreground">
          Manage 301/302 redirects with loop detection
        </p>
      </div>

      <SEONav />

      <RedirectManager
        redirects={redirects}
        totalCount={totalCount}
        page={page}
        onPageChange={setPage}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onImportCSV={handleImportCSV}
        onExportCSV={handleExportCSV}
      />
    </div>
  )
}
