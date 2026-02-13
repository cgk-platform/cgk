'use client'

import { Button } from '@cgk-platform/ui'
import { Plus, Receipt } from 'lucide-react'
import { useState } from 'react'

import { ExpenseForm } from './components/expense-form'

import type { Expense } from '@/lib/expenses/types'
import { formatMoney, formatDate } from '@/lib/format'


interface ExpensesClientProps {
  expenses: Expense[]
}

export function ExpensesClient({ expenses }: ExpensesClientProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          No expenses found. Click "Add Expense" to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vendor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Receipt</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(expense.expense_date)}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {expense.category.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 font-medium">{expense.vendor}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{expense.description}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatMoney(expense.amount_cents, expense.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {expense.receipt_url ? (
                      <a
                        href={expense.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Receipt className="h-4 w-4" />
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditingExpense(expense)}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ExpenseForm onClose={() => setShowForm(false)} />
      )}
      {editingExpense && (
        <ExpenseForm
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </>
  )
}
