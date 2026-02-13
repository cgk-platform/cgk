'use client'

import { Button, Input, Label } from '@cgk-platform/ui'
import { useState } from 'react'
import type { ExpenseCategory, CreateOperatingExpenseInput } from '@/lib/expenses/types'

interface ExpenseFormProps {
  categories: ExpenseCategory[]
  onSubmit: (data: CreateOperatingExpenseInput) => Promise<void>
  onCancel: () => void
  initialData?: Partial<CreateOperatingExpenseInput>
  isLoading?: boolean
}

export function ExpenseForm({
  categories,
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: ExpenseFormProps) {
  const defaultDate = new Date().toISOString().split('T')[0] || ''
  const [formData, setFormData] = useState<CreateOperatingExpenseInput>({
    date: initialData?.date || defaultDate,
    category_id: initialData?.category_id || '',
    description: initialData?.description || '',
    amount_cents: initialData?.amount_cents || 0,
    vendor_name: initialData?.vendor_name || '',
    notes: initialData?.notes || '',
    receipt_url: initialData?.receipt_url || '',
    count_for_pnl: initialData?.count_for_pnl ?? true,
  })

  const [amountDisplay, setAmountDisplay] = useState(
    initialData?.amount_cents ? (initialData.amount_cents / 100).toFixed(2) : ''
  )

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleAmountChange = (value: string) => {
    // Remove non-numeric except decimal
    const cleaned = value.replace(/[^\d.]/g, '')
    setAmountDisplay(cleaned)

    const numValue = parseFloat(cleaned)
    if (!isNaN(numValue)) {
      setFormData((prev) => ({ ...prev, amount_cents: Math.round(numValue * 100) }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.date) {
      newErrors.date = 'Date is required'
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (formData.amount_cents <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    await onSubmit(formData)
  }

  // Group categories by type
  const groupedCategories = (categories || []).reduce(
    (acc, cat) => {
      const expType = cat.expense_type || 'other'
      if (!acc[expType]) {
        acc[expType] = []
      }
      acc[expType].push(cat)
      return acc
    },
    {} as Record<string, ExpenseCategory[]>
  )

  const typeLabels: Record<string, string> = {
    cogs: 'Cost of Goods Sold',
    variable: 'Variable Costs',
    marketing: 'Marketing',
    operating: 'Operating Expenses',
    other: 'Other',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date */}
        <div>
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
            className={errors.date ? 'border-red-500' : ''}
          />
          {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="category">Category *</Label>
          <select
            id="category"
            value={formData.category_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))}
            className={`w-full h-10 px-3 border rounded-md ${
              errors.category_id ? 'border-red-500' : 'border-input'
            }`}
          >
            <option value="">Select a category...</option>
            {Object.entries(groupedCategories).map(([type, cats]) => (
              <optgroup key={type} label={typeLabels[type] || type}>
                {cats.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {errors.category_id && <p className="text-red-500 text-sm mt-1">{errors.category_id}</p>}
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="e.g., Monthly software subscription"
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amount */}
        <div>
          <Label htmlFor="amount">Amount (USD) *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amountDisplay}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className={`pl-7 ${errors.amount ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
        </div>

        {/* Vendor */}
        <div>
          <Label htmlFor="vendor">Vendor Name</Label>
          <Input
            id="vendor"
            value={formData.vendor_name || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, vendor_name: e.target.value }))}
            placeholder="e.g., Shopify"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes..."
          className="w-full min-h-[80px] px-3 py-2 border border-input rounded-md"
        />
      </div>

      {/* Receipt URL */}
      <div>
        <Label htmlFor="receipt">Receipt URL</Label>
        <Input
          id="receipt"
          type="url"
          value={formData.receipt_url || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, receipt_url: e.target.value }))}
          placeholder="https://..."
        />
        <p className="text-sm text-muted-foreground mt-1">
          Upload receipts to your file storage and paste the URL here.
        </p>
      </div>

      {/* P&L Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="count_for_pnl"
          checked={formData.count_for_pnl}
          onChange={(e) => setFormData((prev) => ({ ...prev, count_for_pnl: e.target.checked }))}
          className="h-4 w-4"
        />
        <Label htmlFor="count_for_pnl" className="cursor-pointer">
          Include in P&L Statement
        </Label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Update Expense' : 'Add Expense'}
        </Button>
      </div>
    </form>
  )
}
