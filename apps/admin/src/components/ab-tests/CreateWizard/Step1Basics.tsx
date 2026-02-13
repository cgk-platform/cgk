'use client'

import { Input, Label, Textarea, cn } from '@cgk-platform/ui'

import type { WizardData, WizardStep1Data, TestType, GoalEvent, OptimizationMetric } from '@/lib/ab-tests/types'

interface Step1Props {
  data: WizardData
  updateData: (data: Partial<WizardData>) => void
}

const testTypes: { value: TestType; label: string; description: string }[] = [
  {
    value: 'landing_page',
    label: 'Landing Page',
    description: 'Test different page designs and copy',
  },
  {
    value: 'shipping',
    label: 'Shipping',
    description: 'Test shipping rates and messaging',
  },
  {
    value: 'email',
    label: 'Email',
    description: 'Test email templates and subject lines',
  },
  {
    value: 'checkout',
    label: 'Checkout',
    description: 'Test checkout flow variations',
  },
  {
    value: 'pricing',
    label: 'Pricing',
    description: 'Test price points and offers',
  },
]

const goalEvents: { value: GoalEvent; label: string }[] = [
  { value: 'page_view', label: 'Page View' },
  { value: 'add_to_cart', label: 'Add to Cart' },
  { value: 'begin_checkout', label: 'Begin Checkout' },
  { value: 'purchase', label: 'Purchase' },
]

const optimizationMetrics: { value: OptimizationMetric; label: string; description: string }[] = [
  {
    value: 'conversion_rate',
    label: 'Conversion Rate',
    description: 'Optimize for more conversions',
  },
  {
    value: 'revenue_per_visitor',
    label: 'Revenue per Visitor',
    description: 'Optimize for higher revenue',
  },
  {
    value: 'average_order_value',
    label: 'Average Order Value',
    description: 'Optimize for larger orders',
  },
]

const confidenceLevels: { value: 0.9 | 0.95 | 0.99; label: string; description: string }[] = [
  { value: 0.9, label: '90%', description: 'Faster results, lower certainty' },
  { value: 0.95, label: '95%', description: 'Recommended balance' },
  { value: 0.99, label: '99%', description: 'Slower results, highest certainty' },
]

export function Step1Basics({ data, updateData }: Step1Props) {
  const step1 = data.step1 || {
    name: '',
    description: '',
    testType: 'landing_page' as TestType,
    hypothesis: '',
    goalEvent: 'purchase' as GoalEvent,
    optimizationMetric: 'revenue_per_visitor' as OptimizationMetric,
    confidenceLevel: 0.95 as const,
    baseUrl: '',
  }

  const update = (changes: Partial<WizardStep1Data>) => {
    updateData({ step1: { ...step1, ...changes } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Test Basics</h2>
        <p className="mt-1 text-sm text-slate-500">
          Define what you want to test and how you'll measure success.
        </p>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-slate-700">
          Test Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          value={step1.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="e.g., Homepage Hero CTA Test"
          className="max-w-md"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium text-slate-700">
          Description
        </Label>
        <Textarea
          id="description"
          value={step1.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Optional: Describe the purpose and context of this test"
          rows={2}
          className="max-w-lg"
        />
      </div>

      {/* Test Type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-700">
          Test Type <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {testTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => update({ testType: type.value })}
              className={cn(
                'flex flex-col items-start rounded-lg border p-3 text-left transition-all',
                step1.testType === type.value
                  ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <span className="text-sm font-medium text-slate-900">{type.label}</span>
              <span className="mt-1 text-xs text-slate-500">{type.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hypothesis */}
      <div className="space-y-2">
        <Label htmlFor="hypothesis" className="text-sm font-medium text-slate-700">
          Hypothesis
        </Label>
        <Textarea
          id="hypothesis"
          value={step1.hypothesis}
          onChange={(e) => update({ hypothesis: e.target.value })}
          placeholder="e.g., Changing the CTA from 'Buy Now' to 'Get Started' will increase conversions because it's less aggressive"
          rows={2}
          className="max-w-lg"
        />
        <p className="text-xs text-slate-500">
          A clear hypothesis helps you learn from the test regardless of outcome.
        </p>
      </div>

      {/* Base URL */}
      <div className="space-y-2">
        <Label htmlFor="baseUrl" className="text-sm font-medium text-slate-700">
          Base URL <span className="text-red-500">*</span>
        </Label>
        <Input
          id="baseUrl"
          type="url"
          value={step1.baseUrl}
          onChange={(e) => update({ baseUrl: e.target.value })}
          placeholder="https://example.com/landing"
          className="max-w-md font-mono text-sm"
        />
        <p className="text-xs text-slate-500">
          The page where the test will run. Visitors to this URL will be assigned to variants.
        </p>
      </div>

      {/* Goal Event */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-700">
          Goal Event <span className="text-red-500">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {goalEvents.map((event) => (
            <button
              key={event.value}
              type="button"
              onClick={() => update({ goalEvent: event.value })}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                step1.goalEvent === event.value
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              {event.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optimization Metric */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-700">
          Optimization Metric
        </Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {optimizationMetrics.map((metric) => (
            <button
              key={metric.value}
              type="button"
              onClick={() => update({ optimizationMetric: metric.value })}
              className={cn(
                'flex flex-col items-start rounded-lg border p-3 text-left transition-all',
                step1.optimizationMetric === metric.value
                  ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <span className="text-sm font-medium text-slate-900">{metric.label}</span>
              <span className="mt-1 text-xs text-slate-500">{metric.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Confidence Level */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-700">
          Confidence Level
        </Label>
        <div className="flex gap-3">
          {confidenceLevels.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => update({ confidenceLevel: level.value })}
              className={cn(
                'flex flex-col items-center rounded-lg border px-6 py-3 transition-all',
                step1.confidenceLevel === level.value
                  ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <span className="font-mono text-lg font-bold text-slate-900">{level.label}</span>
              <span className="mt-1 text-xs text-slate-500">{level.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
