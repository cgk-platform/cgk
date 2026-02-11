'use client'

import { Alert, AlertDescription, Button, cn, Input, Label, Select, Switch } from '@cgk/ui'
import { AlertCircle, Check, Loader2 } from 'lucide-react'

// ============================================================
// Section Components
// ============================================================

interface SettingsSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

// ============================================================
// Toggle Field
// ============================================================

interface ToggleFieldProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  warning?: string
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
  disabled,
  warning,
}: ToggleFieldProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        {warning && checked && (
          <div className="mt-2 flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle className="h-4 w-4" />
            {warning}
          </div>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

// ============================================================
// Select Field
// ============================================================

interface SelectFieldProps {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}

export function SelectField({
  label,
  description,
  value,
  onChange,
  options,
  disabled,
}: SelectFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  )
}

// ============================================================
// Number Field
// ============================================================

interface NumberFieldProps {
  label: string
  description?: string
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  disabled?: boolean
  prefix?: string
  suffix?: string
  allowNull?: boolean
}

export function NumberField({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  disabled,
  prefix,
  suffix,
  allowNull,
}: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className="flex items-center gap-2">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value
            if (val === '' && allowNull) {
              onChange(null)
            } else {
              const num = parseFloat(val)
              if (!isNaN(num)) {
                onChange(num)
              }
            }
          }}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          className="max-w-[200px]"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  )
}

// ============================================================
// Text Field
// ============================================================

interface TextFieldProps {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  type?: 'text' | 'url' | 'email'
  maxLength?: number
}

export function TextField({
  label,
  description,
  value,
  onChange,
  placeholder,
  disabled,
  type = 'text',
  maxLength,
}: TextFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
      />
    </div>
  )
}

// ============================================================
// Color Field
// ============================================================

interface ColorFieldProps {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ColorField({
  label,
  description,
  value,
  onChange,
  disabled,
}: ColorFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-9 w-14 cursor-pointer rounded border"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          disabled={disabled}
          className="max-w-[120px] font-mono"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
    </div>
  )
}

// ============================================================
// Usage Bar
// ============================================================

interface UsageBarProps {
  label: string
  current: number
  limit: number | null
  unit?: string
}

export function UsageBar({ label, current, limit, unit = '' }: UsageBarProps) {
  const percentage = limit ? Math.min(100, (current / limit) * 100) : 0
  const isOverBudget = limit && current > limit

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className={cn(isOverBudget && 'text-destructive font-medium')}>
          {unit}
          {current.toFixed(2)}
          {limit && (
            <>
              {' / '}
              {unit}
              {limit.toFixed(2)}
            </>
          )}
        </span>
      </div>
      {limit && (
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              'h-full transition-all',
              isOverBudget ? 'bg-destructive' : percentage > 80 ? 'bg-amber-500' : 'bg-primary'
            )}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================
// Save Button
// ============================================================

interface SaveButtonProps {
  isDirty: boolean
  isLoading: boolean
  isSaved: boolean
  onClick: () => void
}

export function SaveButton({ isDirty, isLoading, isSaved, onClick }: SaveButtonProps) {
  return (
    <Button onClick={onClick} disabled={!isDirty || isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : isSaved ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Saved
        </>
      ) : (
        'Save Changes'
      )}
    </Button>
  )
}

// ============================================================
// Error Alert
// ============================================================

interface ErrorAlertProps {
  message: string
  onDismiss?: () => void
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <Alert variant="error">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

// ============================================================
// Unsaved Changes Banner
// ============================================================

interface UnsavedChangesBannerProps {
  show: boolean
}

export function UnsavedChangesBanner({ show }: UnsavedChangesBannerProps) {
  if (!show) return null

  return (
    <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 border-b bg-amber-50 px-6 py-3 text-sm text-amber-800">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>You have unsaved changes</span>
      </div>
    </div>
  )
}
