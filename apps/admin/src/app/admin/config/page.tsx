import { Card, CardContent } from '@cgk-platform/ui'

import { SiteConfigForm } from '@/components/settings'

export const metadata = {
  title: 'Site Configuration | Admin',
  description: 'Configure site branding, pricing, and navigation',
}

export default function SiteConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Site Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Manage your site branding, pricing, promotions, and navigation settings.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <SiteConfigForm />
        </CardContent>
      </Card>
    </div>
  )
}
