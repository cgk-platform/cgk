'use client'

import { Shield, AlertTriangle, CheckCircle } from 'lucide-react'

import { Card, CardHeader, CardContent, cn } from '@cgk/ui'

import type { Guardrail } from '@/lib/ab-tests/types'

interface GuardrailStatusProps {
  guardrails: Guardrail[]
}

export function GuardrailStatus({ guardrails }: GuardrailStatusProps) {
  if (guardrails.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Guardrails
          </h3>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Shield className="h-4 w-4" />
            <span>No guardrails configured</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const triggeredCount = guardrails.filter((g) => g.isTriggered).length
  const allPassing = triggeredCount === 0

  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Guardrails
          </h3>
          <StatusIndicator passing={allPassing} triggeredCount={triggeredCount} />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {guardrails.map((guardrail) => (
            <GuardrailItem key={guardrail.id} guardrail={guardrail} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusIndicator({
  passing,
  triggeredCount,
}: {
  passing: boolean
  triggeredCount: number
}) {
  if (passing) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-xs font-medium">All passing</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-red-600">
      <AlertTriangle className="h-4 w-4" />
      <span className="text-xs font-medium">
        {triggeredCount} triggered
      </span>
    </div>
  )
}

function GuardrailItem({ guardrail }: { guardrail: Guardrail }) {
  const formatMetric = (metric: string): string => {
    const labels: Record<string, string> = {
      bounce_rate: 'Bounce Rate',
      cart_abandonment: 'Cart Abandonment',
      revenue: 'Revenue',
      conversion_rate: 'Conversion Rate',
      page_load_time: 'Page Load Time',
    }
    return labels[metric] || metric
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        guardrail.isTriggered
          ? 'border-red-200 bg-red-50'
          : 'border-slate-200 bg-slate-50'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {guardrail.isTriggered ? (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          ) : (
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          )}
          <span className="text-sm font-medium text-slate-900">
            {guardrail.name}
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {formatMetric(guardrail.metric)} {guardrail.direction}{' '}
        <span className="font-mono">{guardrail.threshold}%</span>
        {guardrail.currentValue !== undefined && (
          <>
            {' '}
            (current:{' '}
            <span
              className={cn(
                'font-mono',
                guardrail.isTriggered ? 'text-red-600' : 'text-slate-700'
              )}
            >
              {guardrail.currentValue.toFixed(1)}%
            </span>
            )
          </>
        )}
      </p>
    </div>
  )
}
