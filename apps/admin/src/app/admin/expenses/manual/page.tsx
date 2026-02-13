'use client'

import { Card, CardContent, CardHeader, Button } from '@cgk-platform/ui'
import { ArrowLeft, Plus, Trash2, Edit, Check, X } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

import { ExpenseForm } from '@/components/admin/expenses/expense-form'
import { formatMoney, formatDate } from '@/lib/format'
import type { ExpenseCategory, OperatingExpense, CreateOperatingExpenseInput, Expense } from '@/lib/expenses/types'

// Combined type to handle both old and new expense formats
type AnyExpense = OperatingExpense | Expense

export default function ManualExpensesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [expenses, setExpenses] = useState<AnyExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<AnyExpense | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [catRes, expRes] = await Promise.all([
        fetch('/api/admin/expenses/categories?activeOnly=true'),
        fetch('/api/admin/expenses?limit=50'),
      ])

      if (catRes.ok) {
        const catData = await catRes.json()
        setCategories(catData.categories || [])
      }

      if (expRes.ok) {
        const expData = await expRes.json()
        setExpenses(expData.expenses || [])
      }
    } catch {
      setError('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (data: CreateOperatingExpenseInput) => {
    setSubmitLoading(true)
    setError(null)

    try {
      const url = editingExpense
        ? `/api/admin/expenses?id=${editingExpense.id}`
        : '/api/admin/expenses'

      const res = await fetch(url, {
        method: editingExpense ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to save expense')
      }

      setShowForm(false)
      setEditingExpense(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const res = await fetch(`/api/admin/expenses?id=${expenseId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete expense')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense')
    }
  }

  const handleEdit = (expense: OperatingExpense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingExpense(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/expenses" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Manual Expenses</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/expenses" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Manual Expenses</h1>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h3>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              categories={categories}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              initialData={
                editingExpense
                  ? {
                      date: 'date' in editingExpense ? editingExpense.date : (editingExpense as Expense).expense_date,
                      category_id: 'category_id' in editingExpense ? editingExpense.category_id : '',
                      description: editingExpense.description,
                      amount_cents: editingExpense.amount_cents,
                      vendor_name: 'vendor_name' in editingExpense ? editingExpense.vendor_name || undefined : (editingExpense as Expense).vendor || undefined,
                      notes: editingExpense.notes || undefined,
                      receipt_url: 'receipt_url' in editingExpense ? editingExpense.receipt_url || undefined : undefined,
                      count_for_pnl: 'count_for_pnl' in editingExpense ? editingExpense.count_for_pnl : true,
                    }
                  : undefined
              }
              isLoading={submitLoading}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent Expenses</h3>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No expenses yet. Add your first expense above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Vendor
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">P&L</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenses.map((expense) => {
                    // Handle both OperatingExpense (date) and Expense (expense_date) types
                    const expenseDate = 'date' in expense ? expense.date : (expense as Expense).expense_date
                    const vendorName = 'vendor_name' in expense ? expense.vendor_name : (expense as Expense).vendor
                    const countForPnl = 'count_for_pnl' in expense ? expense.count_for_pnl : true

                    return (
                    <tr key={expense.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(expenseDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs truncate">{expense.description}</div>
                        {expense.notes && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {expense.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {vendorName || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMoney(expense.amount_cents)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {countForPnl ? (
                          <Check className="h-4 w-4 text-green-600 inline" />
                        ) : (
                          <X className="h-4 w-4 text-gray-400 inline" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(expense as OperatingExpense)}
                            className="p-1 hover:bg-muted rounded"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">About Receipt Uploads</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To attach receipts to expenses, first upload the receipt file to your storage provider
            (e.g., Vercel Blob, AWS S3), then paste the URL when creating the expense. Receipts are
            stored under tenant-prefixed paths for isolation.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
