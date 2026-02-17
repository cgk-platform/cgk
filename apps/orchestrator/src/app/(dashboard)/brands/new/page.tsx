import { Button, Card, CardContent } from '@cgk-platform/ui'
import {
  ArrowRight,
  Building2,
  CreditCard,
  Globe,
  Mail,
  Palette,
  Settings2,
  ShoppingBag,
  Users,
} from 'lucide-react'
import Link from 'next/link'

/**
 * Wizard step preview items
 */
const WIZARD_STEPS = [
  { icon: Building2, label: 'Basic Info', description: 'Name, slug, description' },
  { icon: ShoppingBag, label: 'Shopify', description: 'Connect store' },
  { icon: Globe, label: 'Domain', description: 'Configure URLs' },
  { icon: Palette, label: 'Branding', description: 'Logo and colors', optional: true },
  { icon: CreditCard, label: 'Payments', description: 'Stripe setup' },
  { icon: Mail, label: 'Email', description: 'Email provider', optional: true },
  { icon: Users, label: 'Team', description: 'Invite members', optional: true },
  { icon: Settings2, label: 'Features', description: 'Enable features' },
]

/**
 * New Brand page (Onboarding Wizard Landing)
 *
 * Landing page for creating a new brand/tenant with guided setup.
 */
export default function NewBrandPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Brand</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Set up a new brand with our guided onboarding wizard.
        </p>
      </div>

      {/* Wizard Preview */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Onboarding Steps
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {WIZARD_STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={step.label}
                  className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {index + 1}.
                      </span>
                      <span className="font-medium">{step.label}</span>
                      {step.optional && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          Optional
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Information Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-1 font-medium">Tenant Isolation</h3>
          <p className="text-sm text-muted-foreground">
            Each brand gets its own database schema with complete data isolation.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-1 font-medium">White-Label Ready</h3>
          <p className="text-sm text-muted-foreground">
            Custom domains, branding, and complete customization options.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-1 font-medium">Integrated Services</h3>
          <p className="text-sm text-muted-foreground">
            Shopify, Stripe, email, and more - all configured per-brand.
          </p>
        </div>
      </div>

      {/* Action */}
      <div className="flex justify-center">
        <Link href="/brands/new/wizard/step-1">
          <Button size="lg" className="px-8">
            Start Onboarding
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Help Text */}
      <p className="text-center text-sm text-muted-foreground">
        Need help? Check out the{' '}
        <a
          href="https://docs.cgk.dev/onboarding"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          onboarding documentation
        </a>{' '}
        or contact support.
      </p>
    </div>
  )
}
