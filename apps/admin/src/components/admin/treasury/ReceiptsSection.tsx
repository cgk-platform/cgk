'use client'

import { Button } from '@cgk-platform/ui'
import { Card, CardContent } from '@cgk-platform/ui'
import { Input } from '@cgk-platform/ui'
import { Label } from '@cgk-platform/ui'
import {
  FileText,
  Upload,
  Search,
  X,
  Eye,
  CheckCircle2,
  Archive,
  Loader2,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'

import type { TreasuryReceipt, ReceiptStatus, CreateReceiptInput } from '@/lib/treasury/types'

interface ReceiptsSectionProps {
  initialReceipts?: TreasuryReceipt[]
  onUpload?: () => void
}

function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ReceiptsSection({ initialReceipts = [], onUpload }: ReceiptsSectionProps) {
  const [receipts, setReceipts] = useState<TreasuryReceipt[]>(initialReceipts)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | 'all'>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [previewReceipt, setPreviewReceipt] = useState<TreasuryReceipt | null>(null)

  const loadReceipts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('vendor', searchQuery)

      const response = await fetch(`/api/admin/treasury/receipts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReceipts(data.receipts || [])
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    loadReceipts()
  }, [loadReceipts])

  const handleUploadSuccess = () => {
    setShowUploadModal(false)
    loadReceipts()
    onUpload?.()
  }

  const filteredReceipts = receipts.filter((receipt) => {
    if (statusFilter !== 'all' && receipt.status !== statusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesVendor = receipt.vendor_name?.toLowerCase().includes(query)
      const matchesFile = receipt.file_name.toLowerCase().includes(query)
      const matchesDesc = receipt.description?.toLowerCase().includes(query)
      if (!matchesVendor && !matchesFile && !matchesDesc) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipts..."
              className="w-64 pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReceiptStatus | 'all')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <Button
          onClick={() => setShowUploadModal(true)}
          className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-emerald-800"
        >
          <Upload className="h-4 w-4" />
          Upload Receipt
        </Button>
      </div>

      {/* Receipts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filteredReceipts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-lg font-medium text-slate-900">No receipts found</p>
            <p className="text-sm text-slate-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload receipts and invoices to track expenses'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReceipts.map((receipt) => (
            <ReceiptCard
              key={receipt.id}
              receipt={receipt}
              onPreview={() => setPreviewReceipt(receipt)}
              onRefresh={loadReceipts}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadReceiptModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Preview Modal */}
      {previewReceipt && (
        <ReceiptPreviewModal
          receipt={previewReceipt}
          onClose={() => setPreviewReceipt(null)}
        />
      )}
    </div>
  )
}

function ReceiptCard({
  receipt,
  onPreview,
  onRefresh,
}: {
  receipt: TreasuryReceipt
  onPreview: () => void
  onRefresh: () => void
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleAction = async (action: 'process' | 'archive' | 'delete') => {
    setActionLoading(action)
    try {
      const method = action === 'delete' ? 'DELETE' : 'PATCH'
      const body = action === 'delete' ? undefined : JSON.stringify({ status: action === 'process' ? 'processed' : 'archived' })

      const response = await fetch(`/api/admin/treasury/receipts/${receipt.id}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      })

      if (response.ok) {
        onRefresh()
      }
    } finally {
      setActionLoading(null)
    }
  }

  const statusStyles = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    processed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    archived: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-0">
        {/* File Preview Area */}
        <div
          className="flex h-32 cursor-pointer items-center justify-center bg-slate-100 transition-colors hover:bg-slate-200"
          onClick={onPreview}
        >
          {receipt.file_type?.startsWith('image/') ? (
            <img
              src={receipt.file_url}
              alt={receipt.file_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <FileText className="h-12 w-12 text-slate-400" />
          )}
        </div>

        {/* Details */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-medium text-slate-900">
                {receipt.vendor_name || receipt.file_name}
              </h4>
              {receipt.description && (
                <p className="mt-0.5 truncate text-xs text-slate-500">{receipt.description}</p>
              )}
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[receipt.status]}`}>
              {receipt.status}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            {receipt.amount_cents && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatMoney(receipt.amount_cents)}
              </span>
            )}
            {receipt.receipt_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(receipt.receipt_date)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={onPreview}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              <Eye className="h-4 w-4" />
            </button>
            {receipt.status === 'pending' && (
              <button
                onClick={() => handleAction('process')}
                disabled={!!actionLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 transition-colors hover:bg-emerald-50"
              >
                {actionLoading === 'process' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </button>
            )}
            {receipt.status !== 'archived' && (
              <button
                onClick={() => handleAction('archive')}
                disabled={!!actionLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
              >
                {actionLoading === 'archive' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UploadReceiptModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    vendor_name: '',
    description: '',
    amount: '',
    receipt_date: '',
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      // For now, create a placeholder URL - in production, upload to Vercel Blob first
      const fileUrl = URL.createObjectURL(file)

      const input: CreateReceiptInput = {
        file_url: fileUrl,
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        vendor_name: formData.vendor_name || undefined,
        description: formData.description || undefined,
        amount_cents: formData.amount ? Math.round(parseFloat(formData.amount) * 100) : undefined,
        receipt_date: formData.receipt_date || undefined,
      }

      const response = await fetch('/api/admin/treasury/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload receipt')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Upload Receipt</h2>
              <p className="text-sm text-emerald-200">Add a receipt or invoice</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-white/70 hover:bg-white/20 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-4 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div>
                <FileText className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="mt-2 font-medium text-emerald-900">{file.name}</p>
                <p className="text-sm text-emerald-600">Click to change file</p>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-2 font-medium text-slate-900">Drop file here or click to upload</p>
                <p className="text-sm text-slate-500">Images or PDF up to 10MB</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor Name</Label>
              <Input
                id="vendor"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                placeholder="e.g., Amazon, Staples"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Receipt Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.receipt_date}
                  onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Office supplies, software subscription, etc."
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || uploading}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Receipt'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ReceiptPreviewModal({
  receipt,
  onClose,
}: {
  receipt: TreasuryReceipt
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-4xl overflow-auto rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        >
          <X className="h-5 w-5" />
        </button>

        {receipt.file_type?.startsWith('image/') ? (
          <img
            src={receipt.file_url}
            alt={receipt.file_name}
            className="max-h-[80vh] w-auto"
          />
        ) : receipt.file_type === 'application/pdf' ? (
          <iframe
            src={receipt.file_url}
            className="h-[80vh] w-[60vw]"
            title={receipt.file_name}
          />
        ) : (
          <div className="flex h-64 w-96 items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto h-16 w-16 text-slate-400" />
              <p className="mt-4 font-medium">{receipt.file_name}</p>
              <a
                href={receipt.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-emerald-600 hover:underline"
              >
                Download File
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
