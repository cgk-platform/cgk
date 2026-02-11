import { RefreshCw } from 'lucide-react'

import { EmptyState } from '@/components/commerce/empty-state'

export default function SubscriptionsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Subscriptions</h1>
      <EmptyState
        icon={RefreshCw}
        title="Subscriptions"
        description="Subscription management requires Loop integration. Configure your Loop API credentials in Settings > Integrations to get started."
        action={{ label: 'Go to Integrations', href: '/admin/settings/integrations' }}
      />
    </div>
  )
}
