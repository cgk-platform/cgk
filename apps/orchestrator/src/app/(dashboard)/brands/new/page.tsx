import { Card, CardContent, CardHeader } from '@cgk/ui'

/**
 * New Brand page (Onboarding Wizard)
 *
 * Create a new brand/tenant with guided setup.
 */
export default function NewBrandPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Brand</h1>
        <p className="text-muted-foreground">
          Set up a new brand with guided onboarding.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Brand Onboarding Wizard</h2>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will contain a step-by-step wizard for creating a new brand with all required configurations.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
