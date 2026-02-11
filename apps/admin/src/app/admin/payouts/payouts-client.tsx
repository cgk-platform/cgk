'use client'

import { useState } from 'react'

import { ProcessModal } from '@/components/admin/payouts/process-modal'
import { WithdrawalList } from '@/components/admin/payouts/withdrawal-list'
import type { Withdrawal } from '@/lib/payouts/types'

interface PayoutsClientProps {
  withdrawals: Withdrawal[]
}

export function PayoutsClient({ withdrawals }: PayoutsClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedWithdrawal = selectedId
    ? withdrawals.find((w) => w.id === selectedId)
    : null

  return (
    <>
      <WithdrawalList withdrawals={withdrawals} onSelect={setSelectedId} />
      {selectedWithdrawal && (
        <ProcessModal
          withdrawal={selectedWithdrawal}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
