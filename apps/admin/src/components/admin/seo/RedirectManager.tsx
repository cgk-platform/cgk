'use client'

import { Button, Card, CardContent, CardHeader, Input, Label, Textarea } from '@cgk/ui'
import {
  ArrowRight,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  X,
} from 'lucide-react'
import { useState, useRef } from 'react'

import type { SEORedirect, CreateRedirectInput, UpdateRedirectInput } from '@/lib/seo/types'

interface RedirectManagerProps {
  redirects: SEORedirect[]
  totalCount: number
  page: number
  onPageChange: (page: number) => void
  onCreate: (input: CreateRedirectInput) => Promise<void>
  onUpdate: (input: UpdateRedirectInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onImportCSV: (file: File) => Promise<{ imported: number; errors: Array<{ row: number; error: string }> }>
  onExportCSV: () => void
}

export function RedirectManager({
  redirects,
  totalCount,
  page,
  onPageChange,
  onCreate,
  onUpdate,
  onDelete,
  onImportCSV,
  onExportCSV,
}: RedirectManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRedirect, setEditingRedirect] = useState<SEORedirect | null>(null)
  const [formData, setFormData] = useState<Partial<CreateRedirectInput>>({
    source: '',
    destination: '',
    status_code: 301,
    note: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importResults, setImportResults] = useState<{
    imported: number
    errors: Array<{ row: number; error: string }>
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const openCreateModal = () => {
    setEditingRedirect(null)
    setFormData({ source: '', destination: '', status_code: 301, note: '' })
    setError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (redirect: SEORedirect) => {
    setEditingRedirect(redirect)
    setFormData({
      source: redirect.source,
      destination: redirect.destination,
      status_code: redirect.status_code,
      note: redirect.note || '',
    })
    setError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.source?.trim() || !formData.destination?.trim()) {
      setError('Source and destination are required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (editingRedirect) {
        await onUpdate({
          id: editingRedirect.id,
          ...formData,
        })
      } else {
        await onCreate(formData as CreateRedirectInput)
      }
      setIsModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save redirect')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const results = await onImportCSV(file)
      setImportResults(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const totalPages = Math.ceil(totalCount / 20)

  return (
    <div className="space-y-4">
      {/* Import Results Alert */}
      {importResults && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-blue-800">
                Import Complete: {importResults.imported} redirects imported
              </p>
              {importResults.errors.length > 0 && (
                <div className="mt-2 text-sm text-blue-700">
                  <p>{importResults.errors.length} errors:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {importResults.errors.slice(0, 5).map((err) => (
                      <li key={err.row}>Row {err.row}: {err.error}</li>
                    ))}
                    {importResults.errors.length > 5 && (
                      <li>...and {importResults.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <button onClick={() => setImportResults(null)}>
              <X className="h-4 w-4 text-blue-600" />
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Redirect
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button variant="outline" onClick={onExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Redirects Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Source</th>
                  <th className="p-4 font-medium">Destination</th>
                  <th className="p-4 font-medium text-center">Status</th>
                  <th className="p-4 font-medium text-right">Hits</th>
                  <th className="p-4 font-medium">Note</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {redirects.map((redirect) => (
                  <tr key={redirect.id} className="group hover:bg-muted/50">
                    <td className="p-4 font-mono text-sm">{redirect.source}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{redirect.destination}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                        {redirect.status_code}
                      </span>
                    </td>
                    <td className="p-4 text-right tabular-nums">
                      {redirect.hits.toLocaleString()}
                    </td>
                    <td className="max-w-[200px] truncate p-4 text-sm text-muted-foreground">
                      {redirect.note || '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(redirect)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(redirect.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {redirects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No redirects configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingRedirect ? 'Edit Redirect' : 'Add Redirect'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="source">Source Path</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="/old-page"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="/new-page or https://example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status Code</Label>
                <select
                  id="status"
                  value={formData.status_code}
                  onChange={(e) => setFormData({ ...formData, status_code: parseInt(e.target.value) })}
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  <option value={301}>301 - Permanent Redirect</option>
                  <option value={302}>302 - Temporary Redirect</option>
                  <option value={307}>307 - Temporary Redirect (Preserve Method)</option>
                  <option value={308}>308 - Permanent Redirect (Preserve Method)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Reason for redirect..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingRedirect ? 'Update' : 'Create'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
