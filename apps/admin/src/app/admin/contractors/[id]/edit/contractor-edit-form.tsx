'use client'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cgk/ui'
import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { Contractor, ContractorStatus } from '@/lib/contractors/types'
import { CONTRACTOR_STATUS_LABELS } from '@/lib/contractors/types'

interface ContractorEditFormProps {
  contractor: Contractor
}

const STATUS_OPTIONS: ContractorStatus[] = ['active', 'pending', 'suspended', 'inactive']

export function ContractorEditForm({ contractor }: ContractorEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: contractor.name,
    email: contractor.email,
    phone: contractor.phone || '',
    status: contractor.status,
    tags: contractor.tags.join(', '),
    notes: contractor.notes || '',
    contractUrl: contractor.contractUrl || '',
    contractType: contractor.contractType || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('Name is required')
      return
    }

    if (!form.email.trim()) {
      setError('Email is required')
      return
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/contractors/${contractor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          status: form.status,
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          notes: form.notes || null,
          contractUrl: form.contractUrl || null,
          contractType: form.contractType || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to update contractor')
        return
      }

      router.push(`/admin/contractors/${contractor.id}`)
      router.refresh()
    })
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to deactivate this contractor? This will set their status to inactive.')) {
      return
    }

    startDelete(async () => {
      const response = await fetch(`/api/admin/contractors/${contractor.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to delete contractor')
        return
      }

      router.push('/admin/contractors')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={isPending || isDeleting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={isPending || isDeleting}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                disabled={isPending || isDeleting}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <RadixSelect
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as ContractorStatus }))}
                disabled={isPending || isDeleting}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {CONTRACTOR_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </RadixSelect>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              type="text"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              disabled={isPending || isDeleting}
              placeholder="design, development, marketing"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contract</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contractUrl">Contract URL</Label>
            <Input
              id="contractUrl"
              type="url"
              value={form.contractUrl}
              onChange={(e) => setForm((f) => ({ ...f, contractUrl: e.target.value }))}
              disabled={isPending || isDeleting}
              placeholder="https://drive.google.com/..."
            />
            <p className="text-xs text-muted-foreground">
              Link to the contract document (Google Drive, Dropbox, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractType">Contract Type</Label>
            <RadixSelect
              value={form.contractType}
              onValueChange={(v) => setForm((f) => ({ ...f, contractType: v }))}
              disabled={isPending || isDeleting}
            >
              <SelectTrigger id="contractType" className="w-full">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value="uploaded">Uploaded Document</SelectItem>
                <SelectItem value="link">External Link</SelectItem>
              </SelectContent>
            </RadixSelect>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            disabled={isPending || isDeleting}
            placeholder="Internal notes about this contractor..."
            rows={4}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            These notes are only visible to admins, not to the contractor.
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleDelete}
          disabled={isPending || isDeleting}
          className="text-destructive hover:bg-destructive/10"
        >
          {isDeleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Deactivate Contractor
        </Button>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            asChild
            disabled={isPending || isDeleting}
          >
            <Link href={`/admin/contractors/${contractor.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Link>
          </Button>
          <Button type="submit" disabled={isPending || isDeleting}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  )
}
