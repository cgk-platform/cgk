'use client'

import { cn, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from '@cgk-platform/ui'
import { DollarSign, Package, Percent, Plus, Trash2, Truck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import {
  ErrorAlert,
  NumberField,
  SaveButton,
  SelectField,
  SettingsSection,
  TextField,
  ToggleField,
  UnsavedChangesBanner,
} from './form-elements'

import type {
  FulfillmentCostModel,
  OtherVariableCost,
  PaymentProcessor,
  ShippingTrackingMethod,
  VariableCostCalculationType,
  VariableCostConfig,
  VariableCostConfigUpdate,
} from '@/lib/finance/types'

import {
  FULFILLMENT_MODEL_OPTIONS,
  PAYMENT_PROCESSOR_OPTIONS,
  SHIPPING_METHOD_OPTIONS,
} from '@/lib/finance/types'

// ============================================================
// Types
// ============================================================

interface CostsSettingsFormProps {
  initialConfig?: VariableCostConfig | null
}

interface ConfigWithDefaults extends Omit<VariableCostConfig, 'id' | 'tenantId' | 'updatedAt' | 'updatedBy'> {
  id: string | null
  tenantId: string
  updatedAt: string | null
  updatedBy: string | null
}

// ============================================================
// Constants
// ============================================================

const CALCULATION_TYPE_OPTIONS = [
  { value: 'per_order', label: 'Per Order' },
  { value: 'per_item', label: 'Per Item' },
  { value: 'percentage_of_revenue', label: 'Percentage of Revenue' },
]

// ============================================================
// Component
// ============================================================

export function CostsSettingsForm({ initialConfig }: CostsSettingsFormProps) {
  const [config, setConfig] = useState<ConfigWithDefaults | null>(null)
  const [originalConfig, setOriginalConfig] = useState<ConfigWithDefaults | null>(null)
  const [isLoading, setIsLoading] = useState(!initialConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('payment')

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/finance/costs')

      if (!res.ok) throw new Error('Failed to load cost configuration')

      const data = await res.json()
      setConfig(data.config)
      setOriginalConfig(data.config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig)
      setOriginalConfig(initialConfig)
    } else {
      fetchConfig()
    }
  }, [initialConfig, fetchConfig])

  const isDirty =
    config && originalConfig
      ? JSON.stringify(config) !== JSON.stringify(originalConfig)
      : false

  const handleSave = async () => {
    if (!config || !isDirty) return

    setIsSaving(true)
    setError(null)

    try {
      const updates: VariableCostConfigUpdate = {
        paymentProcessing: config.paymentProcessing,
        fulfillment: config.fulfillment,
        shipping: config.shipping,
        otherVariableCosts: config.otherVariableCosts,
      }

      const res = await fetch('/api/admin/finance/costs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save configuration')
      }

      const data = await res.json()
      setConfig(data.config)
      setOriginalConfig(data.config)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset all cost settings to defaults? This cannot be undone.')) return

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/finance/costs', {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to reset configuration')

      // Refetch to get defaults
      await fetchConfig()
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset configuration')
    } finally {
      setIsSaving(false)
    }
  }

  // Update helpers
  const updatePaymentProcessing = <K extends keyof VariableCostConfig['paymentProcessing']>(
    key: K,
    value: VariableCostConfig['paymentProcessing'][K]
  ) => {
    if (!config) return
    setConfig({
      ...config,
      paymentProcessing: { ...config.paymentProcessing, [key]: value },
    })
    setIsSaved(false)
  }

  const updateFulfillment = <K extends keyof VariableCostConfig['fulfillment']>(
    key: K,
    value: VariableCostConfig['fulfillment'][K]
  ) => {
    if (!config) return
    setConfig({
      ...config,
      fulfillment: { ...config.fulfillment, [key]: value },
    })
    setIsSaved(false)
  }

  const updateShipping = <K extends keyof VariableCostConfig['shipping']>(
    key: K,
    value: VariableCostConfig['shipping'][K]
  ) => {
    if (!config) return
    setConfig({
      ...config,
      shipping: { ...config.shipping, [key]: value },
    })
    setIsSaved(false)
  }

  const addOtherCost = () => {
    if (!config) return
    const newCost: OtherVariableCost = {
      id: `cost_${Date.now()}`,
      name: '',
      amountCents: 0,
      calculationType: 'per_order',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    setConfig({
      ...config,
      otherVariableCosts: [...config.otherVariableCosts, newCost],
    })
    setIsSaved(false)
  }

  const updateOtherCost = (id: string, updates: Partial<OtherVariableCost>) => {
    if (!config) return
    setConfig({
      ...config,
      otherVariableCosts: config.otherVariableCosts.map((cost) =>
        cost.id === id ? { ...cost, ...updates } : cost
      ),
    })
    setIsSaved(false)
  }

  const removeOtherCost = (id: string) => {
    if (!config) return
    setConfig({
      ...config,
      otherVariableCosts: config.otherVariableCosts.filter((cost) => cost.id !== id),
    })
    setIsSaved(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!config) {
    return <ErrorAlert message="Failed to load cost configuration" />
  }

  const formatPercentRate = (rate: number) => (rate * 100).toFixed(2)
  const parsePercentRate = (value: string) => parseFloat(value) / 100

  return (
    <div className="space-y-6">
      <UnsavedChangesBanner show={isDirty} />

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="payment" className="gap-2">
            <Percent className="h-4 w-4" />
            Payment Processing
          </TabsTrigger>
          <TabsTrigger value="fulfillment" className="gap-2">
            <Package className="h-4 w-4" />
            Fulfillment
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2">
            <Truck className="h-4 w-4" />
            Shipping
          </TabsTrigger>
          <TabsTrigger value="other" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Other Costs
          </TabsTrigger>
        </TabsList>

        {/* Payment Processing Tab */}
        <TabsContent value="payment" className="space-y-6 pt-6">
          <SettingsSection
            title="Primary Payment Processor"
            description="Configure the main payment processor fees. These fees are used in P&L calculations."
          >
            <SelectField
              label="Processor"
              description="Your primary payment processing provider."
              value={config.paymentProcessing.primaryProcessor}
              onChange={(value) =>
                updatePaymentProcessing('primaryProcessor', value as PaymentProcessor)
              }
              options={PAYMENT_PROCESSOR_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Percentage Rate"
                description="Fee percentage per transaction (e.g., 2.9% = 2.9)."
                value={parseFloat(formatPercentRate(config.paymentProcessing.percentageRate))}
                onChange={(value) =>
                  updatePaymentProcessing('percentageRate', parsePercentRate(String(value ?? 0)))
                }
                min={0}
                max={20}
                step={0.01}
                suffix="%"
              />

              <NumberField
                label="Fixed Fee per Transaction"
                description="Fixed amount charged per transaction."
                value={config.paymentProcessing.fixedFeeCents}
                onChange={(value) =>
                  updatePaymentProcessing('fixedFeeCents', value ?? 0)
                }
                min={0}
                max={500}
                step={1}
                prefix="$"
                suffix="cents"
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Example:</strong> For a $100 order, the payment processing fee would be{' '}
                <span className="font-medium text-foreground">
                  $
                  {(
                    100 * config.paymentProcessing.percentageRate +
                    config.paymentProcessing.fixedFeeCents / 100
                  ).toFixed(2)}
                </span>
              </p>
            </div>
          </SettingsSection>

          {config.paymentProcessing.additionalProcessors.length > 0 && (
            <SettingsSection
              title="Additional Processors"
              description="Other payment processors used for some transactions."
            >
              <p className="text-sm text-muted-foreground">
                Additional processor configuration coming soon.
              </p>
            </SettingsSection>
          )}
        </TabsContent>

        {/* Fulfillment Tab */}
        <TabsContent value="fulfillment" className="space-y-6 pt-6">
          <SettingsSection
            title="Fulfillment Cost Model"
            description="Configure how fulfillment costs are calculated for P&L reporting."
          >
            <SelectField
              label="Cost Model"
              description="How to calculate fulfillment costs per order."
              value={config.fulfillment.costModel}
              onChange={(value) =>
                updateFulfillment('costModel', value as FulfillmentCostModel)
              }
              options={FULFILLMENT_MODEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />

            {config.fulfillment.costModel === 'per_order' && (
              <NumberField
                label="Pick & Pack Fee"
                description="Cost per order for picking and packing."
                value={config.fulfillment.pickPackFeeCents}
                onChange={(value) =>
                  updateFulfillment('pickPackFeeCents', value ?? 0)
                }
                min={0}
                step={1}
                prefix="$"
                suffix="cents"
              />
            )}

            {config.fulfillment.costModel === 'per_item' && (
              <NumberField
                label="Pick & Pack Fee per Item"
                description="Cost per item for picking and packing."
                value={config.fulfillment.pickPackPerItemCents}
                onChange={(value) =>
                  updateFulfillment('pickPackPerItemCents', value ?? 0)
                }
                min={0}
                step={1}
                prefix="$"
                suffix="cents"
              />
            )}

            <NumberField
              label="Packaging Cost"
              description="Cost of packaging materials per order."
              value={config.fulfillment.packagingCostCents}
              onChange={(value) =>
                updateFulfillment('packagingCostCents', value ?? 0)
              }
              min={0}
              step={1}
              prefix="$"
              suffix="cents"
            />

            <NumberField
              label="Handling Fee"
              description="Additional handling fee per order (optional)."
              value={config.fulfillment.handlingFeeCents}
              onChange={(value) =>
                updateFulfillment('handlingFeeCents', value ?? 0)
              }
              min={0}
              step={1}
              prefix="$"
              suffix="cents"
            />

            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Total per order:</strong>{' '}
                <span className="font-medium text-foreground">
                  $
                  {(
                    (config.fulfillment.pickPackFeeCents +
                      config.fulfillment.packagingCostCents +
                      config.fulfillment.handlingFeeCents) /
                    100
                  ).toFixed(2)}
                </span>
              </p>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* Shipping Tab */}
        <TabsContent value="shipping" className="space-y-6 pt-6">
          <SettingsSection
            title="Shipping Cost Tracking"
            description="Configure how shipping costs are tracked for P&L calculations."
          >
            <SelectField
              label="Tracking Method"
              description="How shipping costs are determined."
              value={config.shipping.trackingMethod}
              onChange={(value) =>
                updateShipping('trackingMethod', value as ShippingTrackingMethod)
              }
              options={SHIPPING_METHOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />

            {config.shipping.trackingMethod === 'estimated_percentage' && (
              <NumberField
                label="Estimated Percentage"
                description="Estimated shipping cost as a percentage of order total."
                value={config.shipping.estimatedPercent ?? 0}
                onChange={(value) => updateShipping('estimatedPercent', value ?? 0)}
                min={0}
                max={100}
                step={0.1}
                suffix="%"
              />
            )}

            {config.shipping.trackingMethod === 'flat_rate' && (
              <NumberField
                label="Flat Rate per Order"
                description="Fixed shipping cost per order."
                value={(config.shipping.flatRateCents ?? 0) / 100}
                onChange={(value) =>
                  updateShipping('flatRateCents', Math.round((value ?? 0) * 100))
                }
                min={0}
                step={0.01}
                prefix="$"
              />
            )}

            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                {config.shipping.trackingMethod === 'actual_expense' && (
                  <>
                    <strong>Actual expense tracking:</strong> Shipping costs are pulled from your
                    Treasury operating expenses. Make sure to categorize shipping expenses correctly.
                  </>
                )}
                {config.shipping.trackingMethod === 'estimated_percentage' && (
                  <>
                    <strong>Estimated:</strong> For a $100 order, shipping would be estimated at{' '}
                    <span className="font-medium text-foreground">
                      ${((config.shipping.estimatedPercent ?? 0) * 1).toFixed(2)}
                    </span>
                  </>
                )}
                {config.shipping.trackingMethod === 'flat_rate' && (
                  <>
                    <strong>Flat rate:</strong> Every order incurs a{' '}
                    <span className="font-medium text-foreground">
                      ${((config.shipping.flatRateCents ?? 0) / 100).toFixed(2)}
                    </span>{' '}
                    shipping cost.
                  </>
                )}
              </p>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* Other Costs Tab */}
        <TabsContent value="other" className="space-y-6 pt-6">
          <SettingsSection
            title="Custom Cost Line Items"
            description="Add custom variable costs that should be included in P&L calculations."
          >
            {config.otherVariableCosts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <DollarSign className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No custom cost items configured.
                </p>
                <button
                  type="button"
                  onClick={addOtherCost}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Add Cost Item
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {config.otherVariableCosts.map((cost) => (
                  <OtherCostItem
                    key={cost.id}
                    cost={cost}
                    onUpdate={(updates) => updateOtherCost(cost.id, updates)}
                    onRemove={() => removeOtherCost(cost.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={addOtherCost}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Cost Item
                </button>
              </div>
            )}
          </SettingsSection>

          <SettingsSection
            title="Platform Fee"
            description="Configure CGK platform fees if applicable."
          >
            <p className="text-sm text-muted-foreground">
              Platform fees are configured separately in your subscription settings.
            </p>
          </SettingsSection>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between border-t pt-6">
        <button
          type="button"
          onClick={handleReset}
          className="text-sm text-muted-foreground hover:text-destructive"
        >
          Reset to Defaults
        </button>
        <SaveButton
          isDirty={isDirty}
          isLoading={isSaving}
          isSaved={isSaved}
          onClick={handleSave}
        />
      </div>
    </div>
  )
}

// ============================================================
// Other Cost Item Component
// ============================================================

interface OtherCostItemProps {
  cost: OtherVariableCost
  onUpdate: (updates: Partial<OtherVariableCost>) => void
  onRemove: () => void
}

function OtherCostItem({ cost, onUpdate, onRemove }: OtherCostItemProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        !cost.isActive && 'border-dashed bg-muted/30'
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <TextField
            label="Cost Name"
            description="A descriptive name for this cost item."
            value={cost.name}
            onChange={(value) => onUpdate({ name: value })}
            placeholder="e.g., Insurance, Returns Processing"
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <ToggleField
            label="Active"
            checked={cost.isActive}
            onChange={(checked) => onUpdate({ isActive: checked })}
          />
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Remove cost item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Calculation Type"
          description="How this cost is calculated."
          value={cost.calculationType}
          onChange={(value) =>
            onUpdate({ calculationType: value as VariableCostCalculationType })
          }
          options={CALCULATION_TYPE_OPTIONS}
        />

        {cost.calculationType === 'percentage_of_revenue' ? (
          <NumberField
            label="Percentage Rate"
            description="Percentage of revenue for this cost."
            value={cost.percentageRate ?? 0}
            onChange={(value) => onUpdate({ percentageRate: value ?? 0 })}
            min={0}
            max={100}
            step={0.01}
            suffix="%"
          />
        ) : (
          <NumberField
            label="Amount"
            description={`Cost ${cost.calculationType === 'per_item' ? 'per item' : 'per order'}.`}
            value={cost.amountCents / 100}
            onChange={(value) => onUpdate({ amountCents: Math.round((value ?? 0) * 100) })}
            min={0}
            step={0.01}
            prefix="$"
          />
        )}
      </div>
    </div>
  )
}
