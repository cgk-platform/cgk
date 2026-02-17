'use client'

/**
 * Contact Form Block Component
 *
 * Contact or inquiry form with configurable fields,
 * validation, and success messaging.
 */

import { useState, useCallback } from 'react'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ContactFormConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Form field component
 */
function FormField({
  field,
  value,
  onChange,
  error,
}: {
  field: ContactFormConfig['fields'][0]
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  const baseInputClasses = cn(
    'w-full rounded-xl px-4 py-3',
    'bg-[hsl(var(--portal-background))]',
    'border transition-all duration-200',
    'text-[hsl(var(--portal-foreground))]',
    'placeholder:text-[hsl(var(--portal-muted-foreground))]',
    'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]',
    error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-[hsl(var(--portal-border))] hover:border-[hsl(var(--portal-primary))]/50'
  )

  return (
    <div className="space-y-2">
      <label
        htmlFor={field.name}
        className="block text-sm font-medium text-[hsl(var(--portal-foreground))]"
      >
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          id={field.name}
          name={field.name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          rows={5}
          className={cn(baseInputClasses, 'resize-none')}
          placeholder={`Enter your ${field.label.toLowerCase()}...`}
        />
      ) : field.type === 'select' ? (
        <select
          id={field.name}
          name={field.name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={baseInputClasses}
        >
          <option value="">Select {field.label.toLowerCase()}...</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={field.name}
          type={field.type}
          name={field.name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={baseInputClasses}
          placeholder={`Enter your ${field.label.toLowerCase()}...`}
        />
      )}

      {error && (
        <p className="flex items-center gap-1 text-sm text-red-500">
          <LucideIcon name="AlertCircle" className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Success message component
 */
function SuccessMessage({ message }: { message: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl p-12',
        'bg-gradient-to-br from-green-500/10 to-green-500/5',
        'border border-green-500/20',
        'text-center',
        'animate-fade-in'
      )}
    >
      <div
        className={cn(
          'mb-6 flex h-16 w-16 items-center justify-center rounded-full',
          'bg-green-500',
          'shadow-lg shadow-green-500/30'
        )}
      >
        <LucideIcon name="Check" className="h-8 w-8 text-white" />
      </div>

      <h3 className="text-2xl font-bold text-[hsl(var(--portal-foreground))]">
        Message Sent!
      </h3>

      <p className="mt-2 max-w-md text-[hsl(var(--portal-muted-foreground))]">
        {message}
      </p>
    </div>
  )
}

/**
 * Contact Form Block Component
 */
export function ContactFormBlock({ block, className }: BlockProps<ContactFormConfig>) {
  const {
    headline,
    description,
    submitButtonText = 'Send Message',
    successMessage = "Thank you for your message! We'll get back to you soon.",
    fields,
    submitEndpoint,
  } = block.config

  const [formData, setFormData] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleFieldChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }, [errors])

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    fields.forEach((field) => {
      const value = formData[field.name] || ''

      if (field.required && !value.trim()) {
        newErrors[field.name] = `${field.label} is required`
      } else if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          newErrors[field.name] = 'Please enter a valid email address'
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [fields, formData])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateForm()) return

      setIsSubmitting(true)

      try {
        if (submitEndpoint) {
          await fetch(submitEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          })
        } else {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1500))
        }

        setIsSubmitted(true)
      } catch {
        setErrors({ submit: 'Failed to send message. Please try again.' })
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, submitEndpoint, validateForm]
  )

  if (isSubmitted) {
    return (
      <section className={cn('py-20 sm:py-28', className)}>
        <div className="mx-auto max-w-2xl px-6 sm:px-8">
          <SuccessMessage message={successMessage} />
        </div>
      </section>
    )
  }

  return (
    <section className={cn('py-20 sm:py-28', className)}>
      <div className="mx-auto max-w-2xl px-6 sm:px-8">
        {/* Header */}
        {(headline || description) && (
          <div className="mb-10 text-center">
            {headline && (
              <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
                {headline}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-lg text-[hsl(var(--portal-muted-foreground))]">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className={cn(
            'rounded-2xl p-8',
            'bg-[hsl(var(--portal-card))]',
            'border border-[hsl(var(--portal-border))]',
            'shadow-lg'
          )}
        >
          <div className="space-y-6">
            {fields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                value={formData[field.name] || ''}
                onChange={(value) => handleFieldChange(field.name, value)}
                error={errors[field.name]}
              />
            ))}
          </div>

          {/* Submit error */}
          {errors.submit && (
            <div className="mt-6 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-red-500">
              <LucideIcon name="AlertCircle" className="h-5 w-5" />
              {errors.submit}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4',
              'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
              'font-semibold transition-all duration-200',
              'hover:bg-[hsl(var(--portal-primary))]/90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'focus-visible:ring-[hsl(var(--portal-primary))]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              !isSubmitting && 'hover:shadow-lg hover:-translate-y-0.5'
            )}
          >
            {isSubmitting ? (
              <>
                <LucideIcon name="Loader2" className="h-5 w-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <LucideIcon name="Send" className="h-5 w-5" />
                {submitButtonText}
              </>
            )}
          </button>
        </form>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>
    </section>
  )
}
