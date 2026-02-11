'use client'

import { Badge, Card, CardHeader, CardContent, cn } from '@cgk/ui'

import type { TestResults, VariantResult } from '@/lib/ab-tests/types'

interface VariantTableProps {
  results: TestResults
}

export function VariantTable({ results }: VariantTableProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Variant Performance</h2>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Variant
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Visitors
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Conversions
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Conv. Rate
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Revenue
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  RPV
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  vs Control
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Significance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.variants.map((variant) => (
                <VariantRow key={variant.variantId} variant={variant} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function VariantRow({ variant }: { variant: VariantResult }) {
  return (
    <tr
      className={cn(
        'hover:bg-slate-50',
        variant.isWinner && 'bg-emerald-50 hover:bg-emerald-50'
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{variant.variantName}</span>
          {variant.isControl && (
            <Badge variant="outline" className="text-xs">
              Control
            </Badge>
          )}
          {variant.isWinner && (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
              Winner
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-900">
        {variant.visitors.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-900">
        {variant.conversions.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-900">
        {(variant.conversionRate * 100).toFixed(2)}%
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-900">
        ${variant.revenue.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-900">
        ${variant.revenuePerVisitor.toFixed(2)}
      </td>
      <td className="px-4 py-3 text-right">
        {variant.isControl ? (
          <span className="text-slate-400">--</span>
        ) : (
          <span
            className={cn(
              'font-mono font-semibold',
              (variant.improvement ?? 0) > 0 ? 'text-emerald-600' : 'text-red-600'
            )}
          >
            {(variant.improvement ?? 0) > 0 ? '+' : ''}
            {variant.improvement?.toFixed(1)}%
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {variant.isControl ? (
          <span className="text-slate-400">--</span>
        ) : (
          <SignificanceIndicator
            pValue={variant.pValue}
            isSignificant={variant.isSignificant}
          />
        )}
      </td>
    </tr>
  )
}

function SignificanceIndicator({
  pValue,
  isSignificant,
}: {
  pValue?: number
  isSignificant?: boolean
}) {
  if (!pValue && !isSignificant) {
    return <span className="text-slate-400">--</span>
  }

  const confidence = pValue ? (1 - pValue) * 100 : isSignificant ? 95 : 0

  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative h-2 w-16 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            confidence >= 95
              ? 'bg-emerald-500'
              : confidence >= 90
                ? 'bg-cyan-500'
                : confidence >= 80
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
          )}
          style={{ width: `${Math.min(100, confidence)}%` }}
        />
      </div>
      <span
        className={cn(
          'font-mono text-xs',
          confidence >= 95 ? 'text-emerald-600' : 'text-slate-500'
        )}
      >
        {confidence.toFixed(0)}%
      </span>
    </div>
  )
}

export function VariantTableSkeleton() {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      </CardHeader>
      <CardContent className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-4 w-16 rounded bg-slate-200" />
              <div className="h-4 w-16 rounded bg-slate-200" />
              <div className="h-4 w-16 rounded bg-slate-200" />
              <div className="h-4 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
