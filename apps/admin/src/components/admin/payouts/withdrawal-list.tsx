import Link from 'next/link'

import { WithdrawalStatusBadge } from '@/components/commerce/status-badge'
import { formatMoney, formatDateTime } from '@/lib/format'
import type { Withdrawal } from '@/lib/payouts/types'

interface WithdrawalListProps {
  withdrawals: Withdrawal[]
  onSelect?: (id: string) => void
}

export function WithdrawalList({ withdrawals, onSelect }: WithdrawalListProps) {
  if (withdrawals.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No withdrawal requests found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Creator</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Requested</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {withdrawals.map((withdrawal) => (
            <tr key={withdrawal.id} className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/creators/${withdrawal.creator_id}`}
                  className="hover:underline"
                >
                  <div className="font-medium">{withdrawal.creator_name}</div>
                  <div className="text-xs text-muted-foreground">{withdrawal.creator_email}</div>
                </Link>
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {formatMoney(withdrawal.amount_cents, withdrawal.currency)}
              </td>
              <td className="px-4 py-3 capitalize">{withdrawal.method}</td>
              <td className="px-4 py-3">
                <WithdrawalStatusBadge status={withdrawal.status} />
                {withdrawal.failure_reason && (
                  <div className="mt-1 text-xs text-destructive">{withdrawal.failure_reason}</div>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDateTime(withdrawal.requested_at)}
              </td>
              <td className="px-4 py-3">
                {onSelect && (withdrawal.status === 'pending' || withdrawal.status === 'approved') && (
                  <button
                    onClick={() => onSelect(withdrawal.id)}
                    className="text-sm text-primary hover:underline"
                  >
                    Process
                  </button>
                )}
                {withdrawal.transfer_id && (
                  <span className="text-xs text-muted-foreground">
                    ID: {withdrawal.transfer_id.slice(0, 12)}...
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
