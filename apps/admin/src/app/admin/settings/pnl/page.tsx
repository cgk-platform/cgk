'use client'

import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  Switch,
  Label,
} from '@cgk-platform/ui'
import { Save } from 'lucide-react'

interface CostBucket {
  id: string
  label: string
  description: string
  included: boolean
}

const INITIAL_BUCKETS: CostBucket[] = [
  {
    id: 'cogs',
    label: 'Cost of Goods Sold (COGS)',
    description: 'Direct product manufacturing / procurement cost.',
    included: true,
  },
  {
    id: 'payment_processing',
    label: 'Payment Processing Fees',
    description: 'Stripe, PayPal, and gateway transaction fees.',
    included: true,
  },
  {
    id: 'fulfillment',
    label: 'Fulfillment & 3PL',
    description: 'Pick, pack, and ship costs from fulfilment partners.',
    included: true,
  },
  {
    id: 'shipping',
    label: 'Shipping',
    description: 'Carrier postage costs passed through to you.',
    included: true,
  },
  {
    id: 'returns',
    label: 'Returns & Refunds',
    description: 'Net refunds issued to customers.',
    included: true,
  },
  {
    id: 'ad_spend',
    label: 'Advertising Spend',
    description: 'Paid media spend across all channels.',
    included: false,
  },
  {
    id: 'creator_commissions',
    label: 'Creator Commissions',
    description: 'Payout commissions to creators and affiliates.',
    included: false,
  },
  {
    id: 'platform_fees',
    label: 'Platform / SaaS Fees',
    description: 'Fixed monthly fees for tools and services.',
    included: false,
  },
]

export default function PnlSettingsPage() {
  const [buckets, setBuckets] = useState<CostBucket[]>(INITIAL_BUCKETS)
  const [saving, setSaving] = useState(false)

  function toggleBucket(id: string) {
    setBuckets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, included: !b.included } : b))
    )
  }

  async function handleSave() {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
  }

  const included = buckets.filter((b) => b.included)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">P&amp;L Formula Configuration</h1>
        <p className="text-muted-foreground">
          Choose which cost buckets are included in the Profit &amp; Loss calculation.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-2 text-base font-semibold">Current Formula</h2>
          <div className="rounded-md bg-muted/60 px-4 py-3 font-mono text-sm">
            Revenue
            {included.map((b) => (
              <span key={b.id}>
                {' '}
                &minus; <span className="text-primary">{b.label}</span>
              </span>
            ))}
            {' = '}
            <span className="font-semibold text-success">Net Profit</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-base font-semibold">Cost Buckets</h2>
          <div className="divide-y divide-border">
            {buckets.map((bucket) => (
              <div key={bucket.id} className="flex items-center justify-between py-4">
                <div className="flex-1 pr-6">
                  <Label htmlFor={`bucket-${bucket.id}`} className="cursor-pointer font-medium">
                    {bucket.label}
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">{bucket.description}</p>
                </div>
                <Switch
                  id={`bucket-${bucket.id}`}
                  checked={bucket.included}
                  onCheckedChange={() => toggleBucket(bucket.id)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
