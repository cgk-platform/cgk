'use client'

import { useCallback } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'

import { Button, Input, Label, cn } from '@cgk/ui'

import type { WizardData, WizardStep2Data, AllocationMode } from '@/lib/ab-tests/types'

interface Step2Props {
  data: WizardData
  updateData: (data: Partial<WizardData>) => void
}

type VariantData = WizardStep2Data['variants'][number]

const allocationModes: { value: AllocationMode; label: string; description: string }[] = [
  {
    value: 'manual',
    label: 'Manual Split',
    description: 'Fixed traffic allocation throughout the test',
  },
  {
    value: 'mab',
    label: 'Multi-Armed Bandit',
    description: 'Automatically shift traffic to better performers',
  },
]

export function Step2Variants({ data, updateData }: Step2Props) {
  const step2: WizardStep2Data = data.step2 || {
    variants: [
      { name: 'Control', url: '', trafficAllocation: 50, isControl: true },
      { name: 'Variant B', url: '', trafficAllocation: 50, isControl: false },
    ],
    mode: 'manual',
  }

  const update = useCallback(
    (changes: Partial<WizardStep2Data>) => {
      updateData({ step2: { ...step2, ...changes } })
    },
    [step2, updateData]
  )

  const updateVariant = useCallback(
    (index: number, changes: Partial<VariantData>) => {
      const newVariants = [...step2.variants]
      newVariants[index] = { ...newVariants[index], ...changes }
      update({ variants: newVariants })
    },
    [step2.variants, update]
  )

  const addVariant = useCallback(() => {
    const letter = String.fromCharCode(65 + step2.variants.length) // A, B, C...
    const newVariant: VariantData = {
      name: `Variant ${letter}`,
      url: '',
      trafficAllocation: 0,
      isControl: false,
    }
    update({ variants: [...step2.variants, newVariant] })
  }, [step2.variants, update])

  const removeVariant = useCallback(
    (index: number) => {
      if (step2.variants.length <= 2) return
      const newVariants = step2.variants.filter((_, i) => i !== index)
      update({ variants: newVariants })
    },
    [step2.variants, update]
  )

  const equalizeTraffic = useCallback(() => {
    const count = step2.variants.length
    const equalShare = Math.floor(100 / count)
    const remainder = 100 - equalShare * count

    const newVariants = step2.variants.map((v, i) => ({
      ...v,
      trafficAllocation: equalShare + (i === 0 ? remainder : 0),
    }))
    update({ variants: newVariants })
  }, [step2.variants, update])

  const totalAllocation = step2.variants.reduce((sum, v) => sum + v.trafficAllocation, 0)
  const isValidAllocation = totalAllocation === 100

  const isShippingTest = data.step1?.testType === 'shipping'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Configure Variants</h2>
        <p className="mt-1 text-sm text-slate-500">
          Define the variations you want to test. At least 2 variants are required.
        </p>
      </div>

      {/* Allocation Mode */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-700">Allocation Mode</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {allocationModes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => update({ mode: mode.value })}
              className={cn(
                'flex flex-col items-start rounded-lg border p-4 text-left transition-all',
                step2.mode === mode.value
                  ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <span className="text-sm font-medium text-slate-900">{mode.label}</span>
              <span className="mt-1 text-xs text-slate-500">{mode.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Variants List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-slate-700">Variants</Label>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={equalizeTraffic}>
              Equalize Traffic
            </Button>
            <Button variant="outline" size="sm" onClick={addVariant}>
              <Plus className="mr-1 h-4 w-4" />
              Add Variant
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {step2.variants.map((variant, index) => (
            <VariantCard
              key={index}
              variant={variant}
              index={index}
              isShippingTest={isShippingTest}
              onUpdate={(changes) => updateVariant(index, changes)}
              onRemove={() => removeVariant(index)}
              canRemove={step2.variants.length > 2 && !variant.isControl}
            />
          ))}
        </div>

        {/* Allocation Warning */}
        {!isValidAllocation && (
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-700">
              Traffic allocation must equal 100%.{' '}
              <span className="font-mono font-bold">Current: {totalAllocation}%</span>
            </p>
            <Button variant="ghost" size="sm" onClick={equalizeTraffic}>
              Fix
            </Button>
          </div>
        )}
      </div>

      {/* Traffic Visualization */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Traffic Distribution</Label>
        <div className="flex h-8 overflow-hidden rounded-lg">
          {step2.variants.map((variant, index) => (
            <div
              key={index}
              style={{ width: `${variant.trafficAllocation}%` }}
              className={cn(
                'flex items-center justify-center text-xs font-medium text-white transition-all',
                index === 0
                  ? 'bg-slate-600'
                  : index === 1
                    ? 'bg-cyan-500'
                    : index === 2
                      ? 'bg-emerald-500'
                      : index === 3
                        ? 'bg-amber-500'
                        : 'bg-purple-500'
              )}
            >
              {variant.trafficAllocation > 10 && `${variant.trafficAllocation}%`}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          {step2.variants.map((variant, index) => (
            <span key={index}>{variant.name}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

interface VariantCardProps {
  variant: VariantData
  index: number
  isShippingTest: boolean
  onUpdate: (changes: Partial<VariantData>) => void
  onRemove: () => void
  canRemove: boolean
}

function VariantCard({
  variant,
  index,
  isShippingTest,
  onUpdate,
  onRemove,
  canRemove,
}: VariantCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        variant.isControl
          ? 'border-slate-300 bg-slate-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div className="mt-2 cursor-grab text-slate-400 hover:text-slate-600">
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Variant Content */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <Input
              value={variant.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Variant name"
              className="max-w-xs"
            />
            {variant.isControl && (
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                Control
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* URL or Landing Page */}
            {!isShippingTest && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">URL</Label>
                <Input
                  value={variant.url || ''}
                  onChange={(e) => onUpdate({ url: e.target.value })}
                  placeholder="https://..."
                  className="font-mono text-sm"
                />
              </div>
            )}

            {/* Shipping-specific fields */}
            {isShippingTest && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Shipping Suffix</Label>
                  <Input
                    value={variant.shippingSuffix || ''}
                    onChange={(e) => onUpdate({ shippingSuffix: e.target.value })}
                    placeholder="e.g., -express"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Price (cents)</Label>
                  <Input
                    type="number"
                    value={variant.shippingPriceCents || ''}
                    onChange={(e) =>
                      onUpdate({ shippingPriceCents: parseInt(e.target.value, 10) || 0 })
                    }
                    placeholder="e.g., 499"
                  />
                </div>
              </>
            )}

            {/* Traffic Allocation */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Traffic %</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={variant.trafficAllocation}
                  onChange={(e) =>
                    onUpdate({
                      trafficAllocation: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                    })
                  }
                  className="w-24 font-mono"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Remove Button */}
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-2 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
