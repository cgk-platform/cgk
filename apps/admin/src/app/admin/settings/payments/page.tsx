import { Card, CardContent } from '@cgk-platform/ui'

export default function PaymentsSettingsPage() {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold">Payment Configuration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure Stripe and Wise payment integrations.
        </p>
        <div className="mt-6 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Payment settings will be available here.
        </div>
      </CardContent>
    </Card>
  )
}
