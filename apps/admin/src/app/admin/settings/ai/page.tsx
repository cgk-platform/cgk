import { Card, CardContent } from '@cgk-platform/ui'

import { AISettingsForm } from '@/components/settings'

export const metadata = {
  title: 'AI Settings | Admin',
  description: 'Configure AI features for your store',
}

export default function AISettingsPage() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">AI Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure AI features, model preferences, and usage limits for your store.
          </p>
        </div>
        <AISettingsForm />
      </CardContent>
    </Card>
  )
}
