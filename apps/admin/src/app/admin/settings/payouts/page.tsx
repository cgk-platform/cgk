import { Card, CardContent } from '@cgk/ui'

import { PayoutSettingsForm } from '@/components/settings'

export const metadata = {
  title: 'Payout Settings | Admin',
  description: 'Configure payout preferences and schedules',
}

export default function PayoutSettingsPage() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Payout Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure payment methods, payout schedules, thresholds, and fees for creators and
            contractors.
          </p>
        </div>
        <PayoutSettingsForm />
      </CardContent>
    </Card>
  )
}
