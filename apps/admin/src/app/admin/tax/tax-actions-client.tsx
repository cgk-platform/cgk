'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { W9StatusBadge, Form1099StatusBadge } from '@/components/commerce/status-badge'
import { formatMoney } from '@/lib/format'
import type { CreatorTaxInfo } from '@/lib/tax/types'

interface TaxActionsClientProps {
  creators: CreatorTaxInfo[]
  taxYear: number
}

export function TaxActionsClient({ creators, taxYear }: TaxActionsClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAction(creatorId: string, action: string) {
    if (loading) return

    setLoading(`${creatorId}_${action}`)
    try {
      const response = await fetch('/api/admin/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, creatorId, taxYear }),
      })

      if (response.ok) {
        router.refresh()
      }
    } finally {
      setLoading(null)
    }
  }

  if (creators.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No creators found for the selected filters.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Creator</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Earnings ({taxYear})
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">W-9 Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              TIN (Last 4)
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">1099 Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {creators.map((creator) => (
            <tr key={creator.id} className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <div className="font-medium">{creator.creator_name}</div>
                <div className="text-xs text-muted-foreground">{creator.creator_email}</div>
                {creator.business_name && (
                  <div className="text-xs text-muted-foreground">{creator.business_name}</div>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="font-medium">
                  {formatMoney(Number(creator.total_earnings_ytd_cents))}
                </div>
                {creator.requires_1099 && (
                  <div className="text-xs text-yellow-600">
                    Above ${Number(creator.threshold_cents) / 100} threshold
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <W9StatusBadge status={creator.w9_status} />
              </td>
              <td className="px-4 py-3">
                {creator.tin_last_four ? (
                  <span className="font-mono">***-**-{creator.tin_last_four}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Form1099StatusBadge status={creator.form_1099_status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {creator.w9_status === 'pending_review' && (
                    <>
                      <button
                        onClick={() => handleAction(creator.creator_id, 'approve_w9')}
                        disabled={loading === `${creator.creator_id}_approve_w9`}
                        className="text-xs text-green-600 hover:underline disabled:opacity-50"
                      >
                        {loading === `${creator.creator_id}_approve_w9` ? 'Approving...' : 'Approve W-9'}
                      </button>
                      <button
                        onClick={() => handleAction(creator.creator_id, 'reject_w9')}
                        disabled={loading === `${creator.creator_id}_reject_w9`}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {creator.requires_1099 && creator.w9_status === 'approved' && (
                    <>
                      {creator.form_1099_status === 'not_required' ||
                      creator.form_1099_status === 'pending' ? (
                        <button
                          onClick={() => handleAction(creator.creator_id, 'generate_1099')}
                          disabled={loading === `${creator.creator_id}_generate_1099`}
                          className="text-xs text-primary hover:underline disabled:opacity-50"
                        >
                          {loading === `${creator.creator_id}_generate_1099`
                            ? 'Generating...'
                            : 'Generate 1099'}
                        </button>
                      ) : null}
                      {creator.form_1099_status === 'generated' && (
                        <button
                          onClick={() => handleAction(creator.creator_id, 'mark_1099_sent')}
                          disabled={loading === `${creator.creator_id}_mark_1099_sent`}
                          className="text-xs text-primary hover:underline disabled:opacity-50"
                        >
                          {loading === `${creator.creator_id}_mark_1099_sent`
                            ? 'Marking...'
                            : 'Mark Sent'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
