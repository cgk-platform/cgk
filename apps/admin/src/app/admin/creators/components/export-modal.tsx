'use client'

import { Button, Label } from '@cgk/ui'
import { X, Loader2, Download } from 'lucide-react'
import { useState, useCallback } from 'react'

import { ALL_EXPORT_FIELDS, DEFAULT_EXPORT_FIELDS, type ExportField } from '@/lib/creators/types'

interface ExportModalProps {
  onClose: () => void
  selectedIds?: string[]
}

export function ExportModal({ onClose, selectedIds }: ExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv')
  const [selectedFields, setSelectedFields] = useState<Set<ExportField>>(
    new Set(DEFAULT_EXPORT_FIELDS),
  )
  const [includeArchived, setIncludeArchived] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleField = useCallback((field: ExportField) => {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) {
        next.delete(field)
      } else {
        next.add(field)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedFields(new Set(ALL_EXPORT_FIELDS.map((f) => f.field)))
  }, [])

  const selectDefault = useCallback(() => {
    setSelectedFields(new Set(DEFAULT_EXPORT_FIELDS))
  }, [])

  const handleExport = useCallback(async () => {
    if (selectedFields.size === 0) {
      setError('Please select at least one field to export')
      return
    }

    setIsExporting(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/creators/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          fields: Array.from(selectedFields),
          selectedIds: selectedIds && selectedIds.length > 0 ? selectedIds : undefined,
          includeArchived,
          filters: {},
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Export failed')
      }

      if (format === 'csv') {
        // Download CSV file
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `creators-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        // For XLSX, we get JSON and would need client-side conversion
        const data = await res.json()
        // Simple JSON download as fallback
        const blob = new Blob([JSON.stringify(data.rows, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `creators-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }, [format, selectedFields, selectedIds, includeArchived, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20">
      <div className="relative w-full max-w-lg rounded-lg border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Export Creators</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {selectedIds && selectedIds.length > 0 && (
            <div className="rounded-md bg-muted px-4 py-3 text-sm">
              Exporting {selectedIds.length} selected creator{selectedIds.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  className="h-4 w-4"
                />
                <span className="text-sm">CSV</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={() => setFormat('xlsx')}
                  className="h-4 w-4"
                />
                <span className="text-sm">Excel (JSON)</span>
              </label>
            </div>
          </div>

          {/* Field Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Fields to Export</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-primary hover:underline"
                >
                  Select all
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  onClick={selectDefault}
                  className="text-xs text-primary hover:underline"
                >
                  Default
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
              {ALL_EXPORT_FIELDS.map(({ field, label }) => (
                <label key={field} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field)}
                    onChange={() => toggleField(field)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label>Options</Label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Include archived/inactive creators</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedFields.size === 0}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </div>
      </div>
    </div>
  )
}
