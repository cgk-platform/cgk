import { Card, CardContent } from '@cgk-platform/ui'

import { CostsSettingsForm } from '@/components/settings'

export const metadata = {
  title: 'Cost Configuration | Admin',
  description: 'Configure variable costs, COGS, and P&L formula settings',
}

export default function CostsSettingsPage() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">P&L Cost Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure variable costs that feed into Profit & Loss calculations. These settings
            determine how payment processing fees, fulfillment costs, shipping, and other expenses
            are calculated in your P&L statements.
          </p>
        </div>
        <CostsSettingsForm />
      </CardContent>
    </Card>
  )
}
