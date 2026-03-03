'use client'

/**
 * Newsletter Signup Block Component
 *
 * Email capture form with multiple layout options, incentive display,
 * and customizable styling. Supports integration with various email
 * service providers.
 */

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ImageConfig } from '../types'

/**
 * Newsletter Signup block configuration
 */
export interface NewsletterSignupConfig {
  /** Section headline */
  headline: string
  /** Section description */
  description?: string
  /** Input placeholder text */
  placeholder?: string
  /** Submit button text */
  buttonText?: string
  /** Success message */
  successMessage?: string
  /** Error message */
  errorMessage?: string
  /** Incentive text (e.g., "Get 10% off your first order") */
  incentive?: string
  /** Privacy notice text */
  privacyText?: string
  /** Privacy link URL */
  privacyLink?: string
  /** Background image */
  backgroundImage?: ImageConfig
  /** Background color */
  backgroundColor?: string
  /** Text color */
  textColor?: string
  /** Layout style */
  layout?: 'inline' | 'stacked' | 'split'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Form action URL (for native form submission) */
  formAction?: string
  /** Enable double opt-in message */
  doubleOptIn?: boolean
  /** Show name field */
  showNameField?: boolean
  /** Show phone field */
  showPhoneField?: boolean
  /** Tags to apply to subscriber */
  tags?: string[]
  /** Custom form ID for tracking */
  formId?: string
}

/**
 * Form state type
 */
type FormState = 'idle' | 'loading' | 'success' | 'error'

/**
 * Newsletter Signup Block Component
 */
export function NewsletterSignupBlock({ block, className }: BlockProps<NewsletterSignupConfig>) {
  const {
    headline,
    description,
    placeholder = 'Enter your email',
    buttonText = 'Subscribe',
    successMessage = 'Thanks for subscribing! Check your inbox.',
    errorMessage = 'Something went wrong. Please try again.',
    incentive,
    privacyText,
    privacyLink,
    backgroundImage,
    backgroundColor,
    textColor,
    layout = 'stacked',
    size = 'md',
    formAction,
    doubleOptIn = false,
    showNameField = false,
    showPhoneField = false,
    formId,
  } = block.config

  const [formState, setFormState] = useState<FormState>('idle')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!email) return

      setFormState('loading')

      try {
        // If formAction is provided, use native form submission
        if (formAction) {
          const form = e.target as HTMLFormElement
          const formData = new FormData(form)

          const response = await fetch(formAction, {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) throw new Error('Submission failed')
        } else {
          // Simulate API call for demo
          await new Promise((resolve) => setTimeout(resolve, 1500))

          // In production, this would call your email service API
          console.log('Newsletter signup:', { email, name, phone, formId })
        }

        setFormState('success')
        setEmail('')
        setName('')
        setPhone('')
      } catch {
        setFormState('error')
      }
    },
    [email, name, phone, formAction, formId]
  )

  const hasBackground = !!backgroundImage?.src

  const sizeClasses = {
    sm: 'py-8 sm:py-12',
    md: 'py-12 sm:py-16',
    lg: 'py-16 sm:py-24',
  }

  const inputSizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  }

  const buttonSizeClasses = {
    sm: 'px-5 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="w-full">
      {layout === 'inline' ? (
        // Inline layout - all fields in a row
        <div className="flex flex-col gap-3 sm:flex-row">
          {showNameField && (
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={cn(
                'flex-1 rounded-lg border border-[hsl(var(--portal-border))]',
                'bg-[hsl(var(--portal-background))] text-[hsl(var(--portal-foreground))]',
                'placeholder:text-[hsl(var(--portal-muted-foreground))]',
                'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]',
                'transition-all duration-200',
                inputSizeClasses[size]
              )}
            />
          )}
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            required
            className={cn(
              'flex-1 rounded-lg border border-[hsl(var(--portal-border))]',
              'bg-[hsl(var(--portal-background))] text-[hsl(var(--portal-foreground))]',
              'placeholder:text-[hsl(var(--portal-muted-foreground))]',
              'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]',
              'transition-all duration-200',
              inputSizeClasses[size]
            )}
          />
          <button
            type="submit"
            disabled={formState === 'loading'}
            className={cn(
              'flex-shrink-0 rounded-lg font-semibold',
              'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
              'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
              'transition-all duration-200',
              'shadow-md hover:shadow-lg',
              buttonSizeClasses[size]
            )}
          >
            {formState === 'loading' ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Subscribing...
              </span>
            ) : (
              buttonText
            )}
          </button>
        </div>
      ) : (
        // Stacked layout - fields stacked vertically
        <div className="flex flex-col gap-4">
          {showNameField && (
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={cn(
                'w-full rounded-lg border border-[hsl(var(--portal-border))]',
                'bg-[hsl(var(--portal-background))] text-[hsl(var(--portal-foreground))]',
                'placeholder:text-[hsl(var(--portal-muted-foreground))]',
                'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]',
                'transition-all duration-200',
                inputSizeClasses[size]
              )}
            />
          )}
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            required
            className={cn(
              'w-full rounded-lg border border-[hsl(var(--portal-border))]',
              'bg-[hsl(var(--portal-background))] text-[hsl(var(--portal-foreground))]',
              'placeholder:text-[hsl(var(--portal-muted-foreground))]',
              'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]',
              'transition-all duration-200',
              inputSizeClasses[size]
            )}
          />
          {showPhoneField && (
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number (optional)"
              className={cn(
                'w-full rounded-lg border border-[hsl(var(--portal-border))]',
                'bg-[hsl(var(--portal-background))] text-[hsl(var(--portal-foreground))]',
                'placeholder:text-[hsl(var(--portal-muted-foreground))]',
                'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]',
                'transition-all duration-200',
                inputSizeClasses[size]
              )}
            />
          )}
          <button
            type="submit"
            disabled={formState === 'loading'}
            className={cn(
              'w-full rounded-lg font-semibold',
              'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
              'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
              'transition-all duration-200',
              'shadow-md hover:shadow-lg',
              buttonSizeClasses[size]
            )}
          >
            {formState === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Subscribing...
              </span>
            ) : (
              buttonText
            )}
          </button>
        </div>
      )}

      {/* Privacy notice */}
      {privacyText && (
        <p className="mt-4 text-center text-xs text-[hsl(var(--portal-muted-foreground))]">
          {privacyText}
          {privacyLink && (
            <a
              href={privacyLink}
              className="ml-1 underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          )}
        </p>
      )}

      {/* Double opt-in notice */}
      {doubleOptIn && formState === 'idle' && (
        <p className="mt-3 text-center text-xs text-[hsl(var(--portal-muted-foreground))]">
          You will receive a confirmation email to verify your subscription.
        </p>
      )}
    </form>
  )

  const renderContent = () => {
    if (formState === 'success') {
      return (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-[hsl(var(--portal-foreground))]">
            {successMessage}
          </h3>
          {doubleOptIn && (
            <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
              Please check your email to confirm your subscription.
            </p>
          )}
        </div>
      )
    }

    if (formState === 'error') {
      return (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-[hsl(var(--portal-foreground))]">
            {errorMessage}
          </h3>
          <button
            onClick={() => setFormState('idle')}
            className="mt-4 text-[hsl(var(--portal-primary))] underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )
    }

    return (
      <>
        {/* Headline */}
        <h2
          className={cn(
            'text-center font-bold tracking-tight',
            size === 'sm' && 'text-xl sm:text-2xl',
            size === 'md' && 'text-2xl sm:text-3xl',
            size === 'lg' && 'text-3xl sm:text-4xl'
          )}
          style={{ color: textColor || 'hsl(var(--portal-foreground))' }}
        >
          {headline}
        </h2>

        {/* Description */}
        {description && (
          <p
            className={cn(
              'mx-auto mt-4 max-w-xl text-center',
              size === 'sm' && 'text-sm',
              size === 'md' && 'text-base',
              size === 'lg' && 'text-lg'
            )}
            style={{ color: textColor ? `${textColor}cc` : 'hsl(var(--portal-muted-foreground))' }}
          >
            {description}
          </p>
        )}

        {/* Incentive badge */}
        {incentive && (
          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--portal-primary))]/10 px-4 py-2 text-sm font-medium text-[hsl(var(--portal-primary))]">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zm-2.207 6.207a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
              </svg>
              {incentive}
            </span>
          </div>
        )}

        {/* Form */}
        <div className="mx-auto mt-8 max-w-lg">{renderForm()}</div>
      </>
    )
  }

  if (layout === 'split') {
    return (
      <section
        className={cn('relative overflow-hidden', sizeClasses[size], className)}
        style={{ backgroundColor: backgroundColor || 'transparent' }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Content side */}
            <div>{renderContent()}</div>

            {/* Image side */}
            {backgroundImage?.src && (
              <div className="relative aspect-square overflow-hidden rounded-2xl lg:aspect-[4/3]">
                <Image
                  src={backgroundImage.src}
                  alt={backgroundImage.alt || ''}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className={cn('relative overflow-hidden', sizeClasses[size], className)}
      style={{ backgroundColor: hasBackground ? undefined : backgroundColor || 'transparent' }}
    >
      {/* Background Image */}
      {backgroundImage?.src && (
        <>
          <Image
            src={backgroundImage.src}
            alt={backgroundImage.alt || ''}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/50" />
        </>
      )}

      {/* Decorative elements for non-image backgrounds */}
      {!hasBackground && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-1/4 top-0 h-[50vh] w-[50vh] rounded-full bg-[hsl(var(--portal-primary))]/5 blur-[100px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[40vh] w-[40vh] rounded-full bg-[hsl(var(--portal-accent))]/5 blur-[80px]" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8">
        {renderContent()}
      </div>
    </section>
  )
}
