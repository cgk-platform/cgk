'use client'

import { Button, Input, Label, Textarea } from '@cgk/ui'
import { X, Plus, Trash2, Loader2, FolderPlus } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface ProjectAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  contractorId: string
  contractorName: string
}

interface ProjectFormState {
  title: string
  description: string
  dueDate: string
  rate: string
  deliverables: string[]
}

export function ProjectAssignmentModal({
  isOpen,
  onClose,
  contractorId,
  contractorName,
}: ProjectAssignmentModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ProjectFormState>({
    title: '',
    description: '',
    dueDate: '',
    rate: '',
    deliverables: [],
  })
  const [newDeliverable, setNewDeliverable] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.title.trim()) {
      setError('Project title is required')
      return
    }

    if (form.dueDate) {
      const dueDate = new Date(form.dueDate)
      if (dueDate < new Date()) {
        setError('Due date must be in the future')
        return
      }
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/contractors/${contractorId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          dueDate: form.dueDate || undefined,
          rateCents: form.rate ? Math.round(parseFloat(form.rate) * 100) : undefined,
          deliverables: form.deliverables.length > 0 ? form.deliverables : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to create project')
        return
      }

      router.refresh()
      handleClose()
    })
  }

  const handleClose = () => {
    setForm({
      title: '',
      description: '',
      dueDate: '',
      rate: '',
      deliverables: [],
    })
    setNewDeliverable('')
    setError(null)
    onClose()
  }

  const addDeliverable = () => {
    if (newDeliverable.trim()) {
      setForm((f) => ({ ...f, deliverables: [...f.deliverables, newDeliverable.trim()] }))
      setNewDeliverable('')
    }
  }

  const removeDeliverable = (index: number) => {
    setForm((f) => ({
      ...f,
      deliverables: f.deliverables.filter((_, i) => i !== index),
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-lg border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Assign Project</h2>
            <p className="text-sm text-muted-foreground">to {contractorName}</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Website Redesign"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              disabled={isPending}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the project scope and requirements..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={isPending}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                disabled={isPending}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Rate ($) (optional)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                placeholder="500.00"
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Deliverables */}
          <div className="space-y-2">
            <Label>Deliverables (optional)</Label>
            <div className="space-y-2">
              {form.deliverables.map((deliverable, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
                >
                  <span className="flex-1 text-sm">{deliverable}</span>
                  <button
                    type="button"
                    onClick={() => removeDeliverable(index)}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Add a deliverable..."
                  value={newDeliverable}
                  onChange={(e) => setNewDeliverable(e.target.value)}
                  disabled={isPending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addDeliverable()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDeliverable}
                  disabled={isPending || !newDeliverable.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Assign Project
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
