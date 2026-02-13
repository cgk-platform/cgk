'use client'

import { CheckCircle, AlertCircle } from 'lucide-react'

import { Badge, Card, CardContent, cn } from '@cgk-platform/ui'

import type { WizardData } from '@/lib/ab-tests/types'

interface Step5Props {
  data: WizardData
}

export function Step5Review({ data }: Step5Props) {
  const { step1, step2, step3, step4 } = data

  const issues: string[] = []
  if (!step1?.name) issues.push('Test name is required')
  if (!step1?.baseUrl) issues.push('Base URL is required')
  if (!step2?.variants || step2.variants.length < 2) {
    issues.push('At least 2 variants are required')
  }
  const totalAllocation = step2?.variants?.reduce((sum, v) => sum + v.trafficAllocation, 0) || 0
  if (totalAllocation !== 100) {
    issues.push('Traffic allocation must equal 100%')
  }

  const hasIssues = issues.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Review Your Test</h2>
        <p className="mt-1 text-sm text-slate-500">
          Confirm the test configuration before creating.
        </p>
      </div>

      {/* Validation Status */}
      {hasIssues ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium text-red-800">Please fix the following issues:</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700">
                {issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <p className="font-medium text-emerald-800">
              Everything looks good! Ready to create your test.
            </p>
          </div>
        </div>
      )}

      {/* Summary Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Basics */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Basics
            </h3>
            <dl className="space-y-2">
              <SummaryItem label="Name" value={step1?.name} />
              <SummaryItem label="Type" value={formatTestType(step1?.testType)} />
              <SummaryItem label="Goal Event" value={formatGoalEvent(step1?.goalEvent)} />
              <SummaryItem
                label="Optimization"
                value={formatOptimizationMetric(step1?.optimizationMetric)}
              />
              <SummaryItem
                label="Confidence"
                value={step1?.confidenceLevel ? `${step1.confidenceLevel * 100}%` : undefined}
              />
              <SummaryItem
                label="Base URL"
                value={step1?.baseUrl}
                mono
              />
            </dl>
          </CardContent>
        </Card>

        {/* Variants */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Variants ({step2?.variants?.length || 0})
            </h3>
            <div className="space-y-2">
              {step2?.variants?.map((variant, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{variant.name}</span>
                    {variant.isControl && (
                      <Badge variant="outline" className="text-xs">
                        Control
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-sm text-slate-600">
                    {variant.trafficAllocation}%
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <SummaryItem
                label="Mode"
                value={step2?.mode === 'mab' ? 'Multi-Armed Bandit' : 'Manual Split'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Targeting */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Targeting
            </h3>
            {step3?.targetingRules && step3.targetingRules.length > 0 ? (
              <div className="space-y-2">
                {step3.targetingRules.map((rule, i) => (
                  <div key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-900">{rule.name}</span>
                    <span className="ml-2 text-slate-500">
                      ({rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                All visitors to the base URL will be included
              </p>
            )}
            {step3?.exclusionGroups && step3.exclusionGroups.length > 0 && (
              <div className="mt-3">
                <SummaryItem label="Exclusion Group" value={step3.exclusionGroups[0]} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Schedule
            </h3>
            <dl className="space-y-2">
              <SummaryItem
                label="Start"
                value={
                  step4?.startOption === 'now'
                    ? 'Immediately'
                    : step4?.scheduledStartAt
                      ? formatDateTime(step4.scheduledStartAt)
                      : 'Scheduled'
                }
              />
              <SummaryItem
                label="End"
                value={
                  step4?.endOption === 'auto_significance'
                    ? 'Auto on significance'
                    : step4?.endOption === 'manual'
                      ? 'Manual'
                      : step4?.scheduledEndAt
                        ? formatDateTime(step4.scheduledEndAt)
                        : 'Scheduled'
                }
              />
              <SummaryItem label="Timezone" value={step4?.timezone} />
            </dl>
            {step4?.guardrails && step4.guardrails.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-500">
                  Guardrails: {step4.guardrails.length}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {step4.guardrails.map((g, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {g.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hypothesis */}
      {step1?.hypothesis && (
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Hypothesis
            </h3>
            <p className="text-sm italic text-slate-700">"{step1.hypothesis}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SummaryItem({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: string
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={cn('text-sm font-medium text-slate-900', mono && 'font-mono text-xs')}>
        {value || <span className="text-slate-400">Not set</span>}
      </dd>
    </div>
  )
}

function formatTestType(type?: string): string {
  const labels: Record<string, string> = {
    landing_page: 'Landing Page',
    shipping: 'Shipping',
    email: 'Email',
    checkout: 'Checkout',
    pricing: 'Pricing',
  }
  return type ? labels[type] || type : ''
}

function formatGoalEvent(event?: string): string {
  const labels: Record<string, string> = {
    page_view: 'Page View',
    add_to_cart: 'Add to Cart',
    begin_checkout: 'Begin Checkout',
    purchase: 'Purchase',
  }
  return event ? labels[event] || event : ''
}

function formatOptimizationMetric(metric?: string): string {
  const labels: Record<string, string> = {
    conversion_rate: 'Conversion Rate',
    revenue_per_visitor: 'Revenue per Visitor',
    average_order_value: 'Average Order Value',
  }
  return metric ? labels[metric] || metric : ''
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
